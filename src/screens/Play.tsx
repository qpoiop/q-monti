import { useEffect, useState } from "react";
import { PhoneFrame } from "@web/design/PhoneFrame";
import { ScreenHeader } from "@web/design/primitives";
import { leaveRoom, useStore } from "@web/state/store";
import { installBackGuard, navigate } from "@web/nav/router";
import { DesktopStage } from "./DesktopStage";
import { PLAY_GRADIENTS, PLAY_VIEWS } from "@web/games/registry";
import { ScreenBody, Hint, HeaderActions, RulesButton } from "@web/design/layout";
import { openRules } from "./RulesSheet";
import { ConfirmDialog } from "@web/design/ConfirmDialog";

/**
 * Live play surface. Wraps the phase view with a slim header so the
 * player can bail out mid-match (with confirm) and open the rulebook
 * without leaving the game. Browser back also routes through the same
 * confirm via installBackGuard — hitting the OS back gesture no longer
 * ejects them without warning.
 */
export function PlayScreen() {
  const room = useStore((s) => s.room);
  const view = useStore((s) => s.gameView?.view);
  const [confirmLeave, setConfirmLeave] = useState(false);
  useEffect(() => {
    const cleanup = installBackGuard(() => {
      setConfirmLeave(true);
      return true;
    });
    return cleanup;
  }, []);
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
        <ScreenHeader
          title={room.roomName || "모몬티"}
          onBack={() => setConfirmLeave(true)}
          right={
            <HeaderActions>
              <RulesButton onClick={() => openRules(room.gameId)} />
            </HeaderActions>
          }
        />
        <View view={view} />
      </PhoneFrame>
      <ConfirmDialog
        open={confirmLeave}
        icon="🚪"
        title="게임에서 나갈까요?"
        message="진행 중인 판은 남은 인원끼리 계속됩니다"
        cancelLabel="계속 진행"
        confirmLabel="나가기"
        onCancel={() => setConfirmLeave(false)}
        onConfirm={() => {
          setConfirmLeave(false);
          leaveRoom();
          navigate({ name: "home" });
        }}
      />
    </DesktopStage>
  );
}
