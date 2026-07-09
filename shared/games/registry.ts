import type { GameMeta, GameModule } from "../engine";
import { momontyGame } from "./momonty/logic";

/**
 * Single-game registry. Service currently ships Momonty only.
 * If more titles are added later, register them here — the client and
 * worker both dispatch via this map, so nothing else needs to change.
 */
export const GAMES: Record<string, GameModule<any, any, any, any>> = {
  [momontyGame.id]: momontyGame,
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
