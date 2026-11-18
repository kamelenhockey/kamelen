/* =========================================================
   De Grote Kamelen-gokken: een kamelenrace om op te wedden.
   - Kies welke kamelen meedoen (vernoemd naar spelers) en wie er gokt.
   - Iedereen heeft kamelen-munten (start: 10). Zet in op een kameel.
   - De race: willekeurige gebeurtenissen bepalen wie wint.
   - Uitbetaling: de pot gaat naar wie op de winnaar inzette (naar verhouding).
     Wie verloor, drinkt evenveel slokken als hij aan munten kwijt is.
     De speler naar wie de winnende kameel vernoemd is, mag slokken uitdelen.
   Alles staat alleen op dit apparaat (een telefoon gaat rond).
   ========================================================= */
(function () {
  const box = document.getElementById("race"); if (!box) return;
  const LS = "kamelen-race", START = 10, BAAN = 100;
  const laad = () => { try { return JSON.parse(localStorage.getItem(LS)) || null; } catch { return null; } };
  let S = laad() || { kamelen: [], gokkers: [], munten: {}, inzet: {}, fase: "setup", log: [], uitslag: null, races: 0 };
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
  ];

  function render() {
    if (S.fase === "setup") return renderSetup();
    if (S.fase === "inzet") return renderInzet();
    renderBaan();
  }

  /* ---------- 1. Wie doet er mee ---------- */
  function renderSetup() {
    const chips = (lijst, veld) => namen().map(n => `<button type="button" class="kz-chip ${lijst.includes(n) ? "on" : ""}" data-kies="${veld}" data-n="${esc(n)}">${esc(n)}</button>`).join("");
    box.innerHTML = `
      <div class="rc-stap"><h3>1. Welke kamelen racen er?</h3><p class="muted">Kies 3 tot 8 kamelen. Ze zijn vernoemd naar spelers.</p>
        <div class="kz-grid">${chips(S.kamelen, "kamelen")}</div></div>
      <div class="rc-stap"><h3>2. Wie gokt er mee?</h3><p class="muted">Iedereen begint met ${START} kamelen-munten.</p>
        <div class="kz-grid">${chips(S.gokkers, "gokkers")}</div></div>
      <div class="rc-knoppen"><button type="button" class="btn" data-rc="naar-inzet" ${S.kamelen.length >= 3 && S.gokkers.length >= 1 ? "" : "disabled"}>Naar de inzetten</button>
        <span class="muted">${S.kamelen.length} kamelen, ${S.gokkers.length} gokkers</span></div>
      ${scorebord()}`;
  }

  /* ---------- 2. Inzetten ---------- */
  function renderInzet() {
    box.innerHTML = `
      <div class="rc-stap"><h3>Plaats je inzet</h3><p class="muted">Kies per gokker een kameel en hoeveel munten je inzet. Geef de telefoon door!</p>
      <div class="rc-inzet">${S.gokkers.map(g => {
        const z = S.inzet[g] || {}, max = S.munten[g] ?? START;
        return `<div class="rc-gok"><div class="rc-gnaam">${esc(g)} <small>${max} munten</small></div>
          <div class="rc-keuze">${S.kamelen.map(k => `<button type="button" class="rc-k ${z.op === k ? "on" : ""}" data-op="${esc(k)}" data-g="${esc(g)}">🐪 ${esc(k)}</button>`).join("")}</div>
          <div class="rc-stake"><button type="button" class="btn sm ghost" data-st="-1" data-g="${esc(g)}" ${!(z.m > 1) ? "disabled" : ""}>−</button><b>${z.m || 1}</b> <span>munt${(z.m || 1) === 1 ? "" : "en"}</span><button type="button" class="btn sm ghost" data-st="1" data-g="${esc(g)}" ${(z.m || 1) >= max ? "disabled" : ""}>+</button></div></div>`;
      }).join("")}</div></div>
      <div class="rc-knoppen"><button type="button" class="btn ghost" data-rc="terug">Terug</button>
        <button type="button" class="btn" data-rc="start" ${S.gokkers.every(g => S.inzet[g]?.op || (S.munten[g] ?? START) <= 0) ? "" : "disabled"}>Start de race!</button></div>`;
  }

  /* ---------- 3. De race ---------- */
  function renderBaan() {
    box.innerHTML = `
      <div class="rc-baan" id="rc-baan">${S.kamelen.map((k, i) => `
        <div class="rc-lane"><span class="rc-lnaam">${esc(k)}</span><div class="rc-zand"><span class="rc-kameel" id="rc-k${i}" style="left:0%">🐪</span><span class="rc-finish"></span></div></div>`).join("")}</div>
      <div class="rc-feed" id="rc-feed" aria-live="polite"></div>
      <div id="rc-uitslag"></div>`;
  }

  function race() {
    S.fase = "race"; bewaar(); render();
    const pos = S.kamelen.map(() => 0), snel = S.kamelen.map(() => 1.2 + Math.random() * .6);
    const feed = document.getElementById("rc-feed");
    const zet = () => S.kamelen.forEach((_, i) => { const el = document.getElementById("rc-k" + i); if (el) el.style.left = `calc(${Math.min(pos[i], BAAN) / BAAN * 100}% - ${Math.min(pos[i], BAAN) / BAAN * 2.2}rem)`; });
    const melding = t => { const p = document.createElement("p"); p.textContent = t; feed.prepend(p); while (feed.children.length > 4) feed.lastChild.remove(); };
    melding("En ze zijn vertrokken!");
    const snelheid = matchMedia("(prefers-reduced-motion: reduce)").matches ? 20 : 1;
    let tik = 0;
    const t = setInterval(() => {
      tik++;
      S.kamelen.forEach((_, i) => { pos[i] += (snel[i] + Math.random() * 1.1) * .55 * snelheid; });
      if (tik % 9 === 0) {
        const i = r(S.kamelen.length), [tekst, d] = GEBEURTENISSEN[r(GEBEURTENISSEN.length)];
        pos[i] = Math.max(0, pos[i] + d); melding(tekst(S.kamelen[i]));
        const el = document.getElementById("rc-k" + i); if (el) { el.classList.remove("hop", "val"); void el.offsetWidth; el.classList.add(d > 0 ? "hop" : "val"); }
      }
      zet();
      const klaar = pos.map((p, i) => [p, i]).filter(([p]) => p >= BAAN);
      if (klaar.length) {
        clearInterval(t);
        const volgorde = pos.map((p, i) => [p, i]).sort((a, b) => b[0] - a[0]).map(([, i]) => S.kamelen[i]);
        afrekenen(volgorde);
      }
    }, 120);
  }

  /* ---------- 4. Afrekenen ---------- */
  function afrekenen(volgorde) {
    const winnaar = volgorde[0];
    const inzetten = S.gokkers.filter(g => S.inzet[g]?.op).map(g => ({ g, op: S.inzet[g].op, m: S.inzet[g].m || 1 }));
    const pot = inzetten.reduce((s, x) => s + x.m, 0), opWinnaar = inzetten.filter(x => x.op === winnaar), opW = opWinnaar.reduce((s, x) => s + x.m, 0);
    const regels = inzetten.map(x => {
      const oud = S.munten[x.g] ?? START;
      if (x.op === winnaar) { const winst = Math.round(pot * x.m / opW) - x.m; S.munten[x.g] = oud + winst; return { ...x, winst, slokken: 0 }; }
      S.munten[x.g] = oud - x.m; return { ...x, winst: -x.m, slokken: x.m };
    });
    S.races++; S.fase = "uitslag"; S.uitslag = { volgorde, regels, winnaar, uitdelen: opWinnaar.length ? 0 : pot };
    S.log.unshift(`Race ${S.races}: ${winnaar} won`); bewaar();
    try { navigator.vibrate?.([80, 60, 160]); } catch {}
    const el = document.getElementById("rc-uitslag");
    el.innerHTML = `<div class="rc-res">
      <div class="rc-win">🏆 <b>${esc(winnaar)}</b> wint de race!</div>
      <ol class="rc-volg">${volgorde.map(k => `<li>${esc(k)}</li>`).join("")}</ol>
      <table class="rc-tabel"><thead><tr><th>Gokker</th><th>Op</th><th class="r">Munten</th><th class="r">Drinken</th></tr></thead><tbody>
      ${regels.map(x => `<tr><td>${esc(x.g)}</td><td>🐪 ${esc(x.op)}</td><td class="r ${x.winst > 0 ? "gd-pos" : x.winst < 0 ? "gd-neg" : ""}">${x.winst > 0 ? "+" : ""}${x.winst}</td><td class="r">${x.slokken ? `<b>${x.slokken} ${x.slokken === 1 ? "slok" : "slokken"}</b>` : "–"}</td></tr>`).join("")}</tbody></table>
      <p class="rc-straf">De echte <b>${esc(winnaar)}</b> mag ${Math.max(3, Math.min(10, pot))} slokken uitdelen aan wie hij wil.
      ${!opWinnaar.length ? `<br>Niemand gokte op de winnaar: de pot van ${pot} munten is weg en <b>iedereen drinkt 2 slokken</b>.` : ""}</p>
      <div class="rc-knoppen"><button type="button" class="btn" data-rc="opnieuw">Nieuwe race</button><button type="button" class="btn ghost" data-rc="setup">Kamelen of gokkers wijzigen</button></div></div>`;
  }

  function scorebord() {
    const rij = Object.entries(S.munten).sort((a, b) => b[1] - a[1]);
    if (!rij.length) return "";
    return `<div class="mx-score"><h3 class="sub-h">Munten deze avond${S.races ? ` · ${S.races} ${S.races === 1 ? "race" : "races"}` : ""}</h3>
      <table><thead><tr><th>Gokker</th><th class="r">Munten</th></tr></thead><tbody>${rij.map(([n, m]) => `<tr><td>${esc(n)}</td><td class="r">${m}${m <= 0 ? " 💀" : ""}</td></tr>`).join("")}</tbody></table>
      <button type="button" class="btn sm ghost" data-rc="reset">Nieuwe avond (munten terug naar ${START})</button></div>`;
  }

  box.addEventListener("click", e => {
    const k = e.target.closest("[data-kies]");
    if (k) { const l = S[k.dataset.kies], n = k.dataset.n, i = l.indexOf(n); if (i >= 0) l.splice(i, 1); else if (k.dataset.kies !== "kamelen" || l.length < 8) l.push(n); bewaar(); return render(); }
    const op = e.target.closest("[data-op]");
    if (op) { const g = op.dataset.g; S.inzet[g] = { op: op.dataset.op, m: S.inzet[g]?.m || 1 }; bewaar(); return render(); }
    const st = e.target.closest("[data-st]");
    if (st) { const g = st.dataset.g, max = S.munten[g] ?? START; const z = S.inzet[g] || { m: 1 }; z.m = Math.max(1, Math.min(max, (z.m || 1) + Number(st.dataset.st))); S.inzet[g] = z; bewaar(); return render(); }
    const b = e.target.closest("[data-rc]"); if (!b) return;
    const a = b.dataset.rc;
    if (a === "naar-inzet") { S.gokkers.forEach(g => { if (S.munten[g] === undefined) S.munten[g] = START; }); S.fase = "inzet"; }
    if (a === "terug" || a === "setup") S.fase = "setup";
    if (a === "start") return race();
    if (a === "opnieuw") { S.inzet = {}; S.fase = "inzet"; }
    if (a === "reset") { S.munten = {}; S.races = 0; S.log = []; S.inzet = {}; }
    bewaar(); render();
  });

  window.renderRace = () => { if (S.fase === "race") S.fase = "inzet"; render(); };
  window.renderRace();
})();
