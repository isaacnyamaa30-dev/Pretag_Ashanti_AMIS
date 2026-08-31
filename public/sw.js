/* PRETAG AMIS - minimal service worker.
   Network-first for pages/data (membership data must be fresh), cache-first for
   static assets, and an offline fallback so the shell still opens. */
const CACHE = "pretag-amis-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll([OFFLINE_URL, "/icon-192.png", "/manifest.webmanifest"])),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isAsset = /\.(?:js|css|png|jpg|jpeg|svg|webp|woff2?|ico)$/.test(url.pathname) ||
    url.pathname.startsWith("/_next/static/");

  if (isAsset) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // pages / API: network first, fall back to offline page
  event.respondWith(
    fetch(request).catch(() =>
      request.mode === "navigate" ? caches.match(OFFLINE_URL) : Response.error(),
    ),
  );
});
