/**
 * Kamelen-toto – opslag voor voorspellingen (Google Apps Script)
 * De site stuurt voorspellingen hierheen; ze worden bewaard in het tabblad "Voorspellingen".
 * Voorspellingen voor wedstrijden die nog niet begonnen zijn, worden verborgen teruggegeven
 * (alleen de naam), zodat niemand kan afkijken.
 */
const TEAMCODE = "VUL-HIER-JULLIE-CODE-IN";   // dezelfde code deel je in de teamapp
const TAB = "Voorspellingen";

function tab_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(TAB);
  if (!sh) {
    sh = ss.insertSheet(TAB);
    sh.appendRow(["Tijdstempel", "Naam", "Doelpunten Kamelen", "Doelpunten tegenstander", "Wedstrijd", "Aftrap"]);
    sh.setFrozenRows(1);
  }
  return sh;
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  const nu = new Date();
  const rijen = tab_().getDataRange().getValues().slice(1).map(r => {
    const aftrap = r[5] ? new Date(r[5]) : null;
    const open = aftrap && aftrap > nu;   // wedstrijd nog niet begonnen: score verbergen
    return { tijd: r[0], naam: r[1], voor: open ? null : r[2], tegen: open ? null : r[3], wedstrijd: r[4], aftrap: r[5] };
  });
  return json_({ ok: true, voorspellingen: rijen });
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents || "{}");
    if (String(d.code || "").trim().toLowerCase() !== TEAMCODE.toLowerCase()) return json_({ ok: false, fout: "code" });
    const naam = String(d.naam || "").trim().slice(0, 40);
    const voor = Number(d.voor), tegen = Number(d.tegen);
    const aftrap = new Date(d.aftrap);
    if (!naam || !Number.isInteger(voor) || !Number.isInteger(tegen) || voor < 0 || tegen < 0 || voor > 40 || tegen > 40) return json_({ ok: false, fout: "invoer" });
    if (isNaN(aftrap) || aftrap <= new Date()) return json_({ ok: false, fout: "te laat" });
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    tab_().appendRow([new Date(), naam, voor, tegen, String(d.wedstrijd || "").slice(0, 120), aftrap.toISOString()]);
    lock.releaseLock();
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, fout: String(err) });
  }
}
