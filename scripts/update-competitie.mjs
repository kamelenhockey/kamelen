// Leest programma, uitslagen en stand van hockey.nl en schrijft competitie.json.
import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { parseProgramma, parseUitslagen, parseStand, berekenAftrek, seizoenStartjaar } from "./parse.mjs";

const TEAM = "21368|182976";
const BASIS = `https://www.hockey.nl/match-center#/team/${TEAM}`;

async function leesTekst(page, tab, moetBevatten) {
  await page.goto("about:blank");
  await page.goto(`${BASIS}/${tab}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction((woord) => {
    const mc = document.querySelector("match-center");
    if (!mc || !mc.shadowRoot) return false;
    const t = [...mc.shadowRoot.children].map(c => c.innerText || "").join("\n");
    return t.includes(woord);
  }, moetBevatten, { timeout: 60000 });
  await page.waitForTimeout(2500);
  return page.evaluate(() => [...document.querySelector("match-center").shadowRoot.children].map(c => c.innerText || "").join("\n"));
}

const browser = await chromium.launch();
const page = await browser.newPage({ locale: "nl-NL", timezoneId: "Europe/Amsterdam", viewport: { width: 560, height: 3000 } });
const startjaar = seizoenStartjaar();
const programmaTekst = await leesTekst(page, "program", "Personaliseer weergave");
const uitslagenTekst = await leesTekst(page, "results", "Personaliseer weergave");
const overzichtTekst = await leesTekst(page, "overview", "Stand per");
await browser.close();

const programma = parseProgramma(programmaTekst, startjaar);
const uitslagen = parseUitslagen(uitslagenTekst, startjaar);
const { stand, standPer } = parseStand(overzichtTekst);

const oud = JSON.parse(await readFile("competitie.json", "utf8"));

// Veiligheidscheck: bij rare gegevens niets overschrijven
if (stand.length < 4) throw new Error(`Stand lijkt onvolledig (${stand.length} teams) – niets bijgewerkt.`);
if (programma.length + uitslagen.length < (oud.programma.length + oud.uitslagen.length) - 10)
  throw new Error("Veel minder wedstrijden dan vorige keer – niets bijgewerkt.");

const nieuw = {
  ...oud,
  programma, uitslagen, stand,
  standPer: standPer || oud.standPer,
  puntenAftrek: berekenAftrek(stand, uitslagen),
  competitieBijgewerkt: new Date().toISOString(),
};
await writeFile("competitie.json", JSON.stringify(nieuw, null, 1) + "\n");
console.log(`Programma: ${programma.length}, uitslagen: ${uitslagen.length}, stand: ${stand.length} teams (per ${standPer}).`);
