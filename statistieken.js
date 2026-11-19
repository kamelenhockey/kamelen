/* =========================================================
   Statistieken: team, opkomst, doelpunten en liters
   - Afwezigheid komt live uit de spreadsheet (tabbladen "Afwezigheid Wedstrijden" en "Afwezigheid training").
   - Lege cel = aanwezig. Tekst of "x" = afwezig. "Te laat" (precies) = aanwezig, maar te laat.
   - Redenen worden alleen per categorie voor het hele team getoond, nooit per speler (de site is openbaar).
   Gebruikt uit index.html: DATA, esc, isUs, toDate, fmtShort, canon, ROSTER, resultFor, teamStats, buildRanking, fmtL, parseCsv
   ========================================================= */
(function () {
  const box = document.getElementById("statistieken-box");
  if (!box) return;
  const CFG = window.STATS_CONFIG || {};
  /* Spelers die (een deel van) het seizoen niet meetellen */
  const UITSLUITEN = CFG.uitsluiten || [];
  const telt = (naam, datum) => !UITSLUITEN.some(u => u.namen.includes(naam) && datum <= u.tot);

  const MAAND = { jan: 1, januari: 1, feb: 2, februari: 2, mrt: 3, maart: 3, apr: 4, april: 4, mei: 5, jun: 6, juni: 6, jul: 7, juli: 7, aug: 8, augustus: 8, sep: 9, sept: 9, september: 9, okt: 10, oktober: 10, nov: 11, november: 11, dec: 12, december: 12 };
  /* Seizoen loopt van juli t/m juni; startjaar volgt uit de huidige datum */
  const SEIZOEN = (() => { const d = new Date(); return d.getMonth() + 1 >= 7 ? d.getFullYear() : d.getFullYear() - 1; })();
  function kopDag(t) {
    const m = String(t || "").trim().toLowerCase().match(/^(\d{1,2})[\s-]+([a-z]+)/);
    if (!m || !MAAND[m[2]]) return null;
    return { maand: MAAND[m[2]], dag: +m[1] };
  }
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  function kopDatum(k, opDonderdag) {
    const d = new Date(k.maand >= 7 ? SEIZOEN : SEIZOEN + 1, k.maand - 1, k.dag, 12);
    /* Trainingen zijn altijd op donderdag: verschuif naar de donderdag van die week */
    if (opDonderdag) { const wd = d.getDay() || 7; d.setDate(d.getDate() + 4 - wd); }
    return iso(d);
  }
  const vandaag = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

  /* Afwezigheidsblad omzetten naar sessies */
  function leesAfwezigheid(rows, opDonderdag) {
    if (!rows.length) return { sessies: [], invallers: [] };
    const kop = rows[0];
    /* Kolommen in volgorde; springt de datum terug (bv. van 27 nov naar 3 sep), dan begint daar
       een nieuw seizoen. Alleen het laatste (huidige) seizoen telt. */
    let blok = [], vorige = -1;
    kop.forEach((h, i) => {
      const k = i > 0 && kopDag(h); if (!k) return;
      const sleutel = ((k.maand + 5) % 12) * 100 + k.dag;
      if (sleutel < vorige) blok = [];
      vorige = sleutel; blok.push({ i, datum: kopDatum(k, opDonderdag) });
    });
    const cols = blok;
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
    S.literLoser = [...lit].filter(x => x.open > 0).sort((a, b) => b.open - a.open || b.liters - a.liters)[0];
    S.snelBetaler = lit.filter(p => p.liters >= 2 && p.open === 0).sort((a, b) => b.liters - a.liters)[0];

    /* opkomst per speler */
    const spelers = new Map();
    const voeg = (sessies, soort) => sessies.forEach(s => s.spelers.forEach(p => {
      const x = spelers.get(p.naam) || { naam: p.naam, wA: 0, wT: 0, tA: 0, tT: 0, laat: 0 };
      x[soort + "T"]++; if (p.aanwezig) x[soort + "A"]++; if (p.telaat) x.laat++;
      spelers.set(p.naam, x);
    }));
    voeg(wed.sessies, "w"); voeg(tr.sessies, "t");
    /* Voor het spelersprofiel: alleen wie er was (nooit de redenen) */
    DATA.profielOpkomst = new Map([...spelers.values()].map(x => [x.naam, { ...x }]));
    DATA.trAanwezig = tr.sessies.map(se => ({ datum: se.datum, aanwezig: new Set(se.spelers.filter(p => p.aanwezig).map(p => p.naam)) }));
    DATA.wedAanwezig = wed.sessies.map(se => ({ datum: se.datum, aanwezig: new Set(se.spelers.filter(p => p.aanwezig).map(p => p.naam)) }));
    S.opkomst = [...spelers.values()].map(x => ({ ...x, wP: x.wT ? x.wA / x.wT : 0, tP: x.tT ? x.tA / x.tT : 0, totP: (x.wA + x.tA) / Math.max(1, x.wT + x.tT) }))
      .sort((a, b) => b.totP - a.totP || b.wP - a.wP || a.naam.localeCompare(b.naam));
    S.ijzer = S.opkomst.filter(x => x.wT && x.wA === x.wT).map(x => x.naam);
    const maxT = Math.max(...S.opkomst.map(o => o.tP));
    S.trainingsBeesten = S.opkomst.length ? S.opkomst.filter(o => o.tP === maxT) : [];
    S.gemTraining = avg(tr.sessies.map(s => s.spelers.filter(p => p.aanwezig).length));
    S.drukste = [...tr.sessies].sort((a, b) => cnt(b) - cnt(a))[0];
    S.rustigste = [...tr.sessies].sort((a, b) => cnt(a) - cnt(b))[0];
    S.invallers = wed.invallers;

    /* --- extra weetjes --- */
    const stand = DATA.stand || [];
    const aftrek = (DATA.puntenAftrek || {})[team] || 0;
    if (us && aftrek){
      const sorteer = l => [...l].sort((a, b) => b.pt - a.pt || a.gs - b.gs || b.ds - a.ds || b.dv - a.dv);
      const l = stand.map(t => ({ team: t.team, pt: +t.punten + (t.team === team ? aftrek : 0), gs: +t.gespeeld || 0, ds: +t.doelsaldo || 0, dv: 0 }));
      S.zonderAftrek = { plek: sorteer(l).findIndex(t => t.team === team) + 1, pt: +us.punten + aftrek, aftrek };
    }
    const kop = stand[0];
    if (us && kop && kop.team !== team) S.achterstand = { op: kop.team, pt: kop.punten - us.punten, gs: (+us.gespeeld || 0) - (+kop.gespeeld || 0) };
    const spannend = per.filter(x => Math.abs(x.voor - x.tegen) <= 1);
    S.spannend = { n: spannend.length, rec: rec(spannend) };
    const uitslagTel = new Map(); per.forEach(x => { const k = `${x.voor}-${x.tegen}`; uitslagTel.set(k, (uitslagTel.get(k) || 0) + 1); });
    S.vaaksteUitslag = [...uitslagTel.entries()].sort((a, b) => b[1] - a[1])[0];
    const boeteTel = new Map();
    (DATA.liters || []).forEach(r => { const k = String(r.reden || "").trim(); if (!k || /ezel van de dag/i.test(k)) return; const n = k.toLowerCase(); const b = boeteTel.get(n) || { tekst: k, n: 0 }; b.n++; boeteTel.set(n, b); });
    S.populairsteBoete = [...boeteTel.values()].sort((a, b) => b.n - a.n)[0];
    S.laatkomer = [...spelers.values()].filter(x => x.laat).sort((a, b) => b.laat - a.laat)[0];
    const trCnt = tr.sessies.map(cnt);
    if (trCnt.length >= 6) S.trainingsTrend = { begin: avg(trCnt.slice(0, 3)), nu: avg(trCnt.slice(-3)) };

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
    const loser = S.literLoser;
    if (loser) feiten.push(feit("Literloser", esc(loser.naam), `${fmtL(loser.open)} L nog open (${fmtL(loser.liters)} L in totaal)`, "beer"));
    if (S.snelBetaler) feiten.push(feit("Netjes betaald", esc(S.snelBetaler.naam), `${fmtL(S.snelBetaler.liters)} L aan boetes en alles al weggewerkt`, "beer"));
    if (S.ijzer.length) feiten.push(feit("IJzeren Kameel", S.ijzer.length === 1 ? esc(S.ijzer[0]) : S.ijzer.length, S.ijzer.length === 1 ? "miste geen enkele wedstrijd" : `spelers misten geen enkele wedstrijd: ${S.ijzer.map(esc).join(", ")}`, "accent"));
    if (S.trainingsBeesten.length) feiten.push(feit(S.trainingsBeesten.length > 1 ? "Trainingsbeesten" : "Trainingsbeest", S.trainingsBeesten.map(o => esc(o.naam)).join(" & "), `${pct(S.trainingsBeesten[0].tP)} van de trainingen aanwezig${S.trainingsBeesten.length > 1 ? ", allebei even vaak" : ""}`));
    if (!isNaN(S.gemTraining)) feiten.push(feit("Gemiddeld op training", een(S.gemTraining), `spelers per training${S.drukste ? ` · drukst: ${cnt(S.drukste)} (${fmtShort(S.drukste.datum)}), rustigst: ${cnt(S.rustigste)} (${fmtShort(S.rustigste.datum)})` : ""}`));
    if (!isNaN(S.opkW) && !isNaN(S.opkV)) feiten.push(feit("Opkomst doet ertoe", `${een(S.opkW)} vs ${een(S.opkV)}`, `spelers gemiddeld bij winst tegen bij verlies`));
    if (S.zonderAftrek) feiten.push(feit("Zonder puntenaftrek", `${S.zonderAftrek.plek}e`, `met ${S.zonderAftrek.pt} punten. Die ${S.zonderAftrek.aftrek} punten aftrek doen pijn.`, "loss"));
    if (S.achterstand) feiten.push(feit("Achterstand op de koploper", `${S.achterstand.pt} pt`, `op ${esc(S.achterstand.op)}${S.achterstand.gs > 0 ? `, die nog ${S.achterstand.gs} ${S.achterstand.gs === 1 ? "wedstrijd" : "wedstrijden"} meer moet spelen` : S.achterstand.gs < 0 ? `, die ${-S.achterstand.gs} ${S.achterstand.gs === -1 ? "wedstrijd" : "wedstrijden"} minder heeft gespeeld` : ""}`));
    if (S.spannend.n) feiten.push(feit("Nagelbijters", S.spannend.rec, `W-G-V in ${S.spannend.n} ${S.spannend.n === 1 ? "wedstrijd" : "wedstrijden"} met hooguit één doelpunt verschil`));
    if (S.vaaksteUitslag && S.vaaksteUitslag[1] > 1) feiten.push(feit("Vaakste uitslag", S.vaaksteUitslag[0], `${S.vaaksteUitslag[1]} keer, gezien vanuit de Kamelen`));
    if (S.per.length) feiten.push(feit("Per wedstrijd", `${een(S.dv / S.per.length)} – ${een(S.dt / S.per.length)}`, `doelpunten voor en tegen gemiddeld`));
    if (S.populairsteBoete && S.populairsteBoete.n > 1) feiten.push(feit("Populairste boete", esc(S.populairsteBoete.tekst), `al ${S.populairsteBoete.n} keer uitgedeeld`, "beer"));
    if (S.liters) feiten.push(feit("Kratten-teller", een(S.liters / 7.2), `kratten bier (24 × 0,3 L) aan boetes dit seizoen · ${fmtL(S.liters)} L in totaal`, "beer"));
    if (S.laatkomer) feiten.push(feit("Laatkomer", esc(S.laatkomer.naam), `${S.laatkomer.laat} keer te laat. Wekker zetten?`));
    if (S.trainingsTrend) {
      const b = S.trainingsTrend.begin, n = S.trainingsTrend.nu, verschil = Math.round((n - b) * 10) / 10;
      const uitleg = verschil > 0 ? `Bij de laatste 3 trainingen kwamen er gemiddeld ${een(n)} spelers, bij de eerste 3 nog ${een(b)}. Het wordt drukker!`
        : verschil < 0 ? `Bij de laatste 3 trainingen kwamen er gemiddeld ${een(n)} spelers, bij de eerste 3 nog ${een(b)}. Kom op, Kamelen!`
        : `Bij de eerste 3 en de laatste 3 trainingen kwamen er allebei gemiddeld ${een(n)} spelers. Stabiel!`;
      feiten.push(feit("Trainingsopkomst", `${een(b)} → ${een(n)}`, uitleg));
    }
    if (S.invallers.length) feiten.push(feit("Invallers", S.invallers.length, `keer een invaller nodig gehad · ${[...new Set(S.invallers.map(i => i.naam))].map(esc).join(", ")}`));

    const maxR = Math.max(1, ...S.redenen.map(([, n]) => n));
    const opkRij = x => `<tr><td>${esc(x.naam)}</td>
      <td class="r num">${x.wA}/${x.wT}</td><td class="bar-td"><span class="obar"><i style="width:${x.wP * 100}%"></i></span></td>
      <td class="r num">${x.tA}/${x.tT}</td><td class="bar-td"><span class="obar t"><i style="width:${x.tP * 100}%"></i></span></td>
      <td class="r num pts">${pct(x.totP)}</td></tr>`;
    const maxSp = Math.max(1, ...S.wedOpkomst.map(x => x.spelers || 0));

    box.innerHTML = `
      <div class="stat-strip">${kern.map(([k, v]) => `<div><div class="k">${k}</div><div class="v num">${v}</div></div>`).join("")}</div>

      <div id="stats-persoonlijk"></div>

      <h2 class="stat-h">Opvallend</h2>
      <div class="facts">${feiten.join("")}</div>

      <div id="stats-extra"></div>

      <section class="card">
        <div class="card-head"><div><h2>Opkomst per speler</h2><p>${S.aantalWedLijst} wedstrijden en ${S.aantalTrainingen} trainingen tot nu toe${UITSLUITEN.length ? ` · ${UITSLUITEN.map(u => u.namen.join(", ")).join("; ")} tellen in de eerste seizoenshelft niet mee` : ""}</p></div></div>
        <div class="tablewrap"><table class="opk"><thead><tr><th>Speler</th><th class="r"><span class="lang">Wedstrijden</span><span class="kort">Wedstr.</span></th><th class="bar-td"></th><th class="r"><span class="lang">Trainingen</span><span class="kort">Training</span></th><th class="bar-td"></th><th class="r">Totaal</th></tr></thead>
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

  /* Wie speelde welke wedstrijd mee (spelers met een leeg vakje + invallers). Gebruikt door het stemmen.
     Geeft een Map: datum -> Set met namen. Zonder exclusies, want het gaat om wie er echt was. */
  let _aanwezig = null;
  window.kamelenAanwezig = function (vers) {
    if (_aanwezig && !vers) return _aanwezig;
    _aanwezig = fetch(CFG.wedstrijden, { cache: "no-store" }).then(r => r.ok ? r.text() : "").then(t => {
      const rows = parseCsv(t), kaart = new Map(); if (!rows.length) return kaart;
      let blok = [], vorige = -1;
      rows[0].forEach((h, i) => {
        const k = i > 0 && kopDag(h); if (!k) return;
        const sl = ((k.maand + 5) % 12) * 100 + k.dag;
        if (sl < vorige) blok = [];
        vorige = sl; blok.push({ i, datum: kopDatum(k, false) });
      });
      blok.forEach(c => kaart.set(c.datum, new Set()));
      let inSpelers = true, gezien = false;
      for (const r of rows.slice(1)) {
        const naam = (r[0] || "").trim();
        if (!naam) { if (gezien) inSpelers = false; continue; }
        if (/totaal aanwezig/i.test(naam)) continue;
        if (/invaller/i.test(naam)) { blok.forEach(c => { const v = (r[c.i] || "").trim(); if (v) kaart.get(c.datum).add(v); }); continue; }
        if (!inSpelers) continue;
        gezien = true;
        blok.forEach(c => { const v = (r[c.i] || "").trim(); if (!v || /^te laat$/i.test(v)) kaart.get(c.datum).add(canon(naam)); });
      }
      return kaart;
    }).catch(() => new Map());
    return _aanwezig;
  };

  /* ---------- Kameel & ezel, Kamelen-Scorito en jouw eigen seizoen ---------- */
  window.renderStatsExtra = function () {
    const pers = document.getElementById("stats-persoonlijk"), extra = document.getElementById("stats-extra");
    if (!pers || !extra) return;
    const feit = (k, groot, tekst, stijl = "") => `<div class="fact ${stijl}"><div class="k">${k}</div><div class="big">${groot}</div><div class="t">${tekst}</div></div>`;
    const een = x => (Math.round(x * 10) / 10).toString().replace(".", ",");
    const tegen = m => isUs(m.thuis) ? m.uit : m.thuis;
    const ik = (window.IK || {}).naam;

    /* Kameel & ezel */
    const kz = DATA.kzUitslagen || [], kf = [];
    if (kz.length) {
      const titels = new Map(), tel = (n, k) => { const p = titels.get(n) || { k: 0, e: 0 }; p[k]++; titels.set(n, p); };
      kz.forEach(r => { r.kamelen.forEach(n => tel(n, "k")); r.ezels.forEach(n => tel(n, "e")); });
      const rij = [...titels.entries()];
      const maxK = Math.max(0, ...rij.map(([, p]) => p.k)), maxE = Math.max(0, ...rij.map(([, p]) => p.e));
      if (maxK) kf.push(feit("Meeste kameel-titels", rij.filter(([, p]) => p.k === maxK).map(([n]) => esc(n)).join(" & "), `${maxK}× kameel van de dag. Op weg naar de prijs!`));
      if (maxE) kf.push(feit("Meeste ezel-titels", rij.filter(([, p]) => p.e === maxE).map(([n]) => esc(n)).join(" & "), `${maxE}× ezel van de dag, dus ook ${maxE} ${maxE === 1 ? "liter" : "liter"} getrokken`, "beer"));
      let top = null;
      kz.forEach(r => [...(r.k || new Map())].forEach(([n, c]) => { if (!top || c > top.c) top = { n, c, m: r.m, tot: r.stemmers.length }; }));
      if (top) kf.push(feit("Grootste kameel-zege", esc(top.n), `${top.c} van de ${top.tot} stemmen tegen ${esc(tegen(top.m))}`));
      const beide = rij.filter(([, p]) => p.k && p.e).map(([n]) => esc(n));
      if (beide.length) kf.push(feit("Van held tot ezel", beide.join(", "), "zowel kameel als ezel van de dag geweest"));
      const opk = kz.reduce((s, r) => s + r.stemmers.length, 0) / kz.length;
      kf.push(feit("Stemmers per wedstrijd", een(opk), `gemiddeld, over ${kz.length} ${kz.length === 1 ? "stemming" : "stemmingen"}`));
    }

    /* Kamelen-Scorito */
    const tp = DATA.totoProfiel, sf = [];
    if (tp && tp.stand.length) {
      const st = tp.stand, top = st[0];
      sf.push(feit("Scorito-koning", esc(top.naam), `${top.punten} punten, ${top.exact}× precies goed`));
      const alle = [...tp.perSpeler.entries()].flatMap(([n, l]) => l.map(x => ({ n, ...x })));
      if (alle.length) {
        const exact = alle.filter(x => x.pts === 3).length;
        sf.push(feit("Precies goed", exact, `van de ${alle.length} voorspellingen (${Math.round(exact / alle.length * 100)}%)`));
        const perN = [...tp.perSpeler.entries()].filter(([, l]) => l.length).map(([n, l]) => ({ n, saldo: l.reduce((s, x) => s + (x.v - x.t), 0) / l.length, echt: l.reduce((s, x) => s + (x.echt[0] - x.echt[1]), 0) / l.length }));
        if (perN.length > 1) {
          const opt = [...perN].sort((a, b) => b.saldo - a.saldo)[0], pes = [...perN].sort((a, b) => a.saldo - b.saldo)[0];
          sf.push(feit("Grootste optimist", esc(opt.n), `voorspelt gemiddeld ${opt.saldo >= 0 ? "+" : ""}${een(opt.saldo)} doelsaldo voor de Kamelen`));
          if (pes.n !== opt.n) sf.push(feit("Grootste pessimist", esc(pes.n), `voorspelt gemiddeld ${pes.saldo >= 0 ? "+" : ""}${een(pes.saldo)} doelsaldo`));
        }
        const gemV = alle.reduce((s, x) => s + x.v, 0) / alle.length, gemT = alle.reduce((s, x) => s + x.t, 0) / alle.length;
        const echtV = alle.reduce((s, x) => s + x.echt[0], 0) / alle.length, echtT = alle.reduce((s, x) => s + x.echt[1], 0) / alle.length;
        sf.push(feit("Team voorspelt", `${een(gemV)}–${een(gemT)}`, `gemiddeld, terwijl het echt ${een(echtV)}–${een(echtT)} werd`));
      }
      const trouw = [...st].sort((a, b) => b.aantal - a.aantal)[0];
      if (trouw && trouw.aantal > 1) sf.push(feit("Trouwste voorspeller", esc(trouw.naam), `${trouw.aantal} wedstrijden voorspeld`));
    }

    /* Badges van het hele team */
    let bHtml = `<div class="card empty">Badges laden…</div>`;
    try {
      const spelers = playerData().filter(p => !p.invaller);
      const per = spelers.map(p => { const l = badgeLijst(p); return { naam: p.naam, l, t: badgeTelling(l) }; });
      const rang = [...per].sort((a, b) => b.t.punten - a.t.punten || b.t.goud - a.t.goud || b.t.aantal - a.t.aantal || a.naam.localeCompare(b.naam));
      const telBadge = new Map();
      per.forEach(x => x.l.filter(b => b.ok).forEach(b => telBadge.set(b.naam, { b, n: (telBadge.get(b.naam)?.n || 0) + 1 })));
      const verdiend = [...telBadge.values()];
      const totaal = per.reduce((s, x) => s + x.t.aantal, 0), goud = per.reduce((s, x) => s + x.t.goud, 0);
      const bf = [];
      if (verdiend.length) {
        const zeld = Math.min(...verdiend.map(v => v.n)), zeldzaam = verdiend.filter(v => v.n === zeld).sort((a, b) => ({ goud: 0, zilver: 1, brons: 2 })[a.b.tier] - ({ goud: 0, zilver: 1, brons: 2 })[b.b.tier])[0];
        const wie = per.filter(x => x.l.some(b => b.ok && b.naam === zeldzaam.b.naam)).map(x => esc(x.naam));
        const vaak = [...verdiend].sort((a, b) => b.n - a.n)[0];
        bf.push(feit("Badges verdiend", totaal, `door het hele team, waarvan ${goud} goud`));
        bf.push(feit("Zeldzaamste badge", `${zeldzaam.b.ic} ${esc(zeldzaam.b.naam)}`, `alleen ${wie.join(" & ")}`));
        bf.push(feit("Meest verdiend", `${vaak.b.ic} ${esc(vaak.b.naam)}`, `${vaak.n} van de ${per.length} Kamelen hebben hem`));
      }
      const lijstHtml = rang.filter(x => x.t.aantal).map((x, i) => `<tr${x.naam === ik ? ' class="ik"' : ""}><td class="r pos">${i + 1}</td><td>${esc(x.naam)}</td><td class="r">${x.t.goud}</td><td class="r">${x.t.zilver}</td><td class="r">${x.t.brons}</td><td class="r pts">${x.t.punten}</td></tr>`).join("");
      bHtml = `${bf.length ? `<div class="facts">${bf.join("")}</div>` : ""}
        <section class="card"><div class="card-head"><div><h2>Badge-ranglijst</h2><p>Goud telt 3 punten, zilver 2 en brons 1</p></div></div>
        ${lijstHtml ? `<div class="tablewrap"><table><thead><tr><th class="r">#</th><th>Kameel</th><th class="r" title="Goud">🥇</th><th class="r" title="Zilver">🥈</th><th class="r" title="Brons">🥉</th><th class="r">Punten</th></tr></thead><tbody>${lijstHtml}</tbody></table></div>` : `<div class="empty">Nog geen badges verdiend.</div>`}</section>`;
    } catch (e) { console.error(e); }

    /* ---------- Hall of Fame: eeuwige ranglijst over alle seizoenen ---------- */
    const hof = window.KAMELEN_HOF;
    if (hof === undefined) {
      window.KAMELEN_HOF = null;
      fetch("halloffame.json", { cache: "no-store" }).then(r => r.ok ? r.json() : {}).catch(() => ({}))
        .then(j => { window.KAMELEN_HOF = j || {}; window.renderStatsExtra?.(); });
    }
    const nu = new Date(), jaar = nu.getMonth() >= 7 ? nu.getFullYear() : nu.getFullYear() - 1;
    const ditSeizoen = `${jaar}/${String(jaar + 1).slice(2)}`;
    const huidig = { seizoen: ditSeizoen, doelpunten: {}, liters: {}, kamelen: {}, ezels: {} };
    (DATA.doelpunten || []).forEach(w => w.goals.forEach(g => { huidig.doelpunten[g.wie] = (huidig.doelpunten[g.wie] || 0) + 1; }));
    buildRanking(DATA.liters || [], {}).forEach(p => { if (p.liters) huidig.liters[p.naam] = p.liters; });
    kz.forEach(r => { r.kamelen.forEach(n => huidig.kamelen[n] = (huidig.kamelen[n] || 0) + 1); r.ezels.forEach(n => huidig.ezels[n] = (huidig.ezels[n] || 0) + 1); });
    const archief = ((hof && hof.seizoenen) || []).filter(x => x.seizoen !== ditSeizoen);
    const seizoenen = [...archief, huidig];
    const optel = soort => {
      const t = new Map();
      seizoenen.forEach(sz => Object.entries(sz[soort] || {}).forEach(([n, v]) => {
        const naam = typeof canon === "function" ? canon(n) : n, x = t.get(naam) || { naam, tot: 0, sz: 0 };
        x.tot += Number(v) || 0; x.sz++; t.set(naam, x);
      }));
      return [...t.values()].filter(x => x.tot > 0).sort((a, b) => b.tot - a.tot || a.naam.localeCompare(b.naam));
    };
    const kampioen = (sz, soort) => { const e = Object.entries(sz[soort] || {}).filter(([, v]) => v > 0); if (!e.length) return "–"; const m = Math.max(...e.map(([, v]) => v)); return e.filter(([, v]) => v === m).map(([n]) => esc(n)).join(" & ") + ` <small>(${String(m).replace(".", ",")})</small>`; };
    const hofLijst = (titel, ic, l, eenheid) => `<section class="card hof-kaart"><h3>${ic} ${titel}</h3>${l.length ? `<ol class="hof-lijst">${l.slice(0, 5).map((x, i) => `<li class="${i === 0 ? "hof-een" : ""}${x.naam === ik ? " ik" : ""}"><span class="hof-plek">${["🥇", "🥈", "🥉"][i] || `${i + 1}.`}</span><span class="hof-nm">${esc(x.naam)}</span><b>${String(Math.round(x.tot * 100) / 100).replace(".", ",")}</b><small>${eenheid}</small></li>`).join("")}</ol>` : `<p class="muted">Nog leeg.</p>`}</section>`;
    const hofHtml = `
      <h2 class="stat-h">Hall of Fame</h2>
      <p class="hof-intro">De eeuwige ranglijst van de Kamelen, over ${seizoenen.length === 1 ? "het eerste vastgelegde seizoen" : `${seizoenen.length} seizoenen`} (${seizoenen.map(x => x.seizoen).join(", ")}). Elk nieuw seizoen telt erbij op.</p>
      <div class="hof-grid">
        ${hofLijst("All-time topscorers", "⚽", optel("doelpunten"), "goals")}
        ${hofLijst("Meeste liters in de boetepot", "🍺", optel("liters"), "L")}
        ${hofLijst("Meeste ezel-titels", "🫏", optel("ezels"), "×")}
        ${hofLijst("Meeste kameel-titels", "🐪", optel("kamelen"), "×")}
      </div>
      ${seizoenen.length > 1 ? `<section class="card"><div class="card-head"><div><h2>Kampioenen per seizoen</h2></div></div><div class="tablewrap"><table><thead><tr><th>Seizoen</th><th>Topscorer</th><th>Literloser</th><th>Ezel van het seizoen</th></tr></thead><tbody>${[...seizoenen].reverse().map(sz => `<tr><td>${esc(sz.seizoen)}${sz === huidig ? " <small>(loopt)</small>" : ""}</td><td>${kampioen(sz, "doelpunten")}</td><td>${kampioen(sz, "liters")}</td><td>${kampioen(sz, "ezels")}</td></tr>`).join("")}</tbody></table></div></section>` : ""}`;

    extra.innerHTML = `
      <h2 class="stat-h">Badges</h2>
      ${bHtml}
      <h2 class="stat-h">Kameel &amp; ezel van de dag</h2>
      ${kf.length ? `<div class="facts">${kf.join("")}</div>` : `<div class="card empty">Zodra de eerste stemming gesloten is, staan hier de kameel- en ezelstatistieken.</div>`}
      <h2 class="stat-h">Kamelen-Scorito</h2>
      ${sf.length ? `<div class="facts">${sf.join("")}</div>` : `<div class="card empty">Na de eerste wedstrijd met voorspellingen verschijnen hier de Scorito-statistieken.</div>`}
      ${hofHtml}`;

    /* Jouw seizoen */
    if (!ik) { pers.innerHTML = ""; return; }
    const o = (DATA.profielOpkomst || new Map()).get(ik);
    const goals = (DATA.doelpunten || []).reduce((s, w) => s + w.goals.filter(g => g.wie === ik).length, 0);
    const lit = buildRanking(DATA.liters || [], {}), mijnL = lit.find(p => p.naam === ik), litPlek = lit.findIndex(p => p.naam === ik) + 1;
    const kTit = kz.filter(r => r.kamelen.includes(ik)).length, eTit = kz.filter(r => r.ezels.includes(ik)).length;
    const tst = tp ? tp.stand.findIndex(x => x.naam === ik) + 1 : 0, tme = tp ? tp.stand[tst - 1] : null;
    const tegels = [];
    if (o && o.wT) tegels.push(["Wedstrijden", `${o.wA}/${o.wT}`, `${Math.round(o.wA / o.wT * 100)}% aanwezig`]);
    if (o && o.tT) tegels.push(["Trainingen", `${o.tA}/${o.tT}`, `${Math.round(o.tA / o.tT * 100)}% aanwezig`]);
    tegels.push(["Doelpunten", goals, goals ? "dit seizoen" : "die eerste komt nog"]);
    tegels.push(["Liters", mijnL ? fmtL(mijnL.liters) : "0", mijnL ? (mijnL.open ? `${fmtL(mijnL.open)} L nog open · ${litPlek}e` : "alles weggewerkt") : "nog geen boetes"]);
    if (kz.length) tegels.push(["Kameel / ezel", `${kTit} / ${eTit}`, "titels van de dag"]);
    if (tme) tegels.push(["Scorito", `${tst}e`, `${tme.punten} punten, ${tme.exact}× precies goed`]);
    pers.innerHTML = `<section class="card mijn-seizoen"><div class="card-head"><div><h2>Jouw seizoen, ${esc(ik)}</h2><p>Je eigen cijfers van dit seizoen</p></div></div>
      <div class="mijn-grid">${tegels.map(([k, v, s]) => `<div><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`).join("")}</div>
      ${window.wrappedBeschikbaar?.() ? `<button type="button" class="btn wr-start" data-wrapped>🎁 Bekijk je Kamelen Wrapped</button>` : ""}</section>`;
  };

  window.renderStatistieken = async function () {
    if (!CFG.wedstrijden || !CFG.trainingen) { box.innerHTML = `<div class="empty">Statistieken zijn nog niet ingesteld.</div>`; return; }
    box.innerHTML = `<div class="empty">Statistieken laden…</div>`;
    const lees = (u, don) => fetch(u, { cache: "no-store" }).then(r => r.ok ? r.text() : "").then(t => leesAfwezigheid(parseCsv(t), don)).catch(() => ({ sessies: [], invallers: [] }));
    const [wed, tr] = await Promise.all([lees(CFG.wedstrijden, false), lees(CFG.trainingen, true)]);
    /* Alleen speeldagen waarop de Kamelen echt speelden (geen vrije speelronde) */
    const speeldagen = new Set([...(DATA.uitslagen || []), ...(DATA.programma || [])].filter(m => isUs(m.thuis + m.uit)).map(m => m.datum));
    wed.sessies = wed.sessies.filter(x => speeldagen.has(x.datum));
    wed.invallers = wed.invallers.filter(x => speeldagen.has(x.datum));
    DATA.invalSheet = wed.invallers; window.renderPlayers?.();
    try { render(bereken(wed, tr)); window.renderStatsExtra(); }
    catch (e) { console.error(e); box.innerHTML = `<div class="empty">De statistieken konden niet worden geladen. Ververs de pagina.</div>`; }
  };
})();
