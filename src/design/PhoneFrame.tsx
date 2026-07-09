import type { CSSProperties, ReactNode } from "react";

/**
 * Phone frame.
 *
 * The design mockup is a fixed 280×600 device including its bezel. We
 * keep the same fixed pixel layout in every viewport — desktop shows
 * the mockup natively, mobile scales the entire frame with a CSS
 * transform so the app fits the viewport while preserving every
 * component's exact ratio.
 *
 * Because the transform is applied to the outer wrapper, all inner
 * layouts (padding, spacing, typography) can stay declared in the
 * mockup's original pixel values without any responsive branching.
 */
export function PhoneFrame({
  children,
  gradient,
}: {
  children: ReactNode;
  gradient?: string;
}) {
  const innerStyle: CSSProperties = {
    background: `${gradient ?? ""}, linear-gradient(165deg, var(--surface-1), var(--surface-2))`,
  };
  return (
    <div className="phone-outer">
      <div className="phone-inner" style={innerStyle}>
        <div className="phone-status">
          <span>9:41</span>
          <span>5G ▪ 100</span>
        </div>
        <div className="phone-content">{children}</div>
      </div>
    </div>
  );
}
