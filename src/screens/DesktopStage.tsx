import type { ReactNode } from "react";

/**
 * Root stage. On mobile the screen fills the viewport; on desktop it
 * gets a 420-wide column centred on the dark surface base — matches how
 * real mobile PWAs render when opened in a desktop browser.
 */
export function DesktopStage({ children }: { children: ReactNode }) {
  return <div className="stage">{children}</div>;
}
