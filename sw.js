// Kamelen-app: eerst het netwerk (altijd de nieuwste gegevens), bij geen verbinding de laatst bewaarde versie.
const CACHE = "kamelen-v202";
const BASIS = ["./", "index.html", "logo.png", "competitie.json", "liters.json", "opstelling.json", "spelers.json", "doelpunten.csv", "apple-touch-icon.png", "mex.js", "toto.js", "pong.js", "stemmen.js", "coach.js", "statistieken.js", "push.js", "fotos.js", "quotes.js", "rad.js", "race.js", "halloffame.json", "wrapped.js", "ideeen.js", "design-proef.js", "seizoen.js", "zege.js", "karavaan.js", "pongregels.js", "beerpong.js",
  "fonts/DMSans.woff", "fonts/DMSans-Italic.woff", "fonts/DMSerifDisplay-Regular.woff", "fonts/DMSerifDisplay-Italic.woff"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASIS.map(u => new Request(u, { cache: "reload" })))).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n))))); self.clients.claim(); });
/* Snel openen:
   - de app zelf (pagina, scripts, lettertypes, plaatjes): meteen uit het geheugen, op de achtergrond vernieuwd;
   - gegevens (json/csv): eerst internet, maar na 3 seconden zonder antwoord de laatst bewaarde versie. */
const bewaar = (req, r) => { if (r && r.ok && r.type !== "opaque") { const k = r.clone(); caches.open(CACHE).then(c => c.put(req, k)); } return r; };
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return; // Google-sheets en weer: altijd live
  const pagina = req.mode === "navigate";
  if (/\.(json|csv)$/.test(url.pathname)) {
    e.respondWith(new Promise(klaar => {
      let klaarGezet = false; const uit = r => { if (!klaarGezet && r) { klaarGezet = true; klaar(r); } };
      const net = fetch(req, { cache: "no-store" }).then(r => bewaar(req, r));
      net.then(uit).catch(() => caches.match(req, { ignoreSearch: true }).then(r => uit(r || Response.error())));
      setTimeout(() => caches.match(req, { ignoreSearch: true }).then(uit), 3000);
    }));
    return;
  }
  e.respondWith(caches.match(pagina ? "index.html" : req, { ignoreSearch: pagina }).then(oud => {
    const nieuw = fetch(req, { cache: "no-cache" }).then(r => bewaar(pagina ? "index.html" : req, r)).catch(() => null);
    if (oud) { e.waitUntil(nieuw); return oud; }
    return nieuw.then(r => r || caches.match("index.html"));
  }));
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
