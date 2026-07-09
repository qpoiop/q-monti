import type { GameModule } from "../../engine";

/*
 * Querymo (쿼리모) — Quoridor-like abstract strategy.
 * 2-player. Skeleton implementation — engine contract satisfied so the
 * registry / lobby / room layers work; the full move/wall/BFS logic lives here.
 */

export interface QuerymoConfig {
  boardSize: 9 | 7;
  wallsPerPlayer: number;
  turnLimitSec: number;
  match: string; // "bo3"
  pathHint: boolean;
}

export interface QuerymoState {
  config: QuerymoConfig;
  phase: "PLAYING" | "MATCH_END";
  seatOrder: string[];
  currentSeatIdx: number;
  positions: Record<string, { x: number; y: number }>;
  walls: Array<{ x: number; y: number; orientation: "h" | "v"; owner: string }>;
  wallsLeft: Record<string, number>;
  goalRows: Record<string, number>;
  winnerSeatId?: string;
}

export type QuerymoAction =
  | { t: "move"; dx: number; dy: number }
  | { t: "placeWall"; x: number; y: number; orientation: "h" | "v" };

export const querymoGame: GameModule<QuerymoConfig, QuerymoState, QuerymoAction, QuerymoState> = {
  id: "querymo",
  displayName: "Querymo",
  koreanName: "쿼리모",
  tagline: "벽을 세워 길을 막는 완전정보 수읽기",
  accent: "querymo",
  minPlayers: 2,
  maxPlayers: 2,

  defaultConfig() {
    return {
      boardSize: 9,
      wallsPerPlayer: 10,
      turnLimitSec: 30,
      match: "bo3",
      pathHint: true,
    };
  },

  init({ seats, config }) {
    const seatOrder = seats.map((s) => s.seatId);
    const size = config.boardSize;
    return {
      config,
      phase: "PLAYING",
      seatOrder,
      currentSeatIdx: 0,
      positions: {
        [seatOrder[0]]: { x: Math.floor(size / 2), y: 0 },
        [seatOrder[1]]: { x: Math.floor(size / 2), y: size - 1 },
      },
      walls: [],
      wallsLeft: {
        [seatOrder[0]]: config.wallsPerPlayer,
        [seatOrder[1]]: config.wallsPerPlayer,
      },
      goalRows: {
        [seatOrder[0]]: size - 1,
        [seatOrder[1]]: 0,
      },
    };
  },

  reduce({ state, seatId, action }) {
    // Skeleton — proper BFS wall validation belongs here.
    if (state.seatOrder[state.currentSeatIdx] !== seatId) throw new Error("not your turn");
    if (action.t === "move") {
      const pos = state.positions[seatId];
      pos.x += action.dx;
      pos.y += action.dy;
      if (pos.y === state.goalRows[seatId]) {
        state.phase = "MATCH_END";
        state.winnerSeatId = seatId;
      }
    } else if (action.t === "placeWall") {
      if (state.wallsLeft[seatId] <= 0) throw new Error("no walls left");
      state.walls.push({ x: action.x, y: action.y, orientation: action.orientation, owner: seatId });
      state.wallsLeft[seatId] -= 1;
    }
    state.currentSeatIdx = (state.currentSeatIdx + 1) % state.seatOrder.length;
    return { state, events: [] };
  },

  isTerminal(state) {
    return state.phase === "MATCH_END";
  },

  view(state) {
    return state;
  },
};
