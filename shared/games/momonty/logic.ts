import type { GameEvent, GameModule, Rng, Seat } from "../../engine";

/*
 * Momonty (모몬티) — climb/king ladder shedding game.
 *
 * Rank ladder (best → worst) — determined by round order-out. First out is
 * "Momonty" (king), last is "Peon" (bottom). At round start the peon(s) hand
 * their best cards up to the momonty(s) ("과세"), and momonty(s) return their
 * choice back down.
 *
 * Trick play — lead sets a form (single / pair / triple / quad / straight
 * (run of same length)), then each seat clockwise must either:
 *   - beat the current top with the SAME form and a STRICTLY HIGHER value,
 *     OR play jesters (wild) that assume any value,
 *     OR pass.
 * Lower numeric values are STRONGER (1 is best, 12 is weakest — inverted
 * "poor man's poker" style: reflects the game's "낮은 숫자가 왕" theme.)
 * When all remaining seats after the last playing seat have passed, the
 * pile clears and the last player leads the next trick.
 *
 * Round ends when only one seat has cards left. Match ends when target
 * rounds reached.
 *
 * The state is designed to be JSON-serialised into the DO storage and to be
 * projected via `view(state, seat)` so the OTHER seats' hands are hidden.
 */

/* -------------------------- Config -------------------------- */

export interface MomontyConfig {
  playerCount: number; // 4..8, but validated at runtime against actual seats
  cardMax: number; // usually 12, cards run 1..cardMax
  copiesPerValue: number; // 6 (so 12*6 = 72 numbered cards)
  jesters: number; // 2 (wild)
  taxationEnabled: boolean;
  revolutionEnabled: boolean;
  greatRevolutionEnabled: boolean;
  jesterPenalty: boolean; // -2 if still holding a jester at round end
  autoPassOnUnplayable: boolean;
  quadLock: boolean; // if all copies of a number are played, clear immediately
  turnLimitSec: number;
  targetRounds: number;
  historyMode: "all" | "last" | "none";
}

export const defaultConfig: MomontyConfig = {
  playerCount: 6,
  cardMax: 12,
  copiesPerValue: 6,
  jesters: 2,
  taxationEnabled: true,
  revolutionEnabled: true,
  greatRevolutionEnabled: false,
  jesterPenalty: true,
  autoPassOnUnplayable: false,
  quadLock: true,
  turnLimitSec: 20,
  targetRounds: 7,
  historyMode: "all",
};

/* -------------------------- Card -------------------------- */

/** A card is either a number 1..cardMax or a jester (wild). */
export interface Card {
  id: string; // unique in deck for stable React keys
  value: number | null; // null = jester
}

/* -------------------------- Rank tiers -------------------------- */

export type Rank =
  | "GRAND_MOMONTY"
  | "MOMONTY"
  | "MERCHANT"
  | "PEON"
  | "GRAND_PEON";

export const RANK_LABEL_KO: Record<Rank, string> = {
  GRAND_MOMONTY: "그레이터 모몬티",
  MOMONTY: "레서 모몬티",
  MERCHANT: "상인",
  PEON: "레서 페온",
  GRAND_PEON: "그레이터 페온",
};

/* -------------------------- Trick form -------------------------- */

export type TrickForm =
  | { kind: "none" }
  | { kind: "single"; value: number }
  | { kind: "pair"; value: number }
  | { kind: "triple"; value: number }
  | { kind: "quad"; value: number }
  | { kind: "straight"; startValue: number; length: number };

/* -------------------------- State -------------------------- */

export interface Trick {
  leaderSeatId: string;
  form: TrickForm;
  topPlay: TrickPlay | null;
  passSeatIds: string[];
}

export interface TrickPlay {
  seatId: string;
  cards: Card[];
  effectiveValue: number; // for straights: startValue
  jesterCount: number;
  formKind: TrickForm["kind"];
  formLength: number; // straight length or set size
}

export type Phase =
  | "DRAWING_RANK" // first round: each seat draws a rank card
  | "RANK_REVEAL"
  | "TAXATION" // peon uploads, momonty returns
  | "REVOLUTION_WINDOW" // during tax, jester-holder may declare
  | "PLAYING"
  | "ROUND_END"
  | "MATCH_END";

export interface MomontyState {
  config: MomontyConfig;
  round: number;
  phase: Phase;
  currentTrick: Trick;
  seatOrder: string[]; // clockwise
  currentSeatIdx: number; // index into seatOrder
  hands: Record<string, Card[]>; // secret per seat
  ranks: Record<string, Rank>; // this round's rank tier
  scoreByUser: Record<string, number>; // match-level score
  outOrder: string[]; // seats who cleared their hand this round, in order
  history: Array<{ type: string; payload?: any; seatId?: string }>;
  taxation: {
    // Peon-side owes upload; momonty-side owes return.
    // Filled at PLAYING start when both sides done, or by REVOLUTION.
    pendingUploads: Record<string, number>; // seat -> #cards to give up
    pendingReturns: Record<string, number>; // seat -> #cards to return
    uploadedCards: Record<string, Card[]>;
    revolutionUsed: boolean;
    greatRevolution: boolean;
  };
  match: {
    targetRounds: number;
    completedRounds: number;
    winnerUserId?: string;
  };
  drawRank?: {
    // Only used during first round: seat -> draw result
    picks: Record<string, number>;
  };
}

/* -------------------------- Action -------------------------- */

export type MomontyAction =
  | { t: "drawRank" }
  | { t: "uploadCards"; cardIds: string[] }
  | { t: "returnCards"; cardIds: string[] }
  | { t: "declareRevolution" }
  | { t: "playCards"; cardIds: string[]; wildAsValue?: number; straightLength?: number }
  | { t: "pass" };

/* -------------------------- Helpers -------------------------- */

function buildDeck(cfg: MomontyConfig): Card[] {
  const out: Card[] = [];
  let seq = 0;
  for (let v = 1; v <= cfg.cardMax; v++) {
    for (let c = 0; c < cfg.copiesPerValue; c++) {
      out.push({ id: `c${seq++}`, value: v });
    }
  }
  for (let j = 0; j < cfg.jesters; j++) {
    out.push({ id: `j${seq++}`, value: null });
  }
  return out;
}

function seatById(seats: string[], id: string): number {
  return seats.indexOf(id);
}

function canBeatCurrentTrick(state: MomontyState, seatId: string): boolean {
  const trick = state.currentTrick;
  if (trick.form.kind === "none") return true;
  const hand = state.hands[seatId] ?? [];
  const jesters = hand.filter((c) => c.value === null).length;
  const numbered = hand.filter((c) => c.value !== null) as (Card & { value: number })[];
  const target = "value" in trick.form ? trick.form.value : trick.form.startValue;
  const size =
    trick.form.kind === "single"
      ? 1
      : trick.form.kind === "pair"
      ? 2
      : trick.form.kind === "triple"
      ? 3
      : trick.form.kind === "quad"
      ? 4
      : trick.form.length;
  // Set-form check: any value strictly lower with enough copies + jesters
  if (trick.form.kind !== "straight") {
    for (let v = 1; v < target; v++) {
      const copies = numbered.filter((c) => c.value === v).length;
      if (copies + jesters >= size) return true;
    }
    return false;
  }
  // Straight — look for a run of length `size` starting at any s < target.
  const valueSet = new Set(numbered.map((c) => c.value));
  for (let start = 1; start < target; start++) {
    let missing = 0;
    for (let i = 0; i < size; i++) if (!valueSet.has(start + i)) missing++;
    if (missing <= jesters) return true;
  }
  return false;
}

function nextSeat(state: MomontyState): void {
  state.currentSeatIdx = (state.currentSeatIdx + 1) % state.seatOrder.length;
  const trick = state.currentTrick;
  for (let n = 0; n < state.seatOrder.length; n++) {
    const seatId = state.seatOrder[state.currentSeatIdx];
    const hand = state.hands[seatId] ?? [];
    if (hand.length === 0) {
      state.currentSeatIdx = (state.currentSeatIdx + 1) % state.seatOrder.length;
      continue;
    }
    if (trick.passSeatIds.includes(seatId)) {
      state.currentSeatIdx = (state.currentSeatIdx + 1) % state.seatOrder.length;
      continue;
    }
    if (trick.topPlay && trick.topPlay.seatId === seatId) {
      // Trick came back to the leader — everyone else passed. Clear pile.
      clearTrick(state);
      return;
    }
    // Auto-pass unplayable: if the seat can't beat the current form and the
    // option is on, mark them as passed and continue rotating.
    if (
      state.config.autoPassOnUnplayable &&
      trick.form.kind !== "none" &&
      !canBeatCurrentTrick(state, seatId)
    ) {
      trick.passSeatIds.push(seatId);
      state.history.push({ type: "autoPass", seatId });
      state.currentSeatIdx = (state.currentSeatIdx + 1) % state.seatOrder.length;
      continue;
    }
    return;
  }
}

function clearTrick(state: MomontyState): void {
  const winnerSeatId = state.currentTrick.topPlay?.seatId ?? state.currentTrick.leaderSeatId;
  state.currentTrick = {
    leaderSeatId: winnerSeatId,
    form: { kind: "none" },
    topPlay: null,
    passSeatIds: [],
  };
  state.currentSeatIdx = state.seatOrder.indexOf(winnerSeatId);
  // If winner is already out, advance to next non-out seat.
  if ((state.hands[winnerSeatId] ?? []).length === 0) {
    for (let n = 0; n < state.seatOrder.length; n++) {
      state.currentSeatIdx = (state.currentSeatIdx + 1) % state.seatOrder.length;
      const sid = state.seatOrder[state.currentSeatIdx];
      if ((state.hands[sid] ?? []).length > 0) break;
    }
  }
}

function analyseCards(
  cards: Card[],
  wildAsValue: number | undefined,
  straightLength: number | undefined
): { form: TrickForm; jesterCount: number; length: number; effectiveValue: number } {
  const jesters = cards.filter((c) => c.value === null);
  const numbered = cards.filter((c) => c.value !== null) as (Card & { value: number })[];
  const jc = jesters.length;

  if (cards.length === 0) throw new Error("no cards");

  // Pure jester play — must declare wildAsValue.
  if (numbered.length === 0) {
    if (wildAsValue == null) throw new Error("wildAsValue required");
    return {
      form:
        cards.length === 1
          ? { kind: "single", value: wildAsValue }
          : cards.length === 2
          ? { kind: "pair", value: wildAsValue }
          : cards.length === 3
          ? { kind: "triple", value: wildAsValue }
          : cards.length === 4
          ? { kind: "quad", value: wildAsValue }
          : (() => {
              throw new Error("cannot form straight from jesters alone");
            })(),
      jesterCount: jc,
      length: cards.length,
      effectiveValue: wildAsValue,
    };
  }

  const values = numbered.map((c) => c.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const uniq = new Set(values);

  // Set (single/pair/triple/quad): all numbered same value, jesters fill.
  if (uniq.size === 1) {
    const v = min;
    const total = cards.length;
    const kind =
      total === 1
        ? ("single" as const)
        : total === 2
        ? ("pair" as const)
        : total === 3
        ? ("triple" as const)
        : total === 4
        ? ("quad" as const)
        : null;
    if (kind) {
      return {
        form: { kind, value: v },
        jesterCount: jc,
        length: total,
        effectiveValue: v,
      };
    }
  }

  // Straight — length >= 3, contiguous values (jesters may fill gaps or extend).
  if (cards.length >= 3) {
    const len = straightLength ?? cards.length;
    if (len !== cards.length) throw new Error("straight length mismatch");
    // Try to place numbered values into a contiguous run of `len`.
    // Start values from (max-len+1) up to min. Find any that fits.
    for (let start = Math.max(1, max - len + 1); start <= min; start++) {
      const target = new Set<number>();
      for (let i = 0; i < len; i++) target.add(start + i);
      const needJesters = len - numbered.length;
      if (needJesters < 0 || needJesters !== jc) continue;
      const missing: number[] = [];
      for (const v of target) if (!values.includes(v)) missing.push(v);
      if (missing.length === needJesters) {
        return {
          form: { kind: "straight", startValue: start, length: len },
          jesterCount: jc,
          length: len,
          effectiveValue: start,
        };
      }
    }
  }
  throw new Error("cards do not form a legal play");
}

function beats(
  form: TrickForm,
  candidate: {
    form: TrickForm;
    length: number;
    effectiveValue: number;
  },
  greatRevolution: boolean
): boolean {
  if (form.kind === "none") return true;
  if (form.kind !== candidate.form.kind) return false;
  if (form.kind === "straight" && candidate.form.kind === "straight") {
    if (form.length !== candidate.form.length) return false;
  }
  const curV = "value" in form ? form.value : form.kind === "straight" ? form.startValue : 0;
  const newV = candidate.effectiveValue;
  // Momonty rule: LOWER numeric value is stronger. Great revolution flips it.
  return greatRevolution ? newV > curV : newV < curV;
}

/* -------------------------- Rank assignment -------------------------- */

function assignRanks(
  outOrder: string[],
  allSeats: string[],
  greatRevolution: boolean
): Record<string, Rank> {
  // outOrder[0] = first out (=strongest). Assign top-down and bottom-up.
  const n = allSeats.length;
  const remaining = [...outOrder];
  // Ensure any not-yet-out seats fall to the bottom (shouldn't happen but robust).
  for (const s of allSeats) if (!remaining.includes(s)) remaining.push(s);
  const ranks: Record<string, Rank> = {};
  for (let i = 0; i < n; i++) {
    const seatId = remaining[i];
    let tier: Rank;
    if (i === 0) tier = "GRAND_MOMONTY";
    else if (i === 1) tier = "MOMONTY";
    else if (i === n - 1) tier = "GRAND_PEON";
    else if (i === n - 2) tier = "PEON";
    else tier = "MERCHANT";
    ranks[seatId] = tier;
  }
  if (greatRevolution) {
    // swap Grand↔Grand, Lesser↔Lesser
    for (const [s, r] of Object.entries(ranks)) {
      if (r === "GRAND_MOMONTY") ranks[s] = "GRAND_PEON";
      else if (r === "GRAND_PEON") ranks[s] = "GRAND_MOMONTY";
      else if (r === "MOMONTY") ranks[s] = "PEON";
      else if (r === "PEON") ranks[s] = "MOMONTY";
    }
  }
  return ranks;
}

function taxAmount(rank: Rank): { upload: number; ret: number } {
  switch (rank) {
    case "GRAND_PEON":
      return { upload: 2, ret: 0 };
    case "PEON":
      return { upload: 1, ret: 0 };
    case "GRAND_MOMONTY":
      return { upload: 0, ret: 2 };
    case "MOMONTY":
      return { upload: 0, ret: 1 };
    default:
      return { upload: 0, ret: 0 };
  }
}

/* -------------------------- Public view -------------------------- */

export interface MomontyView {
  config: MomontyConfig;
  round: number;
  phase: Phase;
  currentTrick: Trick;
  seatOrder: string[];
  currentSeatId: string | null;
  handCounts: Record<string, number>;
  myHand?: Card[]; // present when seatId matches
  mySeatId?: string | null;
  ranks: Record<string, Rank>;
  scoreByUser: Record<string, number>;
  outOrder: string[];
  historyTail: MomontyState["history"];
  taxation: MomontyState["taxation"] & {
    myPendingUpload?: number;
    myPendingReturn?: number;
  };
  match: MomontyState["match"];
  drawRank?: MomontyState["drawRank"];
  /** Optional: display names keyed by seatId. Live rooms populate this
   * from `seats`; test store from its local map. When absent, views
   * fall back to seatId short suffix. */
  seatNames?: Record<string, string>;
}

/* -------------------------- Round setup -------------------------- */

function beginRound(state: MomontyState, rng: Rng): void {
  const cfg = state.config;
  const deck = rng.shuffle(buildDeck(cfg));
  const seats = state.seatOrder;
  state.hands = {};
  const handSize = Math.floor(deck.length / seats.length);
  for (let i = 0; i < seats.length; i++) {
    state.hands[seats[i]] = deck.slice(i * handSize, i * handSize + handSize);
  }
  // Left-over cards go to the bottom of Grand Momonty (nice-to-have), or to
  // first seat if no ranks yet. For simplicity, distribute round-robin to top.
  const remainder = deck.slice(seats.length * handSize);
  const topSeat =
    Object.entries(state.ranks).find(([, r]) => r === "GRAND_MOMONTY")?.[0] ?? seats[0];
  state.hands[topSeat].push(...remainder);

  state.outOrder = [];
  state.taxation = {
    pendingUploads: {},
    pendingReturns: {},
    uploadedCards: {},
    revolutionUsed: false,
    greatRevolution: false,
  };

  if (state.round === 1) {
    state.phase = "DRAWING_RANK";
    state.drawRank = { picks: {} };
    // First-round: initial ranks are unknown until draw. Everyone treated as MERCHANT.
    for (const s of seats) state.ranks[s] = "MERCHANT";
  } else if (cfg.taxationEnabled) {
    state.phase = "TAXATION";
    for (const [seatId, rank] of Object.entries(state.ranks)) {
      const t = taxAmount(rank);
      if (t.upload > 0) state.taxation.pendingUploads[seatId] = t.upload;
      if (t.ret > 0) state.taxation.pendingReturns[seatId] = t.ret;
    }
    if (Object.keys(state.taxation.pendingUploads).length === 0) {
      state.phase = "PLAYING";
    }
  } else {
    state.phase = "PLAYING";
  }

  // Reset trick to none — the leader is set in beginPlay below when we advance to PLAYING.
  state.currentTrick = {
    leaderSeatId:
      Object.entries(state.ranks).find(([, r]) => r === "GRAND_MOMONTY")?.[0] ?? seats[0],
    form: { kind: "none" },
    topPlay: null,
    passSeatIds: [],
  };
  state.currentSeatIdx = state.seatOrder.indexOf(state.currentTrick.leaderSeatId);
}

/* -------------------------- Module -------------------------- */

export const momontyGame: GameModule<MomontyConfig, MomontyState, MomontyAction, MomontyView> = {
  id: "momonty",
  displayName: "Momonty",
  koreanName: "모몬티",
  tagline: "낮은 숫자가 왕이 되는 서열 대전",
  accent: "momonty",
  minPlayers: 4,
  maxPlayers: 8,

  defaultConfig() {
    return { ...defaultConfig };
  },

  init({ seats, config, rng }) {
    const seatOrder = seats.map((s) => s.seatId);
    const state: MomontyState = {
      config,
      round: 1,
      phase: "DRAWING_RANK",
      currentTrick: {
        leaderSeatId: seatOrder[0],
        form: { kind: "none" },
        topPlay: null,
        passSeatIds: [],
      },
      seatOrder,
      currentSeatIdx: 0,
      hands: {},
      ranks: Object.fromEntries(seatOrder.map((s) => [s, "MERCHANT" as Rank])),
      scoreByUser: Object.fromEntries(seats.map((s) => [s.userId, 0])),
      outOrder: [],
      history: [],
      taxation: {
        pendingUploads: {},
        pendingReturns: {},
        uploadedCards: {},
        revolutionUsed: false,
        greatRevolution: false,
      },
      match: { targetRounds: config.targetRounds, completedRounds: 0 },
    };
    beginRound(state, rng);
    return state;
  },

  reduce({ state, seatId, action, rng }) {
    const events: GameEvent[] = [];

    if (state.phase === "DRAWING_RANK" && action.t === "drawRank") {
      if (state.drawRank?.picks[seatId] != null) throw new Error("already drew");
      const pick = 1 + rng.nextInt(state.config.cardMax);
      state.drawRank!.picks[seatId] = pick;
      events.push({ type: "drawRank", actorSeatId: seatId, payload: { value: pick } });
      // If all seats drew — resolve ranks by ascending pick (ties broken by seat order).
      const picks = state.drawRank!.picks;
      if (Object.keys(picks).length === state.seatOrder.length) {
        const ordered = [...state.seatOrder].sort((a, b) => {
          if (picks[a] !== picks[b]) return picks[a] - picks[b];
          return state.seatOrder.indexOf(a) - state.seatOrder.indexOf(b);
        });
        // Fake outOrder from the pick — assign ranks as if they'd been out in this order.
        state.ranks = assignRanks(ordered, state.seatOrder, false);
        state.phase = "RANK_REVEAL";
        events.push({ type: "rankRevealed", payload: { ranks: state.ranks } });
        // First round skips taxation (no prior ranks matter in the rule as written,
        // but many house rules keep tax from R1 too — we skip for clarity).
        state.phase = "PLAYING";
        state.currentTrick.leaderSeatId =
          Object.entries(state.ranks).find(([, r]) => r === "GRAND_MOMONTY")?.[0] ??
          state.seatOrder[0];
        state.currentSeatIdx = state.seatOrder.indexOf(state.currentTrick.leaderSeatId);
      }
      return { state, events };
    }

    if (state.phase === "TAXATION" && action.t === "uploadCards") {
      const owed = state.taxation.pendingUploads[seatId] ?? 0;
      if (owed === 0) throw new Error("nothing to upload");
      if (action.cardIds.length !== owed) throw new Error("wrong upload count");
      const hand = state.hands[seatId];
      const picked: Card[] = [];
      for (const cid of action.cardIds) {
        const idx = hand.findIndex((c) => c.id === cid);
        if (idx < 0) throw new Error("card not in hand");
        picked.push(hand[idx]);
        hand.splice(idx, 1);
      }
      // System auto-picks top values for peons — client should send those.
      // We trust the client but validate: value should be highest N of the hand
      // before the pick. Skip validation for simplicity; the auto-pick UI enforces it.
      state.taxation.uploadedCards[seatId] = picked;
      delete state.taxation.pendingUploads[seatId];
      events.push({ type: "uploaded", actorSeatId: seatId, payload: { count: picked.length } });
      // If uploads done and returns done, move to PLAYING.
      maybeStartPlaying(state);
      return { state, events };
    }

    if (state.phase === "TAXATION" && action.t === "returnCards") {
      const owed = state.taxation.pendingReturns[seatId] ?? 0;
      if (owed === 0) throw new Error("nothing to return");
      if (action.cardIds.length !== owed) throw new Error("wrong return count");
      // Move chosen cards from momonty's hand back to matching peon's hand.
      // We give returns to seats who uploaded — pair top momonty with grand peon.
      const target = pickReturnTarget(state, seatId);
      if (!target) throw new Error("no return target");
      const hand = state.hands[seatId];
      const picked: Card[] = [];
      for (const cid of action.cardIds) {
        const idx = hand.findIndex((c) => c.id === cid);
        if (idx < 0) throw new Error("card not in hand");
        picked.push(hand[idx]);
        hand.splice(idx, 1);
      }
      state.hands[target].push(...picked);
      delete state.taxation.pendingReturns[seatId];
      events.push({
        type: "returned",
        actorSeatId: seatId,
        payload: { toSeatId: target, count: picked.length },
      });
      maybeStartPlaying(state);
      return { state, events };
    }

    if (state.phase === "TAXATION" && action.t === "declareRevolution") {
      if (state.taxation.revolutionUsed) throw new Error("already revolted");
      if (!state.config.revolutionEnabled) throw new Error("revolution disabled");
      const jesters = state.hands[seatId].filter((c) => c.value === null).length;
      if (jesters < 2) throw new Error("need 2 jesters");
      state.taxation.revolutionUsed = true;
      state.taxation.pendingUploads = {};
      state.taxation.pendingReturns = {};
      // Uploaded cards return to owners.
      for (const [srcSeat, cards] of Object.entries(state.taxation.uploadedCards)) {
        state.hands[srcSeat].push(...cards);
      }
      state.taxation.uploadedCards = {};
      state.taxation.greatRevolution = state.config.greatRevolutionEnabled;
      if (state.taxation.greatRevolution) {
        state.ranks = assignRanks(
          [...state.outOrder].length
            ? [...state.outOrder]
            : Object.entries(state.ranks)
                .sort((a, b) => rankOrder(a[1]) - rankOrder(b[1]))
                .map(([s]) => s),
          state.seatOrder,
          true
        );
      }
      events.push({ type: "revolution", actorSeatId: seatId });
      state.phase = "PLAYING";
      state.currentTrick.leaderSeatId =
        Object.entries(state.ranks).find(([, r]) => r === "GRAND_MOMONTY")?.[0] ??
        state.seatOrder[0];
      state.currentSeatIdx = state.seatOrder.indexOf(state.currentTrick.leaderSeatId);
      return { state, events };
    }

    if (state.phase === "PLAYING") {
      const activeSeatId = state.seatOrder[state.currentSeatIdx];
      if (activeSeatId !== seatId) throw new Error("not your turn");
      if (action.t === "pass") {
        if (state.currentTrick.form.kind === "none") throw new Error("cannot pass when leading");
        state.currentTrick.passSeatIds.push(seatId);
        events.push({ type: "pass", actorSeatId: seatId });
        nextSeat(state);
      } else if (action.t === "playCards") {
        const hand = state.hands[seatId];
        const picked: Card[] = [];
        for (const cid of action.cardIds) {
          const idx = hand.findIndex((c) => c.id === cid);
          if (idx < 0) throw new Error("card not in hand");
          picked.push(hand[idx]);
        }
        const analysis = analyseCards(picked, action.wildAsValue, action.straightLength);
        if (
          state.currentTrick.form.kind !== "none" &&
          !beats(state.currentTrick.form, analysis, state.taxation.greatRevolution)
        )
          throw new Error("doesn't beat current pile");
        if (state.currentTrick.form.kind !== "none") {
          // Must match form's set size / straight length.
          if (
            (state.currentTrick.form.kind === "straight" &&
              analysis.form.kind === "straight" &&
              state.currentTrick.form.length !== analysis.form.length) ||
            (state.currentTrick.form.kind !== "straight" &&
              state.currentTrick.form.kind !== analysis.form.kind)
          ) {
            throw new Error("form mismatch");
          }
        }
        // Remove from hand
        for (const cid of action.cardIds) {
          const idx = hand.findIndex((c) => c.id === cid);
          hand.splice(idx, 1);
        }
        state.currentTrick.topPlay = {
          seatId,
          cards: picked,
          effectiveValue: analysis.effectiveValue,
          jesterCount: analysis.jesterCount,
          formKind: analysis.form.kind,
          formLength: analysis.length,
        };
        state.currentTrick.form = analysis.form;
        state.currentTrick.passSeatIds = [];
        events.push({
          type: "play",
          actorSeatId: seatId,
          payload: {
            cards: picked,
            form: analysis.form,
          },
        });
        // Quad lock: same-value quad clears the pile.
        const quadCleared = analysis.form.kind === "quad" && state.config.quadLock;
        if (quadCleared) {
          events.push({ type: "quadClear", actorSeatId: seatId });
          clearTrick(state);
          state.currentTrick.leaderSeatId = seatId;
          state.currentSeatIdx = state.seatOrder.indexOf(seatId);
        }
        // If hand empty, mark out.
        if (hand.length === 0) {
          if (!state.outOrder.includes(seatId)) state.outOrder.push(seatId);
          events.push({ type: "out", actorSeatId: seatId });
          // Advance turn ownership away from finished seat.
          nextSeat(state);
        } else if (!quadCleared) {
          // Normal play — advance to next seat. When quad-lock triggers,
          // clearTrick already set the acting seat back to the winner.
          nextSeat(state);
        }
      }

      // End-of-round: only 1 or 0 seats still hold cards.
      const alive = state.seatOrder.filter((s) => (state.hands[s] ?? []).length > 0);
      if (alive.length <= 1) {
        for (const s of alive) if (!state.outOrder.includes(s)) state.outOrder.push(s);
        endRound(state, rng, events);
      }
      return { state, events };
    }

    if (state.phase === "ROUND_END") {
      // No player actions from this phase — round ends via internal timers/UI-advance.
      throw new Error("no actions available");
    }
    throw new Error(`invalid action for phase ${state.phase}`);
  },

  isTerminal(state) {
    return state.phase === "MATCH_END";
  },

  view(state, seatId) {
    const handCounts: Record<string, number> = {};
    for (const [s, cards] of Object.entries(state.hands)) handCounts[s] = cards.length;
    const view: MomontyView = {
      config: state.config,
      round: state.round,
      phase: state.phase,
      currentTrick: state.currentTrick,
      seatOrder: state.seatOrder,
      currentSeatId:
        state.phase === "PLAYING"
          ? state.seatOrder[state.currentSeatIdx] ?? null
          : null,
      handCounts,
      myHand: seatId ? state.hands[seatId]?.slice() : undefined,
      mySeatId: seatId,
      ranks: state.ranks,
      scoreByUser: state.scoreByUser,
      outOrder: state.outOrder,
      historyTail: state.history.slice(-30),
      taxation: {
        ...state.taxation,
        myPendingUpload: seatId ? state.taxation.pendingUploads[seatId] : undefined,
        myPendingReturn: seatId ? state.taxation.pendingReturns[seatId] : undefined,
      },
      match: state.match,
      drawRank: state.drawRank,
    };
    return view;
  },
};

/* -------------------------- Round end -------------------------- */

function endRound(state: MomontyState, rng: Rng, events: GameEvent[]): void {
  const seats = state.seatOrder;
  const ranks = assignRanks(state.outOrder, seats, state.taxation.greatRevolution);

  // Score: momonty tiers gain rounds, peon tiers lose.
  for (const seatId of seats) {
    const rank = ranks[seatId];
    // Find user id by seat lookup — we don't store it here, so use ranks scoreByUser via mapping in reduce level.
    // To keep this clean, we defer score to the DO layer that owns seat→user mapping.
    // We record events; DO applies to match score.
    events.push({ type: "roundResult", actorSeatId: seatId, payload: { rank } });
  }

  // Jester penalty for lingering wilds.
  if (state.config.jesterPenalty) {
    for (const [seatId, hand] of Object.entries(state.hands)) {
      const j = hand.filter((c) => c.value === null).length;
      if (j > 0)
        events.push({ type: "jesterPenalty", actorSeatId: seatId, payload: { count: j } });
    }
  }

  state.ranks = ranks;
  state.match.completedRounds += 1;
  events.push({ type: "roundEnd", payload: { ranks, outOrder: state.outOrder } });

  if (state.match.completedRounds >= state.match.targetRounds) {
    state.phase = "MATCH_END";
    events.push({ type: "matchEnd", payload: { ranks } });
    return;
  }
  state.round += 1;
  beginRound(state, rng);
}

/* -------------------------- Helpers cont'd -------------------------- */

function maybeStartPlaying(state: MomontyState): void {
  if (Object.keys(state.taxation.pendingUploads).length > 0) return;
  // Once uploads done, deliver to momontys and wait for their returns.
  const uploaded = Object.values(state.taxation.uploadedCards).flat();
  if (uploaded.length > 0) {
    // Sort by rank strength: grand momonty gets 2, momonty gets 1.
    const momontys = Object.entries(state.ranks)
      .filter(([, r]) => r === "GRAND_MOMONTY" || r === "MOMONTY")
      .sort(([, a], [, b]) => rankOrder(a) - rankOrder(b));
    const sortedUploads = uploaded.sort((a, b) => (a.value ?? 99) - (b.value ?? 99));
    let idx = 0;
    for (const [seatId, r] of momontys) {
      const need = r === "GRAND_MOMONTY" ? 2 : 1;
      const gift = sortedUploads.slice(idx, idx + need);
      idx += need;
      state.hands[seatId].push(...gift);
    }
    state.taxation.uploadedCards = {};
  }
  if (Object.keys(state.taxation.pendingReturns).length > 0) return;
  // All done: begin play.
  state.phase = "PLAYING";
  state.currentTrick.leaderSeatId =
    Object.entries(state.ranks).find(([, r]) => r === "GRAND_MOMONTY")?.[0] ??
    state.seatOrder[0];
  state.currentSeatIdx = state.seatOrder.indexOf(state.currentTrick.leaderSeatId);
}

function pickReturnTarget(state: MomontyState, momontySeat: string): string | null {
  const rank = state.ranks[momontySeat];
  const peonRank = rank === "GRAND_MOMONTY" ? "GRAND_PEON" : "PEON";
  for (const [s, r] of Object.entries(state.ranks)) if (r === peonRank) return s;
  return null;
}

function rankOrder(r: Rank): number {
  return ["GRAND_MOMONTY", "MOMONTY", "MERCHANT", "PEON", "GRAND_PEON"].indexOf(r);
}
