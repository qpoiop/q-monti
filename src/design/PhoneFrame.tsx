import type { CSSProperties, ReactNode } from "react";

/**
 * Screen shell.
 *
 * The design mockup renders a fake 280×620 phone bezel with a "9:41"
 * status bar — that was a communication device for the designer, not a
 * literal render target. In production:
 *
 *   - Mobile: full-viewport (100dvw × 100dvh) with real safe-area
 *     insets; the OS provides the actual status bar.
 *   - Desktop: content constrained to a mobile-shaped 400-wide column,
 *     centred on a dark gradient stage. No fake bezel.
 *
 * Interior spacing / typography follows the mockup ratios but is written
 * in relative units so it scales naturally with the viewport.
 */
export function PhoneFrame({
  children,
  gradient,
}: {
  children: ReactNode;
  gradient?: string;
}) {
  const style: CSSProperties = {
    background: `${gradient ?? ""}, linear-gradient(165deg, var(--surface-1), var(--surface-2))`,
  };
  return (
    <div className="screen-shell" style={style}>
      <div className="screen-content">{children}</div>
    </div>
  );
}
