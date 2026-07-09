import { Room } from "./room";
export { Room };

export interface Env {
  ROOM: DurableObjectNamespace;
  DB: D1Database;
  // Comma-separated list of allowed request Origins for API + WS upgrade.
  // Set via `wrangler secret put ALLOWED_ORIGINS` — e.g.
  //   "https://momonti.pages.dev,https://momonti.example.com".
  // Falsy → allow all (development).
  ALLOWED_ORIGINS?: string;
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

function allowedOrigin(req: Request, env: Env): boolean {
  const allow = (env.ALLOWED_ORIGINS ?? "").trim();
  if (!allow) return true; // dev / open
  const origin = req.headers.get("origin") ?? "";
  if (!origin) return false;
  const list = allow.split(",").map((s) => s.trim()).filter(Boolean);
  return list.includes(origin);
}

async function limitByIp(
  env: Env,
  req: Request,
  op: string,
  perMin: number
): Promise<{ ok: boolean; retryInSec: number }> {
  const ip = req.headers.get("cf-connecting-ip") ?? "0.0.0.0";
  const res = await callIndex(env, "POST", "/rl", {
    key: `ip:${ip}|op:${op}`,
    limit: perMin,
    windowSec: 60,
  });
  const j = (await res.json()) as { allowed: boolean; resetInMs: number };
  return { ok: j.allowed, retryInSec: Math.ceil((j.resetInMs ?? 0) / 1000) };
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

    // OPTIONS pre-flight for API endpoints.
    if (req.method === "OPTIONS") {
      const origin = req.headers.get("origin") ?? "*";
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": allowedOrigin(req, env) ? origin : "null",
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "access-control-allow-headers": "content-type",
          "access-control-max-age": "600",
        },
      });
    }

    if (url.pathname === "/api/newRoom" && req.method === "POST") {
      if (!allowedOrigin(req, env)) return json({ error: "origin blocked" }, 403);
      const rl = await limitByIp(env, req, "newRoom", 5); // 5 rooms/min/IP
      if (!rl.ok) return json({ error: "rate limited", retryInSec: rl.retryInSec }, 429);
      const body = (await req.json()) as { gameId?: string };
      const gameId = body.gameId ?? "momonty";
      const res = await callIndex(env, "POST", "/newRoom", { gameId });
      return cors(res);
    }

    if (url.pathname === "/api/lookup" && req.method === "GET") {
      if (!allowedOrigin(req, env)) return json({ error: "origin blocked" }, 403);
      const rl = await limitByIp(env, req, "lookup", 30); // 30 lookups/min/IP
      if (!rl.ok) return json({ error: "rate limited", retryInSec: rl.retryInSec }, 429);
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
      // Origin check for WS: browsers include Origin on upgrade requests.
      if (!allowedOrigin(req, env)) return new Response("origin blocked", { status: 403 });
      const rl = await limitByIp(env, req, "wsUpgrade", 30); // 30 upgrades/min/IP
      if (!rl.ok) return new Response("rate limited", { status: 429 });
      const code = url.searchParams.get("code");
      if (!code) return new Response("missing code", { status: 400 });
      const stub = await resolveRoomStub(env, code);
      if (!stub) return new Response("room not found", { status: 404 });
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
