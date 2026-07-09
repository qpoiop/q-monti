import { PhoneFrame } from "@web/design/PhoneFrame";
import { ScreenHeader } from "@web/design/primitives";
import { useStore } from "@web/state/store";
import { navigate } from "@web/nav/router";
import { DesktopStage } from "./DesktopStage";
import { PLAY_GRADIENTS, PLAY_VIEWS } from "@web/games/registry";

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
  const View = PLAY_VIEWS[room.gameId];
  const gradient = PLAY_GRADIENTS[room.gameId];
  if (!View) {
    return (
      <DesktopStage>
        <PhoneFrame gradient={gradient}>
          <ScreenHeader title={`${room.gameId} · 지원 준비 중`} />
          <div style={{ padding: 16, color: "var(--text-4)", fontSize: 13 }}>
            이 게임의 UI는 아직 등록되지 않았어요.
          </div>
        </PhoneFrame>
      </DesktopStage>
    );
  }
  return (
    <DesktopStage>
      <PhoneFrame gradient={gradient}>
        <View view={view} />
      </PhoneFrame>
    </DesktopStage>
  );
}
