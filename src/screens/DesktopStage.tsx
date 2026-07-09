import type { ReactNode } from "react";

/**
 * A neutral scroll container centring a phone-sized surface — on desktop
 * looks like a mockup; on mobile it fills the viewport.
 */
export function DesktopStage({ children }: { children: ReactNode }) {
  return (
    <div className="desktop-stage">
      <div className="desktop-stage-inner">{children}</div>
    </div>
  );
}
