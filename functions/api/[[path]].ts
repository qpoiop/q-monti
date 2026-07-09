const WORKER_ORIGIN = "https://momonti-worker.qpoiop3.workers.dev";

export const onRequest: PagesFunction = async ({ request }) => {
  const url = new URL(request.url);
  const target = new URL(WORKER_ORIGIN);
  target.pathname = url.pathname;
  target.search = url.search;
  const forwarded = new Request(target.toString(), request);
  return fetch(forwarded);
};
