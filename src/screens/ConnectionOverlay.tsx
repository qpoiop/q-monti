import { useEffect, useState } from "react";
import { useStore } from "@web/state/store";
import { DialogCard, OverlayScrim, Stack } from "@web/design/layout";

/**
 * Overlay whenever the WS is not `connected`. `idle` (no room yet) is
 * treated as a normal application state and does not show an overlay.
 * When we ARE in a room, we surface a live countdown mirroring the
 * server-side OFFLINE_DROP_MS (10 min) so users understand the grace.
 */
const GRACE_MS = 10 * 60 * 1000;

export function ConnectionOverlay() {
  const status = useStore((s) => s.connection);
  const inRoom = useStore((s) => !!s.room);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [, force] = useState(0);

  useEffect(() => {
    if (status === "connected" || status === "idle") {
      setStartedAt(null);
      return;
    }
    setStartedAt((prev) => prev ?? Date.now());
    const t = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  if (status === "connected" || status === "idle") return null;

  const remainingMs = Math.max(0, GRACE_MS - (startedAt ? Date.now() - startedAt : 0));
  const remMin = Math.floor(remainingMs / 60000);
  const remSec = Math.floor((remainingMs % 60000) / 1000);
  const countdown = `${remMin}:${String(remSec).padStart(2, "0")}`;

  const [title, sub] =
    status === "connecting"
      ? ["서버 연결 중", "잠시만 기다려주세요"]
      : status === "reconnecting"
      ? ["재연결 중…", inRoom ? `자리 유지 · ${countdown} 남음` : "다시 시도 중"]
      : ["연결 끊김", inRoom ? `자리 유지 · ${countdown} 남음` : "네트워크 상태 확인 필요"];

  return (
    <OverlayScrim align="center">
      <DialogCard>
        <div style={{ fontSize: 26 }}>⚡</div>
        <div className="dialog-title">{title}</div>
        <div className="dialog-sub">{sub}</div>
      </DialogCard>
    </OverlayScrim>
  );
}
