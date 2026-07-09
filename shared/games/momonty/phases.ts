import type { MomontyState, MomontyView, Phase } from "./logic";

/**
 * Declarative phase spec.
 *
 * Each phase declares:
 *   - `id`         : matches `MomontyState.phase`
 *   - `label`      : Korean chapter title used in headers / progress bars
 *   - `sub`        : short helper sentence (shown as `PhaseHeader.sub`)
 *   - `viewKey`    : dispatch key for the client PlayView registry
 *   - `guard(view, seatId)`: returns null if the seat can act; otherwise a
 *                    short reason string ("상대 차례") the UI can render.
 *
 * The client renders phases by looking up the spec and delegating to the
 * matching component. New phases plug in here + register a component —
 * no additional switch statement in the view layer.
 */

export type PhaseGuard = (view: MomontyView, seatId: string | null) => string | null;

export interface PhaseSpec {
  id: Phase;
  label: string;
  sub: string;
  viewKey: "DrawRank" | "Taxation" | "PlayTrick" | "RoundEnd" | "MatchEnd" | "RankReveal";
  guard: PhaseGuard;
}

const noSeat: PhaseGuard = (_view, seatId) => (seatId ? null : "관전 중");

const isMyTurnLead: PhaseGuard = (view, seatId) => {
  if (!seatId) return "관전 중";
  return view.currentSeatId === seatId ? null : "상대 차례";
};

export const PHASES: Record<Phase, PhaseSpec> = {
  DRAWING_RANK: {
    id: "DRAWING_RANK",
    label: "서열 결정",
    sub: "카드를 뽑아 자리를 정합니다",
    viewKey: "DrawRank",
    guard: (view, seatId) => {
      if (!seatId) return "관전 중";
      const already = view.drawRank?.picks?.[seatId] != null;
      return already ? "다른 플레이어 대기" : null;
    },
  },
  RANK_REVEAL: {
    id: "RANK_REVEAL",
    label: "서열 공개",
    sub: "자리와 역할 확인",
    viewKey: "RankReveal",
    guard: noSeat,
  },
  TAXATION: {
    id: "TAXATION",
    label: "과세",
    sub: "페온 상납 · 모몬티 반환",
    viewKey: "Taxation",
    guard: (view, seatId) => {
      if (!seatId) return "관전 중";
      const up = view.taxation.myPendingUpload ?? 0;
      const ret = view.taxation.myPendingReturn ?? 0;
      if (up === 0 && ret === 0) return "대기 중";
      return null;
    },
  },
  REVOLUTION_WINDOW: {
    id: "REVOLUTION_WINDOW",
    label: "혁명 선언",
    sub: "광대 2장 보유 시 취소 가능",
    viewKey: "Taxation",
    guard: noSeat,
  },
  PLAYING: {
    id: "PLAYING",
    label: "플레이",
    sub: "리드하거나 따라내거나 패스",
    viewKey: "PlayTrick",
    guard: isMyTurnLead,
  },
  ROUND_END: {
    id: "ROUND_END",
    label: "라운드 정리",
    sub: "순위 확정 · 다음 라운드 준비",
    viewKey: "RoundEnd",
    guard: noSeat,
  },
  MATCH_END: {
    id: "MATCH_END",
    label: "매치 종료",
    sub: "최종 순위",
    viewKey: "MatchEnd",
    guard: noSeat,
  },
};

export function currentPhase(view: MomontyView): PhaseSpec {
  return PHASES[view.phase];
}
