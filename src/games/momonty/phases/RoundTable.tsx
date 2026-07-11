import type { MomontyView, Rank } from "@shared/games/momonty/logic";
import { RANK_LABEL_KO } from "@shared/games/momonty/logic";
import { RANK_ICON, RANK_ORDER } from "../rank-ui";
import "./round-table.css";

/**
 * RoundTable — §1-3 원탁 자리 배치.
 *
 * Renders seats around a shared pile in circular positions ordered by
 * rank (모몬티 at 12 o'clock, 그레이터 페온 at 6 o'clock). Used after
 * RANK_REVEAL confirm and inline in the RoundEnd view as the "원탁"
 * viewing mode.
 */
const RANK_COLOR: Record<Rank, string> = {
  GRAND_MOMONTY: "gold",
  MOMONTY: "lilac",
  MERCHANT: "neutral",
  PEON: "blue",
  GRAND_PEON: "grey",
};

// 6-seat mockup: 12 / 2 / 4 / 6 / 8 / 10 o'clock. We spread positions
// evenly around the circle for any seat count 2..6.
function slotFor(idx: number, total: number): { top: string; left: string } {
  const angle = -Math.PI / 2 + (2 * Math.PI * idx) / total;
  const radius = 42; // percentage from center
  const x = 50 + radius * Math.cos(angle);
  const y = 50 + radius * Math.sin(angle);
  return { top: `${y}%`, left: `${x}%` };
}

export function RoundTable({ view }: { view: MomontyView }) {
  const ranks = view.ranks;
  const seats = [...view.seatOrder].sort(
    (a, b) => RANK_ORDER.indexOf(ranks[a] ?? "MERCHANT") - RANK_ORDER.indexOf(ranks[b] ?? "MERCHANT")
  );

  return (
    <div className="round-table">
      <div className="rt-eyebrow">착석 · 서열 순 시계방향</div>
      <div className="rt-stage">
        <div className="rt-center">
          <span className="rt-center-label">공유더미</span>
          <span className="rt-center-icon">🂠</span>
          <span className="rt-center-sub">리드 대기</span>
        </div>
        {seats.map((seatId, i) => {
          const pos = slotFor(i, seats.length);
          const rank = (ranks[seatId] ?? "MERCHANT") as Rank;
          const isMe = seatId === view.mySeatId;
          const name = isMe
            ? "나"
            : view.seatNames?.[seatId] ?? seatId.slice(-4);
          return (
            <div
              key={seatId}
              className="rt-seat"
              data-role={RANK_COLOR[rank]}
              data-me={isMe ? "true" : "false"}
              style={{ top: pos.top, left: pos.left }}
            >
              <div className="rt-seat-avatar">{RANK_ICON[rank] ?? name.slice(0, 1)}</div>
              <div className="rt-seat-name">{name}</div>
              <div className="rt-seat-role">{RANK_LABEL_KO[rank]}</div>
            </div>
          );
        })}
      </div>
      <div className="rt-hint">
        💡 모몬티가 먼저 리드합니다. 페온은 카드를 나눠주고 서빙하는 역할이에요.
      </div>
    </div>
  );
}
