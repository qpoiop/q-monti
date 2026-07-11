import { useEffect } from "react";
import { patchState } from "@web/state/store";

/**
 * useOverlayHold — signal to the play surface that a modal overlay is
 * currently blocking gameplay. Flips `overlayHold` while `open` is true
 * so the turn timer in PlayHeader freezes and resumes cleanly.
 */
export function useOverlayHold(open: boolean): void {
  useEffect(() => {
    if (!open) return;
    patchState({ overlayHold: true });
    return () => {
      patchState({ overlayHold: false });
    };
  }, [open]);
}
