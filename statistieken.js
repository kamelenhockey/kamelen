/* =========================================================
   Statistieken: team, opkomst, doelpunten en liters
   - Afwezigheid komt live uit de spreadsheet (tabbladen "Afwezigheid Wedstrijden" en "Afwezigheid training").
   - Lege cel = aanwezig. Tekst of "x" = afwezig. "Te laat" (precies) = aanwezig, maar te laat.
   - Redenen worden alleen per categorie voor het hele team getoond, nooit per speler (de site is openbaar).
   Gebruikt uit index.html: DATA, esc, isUs, toDate, fmtShort, canon, ROSTER, resultFor, teamStats, buildRanking, fmtL, parseCsv
   ========================================================= */
(function () {
  const box = document.getElementById("stats");
  if (!box) return;
  const CFG = window.STATS_CONFIG || {};
  /* Spelers die (een deel van) het seizoen niet meetellen */
  const UITSLUITEN = CFG.uitsluiten || [];
  const telt = (naam, datum) => !UITSLUITEN.some(u => u.namen.includes(naam) && datum <= u.tot);

  const MAAND = { jan: 1, januari: 1, feb: 2, februari: 2, mrt: 3, maart: 3, apr: 4, april: 4, mei: 5, jun: 6, juni: 6, jul: 7, juli: 7, aug: 8, augustus: 8, sep: 9, sept: 9, september: 9, okt: 10, oktober: 10, nov: 11, november: 11, dec: 12, december: 12 };
  function kopDatum(t) {
    const m = String(t || "").trim().toLowerCase().match(/^(\d{1,2})[\s-]+([a-z]+)/);
    if (!m || !MAAND[m[2]]) return null;
    const maand = MAAND[m[2]], jaar = maand >= 7 ? 2026 : 2027;
    return `${jaar}-${String(maand).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
  }
  const vandaag = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

  /* Afwezigheidsblad omzetten naar sessies */
  function leesAfwezigheid(rows) {
    if (!rows.length) return { sessies: [], invallers: [] };
    const kop = rows[0], cols = [];
    kop.forEach((h, i) => { const d = kopDatum(h); if (d && i > 0) cols.push({ i, datum: d }); });
    const totaalRij = rows.find(r => /totaal aanwezig/i.test(r[0] || ""));
    const spelers = [], invallers = [];
    let inSpelers = true;
    for (const r of rows.slice(1)) {
      const naam = (r[0] || "").trim();
      if (!naam) { if (spelers.length) inSpelers = false; continue; }
      if (/totaal aanwezig/i.test(naam)) continue;
      if (/invaller/i.test(naam)) { cols.forEach(c => { const v = (r[c.i] || "").trim(); if (v) invallers.push({ datum: c.datum, naam: v }); }); continue; }
      if (!inSpelers) continue;
      spelers.push({ naam: canon(naam), cellen: r });
    }
    const nu = vandaag();
    const sessies = cols.filter(c => c.datum <= nu).map(c => ({
      datum: c.datum,
      totaal: totaalRij ? parseInt(totaalRij[c.i], 10) : NaN,
      spelers: spelers.filter(s => telt(s.naam, c.datum)).map(s => {
        const v = (s.cellen[c.i] || "").trim();
        return { naam: s.naam, aanwezig: !v || /^te laat$/i.test(v), telaat: /^te laat$/i.test(v), reden: v };
      })
    }));
    return { sessies: sessies.sort((a, b) => a.datum.localeCompare(b.datum)), invallers: invallers.filter(x => x.datum <= nu) };
  }

  /* Redenen groeperen (alleen voor het hele team) */
  const CATS = [
    ["Studie & werk", /studie|studeren|tentamen|deadline|^tt\b|\btt$|stage|werk|congres|itw|rijles/i],
    ["Feestjes & borrels", /borrel|lustrum|gala|pegassi|feest|partij|ade|chick|diner|\bgyas\b|aegir/i],
    ["Familie & verjaardagen", /verjaardag|familie|opa|oma|vader|bruiloft|verhuizen/i],
    ["Vakantie & weg", /vakantie|wales|schotland|spanje|denemarken|ameland|leeuwarden|weekend|jagen/i],
    ["Blessure of ziek", /ziek|blessure|blessa|gebless|enkel|knie|rug|voet|kuit|duim|vinger|maag|migraine|elleboog|nagel|medicijn|last|ribkneus/i],
    ["Loting & overig", /loting|uitgeloot|uitloten|thth|verplaatsing|te laat|afgemeld|afwezig/i],
  ];
  const categorie = r => { if (/^x+$|^\?+$|^$/i.test(r)) return "Geen reden opgegeven"; const c = CATS.find(([, re]) => re.test(r)); return c ? c[0] : "Overig"; };

  /* ---------- Berekenen ---------- */
  function bereken(wed, tr) {
    const us = (DATA.stand || []).find(t => isUs(t.team));
    const team = us ? us.team : "GCHC H13";
    const res = [...(DATA.uitslagen || [])].filter(m => isUs(m.thuis + m.uit)).sort((a, b) => a.datum.localeCompare(b.datum));
    const per = res.map(m => { const [a, b] = m.score.split("-").map(Number); const thuis = isUs(m.thuis); return { m, thuis, voor: thuis ? a : b, tegen: thuis ? b : a, r: resultFor(m, team), tegenstander: thuis ? m.uit : m.thuis }; });
    const S = { per, team };
    S.w = per.filter(x => x.r === "W").length; S.g = per.filter(x => x.r === "G").length; S.v = per.filter(x => x.r === "V").length;
    S.dv = per.reduce((s, x) => s + x.voor, 0); S.dt = per.reduce((s, x) => s + x.tegen, 0);
    S.thuis = per.filter(x => x.thuis); S.uit = per.filter(x => !x.thuis);
    const rec = l => `${l.filter(x => x.r === "W").length}-${l.filter(x => x.r === "G").length}-${l.filter(x => x.r === "V").length}`;
    S.thuisRec = rec(S.thuis); S.uitRec = rec(S.uit);
    S.grootste = [...per].sort((a, b) => (b.voor - b.tegen) - (a.voor - a.tegen) || b.voor - a.voor)[0];
    S.zwaarste = [...per].sort((a, b) => (a.voor - a.tegen) - (b.voor - b.tegen))[0];
    S.cleansheets = per.filter(x => x.tegen === 0).length;
    S.meesteGoals = [...per].sort((a, b) => b.voor - a.voor)[0];
    /* reeksen */
    let best = 0, cur = 0, ongeslagen = 0, curO = 0;
    per.forEach(x => { cur = x.r === "W" ? cur + 1 : 0; best = Math.max(best, cur); curO = x.r !== "V" ? curO + 1 : 0; ongeslagen = Math.max(ongeslagen, curO); });
    S.winreeks = best; S.ongeslagenReeks = ongeslagen;
    let nu = 0; for (let i = per.length - 1; i >= 0 && per[i].r === "W"; i--) nu++; S.huidigeWinreeks = nu;
    /* eerste helft van de wedstrijd? niet beschikbaar; wel: punten na aftrek */
    S.punten = us ? us.punten : S.w * 3 + S.g; S.positie = us?.positie;

    /* doelpunten */
    const goals = []; (DATA.doelpunten || []).forEach(w => w.goals.forEach(g => goals.push(g)));
    S.goalsTotaal = goals.length; S.sc = goals.filter(g => g.soort === "sc").length; S.veld = goals.filter(g => g.soort === "veld").length;
    S.scorers = new Set(goals.map(g => g.wie)).size;
    const perSpeler = new Map(); goals.forEach(g => perSpeler.set(g.wie, (perSpeler.get(g.wie) || 0) + 1));
    S.topscorer = [...perSpeler.entries()].sort((a, b) => b[1] - a[1])[0];
    const scKoning = new Map(); goals.filter(g => g.soort === "sc").forEach(g => scKoning.set(g.wie, (scKoning.get(g.wie) || 0) + 1));
    S.scKoning = [...scKoning.entries()].sort((a, b) => b[1] - a[1])[0];

    /* liters */
    const lit = buildRanking(DATA.liters || [], {});
    S.liters = lit.reduce((s, p) => s + p.liters, 0); S.litersOpen = lit.reduce((s, p) => s + p.open, 0);
    S.literKoning = lit[0];
    S.snelBetaler = lit.filter(p => p.liters >= 2 && p.open === 0).sort((a, b) => b.liters - a.liters)[0];

    /* opkomst per speler */
    const spelers = new Map();
    const voeg = (sessies, soort) => sessies.forEach(s => s.spelers.forEach(p => {
      const x = spelers.get(p.naam) || { naam: p.naam, wA: 0, wT: 0, tA: 0, tT: 0, laat: 0 };
      x[soort + "T"]++; if (p.aanwezig) x[soort + "A"]++; if (p.telaat) x.laat++;
      spelers.set(p.naam, x);
    }));
    voeg(wed.sessies, "w"); voeg(tr.sessies, "t");
    S.opkomst = [...spelers.values()].map(x => ({ ...x, wP: x.wT ? x.wA / x.wT : 0, tP: x.tT ? x.tA / x.tT : 0, totP: (x.wA + x.tA) / Math.max(1, x.wT + x.tT) }))
      .sort((a, b) => b.totP - a.totP || b.wP - a.wP || a.naam.localeCompare(b.naam));
    S.ijzer = S.opkomst.filter(x => x.wT && x.wA === x.wT).map(x => x.naam);
    S.trainingsBeest = [...S.opkomst].sort((a, b) => b.tP - a.tP)[0];
    S.gemTraining = avg(tr.sessies.map(s => s.spelers.filter(p => p.aanwezig).length));
    S.drukste = [...tr.sessies].sort((a, b) => cnt(b) - cnt(a))[0];
    S.rustigste = [...tr.sessies].sort((a, b) => cnt(a) - cnt(b))[0];
    S.invallers = wed.invallers;

    /* opkomst bij winst vs verlies (spelers op de lijst bij de wedstrijd) */
    const bijWedstrijd = new Map(wed.sessies.map(s => [s.datum, isNaN(s.totaal) ? cnt(s) : s.totaal]));
    const opk = r => avg(per.filter(x => x.r === r && bijWedstrijd.has(x.m.datum)).map(x => bijWedstrijd.get(x.m.datum)));
    S.opkW = opk("W"); S.opkV = opk("V");
    S.wedOpkomst = per.map(x => ({ ...x, spelers: bijWedstrijd.get(x.m.datum) }));

    /* redenen (team) */
    const reden = new Map();
    [...wed.sessies, ...tr.sessies].forEach(s => s.spelers.forEach(p => { if (!p.aanwezig) { const c = categorie(p.reden); reden.set(c, (reden.get(c) || 0) + 1); } }));
    S.redenen = [...reden.entries()].sort((a, b) => b[1] - a[1]);
    S.aantalTrainingen = tr.sessies.length; S.aantalWedLijst = wed.sessies.length;
    return S;
  }
  const cnt = s => s.spelers.filter(p => p.aanwezig).length;
  const avg = l => l.length ? l.reduce((a, b) => a + b, 0) / l.length : NaN;
  const pct = x => `${Math.round(x * 100)}%`;
  const een = n => (isNaN(n) ? "–" : n.toFixed(1).replace(".", ","));

  /* ---------- Weergave ---------- */
  function render(S) {
    const gs = S.per.length;
    const kern = [
      ["Gespeeld", gs], ["W-G-V", `${S.w}-${S.g}-${S.v}`], ["Punten per wedstrijd", een(S.punten / Math.max(1, gs))],
      ["Doelpunten", `${S.dv}–${S.dt}`], ["Thuis", S.thuisRec], ["Uit", S.uitRec]
    ];
    const feit = (k, groot, tekst, stijl = "") => `<div class="fact ${stijl}"><div class="k">${k}</div><div class="big">${groot}</div><div class="t">${tekst}</div></div>`;
    const feiten = [];
    if (S.grootste) feiten.push(feit("Grootste overwinning", `${S.grootste.voor}-${S.grootste.tegen}`, `${S.grootste.thuis ? "thuis" : "uit"} tegen ${esc(S.grootste.tegenstander)}, ${fmtShort(S.grootste.m.datum)}`, "win"));
    if (S.zwaarste && S.zwaarste.r === "V") feiten.push(feit("Zwaarste nederlaag", `${S.zwaarste.voor}-${S.zwaarste.tegen}`, `tegen ${esc(S.zwaarste.tegenstander)}. Liever niet meer over hebben.`, "loss"));
    feiten.push(feit("Langste winstreeks", S.winreeks, S.huidigeWinreeks >= 2 ? `en de huidige reeks staat op ${S.huidigeWinreeks}. Niet stoppen nu!` : `wedstrijden op rij gewonnen`, "win"));
    feiten.push(feit("Thuis vs uit", `${S.thuisRec} / ${S.uitRec}`, `W-G-V thuis en uit`));
    if (S.cleansheets) feiten.push(feit("De nul gehouden", S.cleansheets, S.cleansheets === 1 ? "keer geen tegendoelpunt" : "keer geen tegendoelpunt"));
    if (S.goalsTotaal) feiten.push(feit("Strafcorners", pct(S.sc / S.goalsTotaal), `van de ingevulde doelpunten kwam uit een strafcorner${S.scKoning ? ` · specialist: ${esc(S.scKoning[0])} (${S.scKoning[1]})` : ""}`, "accent"));
    if (S.goalsTotaal) feiten.push(feit("Verschillende scorers", S.scorers, `Kamelen scoorden al minstens één keer`));
    if (S.dv) feiten.push(feit("Liter per doelpunt", een(S.liters / S.dv), `liter bier aan boetes per gescoord doelpunt`, "beer"));
    if (S.literKoning) feiten.push(feit("Literkoning", esc(S.literKoning.naam), `${fmtL(S.literKoning.liters)} L, waarvan nog ${fmtL(S.literKoning.open)} L open`, "beer"));
    if (S.snelBetaler) feiten.push(feit("Netjes betaald", esc(S.snelBetaler.naam), `${fmtL(S.snelBetaler.liters)} L aan boetes en alles al weggewerkt`, "beer"));
    if (S.ijzer.length) feiten.push(feit("IJzeren Kameel", S.ijzer.length === 1 ? esc(S.ijzer[0]) : S.ijzer.length, S.ijzer.length === 1 ? "miste geen enkele wedstrijd" : `spelers misten geen enkele wedstrijd: ${S.ijzer.map(esc).join(", ")}`, "accent"));
    if (S.trainingsBeest) feiten.push(feit("Trainingsbeest", esc(S.trainingsBeest.naam), `${pct(S.trainingsBeest.tP)} van de trainingen aanwezig`));
    if (!isNaN(S.gemTraining)) feiten.push(feit("Gemiddeld op training", een(S.gemTraining), `spelers per training${S.drukste ? ` · drukst: ${cnt(S.drukste)} (${fmtShort(S.drukste.datum)}), rustigst: ${cnt(S.rustigste)} (${fmtShort(S.rustigste.datum)})` : ""}`));
    if (!isNaN(S.opkW) && !isNaN(S.opkV)) feiten.push(feit("Opkomst doet ertoe", `${een(S.opkW)} vs ${een(S.opkV)}`, `spelers gemiddeld bij winst tegen bij verlies`));
    if (S.invallers.length) feiten.push(feit("Invallers", S.invallers.length, `keer een invaller nodig gehad · ${[...new Set(S.invallers.map(i => i.naam))].map(esc).join(", ")}`));

    const maxR = Math.max(1, ...S.redenen.map(([, n]) => n));
    const opkRij = x => `<tr><td>${esc(x.naam)}</td>
      <td class="r num">${x.wA}/${x.wT}</td><td class="bar-td"><span class="obar"><i style="width:${x.wP * 100}%"></i></span></td>
      <td class="r num">${x.tA}/${x.tT}</td><td class="bar-td"><span class="obar t"><i style="width:${x.tP * 100}%"></i></span></td>
      <td class="r num pts">${pct(x.totP)}</td></tr>`;
    const maxSp = Math.max(1, ...S.wedOpkomst.map(x => x.spelers || 0));

    box.innerHTML = `
      <div class="stat-strip">${kern.map(([k, v]) => `<div><div class="k">${k}</div><div class="v num">${v}</div></div>`).join("")}</div>

      <h2 class="stat-h">Opvallend</h2>
      <div class="facts">${feiten.join("")}</div>

      <section class="card">
        <div class="card-head"><div><h2>Opkomst per speler</h2><p>${S.aantalWedLijst} wedstrijden en ${S.aantalTrainingen} trainingen tot nu toe${UITSLUITEN.length ? ` · ${UITSLUITEN.map(u => u.namen.join(", ")).join("; ")} tellen in de eerste seizoenshelft niet mee` : ""}</p></div></div>
        <div class="tablewrap"><table class="opk"><thead><tr><th>Speler</th><th class="r">Wedstrijden</th><th></th><th class="r">Trainingen</th><th></th><th class="r">Totaal</th></tr></thead>
          <tbody>${S.opkomst.map(opkRij).join("")}</tbody></table></div>
      </section>

      <div class="stat-two">
        <section class="card">
          <div class="card-head"><div><h2>Opkomst per wedstrijd</h2><p>Spelers beschikbaar, met de uitslag</p></div></div>
          <div class="wbars">${S.wedOpkomst.map(x => `<div class="wbar"><span class="d">${fmtShort(x.m.datum)}</span><span class="track"><i style="width:${(x.spelers || 0) / maxSp * 100}%"></i><b>${x.spelers ?? "–"}</b></span><span class="f f-${x.r}">${x.r}</span></div>`).join("")}</div>
        </section>
        <section class="card">
          <div class="card-head"><div><h2>Waarom niet?</h2><p>Afmeldredenen van het hele team</p></div></div>
          <div class="wbars">${S.redenen.map(([c, n]) => `<div class="wbar reden"><span class="d">${esc(c)}</span><span class="track"><i style="width:${n / maxR * 100}%"></i><b>${n}</b></span></div>`).join("")}</div>
          <p class="note">Alleen per categorie voor het hele team, nooit per speler.</p>
        </section>
      </div>`;
  }

  window.renderStats = async function () {
    if (!CFG.wedstrijden || !CFG.trainingen) { box.innerHTML = `<div class="empty">Statistieken zijn nog niet ingesteld.</div>`; return; }
    box.innerHTML = `<div class="empty">Statistieken laden…</div>`;
    const lees = u => fetch(u, { cache: "no-store" }).then(r => r.ok ? r.text() : "").then(t => leesAfwezigheid(parseCsv(t))).catch(() => ({ sessies: [], invallers: [] }));
    const [wed, tr] = await Promise.all([lees(CFG.wedstrijden), lees(CFG.trainingen)]);
    render(bereken(wed, tr));
  };
})();
