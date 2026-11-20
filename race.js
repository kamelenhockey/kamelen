/* =========================================================
   Kamelen-racen: een kamelenrace om op te wedden, met slokken als inzet.
   - Kies welke kamelen meedoen (vernoemd naar spelers) en wie er gokt.
   - Iedereen zet zoveel slokken in als hij wil op één kameel (geen maximum).
   - De race: willekeurige gebeurtenissen bepalen wie wint.
   - Gewonnen: je mag je inzet × het aantal kamelen uitdelen (de odds).
     Verloren: je drinkt je inzet zelf.
   Alles staat alleen op dit apparaat (een telefoon gaat rond).
   ========================================================= */
(function () {
  const box = document.getElementById("race"); if (!box) return;
  const LS = "kamelen-race", BAAN = 100;
  const laad = () => { try { return JSON.parse(localStorage.getItem(LS)) || null; } catch { return null; } };
  let S = laad() || {};
  S = { kamelen: [], gokkers: [], inzet: {}, fase: "setup", uitslag: null, races: 0, tel: {}, ...S };
  S.tel = S.tel || {};   // per gokker: { gedronken, uitgedeeld } deze avond
  const bewaar = () => { try { localStorage.setItem(LS, JSON.stringify(S)); } catch {} };
  const namen = () => typeof ROSTER !== "undefined" ? [...ROSTER] : [];
  const r = n => Math.floor(Math.random() * n);

  const GEBEURTENISSEN = [
    [n => `${n} struikelt over een hockeybal en verliest 2 meter!`, -2],
    [n => `De coach roept en ${n} krijgt een snelheidsboost!`, 4],
    [n => `${n} stopt even voor een biertje.`, -3],
    [n => `${n} krijgt een groene kaart en staat twee minuten stil.`, -4],
    [n => `${n} heeft de wind mee!`, 3],
    [n => `${n} moet terug voor zijn bitje.`, -2],
    [n => `Strafcorner! ${n} schiet naar voren.`, 5],
    [n => `${n} wordt aangemoedigd door de derde helft.`, 2],
    [n => `${n} is een beetje brak van gisteravond.`, -2],
    [n => `${n} ruikt de bar en versnelt.`, 3],
    [n => `${n} raakt verstrikt in het doelnet.`, -3],
    [n => `${n} krijgt een stille meter opgelegd en loopt wankel.`, -4],
    [n => `${n} spot een pitcher bij de finish!`, 4],
    [n => `${n} maakt een sliding door het zand.`, 2],
    /* Boosts */
    [n => `${n} hoort dat de eerste ronde op de aanvoerder is en sprint weg!`, 5],
    [n => `${n} krijgt een slok Red Bull van de verzorger.`, 4],
    [n => `${n} denkt dat de kantine sluit en zet een tandje bij.`, 4],
    [n => `${n} wordt achterna gezeten door de scheidsrechter en rent voor zijn leven.`, 5],
    [n => `${n} krijgt een fluitje: geen kaart, gewoon doorlopen!`, 2],
    [n => `${n} ziet zijn ex op de tribune en wil indruk maken.`, 4],
    [n => `${n} heeft net een nieuwe stick gekocht en voelt zich onoverwinnelijk.`, 3],
    [n => `${n} wordt aangemoedigd door de dames 1. Turbo!`, 5],
    [n => `${n} ruikt frikandellen bij de finish.`, 3],
    [n => `Een windvlaag duwt ${n} vooruit.`, 2],
    [n => `${n} wordt per ongeluk ingeschakeld als invaller en moet opschieten.`, 3],
    [n => `${n} droomt al van de kameel van de dag.`, 3],
    [n => `${n} heeft gisteren een trainingsbeest-badge gehaald en voelt zich fit.`, 3],
    [n => `Mex! ${n} gooit 21 en rent euforisch verder.`, 4],
    /* Hinders */
    [n => `${n} moet nog een stille meter wegwerken en staat even stil.`, -5],
    [n => `${n} krijgt een gele kaart en moet vijf minuten op de bank.`, -5],
    [n => `${n} is zijn teampas kwijt en moet terug naar de kleedkamer.`, -4],
    [n => `${n} stopt om een selfie te maken voor de fotomuur.`, -3],
    [n => `${n} wordt ezel van de dag en moet eerst een liter trekken.`, -4],
    [n => `${n} krijgt een bal tegen zijn enkel en hinkt verder.`, -3],
    [n => `${n} raakt verdwaald op het Semiveld.`, -3],
    [n => `${n} blijft hangen bij de kantine voor een kroketje.`, -3],
    [n => `${n} krijgt een appje van de Kamelen-Scorito: "Nog niet voorspeld?" en kijkt op zijn telefoon.`, -2],
    [n => `${n} vergeet te stretchen en krijgt kramp in zijn bult.`, -3],
    [n => `${n} gooit "huis" bij het mexen en moet al het bier op tafel opdrinken.`, -6],
    [n => `${n} blijft staan om met de coach te discussiëren over de opstelling.`, -3],
    [n => `${n} ziet zijn eigen bult in een plas en raakt afgeleid.`, -2],
    [n => `${n} rent de verkeerde kant op. Classic.`, -4],
    [n => `${n} wordt aangesproken door het Liter-incassobureau.`, -4],
  ];

  /* Alleen in de eindsprint (laatste kwart): extra grote boosts en hinders */
  const EINDSPRINT = [
    [n => `${n} krijgt een kameel-turbo en vliegt naar de finish!`, 9],
    [n => `${n} ziet een gratis pitcher achter de finish staan. VOLLE GAS!`, 8],
    [n => `De hele tribune scandeert "${n}! ${n}!" en hij gaat los!`, 7],
    [n => `${n} glijdt op een bananenschil en ligt languit in het zand!`, -8],
    [n => `${n} valt in een kuil die de keeper heeft gegraven!`, -9],
    [n => `${n} krijgt een rode kaart en moet even terug naar af… bijna.`, -7],
    [n => `${n} bedenkt zich dat hij nog een liter open heeft en remt af.`, -6],
  ];
  /* Kies een gebeurtenis. Hoe dichter bij de finish (voortgang 0..1), hoe vaker een grote. */
  function kiesGebeurtenis(voortgang) {
    const pool = voortgang > .75 ? GEBEURTENISSEN.concat(EINDSPRINT) : GEBEURTENISSEN;
    const macht = voortgang * 3;   // 0 = alles even vaak, 3 = grote gebeurtenissen veel vaker
    const gewichten = pool.map(([, d]) => Math.pow(Math.abs(d), macht));
    let x = Math.random() * gewichten.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { x -= gewichten[i]; if (x <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }

  function render() {
    if (S.fase === "setup") return renderSetup();
    if (S.fase === "inzet" || S.fase === "uitslag") return renderInzet();   // na een race: terug naar de inzetten
    renderBaan();
  }

  /* ---------- 1. Wie doet er mee ---------- */
  function renderSetup() {
    const chips = (lijst, veld) => namen().map(n => `<button type="button" class="kz-chip ${lijst.includes(n) ? "on" : ""}" data-kies="${veld}" data-n="${esc(n)}">${esc(n)}</button>`).join("");
    box.innerHTML = `
      <div class="rc-stap"><h3>1. Welke kamelen racen er?</h3><p class="muted">Kies 3 tot 8 kamelen. Ze zijn vernoemd naar spelers.</p>
        <div class="kz-grid">${chips(S.kamelen, "kamelen")}</div></div>
      <div class="rc-stap"><h3>2. Wie gokt er mee?</h3><p class="muted">Je zet slokken in, zoveel als je durft.</p>
        <div class="kz-grid">${chips(S.gokkers, "gokkers")}</div></div>
      <div class="rc-knoppen"><button type="button" class="btn" data-rc="naar-inzet" ${S.kamelen.length >= 3 && S.gokkers.length >= 1 ? "" : "disabled"}>Naar de inzetten</button>
        <span class="muted">${S.kamelen.length} kamelen, ${S.gokkers.length} gokkers</span></div>
      ${scorebord()}`;
  }

  /* ---------- 2. Inzetten ---------- */
  function renderInzet() {
    const n = S.kamelen.length;
    box.innerHTML = `
      <div class="rc-stap"><h3>Plaats je inzet</h3><p class="muted">Kies een kameel en zet zoveel slokken in als je wilt. Wint je kameel, dan mag je je inzet × ${n} uitdelen. Verliest hij, dan drink je je inzet zelf. Geef de telefoon door!</p>
      <div class="rc-inzet">${S.gokkers.map(g => {
        const z = S.inzet[g] || {}, m = z.m || 1;
        return `<div class="rc-gok"><div class="rc-gnaam">${esc(g)}</div>
          <div class="rc-keuze">${S.kamelen.map(k => `<button type="button" class="rc-k ${z.op === k ? "on" : ""}" data-op="${esc(k)}" data-g="${esc(g)}">🐪 ${esc(k)}</button>`).join("")}</div>
          <div class="rc-stake"><button type="button" class="btn sm ghost" data-st="-1" data-g="${esc(g)}" ${m <= 1 ? "disabled" : ""}>−</button><b>${m}</b> <span>${m === 1 ? "slok" : "slokken"}</span><button type="button" class="btn sm ghost" data-st="1" data-g="${esc(g)}">+</button><button type="button" class="btn sm ghost" data-st="5" data-g="${esc(g)}">+5</button>
          <span class="rc-odds">${z.op ? `wint: <b>${m * n}</b> uitdelen · verliest: <b>${m}</b> drinken` : ""}</span></div></div>`;
      }).join("")}</div></div>
      <div class="rc-knoppen"><button type="button" class="btn ghost" data-rc="terug">Terug</button>
        <button type="button" class="btn" data-rc="start" ${S.gokkers.every(g => S.inzet[g]?.op) ? "" : "disabled"}>Start de race!</button></div>`;
  }

  /* ---------- 3. De race ---------- */
  function renderBaan() {
    box.innerHTML = `
      <div class="rc-baan" id="rc-baan">
        <div class="rc-lucht" aria-hidden="true"><span class="rc-zon"></span><span class="rc-wolk w1">☁️</span><span class="rc-wolk w2">☁️</span><span class="rc-cactus c1">🌵</span><span class="rc-cactus c2">🌵</span><span class="rc-cactus c3">🌴</span></div>
        ${S.kamelen.map((k, i) => `
        <div class="rc-lane"><span class="rc-lnaam">${esc(k)}</span><div class="rc-zand"><span class="rc-start" aria-hidden="true"><i></i><i></i></span>
          <span class="rc-kameel" id="rc-k${i}"><span class="rc-kroon" aria-hidden="true">👑</span><span class="rc-plek" aria-hidden="true"></span><span class="rc-sprong"><span class="rc-lijf">🐪</span></span><span class="rc-stof" aria-hidden="true"></span></span>
          <span class="rc-finish"><i class="rc-lint"></i></span></div></div>`).join("")}
        <span class="rc-jager" id="rc-jager" aria-hidden="true"><span class="rc-jager-lijf"><span class="rc-jager-hoofd">🤠</span><span class="rc-geweer">🔫</span></span></span>
        <div class="rc-aftel" id="rc-aftel" aria-live="assertive"></div></div>
      <div class="rc-feed" id="rc-feed" aria-live="polite"></div>
      <div class="rc-knoppen" id="rc-afbreken"><button type="button" class="btn sm ghost" data-rc="afbreken">Race afbreken</button></div>
      <div id="rc-uitslag"></div>`;
  }

  let loper = null, teller = null;
  function stopTimers() { cancelAnimationFrame(loper); clearTimeout(teller); loper = teller = null; }

  /* De race draait op requestAnimationFrame: elke frame een klein stapje, dus vloeiend.
     Gebeurtenissen geven geen sprong maar een duw die in ~0,7 s wordt verwerkt. */
  function race() {
    stopTimers();
    S.fase = "race"; bewaar(); render();
    document.getElementById("rc-baan")?.scrollIntoView({ behavior: "smooth", block: "center" });
    const N = S.kamelen.length;
    const pos = Array(N).fill(0), duw = Array(N).fill(0);
    const basis = S.kamelen.map(() => 6.2 + Math.random() * 1.2);            // meter per seconde
    const fase = S.kamelen.map(() => [Math.random() * 6, Math.random() * 6]);   // voor golvende snelheid
    const feed = document.getElementById("rc-feed"), baan = document.getElementById("rc-baan"), aftel = document.getElementById("rc-aftel");
    const els = S.kamelen.map((_, i) => document.getElementById("rc-k" + i));
    let breedte = 0;
    const meet = () => { const z = baan.querySelector(".rc-zand"), k = els[0]; breedte = z && k ? z.clientWidth - k.offsetWidth - 6 : 300; };
    meet(); addEventListener("resize", meet);
    const rustig = matchMedia("(prefers-reduced-motion: reduce)").matches;
    /* De jager: rent achter de kamelen aan en schiet er altijd precies één neer */
    const jager = document.getElementById("rc-jager"), lanes = [...baan.querySelectorAll(".rc-zand")];
    let dood = -1, doelwit = r(N), jagerLaan = r(N), jagerFase = 0, aanleggenTot = 0, wisselOm = 1.5;
    const schotMoment = .3 + Math.random() * .35;   // voortgang van de koploper waarop hij schiet
    const levend = i => i !== dood;
    const zetJager = (hx, laan) => {
      const z = lanes[laan]; if (!z || !jager) return;
      jager.style.transform = `translate3d(${(z.offsetLeft + hx / BAAN * breedte - 6).toFixed(1)}px,${(z.offsetTop + z.offsetHeight / 2).toFixed(1)}px,0) translateY(-50%)`;
    };

    const melding = (t, soort = "") => { const p = document.createElement("p"); p.textContent = t; if (soort) p.className = soort; feed.prepend(p); while (feed.children.length > 4) feed.lastChild.remove(); };
    const ballon = (i, d) => {
      const el = els[i]; if (!el) return;
      const b = document.createElement("span"); b.className = "rc-pop " + (d > 0 ? "plus" : "min");
      b.textContent = (d > 0 ? "+" : "−") + Math.abs(d) + "m " + (d > 0 ? "⚡" : "💥"); el.appendChild(b);
      setTimeout(() => b.remove(), 1100);
      el.classList.remove("hop", "val"); void el.offsetWidth; el.classList.add(d > 0 ? "hop" : "val");
    };
    const teken = () => {
      const rang = pos.map((p, i) => [i === dood ? -1 : p, i]).sort((a, b) => b[0] - a[0]).map(([, i]) => i);
      els.forEach((el, i) => {
        if (!el) return;
        const x = Math.min(pos[i], BAAN) / BAAN * breedte;
        el.style.transform = `translate3d(${x.toFixed(1)}px,-50%,0)`;
        const plek = rang.indexOf(i) + 1;
        el.classList.toggle("leider", plek === 1 && pos[i] > 3 && i !== dood);
        const pl = el.querySelector(".rc-plek"); if (pl) pl.textContent = i === dood ? "✝" : pos[i] > 3 ? plek : "";
      });
    };

    /* Aftellen */
    const tellen = ["3", "2", "1", "Start!"]; let k = 0;
    const tel = () => {
      if (rustig || k >= tellen.length) { aftel.className = "rc-aftel"; aftel.textContent = ""; return lopen(); }
      aftel.textContent = tellen[k]; aftel.className = "rc-aftel"; void aftel.offsetWidth; aftel.className = "rc-aftel toon" + (k === 3 ? " go" : "");
      if (k === 3) baan.classList.add("open");
      try { navigator.vibrate?.(k === 3 ? 120 : 30); } catch {}
      k++; teller = setTimeout(tel, 700);
    };

    const lopen = () => {
      baan.classList.add("rent");
      melding("En ze zijn vertrokken!", "groot");
      let vorige = performance.now(), tijd = 0, volgendEvent = 1.1, laatsteLeider = -1, finale = false, slowmo = false, klaar = false;
      const frame = nu => {
        let dt = Math.min(.05, (nu - vorige) / 1000); vorige = nu;
        if (rustig) dt *= 6;
        const voor = Math.max(...pos.filter((_, i) => levend(i))), voortgang = Math.min(1, voor / BAAN);
        /* Fotofinish in slow motion: koploper bijna binnen en de nummer twee zit er vlak achter */
        const sorted = pos.filter((_, i) => levend(i)).sort((a, b) => b - a);
        const spannend = voor > BAAN * .9 && sorted[0] - sorted[1] < 4;
        if (spannend !== slowmo) { slowmo = spannend; baan.classList.toggle("slowmo", slowmo); if (slowmo) melding("Fotofinish! Het is nek aan nek!", "groot"); }
        const sdt = slowmo ? dt * .35 : dt;
        tijd += sdt;
        for (let i = 0; i < N; i++) {
          if (!levend(i)) continue;
          const golf = 1 + .18 * Math.sin(tijd * 2.1 + fase[i][0]) + .1 * Math.sin(tijd * 5.3 + fase[i][1]);
          const stap = Math.sign(duw[i]) * Math.min(Math.abs(duw[i]), 9 * sdt);    // duw wordt geleidelijk verwerkt
          duw[i] -= stap;
          pos[i] = Math.max(0, pos[i] + basis[i] * golf * sdt + stap);
        }
        /* Gebeurtenissen: hoe verder, hoe vaker en hoe groter */
        if (tijd >= volgendEvent) {
          volgendEvent = tijd + (1.15 - voortgang * .6) * (.8 + Math.random() * .4);
          let i = r(N); if (!levend(i)) i = (i + 1) % N;
          const [tekst, b] = kiesGebeurtenis(voortgang), d = Math.round(b * (1 + voortgang * .8));
          duw[i] += d; ballon(i, d);
          melding(tekst(S.kamelen[i]), (d > 0 ? "plus" : "min") + (Math.abs(d) >= 7 ? " mega" : ""));
        }
        /* Jager */
        if (jager && jagerFase < 3) {
          const achter = Math.min(...pos.filter((_, i) => levend(i)));
          if (jagerFase === 0) {
            if (tijd > wisselOm) { wisselOm = tijd + 1.2 + Math.random() * 1.4; jagerLaan = r(N); }
            if (voortgang >= schotMoment) {
              jagerFase = 1; aanleggenTot = tijd + 1; jagerLaan = doelwit;
              jager.classList.add("richt"); els[doelwit]?.classList.add("doelwit");
              melding(`De jager legt aan op ${S.kamelen[doelwit]}…`, "min");
            }
            zetJager(Math.max(0, achter - 9), jagerLaan);
          } else if (jagerFase === 1) {
            zetJager(Math.max(0, Math.min(pos[doelwit] - 12, achter - 6)), jagerLaan);
            if (tijd >= aanleggenTot) {
              jagerFase = 2; dood = doelwit; duw[dood] = 0;
              const el = els[dood]; el?.classList.remove("doelwit", "hop", "val", "leider"); el?.classList.add("dood");
              const pang = document.createElement("span"); pang.className = "rc-pang"; pang.textContent = "💥"; el?.appendChild(pang);
              jager.classList.remove("richt"); jager.classList.add("schiet");
              baan.querySelectorAll(".rc-lane")[dood]?.classList.add("dood");
              melding(`PANG! ${S.kamelen[dood]} is neergeschoten en blijft liggen.`, "min mega");
              try { navigator.vibrate?.([60, 40, 200]); } catch {}
              setTimeout(() => { jager.classList.add("weg"); jagerFase = 3; }, 1300);
            }
          }
        }
        const leider = pos.indexOf(voor);
        if (leider !== laatsteLeider && tijd > 2.5) { if (laatsteLeider >= 0) melding(`${S.kamelen[leider]} neemt de leiding!`, "leiding"); laatsteLeider = leider; }
        if (!finale && voortgang > .8) { finale = true; baan.classList.add("finale"); melding("De laatste meters! Wie pakt het?", "groot"); }
        teken();
        if (voor >= BAAN && !klaar) {
          klaar = true; loper = null;
          removeEventListener("resize", meet);
          baan.classList.remove("rent", "finale", "slowmo"); baan.classList.add("flits");
          const volgorde = pos.map((p, i) => [i === dood ? -1 : p, i]).sort((a, b) => b[0] - a[0]).map(([, i]) => S.kamelen[i]);
          els[S.kamelen.indexOf(volgorde[0])]?.classList.add("winnaar");
          baan.querySelectorAll(".rc-lane")[S.kamelen.indexOf(volgorde[0])]?.classList.add("win");
          const gs = pos.filter((_, i) => levend(i)).sort((a, b) => b - a), marge = gs[0] - gs[1];
          const verschil = marge < .6 ? "met een neuslengte" : marge < 1.5 ? "met een halve bult" : marge < 4 ? `met ${marge.toFixed(1).replace(".", ",")} meter voorsprong` : "met een straatlengte voorsprong";
          melding(`FINISH! ${volgorde[0]} wint ${verschil}!`, "groot");
          document.getElementById("rc-afbreken")?.remove();
          try { window.schietConfetti?.(); } catch {}
          setTimeout(() => afrekenen(volgorde, dood >= 0 ? S.kamelen[dood] : null), 1100);
          return;
        }
        loper = requestAnimationFrame(frame);
      };
      loper = requestAnimationFrame(frame);
    };
    teken(); tel();
  }

  /* ---------- 4. Afrekenen ---------- */
  function afrekenen(volgorde, neer) {
    const winnaar = volgorde[0], n = S.kamelen.length;
    const regels = S.gokkers.filter(g => S.inzet[g]?.op).map(g => {
      const op = S.inzet[g].op, m = S.inzet[g].m || 1, t = S.tel[g] = S.tel[g] || { gedronken: 0, uitgedeeld: 0 };
      if (op === winnaar) { t.uitgedeeld += m * n; return { g, op, m, uitdelen: m * n, drinken: 0 }; }
      t.gedronken += m; return { g, op, m, uitdelen: 0, drinken: m };
    });
    S.races++; S.fase = "uitslag"; S.uitslag = { volgorde, regels, winnaar }; bewaar();
    try { navigator.vibrate?.([80, 60, 160]); } catch {}
    const el = document.getElementById("rc-uitslag");
    el.innerHTML = `<div class="rc-res">
      <div class="rc-win">🏆 <b>${esc(winnaar)}</b> wint de race!</div>
      <ol class="rc-volg">${volgorde.map((k, i) => `<li>${k === neer ? "✝ " : i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : ""}${esc(k)}${k === neer ? " (neergeschoten)" : ""}</li>`).join("")}</ol>
      <table class="rc-tabel"><thead><tr><th>Gokker</th><th>Op</th><th class="r">Inzet</th><th class="r">Uitdelen</th><th class="r">Drinken</th></tr></thead><tbody>
      ${regels.map(x => `<tr><td>${esc(x.g)}</td><td>🐪 ${esc(x.op)}</td><td class="r">${x.m}</td><td class="r">${x.uitdelen ? `<b class="gd-pos">${x.uitdelen}</b>` : "–"}</td><td class="r">${x.drinken ? `<b class="gd-neg">${x.drinken}</b>` : "–"}</td></tr>`).join("")}</tbody></table>
      <p class="muted">Gewonnen: inzet × ${n} (het aantal kamelen) uitdelen. Verloren: je inzet zelf opdrinken.</p>
      <div class="rc-knoppen"><button type="button" class="btn" data-rc="opnieuw">Nieuwe race</button><button type="button" class="btn ghost" data-rc="setup">Kamelen of gokkers wijzigen</button></div></div>`;
  }

  function scorebord() {
    const rij = Object.entries(S.tel).sort((a, b) => b[1].gedronken - a[1].gedronken);
    if (!rij.length) return "";
    return `<div class="mx-score"><h3 class="sub-h">Deze avond${S.races ? ` · ${S.races} ${S.races === 1 ? "race" : "races"}` : ""}</h3>
      <table><thead><tr><th>Gokker</th><th class="r">Gedronken</th><th class="r">Uitgedeeld</th></tr></thead><tbody>${rij.map(([n, t]) => `<tr><td>${esc(n)}</td><td class="r">${t.gedronken}</td><td class="r">${t.uitgedeeld}</td></tr>`).join("")}</tbody></table>
      <button type="button" class="btn sm ghost" data-rc="reset">Nieuwe avond (tellers op 0)</button></div>`;
  }

  box.addEventListener("click", e => {
    const k = e.target.closest("[data-kies]");
    if (k) { const l = S[k.dataset.kies], n = k.dataset.n, i = l.indexOf(n); if (i >= 0) l.splice(i, 1); else if (k.dataset.kies !== "kamelen" || l.length < 8) l.push(n); bewaar(); return render(); }
    const op = e.target.closest("[data-op]");
    if (op) { const g = op.dataset.g; S.inzet[g] = { op: op.dataset.op, m: S.inzet[g]?.m || 1 }; bewaar(); return render(); }
    const st = e.target.closest("[data-st]");
    if (st) { const g = st.dataset.g, z = S.inzet[g] || { m: 1 }; z.m = Math.max(1, (z.m || 1) + Number(st.dataset.st)); S.inzet[g] = z; bewaar(); return render(); }
    const b = e.target.closest("[data-rc]"); if (!b) return;
    const a = b.dataset.rc;
    if (a === "naar-inzet") S.fase = "inzet";
    if (a === "terug" || a === "setup") S.fase = "setup";
    if (a === "start") return race();
    if (a === "afbreken") { stopTimers(); S.fase = "inzet"; }
    if (a === "opnieuw") { S.inzet = {}; S.fase = "inzet"; }
    if (a === "reset") { S.tel = {}; S.races = 0; S.inzet = {}; }
    bewaar(); render();
  });

  /* Een race die halverwege werd onderbroken (pagina ververst) gaat terug naar de inzetten */
  window.renderRace = () => {
    if ((S.fase === "race" && !loper && !teller) || S.fase === "uitslag") S.fase = "inzet";
    if (S.fase !== "race") render();
  };
  window.renderRace();
})();
