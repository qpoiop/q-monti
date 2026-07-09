import type { GameModule } from "../../engine";

/*
 * IndienTrick (모디언트릭) — Indian-poker + bug-poker fusion.
 * Skeleton engine — bets/reveals are placeholder to satisfy the registry.
 */

export interface IndientConfig {
  deck: "1-10x4" | "1-15x2";
  startingChips: number;
  ante: number;
  maxRounds: number;
  turnLimitSec: number;
  showCounter: boolean;
}

export interface IndientState {
  config: IndientConfig;
  phase: "BETTING" | "SHOWDOWN" | "MATCH_END";
  seatOrder: string[];
  currentSeatIdx: number;
  chips: Record<string, number>;
  pot: number;
  cards: Record<string, number>; // seatId -> value (opponent can see; owner cannot)
  discard: number[];
  round: number;
  winnerSeatId?: string;
}

export type IndientAction =
  | { t: "check" }
  | { t: "call" }
  | { t: "raise"; amount: number }
  | { t: "fold" }
  | { t: "declare"; claim: "higher" | number };

export const indientGame: GameModule<
  IndientConfig,
  IndientState,
  IndientAction,
  IndientState
> = {
  id: "indient",
  displayName: "IndienTrick",
  koreanName: "모디언트릭",
  tagline: "심리 · 확률 · 베팅",
  accent: "indient",
  minPlayers: 2,
  maxPlayers: 2,

  defaultConfig() {
    return {
      deck: "1-10x4",
      startingChips: 30,
      ante: 1,
      maxRounds: 15,
      turnLimitSec: 15,
      showCounter: true,
    };
  },

  init({ seats, config, rng }) {
    const seatOrder = seats.map((s) => s.seatId);
    const chips = Object.fromEntries(seatOrder.map((s) => [s, config.startingChips]));
    const cards = Object.fromEntries(seatOrder.map((s) => [s, 1 + rng.nextInt(10)]));
    return {
      config,
      phase: "BETTING",
      seatOrder,
      currentSeatIdx: 0,
      chips,
      pot: seatOrder.length * config.ante,
      cards,
      discard: [],
      round: 1,
    };
  },

  reduce({ state, seatId, action }) {
    if (state.seatOrder[state.currentSeatIdx] !== seatId) throw new Error("not your turn");
    if (action.t === "fold") {
      state.phase = "MATCH_END";
      state.winnerSeatId = state.seatOrder.find((s) => s !== seatId);
    }
    state.currentSeatIdx = (state.currentSeatIdx + 1) % state.seatOrder.length;
    return { state, events: [] };
  },

  isTerminal(state) {
    return state.phase === "MATCH_END";
  },

  view(state, seatId) {
    // Own card hidden from self; opponent card visible.
    const cards: Record<string, number> = {};
    for (const [s, v] of Object.entries(state.cards)) {
      cards[s] = s === seatId ? -1 : v;
    }
    return { ...state, cards };
  },
};
