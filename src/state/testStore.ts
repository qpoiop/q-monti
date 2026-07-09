import { useSyncExternalStore } from "react";
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
    autoBots: true,
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
    // Auto-advance the acting seat when the phase makes it obvious
    // (e.g. PLAYING follows `currentSeatIdx`).
    const nextActing =
      state.phase === "PLAYING"
        ? state.seatOrder[state.currentSeatIdx]
        : state.phase === "DRAWING_RANK"
        ? // Prefer any seat that hasn't drawn yet, else stay.
          state.seatOrder.find((s) => state.drawRank?.picks?.[s] == null) ??
          current.actingSeatId
        : state.phase === "TAXATION"
        ? // Prefer any seat still owing tax.
          state.seatOrder.find(
            (s) =>
              (state.taxation.pendingUploads[s] ?? 0) > 0 ||
              (state.taxation.pendingReturns[s] ?? 0) > 0
          ) ?? current.actingSeatId
        : current.actingSeatId;

    // Shallow copy state so React notices the change.
    let mergedState = state;
    let mergedEvents: unknown[] = events;
    let actingAfter = nextActing;
    if (current.autoBots) {
      // Human = whoever just dispatched. Drain autonomous turns for
      // every other seat until the flow needs the human's input again.
      const drained = drainBotTurns(
        mergedState,
        current.actingSeatId,
        current.version + 1
      );
      mergedState = drained.state;
      mergedEvents = [...mergedEvents, ...drained.events];
      actingAfter = drained.actingSeatId;
    }
    current = {
      ...current,
      state: { ...mergedState },
      events: mergedEvents,
      version: current.version + 1,
      actingSeatId: actingAfter,
    };
    notify();
    // Mirror to the global store so shared overlays that read
    // `gameView.lastEvents` (revolution / tax result / history) still
    // fire during test-mode runs.
    void mirrorToGlobalStore();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Runs autonomous actions for whichever seat currently needs to act,
 * as long as it isn't the viewer's seat. Uses a deliberately naive bot
 * policy — the goal is to keep the round moving so the tester can see
 * end-to-end transitions, not to play well. Straights are skipped.
 */
function drainBotTurns(
  startState: MomontyState,
  humanSeatId: string,
  baseVersion: number
): { state: MomontyState; events: unknown[]; actingSeatId: string } {
  let state = startState;
  const events: unknown[] = [];
  let acting = humanSeatId;
  // Guard against unexpected infinite loops.
  for (let step = 0; step < 200; step++) {
    if (state.phase === "MATCH_END") break;
    const activeSeat = seatToDrive(state, humanSeatId);
    if (!activeSeat || activeSeat === humanSeatId) {
      // Return control to the human seat once the flow needs their input.
      acting = seatToDrive(state, humanSeatId) ?? humanSeatId;
      break;
    }
    const bot = botAction(state, activeSeat);
    if (!bot) {
      acting = activeSeat;
      break;
    }
    const rng = makeRng(`test:bot:${baseVersion}:${step}:${activeSeat}`);
    try {
      const result = momontyGame.reduce({
        state,
        seatId: activeSeat,
        action: bot,
        rng,
      });
      state = result.state;
      for (const e of result.events) events.push(e);
    } catch (e) {
      // Bot picked an illegal move — fall back to pass, and if that also
      // fails, hand control back to the human.
      try {
        const rng2 = makeRng(`test:botpass:${baseVersion}:${step}:${activeSeat}`);
        const result = momontyGame.reduce({
          state,
          seatId: activeSeat,
          action: { t: "pass" },
          rng: rng2,
        });
        state = result.state;
        for (const e of result.events) events.push(e);
      } catch {
        acting = activeSeat;
        break;
      }
    }
  }
  return { state, events, actingSeatId: acting };
}

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
  if (state.phase === "RANK_REVEAL" || state.phase === "ROUND_END") return humanSeatId;
  return null;
}

function botAction(state: MomontyState, seatId: string): MomontyAction | null {
  if (state.phase === "DRAWING_RANK") return { t: "drawRank" };
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
  if (numbered.length === 0) return { t: "pass" };
  // Weakest = highest value (1 is the strongest).
  const byVal = new Map<number, Card[]>();
  for (const c of numbered) {
    const arr = byVal.get(c.value) ?? [];
    arr.push(c);
    byVal.set(c.value, arr);
  }
  let best: { v: number; cards: Card[] } | null = null;
  for (const [v, cards] of byVal.entries()) {
    if (!best || v > best.v || (v === best.v && cards.length > best.cards.length)) {
      best = { v, cards };
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
  void mirrorToGlobalStore();
}

async function mirrorToGlobalStore(): Promise<void> {
  if (!current) return;
  const { patchState } = await import("./store");
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
    autoBots: true,
  };
}
