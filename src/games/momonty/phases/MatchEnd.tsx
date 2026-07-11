import type { MomontyView, Rank } from "@shared/games/momonty/logic";
import "./match-end.css";

/**
 * Phase — MATCH_END (in-game surface). Mockup § 5-3.
 *
 * Final ranking is by highest cumulative score (scoreByUser). Champion
 * card shows "최다 모몬티 등극 · 우승". Podium bars for 1/2/3 with
 * distinct heights (72 / 52 / 40 px). Full rank list below has the
 * "모몬티 N회 · 페온 N회" stat pulled from rankHistoryByUser.
 */
interface Row {
  seatId: string;
  name: string;
  score: number;
  momontyCount: number;
  peonCount: number;
  isMe: boolean;
}

const isMomonty = (r: Rank) => r === "GRAND_MOMONTY" || r === "MOMONTY";
const isPeon = (r: Rank) => r === "GRAND_PEON" || r === "PEON";

export function MatchEnd({ view }: { view: MomontyView }) {
  const rows: Row[] = view.seatOrder
    .map((seatId) => {
      const hist = view.rankHistoryByUser?.[seatId] ?? [];
      return {
        seatId,
        name:
          seatId === view.mySeatId
            ? view.seatNames?.[seatId]
              ? `${view.seatNames[seatId]} (나)`
              : "나"
            : view.seatNames?.[seatId] ?? seatId.slice(-4),
        score: view.scoreByUser?.[seatId] ?? 0,
        momontyCount: hist.filter(isMomonty).length,
        peonCount: hist.filter(isPeon).length,
        isMe: seatId === view.mySeatId,
      };
    })
    .sort((a, b) => b.score - a.score || b.momontyCount - a.momontyCount);

  const [first, second, third, ...rest] = rows;

  return (
    <div className="match-end">
      <div className="match-end-eyebrow">
        {view.match.completedRounds}라운드 완료 · MATCH END
      </div>

      {first ? (
        <div className="champion">
          <div className="champion-crown">👑</div>
          <div className="champion-name">{first.name}</div>
          <div className="champion-sub">
            {first.momontyCount > 0
              ? `최다 모몬티 등극 · 우승`
              : `최종 점수 +${first.score} · 우승`}
          </div>
          <div className="champion-score">
            <span>모몬티 {first.momontyCount}회</span>
            <span className="champion-score-dot">·</span>
            <span>점수 {first.score > 0 ? `+${first.score}` : first.score}</span>
          </div>
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
            <div className="podium-bar podium-bar-1">
              <span className="podium-crown">👑</span>1
            </div>
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
              <span className="rest-role">
                모몬티 {r.momontyCount}회 · 페온 {r.peonCount}회
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
