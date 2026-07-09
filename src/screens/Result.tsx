import { PhoneFrame } from "@web/design/PhoneFrame";
import { BottomBar, Button, Card, ScreenHeader } from "@web/design/primitives";
import { send, useStore } from "@web/state/store";
import { navigate } from "@web/nav/router";
import { DesktopStage } from "./DesktopStage";

export function ResultScreen() {
  const room = useStore((s) => s.room);
  const view = useStore((s) => s.gameView?.view) as any;
  return (
    <DesktopStage>
      <PhoneFrame>
        <ScreenHeader title="매치 결과" />
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
          <Card tone="accent">
            <div style={{ color: "var(--accent-3)", fontSize: 11 }}>매치 종료</div>
            <div
              style={{
                fontFamily: "var(--font-brand)",
                fontSize: 24,
                fontWeight: 900,
                color: "#fff",
                marginTop: 4,
              }}
            >
              🏆 최종 순위
            </div>
          </Card>
          {view?.ranks
            ? Object.entries(view.ranks).map(([seatId, rank]: any) => (
                <Card key={seatId}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ color: "#fff", fontSize: 13 }}>{seatId}</div>
                    <div style={{ marginLeft: "auto", color: "var(--accent-3)", fontSize: 12 }}>
                      {String(rank)}
                    </div>
                  </div>
                </Card>
              ))
            : null}
        </div>
        <BottomBar>
          <Button
            full
            variant="ghost"
            onClick={() => {
              send({ t: "leaveRoom" });
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
