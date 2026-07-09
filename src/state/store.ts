import { useSyncExternalStore } from "react";
import type { C2S, RoomStatePublic, S2C } from "@shared/protocol";
import {
  Transport,
  api,
  getDisplayName,
  getSessionId,
  setDisplayName,
} from "@web/net/transport";

export interface AppState {
  route: Route;
  session: { sessionId: string; userId?: string; displayName: string };
  connection: "idle" | "connecting" | "connected" | "reconnecting" | "closed";
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
  connection: "idle",
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
    transport = new Transport();
    transport.onStatus((s) => {
      setState({
        connection:
          s.kind === "connected"
            ? "connected"
            : s.kind === "connecting"
            ? "connecting"
            : s.kind === "reconnecting"
            ? "reconnecting"
            : s.kind === "closed"
            ? "closed"
            : "idle",
      });
    });
    transport.onMessage(handleServerMessage);
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
      setState({
        gameView: {
          view: m.view,
          version: m.version,
          lastEvents: m.events,
        },
      });
      break;
    case "chat":
      break;
    case "error":
      setState({ error: m.message, toast: { text: m.message, ts: Date.now() } });
      break;
    case "pong":
      break;
  }
}

/* -------------------------- Actions -------------------------- */

export function send(msg: C2S): void {
  getTransport().send(msg);
}

/** Host action — creates a new room via HTTP then opens the WS to it. */
export async function createRoomAndJoin(args: {
  gameId: string;
  roomName?: string;
  isPrivate?: boolean;
  maxPlayers: number;
  config?: unknown;
}): Promise<void> {
  const t = getTransport();
  t.close();
  const { code } = await api.newRoom(args.gameId);
  setState({
    toast: { text: `방 코드: ${code}`, ts: Date.now() },
  });
  t.connect(code, {
    seedMeta: {
      roomName: args.roomName,
      isPrivate: args.isPrivate,
      maxPlayers: args.maxPlayers,
    },
  });
  if (args.config != null) {
    // Fire after connect settles — transport queues until open.
    t.send({ t: "setConfig", config: args.config });
  }
}

/** Joiner action — validates code exists, then opens the WS. */
export async function joinRoomByCode(code: string): Promise<boolean> {
  const t = getTransport();
  t.close();
  const { name } = await api.lookup(code.toUpperCase()).catch(() => ({ name: null }));
  if (!name) {
    setState({ toast: { text: "방을 찾을 수 없어요", ts: Date.now() } });
    return false;
  }
  t.connect(code.toUpperCase());
  return true;
}

export function leaveRoom(): void {
  const t = getTransport();
  t.send({ t: "leaveRoom" });
  t.close();
  setState({ room: undefined, gameView: undefined });
}

export function goto(route: Route): void {
  setState({ route });
}
export function setName(name: string): void {
  setDisplayName(name);
  setState((s) => ({ session: { ...s.session, displayName: name } }));
}
