import { PhoneFrame } from "@web/design/PhoneFrame";
import { ScreenHeader } from "@web/design/primitives";
import { useStore } from "@web/state/store";
import { navigate } from "@web/nav/router";
import { DesktopStage } from "./DesktopStage";
import { PLAY_GRADIENTS, PLAY_VIEWS } from "@web/games/registry";
import { ScreenBody, Hint } from "@web/design/layout";

export function PlayScreen() {
  const room = useStore((s) => s.room);
  const view = useStore((s) => s.gameView?.view);
  if (!room || !view) {
    return (
      <DesktopStage>
        <PhoneFrame>
          <ScreenHeader title="게임 준비 중" onBack={() => navigate({ name: "home" })} />
          <ScreenBody>
            <Hint>잠시만 기다려주세요…</Hint>
          </ScreenBody>
        </PhoneFrame>
      </DesktopStage>
    );
  }
  const View = PLAY_VIEWS[room.gameId];
  const gradient = PLAY_GRADIENTS[room.gameId];
  return (
    <DesktopStage>
      <PhoneFrame gradient={gradient}>
        <View view={view} />
      </PhoneFrame>
    </DesktopStage>
  );
}
