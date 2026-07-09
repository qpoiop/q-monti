import type { ComponentType } from "react";
import type { MomontyView } from "@shared/games/momonty/logic";
import type { PhaseSpec } from "@shared/games/momonty/phases";
import { DrawRank } from "./DrawRank";
import { Taxation } from "./Taxation";
import { PlayTrick } from "./PlayTrick";
import { RoundEnd } from "./RoundEnd";
import { MatchEnd } from "./MatchEnd";

/**
 * Client-side phase view registry. `viewKey` in the shared phase spec is
 * the key here — adding a new phase means registering a component below.
 */
export const PHASE_VIEWS: Record<
  PhaseSpec["viewKey"],
  ComponentType<{ view: MomontyView }>
> = {
  DrawRank,
  Taxation,
  PlayTrick,
  RoundEnd,
  MatchEnd,
  RankReveal: RoundEnd,
};
