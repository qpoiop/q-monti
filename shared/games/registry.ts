import type { GameMeta, GameModule } from "../engine";
import { momontyGame } from "./momonty/logic";
import { querymoGame } from "./querymo/logic";
import { binchiGame } from "./binchi/logic";
import { indientGame } from "./indient/logic";
import { moorumonGame } from "./moorumon/logic";

/**
 * Central registry — the ONLY place the app enumerates supported games.
 * Both server DO and web client import this and use it to look up
 * game modules by id.
 */
export const GAMES: Record<string, GameModule<any, any, any, any>> = {
  [momontyGame.id]: momontyGame,
  [querymoGame.id]: querymoGame,
  [binchiGame.id]: binchiGame,
  [indientGame.id]: indientGame,
  [moorumonGame.id]: moorumonGame,
};

export const GAME_META: GameMeta[] = Object.values(GAMES).map((g) => ({
  id: g.id,
  displayName: g.displayName,
  koreanName: g.koreanName,
  tagline: g.tagline,
  accent: g.accent,
  minPlayers: g.minPlayers,
  maxPlayers: g.maxPlayers,
}));

export function getGame(gameId: string): GameModule<any, any, any, any> {
  const g = GAMES[gameId];
  if (!g) throw new Error(`unknown game: ${gameId}`);
  return g;
}
