// Kamelen-app: eerst het netwerk (altijd de nieuwste gegevens), bij geen verbinding de laatst bewaarde versie.
const CACHE = "kamelen-v46";
const BASIS = ["./", "index.html", "logo.png", "competitie.json", "liters.json", "opstelling.json", "spelers.json", "doelpunten.csv", "apple-touch-icon.png", "mex.js", "toto.js", "pong.js", "stemmen.js", "statistieken.js", "push.js", "fotos.js", "quotes.js", "rad.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASIS)).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // Google-sheets en weer: altijd live
  e.respondWith(fetch(e.request, { cache: "no-cache" }).then(r => { const kopie = r.clone(); caches.open(CACHE).then(c => c.put(e.request, kopie)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("index.html"))));
});

/* Pushmeldingen */
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { title: "Kamelen", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Kamelen", {
    body: d.body || "", icon: "apple-touch-icon.png", badge: "apple-touch-icon.png", tag: d.tag || undefined, data: { url: d.url || "./" }
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL((e.notification.data || {}).url || "./", self.registration.scope).href;
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(lijst => {
    const open = lijst.find(c => c.url.startsWith(self.registration.scope));
    if (open) { open.navigate(url).catch(() => {}); return open.focus(); }
    return clients.openWindow(url);
  }));
});
