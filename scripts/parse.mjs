// Zet de zichtbare tekst van het hockey.nl Match Center om naar gegevens voor de site.
const MAANDEN = { januari:1, februari:2, maart:3, april:4, mei:5, juni:6, juli:7, augustus:8, september:9, oktober:10, november:11, december:12 };
const DAG = /^(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag) (\d{1,2}) ([a-z]+)(?: (\d{4}))?$/i;

// Seizoen loopt van augustus t/m juli: zonder jaartal hoort aug-dec bij het startjaar.
export function seizoenStartjaar(nu = new Date()) {
  return nu.getMonth() + 1 >= 7 ? nu.getFullYear() : nu.getFullYear() - 1;
}

function regelsNa(tekst, kop) {
  const regels = tekst.split("\n").map(r => r.trim()).filter(Boolean);
  const i = regels.indexOf(kop);
  const eind = regels.indexOf("Personaliseer weergave");
  return regels.slice(i >= 0 ? i + 1 : 0, eind >= 0 ? eind : undefined);
}

function parseDrietallen(regels, middenKey, startjaar) {
  const uit = []; let datum = null; let buf = [];
  for (const r of regels) {
    const m = r.match(DAG);
    if (m) {
      const maand = MAANDEN[m[3].toLowerCase()];
      if (!maand) continue;
      const jaar = m[4] ? Number(m[4]) : (maand >= 7 ? startjaar : startjaar + 1);
      datum = `${jaar}-${String(maand).padStart(2, "0")}-${String(m[2]).padStart(2, "0")}`;
      buf = []; continue;
    }
    if (!datum) continue;
    buf.push(r);
    if (buf.length === 3) {
      uit.push({ datum, thuis: buf[0], [middenKey]: buf[1], uit: buf[2] });
      buf = [];
    }
  }
  return uit;
}

export function parseProgramma(tekst, startjaar) {
  return parseDrietallen(regelsNa(tekst, "Uitslagen"), "tijd", startjaar)
    .map(w => ({ ...w, tijd: /^\d{1,2}:\d{2}$/.test(w.tijd) ? w.tijd : null }));
}

export function parseUitslagen(tekst, startjaar) {
  return parseDrietallen(regelsNa(tekst, "Uitslagen"), "score", startjaar)
    .filter(w => /^\d+-\d+$/.test(w.score));
}

export function parseStand(tekst) {
  const regels = tekst.split("\n").map(r => r.trim()).filter(Boolean);
  const start = regels.findIndex((r, i) => r === "#" && regels[i + 1] === "Team");
  if (start < 0) return { stand: [], standPer: null };
  // Kolomkoppen overslaan tot de eerste positie "1"
  let i = start; while (i < regels.length && regels[i] !== "1") i++;
  const stand = [];
  while (i < regels.length) {
    if (!/^\d+$/.test(regels[i])) break;
    const positie = Number(regels[i++]);
    if (regels[i] === "=" || regels[i] === "▲" || regels[i] === "▼") i++;
    const team = regels[i++];
    const [gs, pt, ds] = [regels[i++], regels[i++], regels[i++]].map(Number);
    if ([gs, pt, ds].some(Number.isNaN)) break;
    stand.push({ positie, team, gespeeld: gs, punten: pt, doelsaldo: ds });
  }
  const per = tekst.match(/Stand per (\d{2}-\d{2}-\d{4})/);
  return { stand, standPer: per ? per[1] : null };
}

// Puntenaftrek = berekende punten uit de uitslagen min officiële punten (alleen als > 0)
export function berekenAftrek(stand, uitslagen) {
  const pt = {};
  for (const w of uitslagen) {
    const [a, b] = w.score.split("-").map(Number);
    pt[w.thuis] = (pt[w.thuis] || 0) + (a > b ? 3 : a === b ? 1 : 0);
    pt[w.uit] = (pt[w.uit] || 0) + (b > a ? 3 : a === b ? 1 : 0);
  }
  const aftrek = {};
  for (const t of stand) {
    const verschil = (pt[t.team] || 0) - t.punten;
    if (verschil > 0) aftrek[t.team] = verschil;
  }
  return aftrek;
}

// Eenvoudige CSV-lezer (Google Sheets "Publiceren op internet")
export function parseCsv(tekst) {
  const rijen = []; let rij = []; let veld = ""; let q = false;
  for (let i = 0; i < tekst.length; i++) {
    const c = tekst[i];
    if (q) {
      if (c === '"' && tekst[i + 1] === '"') { veld += '"'; i++; }
      else if (c === '"') q = false;
      else veld += c;
    } else if (c === '"') q = true;
    else if (c === ",") { rij.push(veld); veld = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && tekst[i + 1] === "\n") i++;
      rij.push(veld); rijen.push(rij); rij = []; veld = "";
    } else veld += c;
  }
  if (veld !== "" || rij.length) { rij.push(veld); rijen.push(rij); }
  return rijen;
}

// ---------- Agenda (.ics) ----------
// Lokale Amsterdamse tijd -> UTC-tijdstempel voor ICS ("20261117T180000Z")
export function amsterdamNaarUtc(datum, tijd) {
  const [y, m, d] = datum.split("-").map(Number);
  const [h, mi] = tijd.split(":").map(Number);
  let gok = Date.UTC(y, m - 1, d, h, mi);
  for (let i = 0; i < 2; i++) {
    const delen = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Amsterdam", hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(gok)).map(p => [p.type, p.value]));
    const lokaal = Date.UTC(+delen.year, +delen.month - 1, +delen.day, +delen.hour, +delen.minute);
    gok += Date.UTC(y, m - 1, d, h, mi) - lokaal;
  }
  return new Date(gok).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
const icsTekst = t => String(t || "").replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
function vouw(regel) { // max 75 tekens per regel
  const uit = []; let r = regel;
  while (r.length > 74) { uit.push(r.slice(0, 74)); r = " " + r.slice(74); }
  uit.push(r); return uit.join("\r\n");
}
export function maakIcs(programma, ons = /gchc/i, stempel = new Date().toISOString()) {
  const dtstamp = stempel.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const ev = programma.filter(w => ons.test(w.thuis + w.uit)).map(w => {
    const thuis = ons.test(w.thuis), tegen = thuis ? w.uit : w.thuis;
    const uid = `${w.datum}-${w.thuis}-${w.uit}`.replace(/[^A-Za-z0-9-]/g, "") + "@kamelenhockey.github.io";
    const regels = ["BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${dtstamp}`];
    if (w.tijd) {
      const start = amsterdamNaarUtc(w.datum, w.tijd);
      const [h, m] = w.tijd.split(":").map(Number);
      const eindMin = h * 60 + m + 105, eindTijd = `${String(Math.floor(eindMin / 60) % 24).padStart(2, "0")}:${String(eindMin % 60).padStart(2, "0")}`;
      regels.push(`DTSTART:${start}`, `DTEND:${amsterdamNaarUtc(w.datum, eindTijd)}`);
    } else {
      const d = w.datum.replace(/-/g, "");
      const volgende = new Date(Date.UTC(...w.datum.split("-").map((x, i) => i === 1 ? x - 1 : +x)) + 864e5).toISOString().slice(0, 10).replace(/-/g, "");
      regels.push(`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${volgende}`);
    }
    regels.push(`SUMMARY:${icsTekst(`🐪 ${w.thuis} – ${w.uit}`)}`);
    const loc = [w.accommodatie, w.adres].filter(Boolean).join(", ");
    if (loc) regels.push(`LOCATION:${icsTekst(loc)}`);
    regels.push(`DESCRIPTION:${icsTekst([`${thuis ? "Thuis" : "Uit"} tegen ${tegen}`, w.tijd ? "" : "Aanvangstijd nog niet bekend.", w.veld ? `Veld: ${w.veld}` : "", "https://kamelenhockey.github.io/kamelen/"].filter(Boolean).join("\n"))}`);
    regels.push("END:VEVENT");
    return regels.map(vouw).join("\r\n");
  });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Kamelen//Wedstrijden//NL", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "X-WR-CALNAME:Kamelen – wedstrijden", "X-WR-TIMEZONE:Europe/Amsterdam", "REFRESH-INTERVAL;VALUE=DURATION:PT6H", "X-PUBLISHED-TTL:PT6H",
    ...ev, "END:VCALENDAR"].join("\r\n") + "\r\n";
}
