/* =========================================================
   Kamelen-racen: een kamelenrace om op te wedden, met slokken als inzet.
   - Kies welke kamelen meedoen (vernoemd naar spelers) en wie er gokt.
   - Iedereen zet zoveel slokken in als hij wil op één kameel (geen maximum).
   - De race: willekeurige gebeurtenissen bepalen wie wint.
   - Gewonnen: je mag je inzet × het aantal kamelen uitdelen (de odds).
     Verloren: je drinkt je inzet zelf.
   Alles staat alleen op dit apparaat (een telefoon gaat rond).
   ========================================================= */
(function () {
  const box = document.getElementById("race"); if (!box) return;
  const LS = "kamelen-race", BAAN = 100;
  const laad = () => { try { return JSON.parse(localStorage.getItem(LS)) || null; } catch { return null; } };
  let S = laad() || {};
  S = { kamelen: [], gokkers: [], inzet: {}, fase: "setup", uitslag: null, races: 0, tel: {}, ...S };
  S.tel = S.tel || {};   // per gokker: { gedronken, uitgedeeld } deze avond
  const bewaar = () => { try { localStorage.setItem(LS, JSON.stringify(S)); } catch {} };
  const namen = () => typeof ROSTER !== "undefined" ? [...ROSTER] : [];
  const r = n => Math.floor(Math.random() * n);

  const GEBEURTENISSEN = [
    [n => `${n} struikelt over een hockeybal en verliest 2 meter!`, -2],
    [n => `De coach roept en ${n} krijgt een snelheidsboost!`, 4],
    [n => `${n} stopt even voor een biertje.`, -3],
    [n => `${n} krijgt een groene kaart en staat twee minuten stil.`, -4],
    [n => `${n} heeft de wind mee!`, 3],
    [n => `${n} moet terug voor zijn bitje.`, -2],
    [n => `Strafcorner! ${n} schiet naar voren.`, 5],
    [n => `${n} wordt aangemoedigd door de derde helft.`, 2],
    [n => `${n} is een beetje brak van gisteravond.`, -2],
    [n => `${n} ruikt de bar en versnelt.`, 3],
    [n => `${n} raakt verstrikt in het doelnet.`, -3],
    [n => `${n} krijgt een stille meter opgelegd en loopt wankel.`, -4],
    [n => `${n} spot een pitcher bij de finish!`, 4],
    [n => `${n} maakt een sliding door het zand.`, 2],
    /* Boosts */
    [n => `${n} hoort dat de eerste ronde op de aanvoerder is en sprint weg!`, 5],
    [n => `${n} krijgt een slok Red Bull van de verzorger.`, 4],
    [n => `${n} denkt dat de kantine sluit en zet een tandje bij.`, 4],
    [n => `${n} wordt achterna gezeten door de scheidsrechter en rent voor zijn leven.`, 5],
    [n => `${n} krijgt een fluitje: geen kaart, gewoon doorlopen!`, 2],
    [n => `${n} ziet zijn ex op de tribune en wil indruk maken.`, 4],
    [n => `${n} heeft net een nieuwe stick gekocht en voelt zich onoverwinnelijk.`, 3],
    [n => `${n} wordt aangemoedigd door de dames 1. Turbo!`, 5],
    [n => `${n} ruikt frikandellen bij de finish.`, 3],
    [n => `Een windvlaag duwt ${n} vooruit.`, 2],
    [n => `${n} wordt per ongeluk ingeschakeld als invaller en moet opschieten.`, 3],
    [n => `${n} droomt al van de kameel van de dag.`, 3],
    [n => `${n} heeft gisteren een trainingsbeest-badge gehaald en voelt zich fit.`, 3],
    [n => `Mex! ${n} gooit 21 en rent euforisch verder.`, 4],
    /* Hinders */
    [n => `${n} moet nog een stille meter wegwerken en staat even stil.`, -5],
    [n => `${n} krijgt een gele kaart en moet vijf minuten op de bank.`, -5],
    [n => `${n} is zijn teampas kwijt en moet terug naar de kleedkamer.`, -4],
    [n => `${n} stopt om een selfie te maken voor de fotomuur.`, -3],
    [n => `${n} wordt ezel van de dag en moet eerst een liter trekken.`, -4],
    [n => `${n} krijgt een bal tegen zijn enkel en hinkt verder.`, -3],
    [n => `${n} raakt verdwaald op het Semiveld.`, -3],
    [n => `${n} blijft hangen bij de kantine voor een kroketje.`, -3],
    [n => `${n} krijgt een appje van de Kamelen-Scorito: "Nog niet voorspeld?" en kijkt op zijn telefoon.`, -2],
    [n => `${n} vergeet te stretchen en krijgt kramp in zijn bult.`, -3],
    [n => `${n} gooit "huis" bij het mexen en moet al het bier op tafel opdrinken.`, -6],
    [n => `${n} blijft staan om met de coach te discussiëren over de opstelling.`, -3],
    [n => `${n} ziet zijn eigen bult in een plas en raakt afgeleid.`, -2],
    [n => `${n} rent de verkeerde kant op. Classic.`, -4],
    [n => `${n} wordt aangesproken door het Liter-incassobureau.`, -4],
  ];

  /* Alleen in de eindsprint (laatste kwart): extra grote boosts en hinders */
  const EINDSPRINT = [
    [n => `${n} krijgt een kameel-turbo en vliegt naar de finish!`, 9],
    [n => `${n} ziet een gratis pitcher achter de finish staan. VOLLE GAS!`, 8],
    [n => `De hele tribune scandeert "${n}! ${n}!" en hij gaat los!`, 7],
    [n => `${n} glijdt op een bananenschil en ligt languit in het zand!`, -8],
    [n => `${n} valt in een kuil die de keeper heeft gegraven!`, -9],
    [n => `${n} krijgt een rode kaart en moet even terug naar af… bijna.`, -7],
    [n => `${n} bedenkt zich dat hij nog een liter open heeft en remt af.`, -6],
  ];
  /* Kies een gebeurtenis. Hoe dichter bij de finish (voortgang 0..1), hoe vaker een grote. */
  function kiesGebeurtenis(voortgang) {
    const pool = voortgang > .75 ? GEBEURTENISSEN.concat(EINDSPRINT) : GEBEURTENISSEN;
    const macht = voortgang * 3;   // 0 = alles even vaak, 3 = grote gebeurtenissen veel vaker
    const gewichten = pool.map(([, d]) => Math.pow(Math.abs(d), macht));
    let x = Math.random() * gewichten.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { x -= gewichten[i]; if (x <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }

  function render() {
    if (S.fase === "setup") return renderSetup();
    if (S.fase === "inzet") return renderInzet();
    renderBaan();
  }

  /* ---------- 1. Wie doet er mee ---------- */
  function renderSetup() {
    const chips = (lijst, veld) => namen().map(n => `<button type="button" class="kz-chip ${lijst.includes(n) ? "on" : ""}" data-kies="${veld}" data-n="${esc(n)}">${esc(n)}</button>`).join("");
    box.innerHTML = `
      <div class="rc-stap"><h3>1. Welke kamelen racen er?</h3><p class="muted">Kies 3 tot 8 kamelen. Ze zijn vernoemd naar spelers.</p>
        <div class="kz-grid">${chips(S.kamelen, "kamelen")}</div></div>
      <div class="rc-stap"><h3>2. Wie gokt er mee?</h3><p class="muted">Je zet slokken in, zoveel als je durft.</p>
        <div class="kz-grid">${chips(S.gokkers, "gokkers")}</div></div>
      <div class="rc-knoppen"><button type="button" class="btn" data-rc="naar-inzet" ${S.kamelen.length >= 3 && S.gokkers.length >= 1 ? "" : "disabled"}>Naar de inzetten</button>
        <span class="muted">${S.kamelen.length} kamelen, ${S.gokkers.length} gokkers</span></div>
      ${scorebord()}`;
  }

  /* ---------- 2. Inzetten ---------- */
  function renderInzet() {
    const n = S.kamelen.length;
    box.innerHTML = `
      <div class="rc-stap"><h3>Plaats je inzet</h3><p class="muted">Kies een kameel en zet zoveel slokken in als je wilt. Wint je kameel, dan mag je je inzet × ${n} uitdelen. Verliest hij, dan drink je je inzet zelf. Geef de telefoon door!</p>
      <div class="rc-inzet">${S.gokkers.map(g => {
        const z = S.inzet[g] || {}, m = z.m || 1;
        return `<div class="rc-gok"><div class="rc-gnaam">${esc(g)}</div>
          <div class="rc-keuze">${S.kamelen.map(k => `<button type="button" class="rc-k ${z.op === k ? "on" : ""}" data-op="${esc(k)}" data-g="${esc(g)}">🐪 ${esc(k)}</button>`).join("")}</div>
          <div class="rc-stake"><button type="button" class="btn sm ghost" data-st="-1" data-g="${esc(g)}" ${m <= 1 ? "disabled" : ""}>−</button><b>${m}</b> <span>${m === 1 ? "slok" : "slokken"}</span><button type="button" class="btn sm ghost" data-st="1" data-g="${esc(g)}">+</button><button type="button" class="btn sm ghost" data-st="5" data-g="${esc(g)}">+5</button>
          <span class="rc-odds">${z.op ? `wint: <b>${m * n}</b> uitdelen · verliest: <b>${m}</b> drinken` : ""}</span></div></div>`;
      }).join("")}</div></div>
      <div class="rc-knoppen"><button type="button" class="btn ghost" data-rc="terug">Terug</button>
        <button type="button" class="btn" data-rc="start" ${S.gokkers.every(g => S.inzet[g]?.op) ? "" : "disabled"}>Start de race!</button></div>`;
  }

  /* ---------- 3. De race ---------- */
  function renderBaan() {
    box.innerHTML = `
      <div class="rc-baan" id="rc-baan">${S.kamelen.map((k, i) => `
        <div class="rc-lane"><span class="rc-lnaam">${esc(k)}</span><div class="rc-zand"><span class="rc-kameel" id="rc-k${i}" style="left:0%"><span class="rc-kroon" aria-hidden="true">👑</span><span class="rc-lijf">🐪</span><span class="rc-stof" aria-hidden="true"></span></span><span class="rc-finish"></span></div></div>`).join("")}
        <div class="rc-aftel" id="rc-aftel" aria-live="assertive"></div></div>
      <div class="rc-feed" id="rc-feed" aria-live="polite"></div>
      <div class="rc-knoppen" id="rc-afbreken"><button type="button" class="btn sm ghost" data-rc="afbreken">Race afbreken</button></div>
      <div id="rc-uitslag"></div>`;
  }

  let loper = null, teller = null;
  function stopTimers() { clearInterval(loper); clearTimeout(teller); loper = teller = null; }
  function race() {
    stopTimers();
    S.fase = "race"; bewaar(); render();
    document.getElementById("rc-baan")?.scrollIntoView({ behavior: "smooth", block: "center" });
    const pos = S.kamelen.map(() => 0), snel = S.kamelen.map(() => 1.2 + Math.random() * .6);
    const feed = document.getElementById("rc-feed"), baan = document.getElementById("rc-baan"), aftel = document.getElementById("rc-aftel");
    const els = S.kamelen.map((_, i) => document.getElementById("rc-k" + i));
    const zet = () => {
      const voor = Math.max(...pos);
      els.forEach((el, i) => { if (!el) return; const p = Math.min(pos[i], BAAN) / BAAN; el.style.left = `calc(${p * 100}% - ${p * 2.4}rem)`; el.classList.toggle("leider", pos[i] === voor && voor > 4); });
    };
    const melding = (t, soort = "") => { const p = document.createElement("p"); p.textContent = t; if (soort) p.className = soort; feed.prepend(p); while (feed.children.length > 4) feed.lastChild.remove(); };
    const rustig = matchMedia("(prefers-reduced-motion: reduce)").matches;
    /* Aftellen: 3, 2, 1, start! */
    const tellen = ["3", "2", "1", "Start!"];
    let k = 0;
    const tel = () => {
      if (rustig || k >= tellen.length) { aftel.textContent = ""; aftel.className = "rc-aftel"; return lopen(); }
      aftel.textContent = tellen[k]; aftel.className = "rc-aftel toon" + (k === 3 ? " go" : "");
      try { navigator.vibrate?.(k === 3 ? 120 : 30); } catch {}
      k++; teller = setTimeout(tel, 650);
    };
    const lopen = () => {
      baan.classList.add("rent");
      melding("En ze zijn vertrokken!", "groot");
      let tik = 0, laatsteLeider = -1, finale = false; window.__rcLaatste = 0;
      const t = loper = setInterval(() => {
        tik++;
        S.kamelen.forEach((_, i) => { pos[i] += (snel[i] + Math.random() * 1.1) * .55 * (rustig ? 20 : 1); });
        /* Hoe verder in de race, hoe vaker iets gebeurt (eerst elke 9 tikken, op het eind elke 4) en hoe groter */
        const voortgang = Math.min(1, Math.max(...pos) / BAAN), elke = Math.round(9 - voortgang * 5);
        if (tik - (window.__rcLaatste || 0) >= elke) {
          window.__rcLaatste = tik;
          const i = r(S.kamelen.length), [tekst, basis] = kiesGebeurtenis(voortgang);
          const d = Math.round(basis * (1 + voortgang * .8));
          pos[i] = Math.max(0, pos[i] + d); melding(tekst(S.kamelen[i]), (d > 0 ? "plus" : "min") + (Math.abs(d) >= 7 ? " mega" : ""));
          const el = els[i]; if (el) { el.classList.remove("hop", "val"); void el.offsetWidth; el.classList.add(d > 0 ? "hop" : "val"); }
        }
        const voor = Math.max(...pos), leider = pos.indexOf(voor);
        if (leider !== laatsteLeider && tik > 15 && tik % 3 === 0) { laatsteLeider = leider; if (tik > 20) melding(`${S.kamelen[leider]} neemt de leiding!`, "leiding"); }
        if (!finale && voor > BAAN * .82) { finale = true; baan.classList.add("finale"); melding("De laatste meters! Wie pakt het?", "groot"); }
        zet();
        if (voor >= BAAN) {
          clearInterval(t);
          baan.classList.remove("rent", "finale"); baan.classList.add("flits");
          const volgorde = pos.map((p, i) => [p, i]).sort((a, b) => b[0] - a[0]).map(([, i]) => S.kamelen[i]);
          const wi = S.kamelen.indexOf(volgorde[0]); els[wi]?.classList.add("winnaar");
          document.getElementById("rc-afbreken")?.remove();
          melding(`FINISH! ${volgorde[0]} wint!`, "groot");
          try { window.schietConfetti?.(); } catch {}
          setTimeout(() => afrekenen(volgorde), 900);
        }
      }, 120);
    };
    tel();
  }

  /* ---------- 4. Afrekenen ---------- */
  function afrekenen(volgorde) {
    const winnaar = volgorde[0], n = S.kamelen.length;
    const regels = S.gokkers.filter(g => S.inzet[g]?.op).map(g => {
      const op = S.inzet[g].op, m = S.inzet[g].m || 1, t = S.tel[g] = S.tel[g] || { gedronken: 0, uitgedeeld: 0 };
      if (op === winnaar) { t.uitgedeeld += m * n; return { g, op, m, uitdelen: m * n, drinken: 0 }; }
      t.gedronken += m; return { g, op, m, uitdelen: 0, drinken: m };
    });
    S.races++; S.fase = "uitslag"; S.uitslag = { volgorde, regels, winnaar }; bewaar();
    try { navigator.vibrate?.([80, 60, 160]); } catch {}
    const el = document.getElementById("rc-uitslag");
    el.innerHTML = `<div class="rc-res">
      <div class="rc-win">🏆 <b>${esc(winnaar)}</b> wint de race!</div>
      <ol class="rc-volg">${volgorde.map((k, i) => `<li>${i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : ""}${esc(k)}</li>`).join("")}</ol>
      <table class="rc-tabel"><thead><tr><th>Gokker</th><th>Op</th><th class="r">Inzet</th><th class="r">Uitdelen</th><th class="r">Drinken</th></tr></thead><tbody>
      ${regels.map(x => `<tr><td>${esc(x.g)}</td><td>🐪 ${esc(x.op)}</td><td class="r">${x.m}</td><td class="r">${x.uitdelen ? `<b class="gd-pos">${x.uitdelen}</b>` : "–"}</td><td class="r">${x.drinken ? `<b class="gd-neg">${x.drinken}</b>` : "–"}</td></tr>`).join("")}</tbody></table>
      <p class="muted">Gewonnen: inzet × ${n} (het aantal kamelen) uitdelen. Verloren: je inzet zelf opdrinken.</p>
      <div class="rc-knoppen"><button type="button" class="btn" data-rc="opnieuw">Nieuwe race</button><button type="button" class="btn ghost" data-rc="setup">Kamelen of gokkers wijzigen</button></div></div>`;
  }

  function scorebord() {
    const rij = Object.entries(S.tel).sort((a, b) => b[1].gedronken - a[1].gedronken);
    if (!rij.length) return "";
    return `<div class="mx-score"><h3 class="sub-h">Deze avond${S.races ? ` · ${S.races} ${S.races === 1 ? "race" : "races"}` : ""}</h3>
      <table><thead><tr><th>Gokker</th><th class="r">Gedronken</th><th class="r">Uitgedeeld</th></tr></thead><tbody>${rij.map(([n, t]) => `<tr><td>${esc(n)}</td><td class="r">${t.gedronken}</td><td class="r">${t.uitgedeeld}</td></tr>`).join("")}</tbody></table>
      <button type="button" class="btn sm ghost" data-rc="reset">Nieuwe avond (tellers op 0)</button></div>`;
  }

  box.addEventListener("click", e => {
    const k = e.target.closest("[data-kies]");
    if (k) { const l = S[k.dataset.kies], n = k.dataset.n, i = l.indexOf(n); if (i >= 0) l.splice(i, 1); else if (k.dataset.kies !== "kamelen" || l.length < 8) l.push(n); bewaar(); return render(); }
    const op = e.target.closest("[data-op]");
    if (op) { const g = op.dataset.g; S.inzet[g] = { op: op.dataset.op, m: S.inzet[g]?.m || 1 }; bewaar(); return render(); }
    const st = e.target.closest("[data-st]");
    if (st) { const g = st.dataset.g, z = S.inzet[g] || { m: 1 }; z.m = Math.max(1, (z.m || 1) + Number(st.dataset.st)); S.inzet[g] = z; bewaar(); return render(); }
    const b = e.target.closest("[data-rc]"); if (!b) return;
    const a = b.dataset.rc;
    if (a === "naar-inzet") S.fase = "inzet";
    if (a === "terug" || a === "setup") S.fase = "setup";
    if (a === "start") return race();
    if (a === "afbreken") { stopTimers(); S.fase = "inzet"; }
    if (a === "opnieuw") { S.inzet = {}; S.fase = "inzet"; }
    if (a === "reset") { S.tel = {}; S.races = 0; S.inzet = {}; }
    bewaar(); render();
  });

  /* Een race die halverwege werd onderbroken (pagina ververst) gaat terug naar de inzetten */
  window.renderRace = () => { if (S.fase === "race" && !loper && !teller) S.fase = "inzet"; if (S.fase !== "race") render(); };
  window.renderRace();
})();
