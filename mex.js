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
  const stat = n => { const x = (S.stats[n] = S.stats[n] || { verloren: 0, mex: 0, honderd: 0, bakken: 0 }); x.slokken ??= 0; return x; };

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
    else {
      stat(H.main).slokken += n; if (H.extra) stat(H.extra).slokken += n;
      B.berichten.push(`<b>${waarde}</b> – ${esc(H.main)}${H.extra ? ` en ${esc(H.extra)}` : ""} ${H.extra ? "drinken" : "drinkt"} <b>${n} slokken</b>.`);
    }
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

  function battleGooi() {
    const Bt = S.battle, [x, y] = Bt.spelers;
    if (Bt.worpen[x] && Bt.worpen[y]) return;
    Bt.worpen[x] = d6(); Bt.worpen[y] = d6();
    {
      if (Bt.worpen[x] === Bt.worpen[y]) { Bt.gelijk = true; setTimeout(() => { Bt.worpen = {}; Bt.gelijk = false; save(); render(); }, 2800); }
      else {
        const verliezer = Bt.worpen[x] > Bt.worpen[y] ? x : y;
        /* 2 tegen 1 in een battle telt als extra mex: een halve bak extra straf */
        if (Math.max(Bt.worpen[x], Bt.worpen[y]) === 2 && Math.min(Bt.worpen[x], Bt.worpen[y]) === 1) { Bt.straf += 0.5; Bt.mex = true; }
        setTimeout(() => verloren(verliezer, Bt.straf), Bt.mex ? 4200 : 3200);
      }
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
      <div class="mx-actions"><button type="button" class="btn sm ghost" data-mx="beheer" aria-expanded="${!!beheerOpen}">Spelers</button><button type="button" class="btn sm ghost" data-mx="stop">Stoppen</button></div></div>${beheerOpen ? renderBeheer() : ""}`;
    if (S.fase === "spel") return box.innerHTML = top + renderSpel() + renderScore();
    if (S.fase === "battle") return box.innerHTML = top + renderBattle() + renderScore();
    if (S.fase === "einde") return box.innerHTML = top + renderEinde() + renderScore();
  }

  function renderSetup() {
    const roster = [...(typeof ROSTER !== "undefined" ? ROSTER : [])].filter(n => !S.spelers.includes(n));
    box.innerHTML = `<div class="mx-setup">
      <p>Kies wie er meedoen. Sleep ze daarna in de volgorde van de beurten: de bovenste begint, daarna die eronder, enzovoort.</p>
      ${S.spelers.length ? `<ol class="mx-volgorde" id="mx-volgorde">${S.spelers.map((n, i) => `<li data-i="${i}"><span class="mx-greep" aria-hidden="true">⠿</span><b>${i + 1}</b><span class="mx-vnm">${esc(n)}</span>
        <span class="mx-vknop"><button type="button" aria-label="${esc(n)} omhoog" data-mx="op" data-i="${i}" ${i === 0 ? "disabled" : ""}>↑</button><button type="button" aria-label="${esc(n)} omlaag" data-mx="neer" data-i="${i}" ${i === S.spelers.length - 1 ? "disabled" : ""}>↓</button><button type="button" aria-label="Verwijder ${esc(n)}" data-mx="weg" data-i="${i}">×</button></span></li>`).join("")}</ol>` : `<div class="mx-chips"><span class="mx-hint">Nog niemand gekozen</span></div>`}
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
        ${!B.klaar && B.worpen === 2 && R.max === 3 && B.waarden[0] === B.waarden[1] ? `<button type="button" class="btn ghost ${B.huis ? "on" : ""}" data-mx="huis">${B.huis ? "Huis geroepen ✓" : "Huis roepen"}</button>` : ""}
      </div>
      <ol class="mx-list">${R.volgorde.map((n, i) => { const u = R.uitslagen[n]; return `<li class="${i === R.beurt ? "now" : ""}"><span>${esc(n)}</span><span>${u ? `<b>${esc(u.label)}</b>` : i < R.beurt ? "" : "–"}</span></li>`; }).join("")}</ol>
    </div>`;
  }

  function renderBattle() {
    const Bt = S.battle;
    return `<div class="mx-board"><div class="mx-turn"><div class="k">Gelijk laagst</div><div class="mx-name">Battle!</div><p class="mx-sub">Allebei één steen. <b>Hoogste verliest.</b></p></div>
      <div class="mx-battle" id="mx-battle">${Bt.spelers.map(n => `<div><div class="nm">${esc(n)}</div>${Bt.worpen[n] ? steen(Bt.worpen[n], "land") : steen(1, "idle")}</div>`).join("")}</div>
      ${Bt.worpen[Bt.spelers[0]] ? (Bt.gelijk ? `<p class="mx-sub">Gelijk! Nog een keer…</p>` : Bt.mex ? `<p class="mx-sub"><b>2 tegen 1: dat is mex!</b> Er komt een halve bak bij de straf.</p>` : "") : `<div class="mx-battle-go"><button type="button" class="btn" data-mx="battle">Gooi allebei</button></div>`}
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
    return `<div class="mx-score"><h3 class="sub-h">Scorebord deze avond</h3><table><thead><tr><th>Speler</th><th class="r">Verloren</th><th class="r">Bakken</th><th class="r">Mex</th><th class="r" title="Aantal keer 100 gegooid">100</th><th class="r" title="Slokken gedronken als 100-man">Slokken</th></tr></thead><tbody>
      ${rows.map(([n, s]) => `<tr><td>${esc(n)}</td><td class="r">${s.verloren}</td><td class="r">${String(s.bakken).replace(".", ",")}</td><td class="r">${s.mex}</td><td class="r">${s.honderd}</td><td class="r">${s.slokken || 0}</td></tr>`).join("")}</tbody></table>
      <p class="mx-legenda">100: zo vaak 100 gegooid. Slokken: totaal gedronken als (extra) 100-man.</p></div>`;
  }

  /* ---------- Spelers toevoegen en verwijderen tijdens een pot ---------- */
  let beheerOpen = false;
  function renderBeheer() {
    const roster = [...(typeof ROSTER !== "undefined" ? ROSTER : [])].filter(n => !S.spelers.includes(n));
    const H = S.honderd;
    return `<div class="mx-beheer">
      <h3 class="sub-h">Spelers in deze pot</h3>
      <div class="mx-chips">${S.spelers.map(n => `<span class="mx-chip${n === H.main || n === H.extra ? " honderd" : ""}">${esc(n)}${n === H.main || n === H.extra ? " 💯" : ""} <button type="button" aria-label="${esc(n)} verlaat het spel" data-mx="verlaat" data-n="${esc(n)}">×</button></span>`).join("")}</div>
      <div class="mx-add"><input type="text" id="mx-naam" placeholder="Iemand komt erbij" autocomplete="off"><button type="button" class="btn sm" data-mx="voeg">Toevoegen</button></div>
      ${roster.length ? `<div class="mx-roster"><span class="mx-hint">Snel kiezen:</span>${roster.map(n => `<button type="button" class="mx-pick" data-mx="pick" data-n="${esc(n)}">${esc(n)}</button>`).join("")}</div>` : ""}
      <p class="mx-hint">Nieuwe spelers sluiten achteraan aan in de lopende ronde.</p>
    </div>`;
  }
  function erbij(n) {
    if (!n || S.spelers.includes(n)) return;
    S.spelers.push(n);
    const R = S.ronde;
    if (S.fase === "spel" && R && !R.verliezers && !R.volgorde.includes(n)) R.volgorde.push(n);
  }
  function verlaat(n) {
    const H = S.honderd;
    if (n === H.main || n === H.extra) return honderdAlarm(n);
    if (S.fase === "battle" && S.battle.spelers.includes(n)) return melding(`${esc(n)} zit midden in een battle en kan nu niet weg.`);
    if (S.ronde?.verliezers && S.fase === "spel" && S.ronde.volgorde.includes(n)) return melding(`${esc(n)} zit in het verliezerspotje en moet dat eerst uitspelen.`);
    if (S.spelers.length <= 2) return melding("Met minder dan 2 spelers valt er niks te mexen.");
    S.spelers = S.spelers.filter(x => x !== n);
    const R = S.ronde;
    if (S.fase === "spel" && R) {
      const i = R.volgorde.indexOf(n);
      if (i >= 0) {
        R.volgorde.splice(i, 1); delete R.uitslagen[n];
        if (i < R.beurt) R.beurt--;
        else if (i === R.beurt) { nieuweBeurt(); if (R.beurt >= R.volgorde.length) { R.beurt = R.volgorde.length - 1; save(); return eindeRonde(); } }
      }
    }
    save(); render();
  }
  function melding(tekst) {
    const R = S.ronde; if (R?.huidig) { R.huidig.berichten.push(tekst); render(); } else alert(tekst.replace(/<[^>]+>/g, ""));
  }
  /* Groot rood knipperend alarm: de 100-man mag niet weg */
  function honderdAlarm(n) {
    document.querySelector(".mx-alarm")?.remove();
    const d = document.createElement("div");
    d.className = "mx-alarm"; d.setAttribute("role", "alertdialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-labelledby", "mx-alarm-t");
    d.innerHTML = `<div class="mx-alarm-in"><div class="mx-alarm-ic" aria-hidden="true">🚨</div>
      <h2 id="mx-alarm-t">LET OP!<br>${esc(n).toUpperCase()}, JE BENT 100-MAN.<br>JE MAG NIET WEG!</h2>
      <p>Eerst moet iemand anders 100 gooien. Alleen als <b>iedereen</b> toestemming geeft, mag je eerder weg.</p>
      <div class="mx-alarm-knoppen"><button type="button" class="mx-alarm-ok">Oké, ik blijf zitten</button><button type="button" class="mx-alarm-toestemming">Iedereen geeft toestemming</button></div>
      <div class="mx-toestemming" hidden><p>Iedereen tikt zelf op zijn naam om akkoord te geven:</p>
        <div class="mx-akkoord">${S.spelers.filter(x => x !== n).map(x => `<button type="button" data-akkoord="${esc(x)}" aria-pressed="false">${esc(x)}</button>`).join("")}</div>
        <button type="button" class="mx-alarm-weg" disabled>${esc(n)} mag weg</button></div></div>`;
    document.body.appendChild(d);
    const sluit = () => { stopSirene(); d.remove(); };
    d.querySelector(".mx-alarm-ok").onclick = sluit;
    d.querySelector(".mx-alarm-toestemming").onclick = () => {
      stopSirene(); clearTimeout(stopTimer);
      d.classList.add("rustig"); d.querySelector(".mx-toestemming").hidden = false; d.querySelector(".mx-alarm-toestemming").hidden = true;
    };
    d.querySelector(".mx-akkoord").onclick = e => {
      const b = e.target.closest("[data-akkoord]"); if (!b) return;
      b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true");
      const alle = [...d.querySelectorAll("[data-akkoord]")].every(x => x.getAttribute("aria-pressed") === "true");
      d.querySelector(".mx-alarm-weg").disabled = !alle;
    };
    d.querySelector(".mx-alarm-weg").onclick = () => {
      sluit();
      const H = S.honderd;
      if (H.main === n) { H.main = H.extra; H.extra = null; } else if (H.extra === n) H.extra = null;
      const R = S.ronde; if (R?.huidig) R.huidig.berichten.push(`Iedereen gaf toestemming: ${esc(n)} mag weg als 100-man.${H.main ? ` ${esc(H.main)} is nu de 100-man.` : " Er is nu geen 100-man."}`);
      verlaat(n);
    };
    d.querySelector(".mx-alarm-ok").focus();
    try { navigator.vibrate?.([400, 150, 400, 150, 400, 150, 800]); } catch {}
    sirene();
    const stopTimer = setTimeout(() => { if (d.isConnected && !d.classList.contains("rustig")) sluit(); }, 12000);
  }
  let ac = null, sireneOsc = null;
  function sirene() {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume();
      const o = ac.createOscillator(), g = ac.createGain(), nu = ac.currentTime;
      o.type = "sawtooth"; g.gain.value = .08;
      for (let i = 0; i < 8; i++) { o.frequency.setValueAtTime(660, nu + i * .5); o.frequency.linearRampToValueAtTime(990, nu + i * .5 + .25); o.frequency.linearRampToValueAtTime(660, nu + i * .5 + .5); }
      g.gain.setValueAtTime(.08, nu + 3.8); g.gain.linearRampToValueAtTime(0, nu + 4);
      o.connect(g).connect(ac.destination); o.start(nu); o.stop(nu + 4); sireneOsc = o;
    } catch {}
  }
  function stopSirene() { try { sireneOsc?.stop(); } catch {} sireneOsc = null; }

  /* ---------- Beurtvolgorde slepen ---------- */
  let sleep = null;
  box.addEventListener("pointerdown", e => {
    const li = e.target.closest("#mx-volgorde li"); if (!li || e.target.closest("button")) return;
    e.preventDefault();
    const lijst = li.parentElement, items = [...lijst.children];
    sleep = { li, lijst, van: Number(li.dataset.i), y0: e.clientY, h: li.getBoundingClientRect().height + 6, naar: Number(li.dataset.i), n: items.length };
    li.classList.add("sleept"); li.setPointerCapture?.(e.pointerId);
  });
  box.addEventListener("pointermove", e => {
    if (!sleep) return;
    const dy = e.clientY - sleep.y0, naar = Math.max(0, Math.min(sleep.n - 1, sleep.van + Math.round(dy / sleep.h)));
    sleep.li.style.transform = `translateY(${dy}px)`; sleep.naar = naar;
    [...sleep.lijst.children].forEach((x, i) => {
      if (x === sleep.li) return;
      const schuif = (i > sleep.van && i <= naar) ? -sleep.h : (i < sleep.van && i >= naar) ? sleep.h : 0;
      x.style.transform = schuif ? `translateY(${schuif}px)` : "";
    });
  });
  const loslaten = () => {
    if (!sleep) return;
    const { van, naar } = sleep; sleep = null;
    if (van !== naar) { const [n] = S.spelers.splice(van, 1); S.spelers.splice(naar, 0, n); save(); }
    render();
  };
  box.addEventListener("pointerup", loslaten); box.addEventListener("pointercancel", loslaten);

  /* ---------- Animatie ---------- */
  function rolAnimatie(klaar) {
    const el = document.getElementById("mx-dice");
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return klaar();
    let n = 0; el.classList.add("rolling");
    const t = setInterval(() => {
      const B = S.ronde.huidig;
      el.innerHTML = (B.slot ? steen(B.slot, "kept") : steen(d6())) + steen(d6());
      if (++n >= 12) { clearInterval(t); el.classList.remove("rolling"); klaar(); }
    }, 70);
  }

  /* Battle: de stenen worden echt over tafel gegooid. Ze komen van onderen binnen,
     stuiteren een paar keer, draaien uit en vallen stil op hun plek. */
  function battleAnimatie(klaar) {
    const el = document.getElementById("mx-battle");
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches || !Element.prototype.animate) return klaar();
    const vakken = [...el.querySelectorAll(":scope > div")];
    const DUUR = 1500;
    vakken.forEach((v, i) => {
      const d = v.querySelector(".mx-die"); if (!d) return;
      d.classList.remove("idle");
      const kant = i === 0 ? 1 : -1;                 // linker steen komt van rechtsonder, rechter van linksonder
      const x = kant * (70 + Math.random() * 40), draai = kant * (900 + Math.random() * 360);
      d.animate([
        { transform: `translate(${x}px, 120px) rotate(0deg) scale(.7)`, opacity: 0 },
        { offset: .12, opacity: 1, transform: `translate(${x * .75}px, -46px) rotate(${draai * .25}deg) scale(1.08)` },
        { offset: .32, transform: `translate(${x * .45}px, 0) rotate(${draai * .5}deg) scale(1)` },
        { offset: .5, transform: `translate(${x * .25}px, -20px) rotate(${draai * .7}deg)` },
        { offset: .68, transform: `translate(${x * .1}px, 0) rotate(${draai * .86}deg)` },
        { offset: .8, transform: `translate(${x * .04}px, -6px) rotate(${draai * .95}deg)` },
        { offset: .9, transform: `translate(0, 0) rotate(${draai * .99}deg)` },
        { transform: `translate(0, 0) rotate(${draai}deg)` }
      ], { duration: DUUR + i * 120, easing: "cubic-bezier(.25,.7,.35,1)", fill: "forwards" });
      /* Ogen wisselen tijdens het rollen, steeds langzamer */
      let t = 0, stap = 55;
      const wissel = () => {
        if (t > DUUR - 150) return;
        const svg = d.querySelector(".die"); if (svg) svg.outerHTML = dieSvg(d6());
        t += stap; stap *= 1.18; setTimeout(wissel, stap);
      };
      wissel();
    });
    setTimeout(klaar, DUUR + 160);
  }

  /* ---------- Knoppen ---------- */
  box.addEventListener("click", e => {
    const b = e.target.closest("[data-mx]"); if (!b) return;
    const a = b.dataset.mx;
    if (a === "pick") { if (S.fase === "setup") S.spelers.push(b.dataset.n); else erbij(b.dataset.n); save(); render(); }
    if (a === "op" || a === "neer") { const i = Number(b.dataset.i), j = i + (a === "op" ? -1 : 1); [S.spelers[i], S.spelers[j]] = [S.spelers[j], S.spelers[i]]; save(); render(); }
    if (a === "beheer") { beheerOpen = !beheerOpen; render(); }
    if (a === "verlaat") verlaat(b.dataset.n);
    if (a === "weg") { S.spelers.splice(Number(b.dataset.i), 1); save(); render(); }
    if (a === "voeg") { voegToe(); }
    if (a === "start") { if (S.spelers.length >= 2) { S.rondeNr = 0; startRonde(S.spelers, S.spelers[0]); save(); render(); } }
    if (a === "reset-stats") { S.stats = {}; S.honderd = { main: null, extra: null }; save(); render(); }
    if (a === "gooi") { b.disabled = true; rolAnimatie(gooi); }
    if (a === "huis") { S.ronde.huidig.huis = !S.ronde.huidig.huis; save(); render(); }
    if (a === "volgende") volgende();
    if (a === "battle") { b.disabled = true; battleAnimatie(battleGooi); }
    if (a === "nieuwe") { startRonde(S.spelers, S.uitslag.verliezer); save(); render(); }
    if (a === "stop") { S.fase = "setup"; S.ronde = null; S.battle = null; save(); render(); }
  });
  box.addEventListener("change", e => {
    if (e.target.id === "mx-extra" && e.target.value) { S.honderd.extra = e.target.value; S.ronde.huidig.kiesExtra = false; S.ronde.huidig.berichten.push(`${esc(e.target.value)} is de extra 100-man.`); save(); render(); }
  });
  box.addEventListener("keydown", e => { if (e.target.id === "mx-naam" && e.key === "Enter") voegToe(); });
  function voegToe() {
    const inp = document.getElementById("mx-naam"); const n = (typeof canon === "function" ? canon(inp.value) : inp.value.trim());
    if (n && !S.spelers.includes(n)) { if (S.fase === "setup") S.spelers.push(n); else erbij(n); }
    save(); render(); document.getElementById("mx-naam")?.focus();
  }

  window.renderMex = render;
  render();
})();
