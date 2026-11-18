/**
 * Kamelen – opslag voor de toto en de stemming "kameel en ezel van de dag".
 * Tabbladen: "Voorspellingen", "Stemmen" en "Gesloten" (welke stemmingen de beheerder heeft gesloten).
 * Scores en stemmen blijven verborgen tot de aftrap (toto) of tot de beheerder de stemming sluit.
 */
const TEAMCODE = "VUL-HIER-JULLIE-CODE-IN";        // voor iedereen in het team
const BEHEERCODE = "VUL-HIER-JOUW-BEHEERCODE-IN";  // alleen voor jou: stemmingen sluiten
const PUSHCODE = "VUL-HIER-DE-PUSHCODE-IN";        // geheim voor de meldingen-robot (GitHub)

function tab_(naam, kop) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(naam);
  if (!sh) { sh = ss.insertSheet(naam); sh.appendRow(kop); sh.setFrozenRows(1); }
  return sh;
}
const voorspTab_ = () => tab_("Voorspellingen", ["Tijdstempel", "Naam", "Doelpunten Kamelen", "Doelpunten tegenstander", "Wedstrijd", "Aftrap"]);
const stemTab_ = () => tab_("Stemmen", ["Tijdstempel", "Stemmer", "Kameel", "Ezel", "Wedstrijd", "Sluit"]);
const sluitTab_ = () => tab_("Gesloten", ["Tijdstempel", "Wedstrijd", "Status"]);
const pushTab_ = () => tab_("Push", ["Tijdstempel", "Endpoint", "Abonnement"]);
function pushRij_(endpoint) {
  const rows = pushTab_().getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) if (rows[i][1] === endpoint) return i + 1;
  return 0;
}
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
const gelijk_ = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
const naam_ = n => String(n || "").trim().slice(0, 40);

/* Laatste status per wedstrijd: "dicht" of "open" */
function gesloten_() {
  const st = {};
  sluitTab_().getDataRange().getValues().slice(1).forEach(r => { st[r[1]] = r[2]; });
  return Object.keys(st).filter(k => st[k] === "dicht");
}

function doGet(e) {
  /* Alleen de meldingen-robot (met de pushcode) krijgt de abonnementen te zien */
  if (e && e.parameter && e.parameter.push) {
    if (e.parameter.push !== PUSHCODE) return json_({ ok: false, fout: "pushcode" });
    const abonnementen = pushTab_().getDataRange().getValues().slice(1).map(r => { try { return JSON.parse(r[2]); } catch (x) { return null; } }).filter(Boolean);
    return json_({ ok: true, abonnementen });
  }
  const nu = new Date();
  const dicht = gesloten_();
  const voorspellingen = voorspTab_().getDataRange().getValues().slice(1).map(r => {
    const open = r[5] && new Date(r[5]) > nu;
    return { tijd: r[0], naam: r[1], voor: open ? null : r[2], tegen: open ? null : r[3], wedstrijd: r[4], aftrap: r[5] };
  });
  const stemmen = stemTab_().getDataRange().getValues().slice(1).map(r => {
    const zichtbaar = dicht.indexOf(r[4]) >= 0;
    return { tijd: r[0], stemmer: r[1], kameel: zichtbaar ? r[2] : null, ezel: zichtbaar ? r[3] : null, wedstrijd: r[4] };
  });
  return json_({ ok: true, voorspellingen, stemmen, gesloten: dicht });
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents || "{}");
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      /* Beheer: alleen met de beheercode */
      if (d.type === "beheer") {
        if (!gelijk_(d.beheercode, BEHEERCODE)) return json_({ ok: false, fout: "beheercode" });
        if (d.actie === "check") return json_({ ok: true });
        const w = String(d.wedstrijd || "").slice(0, 120);
        if (!w || (d.actie !== "sluit" && d.actie !== "heropen")) return json_({ ok: false, fout: "invoer" });
        sluitTab_().appendRow([new Date(), w, d.actie === "sluit" ? "dicht" : "open"]);
        return json_({ ok: true });
      }
      /* Meldingen aan- of uitzetten op een telefoon */
      if (d.type === "push-aan" || d.type === "push-uit") {
        const sub = d.abonnement || {}, endpoint = String(sub.endpoint || "");
        if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000) return json_({ ok: false, fout: "invoer" });
        const rij = pushRij_(endpoint);
        if (d.type === "push-uit") { if (rij) pushTab_().deleteRow(rij); return json_({ ok: true }); }
        const tekst = JSON.stringify({ endpoint, keys: { p256dh: String((sub.keys || {}).p256dh || "").slice(0, 200), auth: String((sub.keys || {}).auth || "").slice(0, 100) } });
        if (rij) pushTab_().getRange(rij, 1, 1, 3).setValues([[new Date(), endpoint, tekst]]);
        else pushTab_().appendRow([new Date(), endpoint, tekst]);
        return json_({ ok: true });
      }
      /* Robot ruimt verlopen abonnementen op */
      if (d.type === "push-weg") {
        if (d.pushcode !== PUSHCODE) return json_({ ok: false, fout: "pushcode" });
        (d.endpoints || []).forEach(ep => { const rij = pushRij_(ep); if (rij) pushTab_().deleteRow(rij); });
        return json_({ ok: true });
      }
      if (!gelijk_(d.code, TEAMCODE)) return json_({ ok: false, fout: "code" });
      if (d.type === "stem") {
        const stemmer = naam_(d.stemmer), kameel = naam_(d.kameel), ezel = naam_(d.ezel), w = String(d.wedstrijd || "").slice(0, 120);
        if (!stemmer || !kameel || !ezel || !w) return json_({ ok: false, fout: "invoer" });
        if (stemmer === kameel || stemmer === ezel) return json_({ ok: false, fout: "zelf" });
        const opent = new Date(d.opent);
        if (isNaN(opent) || new Date() < opent) return json_({ ok: false, fout: "nog niet" });
        if (gesloten_().indexOf(w) >= 0) return json_({ ok: false, fout: "gesloten" });
        stemTab_().appendRow([new Date(), stemmer, kameel, ezel, w, ""]);
        return json_({ ok: true });
      }
      const naam = naam_(d.naam), voor = Number(d.voor), tegen = Number(d.tegen), aftrap = new Date(d.aftrap);
      if (!naam || !Number.isInteger(voor) || !Number.isInteger(tegen) || voor < 0 || tegen < 0 || voor > 40 || tegen > 40) return json_({ ok: false, fout: "invoer" });
      if (isNaN(aftrap) || aftrap <= new Date()) return json_({ ok: false, fout: "te laat" });
      voorspTab_().appendRow([new Date(), naam, voor, tegen, String(d.wedstrijd || "").slice(0, 120), aftrap.toISOString()]);
      return json_({ ok: true });
    } finally { lock.releaseLock(); }
  } catch (err) {
    return json_({ ok: false, fout: String(err) });
  }
}
