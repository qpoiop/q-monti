import { getGame } from "@shared/games/registry";
import { makeRng, type Seat } from "@shared/engine";
import type { C2S, RoomStatePublic, S2C, SeatPublic } from "@shared/protocol";
import { rateLimit } from "./rateLimit";

/**
 * Durable Object — one instance per room. Same class also serves the
 * `index` singleton (code→DO name table).
 *
 * WebSocket ownership:
 *   The Worker forwards the initial `/ws?code=…` upgrade directly to this
 *   DO. We use the hibernating WebSocket API — `state.acceptWebSocket(ws)`
 *   with a session-tagged attachment — so idle rooms free memory but stay
 *   ready to receive.
 *
 * Attachment shape (per WS):
 *   { sessionId: string; userId?: string; seatId?: string }
 *
 * Storage:
 *   meta         : { code, gameId, roomName, isPrivate, maxPlayers, hostUserId }
 *   seats        : SeatPublic[]
 *   sessionMap   : sessionId -> { userId, seatId, displayName }
 *   config       : arbitrary game config
 *   gameState    : engine state
 *   version      : monotonic tick
 */

interface Meta {
  code: string;
  gameId: string;
  roomName: string;
  isPrivate: boolean;
  maxPlayers: number;
  hostUserId: string;
}

interface SessionMapEntry {
  userId: string;
  seatId: string;
  displayName: string;
}

interface IndexTable {
  codeToName: Record<string, string>;
}

interface WsAttachment {
  sessionId: string;
  userId?: string;
  seatId?: string;
}

const CODE_ALPHABET = "234567890QWERTYUPASDFGHJKLZXCVBNM";

/**
 * Room lifecycle knobs.
 *
 *   IDLE_TIMEOUT_MS       — Room self-destructs if `lastActivityMs` has not
 *                           been updated within this window AND the room is
 *                           either empty or all seats are offline.
 *   ALARM_INTERVAL_MS     — Cadence at which we wake to check the above.
 *   PING_DEAD_TIMEOUT_MS  — If a seat has been offline this long, drop the
 *                           seat entirely (freeing its slot).
 */
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ALARM_INTERVAL_MS = 5 * 60 * 1000;
const OFFLINE_DROP_MS = 10 * 60 * 1000;

export class Room {
  private meta: Meta | null = null;
  private seats: SeatPublic[] = [];
  private sessionMap: Record<string, SessionMapEntry> = {};
  private config: unknown = null;
  private gameState: unknown = null;
  private version = 0;
  private hydrated = false;
  private lastActivityMs = 0;
  private seatOfflineSinceMs: Record<string, number> = {};

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: { ROOM: DurableObjectNamespace }
  ) {}

  private async hydrate(): Promise<void> {
    if (this.hydrated) return;
    const [meta, seats, sessionMap, config, gameState, version, activity, offline] =
      await Promise.all([
        this.state.storage.get<Meta>("meta"),
        this.state.storage.get<SeatPublic[]>("seats"),
        this.state.storage.get<Record<string, SessionMapEntry>>("sessionMap"),
        this.state.storage.get<unknown>("config"),
        this.state.storage.get<unknown>("gameState"),
        this.state.storage.get<number>("version"),
        this.state.storage.get<number>("lastActivityMs"),
        this.state.storage.get<Record<string, number>>("seatOfflineSinceMs"),
      ]);
    this.meta = meta ?? null;
    this.seats = seats ?? [];
    this.sessionMap = sessionMap ?? {};
    this.config = config ?? null;
    this.gameState = gameState ?? null;
    this.version = version ?? 0;
    this.lastActivityMs = activity ?? Date.now();
    this.seatOfflineSinceMs = offline ?? {};
    this.hydrated = true;
  }

  private touchActivity(): void {
    this.lastActivityMs = Date.now();
  }

  private async ensureAlarm(): Promise<void> {
    const current = await this.state.storage.getAlarm();
    if (current == null) {
      await this.state.storage.setAlarm(Date.now() + ALARM_INTERVAL_MS);
    }
  }

  private async persist(): Promise<void> {
    await this.state.storage.put({
      meta: this.meta,
      seats: this.seats,
      sessionMap: this.sessionMap,
      config: this.config,
      gameState: this.gameState,
      version: this.version,
      lastActivityMs: this.lastActivityMs,
      seatOfflineSinceMs: this.seatOfflineSinceMs,
    });
    await this.ensureAlarm();
  }

  async fetch(req: Request): Promise<Response> {
    await this.hydrate();
    const url = new URL(req.url);

    /* ============ Index-DO endpoints ============ */
    if (url.pathname === "/newRoom" && req.method === "POST") {
      const { gameId } = (await req.json()) as { gameId: string };
      const table = ((await this.state.storage.get<IndexTable>("index")) ?? {
        codeToName: {},
      }) as IndexTable;
      let code = "";
      for (let attempt = 0; attempt < 10; attempt++) {
        code = "";
        for (let i = 0; i < 6; i++) {
          code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
        }
        if (!table.codeToName[code]) break;
      }
      const roomName = `room-${code}-${gameId}-${Date.now().toString(36)}`;
      table.codeToName[code] = roomName;
      await this.state.storage.put("index", table);
      // Seed the target room by directly opening a bootstrap fetch on it.
      // Alternative would be a pendingRoom table, but explicit is clearer.
      // We can't call other DOs from within a DO without env, so store the
      // gameId in a per-name pending map that the target room fetches on
      // its first join.
      const pending =
        ((await this.state.storage.get<Record<string, { gameId: string; code: string }>>(
          "pendingRooms"
        )) ?? {}) as Record<string, { gameId: string; code: string }>;
      pending[roomName] = { gameId, code };
      await this.state.storage.put("pendingRooms", pending);
      return json({ code, name: roomName });
    }
    if (url.pathname === "/lookup") {
      const code = url.searchParams.get("code");
      const table = ((await this.state.storage.get<IndexTable>("index")) ?? {
        codeToName: {},
      }) as IndexTable;
      const name = code ? table.codeToName[code] : undefined;
      return json({ name: name ?? null });
    }
    if (url.pathname === "/rl" && req.method === "POST") {
      const rule = (await req.json()) as { key: string; limit: number; windowSec: number };
      const decision = await rateLimit(this.state.storage, rule);
      return json(decision);
    }
    if (url.pathname === "/unlink" && req.method === "POST") {
      const { code } = (await req.json()) as { code: string };
      const table = ((await this.state.storage.get<IndexTable>("index")) ?? {
        codeToName: {},
      }) as IndexTable;
      if (table.codeToName[code]) {
        delete table.codeToName[code];
        await this.state.storage.put("index", table);
      }
      return json({ ok: true });
    }

    /* ============ Room WS upgrade ============ */
    if (url.pathname === "/ws") {
      if (req.headers.get("Upgrade") !== "websocket") {
        return new Response("expected websocket", { status: 400 });
      }
      const sessionId = url.searchParams.get("session") ?? "";
      if (!sessionId) return new Response("missing session", { status: 400 });
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      // Hibernating accept — DO can hibernate; messages are delivered as
      // `webSocketMessage` events even after the isolate wakes.
      this.state.acceptWebSocket(server, [sessionId]);
      const attach: WsAttachment = { sessionId };
      server.serializeAttachment(attach);
      // Kick off welcome + snapshot.
      this.sendTo(server, { t: "welcome", sessionId, userId: sessionId });
      this.sendTo(server, this.buildRoomState());
      const v = this.buildGameView(sessionId);
      if (v) this.sendTo(server, v);
      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response("not found", { status: 404 });
  }

  /* ============ Hibernating WebSocket handlers ============ */

  async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer): Promise<void> {
    await this.hydrate();
    this.touchActivity();
    if (typeof data !== "string") return;
    let msg: C2S;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    const attach = (ws.deserializeAttachment() ?? {}) as WsAttachment;
    await this.handleClientMessage(ws, attach, msg);
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.hydrate();
    const attach = (ws.deserializeAttachment() ?? {}) as WsAttachment;
    const entry = attach.sessionId ? this.sessionMap[attach.sessionId] : undefined;
    if (entry) {
      this.seats = this.seats.map((s) =>
        s.seatId === entry.seatId ? { ...s, online: false } : s
      );
      this.seatOfflineSinceMs[entry.seatId] = Date.now();
      this.bumpVersion();
      this.touchActivity();
      await this.persist();
      this.broadcastRoomState();
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }

  /**
   * Scheduled cleanup — runs every ALARM_INTERVAL_MS while the room exists.
   *
   *   1. Any seat offline > OFFLINE_DROP_MS is dropped entirely.
   *   2. If the room is idle > IDLE_TIMEOUT_MS AND (empty OR all offline)
   *      then the room is destroyed: all storage deleted, index unlinked,
   *      remaining WSs closed. The alarm is not re-armed.
   *   3. Otherwise re-arm the alarm for the next interval.
   */
  async alarm(): Promise<void> {
    await this.hydrate();
    const now = Date.now();

    // 1) Drop long-offline seats.
    const initialCount = this.seats.length;
    this.seats = this.seats.filter((s) => {
      const since = this.seatOfflineSinceMs[s.seatId];
      if (!s.online && since && now - since > OFFLINE_DROP_MS) {
        // Also purge session mappings pointing at this seat.
        for (const [sid, entry] of Object.entries(this.sessionMap)) {
          if (entry.seatId === s.seatId) delete this.sessionMap[sid];
        }
        delete this.seatOfflineSinceMs[s.seatId];
        return false;
      }
      return true;
    });
    if (this.seats.length !== initialCount) {
      this.bumpVersion();
      this.broadcastRoomState();
    }

    // 2) Destroy idle+empty rooms.
    const anyOnline = this.seats.some((s) => s.online);
    const idleFor = now - this.lastActivityMs;
    if (this.seats.length === 0 || (!anyOnline && idleFor > IDLE_TIMEOUT_MS)) {
      // Close remaining WSs, unlink from index, wipe storage.
      for (const ws of this.state.getWebSockets()) {
        try {
          ws.close(1000, "room expired");
        } catch {
          /* ignore */
        }
      }
      if (this.meta?.code) {
        try {
          const idxStub = this.env.ROOM.get(this.env.ROOM.idFromName("index"));
          await idxStub.fetch("https://internal/unlink", {
            method: "POST",
            body: JSON.stringify({ code: this.meta.code }),
          });
        } catch {
          /* best-effort */
        }
      }
      await this.state.storage.deleteAll();
      return; // Do not re-arm.
    }

    // 3) Re-arm.
    await this.persist();
  }

  /* ============ Message routing ============ */

  private async handleClientMessage(
    ws: WebSocket,
    attach: WsAttachment,
    msg: C2S
  ): Promise<void> {
    switch (msg.t) {
      case "hello": {
        // Bootstrap meta from DO name on first hello.
        await this.ensureBootstrap();
        this.touchActivity();
        const userId = msg.sessionId; // 1:1 map for now
        // Host seeds room-level meta on first connect.
        const willBeHost = this.seats.length === 0 && this.meta && !this.meta.hostUserId;
        if (willBeHost && this.meta && msg.seedMeta) {
          if (msg.seedMeta.roomName != null) this.meta.roomName = msg.seedMeta.roomName;
          if (msg.seedMeta.isPrivate != null) this.meta.isPrivate = msg.seedMeta.isPrivate;
          if (msg.seedMeta.maxPlayers != null) this.meta.maxPlayers = msg.seedMeta.maxPlayers;
        }
        const existing = this.sessionMap[msg.sessionId];
        if (existing) {
          this.seats = this.seats.map((s) =>
            s.seatId === existing.seatId ? { ...s, online: true } : s
          );
          delete this.seatOfflineSinceMs[existing.seatId];
          attach.userId = existing.userId;
          attach.seatId = existing.seatId;
          ws.serializeAttachment(attach);
        } else {
          const isFirst = this.seats.length === 0;
          if (!this.meta) return;
          if (this.seats.length >= this.meta.maxPlayers) {
            this.sendTo(ws, { t: "error", message: "방이 가득 찼어요", code: "ROOM_FULL" });
            return;
          }
          const seatId = `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
          const seat: SeatPublic = {
            seatId,
            userId,
            displayName: msg.displayName || "게스트",
            ready: false,
            online: true,
            isHost: isFirst,
          };
          this.seats.push(seat);
          this.sessionMap[msg.sessionId] = {
            userId,
            seatId,
            displayName: seat.displayName,
          };
          if (isFirst) {
            this.meta.hostUserId = userId;
          }
          attach.userId = userId;
          attach.seatId = seatId;
          ws.serializeAttachment(attach);
        }
        this.bumpVersion();
        await this.persist();
        this.broadcastRoomState();
        const v = this.buildGameView(msg.sessionId);
        if (v) this.sendTo(ws, v);
        return;
      }
      case "leaveRoom": {
        const entry = this.sessionMap[attach.sessionId];
        if (!entry) return;
        this.seats = this.seats.filter((s) => s.seatId !== entry.seatId);
        delete this.sessionMap[attach.sessionId];
        this.bumpVersion();
        await this.persist();
        this.broadcastRoomState();
        try {
          ws.close(1000, "left");
        } catch {
          /* ignore */
        }
        return;
      }
      case "setConfig": {
        if (!this.isHost(attach.sessionId)) return;
        this.config = msg.config;
        this.bumpVersion();
        await this.persist();
        this.broadcastRoomState();
        return;
      }
      case "setReady": {
        const entry = this.sessionMap[attach.sessionId];
        if (!entry) return;
        this.seats = this.seats.map((s) =>
          s.seatId === entry.seatId ? { ...s, ready: msg.ready } : s
        );
        this.bumpVersion();
        await this.persist();
        this.broadcastRoomState();
        return;
      }
      case "startMatch": {
        if (!this.isHost(attach.sessionId) || !this.meta) return;
        const ready = this.seats.every((s) => s.ready || s.isHost);
        if (!ready) return;
        const game = getGame(this.meta.gameId);
        const cfg = this.config ?? game.defaultConfig();
        this.config = cfg;
        const seats: Seat[] = this.seats.map((s) => ({
          seatId: s.seatId,
          userId: s.userId,
          displayName: s.displayName,
          ready: true,
          online: s.online,
          isHost: s.isHost,
        }));
        const seed = `${this.meta.code}:${Date.now()}`;
        const rng = makeRng(seed);
        this.gameState = game.init({ seats, config: cfg as any, rng });
        this.bumpVersion();
        await this.persist();
        this.broadcastRoomState();
        this.broadcastGameView([]);
        return;
      }
      case "action": {
        const entry = this.sessionMap[attach.sessionId];
        if (!entry || !this.meta || !this.gameState) return;
        const game = getGame(this.meta.gameId);
        const seed = `${this.meta.code}:${this.version}:${entry.seatId}`;
        const rng = makeRng(seed);
        try {
          const { state, events } = game.reduce({
            state: this.gameState as any,
            seatId: entry.seatId,
            action: msg.action as any,
            rng,
          });
          this.gameState = state;
          this.bumpVersion();
          await this.persist();
          this.broadcastGameView(events);
        } catch (err) {
          this.sendTo(ws, {
            t: "error",
            message: (err as Error).message,
            code: "ACTION_INVALID",
          });
        }
        return;
      }
      case "ping":
        this.touchActivity();
        this.sendTo(ws, { t: "pong" });
        return;
    }
  }

  /* ============ Helpers ============ */

  private async ensureBootstrap(): Promise<void> {
    if (this.meta) return;
    const name = this.state.id.name;
    if (!name) return;
    // Reach index DO through storage — not possible cross-DO without env.
    // Instead, callers write to `pendingRooms` at code creation time; here
    // we fetch our own row and remove it.
    // Since we can't reach another DO's storage from this DO, this DO IS
    // the index DO only when its name is "index". Room DOs never have meta
    // via pending. So we handle meta bootstrap differently:
    //   - room DO's name is `room-<CODE>-<TS>`; extract CODE
    //   - gameId defaults to "momonty" but is overwritten on first `hello`
    //     via a follow-up broadcast that carries the desired game id — no,
    //     simpler: store meta with defaults and rely on the client-supplied
    //     `hello` (which cannot carry gameId in current protocol). So we
    //     read the code and set gameId="momonty" default; the host UI does
    //     not currently allow changing gameId after room creation.
    // Name format: room-<CODE>-<GAMEID>-<TS>
    const parts = name.startsWith("room-") ? name.slice(5).split("-") : ["?"];
    this.meta = {
      code: parts[0] ?? "?",
      gameId: parts[1] ?? "momonty",
      roomName: "새 방",
      isPrivate: true,
      maxPlayers: 6,
      hostUserId: "",
    };
    await this.persist();
  }

  private bumpVersion(): void {
    this.version += 1;
  }

  private isHost(sessionId: string): boolean {
    const entry = this.sessionMap[sessionId];
    if (!entry || !this.meta) return false;
    return entry.userId === this.meta.hostUserId;
  }

  private buildRoomState(): S2C {
    const meta = this.meta;
    if (!meta) {
      return {
        t: "roomState",
        room: {
          code: "?",
          gameId: "momonty",
          phase: "lobby",
          roomName: "",
          isPrivate: false,
          maxPlayers: 0,
          seats: [],
          config: null,
          hostUserId: "",
        },
      };
    }
    const phase = this.gameState
      ? (this.gameState as any)?.phase === "MATCH_END"
        ? "ended"
        : "playing"
      : "lobby";
    const room: RoomStatePublic = {
      code: meta.code,
      gameId: meta.gameId,
      phase,
      roomName: meta.roomName,
      isPrivate: meta.isPrivate,
      maxPlayers: meta.maxPlayers,
      seats: this.seats,
      config: this.config,
      hostUserId: meta.hostUserId,
    };
    return { t: "roomState", room };
  }

  private buildGameView(sessionId: string): S2C | null {
    if (!this.gameState || !this.meta) return null;
    const entry = this.sessionMap[sessionId];
    const game = getGame(this.meta.gameId);
    const view = game.view(this.gameState, entry?.seatId ?? null);
    return { t: "gameView", view, events: [], version: this.version };
  }

  private broadcastRoomState(): void {
    const msg = this.buildRoomState();
    for (const ws of this.state.getWebSockets()) {
      this.sendTo(ws, msg);
    }
  }

  private broadcastGameView(events: unknown[]): void {
    if (!this.gameState || !this.meta) return;
    const game = getGame(this.meta.gameId);
    for (const ws of this.state.getWebSockets()) {
      const attach = (ws.deserializeAttachment() ?? {}) as WsAttachment;
      const entry = attach.sessionId ? this.sessionMap[attach.sessionId] : undefined;
      const view = game.view(this.gameState, entry?.seatId ?? null);
      this.sendTo(ws, { t: "gameView", view, events, version: this.version });
    }
    this.broadcastRoomState();
  }

  private sendTo(ws: WebSocket, msg: unknown): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      /* peer disconnected — ignore */
    }
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
