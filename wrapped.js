/* =========================================================
   Kamelen Wrapped: jouw seizoen als verhaal in kaartjes (zoals Spotify Wrapped)
   Tik rechts = verder, links = terug, vasthouden = pauze, × of naar beneden vegen = sluiten.
   Gebruikt uit index.html: DATA, esc, playerData, buildRanking, fmtL, badgeLijst, badgeTelling, isUs
   ========================================================= */
(function () {
  const DUUR = 7000;
  const een = x => (Math.round(x * 10) / 10).toString().replace(".", ",");
  const plekTekst = n => n === 1 ? "de nummer 1" : `${n}e`;

  function seizoen() { const nu = new Date(), j = nu.getMonth() >= 7 ? nu.getFullYear() : nu.getFullYear() - 1; return `${j}/${String(j + 1).slice(2)}`; }

  /* Rang van naam in een lijst [{naam, waarde}] (hoog is beter tenzij laagBeter) */
  function rang(lijst, naam) {
    const s = [...lijst].sort((a, b) => b.w - a.w);
    const mij = s.find(x => x.naam === naam); if (!mij) return 0;
    return s.filter(x => x.w > mij.w).length + 1;
  }

  function kaarten(naam) {
    const k = [];
    const spelers = playerData().filter(p => !p.invaller);
    const ik = playerData().find(p => p.naam === naam);
    if (!ik) return null;
    const n = spelers.length;

    k.push({ kleur: "k-blauw", html: `<div class="wr-klein">Kamelen Wrapped ${seizoen()}</div>
      <h2 class="wr-groot">${esc(naam)},<br>dit was jouw seizoen</h2>
      <p class="wr-tekst">Tot nu toe dan. Tik rechts voor verder, links voor terug. Hou vast om te pauzeren.</p><div class="wr-kameel" aria-hidden="true">🐪</div>` });

    /* Opkomst */
    const o = (DATA.profielOpkomst || new Map()).get(naam);
    if (o && (o.wT || o.tT)) {
      const op = new Map(DATA.profielOpkomst);
      const totP = x => (x.wA + x.tA) / Math.max(1, x.wT + x.tT);
      const r = rang([...op.entries()].filter(([nm]) => spelers.some(s => s.naam === nm)).map(([nm, x]) => ({ naam: nm, w: totP(x) })), naam);
      const p = Math.round(totP(o) * 100);
      k.push({ kleur: "k-groen", html: `<div class="wr-klein">Er zijn</div>
        <div class="wr-getal" data-tel="${p}">${p}%</div><p class="wr-tekst">van alle wedstrijden en trainingen was je erbij.</p>
        <div class="wr-rij"><div><b>${o.wA}/${o.wT}</b><span>wedstrijden</span></div><div><b>${o.tA}/${o.tT}</b><span>trainingen</span></div></div>
        <p class="wr-voet">${r === 1 ? "Niemand was vaker aanwezig. Jij bent het meubilair van het veld." : r <= 3 ? `Daarmee sta je ${r}e van de ${n} Kamelen. Trouw!` : `Plek ${r} van de ${n}. ${p >= 70 ? "Prima, maar het kan altijd vaker." : "Er valt nog wat te winnen."}`}</p>` });
    }

    /* Doelpunten */
    const goals = ik.goals || [];
    const gr = rang(spelers.map(s => ({ naam: s.naam, w: (s.goals || []).length })), naam);
    if (goals.length) {
      const soort = s => goals.filter(g => g.soort === s).length;
      const tegen = new Map(); goals.forEach(g => { const m = g.match; if (!m) return; const t = isUs(m.thuis) ? m.uit : m.thuis; tegen.set(t, (tegen.get(t) || 0) + 1); });
      const fav = [...tegen.entries()].sort((a, b) => b[1] - a[1])[0];
      k.push({ kleur: "k-oranje", html: `<div class="wr-klein">Je schoot</div>
        <div class="wr-getal" data-tel="${goals.length}">${goals.length}</div><p class="wr-tekst">${goals.length === 1 ? "keer raak" : "keer raak"}. ${gr === 1 ? "Niemand scoorde meer: topscorer van de Kamelen!" : `Daarmee ben je ${plekTekst(gr)} op de topscorerslijst.`}</p>
        <div class="wr-rij"><div><b>${soort("veld")}</b><span>uit het veld</span></div><div><b>${soort("sc")}</b><span>strafcorner</span></div><div><b>${soort("sb")}</b><span>strafbal</span></div></div>
        ${fav && fav[1] > 1 ? `<p class="wr-voet">Favoriete slachtoffer: <b>${esc(fav[0])}</b> (${fav[1]} goals).</p>` : ""}` });
    } else {
      k.push({ kleur: "k-oranje", html: `<div class="wr-klein">Doelpunten</div><div class="wr-getal">0</div>
        <p class="wr-tekst">Nog geen goal dit seizoen. Maar zonder jou hadden de anderen er ook geen gemaakt.</p><p class="wr-voet">De eerste is altijd de mooiste. Hij komt eraan.</p>` });
    }

    /* Liters */
    const lit = buildRanking(DATA.liters || [], {}), mijn = lit.find(p => p.naam === naam);
    if (mijn && mijn.liters) {
      const lr = lit.findIndex(p => p.naam === naam) + 1;
      const redenen = new Map(); mijn.feiten.forEach(f => { const r = f.reden || "onbekend"; redenen.set(r, (redenen.get(r) || 0) + 1); });
      const vaak = [...redenen.entries()].sort((a, b) => b[1] - a[1])[0];
      k.push({ kleur: "k-bier", html: `<div class="wr-klein">In de boetepot</div>
        <div class="wr-getal">${fmtL(mijn.liters)}<small> L</small></div>
        <p class="wr-tekst">${lr === 1 ? "Meer dan wie dan ook. Het Liter-incassobureau kent jou bij naam." : `Daarmee sta je ${lr}e in het Liter-incassobureau.`}</p>
        ${vaak ? `<p class="wr-voet">Meest voorkomende reden: <b>${esc(vaak[0])}</b>${vaak[1] > 1 ? ` (${vaak[1]}×)` : ""}.</p>` : ""}
        <p class="wr-voet">${mijn.open ? `Nog <b>${fmtL(mijn.open)} L</b> open. Proost alvast.` : "Alles netjes weggewerkt. Respect."}</p>` });
    } else {
      k.push({ kleur: "k-bier", html: `<div class="wr-klein">In de boetepot</div><div class="wr-getal">0<small> L</small></div>
        <p class="wr-tekst">Geen enkele liter! Een voorbeeld voor het hele team (of je hebt geluk gehad).</p>` });
    }

    /* Kameel & ezel */
    const kz = DATA.kzUitslagen || [];
    if (kz.length) {
      const kt = kz.filter(r => r.kamelen.includes(naam)).length, et = kz.filter(r => r.ezels.includes(naam)).length;
      const ks = kz.reduce((s, r) => s + ((r.k && r.k.get(naam)) || 0), 0), es = kz.reduce((s, r) => s + ((r.e && r.e.get(naam)) || 0), 0);
      k.push({ kleur: "k-zand", html: `<div class="wr-klein">Kameel of ezel?</div>
        <div class="wr-rij groot"><div><b>🐪 ${kt}</b><span>keer kameel van de dag</span></div><div><b>🫏 ${et}</b><span>keer ezel van de dag</span></div></div>
        <p class="wr-tekst">Je kreeg in totaal <b>${ks}</b> ${ks === 1 ? "kameelstem" : "kameelstemmen"} en <b>${es}</b> ${es === 1 ? "ezelstem" : "ezelstemmen"}.</p>
        <p class="wr-voet">${ks > es ? "Je team ziet je vaker als held dan als ezel." : es > ks ? "Het team was soms streng voor je. Volgend seizoen revanche." : "Perfect in balans."}</p>` });
    }

    /* Scorito */
    const tp = DATA.totoProfiel;
    const ts = tp && tp.stand.findIndex(x => x.naam === naam) + 1;
    if (ts) {
      const x = tp.stand[ts - 1];
      k.push({ kleur: "k-paars", html: `<div class="wr-klein">Kamelen-Scorito</div>
        <div class="wr-getal">${ts}<small>e</small></div><p class="wr-tekst">van de ${tp.stand.length} voorspellers, met <b>${x.punten}</b> punten.</p>
        <p class="wr-voet">${x.exact ? `${x.exact}× had je de uitslag precies goed.` : "De exacte uitslag zat er nog niet bij."} ${ts === tp.stand.length ? "Onderaan betekent trakteren…" : ""}</p>` });
    }

    /* Badges */
    try {
      const l = badgeLijst(ik), t = badgeTelling(l), verdiend = l.filter(b => b.ok);
      if (verdiend.length) {
        const telling = new Map();
        spelers.forEach(s => badgeLijst(s).filter(b => b.ok).forEach(b => telling.set(b.naam, (telling.get(b.naam) || 0) + 1)));
        const zeld = [...verdiend].sort((a, b) => (telling.get(a.naam) || 0) - (telling.get(b.naam) || 0))[0];
        k.push({ kleur: "k-goud", html: `<div class="wr-klein">Badges verdiend</div>
          <div class="wr-getal" data-tel="${t.aantal}">${t.aantal}</div>
          <div class="wr-rij"><div><b>🥇 ${t.goud}</b><span>goud</span></div><div><b>🥈 ${t.zilver}</b><span>zilver</span></div><div><b>🥉 ${t.brons}</b><span>brons</span></div></div>
          ${zeld ? `<p class="wr-voet">Je zeldzaamste: <b>${zeld.ic} ${esc(zeld.naam)}</b>${(telling.get(zeld.naam) || 0) === 1 ? ", die heeft verder niemand!" : `, maar ${telling.get(zeld.naam) - 1 === 1 ? "één ander heeft hem" : `${telling.get(zeld.naam) - 1} anderen hebben hem`} ook.`}</p>` : ""}` });
      }
    } catch {}

    /* Jouw Kamelen-type */
    const type = kamelenType({ naam, o, goals: goals.length, gr, mijn, lit, kz, ts, tp });
    k.push({ kleur: "k-blauw", html: `<div class="wr-klein">Jouw Kamelen-type</div>
      <div class="wr-type">${type.ic}</div><h2 class="wr-groot">${type.naam}</h2><p class="wr-tekst">${type.tekst}</p>` });

    /* Slot */
    k.push({ kleur: "k-oranje", slot: true, html: `<div class="wr-klein">Dat was het</div>
      <h2 class="wr-groot">Op naar de rest van het seizoen, ${esc(naam)}!</h2>
      <div class="wr-knoppen"><button type="button" class="wr-knop" data-wr="deel">Deel je seizoen</button><button type="button" class="wr-knop ghost" data-wr="opnieuw">Nog een keer</button></div>
      <p class="wr-voet" id="wr-deelstatus"></p>`, deel: deelTekst({ naam, o, goals: goals.length, mijn, kz, ts, type }) });
    return k;
  }

  function kamelenType({ o, goals, gr, mijn, lit, kz, ts, naam }) {
    const opk = o ? (o.wA + o.tA) / Math.max(1, o.wT + o.tT) : 0;
    const lr = mijn ? lit.findIndex(p => p.naam === naam) + 1 : 0;
    const kt = kz.filter(r => r.kamelen.includes(naam)).length, et = kz.filter(r => r.ezels.includes(naam)).length;
    if (goals && gr === 1) return { ic: "🎯", naam: "De Doelpuntenmachine", tekst: "Als er gescoord moet worden, kijkt iedereen naar jou." };
    if (lr === 1) return { ic: "🍺", naam: "De Vaste Klant", tekst: "Het Liter-incassobureau draait op jouw bijdragen. Zonder jou geen derde helft." };
    if (kt >= 2 && kt > et) return { ic: "🐪", naam: "De Kameel der Kamelen", tekst: "Keer op keer de beste van het veld, volgens je eigen teamgenoten." };
    if (et >= 2 && et > kt) return { ic: "🫏", naam: "De Koppige Ezel", tekst: "Je laat je niet kisten, ook niet door een paar ezel-titels." };
    if (opk >= .9) return { ic: "🧱", naam: "Het Meubilair", tekst: "Altijd aanwezig, altijd betrouwbaar. Zonder jou staat het veld leeg." };
    if (ts === 1) return { ic: "🔮", naam: "De Waarzegger", tekst: "Je weet de uitslag al voordat de bal rolt." };
    if (goals >= 2) return { ic: "⚡", naam: "Het Gevaar", tekst: "Niet altijd in beeld, maar als je er bent, gebeurt er iets." };
    if (mijn && !mijn.open && mijn.liters) return { ic: "🧾", naam: "De Nette Betaler", tekst: "Boetes krijg je, maar je werkt ze ook keurig weg." };
    return { ic: "🛡️", naam: "De Stille Kracht", tekst: "Geen grote cijfers, wel onmisbaar. Elk team heeft iemand zoals jij nodig." };
  }

  function deelTekst({ naam, o, goals, mijn, kz, ts, type }) {
    const r = [`🐪 Kamelen Wrapped ${seizoen()} – ${naam}`];
    if (o && o.wT) r.push(`📅 ${o.wA}/${o.wT} wedstrijden, ${o.tA}/${o.tT} trainingen`);
    r.push(`⚽ ${goals} ${goals === 1 ? "goal" : "goals"}`);
    r.push(`🍺 ${mijn ? fmtL(mijn.liters) : 0} L in de boetepot`);
    if (kz.length) r.push(`🐪 ${kz.filter(x => x.kamelen.includes(naam)).length}× kameel · 🫏 ${kz.filter(x => x.ezels.includes(naam)).length}× ezel`);
    if (ts) r.push(`🔮 ${ts}e in de Kamelen-Scorito`);
    r.push(`${type.ic} ${type.naam}`);
    r.push(location.origin + location.pathname);
    return r.join("\n");
  }

  /* ---------- Weergave ---------- */
  let K = [], i = 0, timer = null, start = 0, rest = DUUR, pauze = false, el = null;

  function open() {
    const naam = (window.IK || {}).naam;
    if (!naam) return;
    K = kaarten(naam);
    if (!K) { alert("Kamelen Wrapped is alleen voor spelers van de selectie."); return; }
    el = document.createElement("div");
    el.className = "wrapped"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Kamelen Wrapped");
    el.innerHTML = `<div class="wr-balken">${K.map(() => `<span><i></i></span>`).join("")}</div>
      <button type="button" class="wr-sluit" aria-label="Sluiten">×</button>
      <div class="wr-kaart" aria-live="polite"></div>
      <button type="button" class="wr-zone links" aria-label="Vorige"></button><button type="button" class="wr-zone rechts" aria-label="Volgende"></button>`;
    document.body.appendChild(el); document.body.classList.add("wrapped-open");
    el.querySelector(".wr-sluit").onclick = sluit;
    el.querySelector(".wr-zone.links").onclick = () => ga(i - 1);
    el.querySelector(".wr-zone.rechts").onclick = () => ga(i + 1);
    const vast = v => () => { if (v) { pauze = true; rest -= performance.now() - start; clearTimeout(timer); } else if (pauze) { pauze = false; plan(); } };
    el.addEventListener("pointerdown", e => { if (!e.target.closest("button:not(.wr-zone)")) vast(true)(); });
    el.addEventListener("pointerup", vast(false)); el.addEventListener("pointercancel", vast(false));
    let y0 = null; el.addEventListener("touchstart", e => { y0 = e.touches[0].clientY; }, { passive: true });
    el.addEventListener("touchend", e => { if (y0 !== null && e.changedTouches[0].clientY - y0 > 110) sluit(); y0 = null; }, { passive: true });
    el.addEventListener("click", e => {
      const b = e.target.closest("[data-wr]"); if (!b) return;
      if (b.dataset.wr === "opnieuw") ga(0);
      if (b.dataset.wr === "deel") deel(K[i].deel);
    });
    document.addEventListener("keydown", toets);
    ga(0);
  }
  function toets(e) { if (!el) return; if (e.key === "Escape") sluit(); if (e.key === "ArrowRight") ga(i + 1); if (e.key === "ArrowLeft") ga(i - 1); }
  function sluit() {
    clearTimeout(timer); document.removeEventListener("keydown", toets);
    if (el) el.remove(); el = null; document.body.classList.remove("wrapped-open");
  }
  function plan() {
    start = performance.now(); clearTimeout(timer);
    const balk = el.querySelectorAll(".wr-balken i")[i];
    balk.style.transition = "none"; const al = 1 - rest / DUUR; balk.style.width = `${al * 100}%`; void balk.offsetWidth;
    if (K[i].slot) { balk.style.width = "100%"; return; }
    balk.style.transition = `width ${rest}ms linear`; balk.style.width = "100%";
    timer = setTimeout(() => ga(i + 1), rest);
  }
  function ga(n) {
    if (!el) return;
    if (n < 0) n = 0;
    if (n >= K.length) return sluit();
    i = n; rest = DUUR; pauze = false;
    el.querySelectorAll(".wr-balken i").forEach((b, j) => { b.style.transition = "none"; b.style.width = j < i ? "100%" : "0%"; });
    el.className = `wrapped ${K[i].kleur}`;
    const kaart = el.querySelector(".wr-kaart");
    kaart.innerHTML = K[i].html; kaart.classList.remove("in"); void kaart.offsetWidth; kaart.classList.add("in");
    /* Getallen laten optellen */
    kaart.querySelectorAll("[data-tel]").forEach(g => {
      const doel = Number(g.dataset.tel), pct = g.textContent.includes("%"), t0 = performance.now();
      if (matchMedia("(prefers-reduced-motion: reduce)").matches || !doel) return;
      const stap = t => { const p = Math.min(1, (t - t0) / 900), v = Math.round(doel * (1 - Math.pow(1 - p, 3))); g.textContent = v + (pct ? "%" : ""); if (p < 1) requestAnimationFrame(stap); };
      requestAnimationFrame(stap);
    });
    plan();
  }
  async function deel(tekst) {
    const st = document.getElementById("wr-deelstatus");
    try {
      if (navigator.share) { await navigator.share({ title: "Kamelen Wrapped", text: tekst }); return; }
      await navigator.clipboard.writeText(tekst); if (st) st.textContent = "Gekopieerd! Plak het in de groepsapp.";
    } catch (e) { if (st && e.name !== "AbortError") st.textContent = "Delen lukte niet."; }
  }

  document.addEventListener("click", e => {
    const a = e.target.closest("[data-wrapped]"); if (!a) return;
    e.preventDefault();
    document.getElementById("more-sheet")?.setAttribute("hidden", ""); document.body.classList.remove("sheet-open");
    open();
  });
  window.openWrapped = open;
})();
