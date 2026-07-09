import { send } from "@web/state/store";
import type { MomontyView, Rank } from "@shared/games/momonty/logic";
import { RANK_LABEL_KO } from "@shared/games/momonty/logic";
import "./round-end.css";

/**
 * Phase — RANK_REVEAL / ROUND_END.
 *
 * RANK_REVEAL (immediately after all seats drew or a round finished)
 *   Shows the resolved ranks and pauses for a user tap on "과세 단계로 ▶"
 *   before continuing. Prevents the game from silently teleporting into
 *   play the instant the last person picks.
 *
 * ROUND_END mirrors 시안 § 5-2 with a rank list and a "라운드 N+1 ·
 *   과세로 자동 이동" CTA — server drives the actual transition; this
 *   surface is just for reading and confirmation.
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
  const isReveal = view.phase === "RANK_REVEAL";
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
        <div className="round-end-eyebrow">
          {isReveal
            ? `라운드 ${view.round} · 서열 확정`
            : `라운드 ${view.round} 종료 · 새 서열`}
        </div>
        <div className="round-end-title">
          {isReveal ? "이번 라운드 자리 배치" : "다음 라운드 자리 이동"}
        </div>
      </div>

      <div className="rank-list">
        {rows.map(({ seatId, rank, name }, i) => (
          <div key={seatId} className="rank-row" data-tier={RANK_TIER_CLASS[rank]}>
            <span className="rank-avatar">{RANK_ICON[rank]}</span>
            <span className="rank-name">
              {name}
              {seatId === view.mySeatId ? <span className="rank-me-tag">나</span> : null}
              {rank === "GRAND_MOMONTY" ? <span className="lead-tag">선</span> : null}
            </span>
            <span className="rank-pos">{i + 1}위</span>
            <span className="rank-role">{RANK_LABEL_KO[rank]}</span>
          </div>
        ))}
      </div>

      {!isReveal && jesterPenaltyOn ? (
        <div className="round-end-callout">
          💡 광대 잔류 페널티 적용 · 라운드 종료 시 광대 보유자 −2점
        </div>
      ) : null}

      {isReveal ? (
        <button
          type="button"
          className="round-end-primary-cta"
          onClick={() => send({ t: "action", action: { t: "confirmRanks" } })}
        >
          {view.config.taxationEnabled ? "과세 단계로 ▶" : "게임 시작 ▶"}
        </button>
      ) : (
        <div className="round-end-cta">
          <span className="round-end-cta-label">
            {view.phase === "MATCH_END"
              ? "🏆 매치 종료 · 결과 화면으로 이동"
              : `라운드 ${view.round + 1} · 과세로 자동 이동 ▶`}
          </span>
        </div>
      )}
    </div>
  );
}
