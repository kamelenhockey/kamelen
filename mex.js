/* =========================================================
   Mex spelen: digitale dobbelstenen met de Kamelen-regels
   Gebruikt uit index.html: dieSvg, esc, ROSTER, canon
   ========================================================= */
(function () {
  const KEY = "kamelen-mex";
  const box = document.getElementById("mex-game");
  if (!box) return;

  /* ---------- Toestand ---------- */
  let S = load() || nieuw();
  function nieuw() { return { fase: "setup", spelers: [], stats: {}, honderd: { main: null, extra: null }, ronde: null, rondeNr: 0, battle: null, uitslag: null, log: [] }; }
  function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} }
  const stat = n => (S.stats[n] = S.stats[n] || { verloren: 0, mex: 0, honderd: 0, bakken: 0 });

  /* ---------- Worpen waarderen ---------- */
  const d6 = () => 1 + Math.floor(Math.random() * 6);
  function waarde(a, b) {
    const hi = Math.max(a, b), lo = Math.min(a, b);
    if (hi === 2 && lo === 1) return { rank: 1000, label: "Mex", hi, lo };
    if (hi === lo) return { rank: hi * 100, label: String(hi * 100), hi, lo, dubbel: true };
    return { rank: hi * 10 + lo, label: String(hi * 10 + lo), hi, lo };
  }
  const bak = x => { const h = Math.floor(x), half = x % 1 >= 0.5; return `${h || ""}${half ? "½" : ""} ${x > 1.5 ? "bakken" : "bak"}`; };

  /* ---------- Ronde en beurt ---------- */
  function startRonde(deelnemers, starter, meegenomen = 0, verliezers = false) {
    const i = Math.max(0, deelnemers.indexOf(starter));
    const volgorde = [...deelnemers.slice(i), ...deelnemers.slice(0, i)];
    S.rondeNr++;
    S.ronde = { volgorde, beurt: 0, max: 3, mexen: 0, uitslagen: {}, meegenomen, verliezers };
    S.battle = null; S.uitslag = null;
    nieuweBeurt();
    S.fase = "spel";
  }
  function nieuweBeurt() {
    S.ronde.huidig = { worpen: 0, laatst: null, slot: null, slotGebruikt: false, waarden: [], negens: 0, eenendertig: 0, huis: false, klaar: false, berichten: [] };
  }
  const speler = () => S.ronde.volgorde[S.ronde.beurt];

  function gooi() {
    const R = S.ronde, B = R.huidig, wie = speler();
    if (B.klaar) return;
    let a, b;
    if (B.slot) { a = B.slot; b = d6(); B.slotGebruikt = true; } else { a = d6(); b = d6(); }
    const vastgehouden = B.slot;
    B.slot = null;
    const w = waarde(a, b);
    B.laatst = { a, b, vast: vastgehouden, label: w.label };
    B.berichten = [];

    /* 31 is onzichtbaar: telt niet als worp */
    if (w.hi === 3 && w.lo === 1) {
      B.eenendertig++;
      B.berichten.push(`<b>31 – onzichtbaar.</b> Telt niet als worp. ${esc(wie)} mag <b>1 slok uitdelen</b>.`);
      if (B.eenendertig >= 3) B.berichten.push(`<b>3× 31 op rij!</b> ${esc(wie)} mag een <b>huis uitdelen</b>.`);
      return render();
    }
    B.eenendertig = 0;
    B.worpen++;
    B.waarden.push(w.rank);

    /* Huis: 3× 9 ogen, of 3× precies hetzelfde na "huis" roepen */
    if (a + b === 9) B.negens++;
    if (B.negens >= 3) B.berichten.push(`<b>HUIS!</b> Drie keer 9 ogen. ${esc(wie)} drinkt al het bier op tafel (behalve de pitchers).`);
    if (B.worpen === 3 && B.huis && B.waarden[0] === B.waarden[1] && B.waarden[1] === B.waarden[2])
      B.berichten.push(`<b>HUIS!</b> Drie keer precies hetzelfde na "huis". ${esc(wie)} drinkt al het bier op tafel (behalve de pitchers).`);

    /* Speciale worpen */
    let klaar = B.worpen >= R.max;
    if (w.rank === 1000) {
      R.mexen++; stat(wie).mex++; klaar = true;
      B.berichten.push(`<b>MEX!</b> Er komt een halve bak bij voor de verliezer.`);
      if (R.beurt === 0) { R.max = B.worpen; if (B.worpen < 3) B.berichten.push(`Starter gooide mex in ${B.worpen}: iedereen mag deze ronde maar ${B.worpen}× gooien.`); }
    } else if (w.label === "32") {
      klaar = true; B.berichten.push(`<b>32</b> – de laagste worp. Beurt klaar.`);
    } else if (w.dubbel) {
      honderdtal(wie, w.rank);
    }

    /* 1 of 2 moet één keer blijven liggen */
    if (!klaar && !w.dubbel && !vastgehouden && (w.lo === 1 || w.lo === 2)) {
      B.slot = w.lo;
      B.berichten.push(`De <b>${w.lo}</b> blijft liggen; gooi alleen de andere steen.`);
    }

    if (klaar) { B.klaar = true; R.uitslagen[wie] = { rank: w.rank, label: w.label, a, b }; }
    save(); render();
  }

  function honderdtal(wie, waarde) {
    const H = S.honderd, B = S.ronde.huidig, n = waarde / 100;
    if (waarde === 100) {
      stat(wie).honderd++;
      if (wie === H.main) { B.kiesExtra = true; B.berichten.push(`<b>100!</b> ${esc(wie)} is al de 100-man en mag iemand meenemen als extra 100-man.`); }
      else if (wie === H.extra) { H.main = wie; H.extra = null; B.berichten.push(`<b>100!</b> ${esc(wie)} is nu de enige 100-man.`); }
      else { H.main = wie; H.extra = null; B.berichten.push(`<b>100!</b> ${esc(wie)} is de nieuwe 100-man.`); }
      return;
    }
    if (!H.main) { B.berichten.push(`<b>${waarde}</b> – nog geen 100-man om te laten drinken.`); return; }
    if (wie === H.main) B.berichten.push(`<b>${waarde}</b> – de 100-man gooit zelf een honderdtal en mag <b>${n} slokken uitdelen</b>.`);
    else B.berichten.push(`<b>${waarde}</b> – ${esc(H.main)}${H.extra ? ` en ${esc(H.extra)}` : ""} ${H.extra ? "drinken" : "drinkt"} <b>${n} slokken</b>.`);
  }

  function volgende() {
    const R = S.ronde;
    if (R.beurt < R.volgorde.length - 1) { R.beurt++; nieuweBeurt(); save(); return render(); }
    eindeRonde();
  }

  function eindeRonde() {
    const R = S.ronde;
    const straf = R.meegenomen + 0.5 + 0.5 * R.mexen;
    const laagst = Math.min(...Object.values(R.uitslagen).map(u => u.rank));
    const verliezers = R.volgorde.filter(n => R.uitslagen[n].rank === laagst);
    if (verliezers.length === 1) return verloren(verliezers[0], straf);
    if (verliezers.length === 2) { S.battle = { spelers: verliezers, worpen: {}, straf }; S.fase = "battle"; save(); return render(); }
    S.uitslag = { tekst: `${verliezers.map(esc).join(", ")} gooiden allemaal het laagst. Zij spelen een <b>verliezerspotje</b>. De straf van deze ronde (${bak(straf)}) gaat mee.` };
    startRonde(verliezers, verliezers[0], straf, true);
    S.uitslag = { tekst: `Verliezerspotje tussen ${verliezers.map(esc).join(", ")}. Er staat al ${bak(straf)} op het spel.` };
    save(); render();
  }

  function verloren(wie, straf) {
    stat(wie).verloren++; stat(wie).bakken += straf;
    const hulp = Math.floor((straf / 2) * 2) / 2;
    S.uitslag = { verliezer: wie, straf, hulp };
    S.fase = "einde"; save(); render();
  }

  function battleGooi(wie) {
    const Bt = S.battle; if (Bt.worpen[wie]) return;
    Bt.worpen[wie] = d6();
    const [x, y] = Bt.spelers;
    if (Bt.worpen[x] && Bt.worpen[y]) {
      if (Bt.worpen[x] === Bt.worpen[y]) { Bt.gelijk = true; setTimeout(() => { Bt.worpen = {}; Bt.gelijk = false; save(); render(); }, 1300); }
      else { const verliezer = Bt.worpen[x] > Bt.worpen[y] ? x : y; setTimeout(() => verloren(verliezer, Bt.straf), 900); }
    }
    save(); render();
  }

  /* ---------- Weergave ---------- */
  const steen = (n, extra = "") => `<span class="mx-die ${extra}">${dieSvg(n)}</span>`;
  function render() {
    if (S.fase === "setup") return renderSetup();
    const H = S.honderd;
    const top = `<div class="mx-top">
      <div><div class="k">${S.ronde?.verliezers ? "Verliezerspotje" : `Ronde ${S.rondeNr}`}</div><div class="v">${S.ronde ? `${S.ronde.mexen} × mex · straf ${bak((S.ronde.meegenomen || 0) + 0.5 + 0.5 * S.ronde.mexen)}` : ""}</div></div>
      <div><div class="k">100-man</div><div class="v">${H.main ? esc(H.main) + (H.extra ? ` <small>+ ${esc(H.extra)}</small>` : "") : "nog niemand"}</div></div>
      <div class="mx-actions"><button type="button" class="btn sm ghost" data-mx="stop">Stoppen</button></div></div>`;
    if (S.fase === "spel") return box.innerHTML = top + renderSpel() + renderScore();
    if (S.fase === "battle") return box.innerHTML = top + renderBattle() + renderScore();
    if (S.fase === "einde") return box.innerHTML = top + renderEinde() + renderScore();
  }

  function renderSetup() {
    const roster = [...(typeof ROSTER !== "undefined" ? ROSTER : [])].filter(n => !S.spelers.includes(n));
    box.innerHTML = `<div class="mx-setup">
      <p>Kies wie er meedoen, in de volgorde waarin jullie zitten. De eerste speler begint.</p>
      <div class="mx-chips">${S.spelers.length ? S.spelers.map((n, i) => `<span class="mx-chip"><b>${i + 1}</b> ${esc(n)} <button type="button" aria-label="Verwijder ${esc(n)}" data-mx="weg" data-i="${i}">×</button></span>`).join("") : `<span class="mx-hint">Nog niemand gekozen</span>`}</div>
      <div class="mx-add"><input type="text" id="mx-naam" placeholder="Naam toevoegen" autocomplete="off"><button type="button" class="btn sm" data-mx="voeg">Toevoegen</button></div>
      ${roster.length ? `<div class="mx-roster"><span class="mx-hint">Snel kiezen:</span>${roster.map(n => `<button type="button" class="mx-pick" data-mx="pick" data-n="${esc(n)}">${esc(n)}</button>`).join("")}</div>` : ""}
      <div class="mx-start"><button type="button" class="btn" data-mx="start" ${S.spelers.length < 2 ? "disabled" : ""}>Start Mex${S.spelers.length >= 2 ? ` met ${S.spelers.length} spelers` : ""}</button>
      ${Object.keys(S.stats).length ? `<button type="button" class="btn sm ghost" data-mx="reset-stats">Scores wissen</button>` : ""}</div>
    </div>` + renderScore();
  }

  function renderSpel() {
    const R = S.ronde, B = R.huidig, wie = speler();
    const dice = B.laatst ? steen(B.laatst.vast ? B.laatst.vast : B.laatst.a, B.laatst.vast ? "kept" : "") + steen(B.laatst.b) : steen(6, "idle") + steen(6, "idle");
    const pips = Array.from({ length: R.max }, (_, i) => `<i class="${i < B.worpen ? "used" : ""}"></i>`).join("");
    return `<div class="mx-board">
      <div class="mx-turn"><div class="k">Aan de beurt${R.beurt === 0 ? " · starter" : ""}</div><div class="mx-name">${esc(wie)}</div>
        <div class="mx-pips" aria-label="${B.worpen} van ${R.max} worpen">${pips}<span>${B.worpen}/${R.max} worpen</span></div></div>
      <div class="mx-dice" id="mx-dice">${dice}</div>
      <div class="mx-value">${B.laatst ? `<b>${esc(B.laatst.label)}</b>` : "&nbsp;"}</div>
      ${B.slot ? `<div class="mx-lock">${steen(B.slot, "kept small")} blijft liggen</div>` : ""}
      <div class="mx-msgs">${B.berichten.map(m => `<p>${m}</p>`).join("")}</div>
      ${B.kiesExtra ? `<div class="mx-extra"><label>Extra 100-man: <select id="mx-extra"><option value="">Kies…</option>${S.spelers.filter(n => n !== S.honderd.main).map(n => `<option>${esc(n)}</option>`).join("")}</select></label></div>` : ""}
      <div class="mx-buttons">
        ${B.klaar ? `<button type="button" class="btn mx-big" data-mx="volgende">${R.beurt < R.volgorde.length - 1 ? `Volgende: ${esc(R.volgorde[R.beurt + 1])}` : "Uitslag ronde"}</button>`
                  : `<button type="button" class="btn mx-big" data-mx="gooi">Gooi</button>`}
        ${!B.klaar && B.worpen === 2 && R.max === 3 ? `<button type="button" class="btn ghost ${B.huis ? "on" : ""}" data-mx="huis">${B.huis ? "Huis geroepen ✓" : "Huis roepen"}</button>` : ""}
      </div>
      <ol class="mx-list">${R.volgorde.map((n, i) => { const u = R.uitslagen[n]; return `<li class="${i === R.beurt ? "now" : ""}"><span>${esc(n)}</span><span>${u ? `<b>${esc(u.label)}</b>` : i < R.beurt ? "" : "–"}</span></li>`; }).join("")}</ol>
    </div>`;
  }

  function renderBattle() {
    const Bt = S.battle;
    return `<div class="mx-board"><div class="mx-turn"><div class="k">Gelijk laagst</div><div class="mx-name">Battle!</div><p class="mx-sub">Allebei één steen. <b>Hoogste verliest.</b></p></div>
      <div class="mx-battle">${Bt.spelers.map(n => `<div><div class="nm">${esc(n)}</div>${Bt.worpen[n] ? steen(Bt.worpen[n]) : `<button type="button" class="btn" data-mx="battle" data-n="${esc(n)}">Gooi</button>`}</div>`).join("")}</div>
      ${Bt.gelijk ? `<div class="mx-msgs"><p>Weer gelijk – opnieuw!</p></div>` : ""}</div>`;
  }

  function renderEinde() {
    const U = S.uitslag;
    return `<div class="mx-board mx-end"><div class="k">Verliezer</div><div class="mx-name">${esc(U.verliezer)}</div>
      <div class="mx-penalty">${bak(U.straf)}</div>
      <p class="mx-sub">Medespelers mogen samen hooguit ${U.hulp ? bak(U.hulp) : "niets"} overnemen.</p>
      <div class="mx-buttons"><button type="button" class="btn mx-big" data-mx="nieuwe">Nieuwe ronde – ${esc(U.verliezer)} begint</button></div></div>`;
  }

  function renderScore() {
    const rows = Object.entries(S.stats).filter(([n]) => S.spelers.includes(n) || S.stats[n].verloren);
    if (!rows.length) return "";
    rows.sort((a, b) => b[1].verloren - a[1].verloren || b[1].bakken - a[1].bakken || a[0].localeCompare(b[0]));
    return `<div class="mx-score"><h3 class="sub-h">Scorebord deze avond</h3><table><thead><tr><th>Speler</th><th class="r">Verloren</th><th class="r">Bakken</th><th class="r">Mex</th><th class="r">100-man</th></tr></thead><tbody>
      ${rows.map(([n, s]) => `<tr><td>${esc(n)}</td><td class="r">${s.verloren}</td><td class="r">${String(s.bakken).replace(".", ",")}</td><td class="r">${s.mex}</td><td class="r">${s.honderd}</td></tr>`).join("")}</tbody></table></div>`;
  }

  /* ---------- Animatie ---------- */
  function rolAnimatie(klaar) {
    const el = document.getElementById("mx-dice");
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return klaar();
    let n = 0; el.classList.add("rolling");
    const t = setInterval(() => {
      const B = S.ronde.huidig;
      el.innerHTML = (B.slot ? steen(B.slot, "kept") : steen(d6())) + steen(d6());
      if (++n >= 7) { clearInterval(t); el.classList.remove("rolling"); klaar(); }
    }, 60);
  }

  /* ---------- Knoppen ---------- */
  box.addEventListener("click", e => {
    const b = e.target.closest("[data-mx]"); if (!b) return;
    const a = b.dataset.mx;
    if (a === "pick") { S.spelers.push(b.dataset.n); save(); render(); }
    if (a === "weg") { S.spelers.splice(Number(b.dataset.i), 1); save(); render(); }
    if (a === "voeg") { voegToe(); }
    if (a === "start") { if (S.spelers.length >= 2) { S.rondeNr = 0; startRonde(S.spelers, S.spelers[0]); save(); render(); } }
    if (a === "reset-stats") { S.stats = {}; S.honderd = { main: null, extra: null }; save(); render(); }
    if (a === "gooi") { b.disabled = true; rolAnimatie(gooi); }
    if (a === "huis") { S.ronde.huidig.huis = !S.ronde.huidig.huis; save(); render(); }
    if (a === "volgende") volgende();
    if (a === "battle") battleGooi(b.dataset.n);
    if (a === "nieuwe") { startRonde(S.spelers, S.uitslag.verliezer); save(); render(); }
    if (a === "stop") { S.fase = "setup"; S.ronde = null; S.battle = null; save(); render(); }
  });
  box.addEventListener("change", e => {
    if (e.target.id === "mx-extra" && e.target.value) { S.honderd.extra = e.target.value; S.ronde.huidig.kiesExtra = false; S.ronde.huidig.berichten.push(`${esc(e.target.value)} is de extra 100-man.`); save(); render(); }
  });
  box.addEventListener("keydown", e => { if (e.target.id === "mx-naam" && e.key === "Enter") voegToe(); });
  function voegToe() {
    const inp = document.getElementById("mx-naam"); const n = (typeof canon === "function" ? canon(inp.value) : inp.value.trim());
    if (n && !S.spelers.includes(n)) S.spelers.push(n);
    save(); render(); document.getElementById("mx-naam")?.focus();
  }

  window.renderMex = render;
  render();
})();
