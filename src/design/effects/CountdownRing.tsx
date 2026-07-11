import { useEffect, useRef, useState } from "react";
import "./countdown-ring.css";

/**
 * CountdownRing — visual countdown as conic-gradient ring around a
 * centered emoji or content. Reused by revolution/tax overlays and any
 * dialog that auto-dismisses. rAF-driven so the sweep reads smooth.
 *
 * `active` gates the animation. When it flips true, timer resets. On
 * expiry `onDone` fires and the ring stays at 0 until active goes false.
 */
export function CountdownRing({
  active,
  durationMs,
  onDone,
  children,
  tone = "brand",
  size = 72,
}: {
  active: boolean;
  durationMs: number;
  onDone?: () => void;
  children?: React.ReactNode | ((remainingSec: number) => React.ReactNode);
  tone?: "brand" | "gold" | "danger";
  size?: number;
}) {
  const [pct, setPct] = useState(1);
  const [remaining, setRemaining] = useState(Math.ceil(durationMs / 1000));
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!active) {
      setPct(1);
      setRemaining(Math.ceil(durationMs / 1000));
      return;
    }
    let rafId = 0;
    let fired = false;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const left = Math.max(0, durationMs - elapsed);
      setPct(left / durationMs);
      setRemaining(Math.ceil(left / 1000));
      if (left <= 0) {
        if (!fired) {
          fired = true;
          doneRef.current?.();
        }
        return;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [active, durationMs]);

  return (
    <div
      className={`countdown-ring tone-${tone}`}
      style={{
        width: size,
        height: size,
        ["--cr-pct" as any]: pct,
      }}
      data-remaining={remaining}
    >
      <div className="countdown-ring-inner">
        {typeof children === "function" ? children(remaining) : children}
      </div>
    </div>
  );
}
