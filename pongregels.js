/* Beerpong-regels: tekeningen bij de uitleg op het tabje Pongen, plus de schakelaar Regels / Teams */
(function () {
  const view = document.getElementById("view-pong"); if (!view) return;

  /* ---------- Schakelaar tussen regels en teams ---------- */
  const knoppen = view.querySelectorAll("[data-bp-tab]"), delen = view.querySelectorAll("[data-bp-deel]");
  const kies = naam => {
    knoppen.forEach(k => k.setAttribute("aria-pressed", String(k.dataset.bpTab === naam)));
    delen.forEach(d => { d.hidden = d.dataset.bpDeel !== naam; });
    try { sessionStorage.setItem("kamelen-pong-tab", naam); } catch {}
  };
  knoppen.forEach(k => k.addEventListener("click", () => kies(k.dataset.bpTab)));
  view.querySelectorAll("[data-bp-naar]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); kies(a.dataset.bpNaar); view.scrollIntoView({ behavior: "smooth" }); }));
  /* Bij openen van Pongen altijd eerst de minigame */
  const openen = () => { if (location.hash === "#pong") kies("spelen"); };
  addEventListener("hashchange", openen);
  kies("spelen");

  /* ---------- Tekeningen ---------- */
  const BLAUW = "#b9d8e8", ORANJE = "#f08c1c", INK = "#163650", ROOD = "#d93a2b", GROEN = "#2f8a57";
  /* Piramide van 10 bekers van bovenaf. Rij 0 heeft 4 bekers, rij 3 één (de punt). */
  const PIRAMIDE = []; for (let rij = 0; rij < 4; rij++) for (let i = 0; i < 4 - rij; i++) PIRAMIDE.push({ rij, i, id: `${rij}-${i}` });
  function beker(x, y, r, toestand, kleur) {
    const vul = { raak: ORANJE, bom: ROOD, weg: "none", buur: "#f6b3aa" }[toestand] || kleur;
    const rand = toestand === "weg" ? "#b8c3cc" : INK;
    let s = `<circle cx="${x}" cy="${y}" r="${r}" fill="${vul}" stroke="${rand}" stroke-width="2" ${toestand === "weg" ? 'stroke-dasharray="3 3"' : ""}/>`;
    if (toestand !== "weg") s += `<circle cx="${x}" cy="${y}" r="${r * .62}" fill="rgba(255,255,255,.55)"/>`;
    if (toestand === "raak") s += `<circle cx="${x}" cy="${y}" r="${r * .3}" fill="#fff" stroke="${INK}" stroke-width="1.5"/>`;
    if (toestand === "bom") s += `<text x="${x}" y="${y + 5}" text-anchor="middle" font-size="${r * 1.2}">💥</text>`;
    return s;
  }
  /* punt = richting van de punt: "op" of "neer" */
  function piramide(cx, cy, r, punt, toestanden = {}, kleur = BLAUW) {
    const dx = r * 2.2, dy = r * 1.9;
    return PIRAMIDE.map(({ rij, i, id }) => {
      const x = cx + (i - (3 - rij) / 2) * dx, y = cy + (punt === "op" ? -1 : 1) * (rij - 1.5) * dy;
      return beker(x, y, r, toestanden[id], kleur);
    }).join("");
  }
  const svg = (w, h, inhoud, label) => `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">${inhoud}</svg>`;
  const tekst = (x, y, t, extra = "") => `<text x="${x}" y="${y}" text-anchor="middle" font-size="12" font-weight="700" fill="${INK}" font-family="Inter, system-ui, sans-serif" ${extra}>${t}</text>`;

  const FIGUREN = {
    /* De tafel van bovenaf met op elke helft een piramide, punten naar elkaar toe */
    opstelling: () => svg(340, 170, `
      <rect x="20" y="20" width="300" height="130" rx="10" fill="#2b5d3f" stroke="${INK}" stroke-width="2"/>
      <line x1="170" y1="20" x2="170" y2="150" stroke="#fff" stroke-width="2" stroke-dasharray="5 5" opacity=".7"/>
      <g transform="rotate(-90 85 85)">${piramide(85, 85, 10, "neer", {}, BLAUW)}</g>
      <g transform="rotate(90 255 85)">${piramide(255, 85, 10, "neer", {}, "#ffd9a8")}</g>
      ${tekst(85, 166, "Team 1")}${tekst(255, 166, "Team 2")}
      <text x="170" y="14" text-anchor="middle" font-size="10" fill="#5b6b78" font-family="Inter, system-ui, sans-serif">10 halve-literglazen per kant, beetje water erin</text>`, "Tafel met op elke helft 10 bekers in een driehoek"),

    /* Elleboog achter de tafelrand */
    elleboog: () => {
      const arm = (ox, okKleur, voor) => `
        <rect x="${ox + 70}" y="70" width="120" height="10" fill="#8b5a2b"/><rect x="${ox + 77}" y="80" width="8" height="45" fill="#6b4518"/><rect x="${ox + 175}" y="80" width="8" height="45" fill="#6b4518"/>
        <line x1="${ox + 70}" y1="40" x2="${ox + 70}" y2="128" stroke="${okKleur}" stroke-width="2" stroke-dasharray="4 3"/>
        <circle cx="${ox + 30}" cy="40" r="11" fill="#f2c29b" stroke="${INK}" stroke-width="1.5"/>
        <path d="M${ox + 30} 51 L${ox + 30} 105 M${ox + 30} 105 L${ox + 20} 128 M${ox + 30} 105 L${ox + 40} 128" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
        <path d="M${ox + 30} 60 L${ox + (voor ? 88 : 58)} ${voor ? 62 : 66} L${ox + (voor ? 110 : 82)} 46" stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle cx="${ox + (voor ? 88 : 58)}" cy="${voor ? 62 : 66}" r="5" fill="${okKleur}"/>
        <circle cx="${ox + (voor ? 115 : 87)}" cy="42" r="4" fill="#fff" stroke="${INK}" stroke-width="1.5"/>
        <text x="${ox + 100}" y="150" text-anchor="middle" font-size="22">${voor ? "❌" : "✅"}</text>`;
      return svg(400, 160, arm(0, GROEN, false) + arm(200, ROOD, true) + tekst(100, 18, "elleboog achter de rand") + tekst(300, 18, "elleboog boven de tafel"), "Links goed: elleboog achter de tafelrand. Rechts fout: elleboog boven de tafel.");
    },

    /* Wat er gebeurt na een raak worp */
    raak: () => {
      const paneel = (ox, titel, toestanden, onder) => `
        <rect x="${ox + 4}" y="4" width="122" height="150" rx="12" fill="#fff" stroke="#dfe5e9"/>
        ${tekst(ox + 65, 24, titel)}
        ${piramide(ox + 65, 82, 9, "op", toestanden)}
        <text x="${ox + 65}" y="142" text-anchor="middle" font-size="11" fill="#5b6b78" font-family="Inter, system-ui, sans-serif">${onder}</text>`;
      return svg(400, 160,
        paneel(0, "Gemist", { "1-1": "weg" }, "beker gaat weg") +
        paneel(135, "Zelfde beker: BOM", { "1-1": "bom", "1-0": "weg", "1-2": "weg", "0-1": "weg", "0-2": "weg", "2-0": "weg", "2-1": "weg" }, "alles eromheen weg") +
        paneel(270, "Andere beker", { "1-1": "weg", "2-1": "raak" }, "eerste weg, opnieuw"),
        "Drie mogelijkheden na een raak worp: gemist, zelfde beker (bom) of andere beker");
    },

    /* Stuiterbal: tegenstander mag hem wegslaan; gaat hij toch in, dan extra beker weg */
    stuiter: () => svg(340, 140, `
      <rect x="30" y="80" width="280" height="10" fill="#8b5a2b"/><rect x="40" y="90" width="8" height="40" fill="#6b4518"/><rect x="292" y="90" width="8" height="40" fill="#6b4518"/>
      ${[0, 1, 2].map(k => `<rect x="${236 + k * 18}" y="60" width="15" height="20" rx="2" fill="#ffd9a8" stroke="${INK}" stroke-width="1.5"/>`).join("")}
      <path d="M40 40 Q100 10 150 78 Q190 30 243 58" fill="none" stroke="${INK}" stroke-width="2.2" stroke-dasharray="5 5"/>
      <ellipse cx="150" cy="79" rx="9" ry="2.5" fill="none" stroke="${ORANJE}" stroke-width="2"/>
      <text x="196" y="40" font-size="22">✋</text>
      ${tekst(150, 112, "stuiter")}
      ${tekst(212, 22, "mag weggeslagen worden", `fill="${ROOD}"`)}
      ${tekst(170, 136, "toch raak? +1 beker naar keuze weg", `fill="${GROEN}"`)}`, "Een stuiterbal mag de tegenstander wegslaan; gaat hij toch in een beker, dan mag er een extra beker naar keuze weg"),

    /* Omgestoten glas */
    omgestoten: () => svg(340, 110, `
      ${piramide(70, 56, 9, "op", {})}
      <path d="M140 56 h40" stroke="${INK}" stroke-width="2.5" marker-end="url(#bpPijl2)"/>
      <defs><marker id="bpPijl2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="${INK}"/></marker></defs>
      <g transform="translate(232 62) rotate(-75)"><path d="M-12 -16 L12 -16 L9 16 L-9 16 Z" fill="${BLAUW}" stroke="${INK}" stroke-width="2"/></g>
      <path d="M248 70 q14 6 30 2 q10 4 22 0" fill="none" stroke="#8fc3e3" stroke-width="5" stroke-linecap="round"/>
      <text x="258" y="44" font-size="20">❌</text>
      ${tekst(200, 104, "omgestoten = echt weg, pech gehad")}`, "Een omgestoten glas gaat gewoon weg"),

    /* In iemands bier terwijl hij het vasthoudt */
    biertje: () => svg(340, 130, `
      <path d="M200 30 L250 30 L244 104 L206 104 Z" fill="#f6bd45" stroke="${INK}" stroke-width="2.5"/>
      <path d="M200 30 L250 30 L249 42 L201 42 Z" fill="#fffaf0" stroke="${INK}" stroke-width="2"/>
      <path d="M250 50 q22 4 20 24 q-2 18 -22 18" fill="none" stroke="${INK}" stroke-width="5"/>
      <path d="M180 70 q14 -6 22 2 v26 q-10 6 -22 0 z" fill="#f2c29b" stroke="${INK}" stroke-width="2"/>
      <circle cx="225" cy="38" r="6" fill="#fff" stroke="${INK}" stroke-width="1.5"/>
      <path d="M40 70 Q120 -10 222 34" fill="none" stroke="${GROEN}" stroke-width="2.5" stroke-dasharray="6 5"/>
      <text x="282" y="60" font-size="30">🏆</text>
      ${tekst(170, 124, "raak in een vastgehouden biertje = gewonnen", `fill="${GROEN}"`)}`, "Gooi je in het biertje dat iemand vasthoudt, dan heb je meteen gewonnen"),
    /* Bal volledig over de tafel */
    over: () => svg(340, 130, `
      <rect x="40" y="80" width="240" height="10" fill="#8b5a2b"/><rect x="50" y="90" width="8" height="34" fill="#6b4518"/><rect x="262" y="90" width="8" height="34" fill="#6b4518"/>
      ${[70, 90, 110].map(x => `<rect x="${x + 150}" y="62" width="14" height="18" rx="2" fill="#ffd9a8" stroke="${INK}" stroke-width="1.5"/>`).join("")}
      <path d="M48 70 Q170 -10 315 112" fill="none" stroke="${ROOD}" stroke-width="2.5" stroke-dasharray="6 5"/>
      <circle cx="315" cy="114" r="5" fill="#fff" stroke="${INK}" stroke-width="1.5"/>
      <text x="318" y="102" font-size="18">❌</text>
      ${tekst(170, 120, "beurt voorbij + halve bak", `fill="${ROOD}"`)}`, "Een bal die helemaal over de tafel vliegt beëindigt je beurt"),

    /* Rebound pakken voor hij de grond raakt */
    rebound: () => svg(340, 130, `
      <rect x="40" y="70" width="240" height="10" fill="#8b5a2b"/><rect x="50" y="80" width="8" height="44" fill="#6b4518"/><rect x="262" y="80" width="8" height="44" fill="#6b4518"/>
      <line x1="10" y1="124" x2="330" y2="124" stroke="#b8c3cc" stroke-width="2"/>
      <path d="M60 30 Q140 10 200 68 Q230 40 300 92" fill="none" stroke="${GROEN}" stroke-width="2.5" stroke-dasharray="6 5"/>
      <text x="290" y="104" font-size="22">✋</text>
      ${tekst(255, 22, "gepakt vóór de grond", `fill="${GROEN}"`)}
      ${tekst(120, 108, "→ trickshot!")}`, "Gemiste bal die je van tafel vangt voordat hij de grond raakt: trickshot"),

    /* Steen papier schaar */
    sps: () => `<div class="bp-sps" aria-label="Steen, papier, schaar"><span>✊</span><span>✋</span><span>✌️</span></div>`,

    /* Hervormen */
    hervorm: () => {
      const rij = [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1]];
      return svg(340, 110, `
        ${piramide(70, 58, 8, "op", { "0-0": "weg", "1-0": "weg" })}
        <path d="M140 58 h50" stroke="${INK}" stroke-width="2.5" marker-end="url(#bpPijl)"/>
        <defs><marker id="bpPijl" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="${INK}"/></marker></defs>
        ${rij.map(([c, r]) => beker(225 + c * 19, 46 + r * 19, 8, null, BLAUW)).join("")}
        ${tekst(165, 104, "1× per potje, vorm naar keuze")}`, "Elk team mag één keer per potje de bekers in een nieuwe vorm laten zetten");
    },

    /* Afrekening voor het verliezende team */
    afrekening: () => svg(340, 110, `
      ${piramide(80, 56, 9, "op", { "0-0": "weg", "0-1": "weg", "0-3": "weg", "1-0": "weg", "1-1": "weg", "2-0": "weg", "3-0": "weg" }, "#ffd9a8")}
      <text x="160" y="62" font-size="24">=</text>
      <text x="195" y="64" font-size="26">🍺🍺🍺</text>
      ${tekst(245, 92, "3 glazen over = 3 halve bakken")}`, "Per beker die het winnende team nog heeft, trekt het verliezende team een halve bak")
  };
  view.querySelectorAll("[data-fig]").forEach(el => { const f = FIGUREN[el.dataset.fig]; if (f) el.innerHTML = f(); });
})();
