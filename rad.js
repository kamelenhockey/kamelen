/* =========================================================
   Kamelen-rad: draai aan het rad voor een straf of opdracht.
   "Huis" is een smal vakje, dus de kans erop is een stuk kleiner.
   ========================================================= */
(function () {
  const box = document.getElementById("rad"); if (!box) return;
  /* Volgorde door elkaar. Smalle vakjes (kleine kans): Huis, Liter toevoegen en Dubbelloops. */
  const VAKKEN = [
    { kort: "Aanvoerdersbak", tekst: "Aanvoerdersbak (ook oud-aanvoerders)" },
    { kort: "Zelf halve leo", tekst: "Zelf een halve leo" },
    { kort: "Middenveldbak", tekst: "Middenveldbak" },
    { kort: "Nog een keer ×2", tekst: "Nog een keer draaien én verdubbelaar", opnieuw: true, dubbel: true },
    { kort: "Keepersbak", tekst: "Keepersbak" },
    { kort: "Bak uitdelen", tekst: "Bak uitdelen" },
    { kort: "HUIS", tekst: "HUIS!", gewicht: .3, huis: true, kleur: "#c0392b" },
    { kort: "Nog een keer", tekst: "Nog een keer draaien", opnieuw: true },
    { kort: "Feutenbak", tekst: "Feutenbak" },
    { kort: "Aanvoerders delen uit", tekst: "Aanvoerders (ook oud-aanvoerders) mogen een bak uitdelen" },
    { kort: "Halve leo uitdelen", tekst: "Halve leo uitdelen" },
    { kort: "LITER", tekst: "Liter trekken!", gewicht: .35, klein: true, kleur: "#d4a017" },
    { kort: "Verdedigersbak", tekst: "Verdedigersbak" },
    { kort: "Coachbak", tekst: "Coachbak" },
    { kort: "Dubbelloops uitdelen", tekst: "Dubbelloops uitdelen" },
    { kort: "DUBBELLOOPS", tekst: "Dubbelloops! Zelf twee tegelijk.", gewicht: .35, klein: true, kleur: "#6b4fa0" },
    { kort: "Zelf bak", tekst: "Zelf een bak" },
    { kort: "Aanvalbak", tekst: "Aanvalbak" },
    { kort: "Veteranenbak", tekst: "Veteranenbak (wie er het langst bij zit)" }
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
          const kleur = v.kleur || KLEUREN[k++ % KLEUREN.length];
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
    if (bezig) return; bezig = true;
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
      if (p < 1) requestAnimationFrame(stap);
      else { vorigeDraai = draai; setTimeout(() => klaar(vak), 150); }
    };
    requestAnimationFrame(stap);
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
      uit.innerHTML = `<div class="rad-res${vak.huis ? " huis" : vak.klein ? " klein" : ""}" ${vak.kleur ? `style="color:${vak.kleur}"` : ""}>${tekst}</div>${vak.huis ? `<p>Al het bier op tafel (behalve de pitchers)!</p>` : ""}`;
      verdubbelaar = 0;
      knop.textContent = "Draai aan het rad";
    }
    geschiedenis.unshift(tekst.replace(/<[^>]+>/g, ""));
    const hist = box.querySelector(".rad-hist");
    const html = `<div class="rad-hist"><h3 class="sub-h">Eerder vanavond</h3><ol>${geschiedenis.slice(0, 8).map(g => `<li>${g}</li>`).join("")}</ol></div>`;
    if (hist) hist.outerHTML = html; else box.insertAdjacentHTML("beforeend", html);
  }

  window.renderRad = render;
  render();
})();
