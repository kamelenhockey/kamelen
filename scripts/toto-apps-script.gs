/**
 * Kamelen – opslag voor de toto en de stemming "kameel en ezel van de dag".
 * Voorspellingen komen in het tabblad "Voorspellingen", stemmen in "Stemmen".
 * Zolang een wedstrijd nog niet begonnen is (toto) of de stemming nog loopt,
 * worden alleen de namen teruggegeven, zodat niemand kan afkijken.
 */
const TEAMCODE = "VUL-HIER-JULLIE-CODE-IN";

function tab_(naam, kop) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(naam);
  if (!sh) { sh = ss.insertSheet(naam); sh.appendRow(kop); sh.setFrozenRows(1); }
  return sh;
}
const voorspTab_ = () => tab_("Voorspellingen", ["Tijdstempel", "Naam", "Doelpunten Kamelen", "Doelpunten tegenstander", "Wedstrijd", "Aftrap"]);
const stemTab_ = () => tab_("Stemmen", ["Tijdstempel", "Stemmer", "Kameel", "Ezel", "Wedstrijd", "Sluit"]);
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
const codeOk_ = d => String(d.code || "").trim().toLowerCase() === TEAMCODE.toLowerCase();
const naam_ = n => String(n || "").trim().slice(0, 40);

function doGet() {
  const nu = new Date();
  const voorspellingen = voorspTab_().getDataRange().getValues().slice(1).map(r => {
    const open = r[5] && new Date(r[5]) > nu;
    return { tijd: r[0], naam: r[1], voor: open ? null : r[2], tegen: open ? null : r[3], wedstrijd: r[4], aftrap: r[5] };
  });
  const stemmen = stemTab_().getDataRange().getValues().slice(1).map(r => {
    const open = r[5] && new Date(r[5]) > nu;
    return { tijd: r[0], stemmer: r[1], kameel: open ? null : r[2], ezel: open ? null : r[3], wedstrijd: r[4], sluit: r[5] };
  });
  return json_({ ok: true, voorspellingen, stemmen });
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents || "{}");
    if (!codeOk_(d)) return json_({ ok: false, fout: "code" });
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      if (d.type === "stem") {
        const stemmer = naam_(d.stemmer), kameel = naam_(d.kameel), ezel = naam_(d.ezel);
        const opent = new Date(d.opent), sluit = new Date(d.sluit), nu = new Date();
        if (!stemmer || !kameel || !ezel) return json_({ ok: false, fout: "invoer" });
        if (stemmer === kameel || stemmer === ezel) return json_({ ok: false, fout: "zelf" });
        if (isNaN(opent) || isNaN(sluit) || nu < opent) return json_({ ok: false, fout: "nog niet" });
        if (nu > sluit) return json_({ ok: false, fout: "gesloten" });
        stemTab_().appendRow([nu, stemmer, kameel, ezel, String(d.wedstrijd || "").slice(0, 120), sluit.toISOString()]);
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
