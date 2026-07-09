import type { GameModule } from "../../engine";

/*
 * Binchi (모빈치코드) — Davinci-code sorted-tile deduction.
 * Skeleton; the reducer implements draw / guess but full jokers and
 * multiplayer targeting are stubbed for a follow-up pass.
 */

export interface BinchiConfig {
  playerCount: 2 | 3 | 4;
  handSize: number;
  turnLimitSec: number;
  candidateHint: boolean;
}

interface Tile {
  id: string;
  value: number;
  color: "black" | "white" | "joker";
  revealed: boolean;
  owner: string;
}

export interface BinchiState {
  config: BinchiConfig;
  phase: "PLAYING" | "MATCH_END";
  seatOrder: string[];
  currentSeatIdx: number;
  tiles: Tile[];
  deck: Tile[]; // face-down centre pile
  handHeld?: { seatId: string; tileId: string }; // drawn tile in owner's hand
  winnerSeatId?: string;
}

export type BinchiAction =
  | { t: "draw" }
  | { t: "guess"; targetTileId: string; value: number; asJoker?: boolean }
  | { t: "stop" };

export const binchiGame: GameModule<BinchiConfig, BinchiState, BinchiAction, BinchiState> = {
  id: "binchi",
  displayName: "Binchi",
  koreanName: "모빈치코드",
  tagline: "정렬 제약 추리 · 오답 리스크",
  accent: "binchi",
  minPlayers: 2,
  maxPlayers: 4,

  defaultConfig() {
    return { playerCount: 2, handSize: 4, turnLimitSec: 25, candidateHint: false };
  },

  init({ seats, config, rng }) {
    const seatOrder = seats.map((s) => s.seatId);
    const tiles: Tile[] = [];
    let id = 0;
    for (const color of ["black", "white"] as const) {
      for (let v = 0; v <= 11; v++) {
        tiles.push({ id: `t${id++}`, value: v, color, revealed: false, owner: "" });
      }
    }
    for (let j = 0; j < 2; j++) {
      tiles.push({ id: `j${id++}`, value: -1, color: "joker", revealed: false, owner: "" });
    }
    const shuffled = rng.shuffle(tiles);
    const dealt: Tile[] = [];
    for (const seatId of seatOrder) {
      for (let i = 0; i < config.handSize; i++) {
        const t = shuffled.pop()!;
        t.owner = seatId;
        dealt.push(t);
      }
    }
    return {
      config,
      phase: "PLAYING",
      seatOrder,
      currentSeatIdx: 0,
      tiles: dealt,
      deck: shuffled,
    };
  },

  reduce({ state, seatId, action }) {
    if (state.seatOrder[state.currentSeatIdx] !== seatId) throw new Error("not your turn");
    if (action.t === "draw") {
      const t = state.deck.pop();
      if (!t) throw new Error("empty deck");
      t.owner = seatId;
      state.tiles.push(t);
      state.handHeld = { seatId, tileId: t.id };
    } else if (action.t === "guess") {
      const target = state.tiles.find((t) => t.id === action.targetTileId);
      if (!target || target.revealed) throw new Error("bad target");
      const correct = action.asJoker ? target.color === "joker" : target.value === action.value;
      if (correct) {
        target.revealed = true;
        // player can continue — for skeleton just yield turn on second guess.
      } else {
        // Reveal the held card as penalty.
        if (state.handHeld) {
          const held = state.tiles.find((t) => t.id === state.handHeld!.tileId);
          if (held) held.revealed = true;
        }
        state.handHeld = undefined;
        state.currentSeatIdx = (state.currentSeatIdx + 1) % state.seatOrder.length;
      }
    } else {
      // stop
      state.handHeld = undefined;
      state.currentSeatIdx = (state.currentSeatIdx + 1) % state.seatOrder.length;
    }
    return { state, events: [] };
  },

  isTerminal(state) {
    return state.phase === "MATCH_END";
  },

  view(state, seatId) {
    // Hide non-revealed tiles from other seats.
    const censored = state.tiles.map((t) =>
      t.revealed || t.owner === seatId ? t : { ...t, value: -999 }
    );
    return { ...state, tiles: censored };
  },
};
