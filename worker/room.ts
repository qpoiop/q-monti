import { getGame } from "@shared/games/registry";
import { makeRng, type Seat } from "@shared/engine";
import type { RoomStatePublic, S2C, SeatPublic } from "@shared/protocol";

/**
 * Durable Object — one instance per room. Also serves the "index" role
 * (code table) when the DO is named `index`.
 *
 * Storage:
 *   - `meta`         : { code, gameId, roomName, isPrivate, maxPlayers, hostUserId }
 *   - `seats`        : SeatPublic[]  (also serves as membership list)
 *   - `sessionMap`   : sessionId -> { userId, seatId }
 *   - `config`       : arbitrary game config
 *   - `gameState`    : engine state (secret info stored here — projected per seat)
 *   - `version`      : monotonic tick used for cache invalidation
 *
 * Presence:
 *   - Each connected session opens a `/subscribe?session=…` stream.
 *   - The DO holds those streams in memory (they don't survive DO eviction —
 *     the Worker will re-open them via reconnect logic).
 */

type IncomingMsg =
  | {
      t: "join";
      sessionId: string;
      userId: string;
      displayName: string;
      asHost?: boolean;
      roomName?: string;
      isPrivate?: boolean;
      maxPlayers?: number;
      gameId?: string;
      code?: string;
    }
  | { t: "leave"; sessionId: string }
  | { t: "disconnect"; sessionId: string }
  | { t: "setConfig"; sessionId: string; config: unknown }
  | { t: "setReady"; sessionId: string; ready: boolean }
  | { t: "startMatch"; sessionId: string }
  | { t: "action"; sessionId: string; action: unknown };

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

// Only the index DO uses this table.
interface IndexTable {
  codeToName: Record<string, string>;
}

const CODE_ALPHABET = "234567890QWERTYUPASDFGHJKLZXCVBNM"; // no easily-confused chars

export class Room {
  private streams = new Map<string, WritableStreamDefaultWriter>(); // sessionId -> writer
  private meta: Meta | null = null;
  private seats: SeatPublic[] = [];
  private sessionMap: Record<string, SessionMapEntry> = {};
  private config: unknown = null;
  private gameState: unknown = null;
  private version = 0;
  private hydrated = false;

  constructor(private readonly state: DurableObjectState, _env: unknown) {}

  private async hydrate(): Promise<void> {
    if (this.hydrated) return;
    const [meta, seats, sessionMap, config, gameState, version] = await Promise.all([
      this.state.storage.get<Meta>("meta"),
      this.state.storage.get<SeatPublic[]>("seats"),
      this.state.storage.get<Record<string, SessionMapEntry>>("sessionMap"),
      this.state.storage.get<unknown>("config"),
      this.state.storage.get<unknown>("gameState"),
      this.state.storage.get<number>("version"),
    ]);
    this.meta = meta ?? null;
    this.seats = seats ?? [];
    this.sessionMap = sessionMap ?? {};
    this.config = config ?? null;
    this.gameState = gameState ?? null;
    this.version = version ?? 0;
    this.hydrated = true;
  }

  private async persist(): Promise<void> {
    await this.state.storage.put({
      meta: this.meta,
      seats: this.seats,
      sessionMap: this.sessionMap,
      config: this.config,
      gameState: this.gameState,
      version: this.version,
    });
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
      // Generate a 6-char code that's not taken.
      let code = "";
      for (let attempt = 0; attempt < 10; attempt++) {
        code = "";
        for (let i = 0; i < 6; i++) {
          code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
        }
        if (!table.codeToName[code]) break;
      }
      const roomName = `room-${code}-${Date.now().toString(36)}`;
      table.codeToName[code] = roomName;
      await this.state.storage.put("index", table);
      // Bootstrap the target room DO's meta by hitting it.
      // We can't do that from here easily; the room DO will fill on first `join`.
      // Store the intended gameId in a separate map keyed by roomName for the
      // room DO to fetch when it hydrates. For simplicity we return both.
      const pendingMap =
        ((await this.state.storage.get<Record<string, { gameId: string; code: string }>>(
          "pendingRooms"
        )) ?? {}) as Record<string, { gameId: string; code: string }>;
      pendingMap[roomName] = { gameId, code };
      await this.state.storage.put("pendingRooms", pendingMap);
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
    if (url.pathname === "/pendingBootstrap") {
      const roomName = url.searchParams.get("name") ?? "";
      const pending =
        ((await this.state.storage.get<Record<string, { gameId: string; code: string }>>(
          "pendingRooms"
        )) ?? {}) as Record<string, { gameId: string; code: string }>;
      const b = pending[roomName];
      if (b) {
        delete pending[roomName];
        await this.state.storage.put("pendingRooms", pending);
      }
      return json(b ?? null);
    }

    /* ============ Room-DO endpoints ============ */
    if (url.pathname === "/msg" && req.method === "POST") {
      const msg = (await req.json()) as IncomingMsg;
      await this.handleMessage(msg);
      return new Response("ok");
    }
    if (url.pathname === "/subscribe") {
      const sessionId = url.searchParams.get("session") ?? "";
      const { readable, writable } = new TransformStream<Uint8Array>();
      const writer = writable.getWriter();
      // Close any existing stream for this session.
      const prev = this.streams.get(sessionId);
      if (prev) {
        try {
          await prev.close();
        } catch {
          /* ignore */
        }
      }
      this.streams.set(sessionId, writer);
      // Send an initial snapshot.
      await this.sendTo(sessionId, this.buildRoomState());
      const view = this.buildGameView(sessionId);
      if (view) await this.sendTo(sessionId, view);
      return new Response(readable, {
        status: 200,
        headers: { "content-type": "application/x-ndjson", "cache-control": "no-cache" },
      });
    }
    return new Response("not found", { status: 404 });
  }

  /* ============ Room logic ============ */

  private async handleMessage(msg: IncomingMsg): Promise<void> {
    if (msg.t === "join") {
      // First host to arrive seeds the room's meta; joiners inherit it.
      if (!this.meta) {
        this.meta = {
          code: msg.code ?? this.state.id.name?.slice(5).split("-")[0] ?? "?",
          gameId: msg.gameId ?? "momonty",
          roomName: msg.roomName ?? "새 방",
          isPrivate: msg.isPrivate ?? true,
          maxPlayers: msg.maxPlayers ?? 6,
          hostUserId: msg.asHost ? msg.userId : "",
        };
      }
      const existing = this.sessionMap[msg.sessionId];
      if (existing) {
        // Reconnection — mark seat online again.
        this.seats = this.seats.map((s) =>
          s.seatId === existing.seatId ? { ...s, online: true } : s
        );
      } else {
        if (this.seats.length >= (this.meta?.maxPlayers ?? 6)) {
          await this.sendTo(msg.sessionId, {
            t: "error",
            message: "방이 가득 찼어요",
            code: "ROOM_FULL",
          });
          return;
        }
        if (msg.asHost && this.seats.length === 0) {
          if (this.meta) {
            this.meta.hostUserId = msg.userId;
            if (msg.roomName != null) this.meta.roomName = msg.roomName;
            if (msg.isPrivate != null) this.meta.isPrivate = msg.isPrivate;
            if (msg.maxPlayers != null) this.meta.maxPlayers = msg.maxPlayers;
            if (msg.gameId != null) this.meta.gameId = msg.gameId;
          }
        }
        const seatId = `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        const seat: SeatPublic = {
          seatId,
          userId: msg.userId,
          displayName: msg.displayName || "게스트",
          ready: false,
          online: true,
          isHost: this.seats.length === 0 || this.meta?.hostUserId === msg.userId,
        };
        this.seats.push(seat);
        this.sessionMap[msg.sessionId] = {
          userId: msg.userId,
          seatId,
          displayName: seat.displayName,
        };
      }
      this.bumpVersion();
      await this.persist();
      await this.broadcastRoomState();
      return;
    }
    if (msg.t === "leave" || msg.t === "disconnect") {
      const entry = this.sessionMap[msg.sessionId];
      if (!entry) return;
      if (msg.t === "leave") {
        this.seats = this.seats.filter((s) => s.seatId !== entry.seatId);
        delete this.sessionMap[msg.sessionId];
      } else {
        // Disconnect — keep the seat, just mark offline for reconnection.
        this.seats = this.seats.map((s) =>
          s.seatId === entry.seatId ? { ...s, online: false } : s
        );
      }
      this.streams.get(msg.sessionId)?.close();
      this.streams.delete(msg.sessionId);
      this.bumpVersion();
      await this.persist();
      await this.broadcastRoomState();
      return;
    }
    if (msg.t === "setConfig") {
      if (!this.isHost(msg.sessionId)) return;
      this.config = msg.config;
      this.bumpVersion();
      await this.persist();
      await this.broadcastRoomState();
      return;
    }
    if (msg.t === "setReady") {
      const entry = this.sessionMap[msg.sessionId];
      if (!entry) return;
      this.seats = this.seats.map((s) =>
        s.seatId === entry.seatId ? { ...s, ready: msg.ready } : s
      );
      this.bumpVersion();
      await this.persist();
      await this.broadcastRoomState();
      return;
    }
    if (msg.t === "startMatch") {
      if (!this.isHost(msg.sessionId)) return;
      if (!this.meta) return;
      const readyCount = this.seats.filter((s) => s.ready || s.isHost).length;
      if (readyCount < this.seats.length) return;
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
      await this.broadcastRoomState();
      await this.broadcastGameView([]);
      return;
    }
    if (msg.t === "action") {
      const entry = this.sessionMap[msg.sessionId];
      if (!entry || !this.meta || !this.gameState) return;
      const game = getGame(this.meta.gameId);
      const seatId = entry.seatId;
      const seed = `${this.meta.code}:${this.version}:${seatId}`;
      const rng = makeRng(seed);
      try {
        const { state, events } = game.reduce({
          state: this.gameState as any,
          seatId,
          action: msg.action as any,
          rng,
        });
        this.gameState = state;
        this.bumpVersion();
        await this.persist();
        await this.broadcastGameView(events);
      } catch (err) {
        await this.sendTo(msg.sessionId, {
          t: "error",
          message: (err as Error).message,
          code: "ACTION_INVALID",
        });
      }
      return;
    }
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

  private async broadcastRoomState(): Promise<void> {
    const msg = this.buildRoomState();
    for (const [sid] of this.streams) {
      await this.sendTo(sid, msg);
    }
  }

  private async broadcastGameView(events: unknown[]): Promise<void> {
    if (!this.gameState || !this.meta) return;
    const game = getGame(this.meta.gameId);
    for (const [sid] of this.streams) {
      const entry = this.sessionMap[sid];
      const view = game.view(this.gameState, entry?.seatId ?? null);
      await this.sendTo(sid, { t: "gameView", view, events, version: this.version });
    }
    // Room state may have changed (phase).
    await this.broadcastRoomState();
  }

  private async sendTo(sessionId: string, msg: unknown): Promise<void> {
    const w = this.streams.get(sessionId);
    if (!w) return;
    try {
      await w.write(new TextEncoder().encode(JSON.stringify(msg) + "\n"));
    } catch {
      this.streams.delete(sessionId);
    }
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
