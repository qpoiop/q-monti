import { PhoneFrame } from "@web/design/PhoneFrame";
import { BottomBar, Button, Card, Pill, ScreenHeader } from "@web/design/primitives";
import { leaveRoom, useStore } from "@web/state/store";
import { navigate } from "@web/nav/router";
import { DesktopStage } from "./DesktopStage";
import { Aurora } from "@web/design/effects/Aurora";
import { Particles } from "@web/design/effects/Particles";
import { RANK_LABEL_KO, type Rank } from "@shared/games/momonty/logic";

/**
 * Match end screen.
 *
 * Momonty exposes a ranks map (seat→Rank tier). We render seats sorted by
 * rank strength with medal colouring + crown-rain overlay for celebration.
 * Other games fall back to a generic "winner + participants" layout that
 * consumes `winnerSeatId` if present in the view.
 */
export function ResultScreen() {
  const room = useStore((s) => s.room);
  const view = useStore((s) => s.gameView?.view) as any;

  return (
    <DesktopStage>
      <PhoneFrame
        gradient="radial-gradient(85% 46% at 50% 8%, rgba(242,193,78,.3), transparent 60%)"
      >
        <Aurora tone="gold" />
        <Particles variant="crown-rain" density={1.2} />
        <ScreenHeader title="매치 결과" />
        <div
          style={{
            padding: "6px 18px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            flex: 1,
            overflowY: "auto",
            position: "relative",
            zIndex: 12,
          }}
        >
          <Card
            tone="accent"
            style={{
              textAlign: "center",
              padding: "18px 14px",
            }}
          >
            <div style={{ fontSize: 30 }}>🏆</div>
            <div
              style={{
                color: "var(--accent-3)",
                fontFamily: "var(--font-brand)",
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: ".08em",
                marginTop: 4,
              }}
            >
              MATCH COMPLETE
            </div>
            <div
              style={{
                fontFamily: "var(--font-brand)",
                fontSize: 22,
                fontWeight: 900,
                color: "#fff",
                marginTop: 6,
              }}
            >
              최종 순위
            </div>
          </Card>

          {room?.gameId === "momonty" && view?.ranks ? (
            <MomontyRanks ranks={view.ranks} seats={room.seats} />
          ) : view?.winnerSeatId ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Card tone="accent">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>👑</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>
                      {seatName(room?.seats, view.winnerSeatId)}
                    </div>
                    <div style={{ color: "var(--accent-3)", fontSize: 11 }}>승리</div>
                  </div>
                  <Pill tone="accent">1st</Pill>
                </div>
              </Card>
              {room?.seats
                .filter((s) => s.seatId !== view.winnerSeatId)
                .map((s) => (
                  <Card key={s.seatId}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ color: "var(--text-2)", fontSize: 13 }}>{s.displayName}</div>
                      <Pill tone="muted" style={{ marginLeft: "auto" }}>참가</Pill>
                    </div>
                  </Card>
                ))}
            </div>
          ) : (
            <div style={{ color: "var(--text-4)", fontSize: 12 }}>
              결과가 표시되지 않았어요. 다시 시도해주세요.
            </div>
          )}
        </div>
        <BottomBar>
          <Button
            full
            variant="ghost"
            onClick={() => {
              leaveRoom();
              navigate({ name: "home" });
            }}
          >
            홈으로
          </Button>
        </BottomBar>
      </PhoneFrame>
    </DesktopStage>
  );
}

/* -------------------------- Momonty rank list -------------------------- */

const RANK_ORDER: Rank[] = [
  "GRAND_MOMONTY",
  "MOMONTY",
  "MERCHANT",
  "PEON",
  "GRAND_PEON",
];

function MomontyRanks({
  ranks,
  seats,
}: {
  ranks: Record<string, Rank>;
  seats: { seatId: string; displayName: string; userId: string }[];
}) {
  const rows = Object.entries(ranks)
    .map(([seatId, rank]) => ({
      seatId,
      rank,
      display: seats.find((s) => s.seatId === seatId)?.displayName ?? seatId.slice(-4),
    }))
    .sort((a, b) => RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((row, i) => {
        const isTop = i === 0;
        const isBottom = i === rows.length - 1;
        const bg = isTop
          ? "linear-gradient(135deg, rgba(242,193,78,.28), rgba(242,193,78,.1))"
          : isBottom
          ? "rgba(138,130,152,.14)"
          : "var(--glass-3)";
        const border = isTop
          ? "1px solid rgba(242,193,78,.5)"
          : isBottom
          ? "1px solid rgba(138,130,152,.3)"
          : "1px solid var(--glass-border-2)";
        return (
          <div
            key={row.seatId}
            style={{
              padding: "12px 14px",
              borderRadius: 14,
              background: bg,
              border,
              display: "flex",
              alignItems: "center",
              gap: 11,
              animation: "m-fade-in var(--dur-med) var(--easing) both",
              animationDelay: `${i * 60}ms`,
            }}
          >
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isTop
                  ? "linear-gradient(135deg, var(--accent-1), var(--accent-2))"
                  : "var(--glass-3)",
                color: isTop ? "var(--accent-text-on)" : "var(--text-2)",
                fontFamily: "var(--font-brand)",
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              {isTop ? "👑" : i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#fff", fontSize: 13.5, fontWeight: 700 }}>{row.display}</div>
              <div style={{ color: "var(--text-5)", fontSize: 10.5 }}>{RANK_LABEL_KO[row.rank]}</div>
            </div>
            <Pill tone={isTop ? "accent" : "muted"}>
              {i + 1}위
            </Pill>
          </div>
        );
      })}
    </div>
  );
}

function seatName(
  seats: { seatId: string; displayName: string }[] | undefined,
  id: string
): string {
  return seats?.find((s) => s.seatId === id)?.displayName ?? id.slice(-4);
}
