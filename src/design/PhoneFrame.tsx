import { useEffect, type CSSProperties, type ReactNode } from "react";

/**
 * Phone frame.
 *
 * Mockup is a fixed 280×620 device (including the bezel). We keep every
 * internal spacing / typography value in the mockup's original pixel
 * units, and let a single `--phone-scale` variable — recomputed from
 * `window.innerWidth/innerHeight` — scale the whole frame to the actual
 * viewport. The `.phone-scaler` wrapper reserves the scaled *visual*
 * dimensions so flex centering remains correct; the scale itself is
 * applied via `transform: scale()` on `.phone-outer`.
 *
 * This gives real responsive sizing (both width AND height are used to
 * fit) while preserving every mockup ratio at zero per-element cost.
 */
const DESIGN_W = 280;
const DESIGN_H = 620;

function computeScale(): number {
  if (typeof window === "undefined") return 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  return Math.min(w / DESIGN_W, h / DESIGN_H);
}

let listenersCount = 0;
let currentScale = 1;

function applyScale(): void {
  const next = computeScale();
  if (Math.abs(next - currentScale) < 0.001) return;
  currentScale = next;
  document.documentElement.style.setProperty("--phone-scale", String(next));
}

function subscribeResize(): () => void {
  applyScale();
  if (listenersCount === 0) {
    window.addEventListener("resize", applyScale);
    window.addEventListener("orientationchange", applyScale);
  }
  listenersCount += 1;
  return () => {
    listenersCount -= 1;
    if (listenersCount === 0) {
      window.removeEventListener("resize", applyScale);
      window.removeEventListener("orientationchange", applyScale);
    }
  };
}

export function PhoneFrame({
  children,
  gradient,
}: {
  children: ReactNode;
  gradient?: string;
}) {
  useEffect(() => subscribeResize(), []);
  const innerStyle: CSSProperties = {
    background: `${gradient ?? ""}, linear-gradient(165deg, var(--surface-1), var(--surface-2))`,
  };
  return (
    <div className="phone-scaler">
      <div className="phone-outer">
        <div className="phone-inner" style={innerStyle}>
          <div className="phone-status">
            <span>9:41</span>
            <span>5G ▪ 100</span>
          </div>
          <div className="phone-content">{children}</div>
        </div>
      </div>
    </div>
  );
}
