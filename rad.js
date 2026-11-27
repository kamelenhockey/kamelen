/* =========================================================
   Kamelen-rad: draai aan het rad voor een straf of opdracht.
   "Huis" is een smal vakje, dus de kans erop is een stuk kleiner.
   ========================================================= */
(function () {
  const box = document.getElementById("rad"); if (!box) return;
  /* Volgorde door elkaar. Smalle vakjes (kleine kans): Huis, Liter toevoegen en Dubbelloops.
     Brede vakjes: Zelf bak en Zelf halve leo, zodat de draaier altijd de grootste kans heeft om zelf te drinken. */
  const VAKKEN = [
    { kort: "Aanvoerdersbak", tekst: "Aanvoerdersbak (ook oud-aanvoerders)" },
    { kort: "Zelf halve leo", tekst: "Zelf een halve leo", zelf: true, gewicht: 2.5 },
    { kort: "Middenveldbak", tekst: "Middenveldbak" },
    { kort: "Nog een keer ×2", tekst: "Nog een keer draaien én verdubbelaar", opnieuw: true, dubbel: true },
    { kort: "Keepersbak", tekst: "Keepersbak" },
    { kort: "Bak uitdelen", tekst: "Bak uitdelen" },
    { kort: "Lichtingbak", tekst: "Lichtingbak: een bak met iedereen uit jouw lichting" },
    { kort: "HUIS", tekst: "HUIS!", gewicht: .3, huis: true, kleur: "#c0392b" },
    { kort: "Nog een keer", tekst: "Nog een keer draaien", opnieuw: true },
    { kort: "Feutenbak", tekst: "Feutenbak" },
    { kort: "Oudkamelenbak", tekst: "Oudkamelenbak (iedereen die eerder bij de Kamelen speelde)" },
    { kort: "Aanvoerders delen uit", tekst: "Aanvoerders (ook oud-aanvoerders) mogen een bak uitdelen" },
    { kort: "Halve leo uitdelen", tekst: "Halve leo uitdelen" },
    { kort: "LITER", tekst: "Liter trekken!", gewicht: .35, klein: true, kleur: "#d4a017" },
    { kort: "Verdedigersbak", tekst: "Verdedigersbak" },
    { kort: "Coachbak", tekst: "Coachbak" },
    { kort: "Topscorersbak", tekst: "Topscorersbak (de top 3 topscorers van de Kamelen)" },
    { kort: "Dubbelloops uitdelen", tekst: "Dubbelloops uitdelen" },
    { kort: "DUBBELLOOPS", tekst: "Dubbelloops! Zelf twee tegelijk.", gewicht: .35, klein: true, kleur: "#6b4fa0" },
    { kort: "Zelf bak", tekst: "Zelf een bak", zelf: true, gewicht: 2.5 },
    { kort: "Aanvalbak", tekst: "Aanvalbak" },
    { kort: "Veteranenbak", tekst: "Veteranenbak: iedereen die in zijn 5e jaar of langer bij de Kamelen zit" }
  ];
  const KLEUREN = ["#163650", "#f08c1c", "#b9d8e8", "#2c4b63", "#f6b46a", "#e6f1f7"];
  const TEKSTKLEUR = { "#163650": "#fff", "#2c4b63": "#fff", "#f08c1c": "#163650", "#f6b46a": "#163650", "#b9d8e8": "#163650", "#e6f1f7": "#163650" };
  const totaal = VAKKEN.reduce((s, v) => s + (v.gewicht || 1), 0);
  let hoek = 0; VAKKEN.forEach(v => { v.van = hoek; hoek += (v.gewicht || 1) / totaal * 360; v.tot = hoek; });

  let draai = 0, vorigeDraai = 0, bezig = false, verdubbelaar = 0, geschiedenis = [];

  const pt = (r, a) => { const rad = (a - 90) * Math.PI / 180; return [200 + r * Math.cos(rad), 200 + r * Math.sin(rad)]; };
  function vakPad(v) {
    const [x1, y1] = pt(190, v.van), [x2, y2] = pt(190, v.tot), groot = v.tot - v.van > 180 ? 1 : 0;
    return `M200 200 L${x1.toFixed(2)} ${y1.toFixed(2)} A190 190 0 ${groot} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
  }
  function svg() {
    let k = 0;
    return `<svg viewBox="0 0 400 400" class="rad-svg" aria-hidden="true">
      <g id="rad-wiel">
        ${VAKKEN.map(v => {
          let kleur = v.kleur || KLEUREN[k++ % KLEUREN.length];
          /* Laatste vakje mag niet dezelfde kleur hebben als het eerste (ze liggen naast elkaar) */
          if (v === VAKKEN[VAKKEN.length - 1] && !v.kleur && kleur === KLEUREN[0]) kleur = KLEUREN[4];
          const mid = (v.van + v.tot) / 2;
          const tk = v.kleur ? "#fff" : TEKSTKLEUR[kleur];
          return `<path d="${vakPad(v)}" fill="${kleur}" stroke="#fff" stroke-width="2"/>
            <text transform="rotate(${(mid - 90).toFixed(2)} 200 200)" x="${v.kleur ? 376 : 378}" y="200" dominant-baseline="middle" fill="${tk}" font-size="${v.kleur ? 8.5 : 11.5}" font-weight="700" text-anchor="end" style="font-family:'DM Sans',system-ui,sans-serif">${v.kort}</text>`;
        }).join("")}
        <circle cx="200" cy="200" r="190" fill="none" stroke="#163650" stroke-width="6"/>
      </g>
      <circle cx="200" cy="200" r="34" fill="#fff" stroke="#163650" stroke-width="4"/>
      <image href="logo.png" x="176" y="178" width="48" height="44"/>
    </svg>
    <div class="rad-pijl" aria-hidden="true"></div>`;
  }

  function render() {
    box.innerHTML = `
      <div class="rad-wrap" id="rad-wrap" role="button" tabindex="0" aria-label="Draai aan het rad">${svg()}</div>
      <div class="rad-uitslag" id="rad-uitslag" role="status" aria-live="polite">${verdubbelaar ? `<span class="rad-x">Verdubbelaar actief: ×${2 ** verdubbelaar}</span>` : `<span class="muted">Tik op de knop en laat het rad beslissen.</span>`}</div>
      <div class="rad-knoppen"><button type="button" class="btn rad-knop" id="rad-draai">Draai aan het rad</button></div>
      ${geschiedenis.length ? `<div class="rad-hist"><h3 class="sub-h">Eerder vanavond</h3><ol>${geschiedenis.slice(0, 8).map(g => `<li>${g}</li>`).join("")}</ol></div>` : ""}`;
    const wiel = document.getElementById("rad-wiel");
    wiel.style.transform = `rotate(${draai}deg)`;
    document.getElementById("rad-draai").addEventListener("click", spin);
    const wrap = document.getElementById("rad-wrap");
    wrap.addEventListener("click", spin);
    wrap.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); spin(); } });
  }

  function spin() {
    if (bezig || donBezig) return; bezig = true;
    document.getElementById("don-box")?.remove(); donVak = null;
    const knop = document.getElementById("rad-draai"); knop.disabled = true;
    const uit = document.getElementById("rad-uitslag"); uit.innerHTML = `<span class="muted">Draaien…</span>`;
    /* Kies een willekeurige plek op het rad: grotere vakken hebben meer kans, Huis is smal */
    const doel = Math.random() * 360;
    const vak = VAKKEN.find(v => doel >= v.van && doel < v.tot) || VAKKEN[0];
    /* Het wiel draait zo dat 'doel' bovenaan bij de pijl stopt */
    const rest = ((360 - doel) - (draai % 360) + 720) % 360;
    draai += 360 * (5 + Math.floor(Math.random() * 3)) + rest;
    const wiel = document.getElementById("rad-wiel"), pijl = box.querySelector(".rad-pijl");
    const snel = matchMedia("(prefers-reduced-motion: reduce)").matches;
    geluidAan();
    wiel.style.transition = "none";
    if (snel) { wiel.style.transform = `rotate(${draai}deg)`; return setTimeout(() => klaar(vak), 50); }
    /* Zelf animeren, zodat we elk pinnetje horen tikken als het langs de pijl gaat */
    const start = performance.now(), afstand = draai - vorigeDraai, DUUR = 5200;
    const randen = VAKKEN.map(v => v.van);
    let vorigeHoek = vorigeDraai;
    const stap = t => {
      const p = Math.min(1, (t - start) / DUUR), e = 1 - Math.pow(1 - p, 3.4);
      const hoek = vorigeDraai + afstand * e;
      wiel.style.transform = `rotate(${hoek}deg)`;
      /* Onder de pijl staat de plek (360 - hoek); tel de vakgrenzen die er sinds het vorige beeld langs kwamen */
      const a0 = vorigeHoek, a1 = hoek;
      let tikken = 0;
      for (const r of randen) { const g = 360 - r; tikken += Math.floor((a1 - g) / 360) - Math.floor((a0 - g) / 360); }
      if (tikken > 0) { tik(Math.min(1, (1 - p) * 1.4 + .25)); if (pijl) { pijl.classList.remove("tik"); void pijl.offsetWidth; pijl.classList.add("tik"); } }
      vorigeHoek = hoek;
      if (p < 1) volgendBeeld(stap);
      else { vorigeDraai = draai; setTimeout(() => klaar(vak), 150); }
    };
    volgendBeeld(stap);
  }
  /* Volgend beeld; valt terug op een timer als het scherm geen beelden levert (bv. op de achtergrond) */
  function volgendBeeld(cb) {
    let klaar = false; const doe = () => { if (!klaar) { klaar = true; cb(performance.now()); } };
    requestAnimationFrame(doe); setTimeout(doe, 50);
  }

  /* ---------- Geluid: het klik-klik-klik van een echt rad ---------- */
  let ctx = null, ruis = null;
  function geluidAan() {
    try {
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        const n = Math.floor(ctx.sampleRate * .03); ruis = ctx.createBuffer(1, n, ctx.sampleRate);
        const d = ruis.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 6);
      }
      if (ctx.state === "suspended") ctx.resume();
    } catch { ctx = null; }
  }
  function tik(sterkte) {
    if (!ctx) return;
    try {
      const nu = ctx.currentTime;
      /* plastic klepje tegen een pin: korte ruisklik plus een houtachtige tok */
      const bron = ctx.createBufferSource(); bron.buffer = ruis; bron.playbackRate.value = .9 + Math.random() * .25;
      const filter = ctx.createBiquadFilter(); filter.type = "bandpass"; filter.frequency.value = 2600 + Math.random() * 600; filter.Q.value = 1.4;
      const g1 = ctx.createGain(); g1.gain.value = .55 * sterkte;
      bron.connect(filter).connect(g1).connect(ctx.destination); bron.start(nu);
      const osc = ctx.createOscillator(); osc.type = "triangle"; osc.frequency.setValueAtTime(1150, nu); osc.frequency.exponentialRampToValueAtTime(420, nu + .03);
      const g2 = ctx.createGain(); g2.gain.setValueAtTime(.18 * sterkte, nu); g2.gain.exponentialRampToValueAtTime(.0001, nu + .045);
      osc.connect(g2).connect(ctx.destination); osc.start(nu); osc.stop(nu + .05);
    } catch {}
  }
  /* Een bel-achtige 'tadaa' voor de speciale vakken */
  function alarm() {
    if (!ctx) return;
    try {
      const nu = ctx.currentTime;
      [0, .12, .24].forEach((t, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "square";
        o.frequency.value = [523, 659, 784][i];
        g.gain.setValueAtTime(.0001, nu + t); g.gain.exponentialRampToValueAtTime(.12, nu + t + .01); g.gain.exponentialRampToValueAtTime(.0001, nu + t + (i === 2 ? .5 : .11));
        o.connect(g).connect(ctx.destination); o.start(nu + t); o.stop(nu + t + .55);
      });
    } catch {}
  }
  /* Trillen: Android via vibrate, iPhone via het schakelaar-trucje (iOS 18 geeft dan een tik) */
  let schakel = null;
  function tril(patroon) {
    try { if (navigator.vibrate && navigator.vibrate(patroon)) return; } catch {}
    try {
      if (!schakel) {
        schakel = document.createElement("label"); schakel.setAttribute("aria-hidden", "true");
        schakel.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none";
        schakel.innerHTML = `<input type="checkbox" switch tabindex="-1">`; document.body.appendChild(schakel);
      }
      let t = 0; patroon.forEach((d, i) => { if (i % 2 === 0) { const n = Math.max(1, Math.round(d / 70)); for (let k = 0; k < n; k++) setTimeout(() => schakel.click(), t + k * 70); } t += d; });
    } catch {}
  }

  function klaar(vak) {
    bezig = false;
    const uit = document.getElementById("rad-uitslag"), knop = document.getElementById("rad-draai");
    knop.disabled = false;
    if (vak.huis || vak.klein) {
      tril([200, 80, 200, 80, 450]); alarm();
      const w = document.getElementById("rad-wrap"); w.classList.remove("trillen"); void w.offsetWidth; w.classList.add("trillen");
    }
    let tekst;
    if (vak.opnieuw) {
      if (vak.dubbel) verdubbelaar++;
      tekst = vak.tekst;
      uit.innerHTML = `<div class="rad-res">${tekst}</div>${verdubbelaar ? `<span class="rad-x">Verdubbelaar actief: ×${2 ** verdubbelaar}</span>` : ""}`;
      knop.textContent = "Nog een keer draaien";
    } else {
      const x = verdubbelaar ? 2 ** verdubbelaar : 1;
      tekst = x > 1 ? `${vak.tekst} <b class="rad-x">×${x}</b>` : vak.tekst;
      uit.innerHTML = `<div class="rad-res${vak.huis ? " huis" : vak.klein ? " klein" : ""}" ${vak.kleur ? `style="color:${vak.kleur}"` : ""}>${tekst}</div>${vak.huis ? `<p>Al het bier op tafel (behalve de pitchers)!</p>` : ""}
        ${vak.zelf ? `<button type="button" class="btn rad-don-knop" id="rad-don">🎲 Dubbel of niks?</button>` : ""}`;
      if (vak.zelf) { donVak = { vak, x }; document.getElementById("rad-don").addEventListener("click", startDon); }
      verdubbelaar = 0;
      knop.textContent = "Draai aan het rad";
    }
    geschiedenis.unshift(tekst.replace(/<[^>]+>/g, ""));
    const hist = box.querySelector(".rad-hist");
    const html = `<div class="rad-hist"><h3 class="sub-h">Eerder vanavond</h3><ol>${geschiedenis.slice(0, 8).map(g => `<li>${g}</li>`).join("")}</ol></div>`;
    if (hist) hist.outerHTML = html; else box.insertAdjacentHTML("beforeend", html);
  }

  /* ---------- Dubbel of niks: een tweede rad met afwisselend DUBBEL en NIKS ---------- */
  let donVak = null, donDraai = 0, donBezig = false;
  const DON_N = 10;
  function donSvg() {
    const st = 360 / DON_N, p = (r, a) => { const rd = (a - 90) * Math.PI / 180; return [150 + r * Math.cos(rd), 150 + r * Math.sin(rd)]; };
    let g = "";
    for (let i = 0; i < DON_N; i++) {
      const van = i * st, tot = van + st, [x1, y1] = p(140, van), [x2, y2] = p(140, tot), dub = i % 2 === 0, mid = van + st / 2, [tx, ty] = p(92, mid);
      g += `<path d="M150 150 L${x1.toFixed(1)} ${y1.toFixed(1)} A140 140 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${dub ? "#f08c1c" : "#163650"}" stroke="#fff" stroke-width="2"/>
        <text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" transform="rotate(${mid} ${tx.toFixed(1)} ${ty.toFixed(1)})" text-anchor="middle" dominant-baseline="middle" font-size="15" font-weight="800" fill="${dub ? "#163650" : "#fff"}" font-family="DM Sans, system-ui, sans-serif">${dub ? "DUBBEL" : "NIKS"}</text>`;
    }
    return `<svg viewBox="0 0 300 300" class="don-svg" aria-hidden="true"><circle cx="150" cy="150" r="146" fill="#163650"/><g id="don-wiel">${g}</g><circle cx="150" cy="150" r="26" fill="#fff" stroke="#163650" stroke-width="4"/><text x="150" y="151" text-anchor="middle" dominant-baseline="middle" font-size="22">🎲</text></svg><div class="rad-pijl don-pijl" aria-hidden="true"></div>`;
  }
  function startDon() {
    if (!donVak) return;
    const knop = document.getElementById("rad-draai"); knop.disabled = true;
    document.getElementById("rad-don")?.remove();
    const vorige = document.getElementById("don-box"); if (vorige) vorige.remove();
    const uit = document.getElementById("rad-uitslag");
    uit.insertAdjacentHTML("afterend", `<div class="don-box" id="don-box"><h3>Dubbel of niks</h3><p>${donVak.vak.tekst}${donVak.x > 1 ? ` ×${donVak.x}` : ""}: draai en kijk of het verdubbelt of verdwijnt.</p>
      <div class="don-wrap" id="don-wrap" role="button" tabindex="0" aria-label="Draai aan het dubbel-of-niks-rad">${donSvg()}</div>
      <button type="button" class="btn rad-knop" id="don-draai">Draai!</button></div>`);
    document.getElementById("don-wiel").style.transform = `rotate(${donDraai}deg)`;
    const go = () => draaiDon();
    document.getElementById("don-draai").addEventListener("click", go);
    document.getElementById("don-wrap").addEventListener("click", go);
    document.getElementById("don-box").scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function draaiDon() {
    if (donBezig || !donVak) return; donBezig = true;
    const knop = document.getElementById("don-draai"); if (knop) knop.disabled = true;
    const dubbel = Math.random() < .6;
    const st = 360 / DON_N, opties = [...Array(DON_N).keys()].filter(i => (i % 2 === 0) === dubbel);
    const i = opties[Math.floor(Math.random() * opties.length)], doel = i * st + st * (.2 + Math.random() * .6);
    const rest = ((360 - doel) - (donDraai % 360) + 720) % 360, vanaf = donDraai;
    donDraai += 360 * (4 + Math.floor(Math.random() * 2)) + rest;
    const wiel = document.getElementById("don-wiel"), pijl = document.querySelector(".don-pijl");
    geluidAan();
    const klaarDon = () => {
      donBezig = false;
      const { vak, x } = donVak; donVak = null;
      const box2 = document.getElementById("don-box");
      const res = dubbel ? `${vak.tekst} <b class="rad-x">×${x * 2}</b>` : `Je bent vrij, geen bak.`;
      if (dubbel) { tril([200, 80, 200, 80, 450]); alarm(); } else tril([60]);
      if (box2) box2.insertAdjacentHTML("beforeend", `<div class="rad-res don-res ${dubbel ? "dub" : "niks"}">${dubbel ? "DUBBEL!" : "NIKS!"}</div><p class="don-uit">${res}</p>`);
      document.getElementById("don-draai")?.remove();
      geschiedenis[0] = `${geschiedenis[0]} → ${dubbel ? `dubbel (×${x * 2})` : "niks"}`;
      const hist = box.querySelector(".rad-hist"); if (hist) hist.querySelector("li").textContent = geschiedenis[0];
      document.getElementById("rad-draai").disabled = false;
    };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { wiel.style.transform = `rotate(${donDraai}deg)`; return setTimeout(klaarDon, 50); }
    const start = performance.now(), DUUR = 4200, afstand = donDraai - vanaf;
    let vorigeHoek = vanaf;
    const stap = t => {
      const p = Math.min(1, (t - start) / DUUR), e = 1 - Math.pow(1 - p, 3.4), hoek = vanaf + afstand * e;
      wiel.style.transform = `rotate(${hoek}deg)`;
      if (Math.floor(hoek / st) !== Math.floor(vorigeHoek / st)) { tik(Math.min(1, (1 - p) * 1.4 + .25)); if (pijl) { pijl.classList.remove("tik"); void pijl.offsetWidth; pijl.classList.add("tik"); } }
      vorigeHoek = hoek;
      if (p < 1) volgendBeeld(stap); else setTimeout(klaarDon, 150);
    };
    volgendBeeld(stap);
  }

  window.renderRad = render;
  render();
})();
