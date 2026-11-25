// Zoekt per regel in steden/zoek.txt ("naam|zoekterm") een foto op Wikimedia Commons,
// downloadt hem (1280 px breed) naar steden/<naam>.jpg en noteert maker en licentie in steden/fotos.json.
import { readFile, writeFile, access } from "node:fs/promises";
const UA = { "User-Agent": "KamelenApp/1.0 (https://kamelenhockey.github.io/kamelen/)" };
const API = "https://commons.wikimedia.org/w/api.php";
const bestaat = p => access(p).then(() => true, () => false);
const lijst = (await readFile("steden/zoek.txt", "utf8")).split("\n").map(r => r.trim()).filter(r => r && !r.startsWith("#"));
let info = {}; try { info = JSON.parse(await readFile("steden/fotos.json", "utf8")); } catch {}
const schoon = s => String(s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
for (const regel of lijst) {
  const [naam, zoek] = regel.split("|").map(s => s.trim());
  if (info[naam] && await bestaat(`steden/${naam}.jpg`)) continue;
  const q = new URLSearchParams({ action: "query", format: "json", generator: "search", gsrsearch: `${zoek} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "12",
    prop: "imageinfo", iiprop: "url|size|extmetadata|mime", iiurlwidth: "1280" });
  const r = await fetch(`${API}?${q}`, { headers: UA }).then(x => x.json()).catch(() => null);
  const paginas = Object.values(r?.query?.pages || {}).sort((a, b) => a.index - b.index);
  const goed = paginas.map(p => ({ titel: p.title, ii: p.imageinfo?.[0] })).find(p => p.ii && p.ii.mime === "image/jpeg" && p.ii.width >= 1200 && p.ii.height >= 800
    && /cc|public domain|pd/i.test(p.ii.extmetadata?.LicenseShortName?.value || ""));
  if (!goed) { console.log(`Geen foto voor ${naam} (${zoek})`); continue; }
  const buf = Buffer.from(await fetch(goed.ii.thumburl, { headers: UA }).then(x => x.arrayBuffer()));
  await writeFile(`steden/${naam}.jpg`, buf);
  info[naam] = { bestand: goed.titel, maker: schoon(goed.ii.extmetadata?.Artist?.value), licentie: schoon(goed.ii.extmetadata?.LicenseShortName?.value), bron: goed.ii.descriptionurl };
  console.log(`${naam}: ${goed.titel} (${info[naam].maker}, ${info[naam].licentie})`);
}
await writeFile("steden/fotos.json", JSON.stringify(info, null, 1) + "\n");
