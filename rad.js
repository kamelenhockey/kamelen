/* =========================================================
   Kamelen-rad: draai aan het rad voor een straf of opdracht.
   "Huis" is een smal vakje, dus de kans erop is een stuk kleiner.
   ========================================================= */
(function () {
  const box = document.getElementById("rad"); if (!box) return;
  const VAKKEN = [
    { kort: "Aanvoerdersbak", tekst: "Aanvoerdersbak" },
    { kort: "Coachbak", tekst: "Coachbak" },
    { kort: "Feutenbak", tekst: "Feutenbak" },
    { kort: "Verdedigersbak", tekst: "Verdedigersbak" },
    { kort: "Middenveldbak", tekst: "Middenveldbak" },
    { kort: "Aanvalbak", tekst: "Aanvalbak" },
    { kort: "Keepersbak", tekst: "Keepersbak" },
    { kort: "Zelf halve leo", tekst: "Zelf een halve leo" },
    { kort: "Zelf bak", tekst: "Zelf een bak" },
    { kort: "Bak uitdelen", tekst: "Bak uitdelen" },
    { kort: "HUIS", tekst: "HUIS!", gewicht: .3, huis: true },
    { kort: "Nog een keer", tekst: "Nog een keer draaien", opnieuw: true },
    { kort: "Nog een keer ×2", tekst: "Nog een keer draaien én verdubbelaar", opnieuw: true, dubbel: true },
    { kort: "Veteranenbak", tekst: "Veteranenbak (wie er het langst bij zit)" }
  ];
  const KLEUREN = ["#163650", "#f08c1c", "#b9d8e8", "#2c4b63", "#f6b46a", "#e6f1f7"];
  const TEKSTKLEUR = { "#163650": "#fff", "#2c4b63": "#fff", "#f08c1c": "#163650", "#f6b46a": "#163650", "#b9d8e8": "#163650", "#e6f1f7": "#163650" };
  const totaal = VAKKEN.reduce((s, v) => s + (v.gewicht || 1), 0);
  let hoek = 0; VAKKEN.forEach(v => { v.van = hoek; hoek += (v.gewicht || 1) / totaal * 360; v.tot = hoek; });

  let draai = 0, bezig = false, verdubbelaar = 0, geschiedenis = [];

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
          const kleur = v.huis ? "#c0392b" : KLEUREN[k++ % KLEUREN.length];
          const mid = (v.van + v.tot) / 2;
          const tk = v.huis ? "#fff" : TEKSTKLEUR[kleur];
          return `<path d="${vakPad(v)}" fill="${kleur}" stroke="#fff" stroke-width="2"/>
            <text transform="rotate(${(mid - 90).toFixed(2)} 200 200)" x="${v.huis ? 376 : 378}" y="200" dominant-baseline="middle" fill="${tk}" font-size="${v.huis ? 10 : 13}" font-weight="700" text-anchor="end" style="font-family:'DM Sans',system-ui,sans-serif">${v.kort}</text>`;
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
    const wiel = document.getElementById("rad-wiel");
    const snel = matchMedia("(prefers-reduced-motion: reduce)").matches;
    wiel.style.transition = snel ? "none" : "transform 5.2s cubic-bezier(.12,.75,.12,1)";
    wiel.style.transform = `rotate(${draai}deg)`;
    setTimeout(() => klaar(vak), snel ? 50 : 5300);
  }

  function klaar(vak) {
    bezig = false;
    const uit = document.getElementById("rad-uitslag"), knop = document.getElementById("rad-draai");
    knop.disabled = false;
    try { navigator.vibrate?.(vak.huis ? [80, 60, 80, 60, 200] : 60); } catch {}
    let tekst;
    if (vak.opnieuw) {
      if (vak.dubbel) verdubbelaar++;
      tekst = vak.tekst;
      uit.innerHTML = `<div class="rad-res">${tekst}</div>${verdubbelaar ? `<span class="rad-x">Verdubbelaar actief: ×${2 ** verdubbelaar}</span>` : ""}`;
      knop.textContent = "Nog een keer draaien";
    } else {
      const x = verdubbelaar ? 2 ** verdubbelaar : 1;
      tekst = x > 1 ? `${vak.tekst} <b class="rad-x">×${x}</b>` : vak.tekst;
      uit.innerHTML = `<div class="rad-res${vak.huis ? " huis" : ""}">${tekst}</div>${vak.huis ? `<p>Al het bier op tafel (behalve de pitchers)!</p>` : ""}`;
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
