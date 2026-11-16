/* Einfacher Offline-Cache. Bei Änderungen die Version hochzählen, damit Handys neu laden. */
const CACHE = "duftfinder-v5";
const DATEIEN = ["./", "index.html", "style.css", "data.js", "duftbilder.js", "match.js", "app.js", "manifest.json", "feed.json", "impressum.html", "datenschutz.html", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(DATEIEN)));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
/* Netz zuerst, Cache als Rückfall: so siehst du Updates sofort, offline geht es trotzdem. */
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => {
      const kopie = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, kopie));
      return r;
    }).catch(() => caches.match(e.request))
  );
});
