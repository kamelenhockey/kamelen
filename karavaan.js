/* Karavaanroute op Home: het seizoen als tocht door de woestijn
   (oase = winst, cactus = gelijk, zandstorm = verlies; de kameel staat bij de laatste uitslag) */
(() => {
  const esc = s => String(s).replace(/[<>&"]/g, "");

  /* ---------- Karavaanroute ---------- */
  const sec = document.getElementById("karavaan"); if (!sec) return;
  const ICOON = {
    zege: `<ellipse cx="0" cy="6" rx="14" ry="4.5" fill="#5fb3e0"/><path d="M-2 6 Q-4 -6 1 -18" stroke="#7a4a1e" stroke-width="3" fill="none" stroke-linecap="round"/><g fill="#2e9e4f"><path d="M1 -18 Q-10 -24 -16 -14 Q-8 -18 1 -16Z"/><path d="M1 -18 Q12 -24 17 -13 Q9 -18 1 -16Z"/><path d="M1 -18 Q-2 -30 -10 -30 Q-3 -25 0 -17Z"/><path d="M1 -18 Q6 -30 13 -28 Q6 -25 2 -17Z"/></g>`,
    gelijk: `<ellipse cx="0" cy="7" rx="11" ry="3" fill="rgba(140,95,30,.25)"/><path d="M-3 7 V-14 Q-3 -19 0 -19 Q3 -19 3 -14 V7 Z" fill="#4f9a45" stroke="#2f6b2a" stroke-width="1.6"/><path d="M-3 -2 H-8 Q-10 -2 -10 -5 V-10 Q-10 -12 -8.5 -12 Q-7 -12 -7 -10 V-5 H-3" fill="#4f9a45" stroke="#2f6b2a" stroke-width="1.6"/><path d="M3 -6 H8 Q10 -6 10 -9 V-13 Q10 -15 8.5 -15 Q7 -15 7 -13 V-9 H3" fill="#4f9a45" stroke="#2f6b2a" stroke-width="1.6"/><circle cx="0" cy="-19" r="2.2" fill="#f27da0"/>`,
    verlies: `<g fill="none" stroke="#b08850" stroke-linecap="round"><path d="M-13 -16 Q0 -21 13 -16" stroke-width="3.4"/><path d="M-10 -9 Q0 -13 10 -9" stroke-width="3"/><path d="M-7 -2 Q0 -5 7 -2" stroke-width="2.6"/><path d="M-4 4 Q0 2 4 4" stroke-width="2.2"/></g><circle cx="9" cy="-4" r="1.3" fill="#b08850"/><circle cx="-11" cy="1" r="1.1" fill="#b08850"/><circle cx="13" cy="-11" r="1" fill="#b08850"/>`
  };

  const teken = () => {
    if (typeof DATA === "undefined" || !DATA.uitslagen) return false;
    const ons = m => isUs(m.thuis) || isUs(m.uit);
    const gespeeld = (DATA.uitslagen || []).filter(ons).map(m => {
      const [a, b] = m.score.split("-").map(Number), th = isUs(m.thuis), wij = th ? a : b, zij = th ? b : a;
      return { m, wij, zij, soort: wij > zij ? "zege" : wij < zij ? "verlies" : "gelijk" };
    });
    const komend = (DATA.programma || []).filter(ons).map(m => ({ m, soort: "komt" }));
    const alle = [...gespeeld, ...komend].sort((a, b) => a.m.datum.localeCompare(b.m.datum));
    const totaal = Math.max(alle.length, ((DATA.stand || []).length - 1) * 2 || alle.length);
    while (alle.length < totaal) alle.push({ m: null, soort: "komt" });
    const N = alle.length; if (N < 2) return true;

    /* De winterstop krijgt extra ruimte op de route, zodat het bevroren stuk duidelijk te zien is */
    const isWinter = i => i > 0 && alle[i - 1].m && alle[i].m && (new Date(alle[i].m.datum) - new Date(alle[i - 1].m.datum)) / 864e5 > 45;
    const stap = alle.map((_, i) => i === 0 ? 0 : isWinter(i) ? 3 : 1), som = stap.reduce((a, b) => a + b, 0) || 1;
    const breedte = Math.max(sec.clientWidth, (som + 1) * 44), H = 210, mid = 112;
    let acc = 0;
    const pts = alle.map((_, i) => { acc += stap[i]; return [34 + acc * (breedte - 68) / som, mid + Math.sin(i * .85) * 42 + Math.sin(i * .31) * 12]; });
    const padTot = n => pts.slice(0, n).reduce((d, p, i) => {
      if (!i) return `M${p[0]} ${p[1]}`;
      const a = pts[i - 2] || pts[i - 1], b = pts[i - 1], c = p, e = pts[i + 1] || p;
      return d + ` C${b[0] + (c[0] - a[0]) / 6} ${b[1] + (c[1] - a[1]) / 6} ${c[0] - (e[0] - b[0]) / 6} ${c[1] - (e[1] - b[1]) / 6} ${c[0]} ${c[1]}`;
    }, "");
    const pad = padTot(N);
    const nGesp = gespeeld.length, volgende = nGesp; // index van de eerstvolgende etappe
    const wijPt = pts[Math.max(0, nGesp - 1)];

    /* winterstop: groot gat tussen twee wedstrijden */
    let winter = "";
    for (let i = 1; i < N; i++) {
      const a = alle[i - 1].m, b = alle[i].m; if (!a || !b) continue;
      if ((new Date(b.datum) - new Date(a.datum)) / 864e5 > 45) {
        /* Hetzelfde stukje route als in het pad, maar dan bevroren: ijsblauw, met rijp, ijspegels en sneeuwvlokjes */
        const p0 = pts[i - 2] || pts[i - 1], p1 = pts[i - 1], p2 = pts[i], p3 = pts[i + 1] || pts[i];
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
        const op = t => [0, 1].map(k => (1 - t) ** 3 * p1[k] + 3 * (1 - t) ** 2 * t * c1[k] + 3 * (1 - t) * t * t * c2[k] + t ** 3 * p2[k]);
        const stuk = `M${p1[0]} ${p1[1]} C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${p2[0]} ${p2[1]}`;
        const pegels = [.12, .22, .32, .42, .52, .62, .72, .82, .9].map((t, k) => { const [x, y] = op(t), l = 7 + (k % 3) * 3; return `<path d="M${(x - 2.6).toFixed(1)} ${(y + 2).toFixed(1)} L${x.toFixed(1)} ${(y + 2 + l).toFixed(1)} L${(x + 2.6).toFixed(1)} ${(y + 2).toFixed(1)}Z"/>`; }).join("");
        const vlok = [.2, .4, .62, .82].map((t, k) => { const [x, y] = op(t); return `<text x="${x.toFixed(1)}" y="${(y - 12 - (k % 2) * 8).toFixed(1)}" text-anchor="middle">❄</text>`; }).join("");
        /* Het label staat boven het ijs, ver genoeg rechts van de kameel (die bij de laatste uitslag staat) */
        const mx = Math.min(Math.max(op(.6)[0], p1[0] + 88), p2[0] - 20), ly = Math.min(p1[1], p2[1]) - 40;
        winter = `<g class="kr-winter">
          <path d="${stuk}" class="kr-ijs"/><path d="${stuk}" class="kr-rijp"/>
          <g class="kr-pegels">${pegels}</g><g class="kr-vlokken">${vlok}</g>
          <g transform="translate(${mx.toFixed(1)} ${ly.toFixed(1)})"><rect x="-46" y="-12" width="92" height="22" rx="11" class="kr-winter-pil"/><text class="kr-klein" text-anchor="middle" y="4">❄ Winterstop</text></g>
        </g>`;
      }
    }
    const stops = alle.map((s, i) => {
      const [x, y] = pts[i];
      const titel = s.m ? `${new Date(s.m.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}: ${esc(s.m.thuis)} – ${esc(s.m.uit)}${s.wij != null ? ` (${s.wij}–${s.zij})` : ""}` : "Nog te plannen";
      const sl = s.m && typeof matchSleutel === "function" ? matchSleutel(s.m) : "";
      const inhoud = s.soort === "komt"
        ? `<circle r="${i === volgende ? 7 : 5}" class="kr-punt${i === volgende ? " kr-volgende" : ""}"/>`
        : `<g transform="scale(.95)">${ICOON[s.soort]}</g>`;
      return `<g class="kr-stop" transform="translate(${x} ${y})" data-s="${esc(sl)}" tabindex="${sl ? 0 : -1}"><title>${titel}</title><circle r="16" fill="transparent"/>${inhoud}</g>`;
    }).join("");
    const eind = pts[N - 1];
    const vlagje = `<g transform="translate(${eind[0] + 4} ${eind[1] - 8})"><path d="M0 0 V-30" stroke="#163650" stroke-width="2.5"/><path d="M0 -30 h18 v12 h-18z" fill="#fff" stroke="#163650" stroke-width="1.5"/><path d="M0 -30h6v6h-6z M12 -30h6v6h-6z M6 -24h6v6h-6z" fill="#163650"/></g>`;
    const len = alle.filter(s => s.soort !== "komt").length;
    const tel = k => gespeeld.filter(s => s.soort === k).length;
    sec.querySelector(".kr-sub").textContent = `${len} van de ${N} etappes gereisd · ${tel("zege")} ${tel("zege") === 1 ? "oase" : "oases"}, ${tel("gelijk")} ${tel("gelijk") === 1 ? "cactus" : "cactussen"}, ${tel("verlies")} ${tel("verlies") === 1 ? "zandstorm" : "zandstormen"}`;
    const doek = sec.querySelector(".kr-doek");
    doek.innerHTML = `<svg width="${breedte}" height="${H}" viewBox="0 0 ${breedte} ${H}" role="img" aria-label="Karavaanroute van het seizoen">
      <path d="M0 ${H} Q${breedte * .2} ${H - 46} ${breedte * .45} ${H - 22} T${breedte} ${H - 30} V${H} Z" fill="rgba(201,150,80,.16)"/>
      <path d="${pad}" class="kr-pad-rest"/>
      ${nGesp > 1 ? `<path d="${padTot(nGesp)}" class="kr-pad-gereisd"/>` : ""}
      ${winter}${vlagje}${stops}
      <image href="logo.png" width="52" height="40" x="${wijPt[0] - 22}" y="${wijPt[1] - 60}" class="kr-kameel"/>
    </svg>`;
    doek.querySelectorAll(".kr-stop[data-s]").forEach(g => { if (!g.dataset.s) return;
      const open = () => window.openMatch?.(g.dataset.s); g.addEventListener("click", open); g.addEventListener("keydown", e => { if (e.key === "Enter") open(); }); });
    doek.scrollLeft = Math.max(0, wijPt[0] - doek.clientWidth / 2);
    return true;
  };
  let n = 0; const w = setInterval(() => { if (teken() || ++n > 40) clearInterval(w); }, 400);
  let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(teken, 200); });
})();
