import { useState } from "react";
import { send, useStore } from "@web/state/store";
import type { MomontyView, Rank } from "@shared/games/momonty/logic";
import { RANK_LABEL_KO } from "@shared/games/momonty/logic";
import { RANK_ICON, RANK_ORDER, RANK_TIER_CLASS } from "../rank-ui";
import { RoundTable } from "./RoundTable";
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
export function RoundEnd({ view }: { view: MomontyView }) {
  const isReveal = view.phase === "RANK_REVEAL";
  const [mode, setMode] = useState<"list" | "table">(isReveal ? "table" : "list");
  // Room-level advance is host-gated on the server. Non-hosts see a
  // waiting label instead of the CTA; test mode has no room so we
  // fall through to enabled.
  const room = useStore((s) => s.room);
  const userId = useStore((s) => s.session.userId);
  const hostSeat = room?.seats?.find((s) => s.isHost);
  const hostName = hostSeat?.displayName ?? "호스트";
  const isHost = room ? !!hostSeat && hostSeat.userId === userId : true;
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

      {isReveal ? (
        <div className="round-end-modes">
          <button
            type="button"
            className={`round-end-mode ${mode === "table" ? "active" : ""}`}
            onClick={() => setMode("table")}
          >
            원탁
          </button>
          <button
            type="button"
            className={`round-end-mode ${mode === "list" ? "active" : ""}`}
            onClick={() => setMode("list")}
          >
            리스트
          </button>
        </div>
      ) : null}

      {isReveal && mode === "table" ? (
        <RoundTable view={view} />
      ) : (
      <div className="rank-list">
        {rows.map(({ seatId, rank, name }, i) => {
          const score = view.scoreByUser?.[seatId] ?? 0;
          // Score chip only after a round has played out — first-round
          // RANK_REVEAL shows fresh ranks with no delta yet, so hiding
          // the "0" pill keeps the row from looking like a stray circle.
          const showScore = !isReveal || view.match.completedRounds > 0;
          return (
            <div key={seatId} className="rank-row" data-tier={RANK_TIER_CLASS[rank]}>
              <span className="rank-avatar">{RANK_ICON[rank]}</span>
              <span className="rank-name">
                <span>{name}</span>
                <span className="rank-role">{RANK_LABEL_KO[rank]}</span>
                {seatId === view.mySeatId ? <span className="rank-me-tag">나</span> : null}
                {rank === "GRAND_MOMONTY" ? <span className="lead-tag">선</span> : null}
              </span>
              {showScore ? (
                <span
                  className="rank-score"
                  data-sign={score > 0 ? "pos" : score < 0 ? "neg" : "zero"}
                >
                  {score > 0 ? `+${score}` : score}
                </span>
              ) : null}
              <span className="rank-pos">{i + 1}위</span>
            </div>
          );
        })}
      </div>
      )}

      {!isReveal && jesterPenaltyOn ? (
        <div className="round-end-callout">
          💡 광대 잔류 페널티 적용 · 라운드 종료 시 광대 보유자 −2점
        </div>
      ) : null}

      {isReveal ? (
        isHost ? (
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
              🕒 {hostName} · 다음 단계 진행 대기
            </span>
          </div>
        )
      ) : view.phase === "MATCH_END" ? (
        <div className="round-end-cta">
          <span className="round-end-cta-label">
            🏆 매치 종료 · 결과 화면으로 이동
          </span>
        </div>
      ) : isHost ? (
        <button
          type="button"
          className="round-end-primary-cta"
          onClick={() => send({ t: "action", action: { t: "confirmRoundEnd" } })}
        >
          라운드 {view.round + 1}{view.config.taxationEnabled ? " · 과세로 ▶" : " 시작 ▶"}
        </button>
      ) : (
        <div className="round-end-cta">
          <span className="round-end-cta-label">
            🕒 {hostName} · 라운드 {view.round + 1} 시작 대기
          </span>
        </div>
      )}
    </div>
  );
}
