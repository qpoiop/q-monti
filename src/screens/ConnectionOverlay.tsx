import { useEffect, useState } from "react";
import { leaveRoom, retryConnection, useStore } from "@web/state/store";
import { navigate } from "@web/nav/router";
import { DialogCard, OverlayScrim, Row } from "@web/design/layout";
import { Button } from "@web/design/primitives";

/**
 * Connection overlay.
 *
 * Idle → hidden (no room to connect to yet).
 * Connecting → shimmering ring around a ⚡ emoji + label.
 * Reconnecting / closed → ring + countdown ("자리 유지 · X:XX 남음") when
 *   we're in a room. Below the label: retry + 방 나가기 actions.
 *
 * The ring is a pure-CSS conic spinner around the emoji so nothing hits
 * the JS timer on every frame.
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
  const countdown =
    inRoom && (status === "reconnecting" || status === "closed")
      ? `${Math.floor(remainingMs / 60000)}:${String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, "0")}`
      : "";

  const [title, sub] =
    status === "connecting"
      ? ["서버 연결 중", "잠시만 기다려주세요"]
      : status === "reconnecting"
      ? ["재연결 중…", inRoom ? `자리 유지 · ${countdown} 남음` : "다시 시도 중"]
      : ["연결 끊김", inRoom ? `자리 유지 · ${countdown} 남음` : "네트워크 상태 확인 필요"];

  return (
    <OverlayScrim align="center">
      <DialogCard>
        <div className="spinner-ring">
          <span className="spinner-emoji">⚡</span>
        </div>
        <div className="dialog-title">{title}</div>
        <div className="dialog-sub">{sub}</div>
        {status === "closed" || (status === "reconnecting" && inRoom) ? (
          <Row gap={8} className="dialog-actions">
            {inRoom ? (
              <Button
                full
                variant="ghost"
                onClick={() => {
                  leaveRoom();
                  navigate({ name: "home" });
                }}
              >
                방 나가기
              </Button>
            ) : null}
            <Button full variant="primary" onClick={retryConnection}>
              다시 시도
            </Button>
          </Row>
        ) : null}
      </DialogCard>
    </OverlayScrim>
  );
}
