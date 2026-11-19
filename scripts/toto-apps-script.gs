/**
 * Kamelen – opslag voor de toto en de stemming "kameel en ezel van de dag".
 * Tabbladen: "Voorspellingen", "Stemmen" en "Gesloten" (welke stemmingen de beheerder heeft gesloten),
 * "Push" (telefoons met meldingen), "Fotos" en "Quotes". Foto's komen in de Drive-map "Kamelen foto's".
 * Scores en stemmen blijven verborgen tot de aftrap (toto) of tot de beheerder de stemming sluit.
 */
/* Persoonlijke codes: wie inlogt met een code IS die speler. Namen die de site meestuurt worden genegeerd. */
const SPELERCODES = {
  // "KameelMini1234": "Mini",
};
/* Coaches: mogen alles (stemmen, toto, foto's, quotes), maar je kunt niet op hen stemmen als kameel of ezel */
const COACHCODES = {
  // "CoachNaam": "Naam",
};
/* Invallers en oud-Kamelen: mogen stemmen (als ze meespeelden), foto's en quotes toevoegen, maar niet meedoen aan de Kamelen-Scorito.
   De naam moet hetzelfde zijn als in de invaller-rijen van het afwezigheidsblad. */
const INVALLERCODES = {
  // "InvallerNaam": "Naam",
};
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
const pushTab_ = () => tab_("Push", ["Tijdstempel", "Endpoint", "Abonnement", "Naam"]);
const fotoTab_ = () => tab_("Fotos", ["Tijdstempel", "Bestand-id", "Bijschrift", "Door"]);
const profielTab_ = () => tab_("Profielfotos", ["Naam", "Bestand-id", "Tijdstempel"]);
const quoteTab_ = () => tab_("Quotes", ["Tijdstempel", "Id", "Wie", "Quote", "Context", "Door"]);
const ideeTab_ = () => tab_("Ideeen", ["Tijdstempel", "Id", "Door", "Idee", "Soort", "Stemmen", "Status", "Reactie"]);
function fotoMap_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty("FOTOMAP");
  if (id) { try { return DriveApp.getFolderById(id); } catch (x) {} }
  const map = DriveApp.createFolder("Kamelen foto's");
  props.setProperty("FOTOMAP", map.getId());
  return map;
}
function rijMetId_(sh, kolom, id) {
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) if (String(rows[i][kolom]) === String(id)) return i + 1;
  return 0;
}
function pushRij_(endpoint) {
  const rows = pushTab_().getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) if (rows[i][1] === endpoint) return i + 1;
  return 0;
}
/* Wie speelde welke wedstrijd mee? Komt uit het gepubliceerde tabblad "Afwezigheid Wedstrijden":
   een leeg vakje (of "Te laat") = meegespeeld, plus de namen in de rijen "Invaller". */
const AANWEZIG_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSyZ0BNstIFRzEszqjoN0j_hG2q6AaZZ43tpw6OtztChcx_FJz7OZGUm1jxlYvOwKu9zEjN12Cb03h5/pub?gid=1818619826&single=true&output=csv";
const MAANDEN_ = { jan: 1, feb: 2, mrt: 3, maa: 3, apr: 4, mei: 5, jun: 6, jul: 7, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, dec: 12 };
function aanwezigKaart_() {
  const cache = CacheService.getScriptCache(), oud = cache.get("aanwezig2");
  if (oud) return JSON.parse(oud);
  let rows = [];
  try { rows = Utilities.parseCsv(UrlFetchApp.fetch(AANWEZIG_CSV, { muteHttpExceptions: true }).getContentText()); } catch (x) { return {}; }
  if (!rows.length) return {};
  const kolom = {};   // "MM-DD" -> kolomnummer (laatste blok wint: huidig seizoen)
  rows[0].forEach((h, i) => {
    const m = String(h || "").trim().toLowerCase().match(/^(\d{1,2})[\s-]+([a-z]+)/);
    if (i > 0 && m && MAANDEN_[m[2].slice(0, 3)]) kolom[("0" + MAANDEN_[m[2].slice(0, 3)]).slice(-2) + "-" + ("0" + m[1]).slice(-2)] = i;
  });
  const kaart = {};
  Object.keys(kolom).forEach(k => kaart[k] = []);
  let inSpelers = true, gezien = false;
  rows.slice(1).forEach(r => {
    const naam = String(r[0] || "").trim();
    if (!naam) { if (gezien) inSpelers = false; return; }
    if (/totaal aanwezig/i.test(naam)) return;
    const invaller = /invaller/i.test(naam);
    if (!invaller && !inSpelers) return;
    if (!invaller) gezien = true;
    Object.keys(kolom).forEach(k => {
      const v = String(r[kolom[k]] || "").trim();
      if (invaller) { if (v) kaart[k].push(v); }
      else if (!v || /^te laat$/i.test(v)) kaart[k].push(naam);
    });
  });
  if (Object.keys(kaart).length) cache.put("aanwezig2", JSON.stringify(kaart), 300);
  return kaart;
}
/* Namen die meespeelden op een datum (yyyy-mm-dd), of null als die datum niet in het blad staat */
function meegespeeld_(datum, kaart) {
  const k = String(datum || "").slice(5, 10), lijst = (kaart || aanwezigKaart_())[k];
  return lijst && lijst.length ? lijst.map(n => String(n).toLowerCase()) : null;
}
const rol_ = code => { const c = String(code || "").trim().toLowerCase(), heeft = o => Object.keys(o).some(k => k.toLowerCase() === c); return heeft(SPELERCODES) ? "speler" : heeft(COACHCODES) ? "coach" : heeft(INVALLERCODES) ? "invaller" : (extraCodes_()[c] || {}).rol || (automatischeInvaller_(code) ? "invaller" : ""); };
const isCoach_ = n => Object.keys(COACHCODES).some(k => COACHCODES[k] === n) || Object.keys(extraCodes_()).some(k => extraCodes_()[k].rol === "coach" && extraCodes_()[k].naam === n);
/* Telt een stem? Alleen als stemmer meespeelde (of coach is) en kameel en ezel meespeelden */
function stemGeldig_(stemmer, kameel, ezel, wedstrijd, kaart) {
  const mee = meegespeeld_(String(wedstrijd).split("|")[0], kaart);
  if (!mee) return true;   // datum (nog) niet in het blad: niet blokkeren
  const in_ = n => mee.indexOf(String(n || "").toLowerCase()) >= 0;
  return (in_(stemmer) || isCoach_(stemmer)) && in_(kameel) && in_(ezel);
}

/* Ezel van de dag: bij het sluiten van een stemming komt de ezel-liter vanzelf in het Liter-incassobureau.
   Daarvoor moet de spreadsheet met het tabblad "Liter incasso bureau" gedeeld zijn met het account van dit script (als bewerker). */
const LITER_SPREADSHEET = "1KnhrYXSgtc8-4dmv13gDVBqdkMlFhwekNFhM5T-okKk";
const LITER_TAB = "Liter incasso bureau";
const MAAND_KORT_ = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
function ezelsVan_(wedstrijd) {
  const kaart = aanwezigKaart_(), laatste = {};
  stemTab_().getDataRange().getValues().slice(1)
    .filter(r => r[4] === wedstrijd && stemGeldig_(r[1], r[2], r[3], r[4], kaart))
    .forEach(r => { laatste[String(r[1]).toLowerCase()] = r; });   // laatste stem per persoon telt
  const tel = {};
  Object.keys(laatste).forEach(k => { const e = laatste[k][3]; if (e) tel[e] = (tel[e] || 0) + 1; });
  const max = Math.max(0, ...Object.keys(tel).map(k => tel[k]));
  return max ? Object.keys(tel).filter(k => tel[k] === max) : [];
}
function ezelLiterBoeken_(wedstrijd) {
  const ezels = ezelsVan_(wedstrijd); if (!ezels.length) return { ezels: [], geboekt: [] };
  const delen = String(wedstrijd).split("|"), datum = delen[0], tegen = delen.slice(1).find(t => !/gchc h13|kamel/i.test(t)) || "";
  const reden = "Ezel van de dag (tegen " + tegen + ")";
  const d = datum.split("-");
  const wanneer = Number(d[2]) + " " + MAAND_KORT_[Number(d[1]) - 1] + " wedstrijd";
  const sh = SpreadsheetApp.openById(LITER_SPREADSHEET).getSheetByName(LITER_TAB);
  const bestaand = sh.getDataRange().getValues().map(r => String(r[0]).trim().toLowerCase() + "|" + String(r[2]).trim().toLowerCase());
  const geboekt = [];
  ezels.forEach(n => {
    if (bestaand.indexOf(n.toLowerCase() + "|" + reden.toLowerCase()) >= 0) return;   // al geboekt
    sh.appendRow([n, wanneer, reden, "1L", ""]);
    geboekt.push(n);
  });
  return { ezels, geboekt };
}

function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
const gelijk_ = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
const naam_ = n => String(n || "").trim().slice(0, 40);
/* Nieuwe invallers krijgen vanzelf een code: "Invaller" + naam (of "Oudkameel" + naam),
   zodra die naam in een invaller-rij van het afwezigheidsblad staat. Je hoeft dan niets aan dit script te veranderen. */
const zonderAccent_ = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toLowerCase();
function invallerNamen_() {
  const cache = CacheService.getScriptCache(), oud = cache.get("invallers");
  if (oud) return JSON.parse(oud);
  let rows = [];
  try { rows = Utilities.parseCsv(UrlFetchApp.fetch(AANWEZIG_CSV, { muteHttpExceptions: true }).getContentText()); } catch (x) { return []; }
  const namen = [];
  rows.forEach(r => { if (/invaller/i.test(String(r[0] || ""))) r.slice(1).forEach(v => { v = String(v || "").trim(); if (v && namen.indexOf(v) < 0) namen.push(v); }); });
  if (namen.length) cache.put("invallers", JSON.stringify(namen), 300);
  return namen;
}
/* Extra codes uit het tabblad "Inlogcodes" (in de spreadsheet van het Liter-incassobureau).
   Kolommen: Code | Naam | Rol (speler, coach of invaller). Claude kan hier codes toevoegen,
   zonder dat dit script aangepast hoeft te worden. */
function extraCodes_() {
  const cache = CacheService.getScriptCache(), oud = cache.get("extracodes");
  if (oud) return JSON.parse(oud);
  const lijst = {};
  try {
    const sh = SpreadsheetApp.openById(LITER_SPREADSHEET).getSheetByName("Inlogcodes");
    if (sh) sh.getDataRange().getValues().slice(1).forEach(r => {
      const code = String(r[0] || "").trim().toLowerCase(), naam = String(r[1] || "").trim();
      const rol = /coach/i.test(r[2]) ? "coach" : /speler/i.test(r[2]) ? "speler" : "invaller";
      if (code && naam) lijst[code] = { naam, rol };
    });
  } catch (x) { return {}; }
  cache.put("extracodes", JSON.stringify(lijst), 60);
  return lijst;
}
function automatischeInvaller_(code) {
  const m = String(code || "").trim().match(/^(invaller|oudkameel)(.+)$/i); if (!m) return "";
  const gezocht = zonderAccent_(m[2]);
  return invallerNamen_().find(n => zonderAccent_(n) === gezocht) || "";
}
function speler_(code) {
  const c = String(code || "").trim().toLowerCase();
  for (const k in SPELERCODES) if (k.toLowerCase() === c) return SPELERCODES[k];
  for (const k in COACHCODES) if (k.toLowerCase() === c) return COACHCODES[k];
  for (const k in INVALLERCODES) if (k.toLowerCase() === c) return INVALLERCODES[k];
  const extra = extraCodes_()[c]; if (extra) return extra.naam;
  return automatischeInvaller_(code);
}

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
    const abonnementen = pushTab_().getDataRange().getValues().slice(1).map(r => { try { const a = JSON.parse(r[2]); a.naam = String(r[3] || ""); return a; } catch (x) { return null; } }).filter(Boolean);
    return json_({ ok: true, abonnementen });
  }
  const nu = new Date();
  const dicht = gesloten_();
  const voorspellingen = voorspTab_().getDataRange().getValues().slice(1).map(r => {
    const open = r[5] && new Date(r[5]) > nu;
    return { tijd: r[0], naam: r[1], voor: open ? null : r[2], tegen: open ? null : r[3], wedstrijd: r[4], aftrap: r[5] };
  });
  const kaart = aanwezigKaart_();
  const stemmen = stemTab_().getDataRange().getValues().slice(1).filter(r => stemGeldig_(r[1], r[2], r[3], r[4], kaart)).map(r => {
    const zichtbaar = dicht.indexOf(r[4]) >= 0;
    return { tijd: r[0], stemmer: r[1], kameel: zichtbaar ? r[2] : null, ezel: zichtbaar ? r[3] : null, wedstrijd: r[4] };
  });
  const fotos = fotoTab_().getDataRange().getValues().slice(1).map(r => ({ tijd: r[0], id: r[1], bijschrift: r[2], door: r[3], soort: r[4] || "foto" }));
  const quotes = quoteTab_().getDataRange().getValues().slice(1).map(r => ({ tijd: r[0], id: r[1], wie: r[2], tekst: r[3], context: r[4], door: r[5] }));
  const profielfotos = {};
  profielTab_().getDataRange().getValues().slice(1).forEach(r => { if (r[0] && r[1]) profielfotos[r[0]] = r[1]; });
  const ideeen = ideeTab_().getDataRange().getValues().slice(1).filter(r => r[1]).map(r => ({ tijd: r[0], id: r[1], door: r[2], tekst: r[3], soort: r[4], stemmen: String(r[5] || "").split(",").filter(String), status: r[6] || "nieuw", reactie: r[7] || "" }));
  return json_({ ok: true, voorspellingen, stemmen, gesloten: dicht, fotos, quotes, profielfotos, ideeen });
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
        if (d.actie === "verwijder-foto") {
          const rij = rijMetId_(fotoTab_(), 1, d.id);
          if (rij) { try { DriveApp.getFileById(String(d.id)).setTrashed(true); } catch (x) {} fotoTab_().deleteRow(rij); }
          return json_({ ok: true });
        }
        /* Ideeënbox: status en reactie zetten, of een idee weghalen */
        if (d.actie === "idee-status") {
          const rij = rijMetId_(ideeTab_(), 1, d.id);
          if (rij) {
            if (["nieuw", "gepland", "gedaan", "afgewezen"].indexOf(d.status) >= 0) ideeTab_().getRange(rij, 7).setValue(d.status);
            if (typeof d.reactie === "string") ideeTab_().getRange(rij, 8).setValue(d.reactie.slice(0, 300));
          }
          return json_({ ok: true });
        }
        if (d.actie === "verwijder-idee") {
          const rij = rijMetId_(ideeTab_(), 1, d.id);
          if (rij) ideeTab_().deleteRow(rij);
          return json_({ ok: true });
        }
        if (d.actie === "verwijder-quote") {
          const rij = rijMetId_(quoteTab_(), 1, d.id);
          if (rij) quoteTab_().deleteRow(rij);
          return json_({ ok: true });
        }
        const w = String(d.wedstrijd || "").slice(0, 120);
        if (!w || (d.actie !== "sluit" && d.actie !== "heropen")) return json_({ ok: false, fout: "invoer" });
        sluitTab_().appendRow([new Date(), w, d.actie === "sluit" ? "dicht" : "open"]);
        if (d.actie === "sluit") {
          try { return json_({ ok: true, ezelliter: ezelLiterBoeken_(w) }); }
          catch (x) { return json_({ ok: true, ezelliterFout: String(x) }); }
        }
        return json_({ ok: true });
      }
      /* Meldingen aan- of uitzetten op een telefoon */
      if (d.type === "push-aan" || d.type === "push-uit") {
        const sub = d.abonnement || {}, endpoint = String(sub.endpoint || "");
        if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000) return json_({ ok: false, fout: "invoer" });
        const rij = pushRij_(endpoint);
        if (d.type === "push-uit") { if (rij) pushTab_().deleteRow(rij); return json_({ ok: true }); }
        const tekst = JSON.stringify({ endpoint, keys: { p256dh: String((sub.keys || {}).p256dh || "").slice(0, 200), auth: String((sub.keys || {}).auth || "").slice(0, 100) } });
        const wie = speler_(d.code);   // zo weet de meldingen-robot van wie deze telefoon is
        if (rij) pushTab_().getRange(rij, 1, 1, 4).setValues([[new Date(), endpoint, tekst, wie]]);
        else pushTab_().appendRow([new Date(), endpoint, tekst, wie]);
        return json_({ ok: true });
      }
      /* Robot ruimt verlopen abonnementen op */
      if (d.type === "push-weg") {
        if (d.pushcode !== PUSHCODE) return json_({ ok: false, fout: "pushcode" });
        (d.endpoints || []).forEach(ep => { const rij = pushRij_(ep); if (rij) pushTab_().deleteRow(rij); });
        return json_({ ok: true });
      }
      /* Inloggen: geeft de naam terug die bij de persoonlijke code hoort */
      const ik = speler_(d.code);
      if (d.type === "login") { if (!ik) { Utilities.sleep(800); return json_({ ok: false, fout: "code" }); } return json_({ ok: true, naam: ik, rol: rol_(d.code) }); }
      if (!ik) return json_({ ok: false, fout: "code" });
      /* Foto toevoegen (de site verkleint hem eerst tot een JPEG van maximaal 1600 pixels) */
      if (d.type === "foto") {
        const data = String(d.data || "");
        if (!/^[A-Za-z0-9+/=]+$/.test(data) || data.length > 4500000) return json_({ ok: false, fout: "invoer" });
        const blob = Utilities.newBlob(Utilities.base64Decode(data), "image/jpeg", "kamelen-" + Date.now() + ".jpg");
        const bestand = fotoMap_().createFile(blob);
        bestand.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        fotoTab_().appendRow([new Date(), bestand.getId(), String(d.bijschrift || "").slice(0, 200), ik]);
        return json_({ ok: true, id: bestand.getId() });
      }
      /* Video: de site uploadt het bestand zelf rechtstreeks naar Drive (te groot om via dit script te sturen).
         Stap 1: het script opent een upload-sessie voor alleen dat ene bestand in de fotomap en geeft het upload-adres terug. */
      if (d.type === "video-start") {
        const mime = /^video\/[\w.+-]+$/.test(String(d.mime || "")) ? String(d.mime) : "video/mp4";
        const grootte = Number(d.grootte) || 0;
        if (!grootte || grootte > 700 * 1024 * 1024) return json_({ ok: false, fout: "Video is te groot (max. 700 MB)." });
        const naam = String(d.naam || "video").replace(/[^\w.\- ]/g, "").slice(-60) || "video.mp4";
        const res = UrlFetchApp.fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id", {
          method: "post", contentType: "application/json; charset=UTF-8", muteHttpExceptions: true,
          headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken(), "X-Upload-Content-Type": mime, "X-Upload-Content-Length": String(grootte), Origin: "https://kamelenhockey.github.io" },
          payload: JSON.stringify({ name: "kamelen-video-" + Date.now() + "-" + naam, parents: [fotoMap_().getId()], mimeType: mime })
        });
        const h = res.getHeaders(), loc = h.Location || h.location;
        if (res.getResponseCode() !== 200 || !loc) return json_({ ok: false, fout: "Drive gaf fout " + res.getResponseCode() });
        return json_({ ok: true, url: loc });
      }
      /* Stap 2: upload klaar. Alleen bestanden uit de fotomap tellen. */
      if (d.type === "video-klaar") {
        const id = String(d.id || "");
        if (!/^[\w-]{10,}$/.test(id)) return json_({ ok: false, fout: "invoer" });
        const f = DriveApp.getFileById(id), ouders = f.getParents();
        if (!ouders.hasNext() || ouders.next().getId() !== fotoMap_().getId() || !/^video\//.test(f.getMimeType())) return json_({ ok: false, fout: "invoer" });
        f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        const sh = fotoTab_();
        if (!sh.getRange(1, 5).getValue()) sh.getRange(1, 5).setValue("Soort");
        sh.appendRow([new Date(), id, String(d.bijschrift || "").slice(0, 200), ik, "video"]);
        return json_({ ok: true, id: id });
      }
      /* Eigen profielfoto (de site maakt er eerst een vierkante JPEG van 512 px van). Een oude foto gaat naar de prullenbak. */
      if (d.type === "profielfoto") {
        const data = String(d.data || "");
        if (!/^[A-Za-z0-9+/=]+$/.test(data) || data.length > 1500000) return json_({ ok: false, fout: "invoer" });
        const bestand = fotoMap_().createFile(Utilities.newBlob(Utilities.base64Decode(data), "image/jpeg", "profiel-" + ik + "-" + Date.now() + ".jpg"));
        bestand.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        const sh = profielTab_(), rij = rijMetId_(sh, 0, ik);
        if (rij) {
          try { DriveApp.getFileById(String(sh.getRange(rij, 2).getValue())).setTrashed(true); } catch (x) {}
          sh.getRange(rij, 1, 1, 3).setValues([[ik, bestand.getId(), new Date()]]);
        } else sh.appendRow([ik, bestand.getId(), new Date()]);
        return json_({ ok: true, id: bestand.getId() });
      }
      /* Quote toevoegen */
      /* Ideeënbox: idee toevoegen, (on)stemmen, eigen idee weghalen */
      if (d.type === "idee") {
        const tekst = String(d.tekst || "").trim().slice(0, 600);
        const soort = ["app", "team", "derde helft", "anders"].indexOf(d.soort) >= 0 ? d.soort : "anders";
        if (tekst.length < 3) return json_({ ok: false, fout: "invoer" });
        ideeTab_().appendRow([new Date(), Utilities.getUuid().slice(0, 8), ik, tekst, soort, ik, "nieuw", ""]);
        return json_({ ok: true });
      }
      if (d.type === "idee-stem") {
        const sh = ideeTab_(), rij = rijMetId_(sh, 1, d.id);
        if (!rij) return json_({ ok: false, fout: "weg" });
        const lock = LockService.getScriptLock(); lock.waitLock(5000);
        try {
          const cel = sh.getRange(rij, 6), l = String(cel.getValue() || "").split(",").filter(String), i = l.indexOf(ik);
          if (i >= 0) l.splice(i, 1); else l.push(ik);
          cel.setValue(l.join(","));
        } finally { lock.releaseLock(); }
        return json_({ ok: true });
      }
      if (d.type === "idee-weg") {
        const sh = ideeTab_(), rij = rijMetId_(sh, 1, d.id);
        if (rij && sh.getRange(rij, 3).getValue() === ik) sh.deleteRow(rij);
        return json_({ ok: true });
      }
      if (d.type === "quote") {
        const wie = naam_(d.wie), tekst = String(d.tekst || "").trim().slice(0, 400);
        if (!wie || !tekst) return json_({ ok: false, fout: "invoer" });
        quoteTab_().appendRow([new Date(), Utilities.getUuid().slice(0, 8), wie, tekst, String(d.context || "").trim().slice(0, 200), ik]);
        return json_({ ok: true });
      }
      if (d.type === "stem") {
        const stemmer = ik, kameel = naam_(d.kameel), ezel = naam_(d.ezel), w = String(d.wedstrijd || "").slice(0, 120);
        if (!stemmer || !kameel || !ezel || !w) return json_({ ok: false, fout: "invoer" });
        if (stemmer === kameel || stemmer === ezel) return json_({ ok: false, fout: "zelf" });
        const coaches = Object.keys(COACHCODES).map(k => COACHCODES[k]);
        if (coaches.indexOf(kameel) >= 0 || coaches.indexOf(ezel) >= 0) return json_({ ok: false, fout: "coach" });
        const mee = meegespeeld_(w.split("|")[0]);
        if (mee) {
          if (mee.indexOf(stemmer.toLowerCase()) < 0 && !isCoach_(stemmer)) return json_({ ok: false, fout: "niet mee" });
          if (mee.indexOf(kameel.toLowerCase()) < 0 || mee.indexOf(ezel.toLowerCase()) < 0) return json_({ ok: false, fout: "niet gespeeld" });
        }
        const opent = new Date(d.opent);
        if (isNaN(opent) || new Date() < opent) return json_({ ok: false, fout: "nog niet" });
        if (gesloten_().indexOf(w) >= 0) return json_({ ok: false, fout: "gesloten" });
        stemTab_().appendRow([new Date(), stemmer, kameel, ezel, w, ""]);
        return json_({ ok: true });
      }
      if (rol_(d.code) === "invaller") return json_({ ok: false, fout: "invaller" });
      const naam = ik, voor = Number(d.voor), tegen = Number(d.tegen), aftrap = new Date(d.aftrap);
      if (!naam || !Number.isInteger(voor) || !Number.isInteger(tegen) || voor < 0 || tegen < 0 || voor > 40 || tegen > 40) return json_({ ok: false, fout: "invoer" });
      if (isNaN(aftrap) || aftrap <= new Date()) return json_({ ok: false, fout: "te laat" });
      voorspTab_().appendRow([new Date(), naam, voor, tegen, String(d.wedstrijd || "").slice(0, 120), aftrap.toISOString()]);
      return json_({ ok: true });
    } finally { lock.releaseLock(); }
  } catch (err) {
    return json_({ ok: false, fout: String(err) });
  }
}

/* Eén keer uitvoeren in de editor (knop "Uitvoeren") om toestemming voor Google Drive te geven */
function machtigen() {
  Logger.log("Fotomap: " + fotoMap_().getUrl());
  try {
    const r = UrlFetchApp.fetch(AANWEZIG_CSV, { muteHttpExceptions: true });
    Logger.log("Afwezigheidsblad: status " + r.getResponseCode() + ", begint met: " + r.getContentText().slice(0, 80));
  } catch (x) { Logger.log("Afwezigheidsblad: FOUT " + x); }
  CacheService.getScriptCache().remove("aanwezig2");
  CacheService.getScriptCache().remove("extracodes");
  Logger.log("Extra inlogcodes: " + JSON.stringify(extraCodes_()));
  try { Logger.log("Liter-incassobureau: " + SpreadsheetApp.openById(LITER_SPREADSHEET).getSheetByName(LITER_TAB).getLastRow() + " regels, schrijven kan."); }
  catch (x) { Logger.log("Liter-incassobureau: FOUT " + x + " (deel de spreadsheet met dit account als bewerker)"); }
  Logger.log("Meegespeeld: " + JSON.stringify(aanwezigKaart_()));
}
