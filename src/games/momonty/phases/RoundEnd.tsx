import type { MomontyView, Rank } from "@shared/games/momonty/logic";
import { RANK_LABEL_KO } from "@shared/games/momonty/logic";
import "./round-end.css";

/**
 * Phase — ROUND_END / RANK_REVEAL.
 *
 * Design mockup § 5-2 (라운드 결과):
 *   골드 subtitle "라운드 N 종료 · 새 서열"
 *   Big label "다음 라운드 자리 이동"
 *   Vertical rank list — each row shows avatar/icon, name, movement
 *     indicator (▲/▼/－) and rank tier label
 *   Optional callout (jester penalty etc.)
 */
const RANK_ORDER: Rank[] = ["GRAND_MOMONTY", "MOMONTY", "MERCHANT", "PEON", "GRAND_PEON"];

const RANK_TIER_CLASS: Record<Rank, string> = {
  GRAND_MOMONTY: "top-1",
  MOMONTY: "top-2",
  MERCHANT: "mid",
  PEON: "bottom-2",
  GRAND_PEON: "bottom-1",
};
const RANK_ICON: Record<Rank, string> = {
  GRAND_MOMONTY: "👑",
  MOMONTY: "♛",
  MERCHANT: "·",
  PEON: "·",
  GRAND_PEON: "⛏",
};

export function RoundEnd({ view }: { view: MomontyView }) {
  const rows = Object.entries(view.ranks)
    .map(([seatId, rank]) => ({
      seatId,
      rank: rank as Rank,
      name:
        seatId === view.mySeatId
          ? view.seatNames?.[seatId]
            ? `${view.seatNames[seatId]} (나)`
            : "나"
          : view.seatNames?.[seatId] ?? seatId.slice(-4),
    }))
    .sort((a, b) => RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank));

  const jesterPenaltyOn = view.config.jesterPenalty;

  return (
    <div className="round-end">
      <div className="round-end-heading">
        <div className="round-end-eyebrow">라운드 {view.round} 종료 · 새 서열</div>
        <div className="round-end-title">다음 라운드 자리 이동</div>
      </div>

      <div className="rank-list">
        {rows.map(({ seatId, rank, name }, i) => (
          <div key={seatId} className="rank-row" data-tier={RANK_TIER_CLASS[rank]}>
            <span className="rank-avatar">{RANK_ICON[rank]}</span>
            <span className="rank-name">
              {name}
              {seatId === view.mySeatId ? <span className="rank-me-tag">나</span> : null}
            </span>
            <span className="rank-pos">{i + 1}위</span>
            <span className="rank-role">{RANK_LABEL_KO[rank]}</span>
          </div>
        ))}
      </div>

      {jesterPenaltyOn ? (
        <div className="round-end-callout">
          💡 광대 잔류 페널티 적용 · 라운드 종료 시 광대 보유자 −2점
        </div>
      ) : null}

      <div className="round-end-cta">
        {view.phase === "MATCH_END" ? (
          <span className="round-end-cta-label">🏆 매치 종료 · 결과 화면으로 이동</span>
        ) : (
          <span className="round-end-cta-label">
            라운드 {view.round + 1} · 과세로 자동 이동 ▶
          </span>
        )}
      </div>
    </div>
  );
}
