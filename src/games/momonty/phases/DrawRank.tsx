import { PlayingCard } from "@web/design/PlayingCard";
import { Button, Card } from "@web/design/primitives";
import { Row, SectionLabel, Stack } from "@web/design/layout";
import { send } from "@web/state/store";
import type { MomontyView } from "@shared/games/momonty/logic";

/**
 * Phase — DRAWING_RANK. First round only: each seat taps a card to draw
 * a rank number. Auto-advances when all seats have picked.
 */
export function DrawRank({ view }: { view: MomontyView }) {
  const mySeatId = view.mySeatId ?? null;
  const picks = view.drawRank?.picks ?? {};
  const already = mySeatId ? picks[mySeatId] != null : false;

  return (
    <Stack gap={12}>
      <Row center gap={8}>
        <PlayingCard tone="back" label="?" size="lg" />
        <PlayingCard
          tone="royal"
          value={already ? picks[mySeatId!] : undefined}
          label={already ? undefined : "?"}
          size="lg"
          crown={already && picks[mySeatId!] === 1}
          selected={already}
        />
        <PlayingCard tone="back" label="?" size="lg" />
      </Row>
      <Row center>
        <Button
          variant="primary"
          disabled={already}
          onClick={() => send({ t: "action", action: { t: "drawRank" } })}
        >
          {already ? `내 카드 ${picks[mySeatId!]}` : "카드 뽑기"}
        </Button>
      </Row>
      <Card tone="highlight">
        <SectionLabel>뽑기 현황</SectionLabel>
        <Stack gap={4}>
          {view.seatOrder.map((seatId) => {
            const p = picks[seatId];
            return (
              <Row key={seatId} between>
                <span className="body" style={{ color: "var(--text-2)" }}>
                  {seatId === mySeatId ? "나" : seatId.slice(-4)}
                </span>
                <span
                  className="mono-num"
                  style={{ color: p != null ? "var(--accent-1)" : "var(--text-6)" }}
                >
                  {p ?? "뽑는 중…"}
                </span>
              </Row>
            );
          })}
        </Stack>
      </Card>
    </Stack>
  );
}
