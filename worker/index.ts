import { Room } from "./room";
export { Room };

export interface Env {
  ROOM: DurableObjectNamespace;
  DB: D1Database;
}

/**
 * Worker fan-out.
 *
 * The Worker's job is thin: mint room codes, resolve code→DO, and forward
 * WebSocket upgrades straight to the room DO. All in-room traffic (join,
 * config, ready, actions, disconnect) is handled by the DO via the
 * hibernating WebSocket API — the Worker does NOT proxy per-message.
 *
 * Pre-room actions (createRoom / lookup) are HTTP so the client can obtain
 * a code before opening the WS.
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

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const cors = (r: Response) => {
      const h = new Headers(r.headers);
      h.set("access-control-allow-origin", "*");
      return new Response(r.body, { status: r.status, headers: h });
    };

    if (url.pathname === "/") return new Response("momonti-worker OK");

    if (url.pathname === "/api/newRoom" && req.method === "POST") {
      const body = (await req.json()) as { gameId?: string };
      const gameId = body.gameId ?? "momonty";
      const res = await callIndex(env, "POST", "/newRoom", { gameId });
      return cors(res);
    }

    if (url.pathname === "/api/lookup" && req.method === "GET") {
      const code = url.searchParams.get("code");
      if (!code) return json({ error: "missing code" }, 400);
      const res = await callIndex(env, "GET", `/lookup?code=${encodeURIComponent(code)}`);
      return cors(res);
    }

    // WebSocket entry — forward straight into the room DO.
    if (url.pathname === "/ws") {
      if (req.headers.get("Upgrade") !== "websocket") {
        return new Response("expected websocket", { status: 400 });
      }
      const code = url.searchParams.get("code");
      if (!code) return new Response("missing code", { status: 400 });
      const stub = await resolveRoomStub(env, code);
      if (!stub) return new Response("room not found", { status: 404 });
      // Forward the upgrade — DO returns a 101 with its own webSocket.
      return stub.fetch(req);
    }

    return new Response("not found", { status: 404 });
  },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });
}
