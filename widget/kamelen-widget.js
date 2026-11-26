// Kamelen-widget voor iPhone (app "Scriptable", gratis in de App Store)
// Toont de volgende wedstrijd, hoe lang het nog duurt, de stand en de laatste uitslag.
// Werkt als klein, middelgroot en vergrendelscherm-widget. Tik op de widget om de Kamelen-app te openen.

const SITE = "https://kamelenhockey.github.io/kamelen/";
const ONS = /GCHC\s*H13/i;
const NAVY = new Color("#163650"), SKY = new Color("#b9d8e8"), ORANJE = new Color("#f08c1c"), WIT = Color.white();

const kort = t => ONS.test(t) ? "Kamelen" : /^GHBS/i.test(t) ? t : t.replace(/^Gron\.?\s*/i, "").replace(/\s+H\d+(-O)?$/i, "");
const datum = (d, t) => new Date(`${d}T${t || "12:00"}:00`);

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

function tot(d) {
  const ms = d - new Date(), dag = Math.floor(ms / 864e5), uur = Math.floor(ms / 36e5);
  if (ms < 0) return "nu bezig";
  if (dag >= 2) return `over ${dag} dagen`;
  if (dag === 1) return "morgen";
  return uur >= 1 ? `over ${uur} uur` : "zo meteen";
}

async function maak() {
  const j = await haal(), nu = new Date();
  const volgende = (j.programma || []).filter(m => (ONS.test(m.thuis) || ONS.test(m.uit)) && datum(m.datum, m.tijd) > new Date(nu - 2 * 36e5))
    .sort((a, b) => datum(a.datum, a.tijd) - datum(b.datum, b.tijd))[0];
  const laatste = (j.uitslagen || []).filter(m => ONS.test(m.thuis) || ONS.test(m.uit)).sort((a, b) => b.datum.localeCompare(a.datum))[0];
  const st = (j.stand || []).find(t => ONS.test(t.team));
  const fam = config.widgetFamily || "medium";

  const w = new ListWidget();
  w.url = SITE;
  w.refreshAfterDate = new Date(Date.now() + 3 * 36e5);

  if (fam.startsWith("accessory")) {      // vergrendelscherm
    const t = w.addText(volgende ? `🐪 ${kort(ONS.test(volgende.thuis) ? volgende.uit : volgende.thuis)}` : "🐪 Kamelen");
    t.font = Font.boldSystemFont(13);
    if (volgende) { const s = w.addText(`${tot(datum(volgende.datum, volgende.tijd))} · ${volgende.tijd || ""}`); s.font = Font.systemFont(11); }
    return w;
  }

  const g = new LinearGradient(); g.colors = [new Color("#c6e0ee"), SKY]; g.locations = [0, 1]; w.backgroundGradient = g;
  w.setPadding(12, 14, 12, 14);

  const kop = w.addStack(); kop.centerAlignContent();
  try { const img = await new Request(SITE + "icon-192.png").loadImage(); const i = kop.addImage(img); i.imageSize = new Size(22, 22); i.cornerRadius = 6; kop.addSpacer(6); } catch {}
  const naam = kop.addText("Kamelen"); naam.font = new Font("Georgia", 16); naam.textColor = NAVY;
  kop.addSpacer();
  if (st) { const p = kop.addText(`#${st.positie} · ${st.punten} pt`); p.font = Font.boldSystemFont(11); p.textColor = NAVY; }

  w.addSpacer(8);
  if (volgende) {
    const thuis = ONS.test(volgende.thuis), tegen = kort(thuis ? volgende.uit : volgende.thuis), d = datum(volgende.datum, volgende.tijd);
    const k = w.addText(thuis ? "THUIS TEGEN" : "UIT BIJ"); k.font = Font.semiboldSystemFont(9); k.textColor = new Color("#2c4b63");
    const t = w.addText(tegen); t.font = Font.boldSystemFont(fam === "small" ? 18 : 22); t.textColor = NAVY; t.minimumScaleFactor = 0.6; t.lineLimit = 1;
    w.addSpacer(4);
    const r = w.addStack(); r.centerAlignContent();
    const pil = r.addStack(); pil.backgroundColor = ORANJE; pil.cornerRadius = 9; pil.setPadding(3, 8, 3, 8);
    const pt = pil.addText(tot(d)); pt.font = Font.boldSystemFont(11); pt.textColor = NAVY;
    r.addSpacer(6);
    const df = new DateFormatter(); df.locale = "nl_NL"; df.dateFormat = fam === "small" ? "EEE d MMM" : "EEEE d MMMM";
    const wanneer = r.addText(`${df.string(d)}${volgende.tijd ? " · " + volgende.tijd : ""}`); wanneer.font = Font.systemFont(11); wanneer.textColor = NAVY; wanneer.lineLimit = 1; wanneer.minimumScaleFactor = 0.7;
  } else {
    const t = w.addText("Geen wedstrijd gepland"); t.font = Font.boldSystemFont(15); t.textColor = NAVY;
  }

  if (laatste && fam !== "small") {
    w.addSpacer();
    const [a, b] = laatste.score.split("-").map(Number), wijThuis = ONS.test(laatste.thuis), wij = wijThuis ? a : b, zij = wijThuis ? b : a;
    const u = w.addStack(); u.centerAlignContent();
    const bol = u.addStack(); bol.size = new Size(16, 16); bol.cornerRadius = 8; bol.backgroundColor = wij > zij ? new Color("#2f8a57") : wij === zij ? new Color("#8b9298") : new Color("#c94430");
    bol.centerAlignContent(); const l = bol.addText(wij > zij ? "W" : wij === zij ? "G" : "V"); l.font = Font.boldSystemFont(9); l.textColor = WIT;
    u.addSpacer(6);
    const ut = u.addText(`Laatst: ${kort(laatste.thuis)} ${laatste.score} ${kort(laatste.uit)}`); ut.font = Font.systemFont(11); ut.textColor = NAVY; ut.lineLimit = 1; ut.minimumScaleFactor = 0.7;
  } else w.addSpacer();
  return w;
}

let widget;
try { widget = await maak(); }
catch (e) { widget = new ListWidget(); widget.backgroundColor = SKY; const t = widget.addText("Kamelen: geen verbinding"); t.textColor = NAVY; t.font = Font.boldSystemFont(13); }
if (config.runsInWidget) Script.setWidget(widget); else await widget.presentMedium();
Script.complete();
