/* =========================================================
   Kamelen-toto: voorspellingen via een Google-formulier
   Punten: precies goed = 3, juiste toto (winst/gelijk/verlies) = 1
   Een voorspelling telt voor de eerstvolgende Kamelen-wedstrijd
   na het moment van invullen, en alleen als die vóór de aftrap is.
   Gebruikt uit index.html: DATA, esc, isUs, toDate, fmtDay, fmtShort, canon, teamLink, parseCsv
   ========================================================= */
(function () {
  const CFG = window.TOTO_CONFIG || {};
  const box = document.getElementById("toto");
  if (!box) return;

  const PUNT_EXACT = 3, PUNT_TOTO = 1;
  const MODEL_NAAM = "Kamelen-model";
  const aftrap = m => toDate(m.datum, m.tijd || "12:00");
  const onzeWedstrijden = () => [...(DATA.uitslagen || []), ...(DATA.programma || [])]
    .filter(m => isUs(m.thuis + m.uit))
    .sort((a, b) => aftrap(a) - aftrap(b))
    .filter((m, i, arr) => i === 0 || !(m.datum === arr[i - 1].datum && m.thuis === arr[i - 1].thuis));
  const sleutel = m => `${m.datum}|${m.thuis}|${m.uit}`;
  /* Uitslag vanuit Kamelen gezien: [voor, tegen] */
  const onsScore = m => { if (!m.score) return null; const [a, b] = m.score.split("-").map(Number); return isUs(m.thuis) ? [a, b] : [b, a]; };
  const toto = (v, t) => v > t ? "W" : v < t ? "V" : "G";

  /* "17-11-2026 17:30:12" of "11/17/2026 17:30:12" of ISO */
  function tijdstip(t) {
    if (t instanceof Date) return t;
    t = String(t || "").trim();
    if (/^\d{4}-\d{2}-\d{2}T/.test(t)) { const d = new Date(t); return isNaN(d) ? null : d; }
    let m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (m) {
      let [, x, y, j, h, mi, se] = m.map(Number);
      let dag = x, maand = y;
      if (t.includes("/") && x <= 12 && y > 12) { dag = y; maand = x; } // Amerikaanse notatie
      return new Date(j, maand - 1, dag, h, mi, se || 0);
    }
    const d = new Date(t); return isNaN(d) ? null : d;
  }

  function leesReacties(rows) {
    if (!rows.length) return [];
    const kop = rows[0].map(k => k.toLowerCase());
    const col = re => kop.findIndex(k => re.test(k));
    const cT = col(/tijd|time/), cN = col(/naam|name/), cK = col(/kamel|gchc|wij|ons/), cTg = col(/tegen/);
    if ([cT, cN, cK, cTg].some(i => i < 0)) return [];
    return rows.slice(1).map(r => ({ tijd: tijdstip(r[cT]), naam: canon(r[cN]), voor: parseInt(r[cK], 10), tegen: parseInt(r[cTg], 10) }))
      .filter(r => r.tijd && r.naam && !isNaN(r.voor) && !isNaN(r.tegen));
  }

  function verwerk(reacties) {
    const ws = onzeWedstrijden();
    const perMatch = new Map(ws.map(m => [sleutel(m), { m, voorsp: new Map() }]));
    /* Een voorspelling hoort bij de wedstrijd waarvoor hij is ingevuld (thuis – uit + oorspronkelijke datum).
       Is die wedstrijd afgelast en verplaatst, dan verhuist de voorspelling mee naar de nieuwe datum.
       Is de nieuwe datum nog onbekend, dan wordt hij bewaard maar nergens meegeteld.
       Oude voorspellingen zonder wedstrijdnaam: eerstvolgende wedstrijd na het invullen. */
    const afgelast = DATA.afgelast || [];
    const paar = s => String(s || "").split(/\s+[–-]\s+/).map(x => x.trim());
    const datumVan = d => { const x = d ? new Date(d) : null; return x && !isNaN(x) ? `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}` : null; };
    const zoekMatch = r => {
      if (!r.wedstrijd) return ws.find(w => aftrap(w) > r.tijd);
      const [th, ui] = paar(r.wedstrijd), dat = datumVan(r.aftrap);
      const zelfde = ws.filter(w => w.thuis === th && w.uit === ui);
      if (!zelfde.length) return null;
      if (!dat) return zelfde.find(w => aftrap(w) > r.tijd) || null;
      const precies = zelfde.find(w => w.datum === dat); if (precies) return precies;
      const a = afgelast.find(x => x.thuis === th && x.uit === ui && x.datum === dat);
      return a && a.nieuweDatum ? zelfde.find(w => w.datum === a.nieuweDatum) || null : null;
    };
    for (const r of reacties.sort((a, b) => a.tijd - b.tijd)) {
      const m = zoekMatch(r);
      if (!m) continue;
      perMatch.get(sleutel(m)).voorsp.set(r.naam, r);  // laatste inzending telt
    }
    /* Het Kamelen-model doet mee: bij elke gespeelde wedstrijd waar iemand voorspelde, en bij de volgende.
       Voor gespeelde wedstrijden alleen met de uitslagen van vóór die wedstrijd, dus eerlijk. */
    const nu = Date.now(), volgende = ws.find(w => aftrap(w) > nu);
    if (typeof voorspelWedstrijd === "function") for (const { m, voorsp } of perMatch.values()) {
      const gespeeld = !!onsScore(m);
      if (!(gespeeld && voorsp.size) && m !== volgende) continue;
      const v = voorspelWedstrijd(m.thuis, m.uit, gespeeld ? m.datum : undefined); if (!v) continue;
      const [h, u] = v.uitslag, wijThuis = isUs(m.thuis);
      voorsp.set(MODEL_NAAM, { naam: MODEL_NAAM, tijd: new Date(aftrap(m) - 60000), voor: wijThuis ? h : u, tegen: wijThuis ? u : h, model: true });
    }
    const stand = new Map();
    for (const { m, voorsp } of perMatch.values()) {
      const s = onsScore(m); if (!s) continue;
      for (const [naam, r] of voorsp) {
        if (r.verborgen || isNaN(r.voor)) continue;
        const p = stand.get(naam) || { naam, punten: 0, exact: 0, toto: 0, aantal: 0 };
        p.aantal++;
        if (r.voor === s[0] && r.tegen === s[1]) { p.punten += PUNT_EXACT; p.exact++; }
        else if (toto(r.voor, r.tegen) === toto(s[0], s[1])) { p.punten += PUNT_TOTO; p.toto++; }
        stand.set(naam, p);
      }
    }
    /* Bonusvragen: wie het juiste antwoord gaf krijgt de punten van die vraag (laatste antwoord per speler telt) */
    const bq = (window._bonus || {}).vragen || {}, laatste = new Map();
    for (const a of (window._bonus || {}).antwoorden || []) if (a.antwoord != null) laatste.set(`${canon(a.naam)}#${a.wedstrijd}`, a);
    for (const a of laatste.values()) {
      const q = bq[a.wedstrijd]; if (!q || !q.antwoord) continue;
      const naam = canon(a.naam); if (!naam) continue;
      const p = stand.get(naam) || { naam, punten: 0, exact: 0, toto: 0, aantal: 0 };
      if (String(a.antwoord).trim().toLowerCase() === String(q.antwoord).trim().toLowerCase()) { p.punten += window.bonusPunten ? window.bonusPunten(q, q.antwoord) : (Number(q.punten) || 0); p.bonus = (p.bonus || 0) + 1; }
      stand.set(naam, p);
    }
    return { perMatch, stand: [...stand.values()].sort((a, b) => b.punten - a.punten || b.exact - a.exact || a.naam.localeCompare(b.naam)), ws };
  }

  const tegenstander = m => isUs(m.thuis) ? m.uit : m.thuis;
  const scoreTekst = (v, t, m) => isUs(m.thuis) ? `${v}-${t}` : `${t}-${v}`;

  function render(reacties) {
    if (!CFG.api && (!CFG.csv || !CFG.form)) {
      box.innerHTML = `<div class="empty"><strong>De Kamelen-Scorito gaat binnenkort open</strong>Zodra het formulier klaarstaat, kun je hier je voorspelling doen.</div>`;
      return;
    }
    const { perMatch, stand, ws } = verwerk(reacties);
    /* Voor het spelersprofiel: per speler zijn gespeelde voorspellingen */
    const perSpeler = new Map();
    for (const { m, voorsp } of perMatch.values()) {
      const sc = onsScore(m); if (!sc) continue;
      for (const [naam, r] of voorsp) {
        if (r.verborgen || isNaN(r.voor)) continue;
        const pts = r.voor === sc[0] && r.tegen === sc[1] ? PUNT_EXACT : toto(r.voor, r.tegen) === toto(sc[0], sc[1]) ? PUNT_TOTO : 0;
        (perSpeler.get(naam) || perSpeler.set(naam, []).get(naam)).push({ m, gok: scoreTekst(r.voor, r.tegen, m), pts, verschil: Math.abs(r.voor - sc[0]) + Math.abs(r.tegen - sc[1]), v: r.voor, t: r.tegen, echt: sc });
      }
    }
    /* Statistieken en badges zijn voor spelers: het model telt daar niet mee */
    perSpeler.delete(MODEL_NAAM);
    DATA.totoProfiel = { stand: stand.filter(p => p.naam !== MODEL_NAAM), perSpeler };
    window.renderStatsExtra?.(); try { renderPlayers(); } catch {}
    const nu = Date.now();
    const volgende = ws.find(m => aftrap(m) > nu);
    const gespeeld = ws.filter(m => onsScore(m) && perMatch.get(sleutel(m)).voorsp.size).reverse();

    /* Home: herinnering als jij de Kamelen-Scorito voor de volgende wedstrijd nog niet hebt ingevuld (vanaf een week ervoor) */
    const sb = document.getElementById("scorito-banner"), ik = (window.IK || {}).naam;
    if (sb) {
      const v = volgende && perMatch.get(sleutel(volgende)).voorsp;
      const dagen = volgende ? (aftrap(volgende) - nu) / 864e5 : 99;
      if (volgende && ik && dagen <= 7 && !v.has(ik)) {
        const tijd = aftrap(volgende).toLocaleString("nl-NL", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
        sb.innerHTML = `<a class="kz-banner todo" href="#toto"><span>🔮</span><span><b>Je hebt de Kamelen-Scorito nog niet ingevuld</b><br><small>${isUs(volgende.thuis) ? "Thuis" : "Uit"} tegen ${esc(isUs(volgende.thuis) ? volgende.uit : volgende.thuis)} · sluit ${tijd}</small></span><span class="kz-go">Invullen</span></a>`;
      } else sb.innerHTML = "";
    }

    let html = "";
    if (volgende) {
      const v = perMatch.get(sleutel(volgende)).voorsp;
      html += `<div class="tt-next">
        <div><div class="k">Volgende wedstrijd</div>
          <div class="tt-match">${teamLink(volgende.thuis)} – ${teamLink(volgende.uit)}</div>
          <div class="tt-when">${fmtDay(volgende.datum)}${volgende.tijd ? ` · ${esc(volgende.tijd)}` : ""} · voorspellen kan tot de aftrap</div></div>
        ${CFG.api ? "" : `<a class="btn mx-big" href="${esc(CFG.form)}" target="_blank" rel="noopener">Doe je voorspelling</a>`}
      </div>
      ${(DATA.afgelast || []).filter(a => a.bevestigd && !a.gespeeld && nu - aftrap(a) < 10 * 864e5).map(a => {
        const bewaard = a.nieuweDatum ? [...(perMatch.get(sleutel({ datum: a.nieuweDatum, thuis: a.thuis, uit: a.uit }))?.voorsp.values() || [])].filter(r => !r.model).length : 0;
        return `<p class="tt-afgelast">⛔ <b>${esc(a.thuis)} – ${esc(a.uit)}</b> van ${fmtDay(a.datum, { day: "numeric", month: "long" })} is afgelast. ${a.nieuweDatum ? `${bewaard ? `De ${bewaard} ${bewaard === 1 ? "voorspelling" : "voorspellingen"} daarvoor ${bewaard === 1 ? "blijft" : "blijven"} staan voor de nieuwe datum, ${fmtDay(a.nieuweDatum, { day: "numeric", month: "long" })}.` : `De nieuwe datum is ${fmtDay(a.nieuweDatum, { day: "numeric", month: "long" })}.`}` : "Voorspellingen daarvoor blijven bewaard tot er een nieuwe datum is."} Voor de wedstrijd hierboven voorspel je opnieuw.</p>`;
      }).join("")}
      ${CFG.api ? formulier(volgende) + bonusBlok(volgende) : ""}
      <div class="tt-voted"><span class="k">${v.size - v.has(MODEL_NAAM)} ${v.size - v.has(MODEL_NAAM) === 1 ? "voorspelling" : "voorspellingen"}</span>${[...v.values()].map(r => r.model ? `<span class="tt-chip tt-model">🐪 Model: <b>${scoreTekst(r.voor, r.tegen, volgende)}</b></span>` : `<span class="tt-chip">${esc(r.naam)}</span>`).join("")}${v.size - v.has(MODEL_NAAM) ? `<span class="tt-hint">Wat ze voorspeld hebben zie je na de aftrap. Het model laat zijn gok alvast zien.</span>` : ""}</div>`;
    }
    html += `<div class="tt-grid"><div><h3 class="sub-h">Klassement</h3>${stand.length ? `<table><thead><tr><th class="r">#</th><th>Speler</th><th class="r" title="Precies goed (${PUNT_EXACT} punten)">Exact</th><th class="r" title="Juiste toto (${PUNT_TOTO} punt)">Toto</th><th class="r">Gesp.</th><th class="r">Ptn</th></tr></thead><tbody>
      ${stand.map((p, i) => `<tr class="${i === 0 ? "lead" : ""}${p.naam === MODEL_NAAM ? " tt-model" : ""}"><td class="r pos">${i + 1}</td><td>${p.naam === MODEL_NAAM ? `🐪 ${esc(p.naam)} <small class="tt-bot">computer</small>` : esc(p.naam)}</td><td class="r">${p.exact}</td><td class="r">${p.toto}</td><td class="r">${p.aantal}</td><td class="r pts">${p.punten}</td></tr>`).join("")}</tbody></table>
      <p class="note">Precies goed = ${PUNT_EXACT} punten · juiste winnaar of gelijkspel = ${PUNT_TOTO} punt · goede bonusvraag = de punten van die vraag. Wie onderaan eindigt, trakteert. Het Kamelen-model voorspelt elke wedstrijd met alleen de uitslagen van daarvóór; wint het model, dan trakteert niemand extra.</p>` : `<div class="empty">Nog geen gespeelde wedstrijden met voorspellingen.</div>`}</div>
      <div><h3 class="sub-h">Per wedstrijd</h3>${gespeeld.length ? gespeeld.map(m => {
        const s = onsScore(m), v = [...perMatch.get(sleutel(m)).voorsp.values()];
        return `<div class="tt-played"><div class="tt-ph"><span class="d">${fmtShort(m.datum)}</span><span>${isUs(m.thuis) ? "thuis" : "uit"} tegen ${teamLink(tegenstander(m))}</span><span class="score">${esc(m.score)}</span></div>
          <div class="tt-preds">${v.sort((a, b) => a.naam.localeCompare(b.naam)).map(r => {
            const pts = r.voor === s[0] && r.tegen === s[1] ? PUNT_EXACT : toto(r.voor, r.tegen) === toto(s[0], s[1]) ? PUNT_TOTO : 0;
            return `<span class="tt-pred p${pts}${r.model ? " tt-model" : ""}">${r.model ? "🐪 " : ""}${esc(r.naam)} <b>${scoreTekst(r.voor, r.tegen, m)}</b>${pts ? ` <small>+${pts}</small>` : ""}</span>`;
          }).join("")}</div></div>`;
      }).join("") : `<div class="empty">Na de eerste wedstrijd met voorspellingen staan ze hier.</div>`}</div></div>`;
    box.innerHTML = html;
  }

  /* ---------- Voorspellen op de site zelf ---------- */
  const LS = "kamelen-toto";
  const eigen = () => { try { return JSON.parse(localStorage.getItem(LS) || "{}"); } catch { return {}; } };
  const bewaarEigen = o => { try { localStorage.setItem(LS, JSON.stringify(o)); } catch {} };
  function formulier(m) {
    const e = eigen(), al = e.voorsp?.[sleutel(m)];
    const namen = [...(typeof ROSTER !== "undefined" ? ROSTER : [])];
    const tegen = tegenstander(m);
    return `<form class="tt-form" id="tt-form" data-key="${esc(sleutel(m))}">
      ${al ? `<div class="tt-mine">Jouw voorspelling: <b>Kamelen ${al.voor} – ${al.tegen} ${esc(tegen)}</b>. Je kunt hem tot de aftrap aanpassen.</div>` : ""}
      <div class="tt-fields">
        <div class="tt-f"><span>Naam</span><div class="tt-ik">${esc((window.IK || {}).naam || "")}</div><input type="hidden" id="tt-naam" value="${esc((window.IK || {}).naam || "")}"></div>
        <div class="tt-score">
          <label class="tt-f"><span>Kamelen</span><span class="tt-step"><button type="button" data-step="voor" data-d="-1" aria-label="Minder">−</button><input id="tt-voor" type="number" inputmode="numeric" min="0" max="40" value="${al ? al.voor : 0}"><button type="button" data-step="voor" data-d="1" aria-label="Meer">+</button></span></label>
          <span class="tt-dash">–</span>
          <label class="tt-f"><span>${esc(tegen)}</span><span class="tt-step"><button type="button" data-step="tegen" data-d="-1" aria-label="Minder">−</button><input id="tt-tegen" type="number" inputmode="numeric" min="0" max="40" value="${al ? al.tegen : 0}"><button type="button" data-step="tegen" data-d="1" aria-label="Meer">+</button></span></label>
        </div>
      </div>
      <div class="tt-submit"><button class="btn mx-big" type="submit">${al ? "Voorspelling aanpassen" : "Voorspelling opslaan"}</button><span class="tt-status" id="tt-status" role="status"></span></div>
    </form>`;
  }
  /* ---------- Bonusvraag van de coach ---------- */
  const BONUS_KEY = "kamelen-bonus";
  const mijnBonus = () => { try { return JSON.parse(localStorage.getItem(BONUS_KEY) || "{}"); } catch { return {}; } };
  function bonusBlok(m) {
    const q = ((window._bonus || {}).vragen || {})[sleutel(m)]; if (!q || !q.vraag) return "";
    const mijn = mijnBonus()[sleutel(m)], opties = q.opties && q.opties.length ? (window.bonusOpties ? window.bonusOpties(q.opties, m) : q.opties.filter(o => o !== "@selectie")) : (window.keuzeVan ? window.keuzeVan(m) : []);
    return `<div class="tt-bonus" data-bonus="${esc(sleutel(m))}"><h3>⭐ Bonusvraag · ${window.bonusPerLinie && window.bonusPerLinie(q) ? "1 tot 3 punten" : `${q.punten} ${q.punten == 1 ? "punt" : "punten"}`}</h3><p>${esc(q.vraag)}</p>
      <div class="opties">${opties.map(o => `<button type="button" class="cv-chip${mijn === o ? " aan" : ""}" data-bonus-optie="${esc(o)}">${esc(o)}${window.bonusPerLinie && window.bonusPerLinie(q) ? ` <small class="tt-bpt">${window.bonusPunten(q, o)}</small>` : ""}</button>`).join("") || `<span class="muted">De antwoorden komen zodra de selectie bekend is.</span>`}</div>
      <span class="tt-status" role="status">${mijn ? `Jouw antwoord: <b>${esc(mijn)}</b>. Aanpassen kan tot de aftrap.` : ""}</span></div>`;
  }
  box.addEventListener("click", async ev => {
    const b = ev.target.closest("[data-bonus-optie]"); if (!b) return;
    const blok = b.closest("[data-bonus]"), st = blok.querySelector(".tt-status"), antwoord = b.dataset.bonusOptie;
    st.textContent = "Opslaan…";
    try {
      const r = await fetch(CFG.api, { method: "POST", body: JSON.stringify({ type: "bonus", code: (window.TOTO_CONFIG || {}).teamcode || "", wedstrijd: blok.dataset.bonus, antwoord }) }).then(x => x.json());
      if (!r.ok) { st.textContent = r.fout === "te laat" ? "De wedstrijd is al begonnen." : r.fout === "code" ? "Je inlogcode klopt niet meer. Log opnieuw in." : "Opslaan lukte niet."; return; }
      const al = mijnBonus(); al[blok.dataset.bonus] = antwoord; try { localStorage.setItem(BONUS_KEY, JSON.stringify(al)); } catch {}
      blok.querySelectorAll("[data-bonus-optie]").forEach(x => x.classList.toggle("aan", x === b));
      st.innerHTML = `Jouw antwoord: <b>${esc(antwoord)}</b>. Aanpassen kan tot de aftrap.`;
    } catch { st.textContent = "Geen verbinding."; }
  });
  box.addEventListener("click", ev => {
    const b = ev.target.closest("[data-step]"); if (!b) return;
    const inp = document.getElementById(b.dataset.step === "voor" ? "tt-voor" : "tt-tegen");
    inp.value = Math.max(0, Math.min(40, (parseInt(inp.value, 10) || 0) + Number(b.dataset.d)));
  });
  box.addEventListener("submit", async ev => {
    if (ev.target.id !== "tt-form") return;
    ev.preventDefault();
    const st = document.getElementById("tt-status"), knop = ev.target.querySelector("button[type=submit]");
    const m = onzeWedstrijden().find(w => sleutel(w) === ev.target.dataset.key);
    const e = eigen();
    const naam = document.getElementById("tt-naam").value;
    const voor = parseInt(document.getElementById("tt-voor").value, 10), tegen = parseInt(document.getElementById("tt-tegen").value, 10);
    const code = (window.TOTO_CONFIG || {}).teamcode || "";
    if (!naam) { st.textContent = "Kies eerst je naam."; return; }
    if (isNaN(voor) || isNaN(tegen)) { st.textContent = "Vul twee getallen in."; return; }
    knop.disabled = true; st.textContent = "Bezig met opslaan…";
    try {
      const r = await fetch(CFG.api, { method: "POST", body: JSON.stringify({ code, naam, voor, tegen, wedstrijd: `${m.thuis} – ${m.uit}`, aftrap: aftrap(m).toISOString() }) });
      const res = await r.json();
      if (!res.ok) {
        st.textContent = res.fout === "invaller" ? "Het script moet nog bijgewerkt worden voordat invallers mee kunnen doen." : res.fout === "code" ? "Je inlogcode klopt niet meer. Log opnieuw in." : res.fout === "te laat" ? "De wedstrijd is al begonnen." : "Opslaan lukte niet, probeer het opnieuw.";
        if (res.fout === "code") { delete e.code; bewaarEigen(e); }
        knop.disabled = false; return;
      }
      e.naam = naam; e.code = code; e.voorsp = { ...(e.voorsp || {}), [sleutel(m)]: { voor, tegen } }; bewaarEigen(e);
      st.textContent = "Opgeslagen!";
      setTimeout(() => { window.kamelenApi(true); window.renderToto(); }, 600);
    } catch {
      st.textContent = "Geen verbinding. Probeer het zo nog eens.";
      knop.disabled = false;
    }
  });

  /* ---------- Gegevens: nieuwe opslag + oude formulierantwoorden ---------- */
  function vanApi(j) {
    return (j.voorspellingen || []).map(r => ({ tijd: tijdstip(r.tijd), naam: canon(r.naam), wedstrijd: r.wedstrijd || "", aftrap: r.aftrap || null, voor: r.voor === null ? NaN : parseInt(r.voor, 10), tegen: r.tegen === null ? NaN : parseInt(r.tegen, 10), verborgen: r.voor === null }))
      .filter(r => r.tijd && r.naam);
  }
  window.renderToto = async function () {
    const lijst = [];
    if (CFG.csv) { try { const t = await fetch(CFG.csv, { cache: "no-store" }).then(r => r.ok ? r.text() : ""); lijst.push(...leesReacties(parseCsv(t))); } catch {} }
    if (CFG.api) { try { const j = await window.kamelenApi(); window._bonus = { vragen: j.bonusvragen || {}, antwoorden: j.bonusantwoorden || [] }; lijst.push(...vanApi(j)); } catch {} }
    render(lijst);
  };
})();
