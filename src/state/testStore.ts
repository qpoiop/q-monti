import { useSyncExternalStore } from "react";
import { patchState } from "./store";
import { momontyGame } from "@shared/games/momonty/logic";
import type {
  Card,
  MomontyAction,
  MomontyState,
  MomontyView,
  Rank,
  TrickForm,
} from "@shared/games/momonty/logic";
import { makeRng, type Seat } from "@shared/engine";

/**
 * Test-mode store.
 *
 * Runs the shared Momonty engine in the browser. No transport / DO.
 * The single host is every seat — they take turns from a "spy view"
 * that reveals whichever seat is currently acting. Purpose is to smoke
 * test the full game flow client-side without infra.
 *
 * IMPORTANT: the shared reducer mutates state in place for efficiency
 * (it's a server-side hot path). React's `useSyncExternalStore` compares
 * snapshots with `Object.is` — a mutated-but-same-reference state does
 * NOT trigger re-render. We therefore shallow-copy the returned state
 * on every dispatch so consumers see a new reference on every tick.
 */

const SEAT_COUNT = 4;
const NAMES = ["나 (호스트)", "봇 A", "봇 B", "봇 C", "봇 D", "봇 E", "봇 F", "봇 G"];

export interface TestState {
  state: MomontyState;
  events: unknown[];
  version: number;
  actingSeatId: string;
  seatNames: Record<string, string>;
  /**
   * When true, every dispatch drains autonomous turns for seats that
   * aren't the current viewer. Lets a single tester walk the full match
   * without needing to hand-play every bot.
   */
  autoBots: boolean;
}

let current: TestState | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const l of listeners) l();
}
function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Boot a fresh local match. Called with config from the setup screen. */
export function initTest(opts: { seatCount?: number; config?: any } = {}): void {
  const seatCount = opts.seatCount ?? SEAT_COUNT;
  const seatIds = Array.from({ length: seatCount }, (_, i) => `s${i + 1}`);
  const seats: Seat[] = seatIds.map((id, i) => ({
    seatId: id,
    userId: id,
    displayName: NAMES[i] ?? id,
    ready: true,
    online: true,
    isHost: i === 0,
  }));
  const rng = makeRng(`test:${Date.now()}`);
  const baseConfig = opts.config ?? momontyGame.defaultConfig();
  const config = { ...baseConfig, playerCount: seatCount };
  const state = momontyGame.init({ seats, config, rng });
  current = {
    state: { ...state },
    events: [],
    version: 1,
    actingSeatId: state.seatOrder[0],
    seatNames: Object.fromEntries(seats.map((s) => [s.seatId, s.displayName])),
    autoBots: false,
  };
  notify();
}

export function setAutoBots(on: boolean): void {
  if (!current) return;
  current = { ...current, autoBots: on };
  notify();
}

/** Clear the test session — user returns to setup. */
export function resetTest(): void {
  current = null;
  notify();
}

export function testDispatch(
  action: MomontyAction
): { ok: true } | { ok: false; error: string } {
  if (!current) return { ok: false, error: "not initialised" };
  const rng = makeRng(`test:${current.version}:${current.actingSeatId}`);
  try {
    const { state, events } = momontyGame.reduce({
      state: current.state,
      seatId: current.actingSeatId,
      action,
      rng,
    });
    // Manual test mode: never auto-advance actingSeatId. The tester
    // picks each seat via the seat picker themselves so they can walk
    // any seat's screen at any time. Auto-bot loop below still uses
    // engine state to decide who moves next.
    const humanSeatId = current.actingSeatId;
    current = {
      ...current,
      state: { ...state },
      events,
      version: current.version + 1,
      actingSeatId: current.actingSeatId,
    };
    notify();
    mirrorToGlobalStore();
    if (current.autoBots) {
      scheduleBotStep(humanSeatId);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Delay between bot steps so the human can see each turn advance. */
const BOT_STEP_MS = 700;
let botTimer: ReturnType<typeof setTimeout> | null = null;
let botConsecutivePasses = 0;

function scheduleBotStep(humanSeatId: string, immediate = false): void {
  if (botTimer) clearTimeout(botTimer);
  const run = () => {
    botTimer = null;
    if (!current || !current.autoBots) return;
    const activeSeat = seatToDrive(current.state, humanSeatId);
    if (!activeSeat) return;
    if (activeSeat === humanSeatId) {
      // Human's turn again — stop stepping and hand control back.
      botConsecutivePasses = 0;
      return;
    }
    // Bail if bots have been passing indefinitely — a pathological
    // state shouldn't wedge the tester in a spinner.
    if (botConsecutivePasses >= current.state.seatOrder.length * 4) {
      botConsecutivePasses = 0;
      return;
    }
    const bot = botAction(current.state, activeSeat);
    if (!bot) return;
    const rng = makeRng(`test:bot:${current.version}:${activeSeat}`);
    try {
      const result = momontyGame.reduce({
        state: current.state,
        seatId: activeSeat,
        action: bot,
        rng,
      });
      current = {
        ...current,
        state: { ...result.state },
        events: result.events,
        version: current.version + 1,
        actingSeatId: seatToDrive(result.state, humanSeatId) ?? humanSeatId,
      };
      if (bot.t === "pass") botConsecutivePasses++;
      else botConsecutivePasses = 0;
      notify();
      mirrorToGlobalStore();
    } catch {
      // Illegal move — hand control back to human rather than looping.
      return;
    }
    scheduleBotStep(humanSeatId);
  };
  if (immediate) run();
  else botTimer = setTimeout(run, BOT_STEP_MS);
}

/**
 * Runs autonomous actions for whichever seat currently needs to act,
 * as long as it isn't the viewer's seat. Uses a deliberately naive bot
 * policy — the goal is to keep the round moving so the tester can see
 * end-to-end transitions, not to play well. Straights are skipped.
 */

function seatToDrive(state: MomontyState, humanSeatId: string): string | null {
  if (state.phase === "PLAYING") return state.seatOrder[state.currentSeatIdx] ?? null;
  if (state.phase === "TAXATION") {
    for (const s of state.seatOrder) {
      if ((state.taxation.pendingUploads[s] ?? 0) > 0) return s;
      if ((state.taxation.pendingReturns[s] ?? 0) > 0) return s;
    }
    return null;
  }
  if (state.phase === "DRAWING_RANK") {
    for (const s of state.seatOrder) {
      if (state.drawRank?.picks?.[s] == null) return s;
    }
    return null;
  }
  if (state.phase === "RANK_REVEAL") return humanSeatId;
  if (state.phase === "ROUND_END") return humanSeatId;
  return null;
}

function botAction(state: MomontyState, seatId: string): MomontyAction | null {
  if (state.phase === "DRAWING_RANK") return { t: "drawRank" };
  if (state.phase === "RANK_REVEAL") return { t: "confirmRanks" };
  // ROUND_END pause is intentional — the tester needs to see the ranks
  // before advancing. Do NOT return confirmRoundEnd here; seatToDrive
  // already routes control back to the human seat, so waiting on human
  // click is the right default.
  if (state.phase === "TAXATION") {
    const hand = state.hands[seatId] ?? [];
    const owe = state.taxation.pendingUploads[seatId] ?? 0;
    if (owe > 0) {
      // Peon uploads their strongest (lowest value) numbered cards.
      const sorted = [...hand]
        .filter((c) => c.value != null)
        .sort((a, b) => (a.value ?? 99) - (b.value ?? 99));
      const picked = sorted.slice(0, owe);
      if (picked.length < owe) return null;
      return { t: "uploadCards", cardIds: picked.map((c) => c.id) };
    }
    const owed = state.taxation.pendingReturns[seatId] ?? 0;
    if (owed > 0) {
      // Momonty returns their weakest (highest value) numbered cards, and
      // wilds only when nothing else fits.
      const numbered = [...hand]
        .filter((c) => c.value != null)
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
      const wilds = hand.filter((c) => c.value == null);
      const picked = [...numbered, ...wilds].slice(0, owed);
      if (picked.length < owed) return null;
      return { t: "returnCards", cardIds: picked.map((c) => c.id) };
    }
    return null;
  }
  if (state.phase === "PLAYING") {
    const hand = state.hands[seatId] ?? [];
    const form = state.currentTrick.form;
    if (form.kind === "none") return leadWeakest(hand);
    if (form.kind === "straight") return { t: "pass" };
    return followWithSet(hand, form);
  }
  return null;
}

function leadWeakest(hand: Card[]): MomontyAction | null {
  const numbered = hand.filter((c) => c.value != null) as (Card & { value: number })[];
  if (numbered.length === 0) {
    // Jesters-only hand — dump one as a single with the weakest value.
    const jester = hand.find((c) => c.value == null);
    if (!jester) return null;
    return { t: "playCards", cardIds: [jester.id], wildAsValue: 12 };
  }
  // Weakest = highest value (1 is the strongest). Sets are single/pair/
  // triple/quad — cap at 4 copies since the engine only supports up to
  // quads for same-value plays.
  const byVal = new Map<number, Card[]>();
  for (const c of numbered) {
    const arr = byVal.get(c.value) ?? [];
    arr.push(c);
    byVal.set(c.value, arr);
  }
  let best: { v: number; cards: Card[] } | null = null;
  for (const [v, cards] of byVal.entries()) {
    const capped = cards.slice(0, 4);
    if (
      !best ||
      v > best.v ||
      (v === best.v && capped.length > best.cards.length)
    ) {
      best = { v, cards: capped };
    }
  }
  if (!best) return { t: "pass" };
  return { t: "playCards", cardIds: best.cards.map((c) => c.id), wildAsValue: best.v };
}

function followWithSet(hand: Card[], form: TrickForm): MomontyAction {
  const size =
    form.kind === "single" ? 1 :
    form.kind === "pair" ? 2 :
    form.kind === "triple" ? 3 :
    form.kind === "quad" ? 4 : 0;
  const threshold = "value" in form ? form.value : 0;
  const jesters = hand.filter((c) => c.value == null);
  const byValue = new Map<number, Card[]>();
  for (const c of hand) {
    if (c.value == null) continue;
    const arr = byValue.get(c.value) ?? [];
    arr.push(c);
    byValue.set(c.value, arr);
  }
  const candidates: { v: number; cards: Card[] }[] = [];
  for (const [v, cs] of byValue.entries()) {
    if (v >= threshold) continue;
    if (cs.length >= size) {
      candidates.push({ v, cards: cs.slice(0, size) });
    } else if (cs.length + jesters.length >= size) {
      const need = size - cs.length;
      candidates.push({ v, cards: [...cs, ...jesters.slice(0, need)] });
    }
  }
  candidates.sort((a, b) => b.v - a.v);
  if (candidates.length === 0) return { t: "pass" };
  const pick = candidates[0];
  return { t: "playCards", cardIds: pick.cards.map((c) => c.id), wildAsValue: pick.v };
}
// Keep Rank import from tree-shaking away — used for narrowing above.
type _RankUsed = Rank;

export function setActingSeat(seatId: string): void {
  if (!current) return;
  current = { ...current, actingSeatId: seatId };
  notify();
  mirrorToGlobalStore();
}

/**
 * Fire the bot policy for whichever seat is currently acting. Used by
 * the turn timer's expiry callback in test mode so a stalled seat still
 * advances even when the viewer isn't watching that seat's screen.
 */
export function autoTurnTimeout(): void {
  if (!current) return;
  const state = current.state;
  if (state.phase !== "PLAYING") return;
  const seatId = state.seatOrder[state.currentSeatIdx];
  if (!seatId) return;
  const action = botAction(state, seatId);
  if (!action) return;
  const rng = makeRng(`test:timeout:${current.version}:${seatId}`);
  try {
    const result = momontyGame.reduce({ state, seatId, action, rng });
    current = {
      ...current,
      state: { ...result.state },
      events: result.events,
      version: current.version + 1,
    };
    notify();
    mirrorToGlobalStore();
  } catch {
    // Illegal action — ignore, user will need to intervene.
  }
}

function mirrorToGlobalStore(): void {
  // Sync mirror — must land in the same render as the local testStore
  // notify() so the shared overlays (TaxResultOverlay, RevolutionOverlay,
  // HistorySheet) see the fresh events on the SAME commit as PlayTrick.
  // Previously this was async via `import("./store")`, which pushed the
  // gameView update one microtask later. PlayTrick rendered without the
  // matching overlay for a frame, then the overlay popped on top — that
  // was the "데이터가 비어있다가 버벅이면서 나타나는" flicker.
  if (!current) return;
  const view = viewForSeat(current.actingSeatId);
  patchState({
    gameView: {
      view,
      version: current.version,
      lastEvents: current.events,
    },
  });
}

export function useTest<T>(sel: (s: TestState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => sel(current ?? emptyState()),
    () => sel(emptyState())
  );
}

export function getTestState(): TestState | null {
  return current;
}

/**
 * Build a view for a specific seat with display names baked in so the
 * phase views can render "봇 A" instead of raw "s2".
 */
export function viewForSeat(seatId: string | null): MomontyView | null {
  if (!current) return null;
  const view = momontyGame.view(current.state, seatId) as MomontyView;
  return { ...view, seatNames: current.seatNames } as MomontyView & {
    seatNames: Record<string, string>;
  };
}

function emptyState(): TestState {
  return {
    state: null as unknown as MomontyState,
    events: [],
    version: 0,
    actingSeatId: "",
    seatNames: {},
    autoBots: false,
  };
}
