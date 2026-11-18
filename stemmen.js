/* =========================================================
   Kameel en ezel van de dag
   - Stemmen kan vanaf 75 minuten na de aftrap tot 24 uur na de aftrap.
   - Niet op jezelf stemmen; je laatste stem telt.
   - Meeste stemmen wint; bij gelijke stand delen ze de titel.
   - De ezel van de dag moet een liter trekken (komt in het literklassement).
   - Wie aan het eind van het seizoen het vaakst kameel van de dag was, wint een prijs.
   Gebruikt uit index.html: DATA, esc, isUs, toDate, fmtDay, fmtShort, canon, ROSTER, teamLink, kamelenApi
   ========================================================= */
(function () {
  const box = document.getElementById("stemmen");
  const CFG = window.TOTO_CONFIG || {};
  const OPEN_NA = 75 * 60e3;
  const START = "2026-11-17";              // eerste wedstrijd met stemming
  let GESLOTEN = new Set();
  const LS = "kamelen-toto";               // teamcode en naam delen met de toto
  const eigen = () => { try { return JSON.parse(localStorage.getItem(LS) || "{}"); } catch { return {}; } };
  const bewaar = o => { try { localStorage.setItem(LS, JSON.stringify(o)); } catch {} };

  const aftrap = m => toDate(m.datum, m.tijd || "12:00");
  const sleutel = m => `${m.datum}|${m.thuis}|${m.uit}`;
  const tegen = m => isUs(m.thuis) ? m.uit : m.thuis;
  const onzeGespeeld = () => [...(DATA.uitslagen || [])].filter(m => isUs(m.thuis + m.uit)).sort((a, b) => aftrap(a) - aftrap(b));
  const onze = () => [...(DATA.uitslagen || []), ...(DATA.programma || [])].filter(m => isUs(m.thuis + m.uit))
    .sort((a, b) => aftrap(a) - aftrap(b)).filter((m, i, r) => !i || sleutel(m) !== sleutel(r[i - 1]));
  const opent = m => new Date(aftrap(m).getTime() + OPEN_NA);
  /* Stemmingen die open zijn: gespeeld (vanaf START), ruim een uur na de aftrap, nog niet gesloten door de beheerder */
  const openStemmingen = () => onze().filter(m => m.datum >= START && Date.now() >= opent(m) && !GESLOTEN.has(sleutel(m)));

  /* Wedstrijd waarvoor nu gestemd kan worden */
  function stemWedstrijd() { const o = openStemmingen(); return o.length ? o[o.length - 1] : null; }

  /* Uitslagen per wedstrijd uit de stemmen */
  function uitslagen(stemmen) {
    const perMatch = new Map();
    for (const s of stemmen) {
      if (!s.wedstrijdKey) continue;
      const lijst = perMatch.get(s.wedstrijdKey) || new Map();
      lijst.set(s.stemmer, s);                         // laatste stem telt
      perMatch.set(s.wedstrijdKey, lijst);
    }
    const res = [];
    for (const m of onze()) {
      const lijst = perMatch.get(sleutel(m)); if (!lijst) continue;
      const st = [...lijst.values()];
      const open = !GESLOTEN.has(sleutel(m));
      const tel = k => { const c = new Map(); st.forEach(s => s[k] && c.set(s[k], (c.get(s[k]) || 0) + 1)); return c; };
      const winnaars = c => { const max = Math.max(0, ...c.values()); return max ? [...c.entries()].filter(([, n]) => n === max).map(([n]) => n) : []; };
      const k = tel("kameel"), e = tel("ezel");
      res.push({ m, stemmers: st.map(s => s.stemmer), open, kamelen: open ? [] : winnaars(k), ezels: open ? [] : winnaars(e), k, e });
    }
    return res;
  }

  /* Ezels krijgen een liter in het literklassement (tenzij de liter al in de sheet staat met "ezel" in de reden) */
  function ezelLiters(res) {
    const sheet = DATA.litersBasis || [];
    const alInSheet = new Map();
    sheet.forEach(r => { if (/ezel/i.test(r.reden || "")) { const n = canon(r.naam); alInSheet.set(n, (alInSheet.get(n) || 0) + 1); } });
    const extra = [];
    for (const r of res) for (const naam of r.ezels) {
      if ((alInSheet.get(naam) || 0) > 0) { alInSheet.set(naam, alInSheet.get(naam) - 1); continue; }
      extra.push({ naam, datum: `${toDate(r.m.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })} wedstrijd`, reden: `Ezel van de dag (tegen ${tegen(r.m)})`, hoeveel: "1L", status: "" });
    }
    return extra;
  }

  /* ---------- Weergave ---------- */
  function render(res) {
    if (!box) return;
    const nu = Date.now(), m = stemWedstrijd(), e = eigen();
    const namen = [...(typeof ROSTER !== "undefined" ? ROSTER : [])];
    let html = "";
    if (m) {
      const r = res.find(x => sleutel(x.m) === sleutel(m));
      const gestemd = r ? r.stemmers : [];
      const mijn = e.stemmen?.[sleutel(m)];
      const keuzes = (veld, gekozen) => `<div class="kz-grid" role="radiogroup" data-veld="${veld}">${namen.map(n => `<button type="button" class="kz-chip ${gekozen === n ? "on" : ""}" data-naam="${esc(n)}" role="radio" aria-checked="${gekozen === n}">${esc(n)}</button>`).join("")}</div>`;
      html += `<div class="kz-open">
        <div class="kz-head"><div><div class="k">Stemmen is open</div><div class="kz-match">${teamLink(m.thuis)} ${esc(m.score || "")} ${teamLink(m.uit)}</div><div class="kz-when">${fmtDay(m.datum)}</div></div></div>
        <form id="kz-form" data-key="${esc(sleutel(m))}">
          ${mijn ? `<div class="tt-mine">Jouw stem: kameel <b>${esc(mijn.kameel)}</b>, ezel <b>${esc(mijn.ezel)}</b>. Je kunt hem aanpassen zolang de stemming open is.</div>` : ""}
          <label class="tt-f"><span>Wie ben jij?</span><select id="kz-stemmer"><option value="">Kies…</option>${namen.map(n => `<option ${e.naam === n ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
          <div class="kz-sec"><h3><span class="kz-ic kameel">🐪</span> Kameel van de dag</h3><p>Wie was vandaag de beste of leukste Kameel?</p>${keuzes("kameel", mijn?.kameel)}</div>
          <div class="kz-sec"><h3><span class="kz-ic ezel">🫏</span> Ezel van de dag</h3><p>Wie verdient de ezel? Die moet een liter trekken.</p>${keuzes("ezel", mijn?.ezel)}</div>
          <div class="tt-submit"><button class="btn mx-big" type="submit">${mijn ? "Stem aanpassen" : "Stem uitbrengen"}</button><span class="tt-status" id="kz-status" role="status"></span></div>
        </form>
        <div class="tt-voted"><span class="k">${gestemd.length} ${gestemd.length === 1 ? "stem" : "stemmen"}</span>${gestemd.map(n => `<span class="tt-chip">${esc(n)}</span>`).join("")}${gestemd.length ? `<span class="tt-hint">De uitslag wordt bekend als de stemming gesloten wordt.</span>` : ""}</div>
      </div>`;
    } else {
      const volgende = onze().find(x => aftrap(x) > nu);
      html += `<div class="empty"><strong>Er loopt nu geen stemming</strong>${volgende ? `Na de wedstrijd tegen ${esc(tegen(volgende))} (${fmtDay(volgende.datum)}) kun je hier stemmen, vanaf ruim een uur na de aftrap.` : "Na de volgende wedstrijd kun je hier stemmen."}</div>`;
    }

    /* Seizoensklassement */
    const kl = new Map();
    const tel = (n, k) => { const p = kl.get(n) || { naam: n, kameel: 0, ezel: 0 }; p[k]++; kl.set(n, p); };
    res.forEach(r => { r.kamelen.forEach(n => tel(n, "kameel")); r.ezels.forEach(n => tel(n, "ezel")); });
    const rij = [...kl.values()].sort((a, b) => b.kameel - a.kameel || a.ezel - b.ezel || a.naam.localeCompare(b.naam));
    const gesloten = res.filter(r => !r.open).reverse();
    html += `<div class="tt-grid" style="margin-top:22px">
      <div><h3 class="sub-h">Kameel van het seizoen</h3>${rij.length ? `<table><thead><tr><th class="r">#</th><th>Speler</th><th class="r">🐪 Kameel</th><th class="r">🫏 Ezel</th></tr></thead><tbody>
        ${rij.map((p, i) => `<tr class="${i === 0 && p.kameel ? "lead" : ""}"><td class="r pos">${i + 1}</td><td>${esc(p.naam)}</td><td class="r pts">${p.kameel}</td><td class="r">${p.ezel}</td></tr>`).join("")}</tbody></table>
        <p class="note">Wie aan het einde van het seizoen het vaakst kameel van de dag is geweest, wint een prijs.</p>` : `<div class="empty">Na de eerste stemming staat hier het klassement.</div>`}</div>
      <div><h3 class="sub-h">Per wedstrijd</h3>${gesloten.length ? gesloten.map(r => `<div class="tt-played"><div class="tt-ph"><span class="d">${fmtShort(r.m.datum)}</span><span>${isUs(r.m.thuis) ? "thuis" : "uit"} tegen ${teamLink(tegen(r.m))}</span><span class="score">${esc(r.m.score || "")}</span></div>
          <div class="kz-win"><span class="kz-badge kameel">🐪 ${r.kamelen.map(esc).join(" & ") || "–"}</span><span class="kz-badge ezel">🫏 ${r.ezels.map(esc).join(" & ") || "–"}</span><span class="kz-n">${r.stemmers.length} stemmen</span></div></div>`).join("")
        : `<div class="empty">Uitslagen van eerdere stemmingen komen hier.</div>`}</div></div>`;
    html += beheerHtml(res);
    box.innerHTML = html;
  }

  /* ---------- Beheer: alleen met de beheercode ---------- */
  const BLS = "kamelen-beheer";
  const beheercode = () => { try { return localStorage.getItem(BLS) || ""; } catch { return ""; } };
  function beheerHtml(res) {
    const code = beheercode();
    if (!code) return `<details class="kz-beheer"><summary>Beheer</summary>
      <form id="kz-login" class="kz-login"><label class="tt-f"><span>Beheercode</span><input id="kz-bc" type="password" autocomplete="off"></label><button class="btn sm" type="submit">Inloggen</button><span class="tt-status" id="kz-bstatus" role="status"></span></form></details>`;
    const open = openStemmingen();
    const dicht = res.filter(r => !r.open).slice(-3).reverse();
    return `<div class="kz-beheer open"><div class="kz-bhead"><b>Beheer</b><button type="button" class="btn sm ghost" data-kz="uitloggen">Uitloggen</button></div>
      ${open.length ? open.map(m => { const r = res.find(x => sleutel(x.m) === sleutel(m)); const n = r ? r.stemmers.length : 0;
        return `<div class="kz-brow"><span><b>${esc(m.thuis)} – ${esc(m.uit)}</b><br><small>${fmtShort(m.datum)} · ${n} ${n === 1 ? "stem" : "stemmen"}</small></span>
          <button type="button" class="btn sm" data-kz="sluit" data-key="${esc(sleutel(m))}">Sluit en maak uitslag bekend</button></div>`; }).join("")
        : `<p class="note">Er staan geen stemmingen open.</p>`}
      ${dicht.length ? `<p class="note" style="margin-top:14px">Per ongeluk gesloten? Heropen een stemming:</p>` + dicht.map(r => `<div class="kz-brow"><span>${esc(r.m.thuis)} – ${esc(r.m.uit)} <small>(${fmtShort(r.m.datum)})</small></span><button type="button" class="btn sm ghost" data-kz="heropen" data-key="${esc(sleutel(r.m))}">Heropen</button></div>`).join("") : ""}
      <span class="tt-status" id="kz-bstatus" role="status"></span></div>`;
  }
  async function beheer(actie, extra = {}) {
    const r = await fetch(CFG.api, { method: "POST", body: JSON.stringify({ type: "beheer", actie, beheercode: extra.code || beheercode(), wedstrijd: extra.key || "" }) });
    return r.json();
  }

  /* Startpagina: banner als er gestemd kan worden, en de laatste kameel/ezel */
  function renderBanner(res) {
    const el = document.getElementById("kz-banner"); if (!el) return;
    const m = stemWedstrijd(), laatste = res.filter(r => !r.open).pop();
    if (m) el.innerHTML = `<a class="kz-banner" href="#stemmen"><span>🐪🫏</span><span><b>Stem nu op de kameel en ezel van de dag</b><br><small>Na ${esc(m.thuis)} – ${esc(m.uit)} · ${(res.find(x => sleutel(x.m) === sleutel(m))?.stemmers.length) || 0} stemmen tot nu toe</small></span><span class="kz-go">Stemmen</span></a>`;
    else if (laatste && Date.now() - aftrap(laatste.m) < 5 * 864e5) el.innerHTML = `<a class="kz-banner done" href="#stemmen"><span>🐪</span><span><b>Kameel van de dag: ${laatste.kamelen.map(esc).join(" & ") || "–"}</b><br><small>Ezel van de dag: ${laatste.ezels.map(esc).join(" & ") || "–"} – die trekt een liter</small></span><span class="kz-go">Bekijk uitslag</span></a>`;
    else el.innerHTML = "";
  }

  /* ---------- Interactie ---------- */
  if (box) {
    box.addEventListener("click", ev => {
      const c = ev.target.closest(".kz-chip"); if (!c) return;
      const grid = c.closest(".kz-grid");
      grid.querySelectorAll(".kz-chip").forEach(x => { x.classList.toggle("on", x === c); x.setAttribute("aria-checked", String(x === c)); });
    });
    box.addEventListener("click", async ev => {
      const b = ev.target.closest("[data-kz]"); if (!b) return;
      const st = document.getElementById("kz-bstatus");
      if (b.dataset.kz === "uitloggen") { try { localStorage.removeItem(BLS); } catch {} return window.renderStemmen(); }
      if (b.dataset.kz === "sluit" && !confirmInline(b)) return;
      b.disabled = true; st.textContent = "Bezig…";
      try {
        const res = await beheer(b.dataset.kz, { key: b.dataset.key });
        if (!res.ok) { st.textContent = res.fout === "beheercode" ? "Beheercode klopt niet meer." : "Dat lukte niet. Is het script bijgewerkt?"; b.disabled = false; return; }
        st.textContent = b.dataset.kz === "sluit" ? "Gesloten – de uitslag is bekend!" : "Weer geopend.";
        setTimeout(() => window.renderStemmen(true), 600);
      } catch { st.textContent = "Geen verbinding."; b.disabled = false; }
    });
    /* Sluiten vraagt een tweede tik ter bevestiging (geen pop-up nodig) */
    function confirmInline(b) {
      if (b.dataset.zeker) return true;
      b.dataset.zeker = "1"; b.textContent = "Zeker weten? Tik nog een keer"; b.classList.add("warn");
      setTimeout(() => { delete b.dataset.zeker; b.textContent = "Sluit en maak uitslag bekend"; b.classList.remove("warn"); }, 4000);
      return false;
    }
    box.addEventListener("submit", async ev => {
      if (ev.target.id === "kz-login") {
        ev.preventDefault();
        const code = document.getElementById("kz-bc").value.trim(), st = document.getElementById("kz-bstatus");
        if (!code) return;
        st.textContent = "Controleren…";
        try { const res = await beheer("check", { code });
          if (res.ok) { try { localStorage.setItem(BLS, code); } catch {} window.renderStemmen(); }
          else st.textContent = res.fout === "beheercode" ? "Die beheercode klopt niet." : "Het script is nog niet bijgewerkt.";
        } catch { st.textContent = "Geen verbinding."; }
        return;
      }
      if (ev.target.id !== "kz-form") return;
      ev.preventDefault();
      const st = document.getElementById("kz-status"), knop = ev.target.querySelector("button[type=submit]");
      const m = onze().find(x => sleutel(x) === ev.target.dataset.key); if (!m) return;
      const e = eigen();
      const stemmer = document.getElementById("kz-stemmer").value;
      const kameel = ev.target.querySelector('[data-veld="kameel"] .on')?.dataset.naam;
      const ezel = ev.target.querySelector('[data-veld="ezel"] .on')?.dataset.naam;
      const code = (window.TOTO_CONFIG || {}).teamcode || "";
      if (!stemmer) return st.textContent = "Kies eerst wie je bent.";
      if (!kameel || !ezel) return st.textContent = "Kies een kameel én een ezel.";
      if (kameel === stemmer || ezel === stemmer) return st.textContent = "Op jezelf stemmen mag niet.";
      knop.disabled = true; st.textContent = "Bezig met opslaan…";
      try {
        const r = await fetch(CFG.api, { method: "POST", body: JSON.stringify({ type: "stem", code, stemmer, kameel, ezel, wedstrijd: sleutel(m), opent: opent(m).toISOString() }) });
        const res = await r.json();
        if (!res.ok) {
          st.textContent = { code: "Die teamcode klopt niet.", zelf: "Op jezelf stemmen mag niet.", gesloten: "De stemming is al gesloten.", "nog niet": "De stemming is nog niet open." }[res.fout] || "Opslaan lukte niet. Is het script al bijgewerkt?";
          if (res.fout === "code") { delete e.code; bewaar(e); }
          knop.disabled = false; return;
        }
        e.naam = stemmer; e.code = code; e.stemmen = { ...(e.stemmen || {}), [sleutel(m)]: { kameel, ezel } }; bewaar(e);
        st.textContent = "Gestemd!";
        setTimeout(() => window.renderStemmen(true), 700);
      } catch { st.textContent = "Geen verbinding. Probeer het zo nog eens."; knop.disabled = false; }
    });
  }

  window.renderStemmen = async function (vers) {
    let stemmen = [];
    try {
      const j = await window.kamelenApi(vers);
      GESLOTEN = new Set(j.gesloten || []);
      stemmen = (j.stemmen || []).map(s => ({ stemmer: canon(s.stemmer), kameel: s.kameel === null ? null : canon(s.kameel), ezel: s.ezel === null ? null : canon(s.ezel), wedstrijdKey: String(s.wedstrijd || "") }));
    } catch {}
    const res = uitslagen(stemmen);
    DATA.kzUitslagen = res.filter(r => !r.open).map(r => ({ m: r.m, kamelen: r.kamelen, ezels: r.ezels }));
    render(res); renderBanner(res);
    /* Ezel-liters in het literklassement verwerken */
    DATA.litersBasis = DATA.litersBasis || DATA.liters || [];
    DATA.liters = [...DATA.litersBasis, ...ezelLiters(res)];
    try { renderLiters(); renderPlayers(); renderDash(); } catch {}
  };
})();
