// Leest het tabblad "Liter incasso bureau" (gepubliceerd als CSV) en schrijft liters.json.
import { readFile, writeFile } from "node:fs/promises";
import { parseCsv } from "./parse.mjs";

const url = process.env.LITERS_CSV_URL;
if (!url) throw new Error("LITERS_CSV_URL ontbreekt in .github/workflows/liters.yml.");

const res = await fetch(url, { redirect: "follow" });
if (!res.ok) throw new Error(`Spreadsheet niet bereikbaar (HTTP ${res.status}).`);
const rijen = parseCsv(await res.text());

const liters = rijen.slice(1)
  .filter(r => (r[0] || "").trim())
  .map(r => ({ naam: r[0] || "", datum: r[1] || "", reden: r[2] || "", hoeveel: r[3] || "", status: r[4] || "" }));

const oud = JSON.parse(await readFile("liters.json", "utf8"));
if (!liters.length || liters.length < oud.liters.length / 2)
  throw new Error(`Maar ${liters.length} regels gevonden (was ${oud.liters.length}) – niets bijgewerkt.`);

await writeFile("liters.json", JSON.stringify({ ...oud, liters, bijgewerkt: new Date().toISOString() }, null, 1) + "\n");
console.log(`Literklassement: ${liters.length} regels.`);
