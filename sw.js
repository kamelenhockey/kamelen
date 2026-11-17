// Kamelen-app: eerst het netwerk (altijd de nieuwste gegevens), bij geen verbinding de laatst bewaarde versie.
const CACHE = "kamelen-v6";
const BASIS = ["./", "index.html", "logo.png", "competitie.json", "liters.json", "opstelling.json", "spelers.json", "doelpunten.csv", "apple-touch-icon.png", "mex.js", "toto.js", "pong.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASIS)).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // Google-sheets en weer: altijd live
  e.respondWith(fetch(e.request).then(r => { const kopie = r.clone(); caches.open(CACHE).then(c => c.put(e.request, kopie)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("index.html"))));
});
