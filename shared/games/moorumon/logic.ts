import type { GameModule } from "../../engine";

/*
 * Moorumon Show (모루먼쇼) — Briscola trick-taking.
 * Skeleton engine.
 */

export interface MoorumonConfig {
  handSize: number;
  targetScore: number;
  turnLimitSec: number;
  memoryHelper: boolean;
}

interface MCard {
  id: string;
  suit: 0 | 1 | 2 | 3;
  rank: number; // 1..13 (subset used)
  points: number;
}

export interface MoorumonState {
  config: MoorumonConfig;
  phase: "PLAYING" | "MATCH_END";
  seatOrder: string[];
  currentSeatIdx: number;
  trumpSuit: 0 | 1 | 2 | 3;
  hands: Record<string, MCard[]>;
  deck: MCard[];
  currentTrick: { leaderSeatId: string; plays: Array<{ seatId: string; card: MCard }> };
  score: Record<string, number>;
  winnerSeatId?: string;
}

export type MoorumonAction = { t: "play"; cardId: string };

const RANK_POINTS: Record<number, number> = {
  1: 11,
  10: 10,
  13: 4,
  12: 3,
  11: 2,
};

export const moorumonGame: GameModule<
  MoorumonConfig,
  MoorumonState,
  MoorumonAction,
  MoorumonState
> = {
  id: "moorumon",
  displayName: "Moorumon Show",
  koreanName: "모루먼쇼",
  tagline: "카드 관리 · 트릭테이킹",
  accent: "moorumon",
  minPlayers: 2,
  maxPlayers: 2,

  defaultConfig() {
    return { handSize: 3, targetScore: 61, turnLimitSec: 15, memoryHelper: false };
  },

  init({ seats, config, rng }) {
    const seatOrder = seats.map((s) => s.seatId);
    const cards: MCard[] = [];
    const ranks = [1, 2, 3, 4, 5, 6, 7, 11, 12, 13];
    let id = 0;
    for (let suit = 0 as 0 | 1 | 2 | 3; suit < 4; suit = (suit + 1) as 0 | 1 | 2 | 3) {
      for (const r of ranks) {
        cards.push({
          id: `c${id++}`,
          suit,
          rank: r,
          points: RANK_POINTS[r] ?? 0,
        });
      }
    }
    const shuffled = rng.shuffle(cards);
    const hands: Record<string, MCard[]> = {};
    for (const s of seatOrder) hands[s] = shuffled.splice(0, config.handSize);
    const trump = shuffled[shuffled.length - 1].suit;
    return {
      config,
      phase: "PLAYING",
      seatOrder,
      currentSeatIdx: 0,
      trumpSuit: trump,
      hands,
      deck: shuffled,
      currentTrick: { leaderSeatId: seatOrder[0], plays: [] },
      score: Object.fromEntries(seatOrder.map((s) => [s, 0])),
    };
  },

  reduce({ state, seatId, action }) {
    if (state.seatOrder[state.currentSeatIdx] !== seatId) throw new Error("not your turn");
    const hand = state.hands[seatId];
    const idx = hand.findIndex((c) => c.id === action.cardId);
    if (idx < 0) throw new Error("card not in hand");
    const card = hand[idx];
    hand.splice(idx, 1);
    state.currentTrick.plays.push({ seatId, card });

    if (state.currentTrick.plays.length === state.seatOrder.length) {
      // Resolve.
      const [a, b] = state.currentTrick.plays;
      const aTrump = a.card.suit === state.trumpSuit;
      const bTrump = b.card.suit === state.trumpSuit;
      let winner = a;
      if (aTrump && bTrump) winner = a.card.rank > b.card.rank ? a : b;
      else if (aTrump || bTrump) winner = aTrump ? a : b;
      else if (a.card.suit === b.card.suit) winner = a.card.rank > b.card.rank ? a : b;
      state.score[winner.seatId] += a.card.points + b.card.points;
      // Refill hands.
      for (const s of state.seatOrder) {
        if (state.deck.length > 0 && state.hands[s].length < state.config.handSize) {
          state.hands[s].push(state.deck.pop()!);
        }
      }
      state.currentTrick = { leaderSeatId: winner.seatId, plays: [] };
      state.currentSeatIdx = state.seatOrder.indexOf(winner.seatId);
      if (state.score[winner.seatId] >= state.config.targetScore) {
        state.phase = "MATCH_END";
        state.winnerSeatId = winner.seatId;
      }
    } else {
      state.currentSeatIdx = (state.currentSeatIdx + 1) % state.seatOrder.length;
    }
    return { state, events: [] };
  },

  isTerminal(state) {
    return state.phase === "MATCH_END";
  },

  view(state, seatId) {
    const hands: Record<string, MCard[]> = {};
    for (const [s, cards] of Object.entries(state.hands)) {
      hands[s] = s === seatId ? cards : (cards.map(() => ({ id: "?", suit: 0, rank: 0, points: 0 })) as MCard[]);
    }
    return { ...state, hands };
  },
};
