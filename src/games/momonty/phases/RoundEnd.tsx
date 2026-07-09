import { Card, Pill } from "@web/design/primitives";
import { Stack, Row, Hint } from "@web/design/layout";
import { RANK_LABEL_KO, type MomontyView } from "@shared/games/momonty/logic";

/**
 * Phase — ROUND_END / RANK_REVEAL. Read-only display of ranks. Server
 * advances to next round automatically; this screen exists to give users
 * a beat to absorb the result.
 */
export function RoundEnd({ view }: { view: MomontyView }) {
  const rows = Object.entries(view.ranks)
    .sort(
      (a, b) =>
        RANK_ORDER.indexOf(a[1] as any) - RANK_ORDER.indexOf(b[1] as any)
    );
  return (
    <Stack gap={8}>
      <Hint>라운드 {view.round} 정리 · 잠시 후 다음 단계로 이동</Hint>
      {rows.map(([seatId, rank], i) => (
        <div
          key={seatId}
          className="rank-row"
          data-tier={i === 0 ? "top" : i === rows.length - 1 ? "bottom" : "mid"}
        >
          <span className="medal">{i === 0 ? "👑" : i + 1}</span>
          <div className="grow">
            <div className="body" style={{ color: "#fff", fontWeight: 700 }}>
              {seatId === view.mySeatId ? "나" : seatId.slice(-4)}
            </div>
            <Hint>{RANK_LABEL_KO[rank as keyof typeof RANK_LABEL_KO]}</Hint>
          </div>
          <Pill tone={i === 0 ? "accent" : "muted"}>{i + 1}위</Pill>
        </div>
      ))}
    </Stack>
  );
}

const RANK_ORDER = ["GRAND_MOMONTY", "MOMONTY", "MERCHANT", "PEON", "GRAND_PEON"];
