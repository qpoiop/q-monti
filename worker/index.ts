import { Room } from "./room";
export { Room };

export interface Env {
  ROOM: DurableObjectNamespace;
  DB: D1Database;
}

/**
 * Worker fan-out.
 *
 * Every player connects to `/ws?session=…`.
 * We keep a small in-memory (KV would be safer) room-code -> DO-name map on
 * the Worker via a well-known DO called "index" that owns the code table.
 *
 * Alternative would be a KV binding; using an Index DO keeps this repo
 * dependency-free. Add KV later for cheaper reads if needed.
 */

const INDEX_NAME = "index";

async function callIndex(env: Env, method: string, path: string, body?: unknown): Promise<Response> {
  const id = env.ROOM.idFromName(INDEX_NAME);
  const stub = env.ROOM.get(id);
  return stub.fetch(`https://internal${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function resolveRoomStub(env: Env, code: string): Promise<DurableObjectStub | null> {
  const res = await callIndex(env, "GET", `/lookup?code=${encodeURIComponent(code)}`);
  if (!res.ok) return null;
  const { name } = (await res.json()) as { name?: string };
  if (!name) return null;
  const id = env.ROOM.idFromName(name);
  return env.ROOM.get(id);
}

async function newRoom(env: Env, gameId: string): Promise<{ code: string; name: string }> {
  const res = await callIndex(env, "POST", `/newRoom`, { gameId });
  if (!res.ok) throw new Error("index newRoom failed");
  return (await res.json()) as { code: string; name: string };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/") return new Response("momonti-worker OK");

    if (url.pathname === "/api/newRoom" && req.method === "POST") {
      const body = (await req.json()) as { gameId?: string };
      const gameId = body.gameId ?? "momonty";
      const { code } = await newRoom(env, gameId);
      return json({ code });
    }

    if (url.pathname === "/api/lookup" && req.method === "GET") {
      const code = url.searchParams.get("code");
      if (!code) return json({ error: "missing code" }, 400);
      const res = await callIndex(env, "GET", `/lookup?code=${encodeURIComponent(code)}`);
      return new Response(await res.text(), { status: res.status, headers: res.headers });
    }

    // WebSocket entry — clients speak the C2S/S2C protocol.
    if (url.pathname === "/ws") {
      return handleWs(req, env);
    }

    return new Response("not found", { status: 404 });
  },
};

async function handleWs(req: Request, env: Env): Promise<Response> {
  const upgrade = req.headers.get("Upgrade");
  if (upgrade !== "websocket") return new Response("expected websocket", { status: 400 });
  const pair = new WebSocketPair();
  const server = pair[1];
  server.accept();

  // A player's WS lives on the Worker until they join a room. The Worker
  // proxies messages to a chosen DO — a "lobby DO" holds the pre-join state
  // (creating/joining rooms), while a "room DO" holds match state.
  //
  // We use one central index DO to translate `code -> DO id` and one room
  // DO per created room. When a client joins, we tell them we're "attaching"
  // and forward the socket into the room DO by opening a *second* socket to
  // the room DO. To keep this simple, we handle the whole session on the
  // Worker and forward every message via fetch to the appropriate DO —
  // suitable at low scale. A production system would use hibernating WS on
  // the DO directly; see README notes.

  let joinedStub: DurableObjectStub | null = null;
  let sessionId = "";
  let displayName = "";
  let userId = "";

  function sendMsg(msg: unknown) {
    server.send(JSON.stringify(msg));
  }

  server.addEventListener("message", async (ev) => {
    let msg: any;
    try {
      msg = JSON.parse(ev.data as string);
    } catch {
      return;
    }
    switch (msg.t) {
      case "hello": {
        sessionId = msg.sessionId;
        displayName = msg.displayName;
        userId = sessionId; // 1:1 for now; a proper auth layer can override.
        sendMsg({ t: "welcome", sessionId, userId });
        return;
      }
      case "createRoom": {
        const { code, name } = await newRoom(env, msg.gameId);
        const id = env.ROOM.idFromName(name);
        joinedStub = env.ROOM.get(id);
        await forwardToRoom(joinedStub, {
          t: "join",
          sessionId,
          userId,
          displayName,
          asHost: true,
          gameId: msg.gameId,
          roomName: msg.roomName,
          isPrivate: msg.isPrivate,
          maxPlayers: msg.maxPlayers,
          code,
        });
        sendMsg({ t: "roomCreated", code });
        subscribe(joinedStub, sessionId, sendMsg).catch(() => {
          /* stream closed */
        });
        return;
      }
      case "joinRoom": {
        const stub = await resolveRoomStub(env, msg.code);
        if (!stub) {
          sendMsg({ t: "error", message: "방을 찾을 수 없어요", code: "ROOM_NOT_FOUND" });
          return;
        }
        joinedStub = stub;
        await forwardToRoom(stub, { t: "join", sessionId, userId, displayName, asHost: false });
        subscribe(joinedStub, sessionId, sendMsg).catch(() => {});
        return;
      }
      case "leaveRoom": {
        if (joinedStub) await forwardToRoom(joinedStub, { t: "leave", sessionId });
        joinedStub = null;
        return;
      }
      case "ping":
        sendMsg({ t: "pong" });
        return;
      default:
        if (joinedStub) await forwardToRoom(joinedStub, { ...msg, sessionId });
    }
  });

  server.addEventListener("close", async () => {
    if (joinedStub && sessionId) {
      await forwardToRoom(joinedStub, { t: "disconnect", sessionId });
    }
  });

  return new Response(null, { status: 101, webSocket: pair[0] });
}

async function forwardToRoom(stub: DurableObjectStub, payload: any) {
  await stub.fetch("https://internal/msg", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Subscribe to the room's SSE-like stream — the DO exposes /subscribe which
 * returns an open ReadableStream of newline-delimited JSON payloads targeted
 * at this sessionId. This is a simple in-worker fan-out and avoids DO-side
 * hibernating WebSockets (which we keep as a future optimisation).
 */
async function subscribe(
  stub: DurableObjectStub,
  sessionId: string,
  send: (m: unknown) => void
): Promise<void> {
  const res = await stub.fetch(
    `https://internal/subscribe?session=${encodeURIComponent(sessionId)}`
  );
  if (!res.body) return;
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line) continue;
      try {
        send(JSON.parse(line));
      } catch {
        /* skip */
      }
    }
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
