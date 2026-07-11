/**
 * Service worker registration + update flow.
 *
 * Emits `momonti:sw-update` on the window when a new worker is waiting so
 * the UI can render an "update available" banner. Calling
 * `applyPendingUpdate()` messages the waiting worker to activate.
 */

let waitingWorker: ServiceWorker | null = null;

export function registerSW(): void {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const checkWaiting = (): void => {
        if (reg.waiting && navigator.serviceWorker.controller) {
          waitingWorker = reg.waiting;
          window.dispatchEvent(new CustomEvent("momonti:sw-update"));
        }
      };
      // A worker might already be waiting from a previous tab — surface
      // it immediately instead of waiting for updatefound to re-fire.
      checkWaiting();
      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            waitingWorker = reg.waiting;
            window.dispatchEvent(new CustomEvent("momonti:sw-update"));
          }
        });
      });
      // Nudge the browser to compare bytes on this visit rather than
      // waiting for the hourly heartbeat.
      reg.update().catch(() => {});
      // Also re-check on tab focus so a long-lived tab picks up new
      // deploys without a hard reload.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") reg.update().catch(() => {});
      });
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    } catch {
      /* SW unsupported / dev */
    }
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      location.reload();
    });
  });
}

export function applyPendingUpdate(): void {
  if (waitingWorker) waitingWorker.postMessage({ type: "SKIP_WAITING" });
  else location.reload();
}
