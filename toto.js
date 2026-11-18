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
    for (const r of reacties.sort((a, b) => a.tijd - b.tijd)) {
      const m = ws.find(w => aftrap(w) > r.tijd);   // eerstvolgende wedstrijd na invullen
      if (!m) continue;
      perMatch.get(sleutel(m)).voorsp.set(r.naam, r);  // laatste inzending telt
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
    return { perMatch, stand: [...stand.values()].sort((a, b) => b.punten - a.punten || b.exact - a.exact || a.naam.localeCompare(b.naam)), ws };
  }

  const tegenstander = m => isUs(m.thuis) ? m.uit : m.thuis;
  const scoreTekst = (v, t, m) => isUs(m.thuis) ? `${v}-${t}` : `${t}-${v}`;

  function render(reacties) {
    if (!CFG.api && (!CFG.csv || !CFG.form)) {
      box.innerHTML = `<div class="empty"><strong>De toto gaat binnenkort open</strong>Zodra het formulier klaarstaat, kun je hier je voorspelling doen.</div>`;
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
        (perSpeler.get(naam) || perSpeler.set(naam, []).get(naam)).push({ m, gok: scoreTekst(r.voor, r.tegen, m), pts, verschil: Math.abs(r.voor - sc[0]) + Math.abs(r.tegen - sc[1]) });
      }
    }
    DATA.totoProfiel = { stand, perSpeler };
    const nu = Date.now();
    const volgende = ws.find(m => aftrap(m) > nu);
    const gespeeld = ws.filter(m => onsScore(m) && perMatch.get(sleutel(m)).voorsp.size).reverse();

    let html = "";
    if (volgende) {
      const v = perMatch.get(sleutel(volgende)).voorsp;
      html += `<div class="tt-next">
        <div><div class="k">Volgende wedstrijd</div>
          <div class="tt-match">${teamLink(volgende.thuis)} – ${teamLink(volgende.uit)}</div>
          <div class="tt-when">${fmtDay(volgende.datum)}${volgende.tijd ? ` · ${esc(volgende.tijd)}` : ""} · voorspellen kan tot de aftrap</div></div>
        ${CFG.api ? "" : `<a class="btn mx-big" href="${esc(CFG.form)}" target="_blank" rel="noopener">Doe je voorspelling</a>`}
      </div>
      ${CFG.api ? formulier(volgende) : ""}
      <div class="tt-voted"><span class="k">${v.size} ${v.size === 1 ? "voorspelling" : "voorspellingen"}</span>${[...v.keys()].map(n => `<span class="tt-chip">${esc(n)}</span>`).join("")}${v.size ? `<span class="tt-hint">Wat ze voorspeld hebben zie je na de aftrap.</span>` : ""}</div>`;
    }
    html += `<div class="tt-grid"><div><h3 class="sub-h">Klassement</h3>${stand.length ? `<table><thead><tr><th class="r">#</th><th>Speler</th><th class="r" title="Precies goed (${PUNT_EXACT} punten)">Exact</th><th class="r" title="Juiste toto (${PUNT_TOTO} punt)">Toto</th><th class="r">Gesp.</th><th class="r">Ptn</th></tr></thead><tbody>
      ${stand.map((p, i) => `<tr class="${i === 0 ? "lead" : ""}"><td class="r pos">${i + 1}</td><td>${esc(p.naam)}</td><td class="r">${p.exact}</td><td class="r">${p.toto}</td><td class="r">${p.aantal}</td><td class="r pts">${p.punten}</td></tr>`).join("")}</tbody></table>
      <p class="note">Precies goed = ${PUNT_EXACT} punten · juiste winnaar of gelijkspel = ${PUNT_TOTO} punt. Wie onderaan eindigt, trakteert.</p>` : `<div class="empty">Nog geen gespeelde wedstrijden met voorspellingen.</div>`}</div>
      <div><h3 class="sub-h">Per wedstrijd</h3>${gespeeld.length ? gespeeld.map(m => {
        const s = onsScore(m), v = [...perMatch.get(sleutel(m)).voorsp.values()];
        return `<div class="tt-played"><div class="tt-ph"><span class="d">${fmtShort(m.datum)}</span><span>${isUs(m.thuis) ? "thuis" : "uit"} tegen ${teamLink(tegenstander(m))}</span><span class="score">${esc(m.score)}</span></div>
          <div class="tt-preds">${v.sort((a, b) => a.naam.localeCompare(b.naam)).map(r => {
            const pts = r.voor === s[0] && r.tegen === s[1] ? PUNT_EXACT : toto(r.voor, r.tegen) === toto(s[0], s[1]) ? PUNT_TOTO : 0;
            return `<span class="tt-pred p${pts}">${esc(r.naam)} <b>${scoreTekst(r.voor, r.tegen, m)}</b>${pts ? ` <small>+${pts}</small>` : ""}</span>`;
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
        <label class="tt-f"><span>Naam</span><select id="tt-naam" required><option value="">Kies…</option>${namen.map(n => `<option ${e.naam === n ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
        <div class="tt-score">
          <label class="tt-f"><span>Kamelen</span><span class="tt-step"><button type="button" data-step="voor" data-d="-1" aria-label="Minder">−</button><input id="tt-voor" type="number" inputmode="numeric" min="0" max="40" value="${al ? al.voor : 0}"><button type="button" data-step="voor" data-d="1" aria-label="Meer">+</button></span></label>
          <span class="tt-dash">–</span>
          <label class="tt-f"><span>${esc(tegen)}</span><span class="tt-step"><button type="button" data-step="tegen" data-d="-1" aria-label="Minder">−</button><input id="tt-tegen" type="number" inputmode="numeric" min="0" max="40" value="${al ? al.tegen : 0}"><button type="button" data-step="tegen" data-d="1" aria-label="Meer">+</button></span></label>
        </div>
        ${e.code ? "" : `<label class="tt-f"><span>Teamcode</span><input id="tt-code" type="text" autocomplete="off" placeholder="staat in de teamapp" required></label>`}
      </div>
      <div class="tt-submit"><button class="btn mx-big" type="submit">${al ? "Voorspelling aanpassen" : "Voorspelling opslaan"}</button><span class="tt-status" id="tt-status" role="status"></span></div>
    </form>`;
  }
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
    const code = e.code || document.getElementById("tt-code")?.value.trim();
    if (!naam) { st.textContent = "Kies eerst je naam."; return; }
    if (isNaN(voor) || isNaN(tegen)) { st.textContent = "Vul twee getallen in."; return; }
    knop.disabled = true; st.textContent = "Bezig met opslaan…";
    try {
      const r = await fetch(CFG.api, { method: "POST", body: JSON.stringify({ code, naam, voor, tegen, wedstrijd: `${m.thuis} – ${m.uit}`, aftrap: aftrap(m).toISOString() }) });
      const res = await r.json();
      if (!res.ok) {
        st.textContent = res.fout === "code" ? "Die teamcode klopt niet." : res.fout === "te laat" ? "De wedstrijd is al begonnen." : "Opslaan lukte niet, probeer het opnieuw.";
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
    return (j.voorspellingen || []).map(r => ({ tijd: tijdstip(r.tijd), naam: canon(r.naam), voor: r.voor === null ? NaN : parseInt(r.voor, 10), tegen: r.tegen === null ? NaN : parseInt(r.tegen, 10), verborgen: r.voor === null }))
      .filter(r => r.tijd && r.naam);
  }
  window.renderToto = async function () {
    const lijst = [];
    if (CFG.csv) { try { const t = await fetch(CFG.csv, { cache: "no-store" }).then(r => r.ok ? r.text() : ""); lijst.push(...leesReacties(parseCsv(t))); } catch {} }
    if (CFG.api) { try { const j = await window.kamelenApi(); lijst.push(...vanApi(j)); } catch {} }
    render(lijst);
  };
})();
