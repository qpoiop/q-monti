import type { ComponentType } from "react";
import { MomontyPlayView } from "./momonty/PlayView";
import { QuerymoPlayView } from "./querymo/PlayView";
import { BinchiPlayView } from "./binchi/PlayView";
import { IndientPlayView } from "./indient/PlayView";
import { MoorumonPlayView } from "./moorumon/PlayView";

/**
 * Per-game play view registry. Registering a game here + in
 * `shared/games/registry.ts` is the entire integration surface for a new
 * title — Play.tsx picks by id and never hardcodes.
 */
export const PLAY_VIEWS: Record<string, ComponentType<{ view: any }>> = {
  momonty: MomontyPlayView,
  querymo: QuerymoPlayView,
  binchi: BinchiPlayView,
  indient: IndientPlayView,
  moorumon: MoorumonPlayView,
};

/** Per-game screen gradient (matches game accent). */
export const PLAY_GRADIENTS: Record<string, string> = {
  momonty: "radial-gradient(90% 40% at 50% 0%, rgba(242,193,78,.16), transparent 60%)",
  querymo: "radial-gradient(90% 40% at 50% 0%, rgba(34,211,238,.24), transparent 60%)",
  binchi: "radial-gradient(90% 40% at 50% 0%, rgba(196,181,253,.24), transparent 60%)",
  indient: "radial-gradient(90% 40% at 50% 0%, rgba(251,191,36,.22), transparent 60%)",
  moorumon: "radial-gradient(90% 40% at 50% 0%, rgba(52,211,153,.22), transparent 60%)",
};
