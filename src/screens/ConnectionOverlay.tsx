import { useEffect, useState } from "react";
import { leaveRoom, retryConnection, useStore } from "@web/state/store";
import { navigate } from "@web/nav/router";
import { DialogCard, OverlayScrim, Row } from "@web/design/layout";
import { Button } from "@web/design/primitives";

/**
 * Connection overlay.
 *
 * States:
 *   idle       → hidden (no room to connect to yet)
 *   connecting → spinner ring, no actions (just wait)
 *   reconnecting / closed:
 *     - in a room  → spinner + countdown of remaining grace + [다시 시도]
 *                    and [방 나가기]. When grace hits 0 the DO will have
 *                    dropped the seat; we surface "자리 만료" and switch
 *                    the CTA to 홈으로 + reset the room state.
 *     - no room    → static ⚡ + [다시 시도] and [홈으로]. There is no
 *                    countdown because nothing is being preserved.
 *
 * The user always has at least one clear action, no matter which state
 * the overlay is showing. Timers do not silently strand the UI.
 */
const GRACE_MS = 10 * 60 * 1000;

type OverlayAction = { label: string; variant: "primary" | "ghost"; onClick: () => void };

export function ConnectionOverlay() {
  const status = useStore((s) => s.connection);
  const inRoom = useStore((s) => !!s.room);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (status === "connected" || status === "idle") {
      setStartedAt(null);
      return;
    }
    setStartedAt((prev) => prev ?? Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [status]);

  if (status === "connected" || status === "idle") return null;

  const remainingMs = startedAt && inRoom ? Math.max(0, GRACE_MS - (now - startedAt)) : 0;
  const expired = inRoom && startedAt != null && remainingMs === 0;
  const showSpinner = status === "connecting" || status === "reconnecting";
  const showCountdown = inRoom && !expired && (status === "reconnecting" || status === "closed");
  const countdown = `${Math.floor(remainingMs / 60000)}:${String(
    Math.floor((remainingMs % 60000) / 1000)
  ).padStart(2, "0")}`;

  const title = expired
    ? "자리 만료"
    : status === "connecting"
    ? "서버 연결 중"
    : status === "reconnecting"
    ? "재연결 중…"
    : "연결 끊김";

  const sub = expired
    ? "자리 유지 시간이 지났어요. 방을 다시 만들거나 코드로 입장해주세요"
    : status === "connecting"
    ? "잠시만 기다려주세요"
    : showCountdown
    ? `자리 유지 · ${countdown} 남음`
    : inRoom
    ? "다시 연결을 시도합니다"
    : "네트워크 상태를 확인해주세요";

  const actions: OverlayAction[] = expired
    ? [
        {
          label: "홈으로",
          variant: "primary",
          onClick: () => {
            leaveRoom();
            navigate({ name: "home" });
          },
        },
      ]
    : status === "connecting"
    ? []
    : inRoom
    ? [
        {
          label: "방 나가기",
          variant: "ghost",
          onClick: () => {
            leaveRoom();
            navigate({ name: "home" });
          },
        },
        { label: "다시 시도", variant: "primary", onClick: retryConnection },
      ]
    : [
        {
          label: "홈으로",
          variant: "ghost",
          onClick: () => navigate({ name: "home" }),
        },
        { label: "다시 시도", variant: "primary", onClick: retryConnection },
      ];

  return (
    <OverlayScrim align="center">
      <DialogCard>
        {showSpinner && !expired ? (
          <div className="spinner-ring">
            <span className="spinner-emoji">⚡</span>
          </div>
        ) : (
          <div className="spinner-static">
            <span className="spinner-emoji">{expired ? "⏳" : "⚡"}</span>
          </div>
        )}
        <div className="dialog-title">{title}</div>
        <div className="dialog-sub">{sub}</div>
        {actions.length ? (
          <Row gap={8} className="dialog-actions">
            {actions.map((a) => (
              <Button key={a.label} full variant={a.variant} onClick={a.onClick}>
                {a.label}
              </Button>
            ))}
          </Row>
        ) : null}
      </DialogCard>
    </OverlayScrim>
  );
}
