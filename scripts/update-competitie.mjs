// Leest programma, uitslagen en stand van hockey.nl en schrijft competitie.json.
import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { parseProgramma, parseUitslagen, parseStand, berekenAftrek, seizoenStartjaar, maakIcs } from "./parse.mjs";

const TEAM = "21368|182976";
const BASIS = `https://www.hockey.nl/match-center#/team/${TEAM}`;

async function leesTekst(page, tab, moetBevatten) {
  // Max. 3 pogingen: het Match Center laadt soms traag
  for (let poging = 1; ; poging++) {
    try { return await leesTekstEenmaal(page, tab, moetBevatten); }
    catch (e) { if (poging >= 3) throw e; console.log(`${tab}: poging ${poging} mislukt, opnieuw...`); await page.waitForTimeout(5000); }
  }
}

async function leesTekstEenmaal(page, tab, moetBevatten) {
  await page.goto("about:blank");
  await page.goto(`${BASIS}/${tab}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction((woord) => {
    const mc = document.querySelector("match-center");
    if (!mc || !mc.shadowRoot) return false;
    const t = [...mc.shadowRoot.children].map(c => c.innerText || "").join("\n");
    return t.includes(woord);
  }, moetBevatten, { timeout: 60000 });
  await page.waitForTimeout(2500);
  return page.evaluate(() => [...document.querySelector("match-center").shadowRoot.children].map(c => c.innerText || "").join("\n"));
}

const log = [];
async function debugOpslaan(page, fout) {
  try {
    await mkdir("debug", { recursive: true });
    let tekst = "";
    if (page) {
      tekst = await page.evaluate(() => {
        const mc = document.querySelector("match-center");
        const sh = mc && mc.shadowRoot ? [...mc.shadowRoot.children].map(c => c.innerText || "").join("\n") : "(geen match-center/shadowRoot)";
        return `URL: ${location.href}\nTITEL: ${document.title}\n--- BODY ---\n${document.body.innerText.slice(0, 3000)}\n--- MATCH CENTER ---\n${sh.slice(0, 3000)}`;
      }).catch(e => `evaluate faalde: ${e}`);
      await page.screenshot({ path: "debug/competitie.png", fullPage: false }).catch(() => {});
    }
    await writeFile("debug/competitie-log.txt", `${new Date().toISOString()}\nFOUT: ${fout?.stack || fout}\n\n${log.join("\n")}\n\n${tekst}\n`);
  } catch {}
}

const browser = await chromium.launch();
const page = await browser.newPage({
  locale: "nl-NL", timezoneId: "Europe/Amsterdam", viewport: { width: 560, height: 3000 },
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
});
page.on("response", r => { if (r.status() >= 400) log.push(`HTTP ${r.status()} ${r.url().slice(0, 150)}`); });
page.on("console", m => { if (m.type() === "error") log.push(`console: ${m.text().slice(0, 200)}`); });
const startjaar = seizoenStartjaar();
let programmaTekst, uitslagenTekst, overzichtTekst, wedstrijdLinks = [];
try {
  programmaTekst = await leesTekst(page, "program", "Personaliseer weergave");
  wedstrijdLinks = await page.evaluate(() => [...document.querySelector("match-center").shadowRoot.querySelectorAll('a[href^="#/match/"]')]
    .map(a => ({ id: a.getAttribute("href").split("/").pop(), tekst: a.innerText || "" })));
  uitslagenTekst = await leesTekst(page, "results", "Personaliseer weergave");
  overzichtTekst = await leesTekst(page, "overview", "Stand per");
} catch (e) {
  await debugOpslaan(page, e);
  await browser.close();
  console.error(e); process.exit(1);
}
// Veld en adres van onze eerstvolgende 3 wedstrijden (staan op de wedstrijdpagina)
const ONS = /gchc/i;
const progVoorlopig = parseProgramma(programmaTekst, startjaar);
const details = {};
const onze = progVoorlopig.filter(w => ONS.test(w.thuis + w.uit)).slice(0, 3);
for (const w of onze) {
  const link = wedstrijdLinks.find(l => l.tekst.includes(w.thuis) && l.tekst.includes(w.uit) && !Object.values(details).some(d => d.id === l.id));
  if (!link) continue;
  try {
    await page.goto("about:blank");
    await page.goto(`https://www.hockey.nl/match-center#/match/${link.id}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => {
      const mc = document.querySelector("match-center");
      return mc && mc.shadowRoot && [...mc.shadowRoot.children].map(c => c.innerText || "").join("\n").includes("Wedstrijdinfo");
    }, null, { timeout: 30000 });
    await page.waitForTimeout(1500);
    const t = await page.evaluate(() => [...document.querySelector("match-center").shadowRoot.children].map(c => c.innerText || "").join("\n"));
    const regels = t.split("\n").map(r => r.trim()).filter(Boolean);
    const na = k => { const i = regels.indexOf(k); return i >= 0 ? regels[i + 1] : null; };
    details[`${w.datum}|${w.thuis}|${w.uit}`] = { id: link.id, veld: na("Veld"), accommodatie: na("Accommodatie"), adres: na("Adres") };
  } catch (e) { console.log(`Details ${w.thuis}-${w.uit} niet gelukt: ${e.message}`); }
}
await browser.close();

/* Handmatig afgelast (staat nog niet op hockey.nl): afgelast-handmatig.json, [{ thuis, uit, datum }].
   Zo'n wedstrijd gaat uit het programma en staat meteen als afgelast in de app. Komt hij op hockey.nl
   met een nieuwe datum terug, dan wordt dat vanzelf de inhaaldatum. */
const handmatig = JSON.parse(await readFile("afgelast-handmatig.json", "utf8").catch(() => "[]"));
/* ...en wat een beheerder of coach in de app als afgelast meldde (opgeslagen in het Apps Script) */
try {
  const api = (await readFile("index.html", "utf8")).match(/api:\s*"(https:\/\/script\.google\.com[^"]+)"/)?.[1];
  if (api) for (const a of (await fetch(api).then(r => r.json())).afgelast || []) {
    const [datum, thuis, uit] = String(a.wedstrijd).split("|");
    if (uit && !handmatig.some(h => h.datum === datum && h.thuis === thuis && h.uit === uit)) handmatig.push({ datum, thuis, uit });
  }
} catch (e) { console.log("Afgelast uit de app niet opgehaald:", e.message); }
const isHandmatig = w => handmatig.some(h => h.thuis === w.thuis && h.uit === w.uit && h.datum === w.datum);
const programma = parseProgramma(programmaTekst, startjaar).filter(w => !isHandmatig(w)).map(w => {
  const d = details[`${w.datum}|${w.thuis}|${w.uit}`];
  return d ? { ...w, wedstrijdId: d.id, veld: d.veld, accommodatie: d.accommodatie, adres: d.adres } : w;
});
const uitslagen = parseUitslagen(uitslagenTekst, startjaar);
const { stand, standPer } = parseStand(overzichtTekst);

const oud = JSON.parse(await readFile("competitie.json", "utf8"));

// Aanvangstijd bewaren bij gespeelde wedstrijden (hockey.nl toont die niet bij uitslagen; de toto heeft hem nodig)
const tijdVan = new Map([...(oud.uitslagen || []), ...(oud.programma || [])].filter(w => w.tijd).map(w => [`${w.datum}|${w.thuis}|${w.uit}`, w.tijd]));
for (const w of uitslagen) { const t = tijdVan.get(`${w.datum}|${w.thuis}|${w.uit}`); if (t) w.tijd = t; }

// Veiligheidscheck: bij rare gegevens niets overschrijven
if (stand.length < 4) throw new Error(`Stand lijkt onvolledig (${stand.length} teams) – niets bijgewerkt.`);
if (programma.length + uitslagen.length < (oud.programma.length + oud.uitslagen.length) - 10)
  throw new Error("Veel minder wedstrijden dan vorige keer – niets bijgewerkt.");

// Afgelaste en verplaatste wedstrijden van ons bijhouden.
// Een wedstrijd die uit het programma verdwijnt zonder uitslag, is na 30 uur "afgelast";
// komt hij met een nieuwe datum terug, dan noteren we die (verplaatst).
const isOns = w => ONS.test(w.thuis + w.uit), paarVan = w => `${w.thuis}|${w.uit}`;
const nuOns = new Map([...uitslagen, ...programma].filter(isOns).map(w => [paarVan(w), w]));
const nuMs = Date.now();
let afgelast = (oud.afgelast || []).map(a => ({ ...a }));
for (const w of (oud.programma || []).filter(isOns)) {
  const nu = nuOns.get(paarVan(w));
  if (nu && (nu.score || nu.datum === w.datum)) continue;          // gespeeld of ongewijzigd
  if (afgelast.some(a => a.thuis === w.thuis && a.uit === w.uit && a.datum === w.datum)) continue;
  afgelast.push({ thuis: w.thuis, uit: w.uit, datum: w.datum, tijd: w.tijd || null, nieuweDatum: nu ? nu.datum : null, vermist: new Date().toISOString() });
}
for (const a of afgelast) {
  const nu = nuOns.get(`${a.thuis}|${a.uit}`);
  if (nu && nu.score) a.gespeeld = nu.datum;
  else if (nu && nu.datum !== a.datum) a.nieuweDatum = nu.datum;
}
// Alleen tonen als hij echt niet gespeeld is: geen uitslag 30 uur na de aftrap, of een nieuwe datum
afgelast = afgelast.filter(a => !(a.gespeeld && a.gespeeld === a.datum))
  .filter(a => { const nu = nuOns.get(`${a.thuis}|${a.uit}`); return !(nu && !nu.score && nu.datum === a.datum); });   // toch weer op de oude datum: vergissing
for (const h of handmatig) {
  if (afgelast.some(a => a.thuis === h.thuis && a.uit === h.uit && a.datum === h.datum)) continue;
  const w = (oud.programma || []).find(x => x.thuis === h.thuis && x.uit === h.uit && x.datum === h.datum) || h;
  afgelast.push({ thuis: h.thuis, uit: h.uit, datum: h.datum, tijd: w.tijd || null, nieuweDatum: null, vermist: new Date().toISOString(), handmatig: true });
}
afgelast.forEach(a => { a.bevestigd = !!a.nieuweDatum || isHandmatig(a) || nuMs - new Date(`${a.datum}T${a.tijd || "12:00"}:00`).getTime() > 30 * 3600e3; });

const nieuw = {
  ...oud,
  programma, uitslagen, stand, afgelast,
  standPer: standPer || oud.standPer,
  puntenAftrek: berekenAftrek(stand, uitslagen),
  competitieBijgewerkt: new Date().toISOString(),
};
const zonderTijd = o => JSON.stringify({ ...o, competitieBijgewerkt: null });
if (zonderTijd(nieuw) === zonderTijd(oud)) {
  console.log("Geen wijzigingen op hockey.nl.");
  process.exit(0);
}
await writeFile("competitie.json", JSON.stringify(nieuw, null, 1) + "\n");
await writeFile("kamelen.ics", maakIcs(programma, /gchc/i, nieuw.competitieBijgewerkt));
console.log(`Programma: ${programma.length}, uitslagen: ${uitslagen.length}, stand: ${stand.length} teams (per ${standPer}).`);
