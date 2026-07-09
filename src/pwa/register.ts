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
      // Periodic version check.
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
