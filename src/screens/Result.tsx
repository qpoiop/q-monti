import { PhoneFrame } from "@web/design/PhoneFrame";
import { Button, ScreenHeader } from "@web/design/primitives";
import { leaveRoom, useStore } from "@web/state/store";
import { navigate } from "@web/nav/router";
import { DesktopStage } from "./DesktopStage";
import { Aurora } from "@web/design/effects/Aurora";
import { Particles } from "@web/design/effects/Particles";
import { MatchEnd } from "@web/games/momonty/phases/MatchEnd";
import { ScreenBody, FooterBar, HeaderActions } from "@web/design/layout";
import type { MomontyView } from "@shared/games/momonty/logic";
import { ChatDock, ChatToggle } from "./ChatDock";

/**
 * Result surface for live rooms — wraps the shared MatchEnd phase view
 * with the 결과 공유 / 한 판 더 action bar from the mockup.
 */
export function ResultScreen() {
  const view = useStore((s) => s.gameView?.view) as MomontyView | undefined;

  return (
    <DesktopStage>
      <PhoneFrame gradient="radial-gradient(85% 46% at 50% 8%, rgba(242,193,78,.3), transparent 60%)">
        <Aurora tone="gold" />
        <Particles variant="crown-rain" density={1.2} />
        <ScreenHeader
          title="매치 결과"
          right={
            <HeaderActions>
              <ChatToggle />
            </HeaderActions>
          }
        />
        <ScreenBody>
          {view ? (
            <MatchEnd view={view} />
          ) : (
            <div style={{ color: "var(--text-4)", fontSize: 12 }}>결과 데이터를 불러오는 중…</div>
          )}
        </ScreenBody>
        <FooterBar>
          <Button
            full
            variant="ghost"
            onClick={() => {
              if (navigator.share) navigator.share({ text: "모몬티 매치 결과" });
            }}
          >
            결과 공유
          </Button>
          <Button
            full
            variant="primary"
            onClick={() => {
              leaveRoom();
              navigate({ name: "home" });
            }}
          >
            한 판 더 ▶
          </Button>
        </FooterBar>
        <ChatDock />
      </PhoneFrame>
    </DesktopStage>
  );
}
