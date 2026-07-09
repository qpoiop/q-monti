import { useEffect, useState } from "react";
import { useStore } from "@web/state/store";

/**
 * Full-screen overlay whenever the WS is not `connected`.
 *
 * `idle` (no room yet) → nothing.
 * `connecting` / `reconnecting` → overlay with countdown; the server holds
 * the seat offline for OFFLINE_DROP_MS (10 min) before dropping — we
 * surface that as a "seat freed in Xm" hint so users understand the grace.
 */
export function ConnectionOverlay() {
  const status = useStore((s) => s.connection);
  const inRoom = useStore((s) => !!s.room);
  const [offlineStartedAt, setOfflineStartedAt] = useState<number | null>(null);
  const [, force] = useState(0);

  useEffect(() => {
    if (status === "connected" || status === "idle") {
      setOfflineStartedAt(null);
      return;
    }
    if (offlineStartedAt == null) setOfflineStartedAt(Date.now());
    const t = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [status, offlineStartedAt]);

  if (status === "connected" || status === "idle") return null;

  // 10-minute grace mirrors OFFLINE_DROP_MS in the DO.
  const GRACE_MS = 10 * 60 * 1000;
  const elapsed = offlineStartedAt ? Date.now() - offlineStartedAt : 0;
  const remainingMs = Math.max(0, GRACE_MS - elapsed);
  const remMin = Math.floor(remainingMs / 60000);
  const remSec = Math.floor((remainingMs % 60000) / 1000);

  const [title, sub] =
    status === "connecting"
      ? ["서버 연결 중", "잠시만 기다려주세요"]
      : status === "reconnecting"
      ? ["재연결 중…", inRoom ? `자리 유지 · ${remMin}:${String(remSec).padStart(2, "0")} 남음` : "다시 시도 중"]
      : ["연결 끊김", inRoom ? `자리 유지 · ${remMin}:${String(remSec).padStart(2, "0")} 남음` : "네트워크 상태 확인 필요"];

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
