import { PhoneFrame } from "@web/design/PhoneFrame";
import { Button } from "@web/design/primitives";
import { useStore } from "@web/state/store";
import { navigate } from "@web/nav/router";
import { DesktopStage } from "./DesktopStage";
import { Aurora } from "@web/design/effects/Aurora";
import { Particles } from "@web/design/effects/Particles";
import { openRules } from "./RulesSheet";
import { Stack } from "@web/design/layout";
import "./home.css";

export function HomeScreen() {
  const displayName = useStore((s) => s.session.displayName);
  return (
    <DesktopStage>
      <PhoneFrame gradient="radial-gradient(85% 46% at 50% 8%, rgba(242,193,78,.3), transparent 60%)">
        <Aurora tone="gold" />
        <Particles variant="gold-shimmer" density={0.9} />
        <div className="home-body">
          <div className="home-hero">
            <div className="home-logo" aria-label="모몬티">
              <span className="card card-l" />
              <span className="card card-r" />
              <span className="card card-c">
                <span className="crown">👑</span>
                <span className="rank">1</span>
              </span>
            </div>
            <h1 className="home-title">모몬티</h1>
            <p className="home-subtitle">낮은 숫자가 왕이 되는 서열 대전</p>
          </div>
          <Stack gap={10} className="home-ctas">
            <Button full variant="primary" onClick={() => navigate({ name: "create" })}>
              방 만들기
            </Button>
            <Button full variant="ghost" onClick={() => navigate({ name: "join" })}>
              코드로 입장
            </Button>
            <Button full variant="accent-soft">
              ⚡ 빠른 매칭 (준비중)
            </Button>
          </Stack>
          <div className="home-profile">
            <span className="seat-avatar avatar-brand">{(displayName[0] || "?").toUpperCase()}</span>
            <span className="home-name">{displayName}</span>
            <button type="button" className="chip-btn push-right" onClick={() => openRules("momonty")}>
              규칙 ⓘ
            </button>
          </div>
        </div>
      </PhoneFrame>
    </DesktopStage>
  );
}
