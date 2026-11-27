// Pushmeldingen voor de Kamelen-app.
// Draait elk kwartier via GitHub Actions. Kijkt wat er te melden valt en stuurt het naar alle telefoons
// die meldingen hebben aangezet. Wat al verstuurd is, staat in meldingen-status.json (geen dubbele meldingen).
import fs from "node:fs";
import webpush from "web-push";
import { parseCsv } from "./parse.mjs";

const API = "https://script.google.com/macros/s/AKfycbw2n1uosUM9ctU2TH1PO-psv6CtgT_QBpxZVHY9IZgDeubBEMf3LSbv1IiDxAXxD9Bt/exec";
const VAPID_PUBLIEK = "BCK-agIGdX3s3--RJJ7UYgdxtKS1hKiz1BxITrQxprx9gggsXMjHBZEG0LKnE9WIQjUCIOEFrCgi88TCqyL9HsQ";
const SITE = "https://kamelenhockey.github.io/kamelen/";
const LITERS_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSyZ0BNstIFRzEszqjoN0j_hG2q6AaZZ43tpw6OtztChcx_FJz7OZGUm1jxlYvOwKu9zEjN12Cb03h5/pub?gid=224456486&single=true&output=csv";
const AANWEZIG_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSyZ0BNstIFRzEszqjoN0j_hG2q6AaZZ43tpw6OtztChcx_FJz7OZGUm1jxlYvOwKu9zEjN12Cb03h5/pub?gid=1818619826&single=true&output=csv";
const COACHES = ["Marie", "Toryll", "Lucia"];
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
let api = {};
try { api = await fetch(API).then(r => r.json()); } catch (e) { console.log("API niet bereikbaar", e.message); }
/* Door een beheerder als afgelast gemeld: geen meldingen meer voor die wedstrijd */
const afgHand = new Set((api.afgelast || []).map(a => a.wedstrijd));
const nietAfgelast = m => !afgHand.has(`${m.datum}|${m.thuis}|${m.uit}`);
const ons = [...(comp.uitslagen || []), ...(comp.programma || []).filter(nietAfgelast)].filter(m => isUs(m.thuis + m.uit));
const programma = (comp.programma || []).filter(m => isUs(m.thuis + m.uit)).filter(nietAfgelast);
const uitslagen = (comp.uitslagen || []).filter(m => isUs(m.thuis + m.uit));

const te = [];   // { id, title, body, url }
/* voor: lijst met namen (persoonlijke melding) of leeg (iedereen) */
const meld = (id, title, body, url = SITE, voor = null) => { if (!status.verzonden[id]) te.push({ id, title, body, url, voor }); };
const persoonlijk = (id, naam, title, body, url) => meld(`${id}-${naam.toLowerCase()}`, title, body, url, [naam]);

/* Namen gelijk trekken (Maarten = Mini enz.) */
const CANON = new Map();
for (const p of [...(roster.spelers || []), ...(roster.invallers || [])]) for (const n of [p.naam, ...(p.ook || [])]) CANON.set(String(n).toLowerCase(), p.naam);
const canon = n => { n = String(n || "").trim(); const h = CANON.get(n.toLowerCase()); if (h) return h; for (const d of n.split(/\s*[\/()|,]\s*/)) { const x = CANON.get(d.toLowerCase()); if (x) return x; } return n; };
const SPELERS = (roster.spelers || []).map(p => p.naam);
async function csv(url) { try { const r = await fetch(url, { redirect: "follow" }); return r.ok ? parseCsv(await r.text()) : []; } catch { return []; } }
/* Wie speelde op welke datum (MM-DD) mee */
async function aanwezigKaart() {
  const rows = await csv(AANWEZIG_CSV), kaart = {}; if (!rows.length) return kaart;
  const M = { jan: 1, feb: 2, mrt: 3, maa: 3, apr: 4, mei: 5, jun: 6, jul: 7, aug: 8, sep: 9, okt: 10, nov: 11, dec: 12 }, kol = {};
  rows[0].forEach((h, i) => { const m = String(h || "").trim().toLowerCase().match(/^(\d{1,2})[\s-]+([a-z]+)/); if (i && m && M[m[2].slice(0, 3)]) kol[String(M[m[2].slice(0, 3)]).padStart(2, "0") + "-" + m[1].padStart(2, "0")] = i; });
  Object.keys(kol).forEach(k => kaart[k] = []);
  let inSp = true, gezien = false;
  for (const r of rows.slice(1)) {
    const naam = String(r[0] || "").trim();
    if (!naam) { if (gezien) inSp = false; continue; }
    if (/totaal aanwezig/i.test(naam)) continue;
    const inval = /invaller/i.test(naam); if (!inval && !inSp) continue; if (!inval) gezien = true;
    for (const k of Object.keys(kol)) { const v = String(r[kol[k]] || "").trim(); if (inval) { if (v) kaart[k].push(v); } else if (!v || /^te laat$/i.test(v)) kaart[k].push(canon(naam)); }
  }
  return kaart;
}
/* Openstaande liters per speler */
async function openLiters() {
  const rows = await csv(LITERS_CSV), open = new Map();
  for (const r of rows.slice(1)) {
    const naam = canon(r[0]); if (!naam || /gedaan/i.test(r[4] || "")) continue;
    const t = String(r[3] || "").toLowerCase(), m = t.match(/(\d+(?:[.,]\d+)?)\s*l(?![a-z])/);
    const l = (m ? parseFloat(m[1].replace(",", ".")) : 0) + (/any liter/.test(t) ? 1 : 0) + (t.match(/stille\s*meter/g) || []).length * 3.25;
    if (l > 0) open.set(naam, (open.get(naam) || 0) + l);
  }
  return open;
}
const fmtL = v => (Math.round(v * 100) / 100).toString().replace(".", ",");

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
/* 4. Stemmen open (75 minuten na de aftrap): alleen voor wie meespeelde en de coaches.
      Drie uur later nog een herinnering voor wie nog niet stemde (zolang de stemming open is). */
const kaart = await aanwezigKaart();
for (const m of ons) {
  if (m.datum < "2026-11-17") continue;
  const open = aftrap(m).getTime() + 75 * 60e3;
  if (nu < open || nu - open > 24 * uur || (api.gesloten || []).includes(sleutel(m))) continue;
  const mee = kaart[m.datum.slice(5)] || [];
  const kiezers = mee.length ? [...mee, ...COACHES] : [...SPELERS, ...COACHES];   // ook invallers die meespeelden
  const gestemd = new Set((api.stemmen || []).filter(x => x.wedstrijd === sleutel(m)).map(x => canon(x.stemmer)));
  for (const n of kiezers) {
    if (gestemd.has(n)) continue;
    if (nu - open >= 3 * uur) persoonlijk(`stemnog-${m.datum}`, n, "Je hebt nog niet gestemd 🐪🫏", `Wie was de kameel en wie de ezel van de dag tegen ${tegen(m)}? Stem voordat de stemming sluit.`, SITE + "#stemmen");
    else persoonlijk(`stem-${m.datum}`, n, "Stemmen is open 🐪🫏", `Wie was de kameel en wie de ezel van de dag tegen ${tegen(m)}?`, SITE + "#stemmen");
  }
}
/* 5. Uitslag kameel en ezel (zodra de beheerder de stemming sluit) */
for (const k of api.gesloten || []) {
  const m = ons.find(x => sleutel(x) === k); if (!m || nu - aftrap(m) > 7 * 24 * uur) continue;
  const laatste = new Map();
  (api.stemmen || []).filter(s => s.wedstrijd === k).forEach(s => laatste.set(String(s.stemmer).toLowerCase(), s));
  const tel = veld => { const c = new Map(); [...laatste.values()].forEach(s => s[veld] && c.set(s[veld], (c.get(s[veld]) || 0) + 1)); const max = Math.max(0, ...c.values()); return [...c].filter(([, n]) => n === max && max).map(([n]) => n); };
  const kamelen = tel("kameel"), ezels = tel("ezel");
  if (kamelen.length || ezels.length)
    meld(`kz-${m.datum}`, `Kameel van de dag: ${kamelen.join(" & ") || "–"} 🐪`, `Ezel van de dag: ${ezels.join(" & ") || "–"}. Die trekt een liter! 🫏`, SITE + "#stemmen");
}
/* 7. Kamelen-Scorito: persoonlijke herinnering voor wie nog niet voorspelde of de bonusvraag nog niet beantwoordde.
      De avond ervoor (ochtendwedstrijd, 20:00) of 3 uur ervoor, en nog een keer 1 uur voor de aftrap. */
for (const m of programma) {
  if (!m.tijd) continue;
  const af = aftrap(m), uurAftrap = +m.tijd.split(":")[0];
  const eerste = uurAftrap < 12 ? aftrap({ datum: plusDagen(m.datum, -1), tijd: "20:00" }) : new Date(af - 3 * uur);
  const laatste = new Date(af - uur);
  if (nu < eerste || nu >= af) continue;
  const voorspeld = new Set((api.voorspellingen || []).filter(v => v.wedstrijd === `${m.thuis} – ${m.uit}` && new Date(v.aftrap).getTime() === af.getTime()).map(v => canon(v.naam)));
  /* Bonusvraag van de beheerder: wie heeft die nog niet beantwoord? */
  const bq = (api.bonusvragen || {})[sleutel(m)];
  const bonusGedaan = new Set((api.bonusantwoorden || []).filter(a => a.wedstrijd === sleutel(m)).map(a => canon(a.naam)));
  const tegenstander = `${isUs(m.thuis) ? "thuis" : "uit"} tegen ${tegen(m)}`;
  const morgen = uurAftrap < 12 ? " morgenochtend" : "";
  for (const n of [...SPELERS, ...COACHES]) {
    const geenVoorsp = !voorspeld.has(n), geenBonus = !!(bq && bq.vraag) && !bonusGedaan.has(n);
    if (geenVoorsp) {
      const ook = geenBonus ? " en beantwoord de bonusvraag" : "";
      if (nu >= laatste) persoonlijk(`scorito1u-${m.datum}`, n, "Nog 1 uur! 🔮", `Je hebt de Kamelen-Scorito voor ${tegenstander} nog niet ingevuld${geenBonus ? " (en de bonusvraag ook niet)" : ""}. Om ${m.tijd} sluit hij.`, SITE + "#toto");
      else persoonlijk(`scorito-${m.datum}`, n, "Nog niet voorspeld? 🔮", `Vul de Kamelen-Scorito in voor ${tegenstander}${ook}. Hij sluit om ${m.tijd}${morgen}.`, SITE + "#toto");
    } else if (geenBonus) {
      if (nu >= laatste) persoonlijk(`bonus1u-${m.datum}`, n, "Bonusvraag nog open ⭐", `${bq.vraag} Nog 1 uur om te antwoorden, om ${m.tijd} sluit hij.`, SITE + "#toto");
      else persoonlijk(`bonus-${m.datum}`, n, "Vergeet de bonusvraag niet ⭐", `Je voorspelling staat, maar de bonusvraag voor ${tegenstander} nog niet: ${bq.vraag}`, SITE + "#toto");
    }
  }
}

/* 8. Liters open: donderdag om 23:15 en een half uur na de wedstrijd (op de wedstrijddag) */
const open = await openLiters();
const literMelding = (id, naam, l) => persoonlijk(id, naam, "Tijd om te zuipen 🍺", `Je hebt nog ${fmtL(l)} liter openstaan bij het Liter-incassobureau. Wegwerken!`, SITE + "#liters");
const dag = new Date(nl.datum + "T12:00:00Z").getUTCDay();   // 4 = donderdag
if (dag === 4 && (nl.uur > 23 || (nl.uur === 23 && nl.min >= 15))) for (const [n, l] of open) literMelding(`liters-do-${nl.datum}`, n, l);
for (const m of uitslagen.concat(programma)) {
  const na = aftrap(m).getTime() + 2 * uur;   // wedstrijd duurt ~1,5 uur, plus een half uur
  if (m.datum === nl.datum && nu >= na && nu - na < 6 * uur) for (const [n, l] of open) literMelding(`liters-wd-${m.datum}`, n, l);
}

/* 6. Verjaardagen (vanaf 09:00) */
if (nl.uur >= 9) for (const p of roster.spelers || []) {
  if (p.verjaardag && p.verjaardag === nl.datum.slice(5)) meld(`jarig-${p.naam}-${nl.datum.slice(0, 4)}`, `🎉 ${p.naam} is vandaag jarig!`, "Vergeet niet te feliciteren. Wie trakteert er op een rondje?", SITE + "#spelers");
}

/* Testmelding: zet een nieuwe "id" in testmelding.json om een test te versturen */
const test = lees("testmelding.json", null);
/* Met "voor": ["Mini", "Casper"] gaat de test alleen naar die personen, elk met een eigen melding */
if (test && test.id) {
  if (Array.isArray(test.voor) && test.voor.length) {
    for (const n of test.voor) { const id = `test-${test.id}-${n.toLowerCase()}`; if (!status.verzonden[id]) te.push({ id, title: test.title || "Test", body: String(test.body || "").replace("{naam}", n), url: SITE, voor: [n], test: true }); }
  } else if (!status.verzonden[`test-${test.id}`]) te.push({ id: `test-${test.id}`, title: test.title || "Test", body: test.body || "", url: SITE, test: true });
}

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
  const doel = m.voor ? abonnementen.filter(a => m.voor.some(n => n.toLowerCase() === String(a.naam || "").toLowerCase())) : abonnementen;
  const zuiver = a => ({ endpoint: a.endpoint, keys: a.keys });
  await Promise.all(doel.map(s => webpush.sendNotification(zuiver(s), payload, { TTL: 6 * 3600 }).catch(e => {
    if (e.statusCode === 404 || e.statusCode === 410) weg.add(s.endpoint); else console.log("Fout", e.statusCode, e.body);
  })));
  /* Persoonlijke melding zonder telefoon van die persoon: niet als verstuurd markeren,
     zodat hij alsnog komt als diegene later (binnen de tijd) meldingen aanzet */
  if (m.voor && !doel.length) continue;
  status.verzonden[m.id] = nu.toISOString();
  console.log("Verstuurd:", m.id, m.title, doel.length ? `(${doel.length} telefoon${doel.length === 1 ? "" : "s"})` : "");
}
if (weg.size) await fetch(API, { method: "POST", body: JSON.stringify({ type: "push-weg", pushcode: geheim.pushcode, endpoints: [...weg] }) }).catch(() => {});
/* Oude meldingen (ouder dan 60 dagen) uit de status halen */
for (const [k, t] of Object.entries(status.verzonden)) if (nu - new Date(t) > 60 * 24 * uur) delete status.verzonden[k];
fs.writeFileSync(STATUS, JSON.stringify(status, null, 1) + "\n");
