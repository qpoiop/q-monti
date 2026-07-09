import type { C2S, S2C } from "@shared/protocol";

/**
 * Lightweight WS transport.
 *
 * Contract:
 *   - Single durable connection to `/ws?session=…`.
 *   - Automatic reconnect with backoff (1s, 2s, 4s, capped at 8s).
 *   - Session ID persisted in localStorage so re-connects rejoin the same
 *     player identity — the DO uses `sessionId` as the user key.
 *   - Consumers subscribe via `onMessage`.
 *
 * The transport is state-agnostic. Higher-level `store` reduces S2C into UI
 * state. This keeps the transport reusable across games.
 */

export type Listener = (msg: S2C) => void;
export type StatusListener = (s: TransportStatus) => void;

export type TransportStatus =
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

export class Transport {
  private ws: WebSocket | null = null;
  private msgListeners: Listener[] = [];
  private statusListeners: StatusListener[] = [];
  private reconnectAttempt = 0;
  private closedByUser = false;
  private pending: C2S[] = [];
  private lastStatus: TransportStatus = { kind: "connecting" };

  constructor(private readonly wsUrl: string) {}

  connect(): void {
    this.closedByUser = false;
    this.open();
  }

  close(): void {
    this.closedByUser = true;
    this.ws?.close();
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
    this.setStatus(
      this.reconnectAttempt === 0
        ? { kind: "connecting" }
        : { kind: "reconnecting", attempt: this.reconnectAttempt }
    );
    const ws = new WebSocket(this.wsUrl);
    this.ws = ws;
    ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.setStatus({ kind: "connected" });
      // Say hello first.
      const hello: C2S = {
        t: "hello",
        sessionId: getSessionId(),
        displayName: getDisplayName(),
      };
      ws.send(JSON.stringify(hello));
      // Flush queue.
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
      if (this.closedByUser) return;
      this.reconnectAttempt = Math.min(this.reconnectAttempt + 1, 5);
      const delay = Math.min(1000 * 2 ** (this.reconnectAttempt - 1), 8000);
      setTimeout(() => this.open(), delay);
    };
    ws.onerror = () => {
      /* onclose handles reconnect */
    };
  }
}

export function buildWsUrl(): string {
  const override = import.meta.env.VITE_WS_URL as string | undefined;
  if (override) {
    const sep = override.includes("?") ? "&" : "?";
    return `${override}${sep}session=${encodeURIComponent(getSessionId())}`;
  }
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}/ws?session=${encodeURIComponent(getSessionId())}`;
}
