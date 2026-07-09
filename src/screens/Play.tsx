import { PhoneFrame } from "@web/design/PhoneFrame";
import { ScreenHeader } from "@web/design/primitives";
import { useStore } from "@web/state/store";
import { navigate } from "@web/nav/router";
import { DesktopStage } from "./DesktopStage";
import { MomontyPlayView } from "@web/games/momonty/PlayView";

/**
 * Play dispatcher — picks the game's view module by id.
 * Each game plugs in a component that reads `gameView.view` (typed to its
 * own View shape) and renders the play surface.
 */
export function PlayScreen() {
  const room = useStore((s) => s.room);
  const view = useStore((s) => s.gameView?.view);
  if (!room || !view) {
    return (
      <DesktopStage>
        <PhoneFrame>
          <ScreenHeader title="게임 준비 중" onBack={() => navigate({ name: "home" })} />
          <div style={{ padding: 16, color: "var(--text-5)", fontSize: 12 }}>
            잠시만 기다려주세요…
          </div>
        </PhoneFrame>
      </DesktopStage>
    );
  }
  switch (room.gameId) {
    case "momonty":
      return (
        <DesktopStage>
          <PhoneFrame
            gradient="radial-gradient(90% 40% at 50% 0%, rgba(242,193,78,.16), transparent 60%)"
          >
            <MomontyPlayView view={view as any} />
          </PhoneFrame>
        </DesktopStage>
      );
    default:
      return (
        <DesktopStage>
          <PhoneFrame>
            <ScreenHeader title={`${room.gameId} · 플레이`} />
            <div style={{ padding: 16, color: "var(--text-4)", fontSize: 13 }}>
              이 게임의 플레이 화면은 곧 추가돼요. 서버 로직은 이미 동작합니다.
              <pre style={{ marginTop: 12, fontSize: 10, whiteSpace: "pre-wrap" }}>
                {JSON.stringify(view, null, 2)}
              </pre>
            </div>
          </PhoneFrame>
        </DesktopStage>
      );
  }
}
