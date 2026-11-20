/* Overwinningsmoment: na een gewonnen wedstrijd galoppeert de kameel één keer over het scherm.
   Proef: ?zege=proef (laat het meteen zien, met de laatste uitslag of een voorbeeld). */
(() => {
  const LIVE = false; // aan na akkoord: dan één keer per gewonnen wedstrijd, tot 4 dagen erna
  let proef = false;
  try { proef = new URLSearchParams(location.search).get("zege") === "proef"; } catch {}
  if (!LIVE && !proef) return;
  const rustig = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const laatsteZege = () => {
    try {
      const ons = (DATA.uitslagen || []).filter(m => isUs(m.thuis) || isUs(m.uit)).sort((a, b) => a.datum.localeCompare(b.datum));
      const m = ons[ons.length - 1]; if (!m) return null;
      const [a, b] = m.score.split("-").map(Number);
      const thuis = isUs(m.thuis), wij = thuis ? a : b, zij = thuis ? b : a;
      return { m, wij, zij, tegen: thuis ? m.uit : m.thuis, won: wij > zij };
    } catch { return null; }
  };

  const toon = (z) => {
    const el = document.createElement("div");
    el.className = "zege"; el.setAttribute("role", "status");
    el.innerHTML = `<div class="zege-tekst"><div class="zege-k">Gewonnen!</div>
        <div class="zege-score">${z.wij}–${z.zij}</div>
        <div class="zege-tegen">tegen ${String(z.tegen).replace(/[<>&"]/g, "")}</div></div>
      <div class="zege-baan"><img class="zege-kameel" src="logo.png" alt=""></div>
      ${proef ? `<div class="zege-proef">Proef · tik om te sluiten</div>` : ""}`;
    document.body.appendChild(el);
    const weg = () => { el.classList.add("weg"); setTimeout(() => el.remove(), 500); };
    el.addEventListener("click", weg);
    try { navigator.vibrate?.([30, 60, 30, 60, 120]); } catch {}
    if (rustig) { setTimeout(weg, 3500); return; }

    const baan = el.querySelector(".zege-baan"), kameel = el.querySelector(".zege-kameel");
    const B = innerWidth, duur = 2600;
    kameel.animate([{ transform: `translateX(-180px)` }, { transform: `translateX(${B + 40}px)` }], { duration: duur, easing: "cubic-bezier(.35,.05,.6,1)", fill: "forwards" });
    kameel.animate([
      { translate: "0 0", rotate: "0deg" }, { translate: "0 -16px", rotate: "-4deg" },
      { translate: "0 0", rotate: "2deg" }, { translate: "0 -10px", rotate: "-2deg" }, { translate: "0 0", rotate: "0deg" }
    ], { duration: 380, iterations: Infinity });
    /* stofwolkjes achter de kameel */
    const start = performance.now();
    const stof = setInterval(() => {
      const t = Math.min(1, (performance.now() - start) / duur);
      if (t >= 1) return clearInterval(stof);
      const x = kameel.getBoundingClientRect().left + 10;
      for (let i = 0; i < 2; i++) {
        const p = document.createElement("span"); p.className = "zege-stof";
        const s = 18 + Math.random() * 26; p.style.width = p.style.height = s + "px";
        p.style.left = (x + Math.random() * 30) + "px";
        baan.appendChild(p);
        p.animate([
          { transform: "translate(0,0) scale(.4)", opacity: .85 },
          { transform: `translate(${-40 - Math.random() * 70}px, ${-20 - Math.random() * 40}px) scale(1.6)`, opacity: 0 }
        ], { duration: 900 + Math.random() * 500, easing: "ease-out", fill: "forwards" }).onfinish = () => p.remove();
      }
    }, 70);
    setTimeout(() => { if (typeof schietConfetti === "function") schietConfetti(); }, 900);
    setTimeout(weg, 4200);
  };

  let pogingen = 0;
  const wacht = setInterval(() => {
    if (++pogingen > 40) return clearInterval(wacht);
    if (typeof DATA === "undefined" || !DATA.uitslagen) return;
    clearInterval(wacht);
    let z = laatsteZege();
    if (proef) {
      if (!z || !z.won) z = { wij: 3, zij: 1, tegen: z?.tegen || "Eemsmond H1", won: true };
      setTimeout(() => toon(z), 600);
      return;
    }
    if (!z || !z.won) return;
    const dagen = (Date.now() - new Date(z.m.datum).getTime()) / 864e5;
    if (dagen > 4) return;
    const sleutel = "kamelen-zege-" + z.m.datum + "-" + z.tegen;
    try { if (localStorage.getItem(sleutel)) return; localStorage.setItem(sleutel, "1"); } catch {}
    setTimeout(() => toon(z), 800);
  }, 400);
})();
