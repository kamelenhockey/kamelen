// Zet elke nacht het juiste app-icoon klaar: met hoedje of zonnebril in de juiste week, anders het gewone icoon.
// Zelfde regels als seizoen.js in de app.
import { copyFileSync, readFileSync } from "node:fs";

const nl = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Amsterdam" }));
const dag = new Date(nl.getFullYear(), nl.getMonth(), nl.getDate());
const inWeekVan = (m, d) => {
  const f = new Date(dag.getFullYear(), m, d);
  const ma = new Date(f); ma.setDate(f.getDate() - ((f.getDay() + 6) % 7));
  const zo = new Date(ma); zo.setDate(ma.getDate() + 6);
  return dag >= ma && dag <= zo;
};
const seizoen = inWeekVan(2, 17) ? "patrick" : inWeekVan(11, 5) ? "sint" : inWeekVan(11, 25) ? "kerst"
  : (dag.getMonth() === 6 || dag.getMonth() === 7) ? "zomer" : "standaard";

for (const f of ["icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"]) {
  const bron = `icons/${seizoen}/${f}`;
  if (!readFileSync(bron).equals(readFileSync(f))) { copyFileSync(bron, f); console.log(`${f} -> ${seizoen}`); }
}
console.log("Seizoen:", seizoen);
