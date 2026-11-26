// Kamelen-widget voor iPhone (app "Scriptable", gratis in de App Store)
// Elk formaat heeft een eigen indeling:
//   klein        – volgende tegenstander, aftellen, vorm van de laatste 5 wedstrijden
//   middel       – volgende wedstrijd + vorm en de stand rond de Kamelen
//   groot        – volgende wedstrijd, het programma daarna, laatste uitslagen en de stand
//   vergrendelscherm (rond, rechthoek, één regel) – aftellen naar de volgende wedstrijd
// Tik op de widget om de Kamelen-app te openen.

const SITE = "https://kamelenhockey.github.io/kamelen/";
// Tikken op de widget opent de Kamelen-app op je beginscherm (iOS 16.4+, de app moet via Safari zijn toegevoegd).
// Werkt dat bij jou niet, zet dan OPEN_IN_APP op false: dan opent de widget Safari.
const OPEN_IN_APP = true;
const OPEN_URL = OPEN_IN_APP ? SITE.replace(/^https:\/\//, "webapp://") : SITE;

const ONS = /GCHC\s*H13/i;
const NAVY = new Color("#163650"), NAVY2 = new Color("#2c4b63"), SKY = new Color("#b9d8e8"), SKY_LICHT = new Color("#e8f2f8");
const ORANJE = new Color("#f08c1c"), WIT = Color.white(), GRIJS = new Color("#5e6f7c");
const KLEUR = { W: new Color("#2f8a57"), G: new Color("#8b9298"), V: new Color("#c94430") };

const kort = t => ONS.test(t) ? "Kamelen" : /^GHBS/i.test(t) ? t : t.replace(/^Gron\.?\s*/i, "").replace(/\s+H\d+(-O)?$/i, "");
const datum = (d, t) => new Date(`${d}T${t || "12:00"}:00`);
const isOns = m => ONS.test(m.thuis) || ONS.test(m.uit);
const df = fmt => { const f = new DateFormatter(); f.locale = "nl_NL"; f.dateFormat = fmt; return f; };

async function haal() {
  const fm = FileManager.local(), pad = fm.joinPath(fm.cacheDirectory(), "kamelen-competitie.json");
  try {
    const r = new Request(SITE + "competitie.json?" + Date.now()); r.timeoutInterval = 10;
    const j = await r.loadJSON(); fm.writeString(pad, JSON.stringify(j)); return j;
  } catch (e) {
    if (fm.fileExists(pad)) return JSON.parse(fm.readString(pad));
    throw e;
  }
}
async function logo() {
  const fm = FileManager.local(), pad = fm.joinPath(fm.cacheDirectory(), "kamelen-logo.png");
  try { const img = await new Request(SITE + "icon-192.png").loadImage(); fm.writeImage(pad, img); return img; }
  catch { return fm.fileExists(pad) ? fm.readImage(pad) : null; }
}

function tot(d) {
  const ms = d - new Date(), dag = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 864e5), uur = Math.floor(ms / 36e5);
  if (ms < 0) return "nu bezig";
  if (dag >= 2) return `over ${dag} dagen`;
  if (dag === 1) return "morgen";
  return uur >= 1 ? `vandaag, over ${uur} uur` : "zo meteen";
}
function uitslag(m) {
  const [a, b] = String(m.score).split("-").map(Number), wij = ONS.test(m.thuis) ? a : b, zij = ONS.test(m.thuis) ? b : a;
  return { wij, zij, r: wij > zij ? "W" : wij === zij ? "G" : "V" };
}

/* ---------- bouwstenen ---------- */
function tekst(st, t, grootte, kleur = NAVY, vet = false) {
  const x = st.addText(String(t)); x.font = vet ? Font.boldSystemFont(grootte) : Font.systemFont(grootte); x.textColor = kleur; x.lineLimit = 1; x.minimumScaleFactor = 0.6; return x;
}
function kop(w, img, st, groot) {
  const k = w.addStack(); k.centerAlignContent();
  if (img) { const i = k.addImage(img); i.imageSize = new Size(groot ? 26 : 22, groot ? 26 : 22); i.cornerRadius = 6; k.addSpacer(6); }
  const n = k.addText("Kamelen"); n.font = new Font("Georgia", groot ? 19 : 16); n.textColor = NAVY;
  k.addSpacer();
  if (st) { const p = k.addStack(); p.backgroundColor = WIT; p.cornerRadius = 8; p.setPadding(2, 7, 2, 7); tekst(p, `${st.positie}e · ${st.punten} pt`, 11, NAVY, true); }
}
function pil(st, t, achter = ORANJE, kleur = NAVY, grootte = 11) {
  const p = st.addStack(); p.backgroundColor = achter; p.cornerRadius = 9; p.setPadding(3, 8, 3, 8); tekst(p, t, grootte, kleur, true); return p;
}
function bolletje(st, r, maat = 16) {
  const b = st.addStack(); b.size = new Size(maat, maat); b.cornerRadius = maat / 2; b.backgroundColor = KLEUR[r]; b.centerAlignContent();
  const l = b.addText(r); l.font = Font.boldSystemFont(maat * .56); l.textColor = WIT;
}
function vorm(st, uitslagen, maat = 16) {
  const r = st.addStack(); r.centerAlignContent();
  uitslagen.slice(0, 5).reverse().forEach((m, i) => { if (i) r.addSpacer(3); bolletje(r, uitslag(m).r, maat); });
  return r;
}
/* Volgende wedstrijd; donker = navy kaart met witte tekst (groot formaat) */
function volgendeBlok(w, m, opmaak) {
  const { donker, tegenGrootte, datumFmt } = opmaak, inkt = donker ? WIT : NAVY, zacht = donker ? new Color("#ffffff", .75) : NAVY2;
  const thuis = ONS.test(m.thuis), d = datum(m.datum, m.tijd);
  tekst(w, thuis ? "Thuis tegen" : "Uit bij", 10, zacht, true);
  tekst(w, kort(thuis ? m.uit : m.thuis), tegenGrootte, inkt, true);
  w.addSpacer(4);
  const r = w.addStack(); r.centerAlignContent();
  pil(r, tot(d));
  r.addSpacer(6);
  tekst(r, `${df(datumFmt).string(d)}${m.tijd ? " · " + m.tijd : ""}`, 11, inkt);
  return r;
}
function sectieKop(w, t) { w.addSpacer(10); tekst(w, t, 11, GRIJS, true); w.addSpacer(4); }
function standRijen(w, stand, grootte = 11, aantal = 5) {
  const i = stand.findIndex(t => ONS.test(t.team)); if (i < 0) return;
  const start = Math.max(0, Math.min(i - Math.floor(aantal / 2), stand.length - aantal));
  for (const t of stand.slice(start, start + aantal)) {
    const ons = ONS.test(t.team), r = w.addStack(); r.centerAlignContent(); r.setPadding(2, 6, 2, 6); r.cornerRadius = 6;
    if (ons) r.backgroundColor = WIT;
    const p = r.addStack(); p.size = new Size(20, 0); tekst(p, t.positie, grootte, ons ? ORANJE : GRIJS, true);
    tekst(r, kort(t.team), grootte, NAVY, ons);
    r.addSpacer();
    tekst(r, `${t.gespeeld}`, grootte - 1, GRIJS); r.addSpacer(8);
    const q = r.addStack(); q.size = new Size(24, 0); tekst(q, t.punten, grootte, NAVY, true);
    w.addSpacer(1);
  }
}

/* ---------- indelingen ---------- */
function klein(w, d) {
  kop(w, d.img, d.st);
  w.addSpacer(8);
  if (d.volgende) volgendeBlok(w, d.volgende, { tegenGrootte: 18, datumFmt: "EEE d MMM" });
  else tekst(w, "Geen wedstrijd gepland", 14, NAVY, true);
  w.addSpacer();
  if (d.uitslagen.length) { tekst(w, "Vorm", 9, GRIJS, true); w.addSpacer(3); vorm(w, d.uitslagen, 15); }
}
function middel(w, d) {
  kop(w, d.img, d.st);
  w.addSpacer(8);
  const rij = w.addStack(); rij.topAlignContent();
  const links = rij.addStack(); links.layoutVertically();
  if (d.volgende) volgendeBlok(links, d.volgende, { tegenGrootte: 20, datumFmt: "EEE d MMM" });
  else tekst(links, "Geen wedstrijd gepland", 14, NAVY, true);
  if (d.uitslagen[0]) {
    links.addSpacer(8);
    const u = uitslag(d.uitslagen[0]), r = links.addStack(); r.centerAlignContent();
    bolletje(r, u.r, 15); r.addSpacer(5);
    tekst(r, `${kort(d.uitslagen[0].thuis)} ${d.uitslagen[0].score} ${kort(d.uitslagen[0].uit)}`, 10, NAVY);
  }
  rij.addSpacer(10);
  const rechts = rij.addStack(); rechts.layoutVertically(); rechts.size = new Size(118, 0);
  if (d.uitslagen.length) { tekst(rechts, "Vorm", 9, GRIJS, true); rechts.addSpacer(3); vorm(rechts, d.uitslagen, 14); rechts.addSpacer(6); }
  if (d.stand.length) standRijen(rechts, d.stand, 9, 3);
}
function groot(w, d) {
  kop(w, d.img, d.st, true);
  w.addSpacer(10);
  /* volgende wedstrijd als navy kaart */
  const kaart = w.addStack(); kaart.layoutVertically(); kaart.backgroundColor = NAVY; kaart.cornerRadius = 14; kaart.setPadding(10, 12, 10, 12);
  if (d.volgende) {
    const boven = kaart.addStack(); const bl = boven.addStack(); bl.layoutVertically();
    volgendeBlok(bl, d.volgende, { donker: true, tegenGrootte: 24, datumFmt: "EEEE d MMMM" });
    boven.addSpacer();
    if (d.volgende.accommodatie || d.volgende.veld) { kaart.addSpacer(4); tekst(kaart, [d.volgende.accommodatie, d.volgende.veld].filter(Boolean).join(" · "), 10, new Color("#ffffff", .7)); }
  } else tekst(kaart, "Geen wedstrijd gepland", 16, WIT, true);

  /* twee kolommen: links programma + uitslagen, rechts de stand */
  w.addSpacer(4);
  const rij = w.addStack(); rij.topAlignContent();
  const links = rij.addStack(); links.layoutVertically();
  if (d.daarna.length) {
    sectieKop(links, "Daarna");
    for (const m of d.daarna.slice(0, 2)) {
      const r = links.addStack(); r.centerAlignContent();
      const dt = r.addStack(); dt.size = new Size(44, 0); tekst(dt, df("d MMM").string(datum(m.datum, m.tijd)), 10, GRIJS);
      tekst(r, `${ONS.test(m.thuis) ? "" : "@ "}${kort(ONS.test(m.thuis) ? m.uit : m.thuis)}`, 11, NAVY, true);
      links.addSpacer(2);
    }
  }
  if (d.uitslagen.length) {
    sectieKop(links, "Laatste uitslagen");
    for (const m of d.uitslagen.slice(0, 3)) {
      const u = uitslag(m), r = links.addStack(); r.centerAlignContent();
      bolletje(r, u.r, 14); r.addSpacer(5);
      tekst(r, `${u.wij}–${u.zij}`, 11, NAVY, true); r.addSpacer(4);
      tekst(r, kort(ONS.test(m.thuis) ? m.uit : m.thuis), 11, NAVY);
      links.addSpacer(2);
    }
  }
  rij.addSpacer(12);
  const rechts = rij.addStack(); rechts.layoutVertically(); rechts.size = new Size(140, 0);
  if (d.stand.length) { sectieKop(rechts, "Stand"); standRijen(rechts, d.stand, 11, 5); }
  w.addSpacer();
  if (d.uitslagen.length) { const v = w.addStack(); v.centerAlignContent(); tekst(v, "Vorm", 10, GRIJS, true); v.addSpacer(6); vorm(v, d.uitslagen, 14); v.addSpacer(); tekst(v, d.bijgewerkt, 9, GRIJS); }
}
function vergrendel(w, d, fam) {
  const m = d.volgende, tegen = m ? kort(ONS.test(m.thuis) ? m.uit : m.thuis) : null;
  if (fam === "accessoryInline") { w.addText(m ? `🐪 ${tegen} · ${tot(datum(m.datum, m.tijd))}` : "🐪 Kamelen"); return; }
  if (fam === "accessoryCircular") {
    w.addAccessoryWidgetBackground = true;
    const dagen = m ? Math.max(0, Math.round((new Date(datum(m.datum, m.tijd)).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 864e5)) : null;
    const s = w.addStack(); s.layoutVertically(); s.centerAlignContent();
    const a = s.addText(dagen === null ? "🐪" : dagen === 0 ? "🏑" : String(dagen)); a.font = Font.boldSystemFont(dagen === null || dagen === 0 ? 20 : 22); a.centerAlignText();
    const b = s.addText(dagen === null ? "" : dagen === 0 ? "vandaag" : dagen === 1 ? "dag" : "dagen"); b.font = Font.systemFont(9); b.centerAlignText();
    return;
  }
  const t = w.addText(m ? `🐪 ${tegen}` : "🐪 Kamelen"); t.font = Font.boldSystemFont(14);
  if (m) {
    const s = w.addText(`${tot(datum(m.datum, m.tijd))} · ${m.tijd || ""}`); s.font = Font.systemFont(12);
    const p = w.addText(`${ONS.test(m.thuis) ? "Thuis" : "Uit"}${d.st ? ` · ${d.st.positie}e in de stand` : ""}`); p.font = Font.systemFont(11);
  }
}

async function maak(fam) {
  const j = await haal(), nu = new Date();
  const komend = (j.programma || []).filter(m => isOns(m) && datum(m.datum, m.tijd) > new Date(nu - 2 * 36e5)).sort((a, b) => datum(a.datum, a.tijd) - datum(b.datum, b.tijd));
  const d = {
    volgende: komend[0], daarna: komend.slice(1),
    uitslagen: (j.uitslagen || []).filter(m => isOns(m) && m.score).sort((a, b) => b.datum.localeCompare(a.datum)),
    stand: j.stand || [], st: (j.stand || []).find(t => ONS.test(t.team)),
    bijgewerkt: j.standPer ? `stand ${j.standPer.slice(0, 5).replace("-", "/")}` : "",
    img: fam.startsWith("accessory") ? null : await logo(),
  };
  const w = new ListWidget();
  w.url = OPEN_URL;
  w.refreshAfterDate = new Date(Date.now() + 2 * 36e5);
  if (fam.startsWith("accessory")) { vergrendel(w, d, fam); return w; }
  const g = new LinearGradient(); g.colors = [new Color("#cfe5f1"), SKY]; g.locations = [0, 1]; w.backgroundGradient = g;
  if (fam === "small") { w.setPadding(12, 12, 12, 12); klein(w, d); }
  else if (fam === "medium") { w.setPadding(12, 14, 12, 14); middel(w, d); }
  else { w.setPadding(14, 14, 12, 14); groot(w, d); }
  return w;
}

/* In de app zelf: kies welk formaat je wilt bekijken */
let fam = config.widgetFamily;
if (!config.runsInWidget) {
  const a = new Alert(); a.title = "Voorbeeld"; a.message = "Welk formaat wil je zien?";
  ["Klein", "Middel", "Groot"].forEach(x => a.addAction(x)); a.addCancelAction("Annuleer");
  const k = await a.presentSheet(); fam = ["small", "medium", "large"][k] || "medium";
}
fam = fam || "medium";
let widget;
try { widget = await maak(fam); }
catch (e) { widget = new ListWidget(); widget.url = OPEN_URL; widget.backgroundColor = SKY; const t = widget.addText("Kamelen: geen verbinding"); t.textColor = NAVY; t.font = Font.boldSystemFont(13); }
if (config.runsInWidget) Script.setWidget(widget);
else if (fam === "small") await widget.presentSmall();
else if (fam === "large") await widget.presentLarge();
else await widget.presentMedium();
Script.complete();
