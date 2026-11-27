/* =========================================================
   Zoeken door de hele app · Wat is er nieuw · Spelers vergelijken
   ========================================================= */
(function () {
  const $ = id => document.getElementById(id);
  const isBeheer = () => (window.kamelenIsBeheer ? window.kamelenIsBeheer() : false);
  const norm = t => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  /* ================= ZOEKEN ================= */
  const PAGINAS = [
    ["home", "Home", "beginpagina volgende wedstrijd"], ["wedstrijden", "Wedstrijden", "programma uitslagen"],
    ["stand", "Stand", "ranglijst poule competitie"], ["topscorers", "Topscorers", "doelpunten goals"],
    ["liters", "Liter-incassobureau", "boetes liters"], ["spelers", "Spelers", "team selectie profielen"],
    ["statistieken", "Statistieken", "badges grafiek kameel ezel"], ["toto", "Kamelen-Scorito", "voorspellen bonusvraag toto"],
    ["stemmen", "Kameel & ezel", "stemmen kameel van de dag ezel"], ["voorspeller", "Voorspeller", "eindstand berekenen"],
    ["fotos", "Foto's", "foto album"], ["quotes", "Quotes", "uitspraken"], ["regels", "Kamelen-regels", "afmelden boetes huisregels"],
    ["spellen", "Spellen", "spelletjes"], ["rad", "Kamelen-rad", "draaien bak"], ["race", "Kamelen-racen", "race"],
    ["mex", "Mex", "dobbelen"], ["pong", "Pongen", "pong"],
  ];
  function index() {
    const uit = [];
    PAGINAS.forEach(([v, t, extra]) => uit.push({ soort: "Onderdelen", titel: t, sub: "", tekst: `${t} ${extra}`, doe: () => { location.hash = v === "home" ? "" : v; } }));
    if (isBeheer()) uit.push({ soort: "Onderdelen", titel: "Beheer", sub: "opstellingen, bonusvraag, notities", tekst: "beheer opstelling coach bonusvraag notities", doe: () => { location.hash = "beheer"; } });
    uit.push({ soort: "Onderdelen", titel: "Widget op je iPhone", sub: "uitleg", tekst: "widget iphone scriptable", doe: () => document.querySelector("[data-widget-uitleg]")?.click() });
    try { playerData().forEach(p => uit.push({ soort: "Spelers", titel: p.naam, sub: p.invaller ? "Invaller" : "Kameel", tekst: `${p.naam} ${p.bijnaam || ""}`, doe: () => openPlayer(p.naam) })); } catch {}
    /* komende wedstrijden eerst (eerstvolgende bovenaan), daarna de gespeelde (laatste bovenaan) */
    const vandaag = new Date().toISOString().slice(0, 10), alleW = [...(DATA.uitslagen || []), ...(DATA.programma || [])].filter(m => isUs(m.thuis + m.uit));
    const ws = [...alleW.filter(m => m.datum >= vandaag && !m.score).sort((a, b) => a.datum.localeCompare(b.datum)), ...alleW.filter(m => !(m.datum >= vandaag && !m.score)).sort((a, b) => b.datum.localeCompare(a.datum))];
    ws.forEach(m => { const t = isUs(m.thuis) ? m.uit : m.thuis;
      uit.push({ soort: "Wedstrijden", titel: `${isUs(m.thuis) ? "Thuis tegen" : "Uit bij"} ${kortTeam(t)}`, sub: `${fmtDay(m.datum, { weekday: "short", day: "numeric", month: "short" })}${m.score ? ` · ${m.score}` : m.tijd ? ` · ${m.tijd}` : ""}`,
        tekst: `${t} ${kortTeam(t)} ${m.datum} ${fmtDay(m.datum, { day: "numeric", month: "long" })}`, doe: () => openMatch(`${m.datum}|${m.thuis}|${m.uit}`) }); });
    (DATA.stand || []).filter(t => !isUs(t.team)).forEach(t => uit.push({ soort: "Teams", titel: kortTeam(t.team), sub: `${t.positie}e in de stand · ${t.punten} pt`, tekst: t.team, doe: () => openTeam(t.team) }));
    (window.KAMELEN_QUOTES || []).forEach(q => uit.push({ soort: "Quotes", titel: `“${q.tekst}”`, sub: q.wie || "", tekst: `${q.tekst} ${q.wie || ""} ${q.context || ""}`, doe: () => { location.hash = "quotes"; } }));
    (DATA.fotos || []).filter(f => f.bijschrift).forEach(f => uit.push({ soort: "Foto's", titel: f.bijschrift, sub: f.door ? `van ${f.door}` : "", tekst: `${f.bijschrift} ${f.door || ""}`, doe: () => { location.hash = "fotos"; } }));
    document.querySelectorAll("#view-regels .rule-h").forEach(h => { const sec = h.closest("section");
      uit.push({ soort: "Kamelen-regels", titel: h.textContent.replace(/^\d+/, "").trim(), sub: "", tekst: sec ? sec.textContent : h.textContent, doe: () => { location.hash = "regels"; setTimeout(() => sec?.scrollIntoView({ block: "start" }), 300); } }); });
    return uit;
  }
  let IDX = [], gekozen = 0, treffers = [];
  function zoekOpen() {
    let ov = $("zoek-ov");
    if (!ov) { ov = document.createElement("div"); ov.id = "zoek-ov"; ov.className = "zoek-ov";
      ov.innerHTML = `<div class="zoek-doos" role="dialog" aria-label="Zoeken"><div class="zoek-veld"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="m20 20-4-4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
        <input id="zoek-in" type="search" placeholder="Zoek spelers, wedstrijden, quotes, regels…" autocomplete="off" enterkeyhint="search"><button type="button" class="zoek-x" data-zoek-dicht>Sluiten</button></div>
        <div class="zoek-res" id="zoek-res"></div></div>`;
      document.body.appendChild(ov); }
    IDX = index(); ov.hidden = false; document.body.classList.add("sheet-open");
    ["more-sheet", "nav-more-menu"].forEach(i => { const e = $(i); if (e) e.hidden = true; });
    const i = $("zoek-in"); i.value = ""; toon(""); setTimeout(() => i.focus(), 30);
  }
  function zoekDicht() { const ov = $("zoek-ov"); if (ov) ov.hidden = true; document.body.classList.remove("sheet-open"); }
  function toon(q) {
    const res = $("zoek-res"), w = norm(q).split(/\s+/).filter(Boolean);
    if (!w.length) { treffers = []; res.innerHTML = `<p class="zoek-tip">Typ een naam, tegenstander, datum of een woord uit een quote.</p>`; return; }
    const score = x => { const t = norm(x.titel), alles = norm(x.tekst + " " + x.titel); if (!w.every(z => alles.includes(z))) return -1; return (t.startsWith(w[0]) ? 3 : 0) + (t.includes(w[0]) ? 1 : 0); };
    const groepen = new Map();
    IDX.map(x => [x, score(x)]).filter(([, s]) => s >= 0).sort((a, b) => b[1] - a[1]).forEach(([x]) => { const g = groepen.get(x.soort) || []; if (g.length < 6) g.push(x); groepen.set(x.soort, g); });
    treffers = [...groepen.values()].flat(); gekozen = 0;
    if (!treffers.length) { res.innerHTML = `<p class="zoek-tip">Niets gevonden voor “${esc(q)}”.</p>`; return; }
    let n = 0;
    res.innerHTML = [...groepen].map(([soort, l]) => `<div class="zoek-groep"><div class="zoek-k">${esc(soort)}</div>${l.map(x => `<button type="button" class="zoek-hit${n === 0 ? " aan" : ""}" data-zoek-i="${n++}"><b>${esc(x.titel)}</b>${x.sub ? `<small>${esc(x.sub)}</small>` : ""}</button>`).join("")}</div>`).join("");
  }
  function kies(i) { const x = treffers[i]; if (!x) return; zoekDicht(); setTimeout(() => x.doe(), 30); }
  document.addEventListener("input", e => { if (e.target.id === "zoek-in") toon(e.target.value); });
  document.addEventListener("keydown", e => {
    const ov = $("zoek-ov"), open = ov && !ov.hidden;
    if (!open && e.key === "/" && !e.target.closest("input, textarea, [contenteditable]")) { e.preventDefault(); return zoekOpen(); }
    if (!open) return;
    if (e.key === "Escape") return zoekDicht();
    if (e.key === "Enter") { e.preventDefault(); return kies(gekozen); }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); gekozen = Math.max(0, Math.min(treffers.length - 1, gekozen + (e.key === "ArrowDown" ? 1 : -1)));
      document.querySelectorAll(".zoek-hit").forEach(b => b.classList.toggle("aan", +b.dataset.zoekI === gekozen)); document.querySelector(".zoek-hit.aan")?.scrollIntoView({ block: "nearest" }); }
  });
  document.addEventListener("click", e => {
    if (e.target.closest("[data-zoek-open]")) { e.preventDefault(); return zoekOpen(); }
    if (e.target.closest("[data-zoek-dicht]") || e.target.id === "zoek-ov") return zoekDicht();
    const h = e.target.closest("[data-zoek-i]"); if (h) kies(+h.dataset.zoekI);
  });

  /* ================= WAT IS ER NIEUW ================= */
  /* Alleen voor nieuwe onderdelen of grotere updates. Nieuwste bovenaan. "beheer: true" = alleen voor coaches en beheerders. */
  const NIEUWS = [
    { id: "2026-11-27", titel: "Nieuw in de app", punten: [
      ["🔍", "Zoeken", "Zoek in één keer door spelers, wedstrijden, teams, quotes, foto's en de regels. Tik op het vergrootglas bovenin (of druk op / op de computer)."],
      ["⚖️", "Spelers vergelijken", "Open een speler bij Spelers en tik op 'Vergelijk met andere speler'."],
      ["⭐", "Bonusvraag in de Kamelen-Scorito", "Bij een wedstrijd kan er een bonusvraag staan voor extra punten. Je krijgt een melding als je hem nog niet hebt ingevuld."],
      ["🍺", "Litergrafiek", "Bij Statistieken zie je per maand hoeveel liters erbij kwamen en wat nog open staat."],
      ["📱", "Widget voor je iPhone", "De volgende wedstrijd, de stand en de uitslagen op je beginscherm. Uitleg via Meer → Widget op je iPhone."],
      ["🛠️", "Beheerpaneel", "Opstellingen met dug-out, wissels en speeltijd langs de lijn, bonusvragen en notities per wedstrijd.", true],
    ] },
  ];
  const GEZIEN = "kamelen-nieuws-gezien";
  function nieuwsCheck() {
    if (!window.IK || window.IK.rol === "gast") return;
    let gezien; try { gezien = localStorage.getItem(GEZIEN); } catch { return; }
    const laatste = NIEUWS[0].id;
    if (gezien && gezien >= laatste) return;
    const nieuw = NIEUWS.filter(n => !gezien || n.id > gezien);
    const punten = nieuw.flatMap(n => n.punten).filter(p => !p[3] || isBeheer());
    if (!punten.length) { try { localStorage.setItem(GEZIEN, laatste); } catch {} return; }
    setTimeout(() => toonNieuws(punten, laatste), 1200);
  }
  function toonNieuws(punten, laatste) {
    if (document.querySelector("dialog[open]") || document.body.classList.contains("sheet-open")) return setTimeout(() => toonNieuws(punten, laatste), 4000);
    const d = document.createElement("div"); d.className = "nieuws-ov"; d.id = "nieuws-ov";
    d.innerHTML = `<div class="nieuws" role="dialog" aria-labelledby="nieuws-t"><div class="nieuws-kop"><img src="icon-192.png" alt="" width="44" height="44"><h2 id="nieuws-t">Wat is er nieuw</h2></div>
      <ul>${punten.map(([ic, t, u]) => `<li><span class="ic" aria-hidden="true">${ic}</span><div><b>${esc(t)}</b><p>${esc(u)}</p></div></li>`).join("")}</ul>
      <button type="button" class="btn" data-nieuws-ok>Top, ik ga kijken</button></div>`;
    document.body.appendChild(d); document.body.classList.add("sheet-open");
    const weg = () => { try { localStorage.setItem(GEZIEN, laatste); } catch {} d.remove(); document.body.classList.remove("sheet-open"); };
    d.addEventListener("click", e => { if (e.target === d || e.target.closest("[data-nieuws-ok]")) weg(); });
  }
  window.toonNieuwsOpnieuw = () => toonNieuws(NIEUWS[0].punten.filter(p => !p[3] || isBeheer()), NIEUWS[0].id);
  setTimeout(nieuwsCheck, 0);

  /* ================= SPELERS VERGELIJKEN ================= */
  function cijfers(p) {
    const sc = p.goals.filter(g => g.soort === "sc").length, sb = p.goals.filter(g => g.soort === "sb").length;
    const o = (DATA.profielOpkomst || new Map()).get(p.naam);
    const kz = DATA.kzUitslagen || [];
    const tp = DATA.totoProfiel, plek = tp ? tp.stand.findIndex(x => x.naam === p.naam) + 1 : 0, st = plek ? tp.stand[plek - 1] : null;
    let badges = 0; try { badges = badgeLijst(p).filter(b => b[3]).length; } catch {}
    /* punten per wedstrijd met deze speler erbij */
    let w = 0, pt = 0;
    for (const a of DATA.wedAanwezig || []) { if (!a.aanwezig.has(p.naam)) continue; const m = (DATA.uitslagen || []).find(x => x.datum === a.datum && isUs(x.thuis + x.uit)); if (!m) continue;
      const r = resultFor(m, isUs(m.thuis) ? m.thuis : m.uit); if (!"WGV".includes(r)) continue; w++; pt += r === "W" ? 3 : r === "G" ? 1 : 0; }
    return {
      goals: p.goals.length, veld: p.goals.length - sc - sb, sc,
      liters: p.liters ? p.liters.liters : 0, open: p.liters ? p.liters.open : 0,
      wed: o ? o.wA : null, wedT: o ? o.wT : null, tr: o ? o.tA : null, trT: o ? o.tT : null, laat: o ? o.laat : null,
      ppw: w ? pt / w : null, kameel: kz.filter(r => r.kamelen.includes(p.naam)).length, ezel: kz.filter(r => r.ezels.includes(p.naam)).length,
      scorito: st ? st.punten : null, plek: plek || null, badges,
    };
  }
  const RIJEN = [
    ["Doelpunten", "goals", 1], ["Uit het veld", "veld", 1], ["Strafcorners", "sc", 1],
    ["Wedstrijden aanwezig", "wed", 1, (c) => c.wed == null ? "–" : `${c.wed}/${c.wedT}`], ["Trainingen aanwezig", "tr", 1, (c) => c.tr == null ? "–" : `${c.tr}/${c.trT}`],
    ["Te laat", "laat", -1], ["Punten per wedstrijd erbij", "ppw", 1, (c) => c.ppw == null ? "–" : c.ppw.toFixed(1).replace(".", ",")],
    ["Kameel van de dag", "kameel", 1], ["Ezel van de dag", "ezel", -1],
    ["Liters totaal", "liters", -1, (c) => fmtL(c.liters)], ["Liters open", "open", -1, (c) => fmtL(c.open)],
    ["Scorito-punten", "scorito", 1, (c) => c.scorito == null ? "–" : c.scorito], ["Scorito-plek", "plek", -1, (c) => c.plek ? `${c.plek}e` : "–"],
    ["Badges", "badges", 1],
  ];
  function vergelijkKies(naam) {
    const lijst = playerData().filter(p => p.naam !== naam);
    $("dlg-sub").textContent = "Kies met wie je wilt vergelijken";
    $("dlg-body").innerHTML = `<button type="button" class="btn sm ghost vg-terug" data-vg-terug="${esc(naam)}">← Terug naar ${esc(naam)}</button>
      <div class="vg-kies">${lijst.map(p => `<button type="button" class="vg-naam${p.invaller ? " inv" : ""}" data-vg-a="${esc(naam)}" data-vg-b="${esc(p.naam)}">${typeof avatarHtml === "function" ? avatarHtml(p) : ""}<span>${esc(p.naam)}</span></button>`).join("")}</div>`;
    $("dlg-body").scrollTop = 0;
  }
  function vergelijk(a, b) {
    const pd = playerData(), pa = pd.find(p => p.naam === a), pb = pd.find(p => p.naam === b); if (!pa || !pb) return;
    const ca = cijfers(pa), cb = cijfers(pb);
    let winA = 0, winB = 0;
    const rijen = RIJEN.map(([label, k, richting, fmt]) => {
      const va = ca[k], vb = cb[k], f = fmt || (c => c[k] == null ? "–" : c[k]);
      let beter = 0; if (va != null && vb != null && va !== vb) beter = (va - vb) * richting > 0 ? 1 : 2;
      if (beter === 1) winA++; if (beter === 2) winB++;
      return `<div class="vg-rij"><span class="${beter === 1 ? "beter" : ""}">${f(ca)}</span><em>${esc(label)}</em><span class="${beter === 2 ? "beter" : ""}">${f(cb)}</span></div>`;
    }).join("");
    $("dlg-title").textContent = `${a} vs ${b}`;
    $("dlg-sub").textContent = winA === winB ? `Gelijk opgaand: allebei op ${winA} punten beter` : `${winA > winB ? a : b} wint: op ${Math.max(winA, winB)} punten beter, ${winA > winB ? b : a} op ${Math.min(winA, winB)}`;
    $("dlg-body").innerHTML = `<div class="vg-knoppen"><button type="button" class="btn sm ghost" data-vg-terug="${esc(a)}">← ${esc(a)}</button><button type="button" class="btn sm ghost" data-vergelijk="${esc(a)}">Andere speler</button></div>
      <div class="vg-kop"><div>${typeof avatarHtml === "function" ? avatarHtml(pa) : ""}<b>${esc(a)}</b><small>${winA} beter</small></div><span>vs</span><div>${typeof avatarHtml === "function" ? avatarHtml(pb) : ""}<b>${esc(b)}</b><small>${winB} beter</small></div></div>
      <div class="vg-tabel">${rijen}</div><p class="muted vg-noot">Oranje = beter. Bij liters, te laat en ezel is minder beter.</p>`;
    $("dlg-body").scrollTop = 0;
  }
  document.addEventListener("click", e => {
    const v = e.target.closest("[data-vergelijk]"); if (v) return vergelijkKies(v.dataset.vergelijk);
    const k = e.target.closest("[data-vg-a]"); if (k) return vergelijk(k.dataset.vgA, k.dataset.vgB);
    const t = e.target.closest("[data-vg-terug]"); if (t) return openPlayer(t.dataset.vgTerug);
  });
})();
