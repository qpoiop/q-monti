/*
 * Momonti service worker.
 *
 * Strategy:
 *   - Precache the shell (HTML + hashed JS/CSS by URL).
 *   - Runtime cache-first for same-origin static assets.
 *   - Network-first for HTML — always fetch fresh index.html so version
 *     bumps propagate on next load.
 *   - `SKIP_WAITING` message triggers immediate activation for update banner.
 */

const VERSION = "__BUILD_VERSION__";
const CACHE = `momonti-${VERSION}`;

const CORE = ["/", "/index.html", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith("momonti-") && k !== CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.headers.get("upgrade") === "websocket") return;
  if (url.pathname.startsWith("/ws") || url.pathname.startsWith("/api/")) return;

  const isNav = req.mode === "navigate" || req.destination === "document";
  if (isNav) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const c = await caches.open(CACHE);
          c.put("/index.html", res.clone());
          return res;
        } catch {
          const cached = await caches.match("/index.html");
          return cached ?? Response.error();
        }
      })()
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
        }
        return res;
      });
    })
  );
});
