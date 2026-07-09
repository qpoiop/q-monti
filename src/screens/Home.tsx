import { PhoneFrame } from "@web/design/PhoneFrame";
import { Button } from "@web/design/primitives";
import { useStore } from "@web/state/store";
import { navigate } from "@web/nav/router";
import { DesktopStage } from "./DesktopStage";
import { Aurora } from "@web/design/effects/Aurora";
import { Particles } from "@web/design/effects/Particles";

export function HomeScreen() {
  const displayName = useStore((s) => s.session.displayName);
  return (
    <DesktopStage>
      <PhoneFrame
        gradient="radial-gradient(85% 46% at 50% 8%, rgba(242,193,78,.3), transparent 60%)"
      >
        <Aurora tone="gold" />
        <Particles variant="gold-shimmer" density={0.9} />
        <div
          style={{
            padding: "clamp(18px, 5vw, 26px) clamp(16px, 4vw, 22px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flex: 1,
            minHeight: 0,
            position: "relative",
            zIndex: 10,
          }}
        >
          <div style={{ marginTop: 24 }}>
            <MomontyLogoMark />
          </div>
          <div
            style={{
              color: "#fff",
              fontFamily: "var(--font-brand)",
              fontWeight: 900,
              fontSize: 30,
              marginTop: 16,
              letterSpacing: "-.01em",
            }}
          >
            모몬티
          </div>
          <div style={{ color: "var(--accent-3)", fontSize: 12, marginTop: 4 }}>
            낮은 숫자가 왕이 되는 서열 대전
          </div>
          <div
            style={{
              marginTop: 28,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <Button full variant="primary" onClick={() => navigate({ name: "library" })}>
              방 만들기
            </Button>
            <Button full variant="ghost" onClick={() => navigate({ name: "join" })}>
              코드로 입장
            </Button>
            <Button full variant="accent-soft">⚡ 빠른 매칭 (준비중)</Button>
          </div>
          <div style={{ marginTop: "auto", width: "100%" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 999,
                background: "var(--glass-2)",
                border: "1px solid var(--glass-border-2)",
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--brand-purple-1), var(--brand-purple-2))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  color: "#fff",
                }}
              >
                {(displayName[0] || "?").toUpperCase()}
              </span>
              <span style={{ color: "var(--text-2)", fontSize: 12, fontWeight: 600 }}>
                {displayName}
              </span>
              <span style={{ marginLeft: "auto", color: "var(--text-5)", fontSize: 12 }}>규칙 ⓘ</span>
            </div>
          </div>
        </div>
      </PhoneFrame>
    </DesktopStage>
  );
}

function MomontyLogoMark() {
  return (
    <div style={{ position: "relative", width: 96, height: 80 }}>
      <span
        style={{
          position: "absolute",
          left: 6,
          top: 14,
          width: 44,
          height: 62,
          borderRadius: 9,
          background: "#e7e2f5",
          transform: "rotate(-14deg)",
          boxShadow: "0 6px 12px -4px #000",
        }}
      />
      <span
        style={{
          position: "absolute",
          left: 44,
          top: 14,
          width: 44,
          height: 62,
          borderRadius: 9,
          background: "#e7e2f5",
          transform: "rotate(14deg)",
          boxShadow: "0 6px 12px -4px #000",
        }}
      />
      <span
        style={{
          position: "absolute",
          left: 26,
          top: 0,
          width: 44,
          height: 62,
          borderRadius: 9,
          background: "linear-gradient(160deg,#fff,#e7e2f5)",
          boxShadow: "0 0 0 2px var(--accent-1), 0 10px 20px -6px var(--accent-glow)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 13, marginBottom: -2 }}>👑</span>
        <span
          style={{
            color: "var(--gold-4)",
            fontFamily: "var(--font-brand)",
            fontWeight: 800,
            fontSize: 26,
          }}
        >
          1
        </span>
      </span>
    </div>
  );
}
