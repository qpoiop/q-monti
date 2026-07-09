import { useEffect, useState } from "react";
import { getInstallState, initInstall, type InstallState } from "@web/pwa/install";
import { applyPendingUpdate } from "@web/pwa/register";
import { Button } from "@web/design/primitives";

const DISMISS_KEY = "momonti.installDismissedAt";

/**
 * Two-layer surface:
 *   1. Install banner — one-time nudge to add the PWA to home screen.
 *      Auto-hides after user dismisses (7-day cooldown).
 *   2. Update banner — appears when a new SW is waiting; tap to reload.
 */
export function InstallLayer() {
  const [install, setInstall] = useState<InstallState>(getInstallState());
  const [dismissed, setDismissed] = useState<boolean>(() => {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    return Date.now() - at < 7 * 24 * 60 * 60 * 1000;
  });
  const [showIOS, setShowIOS] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    initInstall(setInstall);
    const onUpdate = () => setUpdateReady(true);
    window.addEventListener("momonti:sw-update", onUpdate);
    return () => window.removeEventListener("momonti:sw-update", onUpdate);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  return (
    <>
      {/* Update banner — shown when a new SW is waiting */}
      {updateReady ? (
        <div style={bannerStyle("update")}>
          <div style={{ flex: 1, color: "#fff", fontSize: 13 }}>
            <b>새 버전이 준비됐어요.</b> 탭 한 번으로 최신으로 갱신됩니다.
          </div>
          <Button size="sm" variant="accent" onClick={applyPendingUpdate}>
            지금 갱신
          </Button>
        </div>
      ) : null}

      {/* Install banner — Android/Desktop */}
      {!dismissed && install.kind === "promptable" ? (
        <div style={bannerStyle("install")}>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>
              모몬티를 홈 화면에 추가하세요
            </div>
            <div style={{ color: "var(--text-4)", fontSize: 11, marginTop: 2 }}>
              앱처럼 열리고 오프라인 시 안내가 표시됩니다
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={dismiss}>
            나중에
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={async () => {
              const r = await install.prompt();
              if (r === "dismissed") dismiss();
            }}
          >
            추가
          </Button>
        </div>
      ) : null}

      {/* Install banner — iOS: notice + sheet */}
      {!dismissed && install.kind === "ios-safari" ? (
        <div style={bannerStyle("install")}>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>
              모몬티를 홈 화면에 추가하세요
            </div>
            <div style={{ color: "var(--text-4)", fontSize: 11, marginTop: 2 }}>
              iOS는 Safari <b>공유</b> → <b>홈 화면에 추가</b> 로 설치해요
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={dismiss}>
            닫기
          </Button>
          <Button size="sm" variant="primary" onClick={() => setShowIOS(true)}>
            방법 보기
          </Button>
        </div>
      ) : null}

      {showIOS ? <IOSInstallSheet onClose={() => setShowIOS(false)} /> : null}
    </>
  );
}

function IOSInstallSheet({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6,4,15,.72)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 300,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface-2)",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          width: "100%",
          maxWidth: 460,
          padding: "22px 22px calc(22px + env(safe-area-inset-bottom))",
          boxShadow: "0 -12px 40px rgba(0,0,0,.5)",
          animation: "m-pop var(--dur-med) var(--easing)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-brand)",
            fontWeight: 800,
            fontSize: 20,
            color: "#fff",
          }}
        >
          홈 화면에 추가하는 법
        </div>
        <div style={{ color: "var(--text-4)", fontSize: 13, marginTop: 6 }}>
          iOS Safari 에서만 지원돼요. 아래 순서를 따라해보세요.
        </div>
        <ol
          style={{
            marginTop: 16,
            paddingLeft: 20,
            color: "var(--text-2)",
            fontSize: 14,
            lineHeight: 1.8,
          }}
        >
          <li>
            주소창 옆의 <b>공유 아이콘</b>(위쪽 화살표) 을 탭
          </li>
          <li>
            리스트에서 <b>홈 화면에 추가</b> 를 선택
          </li>
          <li>
            우측 상단 <b>추가</b> 를 탭하면 완료
          </li>
        </ol>
        <Button full variant="primary" onClick={onClose} style={{ marginTop: 18 }}>
          확인
        </Button>
      </div>
    </div>
  );
}

function bannerStyle(kind: "install" | "update"): React.CSSProperties {
  return {
    position: "fixed",
    top: "calc(12px + env(safe-area-inset-top))",
    left: 12,
    right: 12,
    padding: "10px 12px 10px 14px",
    borderRadius: 14,
    background:
      kind === "update"
        ? "linear-gradient(135deg, rgba(52,211,153,.24), rgba(52,211,153,.08))"
        : "linear-gradient(135deg, rgba(124,108,240,.28), rgba(200,85,240,.14))",
    border: "1px solid var(--glass-border-3)",
    display: "flex",
    alignItems: "center",
    gap: 10,
    zIndex: 250,
    backdropFilter: "blur(10px)",
    boxShadow: "0 12px 28px -12px rgba(0,0,0,.5)",
  };
}
