import type { ComponentType } from "react";
import { MomontyPlayView } from "./momonty/PlayView";

/**
 * Play view registry. Service ships Momonty only for now — new titles
 * register a component here plus a matching shared game module.
 */
export const PLAY_VIEWS: Record<string, ComponentType<{ view: any }>> = {
  momonty: MomontyPlayView,
};

export const PLAY_GRADIENTS: Record<string, string> = {
  momonty: "radial-gradient(90% 40% at 50% 0%, rgba(242,193,78,.16), transparent 60%)",
};
