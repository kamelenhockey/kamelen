// Pushmeldingen voor de Kamelen-app.
// Draait elk kwartier via GitHub Actions. Kijkt wat er te melden valt en stuurt het naar alle telefoons
// die meldingen hebben aangezet. Wat al verstuurd is, staat in meldingen-status.json (geen dubbele meldingen).
import fs from "node:fs";
import webpush from "web-push";

const API = "https://script.google.com/macros/s/AKfycbw2n1uosUM9ctU2TH1PO-psv6CtgT_QBpxZVHY9IZgDeubBEMf3LSbv1IiDxAXxD9Bt/exec";
const VAPID_PUBLIEK = "BCK-agIGdX3s3--RJJ7UYgdxtKS1hKiz1BxITrQxprx9gggsXMjHBZEG0LKnE9WIQjUCIOEFrCgi88TCqyL9HsQ";
const SITE = "https://kamelenhockey.github.io/kamelen/";
const STATUS = "meldingen-status.json";

const geheim = JSON.parse(process.env.KAMELEN_PUSH || "{}");
if (!geheim.vapidPrivate || !geheim.pushcode) { console.log("Geheim KAMELEN_PUSH ontbreekt; niets te doen."); process.exit(0); }
webpush.setVapidDetails("https://github.com/kamelenhockey/kamelen", VAPID_PUBLIEK, geheim.vapidPrivate);

const lees = (f, d) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } };
const comp = lees("competitie.json", {}), roster = lees("spelers.json", {}), opstelling = lees("opstelling.json", {});
const eersteKeer = !fs.existsSync(STATUS);
const status = lees(STATUS, { verzonden: {} });

const isUs = t => /kamel|gchc h13/i.test(t || "");
const tegen = m => isUs(m.thuis) ? m.uit : m.thuis;
const sleutel = m => `${m.datum}|${m.thuis}|${m.uit}`;

/* Tijd in Nederland */
function nlDelen(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Amsterdam", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .formatToParts(d).map(x => [x.type, x.value]));
  return { datum: `${p.year}-${p.month}-${p.day}`, uur: +p.hour, min: +p.minute };
}
function aftrap(m) { // Date (UTC) van de aftrap
  const [y, mo, d] = m.datum.split("-").map(Number), [h, mi] = (m.tijd || "12:00").split(":").map(Number);
  let gok = Date.UTC(y, mo - 1, d, h, mi);
  for (let i = 0; i < 2; i++) { const n = nlDelen(new Date(gok)); const [ny, nm, nd] = n.datum.split("-").map(Number); gok += Date.UTC(y, mo - 1, d, h, mi) - Date.UTC(ny, nm - 1, nd, n.uur, n.min); }
  return new Date(gok);
}
const plusDagen = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const nu = new Date(), nl = nlDelen(nu), uur = 3600e3;
const ons = [...(comp.uitslagen || []), ...(comp.programma || [])].filter(m => isUs(m.thuis + m.uit));
const programma = (comp.programma || []).filter(m => isUs(m.thuis + m.uit));
const uitslagen = (comp.uitslagen || []).filter(m => isUs(m.thuis + m.uit));

const te = [];   // { id, title, body, url }
const meld = (id, title, body, url = SITE) => { if (!status.verzonden[id]) te.push({ id, title, body, url }); };

/* 1. Avond voor de wedstrijd (vanaf 19:00) */
for (const m of programma) {
  if (m.datum === plusDagen(nl.datum, 1) && nl.uur >= 19) {
    meld(`voor-${m.datum}`, `Morgen: ${isUs(m.thuis) ? "thuis" : "uit"} tegen ${tegen(m)}`,
      `${m.tijd ? `Aftrap ${m.tijd}` : "Tijd nog niet bekend"}${m.veld ? ` · ${m.veld}` : ""}${m.accommodatie ? ` (${m.accommodatie})` : ""}. Op tijd naar bed! 🐪`, SITE + "#home");
  }
}
/* 2. Selectie bekend voor de eerstvolgende wedstrijd */
const volgende = programma.find(m => aftrap(m) > nu);
if (volgende && opstelling.wedstrijd === volgende.datum && (opstelling.spelers || []).length && aftrap(volgende) - nu < 4 * 24 * uur)
  meld(`selectie-${volgende.datum}`, "De selectie is bekend", `${opstelling.spelers.length} Kamelen tegen ${tegen(volgende)}. Kijk of je erbij zit!`, SITE + "#home");
/* 3. Uitslag binnen */
for (const m of uitslagen) {
  if (nu - aftrap(m) > 3 * 24 * uur || !m.score) continue;
  const [a, b] = m.score.split("-").map(Number), v = isUs(m.thuis) ? a : b, t = isUs(m.thuis) ? b : a;
  const titel = v > t ? `Gewonnen! ${v}-${t} tegen ${tegen(m)} 🎉` : v < t ? `Verloren: ${v}-${t} tegen ${tegen(m)}` : `Gelijkgespeeld: ${v}-${t} tegen ${tegen(m)}`;
  meld(`uitslag-${m.datum}`, titel, "Bekijk de nieuwe stand en vergeet niet te stemmen op de kameel en ezel van de dag.", SITE + "#stand");
}
/* 4. Stemmen open (75 minuten na de aftrap, tot een dag later) */
for (const m of ons) {
  if (m.datum < "2026-11-17") continue;
  const open = aftrap(m).getTime() + 75 * 60e3;
  if (nu >= open && nu - open < 24 * uur) meld(`stem-${m.datum}`, "Stemmen is open 🐪🫏", `Wie was de kameel en wie de ezel van de dag tegen ${tegen(m)}?`, SITE + "#stemmen");
}
/* 5. Uitslag kameel en ezel (zodra de beheerder de stemming sluit) */
let api = {};
try { api = await fetch(API).then(r => r.json()); } catch (e) { console.log("API niet bereikbaar", e.message); }
for (const k of api.gesloten || []) {
  const m = ons.find(x => sleutel(x) === k); if (!m || nu - aftrap(m) > 7 * 24 * uur) continue;
  const laatste = new Map();
  (api.stemmen || []).filter(s => s.wedstrijd === k).forEach(s => laatste.set(String(s.stemmer).toLowerCase(), s));
  const tel = veld => { const c = new Map(); [...laatste.values()].forEach(s => s[veld] && c.set(s[veld], (c.get(s[veld]) || 0) + 1)); const max = Math.max(0, ...c.values()); return [...c].filter(([, n]) => n === max && max).map(([n]) => n); };
  const kamelen = tel("kameel"), ezels = tel("ezel");
  if (kamelen.length || ezels.length)
    meld(`kz-${m.datum}`, `Kameel van de dag: ${kamelen.join(" & ") || "–"} 🐪`, `Ezel van de dag: ${ezels.join(" & ") || "–"}. Die trekt een liter! 🫏`, SITE + "#stemmen");
}
/* 7. Toto-herinnering: 3 uur voor de aftrap; bij een ochtendwedstrijd (voor 12:00) de avond ervoor om 20:00 */
for (const m of programma) {
  if (!m.tijd) continue;
  const af = aftrap(m), uurAftrap = +m.tijd.split(":")[0];
  const vanaf = uurAftrap < 12 ? aftrap({ datum: plusDagen(m.datum, -1), tijd: "20:00" }) : new Date(af - 3 * uur);
  if (nu >= vanaf && nu < af) {
    const aantal = new Set((api.voorspellingen || []).filter(v => v.wedstrijd === `${m.thuis} – ${m.uit}` && new Date(v.aftrap).getTime() === af.getTime()).map(v => String(v.naam).toLowerCase())).size;
    meld(`toto-${m.datum}`, "Nog niet voorspeld? 🔮", `De Kamelen-Scorito voor ${isUs(m.thuis) ? "thuis" : "uit"} tegen ${tegen(m)} sluit om ${m.tijd}${uurAftrap < 12 ? " morgenochtend" : ""}. ${aantal ? `Al ${aantal} ${aantal === 1 ? "voorspelling" : "voorspellingen"} binnen.` : "Nog niemand heeft voorspeld!"}`, SITE + "#toto");
  }
}

/* 6. Verjaardagen (vanaf 09:00) */
if (nl.uur >= 9) for (const p of roster.spelers || []) {
  if (p.verjaardag && p.verjaardag === nl.datum.slice(5)) meld(`jarig-${p.naam}-${nl.datum.slice(0, 4)}`, `🎉 ${p.naam} is vandaag jarig!`, "Vergeet niet te feliciteren. Wie trakteert er op een rondje?", SITE + "#spelers");
}

/* Testmelding: zet een nieuwe "id" in testmelding.json om een test te versturen */
const test = lees("testmelding.json", null);
if (test && test.id && !status.verzonden[`test-${test.id}`]) te.push({ id: `test-${test.id}`, title: test.title || "Test", body: test.body || "", url: SITE, test: true });

/* Eerste keer: alles wat nu al zou gelden als verstuurd markeren (geen stortvloed oude meldingen) */
if (eersteKeer) {
  te.filter(x => !x.test).forEach(x => status.verzonden[x.id] = nu.toISOString());
  console.log("Eerste keer: oude meldingen overgeslagen.", te.filter(x => !x.test).map(x => x.id));
  te.splice(0, te.length, ...te.filter(x => x.test));
}
if (!te.length) { console.log("Niets te melden."); process.exit(0); }

const abonnementen = await fetch(`${API}?push=${encodeURIComponent(geheim.pushcode)}`).then(r => r.json()).then(j => j.abonnementen || []).catch(() => []);
console.log(`${te.length} melding(en) voor ${abonnementen.length} telefoon(s)`);
const weg = new Set();
for (const m of te) {
  const payload = JSON.stringify({ title: m.title, body: m.body, url: m.url, tag: m.id });
  await Promise.all(abonnementen.map(s => webpush.sendNotification(s, payload, { TTL: 6 * 3600 }).catch(e => {
    if (e.statusCode === 404 || e.statusCode === 410) weg.add(s.endpoint); else console.log("Fout", e.statusCode, e.body);
  })));
  status.verzonden[m.id] = nu.toISOString();
  console.log("Verstuurd:", m.id, m.title);
}
if (weg.size) await fetch(API, { method: "POST", body: JSON.stringify({ type: "push-weg", pushcode: geheim.pushcode, endpoints: [...weg] }) }).catch(() => {});
/* Oude meldingen (ouder dan 60 dagen) uit de status halen */
for (const [k, t] of Object.entries(status.verzonden)) if (nu - new Date(t) > 60 * 24 * uur) delete status.verzonden[k];
fs.writeFileSync(STATUS, JSON.stringify(status, null, 1) + "\n");
