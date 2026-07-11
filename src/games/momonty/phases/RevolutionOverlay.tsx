import { useEffect, useState } from "react";
import { useStore } from "@web/state/store";
import { useOverlayHold } from "@web/state/hooks";
import { CountdownRing } from "@web/design/effects/CountdownRing";
import "./revolution-overlay.css";

/**
 * RevolutionOverlay — engine fires `revolution` event → full-frame
 * scrim covers all phase views. Great revolution swaps rank tiers and
 * gets a distinct badge + secondary effect line. Auto-dismisses via
 * CountdownRing; user can also tap the CTA to skip.
 */
const HOLD_MS = 12000;

interface OpenState {
  great: boolean;
  actorName?: string;
}

export function RevolutionOverlay() {
  const events = useStore((s) => s.gameView?.lastEvents);
  const version = useStore((s) => s.gameView?.version ?? 0);
  const [open, setOpen] = useState<OpenState | null>(null);
  useOverlayHold(!!open);

  useEffect(() => {
    if (!Array.isArray(events)) return;
    for (const e of events as any[]) {
      if (e?.type === "revolution") {
        setOpen({ great: !!e.payload?.great, actorName: e.payload?.actorName });
        return;
      }
    }
  }, [version, events]);

  if (!open) return null;
  return (
    <div className={`revolution-scrim ${open.great ? "great" : ""}`} aria-live="assertive">
      <div className="revolution-card">
        <CountdownRing
          active
          durationMs={HOLD_MS}
          onDone={() => setOpen(null)}
          tone={open.great ? "gold" : "brand"}
          size={92}
        >
          <span className="revolution-ring-emoji">{open.great ? "👑✊" : "✊"}</span>
        </CountdownRing>
        <div className="revolution-title">{open.great ? "대혁명!" : "혁명!"}</div>
        {open.great ? (
          <div className="revolution-great-badge">RANK REVERSAL</div>
        ) : null}
        <div className="revolution-sub">
          {open.actorName ? `${open.actorName} 선언` : "혁명 선언"}
        </div>
        <div className="revolution-effects">
          <div className="revolution-effect">
            <span className="revolution-effect-tick">✓</span>
            이번 라운드 <b>전원 세금 취소</b>
          </div>
          {open.great ? (
            <div className="revolution-effect danger">
              <span className="revolution-effect-tick">↕</span>
              <b>서열 완전 역전</b> · 모몬티 ↔ 페온
            </div>
          ) : (
            <div className="revolution-effect">
              <span className="revolution-effect-tick">·</span>
              서열은 그대로 유지
            </div>
          )}
        </div>
        <button
          type="button"
          className="revolution-cta"
          onClick={() => setOpen(null)}
        >
          확인 ▶
        </button>
      </div>
    </div>
  );
}
