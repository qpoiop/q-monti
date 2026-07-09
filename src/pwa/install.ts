/**
 * Install prompt orchestration.
 *
 * On Android/desktop Chromium browsers, `beforeinstallprompt` gives us a
 * deferred prompt we invoke when the user clicks our install button.
 *
 * iOS Safari has no programmatic install — we detect iOS + Safari and show
 * an instructional sheet ("공유 → 홈 화면에 추가").
 */

export type InstallState =
  | { kind: "unsupported" }
  | { kind: "installed" }
  | { kind: "ios-safari" }
  | { kind: "promptable"; prompt: () => Promise<"accepted" | "dismissed"> };

let cachedState: InstallState = { kind: "unsupported" };
let deferredPrompt: any = null;

export function initInstall(onChange: (s: InstallState) => void): void {
  const emit = (s: InstallState) => {
    cachedState = s;
    onChange(s);
  };
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS-specific flag on legacy Safari
    (navigator as any).standalone === true;
  if (isStandalone) {
    emit({ kind: "installed" });
    return;
  }
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) && !(window as any).MSStream;
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  if (isIOS && isSafari) {
    emit({ kind: "ios-safari" });
    return;
  }
  window.addEventListener("beforeinstallprompt", (e: any) => {
    e.preventDefault();
    deferredPrompt = e;
    emit({
      kind: "promptable",
      prompt: async () => {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        return outcome as "accepted" | "dismissed";
      },
    });
  });
  window.addEventListener("appinstalled", () => emit({ kind: "installed" }));
}

export function getInstallState(): InstallState {
  return cachedState;
}
