/* =========================================================
   Coachfunctie, beheerpaneel en bonusvraag-beheer
   - Opstelling: coaches en beheerders zetten de spelers van die wedstrijd op het veld of op de bank.
     Iedereen ziet de opstelling bij de wedstrijd.
   - Beheerpaneel: alleen voor wie de beheercode heeft of als coach is ingelogd.
   Opslag in het Apps Script (types "opstelling", "bonusvraag", "bonus-uitslag").
   ========================================================= */
(function () {
  const CFG = () => window.TOTO_CONFIG || {};
  const sleutel = m => `${m.datum}|${m.thuis}|${m.uit}`;
  const bcode = () => { try { return localStorage.getItem("kamelen-beheer") || ""; } catch { return ""; } };
  const isBeheer = () => !!bcode() || (window.IK || {}).rol === "coach";
  window.kamelenIsBeheer = isBeheer;
  const onze = () => [...(DATA.uitslagen || []), ...(DATA.programma || [])].filter(m => isUs(m.thuis + m.uit))
    .sort((a, b) => toDate(a.datum, a.tijd || "12:00") - toDate(b.datum, b.tijd || "12:00"));
  const post = body => fetch(CFG().api, { method: "POST", body: JSON.stringify({ code: (window.IK || {}).code || "", beheercode: bcode(), ...body }) }).then(r => r.json());
  const foutTekst = f => f === "geen rechten" ? "Alleen coaches en beheerders kunnen dit." : f === "code" ? "Je inlogcode klopt niet meer. Log opnieuw in." : f === "te laat" ? "De wedstrijd is al begonnen." : f ? "Het script moet nog bijgewerkt worden." : "Opslaan lukte niet.";

  /* Wie doet er mee: de selectie uit de app, anders de aanwezigen uit het afwezigheidsblad */
  function selectieVan(m) {
    if ((DATA.opstelling || []).length && DATA.opstellingWedstrijd === m.datum) return DATA.opstelling.map(canon);
    const w = (DATA.wedAanwezig || []).find(x => x.datum === m.datum);
    return w && w.aanwezig.size ? [...w.aanwezig].map(canon) : [];
  }
  /* Selectie nog niet bekend: alle spelers, daarna de invallers */
  function iedereen() {
    const vast = [...(typeof ROSTER !== "undefined" ? ROSTER : [])].sort((a, b) => a.localeCompare(b));
    const inv = [...(typeof INVALLERS !== "undefined" ? INVALLERS : []), ...(DATA.invalSheet || []).map(x => x.naam)].map(canon).filter(Boolean);
    return [...new Set([...vast, ...[...new Set(inv)].sort((a, b) => a.localeCompare(b))])];
  }
  const keuzeVan = m => { const s = selectieVan(m); return s.length ? s : iedereen(); };
  window.keuzeVan = keuzeVan;
  window.selectieVan = selectieVan;

  /* ---------- Het veld ---------- */
  /* Hockeyveld van boven, ons doel onderaan. Coördinaten in procenten van het veld. */
  const LIJNEN = `<svg class="cv-lijnen" viewBox="0 0 100 160" preserveAspectRatio="none" aria-hidden="true">
    <rect x="3" y="3" width="94" height="154" fill="none"/>
    <line x1="3" y1="80" x2="97" y2="80"/>
    <line x1="3" y1="40" x2="97" y2="40" stroke-dasharray="2 1.5"/><line x1="3" y1="120" x2="97" y2="120" stroke-dasharray="2 1.5"/>
    <path d="M23 3 V9 A27 27 0 0 0 77 9 V3" fill="none"/><path d="M23 157 V151 A27 27 0 0 1 77 151 V157" fill="none"/>
    <path d="M17 3 V9 A33 33 0 0 0 83 9 V3" fill="none" stroke-dasharray="1.6 1.6"/><path d="M17 157 V151 A33 33 0 0 1 83 151 V157" fill="none" stroke-dasharray="1.6 1.6"/>
    <circle cx="50" cy="19" r=".7" class="stip"/><circle cx="50" cy="141" r=".7" class="stip"/>
    <rect x="45" y="0.6" width="10" height="2.4" class="doel"/><rect x="45" y="157" width="10" height="2.4" class="doel"/>
  </svg>`;
  /* Standaard opstelling (1-4-3-3 zoals de coaches hem gebruiken): keeper, vier backs, drie middenvelders, drie aanvallers */
  const VAKKEN = [[50, 92], [16, 72], [40, 76], [60, 79], [84, 72], [24, 53], [50, 58], [76, 53], [50, 33], [24, 22], [76, 22]];
  const lijnVan = y => y > 86 ? "keeper" : y > 65 ? "verdediging" : y > 40 ? "middenveld" : "aanval";
  const initialen = n => String(n).split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  function speler(p, bewerk) {
    return `<button type="button" class="cv-sp ${lijnVan(p.y)}" style="left:${p.x}%;top:${p.y}%" data-naam="${esc(p.n)}" ${bewerk ? "" : "tabindex=-1"}>
      <span class="cv-schijf">${esc(initialen(p.n))}</span><span class="cv-naam">${esc(p.n)}</span></button>`;
  }
  function veldHtml(o, bewerk) {
    o = o || { veld: [], bank: [] };
    return `<div class="cv-wrap"><div class="cv-veld${bewerk ? " bewerk" : ""}" data-zone="veld">${LIJNEN}${(o.veld || []).map(p => speler(p, bewerk)).join("")}</div>
      <div class="cv-bank" data-zone="bank"><span class="cv-bank-k">Bank</span>${(o.bank || []).length ? o.bank.map(n => `<button type="button" class="cv-chip" data-naam="${esc(n)}">${esc(n)}</button>`).join("") : `<span class="cv-leeg">${bewerk ? "Sleep spelers hierheen" : "Niemand"}</span>`}</div></div>`;
  }
  window.veldHtml = veldHtml;

  /* ---------- Bij een wedstrijd (dialoog): de opstelling tonen, en voor beheerders een knop ---------- */
  window.coachVulOpstelling = async function (m) {
    const el = document.getElementById("wm-opstelling"); if (!el) return;
    const j = await window.kamelenApi?.().catch(() => ({})) || {};
    const o = (j.opstellingen || {})[sleutel(m)];
    const knop = isBeheer() ? `<button type="button" class="btn sm" data-coach-bewerk="${esc(sleutel(m))}">${o ? "✏️ Opstelling aanpassen" : "✏️ Opstelling maken"}</button>` : "";
    if (!o && !knop) { el.remove(); return; }
    el.innerHTML = `<h3 class="sub-h">Opstelling</h3>${o ? veldHtml(o.opstelling, false) + `<p class="muted cv-door">Gemaakt door ${esc(o.door || "de coach")}</p>` : `<p class="muted">Nog geen opstelling.</p>`}${knop}`;
  };
  document.addEventListener("click", e => { const b = e.target.closest("[data-coach-bewerk]"); if (!b) return; const m = onze().find(x => sleutel(x) === b.dataset.coachBewerk); if (m) openEditor(m); });

  /* ---------- De editor ---------- */
  let ed = null;   // { m, o, sel, gekozen }
  async function openEditor(m) {
    const j = await window.kamelenApi?.(true).catch(() => ({})) || {};
    const bestaand = (j.opstellingen || {})[sleutel(m)];
    const sel = keuzeVan(m), bekend = selectieVan(m).length > 0;
    ed = { m, sel, bekend, o: bestaand ? JSON.parse(JSON.stringify(bestaand.opstelling)) : { veld: [], bank: [] }, gekozen: null };
    /* alleen spelers uit de selectie houden */
    if (bekend) { ed.o.veld = ed.o.veld.filter(p => sel.includes(p.n)); ed.o.bank = ed.o.bank.filter(n => sel.includes(n)); }
    let sh = document.getElementById("coach-sheet");
    if (!sh) { sh = document.createElement("div"); sh.id = "coach-sheet"; sh.className = "coach-sheet"; document.body.appendChild(sh); }
    sh.hidden = false; document.body.classList.add("sheet-open"); tekenEditor();
  }
  function sluitEditor() { const sh = document.getElementById("coach-sheet"); if (sh) sh.hidden = true; document.body.classList.remove("sheet-open"); ed = null; }
  function tekenEditor() {
    const sh = document.getElementById("coach-sheet"); if (!sh || !ed) return;
    const { m, o, sel } = ed, opVeld = new Set(o.veld.map(p => p.n)), opBank = new Set(o.bank);
    const vrij = sel.filter(n => !opVeld.has(n) && !opBank.has(n));
    sh.innerHTML = `<div class="cs-kop"><button type="button" class="cs-x" data-cs="sluit" aria-label="Sluiten">×</button>
        <div><div class="k">Opstelling</div><b>${esc(isUs(m.thuis) ? "Kamelen" : kortTeam(m.thuis))} – ${esc(isUs(m.uit) ? "Kamelen" : kortTeam(m.uit))}</b> <small>${fmtDay(m.datum, { weekday: "short", day: "numeric", month: "short" })}</small></div>
        <button type="button" class="btn sm" data-cs="opslaan">Opslaan</button></div>
      <div class="cs-body" data-geen-swipe data-geen-trek>
        ${ed.bekend ? "" : `<p class="cs-uitleg"><b>De selectie is nog niet bekend</b>, dus je kunt uit alle spelers en invallers kiezen.</p>`}
        <p class="cs-uitleg">Tik op een naam en daarna op een plek op het veld. Sleep spelers om ze te verplaatsen, naar de bank of terug naar de lijst.</p>
        ${veldHtml(o, true)}
        <div class="cs-pool" data-zone="pool"><span class="cv-bank-k">${ed.bekend ? "Selectie" : "Alle spelers"}</span>${vrij.length ? vrij.map(n => `<button type="button" class="cv-chip${ed.gekozen === n ? " aan" : ""}" data-naam="${esc(n)}">${esc(n)}</button>`).join("") : `<span class="cv-leeg">${sel.length ? "Iedereen staat op het veld of de bank" : ""}</span>`}</div>
        <div class="cs-knoppen"><button type="button" class="btn sm ghost" data-cs="auto">Standaard opstelling</button><button type="button" class="btn sm ghost" data-cs="leeg">Leegmaken</button><span class="tt-status" id="cs-status" role="status"></span></div>
      </div>`;
    if (ed.gekozen) sh.querySelectorAll(`.cv-chip[data-naam="${CSS.escape(ed.gekozen)}"], .cv-sp[data-naam="${CSS.escape(ed.gekozen)}"]`).forEach(x => x.classList.add("aan"));
  }
  const weg = n => { ed.o.veld = ed.o.veld.filter(p => p.n !== n); ed.o.bank = ed.o.bank.filter(x => x !== n); };
  function zetOp(n, zone, x, y) { weg(n); if (zone === "veld") ed.o.veld.push({ n, x: Math.round(Math.max(4, Math.min(96, x))), y: Math.round(Math.max(3, Math.min(97, y))) }); else if (zone === "bank") ed.o.bank.push(n); }
  const veldPunt = (veld, cx, cy) => { const r = veld.getBoundingClientRect(); return [(cx - r.left) / r.width * 100, (cy - r.top) / r.height * 100]; };

  document.addEventListener("click", async e => {
    const sh = document.getElementById("coach-sheet"); if (!sh || sh.hidden || !ed || !sh.contains(e.target)) return;
    if (_sleepNet) { _sleepNet = false; return; }
    const knop = e.target.closest("[data-cs]");
    if (knop) {
      const a = knop.dataset.cs;
      if (a === "sluit") return sluitEditor();
      if (a === "leeg") { ed.o = { veld: [], bank: [] }; ed.gekozen = null; return tekenEditor(); }
      if (a === "auto") { const al = new Set(ed.o.veld.map(p => p.n)); const vrij = ed.sel.filter(n => !al.has(n));
        VAKKEN.filter(([x, y]) => !ed.o.veld.some(p => Math.abs(p.x - x) < 6 && Math.abs(p.y - y) < 6)).forEach(([x, y]) => { const n = vrij.shift(); if (n) zetOp(n, "veld", x, y); });
        if (ed.bekend) vrij.forEach(n => { if (!ed.o.bank.includes(n)) zetOp(n, "bank"); }); return tekenEditor(); }
      if (a === "opslaan") { const st = document.getElementById("cs-status"); st.textContent = "Opslaan…"; knop.disabled = true;
        try { const r = await post({ type: "opstelling", wedstrijd: sleutel(ed.m), opstelling: ed.o });
          if (r.ok) { st.textContent = "Opgeslagen!"; const m = ed.m; await window.kamelenApi?.(true); setTimeout(() => { sluitEditor(); window.coachVulOpstelling(m); renderBeheer(); }, 500); }
          else { st.textContent = foutTekst(r.fout); knop.disabled = false; } }
        catch { st.textContent = "Geen verbinding."; knop.disabled = false; } return; }
    }
    const chip = e.target.closest(".cv-chip, .cv-sp");
    if (chip) { const n = chip.dataset.naam; ed.gekozen = ed.gekozen === n ? null : n; return tekenEditor(); }
    const zone = e.target.closest("[data-zone]");
    if (zone && ed.gekozen) { const z = zone.dataset.zone;
      if (z === "veld") { const [x, y] = veldPunt(zone, e.clientX, e.clientY); zetOp(ed.gekozen, "veld", x, y); }
      else if (z === "bank") zetOp(ed.gekozen, "bank"); else weg(ed.gekozen);
      ed.gekozen = null; tekenEditor(); }
  });
  /* Slepen (vinger of muis) */
  let sleep = null, _sleepNet = false;
  document.addEventListener("pointerdown", e => {
    const sh = document.getElementById("coach-sheet"); if (!sh || sh.hidden || !ed) return;
    const el = e.target.closest(".cs-body .cv-sp, .cs-body .cv-chip"); if (!el) return;
    sleep = { n: el.dataset.naam, x0: e.clientX, y0: e.clientY, el, spook: null };
  });
  document.addEventListener("pointermove", e => {
    if (!sleep) return;
    if (!sleep.spook) { if (Math.hypot(e.clientX - sleep.x0, e.clientY - sleep.y0) < 8) return;
      sleep.spook = document.createElement("div"); sleep.spook.className = "cv-spook"; sleep.spook.textContent = sleep.n; document.body.appendChild(sleep.spook); sleep.el.classList.add("weg"); }
    e.preventDefault(); sleep.spook.style.left = e.clientX + "px"; sleep.spook.style.top = e.clientY + "px";
  }, { passive: false });
  document.addEventListener("pointerup", e => {
    if (!sleep) return; const s = sleep; sleep = null; if (!s.spook) return;
    s.spook.remove(); _sleepNet = true; setTimeout(() => { _sleepNet = false; }, 50);
    const onder = document.elementFromPoint(e.clientX, e.clientY), zone = onder && onder.closest("[data-zone]");
    if (zone) { const z = zone.dataset.zone; if (z === "veld") { const [x, y] = veldPunt(zone, e.clientX, e.clientY); zetOp(s.n, "veld", x, y); } else if (z === "bank") zetOp(s.n, "bank"); else weg(s.n); }
    ed.gekozen = null; tekenEditor();
  });
  document.addEventListener("pointercancel", () => { if (sleep && sleep.spook) sleep.spook.remove(); sleep = null; });

  /* ---------- Beheerpaneel ---------- */
  function zichtbaarheid() { document.querySelectorAll("[data-beheer-link]").forEach(a => { a.hidden = !isBeheer(); }); document.querySelectorAll("[data-beheer-login]").forEach(a => { a.hidden = isBeheer() || (window.IK || {}).rol === "gast"; }); }
  addEventListener("storage", zichtbaarheid); addEventListener("focus", zichtbaarheid);
  async function renderBeheer() {
    zichtbaarheid();
    const box = document.getElementById("beheer"); if (!box) return;
    if (!isBeheer()) { box.innerHTML = `<div class="card"><h2 class="cb-h">Inloggen als beheerder</h2><p class="muted">Vul de beheercode in. Hij wordt alleen op dit apparaat bewaard; daarna zie je in het menu Meer de knop Beheer en bij elke wedstrijd de opstelling.</p><form id="cb-login" class="cb-rij"><input id="cb-code" type="password" placeholder="Beheercode" autocomplete="off"><button class="btn sm" type="submit">Inloggen</button></form><span class="tt-status" id="cb-st" role="status"></span></div>`; return; }
    const j = await window.kamelenApi?.().catch(() => ({})) || {};
    const nu = Date.now(), alle = onze(), komend = alle.filter(m => toDate(m.datum, m.tijd || "23:00") > nu - 3 * 3600e3).slice(0, 6);
    const gespeeld = alle.filter(m => m.score).reverse();
    const bq = j.bonusvragen || {}, ops = j.opstellingen || {};
    const volgende = komend[0];
    const sel = volgende ? keuzeVan(volgende) : [];
    const openBonus = gespeeld.filter(m => bq[sleutel(m)] && !bq[sleutel(m)].antwoord);
    box.innerHTML = `
      <section class="card"><h2 class="cb-h">Opstellingen</h2><p class="muted">Zet de spelers van de selectie op het veld of de bank. Iedereen ziet de opstelling bij de wedstrijd.</p>
        ${komend.map(m => `<div class="cb-rij"><span><b>${esc(isUs(m.thuis) ? "Kamelen" : kortTeam(m.thuis))} – ${esc(isUs(m.uit) ? "Kamelen" : kortTeam(m.uit))}</b><br><small>${fmtDay(m.datum, { weekday: "short", day: "numeric", month: "short" })} · ${selectieVan(m).length ? `${selectieVan(m).length} spelers` : "selectie nog niet bekend"}${ops[sleutel(m)] ? " · ✓ opstelling staat" : ""}</small></span>
          <button type="button" class="btn sm" data-coach-bewerk="${esc(sleutel(m))}">${ops[sleutel(m)] ? "Aanpassen" : "Maken"}</button></div>`).join("") || `<p class="muted">Geen komende wedstrijden.</p>`}
      </section>
      <section class="card"><h2 class="cb-h">Scorito-bonusvraag</h2>
        ${volgende ? `<p class="muted">Voor ${esc(isUs(volgende.thuis) ? "Kamelen" : kortTeam(volgende.thuis))} – ${esc(isUs(volgende.uit) ? "Kamelen" : kortTeam(volgende.uit))}. Spelers kunnen antwoorden tot de aftrap.${bq[sleutel(volgende)] ? ` Nu: <b>${esc(bq[sleutel(volgende)].vraag)}</b>` : ""}</p>
        <form id="cb-bonus" data-key="${esc(sleutel(volgende))}">
          <label class="cb-veld"><span>Vraag</span><input id="cb-vraag" maxlength="200" placeholder="Wie scoort het eerste doelpunt?" value="${esc(bq[sleutel(volgende)]?.vraag || "")}"></label>
          <label class="cb-veld"><span>Antwoorden (één per regel; leeg = de selectie)</span><textarea id="cb-opties" rows="4" placeholder="${esc(sel.slice(0, 4).join("\n"))}">${esc((bq[sleutel(volgende)]?.opties || []).join("\n"))}</textarea></label>
          <label class="cb-veld cb-kort"><span>Punten</span><select id="cb-punten">${[1, 2, 3, 4, 5].map(p => `<option ${p === (bq[sleutel(volgende)]?.punten || 2) ? "selected" : ""}>${p}</option>`).join("")}</select></label>
          <div class="cb-rij"><button class="btn sm" type="submit">Bonusvraag opslaan</button><span class="tt-status" id="cb-bst" role="status"></span></div>
        </form>` : `<p class="muted">Geen volgende wedstrijd.</p>`}
        ${openBonus.length ? `<h3 class="sub-h">Juiste antwoord invullen</h3>` + openBonus.map(m => { const q = bq[sleutel(m)];
          return `<form class="cb-uitslag" data-key="${esc(sleutel(m))}"><p><b>${esc(q.vraag)}</b><br><small>${esc(isUs(m.thuis) ? "Kamelen" : kortTeam(m.thuis))} – ${esc(isUs(m.uit) ? "Kamelen" : kortTeam(m.uit))}, ${esc(m.score)}</small></p>
            <div class="cb-rij"><select>${(q.opties.length ? q.opties : keuzeVan(m)).map(x => `<option>${esc(x)}</option>`).join("")}</select><button class="btn sm" type="submit">Opslaan</button><span class="tt-status" role="status"></span></div></form>`; }).join("") : ""}
      </section>
      <section class="card"><h2 class="cb-h">Snel naar</h2><div class="cb-links">
        <a class="btn sm ghost" href="#stemmen">Kameel &amp; ezel sluiten</a><a class="btn sm ghost" href="#liters">Liter-incassobureau</a><a class="btn sm ghost" href="#toto">Kamelen-Scorito</a><a class="btn sm ghost" href="#fotos">Foto's en quotes</a></div></section>
      <section class="card"><h2 class="cb-h">App</h2><div class="cb-rij"><span><small>Ingelogd als ${esc((window.IK || {}).naam || "?")}${(window.IK || {}).rol === "coach" ? " (coach)" : ""}${bcode() ? " · beheercode op dit apparaat" : ""}</small></span></div>
        <div class="cb-links"><button type="button" class="btn sm ghost" data-cb="wis">Bewaarde gegevens wissen en opnieuw laden</button>${bcode() ? `<button type="button" class="btn sm ghost" data-cb="uit">Beheercode van dit apparaat halen</button>` : ""}</div></section>`;
  }
  window.renderBeheer = renderBeheer;
  document.addEventListener("submit", async e => {
    const f = e.target;
    if (f.id === "cb-login") { e.preventDefault(); const code = document.getElementById("cb-code").value.trim(), st = document.getElementById("cb-st"); if (!code) return; st.textContent = "Controleren…";
      try { const r = await fetch(CFG().api, { method: "POST", body: JSON.stringify({ type: "beheer", actie: "check", beheercode: code }) }).then(x => x.json());
        if (r.ok) { try { localStorage.setItem("kamelen-beheer", code); } catch {} renderBeheer(); } else st.textContent = "Die beheercode klopt niet."; } catch { st.textContent = "Geen verbinding."; } }
    if (f.id === "cb-bonus") { e.preventDefault(); const st = document.getElementById("cb-bst"), m = onze().find(x => sleutel(x) === f.dataset.key);
      const vraag = document.getElementById("cb-vraag").value.trim(); if (!vraag) { st.textContent = "Vul een vraag in."; return; }
      let opties = document.getElementById("cb-opties").value.split("\n").map(x => x.trim()).filter(Boolean); if (!opties.length) opties = keuzeVan(m);
      st.textContent = "Opslaan…";
      try { const r = await post({ type: "bonusvraag", wedstrijd: sleutel(m), vraag, opties, punten: +document.getElementById("cb-punten").value, aftrap: toDate(m.datum, m.tijd || "12:00").toISOString() });
        st.textContent = r.ok ? "Opgeslagen!" : foutTekst(r.fout); if (r.ok) { await window.kamelenApi?.(true); window.renderToto?.(); } } catch { st.textContent = "Geen verbinding."; } }
    if (f.classList.contains("cb-uitslag")) { e.preventDefault(); const st = f.querySelector(".tt-status"); st.textContent = "Opslaan…";
      try { const r = await post({ type: "bonus-uitslag", wedstrijd: f.dataset.key, antwoord: f.querySelector("select").value });
        st.textContent = r.ok ? "Opgeslagen!" : foutTekst(r.fout); if (r.ok) { await window.kamelenApi?.(true); window.renderToto?.(); setTimeout(renderBeheer, 600); } } catch { st.textContent = "Geen verbinding."; } }
  });
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-cb]"); if (!b) return;
    if (b.dataset.cb === "wis") { try { localStorage.removeItem("kamelen-gegevens"); } catch {} (caches?.keys?.() || Promise.resolve([])).then(k => Promise.all(k.map(n => caches.delete(n)))).finally(() => location.reload()); }
    if (b.dataset.cb === "uit") { try { localStorage.removeItem("kamelen-beheer"); } catch {} renderBeheer(); }
  });
  /* ---------- iPhone-widget: uitleg en script kopiëren ---------- */
  document.addEventListener("click", async e => {
    const a = e.target.closest("[data-widget-uitleg]"); if (a) { e.preventDefault();
      document.getElementById("more-sheet").hidden = true; document.body.classList.remove("sheet-open");
      const dlg = document.getElementById("teamDialog");
      document.getElementById("dlg-sub").textContent = "iPhone"; document.getElementById("dlg-title").textContent = "Kamelen-widget";
      document.getElementById("dlg-body").innerHTML = `<p>De volgende wedstrijd, hoe lang het nog duurt, de stand en de laatste uitslag op je beginscherm.</p>
        <div class="dlg-sec"><ol class="sub-steps">
          <li>Installeer de gratis app <a href="https://apps.apple.com/app/scriptable/id1405459188" target="_blank" rel="noopener">Scriptable</a>.</li>
          <li>Tik hieronder op <b>Kopieer het script</b>.</li>
          <li>Open Scriptable, tik op <b>+</b>, plak het script en noem het <b>Kamelen</b>.</li>
          <li>Houd je beginscherm ingedrukt, tik op <b>+</b> (of <b>Wijzig</b>), kies <b>Scriptable</b> en voeg de middelste widget toe.</li>
          <li>Tik op de widget terwijl hij wiebelt en kies bij <b>Script</b> voor <b>Kamelen</b>.</li></ol>
          <p class="muted">Werkt ook klein en op het vergrendelscherm. Tik op de widget om de app te openen.</p>
          <div class="cb-links"><button type="button" class="btn" data-widget-kopie>Kopieer het script</button><span class="tt-status" id="wg-st" role="status"></span></div></div>`;
      if (!dlg.open) { try { dlg.showModal(); } catch { dlg.setAttribute("open", ""); } } return; }
    const k = e.target.closest("[data-widget-kopie]"); if (!k) return;
    const st = document.getElementById("wg-st");
    try { const t = await fetch("widget/kamelen-widget.js").then(r => r.text()); await navigator.clipboard.writeText(t); st.textContent = "Gekopieerd! Plak het in Scriptable."; }
    catch { st.innerHTML = `Kopiëren lukte niet. <a href="widget/kamelen-widget.js" target="_blank">Open het script</a> en kopieer het zelf.`; }
  });
  addEventListener("hashchange", () => { zichtbaarheid(); if (location.hash === "#beheer") renderBeheer(); });
  document.addEventListener("click", e => { if (e.target.closest("#more-btn")) zichtbaarheid(); }, true);
  setTimeout(() => { zichtbaarheid(); if (location.hash === "#beheer") renderBeheer(); }, 0);
})();
