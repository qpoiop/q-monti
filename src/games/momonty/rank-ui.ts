import type { Rank } from "@shared/games/momonty/logic";

/**
 * Shared UI-level rank helpers. Screens that render rank rows share the
 * same icon set, tier class mapping, and preview-rank-for-position logic
 * so a UI tweak lands in one place instead of drifting across
 * RoundEnd / MatchEnd / OutOverlay / RoundTable.
 */

export const RANK_ORDER: Rank[] = [
  "GRAND_MOMONTY",
  "MOMONTY",
  "MERCHANT",
  "PEON",
  "GRAND_PEON",
];

export const RANK_ICON: Record<Rank, string> = {
  GRAND_MOMONTY: "👑",
  MOMONTY: "♛",
  MERCHANT: "",
  PEON: "",
  GRAND_PEON: "⛏",
};

export const RANK_TIER_CLASS: Record<Rank, string> = {
  GRAND_MOMONTY: "top-1",
  MOMONTY: "top-2",
  MERCHANT: "mid",
  PEON: "bottom-2",
  GRAND_PEON: "bottom-1",
};

/** Preview rank tier for an out-position without engine access. */
export function previewRankFor(position: number, totalSeats: number): Rank {
  if (position === 1) return "GRAND_MOMONTY";
  if (position === totalSeats) return "GRAND_PEON";
  if (position === 2 && totalSeats >= 4) return "MOMONTY";
  if (position === totalSeats - 1 && totalSeats >= 4) return "PEON";
  return "MERCHANT";
}
