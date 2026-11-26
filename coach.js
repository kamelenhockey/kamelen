/* =========================================================
   Coachfunctie, beheerpaneel en bonusvraag-beheer
   - Opstelling: coaches en beheerders zetten de spelers van die wedstrijd op het veld of op de bank.
     Alleen coaches en beheerders zien de opstelling, bij de wedstrijd en hier.
   - Beheerpaneel: alleen voor wie de beheercode heeft of als coach is ingelogd.
   Opslag in het Apps Script (types "opstelling", "bonusvraag", "bonus-uitslag").
   ========================================================= */
(function () {
  const VERSIE = ((document.currentScript || {}).src || "").split("v=")[1] || "?";
  const CFG = () => window.TOTO_CONFIG || {};
  const sleutel = m => `${m.datum}|${m.thuis}|${m.uit}`;
  const bcode = () => { try { return localStorage.getItem("kamelen-beheer") || ""; } catch { return ""; } };
  const isBeheer = () => !!bcode() || (window.IK || {}).rol === "coach";
  window.kamelenIsBeheer = isBeheer;
  const onze = () => [...(DATA.uitslagen || []), ...(DATA.programma || [])].filter(m => isUs(m.thuis + m.uit))
    .sort((a, b) => toDate(a.datum, a.tijd || "12:00") - toDate(b.datum, b.tijd || "12:00"));
  const post = async body => {
    const r = await fetch(CFG().api, { method: "POST", body: JSON.stringify({ code: (window.IK || {}).code || "", beheercode: bcode(), ...body }) }).then(x => x.json());
    /* Geen rechten terwijl er een beheercode op dit apparaat staat: klopt die nog met het script? */
    if (r && r.fout === "geen rechten" && bcode()) {
      const c = await fetch(CFG().api, { method: "POST", body: JSON.stringify({ type: "beheer", actie: "check", beheercode: bcode() }) }).then(x => x.json()).catch(() => ({}));
      if (c && c.ok === false) { try { localStorage.removeItem("kamelen-beheer"); } catch {} r.fout = "oude beheercode"; setTimeout(() => { zichtbaarheid(); }, 0); }
    }
    return r;
  };
  const foutTekst = f => f === "oude beheercode" ? "De beheercode op dit apparaat klopt niet meer met het script. Log opnieuw in via Meer → Inloggen als beheerder." : f === "geen rechten" ? "Alleen coaches en beheerders kunnen dit." : f === "code" ? "Je inlogcode klopt niet meer. Log opnieuw in." : f === "te laat" ? "De wedstrijd is al begonnen." : f ? "Het script moet nog bijgewerkt worden." : "Opslaan lukte niet.";

  /* Opstellingen: alleen voor coaches en beheerders, apart opgehaald (niet in de openbare gegevens) */
  let _ops = null;
  const opstellingen = vers => { if (!isBeheer() || !CFG().api) return Promise.resolve({});
    if (!_ops || vers) _ops = post({ type: "opstellingen" }).then(r => r && r.ok ? r.opstellingen || {} : {}).catch(() => { _ops = null; return {}; });
    return _ops; };

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
  /* Bonusvraag: "@selectie" staat voor de spelers van die wedstrijd (de selectie als die bekend is, anders iedereen) */
  const SEL = "@selectie";
  const bonusOpties = (opties, m) => { const uit = []; (opties || []).forEach(o => (o === SEL ? keuzeVan(m) : [o]).forEach(x => { if (!uit.includes(x)) uit.push(x); })); return uit; };
  window.bonusOpties = bonusOpties;
  /* Invallers apart laten zien: in een gestippeld vakje */
  const invallerSet = () => new Set([...(typeof INVALLERS !== "undefined" ? INVALLERS : []), ...(DATA.invalSheet || []).map(x => x.naam)].map(canon).filter(n => !(typeof ROSTER !== "undefined" && ROSTER.has(n))));
  window.splitsInvallers = opties => { const inv = invallerSet(); return [opties.filter(o => !inv.has(canon(o))), opties.filter(o => inv.has(canon(o)))]; };
  /* "Wie scoort het eerste doelpunt": punten naar linie (standaardopstelling) — aanvaller 1, middenvelder 2, verdediger of keeper 3 */
  const LINIE_PUNT = { aanval: 1, middenveld: 2, verdediging: 3, keeper: 3 };
  const linieVan = n => { n = canon(n);
    const v = VAKKEN.find(([, , x]) => canon(x) === n); if (v) return v[3] === "keeper" ? "keeper" : lijnVan(v[1]);
    const w = WISSELS.find(([x]) => canon(x) === n); if (w) return w[1];
    const e = Object.entries(VASTE_LINIE).find(([x]) => canon(x) === n); return e ? e[1] : null; };
  /* Overige vaste spelers zonder plek in de standaardopstelling */
  const VASTE_LINIE = { Dirk: "aanval", Harm: "aanval", Karnemelk: "aanval", Snack: "aanval" };
  const isEersteGoal = q => /eerste doelpunt/i.test(String(q && q.vraag || ""));
  window.bonusPunten = (q, antwoord) => isEersteGoal(q) ? (LINIE_PUNT[linieVan(antwoord)] || 2) : (Number(q.punten) || 0);
  window.bonusPerLinie = isEersteGoal;
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
  /* Standaard opstelling van de Kamelen (ons doel onderaan, rechts = rechts) */
  const VAKKEN = [
    [50, 93, "David", "keeper"], [50, 79, "Casper", "laatste man"], [50, 65, "Mini", "voorstopper"],
    [84, 69, "Malcolm", "rechtsback"], [16, 69, "Marijn", "linksback"],
    [50, 50, "Nick", "middenmid"], [82, 47, "Tijmen", "rechtsmid"], [18, 47, "Ali", "linksmid"],
    [50, 24, "Philip", "spits"], [80, 26, "Jon", "rechtsvoor"], [20, 26, "Thijn", "linksvoor"]];
  /* Vaste wissels in de dug-out */
  const WISSELS = [["Jesse", "aanval"], ["Julius", "aanval"], ["Ids", "middenveld"], ["Boudewijn", "verdediging"], ["Tutu", "verdediging"]];
  const lijnVan = y => y > 86 ? "keeper" : y > 60 ? "verdediging" : y > 40 ? "middenveld" : "aanval";
  const initialen = n => String(n).split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  function speler(p, bewerk) {
    return `<button type="button" class="cv-sp ${lijnVan(p.y)}" style="left:${p.x}%;top:${p.y}%" data-naam="${esc(p.n)}" ${bewerk ? "" : "tabindex=-1"}>
      <span class="cv-schijf">${esc(initialen(p.n))}</span><span class="cv-naam">${esc(p.n)}</span></button>`;
  }
  /* Bank = dug-out naast het veld, per linie (behalve keeper). Opslag per speler als "Naam|linie". */
  const LINIES = [["aanval", "Aanval"], ["middenveld", "Middenveld"], ["verdediging", "Verdediging"]];
  const bNaam = x => String(x).split("|")[0], bLijn = x => { const l = String(x).split("|")[1]; return LINIES.some(([k]) => k === l) ? l : "middenveld"; };
  window.bankNaam = bNaam;
  const bankChip = (x, extra = "") => `<button type="button" class="cv-chip cv-dchip ${bLijn(x)}${extra}" data-naam="${esc(bNaam(x))}"><i></i><span>${esc(bNaam(x))}</span></button>`;
  function dugoutHtml(bank, bewerk, chipFn) {
    return `<div class="cv-dug" aria-label="Bank"><div class="cv-dug-dak"><span>Dug-out</span></div>
      ${LINIES.map(([k, t]) => { const l = (bank || []).filter(x => bLijn(x) === k);
        return `<div class="cv-dug-vak ${k}" data-zone="bank" data-lijn="${k}"><span class="cv-dug-k">${t}</span>${l.map(x => (chipFn || bankChip)(x)).join("")}${!l.length && bewerk ? `<span class="cv-dug-leeg">+</span>` : ""}</div>`; }).join("")}</div>`;
  }
  function veldHtml(o, bewerk, chipFn) {
    o = o || { veld: [], bank: [] };
    return `<div class="cv-duo"><div class="cv-veld${bewerk ? " bewerk" : ""}" data-zone="veld">${LIJNEN}${(o.veld || []).map(p => speler(p, bewerk)).join("")}</div>
      ${dugoutHtml(o.bank, bewerk, chipFn)}</div>`;
  }
  window.veldHtml = veldHtml;

  /* ---------- Bij een wedstrijd (dialoog): de opstelling tonen, en voor beheerders een knop ---------- */
  window.coachVulOpstelling = async function (m) {
    const el = document.getElementById("wm-opstelling"); if (!el) return;
    if (!isBeheer()) { el.remove(); return; }
    const o = (await opstellingen())[sleutel(m)];
    const knop = isBeheer() ? `<button type="button" class="btn sm" data-coach-bewerk="${esc(sleutel(m))}">${o ? "✏️ Opstelling aanpassen" : "✏️ Opstelling maken"}</button>` : "";
    if (!o && !knop) { el.remove(); return; }
    el.innerHTML = `<h3 class="sub-h">Opstelling</h3>${o ? veldHtml(o.opstelling, false) + `<p class="muted cv-door">Gemaakt door ${esc(o.door || "de coach")}</p>` : `<p class="muted">Nog geen opstelling.</p>`}${knop}`;
  };
  document.addEventListener("click", e => { const b = e.target.closest("[data-coach-bewerk]"); if (!b) return; const m = onze().find(x => sleutel(x) === b.dataset.coachBewerk); if (m) openEditor(m); });

  /* ---------- De editor ---------- */
  let ed = null;   // { m, o, sel, gekozen }
  async function openEditor(m) {
    /* Komt de vraag uit het wedstrijdvenster: dat eerst dicht, anders ligt het over de editor heen */
    const dlg = document.getElementById("teamDialog"), uitDialoog = !!(dlg && dlg.open); if (uitDialoog) dlg.close();
    let sh = document.getElementById("coach-sheet");
    if (!sh) { sh = document.createElement("div"); sh.id = "coach-sheet"; sh.className = "coach-sheet"; document.body.appendChild(sh); }
    const sel = keuzeVan(m), bekend = selectieVan(m).length > 0;
    ed = { m, sel, bekend, uitDialoog, o: { veld: [], bank: [] }, gekozen: null, laden: true };
    sh.hidden = false; document.body.classList.add("sheet-open"); tekenEditor();
    /* Bestaande opstelling: eerst wat al geladen is (snel), het script niet opnieuw laten wachten */
    const ops = await opstellingen();
    if (!ed || ed.m !== m) return;
    const bestaand = ops[sleutel(m)];
    if (bestaand && !ed.o.veld.length && !ed.o.bank.length) {
      ed.o = JSON.parse(JSON.stringify(bestaand.opstelling));
      if (bekend) { ed.o.veld = ed.o.veld.filter(p => sel.includes(p.n)); ed.o.bank = ed.o.bank.filter(n => sel.includes(bNaam(n))); }
    }
    ed.laden = false; tekenEditor();
  }
  function sluitEditor(opnieuw) {
    const sh = document.getElementById("coach-sheet"); if (sh) sh.hidden = true; document.body.classList.remove("sheet-open");
    const terug = ed && ed.uitDialoog ? ed.m : null; ed = null;
    if (terug && typeof openMatch === "function") openMatch(sleutel(terug));
  }
  function tekenEditor() {
    const sh = document.getElementById("coach-sheet"); if (!sh || !ed) return;
    const { m, o, sel } = ed, opVeld = new Set(o.veld.map(p => p.n)), opBank = new Set(o.bank.map(bNaam));
    const vrij = sel.filter(n => !opVeld.has(n) && !opBank.has(n));
    const vast = typeof ROSTER !== "undefined" ? ROSTER : new Set(), isInv = n => vast.size > 0 && !vast.has(n);
    const chip = n => `<button type="button" class="cv-chip${isInv(n) ? " inv" : ""}${ed.gekozen === n ? " aan" : ""}" data-naam="${esc(n)}">${esc(n)}</button>`;
    const scroll = sh.querySelector(".cs-body")?.scrollTop || 0, poolScroll = sh.querySelector(".cs-pool-lijst")?.scrollLeft || 0;
    const hint = ed.melding && !ed.gekozen ? esc(ed.melding) : ed.gekozen ? `<b>${esc(ed.gekozen)}</b> gekozen: tik op het veld of op een linie in de dug-out` : "Tik op een naam en daarna op een plek. Slepen kan ook.";
    sh.innerHTML = `<div class="cs-kop"><button type="button" class="cs-x" data-cs="sluit" aria-label="Sluiten">×</button>
        <div><b>${esc(isUs(m.thuis) ? "Kamelen" : kortTeam(m.thuis))} – ${esc(isUs(m.uit) ? "Kamelen" : kortTeam(m.uit))}</b><small>${fmtDay(m.datum, { weekday: "long", day: "numeric", month: "long" })}${m.tijd ? ` · ${esc(m.tijd)}` : ""}</small></div>
        <button type="button" class="btn sm cs-opslaan" data-cs="opslaan">Opslaan</button></div>
      <div class="cs-body" data-geen-swipe data-geen-trek>
        <div class="cs-teller"><span>Veld <b>${o.veld.length}</b>/11</span><span>Bank <b>${o.bank.length}</b></span><span class="cs-knoppen"><button type="button" class="cs-link" data-cs="auto">Standaard</button><button type="button" class="cs-link" data-cs="leeg">Leegmaken</button></span></div>
        <p class="cs-hint${ed.gekozen ? " actief" : ed.melding ? " lang" : ""}" role="status">${hint}</p>
        ${veldHtml(o, true, x => bankChip(x, ed.gekozen === bNaam(x) ? " aan" : ""))}
        <div class="cs-dock">
          <div class="cs-rij" data-zone="pool"><span class="cs-rij-k">${ed.bekend ? "Selectie" : "Iedereen"} <small>${vrij.length}</small></span><div class="cs-lijst cs-pool-lijst">${ed.laden && !sel.length ? `<span class="cv-leeg">Laden…</span>` : vrij.length ? vrij.map(chip).join("") : `<span class="cv-leeg">${sel.length ? "Iedereen is ingedeeld" : "Geen spelers gevonden. Tik op ↻ bovenin de app en probeer het opnieuw."}</span>`}</div></div>
          ${ed.bekend ? "" : `<p class="cs-noot">De selectie is nog niet bekend, dus je kiest uit alle spelers en (gestippeld) de invallers.</p>`}
          <span class="tt-status" id="cs-status" role="status"></span>
        </div>
      </div>`;
    sh.querySelector(".cs-body").scrollTop = scroll; const pl = sh.querySelector(".cs-pool-lijst"); if (pl) pl.scrollLeft = poolScroll;
    if (ed.gekozen) { sh.querySelectorAll(`.cv-sp[data-naam="${CSS.escape(ed.gekozen)}"]`).forEach(x => x.classList.add("aan")); sh.querySelector(".cs-body .cv-duo")?.classList.add("cs-veld-doel"); }
  }
  const weg = n => { ed.o.veld = ed.o.veld.filter(p => p.n !== n); ed.o.bank = ed.o.bank.filter(x => bNaam(x) !== n); };
  function zetOp(n, zone, x, y) { weg(n); if (zone === "veld") ed.o.veld.push({ n, x: Math.round(Math.max(4, Math.min(96, x))), y: Math.round(Math.max(3, Math.min(97, y))) }); else if (zone === "bank") ed.o.bank.push(`${n}|${x || "middenveld"}`); }
  const veldPunt = (veld, cx, cy) => { const r = veld.getBoundingClientRect(); return [(cx - r.left) / r.width * 100, (cy - r.top) / r.height * 100]; };

  document.addEventListener("click", async e => {
    const sh = document.getElementById("coach-sheet"); if (!sh || sh.hidden || !ed || !sh.contains(e.target)) return;
    if (_sleepNet) { _sleepNet = false; return; }
    const knop = e.target.closest("[data-cs]");
    if (knop) {
      const a = knop.dataset.cs;
      if (a === "sluit") return sluitEditor();
      if (a === "leeg") { ed.o = { veld: [], bank: [] }; ed.gekozen = null; return tekenEditor(); }
      if (a === "auto") {
        ed.o = { veld: [], bank: [] }; ed.gekozen = null;
        const open = [];
        VAKKEN.forEach(([x, y, naam, plek]) => { const n = ed.sel.find(s => canon(s) === canon(naam)); if (n) zetOp(n, "veld", x, y); else open.push(`${plek} (${naam})`); });
        WISSELS.forEach(([naam, lijn]) => { const n = ed.sel.find(s => canon(s) === canon(naam)); if (n) zetOp(n, "bank", lijn); });
        ed.melding = open.length ? `Nog open: ${open.join(", ")}` : "";
        return tekenEditor(); }
      if (a === "opslaan") { const st = document.getElementById("cs-status"); st.textContent = "Opslaan…"; knop.disabled = true;
        try { const r = await post({ type: "opstelling", wedstrijd: sleutel(ed.m), opstelling: ed.o });
          if (r.ok) { st.textContent = "Opgeslagen!"; const m = ed.m; await opstellingen(true); setTimeout(() => { sluitEditor(); renderBeheer(); setTimeout(() => window.coachVulOpstelling(m), 50); }, 400); }
          else { st.textContent = foutTekst(r.fout); knop.disabled = false; } }
        catch { st.textContent = "Geen verbinding."; knop.disabled = false; } return; }
    }
    const chip = e.target.closest(".cv-chip, .cv-sp");
    if (chip && ed) ed.melding = "";
    /* Al iemand gekozen en je tikt op een naam in de dug-out: de gekozen speler gaat naar die linie */
    const vakDoel = chip && chip.closest(".cv-dug-vak");
    if (vakDoel && ed.gekozen && ed.gekozen !== chip.dataset.naam) { zetOp(ed.gekozen, "bank", vakDoel.dataset.lijn); ed.gekozen = null; return tekenEditor(); }
    if (chip) { const n = chip.dataset.naam; ed.gekozen = ed.gekozen === n ? null : n; return tekenEditor(); }
    const zone = e.target.closest("[data-zone]");
    if (zone && ed.gekozen) { const z = zone.dataset.zone;
      if (z === "veld") { const [x, y] = veldPunt(zone, e.clientX, e.clientY); zetOp(ed.gekozen, "veld", x, y); }
      else if (z === "bank") zetOp(ed.gekozen, "bank", zone.dataset.lijn); else weg(ed.gekozen);
      ed.gekozen = null; tekenEditor(); }
  });
  /* Slepen (vinger of muis) */
  let sleep = null, _sleepNet = false;
  document.addEventListener("pointerdown", e => {
    const sh = document.getElementById("coach-sheet"); if (!sh || sh.hidden || !ed) return;
    const el = e.target.closest(".cs-body .cv-sp, .cs-body .cv-chip"); if (!el) return;
    sleep = { n: el.dataset.naam, x0: e.clientX, y0: e.clientY, el, spook: null, chip: el.classList.contains("cv-chip") };
  });
  document.addEventListener("pointermove", e => {
    if (!sleep) return;
    if (!sleep.spook) { const dx = Math.abs(e.clientX - sleep.x0), dy = Math.abs(e.clientY - sleep.y0); if (Math.hypot(dx, dy) < 8) return;
      if (sleep.chip && dx > dy) { sleep = null; return; }   /* zijwaarts = door de lijst scrollen */
      sleep.spook = document.createElement("div"); sleep.spook.className = "cv-spook"; sleep.spook.textContent = sleep.n; document.body.appendChild(sleep.spook); sleep.el.classList.add("weg"); }
    e.preventDefault(); sleep.spook.style.left = e.clientX + "px"; sleep.spook.style.top = e.clientY + "px";
  }, { passive: false });
  document.addEventListener("pointerup", e => {
    if (!sleep) return; const s = sleep; sleep = null; if (!s.spook) return;
    s.spook.remove(); _sleepNet = true; setTimeout(() => { _sleepNet = false; }, 50);
    const onder = document.elementFromPoint(e.clientX, e.clientY), zone = onder && onder.closest("[data-zone]");
    if (zone) { const z = zone.dataset.zone; if (z === "veld") { const [x, y] = veldPunt(zone, e.clientX, e.clientY); zetOp(s.n, "veld", x, y); } else if (z === "bank") zetOp(s.n, "bank", zone.dataset.lijn); else weg(s.n); }
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
    const bq = j.bonusvragen || {}, ops = await opstellingen();
    const volgende = komend[0];
    const sel = volgende ? keuzeVan(volgende) : [];
    const openBonus = gespeeld.filter(m => bq[sleutel(m)] && !bq[sleutel(m)].antwoord);
    box.innerHTML = `
      <section class="card"><h2 class="cb-h">Opstellingen</h2><p class="muted">Zet de spelers van de selectie op het veld of de bank. Alleen coaches en beheerders zien de opstelling, bij de wedstrijd en hier.</p>
        ${komend.map(m => `<div class="cb-rij"><span><b>${esc(isUs(m.thuis) ? "Kamelen" : kortTeam(m.thuis))} – ${esc(isUs(m.uit) ? "Kamelen" : kortTeam(m.uit))}</b><br><small>${fmtDay(m.datum, { weekday: "short", day: "numeric", month: "short" })} · ${selectieVan(m).length ? `${selectieVan(m).length} spelers` : "selectie nog niet bekend"}${ops[sleutel(m)] ? " · ✓ opstelling staat" : ""}</small></span>
          <button type="button" class="btn sm" data-coach-bewerk="${esc(sleutel(m))}">${ops[sleutel(m)] ? "Aanpassen" : "Maken"}</button></div>`).join("") || `<p class="muted">Geen komende wedstrijden.</p>`}
      </section>
      <section class="card" id="cb-bonus-box"></section>
      <section class="card"><h2 class="cb-h">Snel naar</h2><div class="cb-links">
        <a class="btn sm ghost" href="#stemmen">Kameel &amp; ezel sluiten</a><a class="btn sm ghost" href="#liters">Liter-incassobureau</a><a class="btn sm ghost" href="#toto">Kamelen-Scorito</a><a class="btn sm ghost" href="#fotos">Foto's en quotes</a></div></section>
      <section class="card"><h2 class="cb-h">App</h2><div class="cb-rij"><span><small>Ingelogd als ${esc((window.IK || {}).naam || "?")}${(window.IK || {}).rol === "coach" ? " (coach)" : ""}${bcode() ? " · beheercode op dit apparaat" : ""} · versie ${esc(VERSIE)}</small></span></div>
        <div class="cb-links"><button type="button" class="btn sm ghost" data-cb="wis">Bewaarde gegevens wissen en opnieuw laden</button>${bcode() ? `<button type="button" class="btn sm ghost" data-cb="uit">Beheercode van dit apparaat halen</button>` : ""}</div></section>`;
    tekenBonus();
  }
  window.renderBeheer = renderBeheer;

  /* ---------- Scorito-bonusvraag: per wedstrijd een vraag, het antwoord later ---------- */
  const SNEL = [
    ["Wie scoort het eerste doelpunt van de Kamelen?", "selectie"],
    ["Wie wordt kameel van de dag?", "selectie"],
    ["Wie wordt ezel van de dag?", "selectie"],
    ["Hoeveel doelpunten maken de Kamelen?", ["0", "1", "2", "3", "4", "5 of meer"]],
    ["Hoeveel tegendoelpunten krijgen de Kamelen?", ["0", "1", "2", "3", "4 of meer"]],
    ["Wie staat er bij rust voor?", ["Kamelen", "Gelijk", "Tegenstander"]],
    ["Hoeveel strafcorners krijgen de Kamelen?", ["0–2", "3–5", "6–8", "9 of meer"]],
    ["Scoort er een verdediger?", ["Ja", "Nee"]],
    ["Krijgen de Kamelen een kaart?", ["Nee", "Groen", "Geel", "Rood"]],
    ["Wie scoort het laatste doelpunt?", ["Kamelen", "Tegenstander", "Er valt geen doelpunt"]],
  ];
  let concept = null;   // { key, vraag, opties, punten }
  const naamWed = m => `${isUs(m.thuis) ? "Kamelen" : kortTeam(m.thuis)} – ${isUs(m.uit) ? "Kamelen" : kortTeam(m.uit)}`;
  async function tekenBonus() {
    const box = document.getElementById("cb-bonus-box"); if (!box) return;
    const j = await window.kamelenApi?.().catch(() => ({})) || {}, bq = j.bonusvragen || {};
    const nu = Date.now(), alle = onze();
    const komend = alle.filter(m => toDate(m.datum, m.tijd || "23:00") > nu).slice(0, 8);
    const gespeeld = alle.filter(m => toDate(m.datum, m.tijd || "12:00") <= nu && bq[sleutel(m)]).reverse();
    if (!concept || !komend.some(m => sleutel(m) === concept.key)) {
      const m = komend[0]; const q = m && bq[sleutel(m)];
      concept = m ? { key: sleutel(m), vraag: q?.vraag || "", opties: q?.opties?.length ? [...q.opties] : [], punten: q?.punten || 2 } : null;
    }
    const m = concept && komend.find(x => sleutel(x) === concept.key), huidig = m && bq[sleutel(m)];
    box.innerHTML = `<h2 class="cb-h">Scorito-bonusvraag</h2>
      ${m ? `<p class="muted">Kies een wedstrijd en een vraag. Spelers antwoorden in de Kamelen-Scorito tot de aftrap; het juiste antwoord vul je na de wedstrijd hieronder in.</p>
      <div class="bq-wed" role="tablist">${komend.map(x => `<button type="button" class="bq-wedk${sleutel(x) === concept.key ? " aan" : ""}" data-bq-wed="${esc(sleutel(x))}"><b>${esc(naamWed(x))}</b><small>${fmtDay(x.datum, { day: "numeric", month: "short" })}${bq[sleutel(x)] ? " · ✓ vraag" : ""}</small></button>`).join("")}</div>
      ${huidig ? `<p class="bq-nu">Staat nu: <b>${esc(huidig.vraag)}</b> (${huidig.punten} ${huidig.punten == 1 ? "punt" : "punten"})</p>` : ""}
      <div class="cb-veld"><span>Snel kiezen</span><div class="bq-snel">${SNEL.map(([v], i) => `<button type="button" class="cv-chip${concept.vraag === v ? " aan" : ""}" data-bq-snel="${i}">${esc(v)}</button>`).join("")}</div></div>
      <label class="cb-veld"><span>Vraag</span><input id="bq-vraag" maxlength="200" placeholder="Of typ zelf een vraag" value="${esc(concept.vraag)}"></label>
      <div class="cb-veld"><span>Antwoorden <small>(${bonusOpties(concept.opties, m).length})</small></span>
        <div class="bq-opties">${concept.opties.map((o, i) => `<span class="bq-optie${o === SEL ? " sel" : ""}">${o === SEL ? `👥 Spelers van de wedstrijd <small>(${selectieVan(m).length ? `selectie, ${selectieVan(m).length}` : "nu nog iedereen"})</small>` : esc(o)}<button type="button" aria-label="${esc(o)} weghalen" data-bq-weg="${i}">×</button></span>`).join("") || `<span class="muted">Kies een snelle vraag of voeg antwoorden toe.</span>`}</div>
        <div class="bq-toevoeg"><input id="bq-nieuw" maxlength="40" placeholder="Antwoord toevoegen"><button type="button" class="btn sm ghost" data-bq="voeg">Toevoegen</button><button type="button" class="btn sm ghost" data-bq="spelers">+ Spelers van de wedstrijd</button></div></div>
      ${isEersteGoal(concept) ? `<div class="cb-veld"><span>Punten voor een goed antwoord</span><p class="bq-nu">Hangt af van de linie van de doelpuntenmaker: aanvaller <b>1</b>, middenvelder <b>2</b>, verdediger of keeper <b>3</b>. Invallers: <b>2</b>.</p></div>` : `<div class="cb-veld"><span>Punten voor een goed antwoord</span><div class="bq-punten">${[1, 2, 3, 4, 5].map(p => `<button type="button" class="${p === concept.punten ? "aan" : ""}" data-bq-pt="${p}">${p}</button>`).join("")}</div></div>`}
      <div class="cb-rij"><button type="button" class="btn" data-bq="opslaan">${huidig ? "Bonusvraag bijwerken" : "Bonusvraag opslaan"}</button><span class="tt-status" id="bq-st" role="status"></span></div>` : `<p class="muted">Er zijn geen komende wedstrijden.</p>`}
      ${gespeeld.length ? `<h3 class="sub-h bq-kop">Juiste antwoord invullen</h3>${gespeeld.map(x => { const q = bq[sleutel(x)], opts = q.opties.length ? bonusOpties(q.opties, x) : keuzeVan(x);
        return `<div class="bq-uitslag${q.antwoord ? " klaar" : ""}" data-bq-key="${esc(sleutel(x))}"><p><b>${esc(q.vraag)}</b><small>${esc(naamWed(x))}${x.score ? `, ${esc(x.score)}` : ""} · ${q.antwoord ? `antwoord: <b>${esc(q.antwoord)}</b>` : "nog geen antwoord"}</small></p>
          ${(() => { const knop = o => `<button type="button" class="cv-chip${q.antwoord === o ? " aan" : ""}" data-bq-antw="${esc(o)}">${esc(o)}</button>`, [v, inv] = window.splitsInvallers(opts);
            return `<div class="bq-opties">${v.map(knop).join("")}</div>${inv.length ? `<div class="inv-vak"><span class="inv-k">Invallers</span><div class="bq-opties">${inv.map(knop).join("")}</div></div>` : ""}`; })()}<span class="tt-status" role="status"></span></div>`; }).join("")}` : ""}`;
  }
  const vraagVeld = () => { const v = document.getElementById("bq-vraag"); if (v && concept) concept.vraag = v.value; };
  document.addEventListener("input", e => { if (e.target.id === "bq-vraag" && concept) concept.vraag = e.target.value; });
  document.addEventListener("keydown", e => { if (e.target.id === "bq-nieuw" && e.key === "Enter") { e.preventDefault(); document.querySelector('[data-bq="voeg"]')?.click(); } });
  document.addEventListener("click", async e => {
    const t = e.target.closest("[data-bq-wed],[data-bq-snel],[data-bq-weg],[data-bq-pt],[data-bq],[data-bq-antw]"); if (!t || !concept && !t.dataset.bqAntw) return;
    const m = concept && onze().find(x => sleutel(x) === concept.key);
    if (t.dataset.bqWed) { const j = await window.kamelenApi?.().catch(() => ({})) || {}, q = (j.bonusvragen || {})[t.dataset.bqWed];
      concept = { key: t.dataset.bqWed, vraag: q?.vraag || "", opties: q?.opties?.length ? [...q.opties] : [], punten: q?.punten || 2 }; return tekenBonus(); }
    vraagVeld();
    if (t.dataset.bqSnel) { const [v, o] = SNEL[+t.dataset.bqSnel]; concept.vraag = v; concept.opties = o === "selectie" ? [SEL] : [...o]; return tekenBonus(); }
    if (t.dataset.bqWeg) { concept.opties.splice(+t.dataset.bqWeg, 1); return tekenBonus(); }
    if (t.dataset.bqPt) { concept.punten = +t.dataset.bqPt; return tekenBonus(); }
    if (t.dataset.bq === "voeg") { const i = document.getElementById("bq-nieuw"), v = i.value.trim(); if (v && !concept.opties.includes(v)) concept.opties.push(v); await tekenBonus(); document.getElementById("bq-nieuw")?.focus(); return; }
    if (t.dataset.bq === "spelers") { if (!concept.opties.includes(SEL)) concept.opties.unshift(SEL); return tekenBonus(); }
    if (t.dataset.bq === "opslaan") { const st = document.getElementById("bq-st");
      if (!concept.vraag.trim()) { st.textContent = "Vul een vraag in."; return; }
      if (bonusOpties(concept.opties, m).length < 2) { st.textContent = "Geef minstens twee antwoorden."; return; }
      st.textContent = "Opslaan…"; t.disabled = true;
      try { const r = await post({ type: "bonusvraag", wedstrijd: concept.key, vraag: concept.vraag.trim(), opties: concept.opties, punten: concept.punten, aftrap: toDate(m.datum, m.tijd || "12:00").toISOString() });
        if (r.ok) { await window.kamelenApi?.(true); window.renderToto?.(); await tekenBonus(); const s2 = document.getElementById("bq-st"); if (s2) s2.textContent = "Opgeslagen!"; }
        else { st.textContent = foutTekst(r.fout); t.disabled = false; } } catch { st.textContent = "Geen verbinding."; t.disabled = false; }
      return; }
    if (t.dataset.bqAntw) { const blok = t.closest("[data-bq-key]"), st = blok.querySelector(".tt-status"); st.textContent = "Opslaan…";
      blok.querySelectorAll("[data-bq-antw]").forEach(x => x.classList.toggle("aan", x === t));
      try { const r = await post({ type: "bonus-uitslag", wedstrijd: blok.dataset.bqKey, antwoord: t.dataset.bqAntw });
        if (r.ok) { await window.kamelenApi?.(true); window.renderToto?.(); await tekenBonus(); } else st.textContent = foutTekst(r.fout); } catch { st.textContent = "Geen verbinding."; } }
  });
  document.addEventListener("submit", async e => {
    const f = e.target;
    if (f.id === "cb-login") { e.preventDefault(); const code = document.getElementById("cb-code").value.trim(), st = document.getElementById("cb-st"); if (!code) return; st.textContent = "Controleren…";
      try { const r = await fetch(CFG().api, { method: "POST", body: JSON.stringify({ type: "beheer", actie: "check", beheercode: code }) }).then(x => x.json());
        if (r.ok) { try { localStorage.setItem("kamelen-beheer", code); } catch {} renderBeheer(); } else st.textContent = "Die beheercode klopt niet."; } catch { st.textContent = "Geen verbinding."; } }
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
      document.getElementById("dlg-body").innerHTML = `<p>De volgende wedstrijd, hoe lang het nog duurt, de stand en de laatste uitslagen op je beginscherm. Er is een indeling voor klein, middel, groot en het vergrendelscherm.</p>
        <div class="dlg-sec"><h3 class="sub-h">Deel 1: de widget op je beginscherm</h3><ol class="wg-stappen">
          <li>Installeer de gratis app <a href="https://apps.apple.com/app/scriptable/id1405459188" target="_blank" rel="noopener">Scriptable</a>.</li>
          <li>Tik hieronder op <b>Kopieer het script</b>.</li>
          <li>Open Scriptable, tik rechtsboven op <b>+</b>, plak het script en tik op de naam bovenaan om hem <b>Kamelen</b> te noemen. Tik op <b>Klaar</b>.</li>
          <li>Houd je beginscherm ingedrukt tot alles wiebelt, tik linksboven op <b>Wijzig</b> → <b>Voeg widget toe</b>, zoek <b>Scriptable</b> en kies een formaat.</li>
          <li>Houd de nieuwe widget ingedrukt → <b>Wijzig widget</b> en kies bij <b>Script</b> voor <b>Kamelen</b>.</li></ol>
          <div class="cb-links"><button type="button" class="btn" data-widget-kopie>Kopieer het script</button><span class="tt-status" id="wg-st" role="status"></span></div>
          <p class="muted">Je hoeft het script maar één keer te plakken: verbeteringen aan de widget komen vanzelf mee.</p></div>
        <div class="dlg-sec"><h3 class="sub-h">Deel 2: tikken opent de Kamelen-app</h3>
          <p>Zonder deze stappen opent een tik op de widget Scriptable of Safari. Een widget kan bij tikken alleen zijn eigen app openen, dus we gaan via de app Opdrachten (die staat al op je iPhone). Je ziet die heel even in beeld, daarna opent de Kamelen-app.</p>
          <ol class="wg-stappen">
          <li>Open de app <b>Opdrachten</b>, ga onderin naar <b>Opdrachten</b> en tik rechtsboven op <b>+</b>.</li>
          <li>Tik bovenaan op de naam → <b>Wijzig naam</b> en typ precies <b>Kamelen</b> (met hoofdletter, geen spatie erachter).</li>
          <li>Tik op <b>Voeg taak toe</b>, zoek op <b>URL</b> en kies <b>Open URL's</b>.</li>
          <li>Tik op het blauwe woord <b>URL</b> en plak dit adres (let op: het begint met <i>webapp</i>, niet met https):
            <div class="wg-url"><code>webapp://kamelenhockey.github.io/kamelen/</code><button type="button" class="btn sm ghost" data-wg-url>Kopieer</button></div></li>
          <li>Tik op <b>Gereed</b>. Test het door in Opdrachten op de tegel <b>Kamelen</b> te tikken: de Kamelen-app moet openen.</li>
          <li>Ga naar je beginscherm, houd de widget ingedrukt → <b>Wijzig widget</b> en typ bij <b>Parameter</b> het woord <b>opdracht</b>. Tik buiten het venster.</li></ol>
          <p class="muted">Liever Safari? Typ bij Parameter dan <b>safari</b>.</p></div>`;
      if (!dlg.open) { try { dlg.showModal(); } catch { dlg.setAttribute("open", ""); } } return; }
    const u = e.target.closest("[data-wg-url]");
    if (u) { try { await navigator.clipboard.writeText("webapp://kamelenhockey.github.io/kamelen/"); u.textContent = "Gekopieerd"; } catch { u.textContent = "Kopiëren lukte niet"; } return; }
    const k = e.target.closest("[data-widget-kopie]"); if (!k) return;
    const st = document.getElementById("wg-st");
    const URL_ = "widget/kamelen-widget-laden.js?" + Date.now();
    try {
      /* iPhone: kopiëren moet direct bij het tikken gebeuren, dus met een ClipboardItem dat zelf het bestand ophaalt */
      if (window.ClipboardItem && navigator.clipboard.write) await navigator.clipboard.write([new ClipboardItem({ "text/plain": fetch(URL_).then(r => r.text()).then(t => new Blob([t], { type: "text/plain" })) })]);
      else await navigator.clipboard.writeText(await fetch(URL_).then(r => r.text()));
      st.textContent = "Gekopieerd! Plak het in Scriptable.";
    } catch { st.innerHTML = `Kopiëren lukte niet. <a href="widget/kamelen-widget-laden.js" target="_blank">Open het script</a> en kopieer het zelf.`; }
  });
  addEventListener("hashchange", () => { zichtbaarheid(); if (location.hash === "#beheer") renderBeheer(); });
  document.addEventListener("click", e => { if (e.target.closest("#more-btn")) zichtbaarheid(); }, true);
  setTimeout(() => { zichtbaarheid(); if (isBeheer()) opstellingen(); if (location.hash === "#beheer") renderBeheer(); }, 0);
})();
