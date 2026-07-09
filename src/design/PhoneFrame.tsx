import type { CSSProperties, ReactNode } from "react";

/**
 * Adaptive phone frame.
 *
 * - Desktop / wide: renders the design-mockup bezel (280px reference).
 * - Mobile (<= 640px viewport): frame fills the viewport; bezel is removed
 *   and the inner screen expands to safe-area edges. Content padding follows
 *   `--safe-top` / `--safe-bottom`.
 *
 * All internal spacing/typography still comes from tokens.css so no hardcoded
 * pixel value crosses this boundary except the reference values that mirror
 * the design mockup.
 */
export function PhoneFrame({
  children,
  gradient,
  fullBleed = false,
}: {
  children: ReactNode;
  gradient?: string;
  fullBleed?: boolean;
}) {
  const isMobile =
    typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;
  const showBezel = !isMobile && !fullBleed;

  // Design mockup ships a 280 × 600 device — mirror it exactly on desktop.
  // On mobile the frame fills the viewport (safe-area aware).
  const outerStyle: CSSProperties = showBezel
    ? {
        width: 280,
        borderRadius: 40,
        padding: 10,
        background: "var(--surface-frame)",
        boxShadow: "var(--shadow-frame), inset 0 0 0 2px var(--surface-frame-ring)",
        flex: "none",
      }
    : {
        width: "100vw",
        minHeight: "100dvh",
      };

  const innerStyle: CSSProperties = showBezel
    ? {
        position: "relative",
        height: 600,
        width: 260,
        borderRadius: 32,
        overflow: "hidden",
        background: `${gradient ?? ""}, linear-gradient(165deg, var(--surface-1), var(--surface-2))`,
      }
    : {
        position: "relative",
        minHeight: "100dvh",
        overflow: "hidden",
        background: `${gradient ?? ""}, linear-gradient(165deg, var(--surface-1), var(--surface-2))`,
      };

  return (
    <div style={outerStyle}>
      <div style={innerStyle}>
        {showBezel ? <StatusBar mock /> : null}
        <div
          style={{
            position: "absolute",
            top: showBezel ? 36 : "var(--safe-top)",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function StatusBar({ mock }: { mock?: boolean }) {
  if (!mock) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        fontSize: 11,
        fontWeight: 700,
        color: "var(--text-2)",
        fontFamily: "var(--font-brand)",
        zIndex: 30,
      }}
    >
      <span>9:41</span>
      <span>5G ▪ 100</span>
    </div>
  );
}
