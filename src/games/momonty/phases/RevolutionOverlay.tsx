import { useEffect, useState } from "react";
import { useStore } from "@web/state/store";
import "./revolution-overlay.css";

/**
 * Revolution broadcast — mounted globally so any phase view can be
 * covered when the engine fires the `revolution` event.
 *
 * Fires on `gameView.lastEvents` including any event whose type starts
 * with `revolution`. Auto-dismisses after 2.6s.
 */
export function RevolutionOverlay() {
  const events = useStore((s) => s.gameView?.lastEvents);
  const version = useStore((s) => s.gameView?.version ?? 0);
  const [open, setOpen] = useState<null | { great: boolean; actorName?: string }>(null);
  useEffect(() => {
    if (!Array.isArray(events)) return;
    for (const e of events as any[]) {
      if (e?.type === "revolution") {
        setOpen({ great: !!e.payload?.great, actorName: e.payload?.actorName });
        // 5s cap — turn timer is still counting behind the scrim.
        const id = setTimeout(() => setOpen(null), 5000);
        return () => clearTimeout(id);
      }
    }
  }, [version, events]);
  if (!open) return null;
  return (
    <div className={`revolution-scrim ${open.great ? "great" : ""}`} aria-live="assertive">
      <div className="revolution-card">
        <div className="revolution-emoji">✊</div>
        <div className="revolution-title">{open.great ? "대혁명!" : "혁명!"}</div>
        <div className="revolution-sub">
          {open.actorName ? `${open.actorName} 선언 · ` : ""}
          {open.great ? "서열이 완전히 뒤집힙니다" : "이번 라운드 과세 취소"}
        </div>
        <div className="revolution-jesters">
          <span className="rev-jester">★</span>
          <span className="rev-jester">★</span>
        </div>
      </div>
    </div>
  );
}
