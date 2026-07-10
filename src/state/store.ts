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
  /** True while a modal overlay (tax result, revolution) is holding the
   * screen; play-surface timers should freeze so the user isn't punished
   * for reading the summary. */
  overlayHold?: boolean;
  error?: string;
  toast?: { text: string; ts: number };
  /** Room chat — ephemeral, lives from room-join to leave. */
  chat: ChatMsg[];
  /** Whether the chat panel is expanded. */
  chatOpen: boolean;
  /** Messages arrived while the panel was collapsed. */
  chatUnread: number;
}

export interface ChatMsg {
  id: string;
  from: string;
  seatId?: string;
  text: string;
  ts: number;
  /** True when this client sent it — drives right-aligned bubble. */
  self: boolean;
}

/** Keep memory bounded — only the most recent messages are retained. */
const CHAT_MAX = 120;

/** Momonty-only routes. */
export type Route =
  | { name: "home" }
  | { name: "create" }
  | { name: "join" }
  | { name: "lobby" }
  | { name: "play" }
  | { name: "result" }
  | { name: "test" };

const initial: AppState = {
  route: { name: "home" },
  session: { sessionId: getSessionId(), displayName: getDisplayName() },
  connection: "idle",
  chat: [],
  chatOpen: false,
  chatUnread: 0,
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
/**
 * Public setter — used by the test-mode store to mirror its local
 * engine snapshot into the global gameView so the shared overlays
 * (RevolutionOverlay, TaxResultOverlay, HistorySheet …) fire the same
 * way they do against a live room.
 */
export function patchState(patch: Partial<AppState>): void {
  setState(patch);
}

if (typeof window !== "undefined") {
  (window as any).__momontiPatchState = patchState;
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
            (cur.name === "home" || cur.name === "create" || cur.name === "join")
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
    case "chat": {
      // Self detection: match the sender seat to the seat this client owns.
      const mySeat = current.room?.seats.find(
        (s) => s.userId === current.session.userId
      );
      const self = !!m.seatId && m.seatId === mySeat?.seatId;
      const msg: ChatMsg = {
        id: `${m.ts}:${m.seatId ?? m.from}:${current.chat.length}`,
        from: m.from,
        seatId: m.seatId,
        text: m.text,
        ts: m.ts,
        self,
      };
      const chat = [...current.chat, msg].slice(-CHAT_MAX);
      const chatUnread = current.chatOpen
        ? 0
        : self
        ? current.chatUnread
        : current.chatUnread + 1;
      setState({ chat, chatUnread });
      break;
    }
    case "error":
      setState({ error: m.message, toast: { text: m.message, ts: Date.now() } });
      break;
    case "pong":
      break;
  }
}

/* -------------------------- Actions -------------------------- */

export function send(msg: C2S): void {
  // In test mode, phase views' `send({t:"action", action})` calls run
  // through the local reducer instead of the WS transport. We detect
  // this by inspecting the current route — no environment coupling
  // between views and infrastructure.
  if (current.route.name === "test" && msg.t === "action") {
    // Lazily reach into testStore to keep it out of the transport path
    // when not in use.
    import("./testStore").then(({ testDispatch }) => {
      const r = testDispatch(msg.action as any);
      if (!r.ok) setState({ toast: { text: r.error, ts: Date.now() } });
    });
    return;
  }
  getTransport().send(msg);
}

/** Host action — Momonty-only; creates room via HTTP then opens WS. */
export async function createRoomAndJoin(args: {
  roomName?: string;
  isPrivate?: boolean;
  maxPlayers: number;
  config?: unknown;
}): Promise<void> {
  // Flip to connecting IMMEDIATELY so the button gets a spinner overlay
  // instead of a blank pause while the HTTP round-trip runs. Previously
  // the state only changed once the WS opened, which is ~500-1500ms
  // after the tap on the CTA.
  setState({ connection: "connecting", chat: [], chatOpen: false, chatUnread: 0 });
  const t = getTransport();
  t.close();
  try {
    const { code } = await api.newRoom("momonty");
    setState({ toast: { text: `방 코드: ${code}`, ts: Date.now() } });
    t.connect(code, {
      seedMeta: {
        roomName: args.roomName,
        isPrivate: args.isPrivate,
        maxPlayers: args.maxPlayers,
      },
    });
    if (args.config != null) {
      t.send({ t: "setConfig", config: args.config });
    }
  } catch (e) {
    setState({
      connection: "closed",
      toast: { text: "방을 만들지 못했어요. 다시 시도해 주세요.", ts: Date.now() },
    });
    throw e;
  }
}

export async function joinRoomByCode(code: string): Promise<boolean> {
  setState({ connection: "connecting", chat: [], chatOpen: false, chatUnread: 0 });
  const t = getTransport();
  t.close();
  const { name } = await api.lookup(code.toUpperCase()).catch(() => ({ name: null }));
  if (!name) {
    setState({
      connection: "idle",
      toast: { text: "방을 찾을 수 없어요", ts: Date.now() },
    });
    return false;
  }
  t.connect(code.toUpperCase());
  return true;
}

export function leaveRoom(): void {
  const t = getTransport();
  t.send({ t: "leaveRoom" });
  t.close();
  setState({ room: undefined, gameView: undefined, chat: [], chatOpen: false, chatUnread: 0 });
}

/** Attempt to reconnect to the currently-armed room. Used by overlays. */
export function retryConnection(): void {
  const room = current.room;
  const t = getTransport();
  if (room?.code) {
    t.connect(room.code);
  }
}

/* -------------------------- Chat -------------------------- */

export function sendChat(text: string): void {
  const clean = text.replace(/\s+/g, " ").trim().slice(0, 300);
  if (!clean) return;
  getTransport().send({ t: "chat", text: clean });
}

export function openChat(): void {
  setState({ chatOpen: true, chatUnread: 0 });
}
export function closeChat(): void {
  setState({ chatOpen: false });
}
export function toggleChat(): void {
  if (current.chatOpen) closeChat();
  else openChat();
}

export function goto(route: Route): void {
  setState({ route });
}
export function setName(name: string): void {
  setDisplayName(name);
  setState((s) => ({ session: { ...s.session, displayName: name } }));
}
