// Bewaart een kopie van dit seizoen in archief/<seizoen>/, zodat je volgend seizoen kunt terugkijken.
// hockey.nl gooit oude seizoenen weg; zolang dit seizoen loopt, wordt de kopie bij elke run bijgewerkt.
// Komt er een nieuw seizoen in competitie.json, dan ontstaat vanzelf een nieuwe map en blijft de oude staan.
import { readFile, writeFile, mkdir } from "node:fs/promises";

const lees = async (f, fallback) => { try { return await readFile(f, "utf8"); } catch { return fallback; } };
const comp = JSON.parse(await lees("competitie.json", "{}"));
const datums = [...(comp.uitslagen || []), ...(comp.programma || [])].map(w => w.datum).filter(Boolean).sort();
if (!datums.length) { console.log("Geen wedstrijden: niets te archiveren."); process.exit(0); }

// Seizoen loopt van augustus tot en met juli
const [j, m] = datums[0].split("-").map(Number);
const start = m >= 8 ? j : j - 1;
const seizoen = `${start}-${start + 1}`, label = `${start}/${String(start + 1).slice(2)}`;
const map = `archief/${seizoen}`;
await mkdir(map, { recursive: true });

// Puntenaftrek-moment staat (nog) in index.html; meenemen zodat het seizoensverloop later klopt
const html = await lees("index.html", "");
const aftrekMoment = comp.aftrekMoment || (() => { const r = html.match(/aftrekMoment:\s*(\{[^}]*\})/); try { return r ? JSON.parse(r[1]) : {}; } catch { return {}; } })();
await writeFile(`${map}/competitie.json`, JSON.stringify({ ...comp, aftrekMoment, seizoen, seizoenLabel: label }, null, 1) + "\n");

for (const f of ["liters.json", "spelers.json", "opstelling.json"]) {
  const t = await lees(f, null); if (t) await writeFile(`${map}/${f}`, t);
}
// Doelpunten en liters komen uit gepubliceerde spreadsheets: de laatste stand bewaren
const csv = naam => (html.match(new RegExp(`const ${naam} = "([^"]+)"`)) || [])[1];
for (const [naam, bestand] of [["DOELPUNTEN_CSV", "doelpunten.csv"], ["LITERS_CSV", "liters.csv"]]) {
  const url = csv(naam); if (!url) continue;
  try { const r = await fetch(url); const t = await r.text(); if (r.ok && t.trim() && !/^\s*</.test(t)) await writeFile(`${map}/${bestand}`, t); }
  catch (e) { console.log(`${bestand} niet opgehaald: ${e.message}`); }
}

// Lijst met seizoenen bijwerken
const lijst = JSON.parse(await lees("archief/index.json", "[]")).filter(s => s.seizoen !== seizoen);
lijst.push({ seizoen, label, competitie: comp.competitie || "", eindstand: (comp.stand || []).find(t => /GCHC H13/.test(t.team))?.positie || null });
lijst.sort((a, b) => b.seizoen.localeCompare(a.seizoen));
await writeFile("archief/index.json", JSON.stringify(lijst, null, 1) + "\n");
console.log(`Seizoen ${label} bewaard in ${map}.`);
