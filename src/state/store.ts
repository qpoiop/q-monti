import { useSyncExternalStore } from "react";
import type { C2S, RoomStatePublic, S2C } from "@shared/protocol";
import { Transport, buildWsUrl, getDisplayName, getSessionId, setDisplayName } from "@web/net/transport";

/**
 * App-wide store. Frameworkless subscribe-notify so any component can
 * `useStore(sel)` — the transport lifecycle is decoupled from React.
 *
 * State shape is intentionally flat: route, connection status, session,
 * room state and the current game view. The view is game-agnostic — the
 * consumer picks the game module by id and renders accordingly.
 */

export interface AppState {
  route: Route;
  session: { sessionId: string; userId?: string; displayName: string };
  connection: "connecting" | "connected" | "reconnecting" | "closed";
  room?: RoomStatePublic;
  gameView?: { view: unknown; version: number; lastEvents: unknown[] };
  error?: string;
  toast?: { text: string; ts: number };
}

export type Route =
  | { name: "home" }
  | { name: "library" }
  | { name: "create"; gameId: string }
  | { name: "join" }
  | { name: "lobby" }
  | { name: "play" }
  | { name: "result" };

const initial: AppState = {
  route: { name: "home" },
  session: { sessionId: getSessionId(), displayName: getDisplayName() },
  connection: "connecting",
};

let current: AppState = initial;
const listeners = new Set<() => void>();

function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)): void {
  const next = typeof patch === "function" ? patch(current) : patch;
  current = { ...current, ...next };
  for (const l of listeners) l();
}

export function getState(): AppState {
  return current;
}
export function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
export function useStore<T>(sel: (s: AppState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => sel(current),
    () => sel(initial)
  );
}

/* -------------------------- Transport bridge -------------------------- */

let transport: Transport | null = null;
export function getTransport(): Transport {
  if (!transport) {
    transport = new Transport(buildWsUrl());
    transport.onStatus((s) => {
      setState({
        connection:
          s.kind === "connected"
            ? "connected"
            : s.kind === "connecting"
            ? "connecting"
            : s.kind === "reconnecting"
            ? "reconnecting"
            : "closed",
      });
    });
    transport.onMessage((m) => handleServerMessage(m));
    transport.connect();
  }
  return transport;
}

function handleServerMessage(m: S2C): void {
  switch (m.t) {
    case "welcome":
      setState({
        session: { ...current.session, sessionId: m.sessionId, userId: m.userId },
      });
      break;
    case "roomCreated":
      setState({ room: undefined, route: { name: "lobby" } });
      setState({ toast: { text: `방 코드: ${m.code}`, ts: Date.now() } });
      break;
    case "roomState": {
      const cur = current.route;
      const next =
        m.room.phase === "playing"
          ? { name: "play" as const }
          : m.room.phase === "ended"
          ? { name: "result" as const }
          : m.room.phase === "lobby" &&
            (cur.name === "home" || cur.name === "library" || cur.name === "create")
          ? { name: "lobby" as const }
          : cur;
      setState({ room: m.room, route: next });
      break;
    }
    case "gameView":
      setState((s) => ({
        gameView: {
          view: m.view,
          version: m.version,
          lastEvents: m.events,
        },
      }));
      break;
    case "chat":
      // Not currently rendered — placeholder for future chat UI.
      break;
    case "error":
      setState({ error: m.message, toast: { text: m.message, ts: Date.now() } });
      break;
    case "pong":
      break;
  }
}

/* -------------------------- Actions (thin wrappers) -------------------------- */

export function send(msg: C2S): void {
  getTransport().send(msg);
}
export function goto(route: Route): void {
  setState({ route });
}
export function setName(name: string): void {
  setDisplayName(name);
  setState((s) => ({ session: { ...s.session, displayName: name } }));
}
