import { useStore } from "@web/state/store";

/** Full-screen overlay whenever the WS is not `connected`. */
export function ConnectionOverlay() {
  const status = useStore((s) => s.connection);
  if (status === "connected") return null;
  const [title, sub] =
    status === "connecting"
      ? ["서버 연결 중", "잠시만 기다려주세요"]
      : status === "reconnecting"
      ? ["재연결 중…", "게임은 그대로 유지됩니다"]
      : ["연결 끊김", "네트워크 상태를 확인해주세요"];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6,4,15,.72)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        style={{
          padding: "22px 26px",
          background: "var(--surface-2)",
          borderRadius: 20,
          border: "1px solid var(--glass-border-3)",
          textAlign: "center",
          maxWidth: 280,
        }}
      >
        <div style={{ fontSize: 26 }}>⚡</div>
        <div
          style={{
            fontFamily: "var(--font-brand)",
            fontWeight: 800,
            fontSize: 18,
            marginTop: 4,
            color: "#fff",
          }}
        >
          {title}
        </div>
        <div style={{ color: "var(--text-4)", fontSize: 12, marginTop: 6 }}>{sub}</div>
      </div>
    </div>
  );
}
