/**
 * Wire protocol. Every WS message carries `t` (type) and, for requests, `id`.
 * Server responses echo the `id`. Broadcasts have no `id`.
 *
 * Kept intentionally small & typed so client/server can't drift.
 */

/* ============ Client -> Server ============ */

export type C2S =
  | {
      t: "hello";
      sessionId: string;
      displayName: string;
      // Only meaningful when the caller is the room host on first connect —
      // seeds the room DO's meta. Ignored on later hellos and for joiners.
      seedMeta?: { roomName?: string; isPrivate?: boolean; maxPlayers?: number };
    }
  | { t: "leaveRoom" }
  | { t: "setConfig"; config: unknown }
  | { t: "setReady"; ready: boolean }
  | { t: "startMatch" }
  | { t: "action"; action: unknown }
  | { t: "chat"; text: string }
  | { t: "ping" };

/* ============ Server -> Client ============ */

export type S2C =
  | { t: "welcome"; sessionId: string; userId: string }
  | { t: "roomCreated"; code: string }
  | { t: "roomState"; room: RoomStatePublic }
  | { t: "gameView"; view: unknown; events: unknown[]; version: number }
  | { t: "chat"; from: string; seatId?: string; text: string; ts: number }
  | { t: "error"; message: string; code?: string }
  | { t: "pong" };

/* ============ Types ============ */

export interface SeatPublic {
  seatId: string;
  userId: string;
  displayName: string;
  ready: boolean;
  online: boolean;
  isHost: boolean;
}

export type RoomPhase = "lobby" | "playing" | "ended";

export interface RoomStatePublic {
  code: string;
  gameId: string;
  phase: RoomPhase;
  roomName: string;
  isPrivate: boolean;
  maxPlayers: number;
  seats: SeatPublic[];
  config: unknown;
  hostUserId: string;
}
