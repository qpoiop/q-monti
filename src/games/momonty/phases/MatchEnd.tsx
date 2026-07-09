import type { MomontyView, Rank } from "@shared/games/momonty/logic";
import { RANK_LABEL_KO } from "@shared/games/momonty/logic";
import "./match-end.css";

/**
 * Phase — MATCH_END (in-game surface).
 *
 * Design mockup § 5-3:
 *   Eyebrow "N라운드 완료 · MATCH END"
 *   Champion 👑 with big name
 *   Podium: 2-1-3 bars, heights 52/72/40 px
 *   Remaining ranks in glass card
 *   Bottom CTAs: 결과 공유 · 한 판 더
 *
 * When rendered inside the play surface (test mode) we skip the CTAs
 * — the Result screen replicates them for live rooms.
 */
const RANK_ORDER: Rank[] = ["GRAND_MOMONTY", "MOMONTY", "MERCHANT", "PEON", "GRAND_PEON"];

export function MatchEnd({ view }: { view: MomontyView }) {
  const rows = Object.entries(view.ranks)
    .map(([seatId, rank]) => ({
      seatId,
      rank: rank as Rank,
      name:
        seatId === view.mySeatId
          ? "나"
          : view.seatNames?.[seatId] ?? seatId.slice(-4),
    }))
    .sort((a, b) => RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank));

  const first = rows[0];
  const second = rows[1];
  const third = rows[2];
  const rest = rows.slice(3);

  return (
    <div className="match-end">
      <div className="match-end-eyebrow">
        {view.match.completedRounds}라운드 완료 · MATCH END
      </div>

      {first ? (
        <div className="champion">
          <div className="champion-crown">👑</div>
          <div className="champion-name">{first.name}</div>
          <div className="champion-sub">최다 모몬티 등극 · 우승</div>
        </div>
      ) : null}

      {second || third ? (
        <div className="podium">
          <div className="podium-col">
            {second ? (
              <>
                <div className="podium-label podium-label-2">{second.name}</div>
                <div className="podium-bar podium-bar-2">2</div>
              </>
            ) : (
              <div className="podium-bar-empty" />
            )}
          </div>
          <div className="podium-col">
            <div className="podium-label podium-label-1">{first?.name ?? ""}</div>
            <div className="podium-bar podium-bar-1">1</div>
          </div>
          <div className="podium-col">
            {third ? (
              <>
                <div className="podium-label podium-label-3">{third.name}</div>
                <div className="podium-bar podium-bar-3">3</div>
              </>
            ) : (
              <div className="podium-bar-empty" />
            )}
          </div>
        </div>
      ) : null}

      {rest.length ? (
        <div className="rest-card">
          {rest.map((r, i) => (
            <div key={r.seatId} className="rest-row">
              <span className="rest-name">
                {4 + i}위 · {r.name}
              </span>
              <span className="rest-role">{RANK_LABEL_KO[r.rank]}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
