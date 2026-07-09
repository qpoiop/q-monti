import type { C2S, S2C } from "@shared/protocol";

/**
 * Room-scoped WebSocket transport.
 *
 * Contract:
 *   - No connection until we know a room code. `connect(code)` opens the WS
 *     directly to that room's Durable Object via `/ws?code=…&session=…`.
 *   - Automatic reconnect with backoff (1s, 2s, 4s, capped at 8s) while a
 *     code is still armed. `close()` clears the code and stops reconnects.
 *   - Session ID persisted in localStorage so re-connects rejoin the same
 *     seat — the DO uses `sessionId` as the user identity key.
 *
 * Pre-room actions (createRoom / lookupRoom) are HTTP JSON endpoints on the
 * worker — see `api.newRoom` and `api.lookup`.
 */

export type Listener = (msg: S2C) => void;
export type StatusListener = (s: TransportStatus) => void;

export type TransportStatus =
  | { kind: "idle" }
  | { kind: "connecting" }
  | { kind: "connected" }
  | { kind: "reconnecting"; attempt: number }
  | { kind: "closed"; reason?: string };

const KEY_SESSION = "momonti.sessionId";
const KEY_NAME = "momonti.displayName";

function genSessionId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function getSessionId(): string {
  let sid = localStorage.getItem(KEY_SESSION);
  if (!sid) {
    sid = genSessionId();
    localStorage.setItem(KEY_SESSION, sid);
  }
  return sid;
}
export function getDisplayName(fallback = "게스트"): string {
  return localStorage.getItem(KEY_NAME) || fallback;
}
export function setDisplayName(name: string): void {
  localStorage.setItem(KEY_NAME, name);
}

interface HelloOpts {
  seedMeta?: { roomName?: string; isPrivate?: boolean; maxPlayers?: number };
}

export class Transport {
  private ws: WebSocket | null = null;
  private msgListeners: Listener[] = [];
  private statusListeners: StatusListener[] = [];
  private reconnectAttempt = 0;
  private armedCode: string | null = null;
  private pendingHello: HelloOpts = {};
  private pending: C2S[] = [];
  private lastStatus: TransportStatus = { kind: "idle" };

  connect(code: string, helloOpts: HelloOpts = {}): void {
    this.armedCode = code;
    this.pendingHello = helloOpts;
    this.reconnectAttempt = 0;
    this.open();
  }

  close(): void {
    this.armedCode = null;
    this.pending = [];
    try {
      this.ws?.close();
    } catch {
      /* ignore */
    }
    this.setStatus({ kind: "idle" });
  }

  send(msg: C2S): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      this.pending.push(msg);
    }
  }

  onMessage(l: Listener): () => void {
    this.msgListeners.push(l);
    return () => {
      this.msgListeners = this.msgListeners.filter((x) => x !== l);
    };
  }
  onStatus(l: StatusListener): () => void {
    l(this.lastStatus);
    this.statusListeners.push(l);
    return () => {
      this.statusListeners = this.statusListeners.filter((x) => x !== l);
    };
  }

  private setStatus(s: TransportStatus): void {
    this.lastStatus = s;
    for (const l of this.statusListeners) l(s);
  }

  private open(): void {
    if (!this.armedCode) return;
    this.setStatus(
      this.reconnectAttempt === 0
        ? { kind: "connecting" }
        : { kind: "reconnecting", attempt: this.reconnectAttempt }
    );
    const ws = new WebSocket(buildWsUrl(this.armedCode));
    this.ws = ws;
    ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.setStatus({ kind: "connected" });
      const hello: C2S = {
        t: "hello",
        sessionId: getSessionId(),
        displayName: getDisplayName(),
        seedMeta: this.pendingHello.seedMeta,
      };
      ws.send(JSON.stringify(hello));
      this.pendingHello = {};
      for (const q of this.pending) ws.send(JSON.stringify(q));
      this.pending = [];
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as S2C;
        for (const l of this.msgListeners) l(msg);
      } catch {
        /* ignore */
      }
    };
    ws.onclose = (ev) => {
      this.setStatus({ kind: "closed", reason: ev.reason });
      if (!this.armedCode) return;
      this.reconnectAttempt = Math.min(this.reconnectAttempt + 1, 5);
      const delay = Math.min(1000 * 2 ** (this.reconnectAttempt - 1), 8000);
      setTimeout(() => this.open(), delay);
    };
    ws.onerror = () => {
      /* onclose handles reconnect */
    };
  }
}

function apiOrigin(): string {
  return (import.meta.env.VITE_API_ORIGIN as string) || "";
}

export function buildWsUrl(code: string): string {
  const override = import.meta.env.VITE_WS_URL as string | undefined;
  if (override) {
    return `${override}${override.includes("?") ? "&" : "?"}code=${encodeURIComponent(code)}&session=${encodeURIComponent(getSessionId())}`;
  }
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const host = apiOrigin() ? new URL(apiOrigin()).host : location.host;
  return `${proto}//${host}/ws?code=${encodeURIComponent(code)}&session=${encodeURIComponent(getSessionId())}`;
}

/** HTTP helpers for pre-room actions. */
export const api = {
  async newRoom(gameId: string): Promise<{ code: string }> {
    const res = await fetch(`${apiOrigin()}/api/newRoom`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gameId }),
    });
    if (!res.ok) throw new Error(`newRoom ${res.status}`);
    return res.json();
  },
  async lookup(code: string): Promise<{ name: string | null }> {
    const res = await fetch(`${apiOrigin()}/api/lookup?code=${encodeURIComponent(code)}`);
    if (!res.ok) throw new Error(`lookup ${res.status}`);
    return res.json();
  },
};
