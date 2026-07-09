import type { ReactNode } from "react";

/**
 * A neutral scroll container centring a phone-sized surface — on desktop
 * looks like a mockup; on mobile it fills the viewport.
 */
export function DesktopStage({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "clamp(0px, 3vw, 48px) clamp(0px, 3vw, 24px)",
      }}
    >
      {children}
    </div>
  );
}
