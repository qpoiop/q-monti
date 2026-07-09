import type { Route } from "@web/state/store";

/**
 * History-integrated router.
 *
 * Every route change pushes an entry to `history` so hardware/browser back
 * navigates the app stack instead of leaving. Home is the base entry — if
 * the user presses back on Home we intercept and ask them to confirm exit.
 *
 * The store is the source of truth. `navigate()` writes both `history` and
 * `store.route`. `popstate` reconciles the store from the new history state.
 *
 * Route guards enforce preconditions: e.g. `play` requires a room in
 * `playing` phase; `lobby` requires a room. If a guard fails we bounce back.
 */

import { getState, goto, subscribe } from "@web/state/store";

const STATE_KEY = "momonti.route";

/** Serialize a route into a URL path for shareable back-restore. */
function routeToPath(r: Route): string {
  switch (r.name) {
    case "home":
      return "/";
    case "library":
      return "/library";
    case "create":
      return `/create/${r.gameId}`;
    case "join":
      return "/join";
    case "lobby":
      return "/lobby";
    case "play":
      return "/play";
    case "result":
      return "/result";
  }
}

function pathToRoute(path: string): Route {
  if (path === "/" || path === "") return { name: "home" };
  if (path.startsWith("/library")) return { name: "library" };
  if (path.startsWith("/create/")) return { name: "create", gameId: path.slice(8) || "momonty" };
  if (path.startsWith("/join")) return { name: "join" };
  if (path.startsWith("/lobby")) return { name: "lobby" };
  if (path.startsWith("/play")) return { name: "play" };
  if (path.startsWith("/result")) return { name: "result" };
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
export function confirmExit(): void {
  emitConfirm(false);
  // Best-effort — PWAs can close their window; browser tabs cannot be
  // programmatically closed unless script-opened. We navigate home as a
  // graceful fallback and rely on the user's hardware back to finish.
  history.length > 1 ? history.back() : (window.location.href = "about:blank");
}

/** Route guard — returns the *effective* route the user is allowed to see. */
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
    case "library":
    case "home":
      break;
  }
  return r;
}

let syncingFromHistory = false;

/** Push a new route, respecting guards. */
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

/** Initialize router — called once from App. */
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

  // Mirror any store-driven route change (e.g. server-triggered lobby→play) into history.
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

  // beforeunload guard — mid-game accidental refresh confirmation.
  window.addEventListener("beforeunload", (e) => {
    const s = getState();
    if (s.room && s.room.phase === "playing") {
      e.preventDefault();
      e.returnValue = "";
    }
  });
}
