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
    t = String(t || "").trim();
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
    if (!CFG.csv || !CFG.form) {
      box.innerHTML = `<div class="empty"><strong>De toto gaat binnenkort open</strong>Zodra het formulier klaarstaat, kun je hier je voorspelling doen.</div>`;
      return;
    }
    const { perMatch, stand, ws } = verwerk(reacties);
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
        <a class="btn mx-big" href="${esc(CFG.form)}" target="_blank" rel="noopener">Doe je voorspelling</a>
      </div>
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

  window.renderToto = function () {
    if (!CFG.csv) return render([]);
    fetch(CFG.csv, { cache: "no-store" }).then(r => r.ok ? r.text() : "").then(t => render(leesReacties(parseCsv(t)))).catch(() => render([]));
  };
})();
