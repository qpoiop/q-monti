// Pages Function: same-origin proxy for /ws → the momonti-worker service.
// Cloudflare Pages Functions forward WebSocket upgrades transparently as long
// as we don't buffer the body — pass the request headers through and return
// the Worker's Response directly.

const WORKER_ORIGIN = "https://momonti-worker.qpoiop3.workers.dev";

export const onRequest: PagesFunction = async ({ request }) => {
  const url = new URL(request.url);
  const target = new URL(WORKER_ORIGIN);
  target.pathname = url.pathname;
  target.search = url.search;
  const forwarded = new Request(target.toString(), request);
  return fetch(forwarded);
};
