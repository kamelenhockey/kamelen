/* Uitslagmoment na een wedstrijd van de Kamelen, één keer per wedstrijd per toestel, tot 4 dagen erna.
   - gewonnen: de kameel galoppeert met stofwolken over het scherm, confetti
   - verloren: de kameel sjokt met hangende kop over het scherm, regenwolkje erboven
   Proef: ?zege=proef of ?verlies=proef (laat het meteen zien, zonder iets te onthouden). */
(() => {
  let proef = null;
  try {
    const q = new URLSearchParams(location.search);
    proef = q.get("zege") === "proef" ? "zege" : q.get("verlies") === "proef" ? "verlies" : null;
  } catch {}
  const rustig = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = s => String(s).replace(/[<>&"]/g, "");

  const laatste = () => {
    try {
      const ons = (DATA.uitslagen || []).filter(m => isUs(m.thuis) || isUs(m.uit)).sort((a, b) => a.datum.localeCompare(b.datum));
      const m = ons[ons.length - 1]; if (!m) return null;
      const [a, b] = m.score.split("-").map(Number); if (isNaN(a) || isNaN(b)) return null;
      const thuis = isUs(m.thuis), wij = thuis ? a : b, zij = thuis ? b : a;
      return { m, wij, zij, tegen: thuis ? m.uit : m.thuis, soort: wij > zij ? "zege" : wij < zij ? "verlies" : "gelijk" };
    } catch { return null; }
  };

  const toon = (z) => {
    const zege = z.soort === "zege";
    const el = document.createElement("div");
    el.className = "zege" + (zege ? "" : " verlies"); el.setAttribute("role", "status");
    el.innerHTML = `<div class="zege-tekst"><div class="zege-k">${zege ? "Gewonnen!" : "Verloren"}</div>
        <div class="zege-score">${z.wij}–${z.zij}</div>
        <div class="zege-tegen">tegen ${esc(z.tegen)}${zege ? "" : "<br>Kop op, volgende keer beter"}</div></div>
      <div class="zege-baan"><div class="zege-loper">${zege ? "" : `<svg class="zege-wolk" viewBox="0 0 120 60" aria-hidden="true"><path d="M28 52 Q8 52 8 38 Q8 24 24 24 Q28 8 46 8 Q62 8 68 20 Q76 14 88 18 Q104 22 104 36 Q116 38 114 48 Q112 54 100 54 Z" fill="#9aa7b4" stroke="#6d7b88" stroke-width="3"/></svg>`}<img class="zege-kameel" src="logo.png" alt=""></div></div>
      <div class="zege-proef">${proef ? "Proef · " : ""}tik om te sluiten</div>`;
    document.body.appendChild(el);
    let klaar = false;
    const weg = () => { if (klaar) return; klaar = true; el.classList.add("weg"); setTimeout(() => el.remove(), 500); };
    el.addEventListener("click", weg);
    try { navigator.vibrate?.(zege ? [30, 60, 30, 60, 120] : [200]); } catch {}
    if (rustig) { setTimeout(weg, 3800); return; }

    const baan = el.querySelector(".zege-baan"), loper = el.querySelector(".zege-loper"), kameel = el.querySelector(".zege-kameel");
    const B = innerWidth, duur = zege ? 2600 : 5200;
    loper.animate([{ transform: `translateX(-190px)` }, { transform: `translateX(${B + 40}px)` }],
      { duration: duur, easing: zege ? "cubic-bezier(.35,.05,.6,1)" : "linear", fill: "forwards" });
    if (zege) {
      kameel.animate([
        { translate: "0 0", rotate: "0deg" }, { translate: "0 -16px", rotate: "-4deg" },
        { translate: "0 0", rotate: "2deg" }, { translate: "0 -10px", rotate: "-2deg" }, { translate: "0 0", rotate: "0deg" }
      ], { duration: 380, iterations: Infinity });
    } else {
      kameel.animate([{ translate: "0 0" }, { translate: "0 3px" }, { translate: "0 0" }], { duration: 900, iterations: Infinity, easing: "ease-in-out" });
    }
    const start = performance.now();
    const deeltjes = setInterval(() => {
      if (performance.now() - start > duur || klaar) return clearInterval(deeltjes);
      if (zege) {
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
      } else {
        const d = document.createElement("span"); d.className = "zege-drup";
        d.style.left = (95 + Math.random() * 70) + "px";
        loper.appendChild(d);
        d.animate([{ transform: "translateY(0)", opacity: .9 }, { transform: "translateY(120px)", opacity: 0 }],
          { duration: 650, easing: "ease-in", fill: "forwards" }).onfinish = () => d.remove();
      }
    }, zege ? 70 : 55);
    if (zege) setTimeout(() => { if (typeof schietConfetti === "function") schietConfetti(); }, 900);
    setTimeout(weg, zege ? 4200 : 5600);
  };

  let pogingen = 0;
  const wacht = setInterval(() => {
    if (++pogingen > 40) return clearInterval(wacht);
    if (typeof DATA === "undefined" || !DATA.uitslagen) return;
    clearInterval(wacht);
    let z = laatste();
    if (proef) {
      if (!z || z.soort !== proef) z = proef === "zege" ? { wij: 3, zij: 1, tegen: z?.tegen || "Eemsmond H1", soort: "zege" } : { wij: 1, zij: 3, tegen: z?.tegen || "Eemsmond H1", soort: "verlies" };
      setTimeout(() => toon(z), 1200);
      return;
    }
    if (!z || z.soort === "gelijk") return;
    if (document.documentElement.classList.contains("op-slot")) return;
    const dagen = (Date.now() - new Date(z.m.datum).getTime()) / 864e5;
    if (dagen > 4 || dagen < 0) return;
    const sleutel = "kamelen-uitslagmoment-" + z.m.datum + "-" + z.tegen;
    try { if (localStorage.getItem(sleutel)) return; localStorage.setItem(sleutel, "1"); } catch { return; }
    setTimeout(() => toon(z), 1200);
  }, 400);
})();
