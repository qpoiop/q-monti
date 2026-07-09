import type { Route } from "@web/state/store";
import { getState, goto, subscribe } from "@web/state/store";

/**
 * History-integrated router. Momonty-only.
 *
 *   /             → home
 *   /create       → create room
 *   /join         → join by code
 *   /lobby        → lobby
 *   /play         → play surface
 *   /result       → match end
 *
 * Route guards keep the store consistent: play needs `room.phase==='playing'`,
 * lobby needs a room, etc. Home back-press shows an exit confirm dialog.
 */

const STATE_KEY = "momonti.route";

function routeToPath(r: Route): string {
  switch (r.name) {
    case "home":
      return "/";
    case "create":
      return "/create";
    case "join":
      return "/join";
    case "lobby":
      return "/lobby";
    case "play":
      return "/play";
    case "result":
      return "/result";
    case "test":
      return "/test";
  }
}

function pathToRoute(path: string): Route {
  if (path === "/" || path === "") return { name: "home" };
  if (path.startsWith("/create")) return { name: "create" };
  if (path.startsWith("/join")) return { name: "join" };
  if (path.startsWith("/lobby")) return { name: "lobby" };
  if (path.startsWith("/play")) return { name: "play" };
  if (path.startsWith("/result")) return { name: "result" };
  if (path.startsWith("/test")) return { name: "test" };
  return { name: "home" };
}

let exitConfirmOpen = false;
type ConfirmHandler = (open: boolean) => void;
let confirmSubscribers: ConfirmHandler[] = [];

export function subscribeExitConfirm(l: ConfirmHandler): () => void {
  confirmSubscribers.push(l);
  l(exitConfirmOpen);
  return () => {
    confirmSubscribers = confirmSubscribers.filter((x) => x !== l);
  };
}
function emitConfirm(v: boolean): void {
  exitConfirmOpen = v;
  for (const f of confirmSubscribers) f(v);
}

export function closeExitConfirm(): void {
  emitConfirm(false);
}

/**
 * Exit the app.
 *
 * Priority:
 *   1. If running as an installed PWA (standalone display-mode), we
 *      opened the window with the launch — `window.close()` is allowed.
 *   2. On mobile browsers, replace the doc with a "가셨어요" farewell
 *      so users see a clear exit state and the tab can be swiped away.
 *   3. As a last resort, navigate to `about:blank`.
 */
export function confirmExit(): void {
  emitConfirm(false);
  // window.close() only works for script-opened windows or the initial
  // page in a PWA/tabless standalone context. In every other case it's a
  // silent no-op — so we always follow up with a farewell view. Users
  // then explicitly swipe the tab away.
  try {
    window.close();
  } catch {
    /* ignore */
  }
  // Detach React from the DOM first so its next commit does not overwrite
  // the farewell markup, then replace document.documentElement.
  const root = document.getElementById("root");
  if (root) root.remove();
  showFarewell();
}

function showFarewell(): void {
  document.documentElement.innerHTML = `
    <head><meta charset="utf-8"><title>모몬티</title>
    <style>
      html,body{margin:0;height:100%;background:#120e26;color:#f4f2ff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;text-align:center}
      .box{padding:24px}
      .k{font-family:'Outfit',sans-serif;font-weight:900;font-size:34px;background:linear-gradient(135deg,#f2c14e,#c855f0);-webkit-background-clip:text;background-clip:text;color:transparent;letter-spacing:.02em}
      .s{color:#b8b0d8;margin-top:10px;font-size:14px}
      a{color:#f8d98a;margin-top:20px;display:inline-block;text-decoration:none;padding:10px 18px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);font-size:13px}
    </style>
    </head>
    <body><div class="box">
      <div class="k">모몬티</div>
      <div class="s">즐거운 왕좌였어요 👑</div>
      <a href="/">다시 열기</a>
    </div></body>`;
}

function guard(r: Route): Route {
  const s = getState();
  const inRoom = !!s.room;
  const playing = s.room?.phase === "playing";
  const ended = s.room?.phase === "ended";
  switch (r.name) {
    case "play":
      if (!inRoom || !playing) return inRoom ? { name: "lobby" } : { name: "home" };
      break;
    case "result":
      if (!inRoom || !ended) return inRoom ? { name: "lobby" } : { name: "home" };
      break;
    case "lobby":
      if (!inRoom) return { name: "home" };
      break;
    case "create":
    case "join":
    case "home":
    case "test":
      break;
  }
  return r;
}

let syncingFromHistory = false;

export function navigate(r: Route, opts: { replace?: boolean } = {}): void {
  const effective = guard(r);
  pushHistory(effective, opts.replace);
  goto(effective);
}

function pushHistory(r: Route, replace = false): void {
  const path = routeToPath(r);
  const state = { [STATE_KEY]: r };
  if (replace) history.replaceState(state, "", path);
  else history.pushState(state, "", path);
}

export function initRouter(): void {
  const initialPath = window.location.pathname || "/";
  const initialRoute = guard(pathToRoute(initialPath));
  history.replaceState({ [STATE_KEY]: initialRoute }, "", routeToPath(initialRoute));
  goto(initialRoute);

  window.addEventListener("popstate", (ev) => {
    const raw = (ev.state && ev.state[STATE_KEY]) as Route | undefined;
    const target = raw ?? pathToRoute(window.location.pathname || "/");
    const effective = guard(target);
    if (effective.name === "home" && target.name === "home" && exitConfirmOpen === false) {
      emitConfirm(true);
      history.pushState({ [STATE_KEY]: { name: "home" } }, "", "/");
      return;
    }
    if (routeToPath(effective) !== routeToPath(target)) {
      history.replaceState({ [STATE_KEY]: effective }, "", routeToPath(effective));
    }
    syncingFromHistory = true;
    goto(effective);
    syncingFromHistory = false;
  });

  let lastPath = routeToPath(getState().route);
  subscribe(() => {
    if (syncingFromHistory) return;
    const cur = getState().route;
    const p = routeToPath(cur);
    if (p !== lastPath) {
      pushHistory(cur);
      lastPath = p;
    }
  });

  window.addEventListener("beforeunload", (e) => {
    const s = getState();
    if (s.room && s.room.phase === "playing") {
      e.preventDefault();
      e.returnValue = "";
    }
  });
}
