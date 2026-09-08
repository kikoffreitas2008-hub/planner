// Service worker for the installed PWA (blueprint/05 M5 — "works offline in
// flight mode"). Hand-rolled, no Workbox: the app is small and the caching
// need is simple — keep the shell available with no network.
//
// Strategy:
//   - navigations: network first, fall back to the cached "/" shell. Expo
//     Router then reads the URL and renders the right screen client-side.
//   - same-origin GET (JS bundle, CSS, icons, route HTML): stale-while-
//     revalidate. The JS bundle name is content-hashed, so we cache on first
//     fetch rather than precaching a name we cannot know here.
//   - everything else (Supabase, cross-origin): straight to network.

const CACHE = "planner-shell-v1";
const SHELL = [
  "/",
  "/manifest.json",
  "/favicon-32.png",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase etc. — network only.

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/", { ignoreSearch: true }).then((r) => r || Response.error())),
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    ),
  );
});
