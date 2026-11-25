/* =========================================================
   Wedstrijdposter: per wedstrijd een deelbare afbeelding (1080 x 1350)
   met de Kamelen tegenover iets van de tegenstander, datum, plek en de selectie.
   window.maakPoster(wedstrijd, { spelers }) -> Promise<canvas>
   ========================================================= */
(function () {
  const W = 1080, H = 1350;
  const ORANJE = "#f08c1c", INK = "#0e2233", ZAND = "#f6d9a8";
  const LEEUW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 60" width="960" height="600"><defs><linearGradient id="lwLijf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9973c"/><stop offset=".6" stop-color="#c47f2a"/><stop offset="1" stop-color="#a8641c"/></linearGradient><radialGradient id="lwManen" cx=".45" cy=".5" r=".6"><stop offset="0" stop-color="#6b2e0c"/><stop offset=".7" stop-color="#3f1806"/><stop offset="1" stop-color="#1e0a02"/></radialGradient></defs><path d="M20 27 Q8 24 6 12 Q5.5 8 9 6" stroke="#b8732a" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M9 6 q-5 -3 -2 -6 q2 2 4 0 q3 3 0 7 z" fill="#2a1004"/><g class="lw-achter"><path d="M26 34 L20 45 L15 52" stroke="#9c5c1a" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M10 52 q4 -3 9 0 v2 h-9 z" fill="#9c5c1a" stroke="#4e2408" stroke-width="1"/></g><g class="lw-voor"><path d="M56 35 L63 44 L67 51" stroke="#9c5c1a" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M63 51 q4 -3 9 0 v2 h-9 z" fill="#9c5c1a" stroke="#4e2408" stroke-width="1"/></g><path d="M16 26 Q20 16 38 17 Q52 17 60 22 L62 34 Q50 40 34 38 Q20 37 16 26 Z" fill="url(#lwLijf)" stroke="#5e2e0a" stroke-width="1.4"/><path d="M24 22 q4 -2 8 0 M34 21 q4 -2 8 0" stroke="#a8641c" stroke-width="1.2" fill="none" opacity=".7"/><g class="lw-achter2"><path d="M31 35 L29 46 L26 53" stroke="#c98a34" stroke-width="8" stroke-linecap="round" fill="none"/><path d="M21 53 q4 -3.5 10 0 v2 h-10 z" fill="#c98a34" stroke="#4e2408" stroke-width="1"/><path d="M22 55 l-1.5 2 M25 55 l-.5 2.4 M28 55 l.8 2.2" stroke="#f4ead2" stroke-width="1.1" stroke-linecap="round"/></g><g class="lw-voor2"><path d="M51 35 L53 46 L57 53" stroke="#c98a34" stroke-width="8" stroke-linecap="round" fill="none"/><path d="M53 53 q4 -3.5 10 0 v2 h-10 z" fill="#c98a34" stroke="#4e2408" stroke-width="1"/><path d="M60 55 l1.5 2 M63 54.6 l2 1.8 M57 55 l.6 2.3" stroke="#f4ead2" stroke-width="1.1" stroke-linecap="round"/></g><path d="M66 2 L70 8 L76 3 L77 10 L84 8 L82 15 L89 16 L84 21 L89 26 L82 28 L84 35 L77 33 L75 40 L70 35 L65 41 L62 34 L55 37 L57 30 L50 29 L55 24 L50 18 L57 17 L55 10 L62 11 Z" fill="url(#lwManen)" stroke="#120500" stroke-width="1.3" stroke-linejoin="round"/><path d="M63 22 Q63 13 72 13 Q82 13 83 21 Q84 29 74 31 Q64 31 63 22 Z" fill="#d9973c" stroke="#5e2e0a" stroke-width="1.2"/><path d="M76 19 Q84 18 88 22 L87.5 24.5 Q82 23 76 25 Z" fill="#e3ad5c" stroke="#5e2e0a" stroke-width="1"/><path d="M86 20.6 l2.6 1 -2.2 1.8 z" fill="#1a0a02"/><path d="M75.5 25 Q81 24 87.5 25 L86 31.5 Q80 34 75 29 Z" fill="#5a0d0d" stroke="#2a0404" stroke-width=".9"/><path d="M77 25.2 l1 3.6 1.2 -3.4 M83.4 25.1 l1 3.4 1 -3.3" fill="#fffbe8" stroke="#c9bfa0" stroke-width=".4"/><path d="M78.5 31.6 l1 -3 1 2.9 M83 31.2 l.9 -2.8 1 2.4" fill="#fffbe8" stroke="#c9bfa0" stroke-width=".4"/><path d="M70 15.4 L77.5 18.2" stroke="#1a0a02" stroke-width="2" stroke-linecap="round"/><path d="M71.5 18.6 Q74.5 17.2 77 19.4 Q74 20.6 71.5 18.6 Z" fill="#ffd21f" stroke="#1a0a02" stroke-width=".8"/><ellipse cx="74.6" cy="18.9" rx=".6" ry="1.2" fill="#1a0a02"/><path d="M66 14 l-1 -5 4 3 z" fill="#c47f2a" stroke="#3f1806" stroke-width=".9"/><path d="M68 25 q2 1 4 0 M67 27.5 q2 1 4 .2" stroke="#7a3c0e" stroke-width=".8" fill="none"/></svg>`;

  /* ---------- Tegenstanders: kleur, motief en een grap ---------- */
  const THEMA = [
    { test: /leeuwarden/i, naam: "Leeuwarden", kleur: "#1d4f9c", licht: "#3d73c4", motief: "leeuw", vlag: "fries", slogan: "DE KAMEEL TEMT DE LEEUW" },
    { test: /ghbs|gron|studs/i, naam: null, kleur: "#16613f", licht: "#2a8a5e", motief: "toren", slogan: "DE MARTINI ZAL BEVEN" },
    { test: /sneek|hcso/i, naam: null, kleur: "#1c5f8a", licht: "#3a86b8", motief: "zeil", slogan: "GEEN WIND IN DE ZEILEN" },
    { test: /eemsmond/i, naam: null, kleur: "#2b5d73", licht: "#4b8aa6", motief: "molen", slogan: "WIJ BLAZEN ZE WEG" },
    { test: /emmen/i, naam: null, kleur: "#7a2a2a", licht: "#a84646", motief: "olifant", slogan: "OLIFANTEN VERGETEN NIET" },
    { test: /daring/i, naam: null, kleur: "#4a2a7a", licht: "#6d48a8", motief: "bliksem", slogan: "WIE DURFT?" },
    { test: /./, naam: null, kleur: "#3a3f4a", licht: "#5b6170", motief: "duin", slogan: "DE KARAVAAN TREKT DOOR" }
  ];
  const themaVan = t => THEMA.find(x => x.test.test(t));
  const korteNaam = t => String(t).replace(/\s+(H|D|JO|MO)\d+.*$/i, "").replace(/^Gron\.?\s*/i, "Groningen ").trim();

  const laad = src => new Promise((ok, fout) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fout; i.src = src; });
  let fontKlaar = null;
  const fonts = () => fontKlaar || (fontKlaar = (async () => {
    try {
      const f1 = new FontFace("PosterBlack", "url(fonts/InterDisplay-BlackItalic.woff)", { style: "italic", weight: "900" });
      const f2 = new FontFace("PosterBold", "url(fonts/InterDisplay-Bold.woff)", { weight: "700" });
      await Promise.all([f1.load(), f2.load()]); document.fonts.add(f1); document.fonts.add(f2);
    } catch {}
  })());
  const ZWART = s => `italic 900 ${s}px PosterBlack, "Arial Black", Impact, sans-serif`;
  const VET = s => `700 ${s}px PosterBold, "Helvetica Neue", Arial, sans-serif`;

  /* tekst die in een breedte moet passen */
  function past(ctx, tekst, font, maxB, start) { let s = start; ctx.font = font(s); while (ctx.measureText(tekst).width > maxB && s > 10) { s -= 2; ctx.font = font(s); } return s; }
  function spatie(ctx, tekst, x, y, sp, uitlijn = "left") {
    const tw = [...tekst].reduce((a, c) => a + ctx.measureText(c).width + sp, -sp);
    let cx = uitlijn === "center" ? x - tw / 2 : uitlijn === "right" ? x - tw : x;
    ctx.textAlign = "left";
    for (const c of tekst) { ctx.fillText(c, cx, y); cx += ctx.measureText(c).width + sp; }
  }

  /* ---------- Motieven van de tegenstander ---------- */
  function friesHart(ctx, x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(0, 12); ctx.bezierCurveTo(-16, 0, -12, -14, 0, -6); ctx.bezierCurveTo(12, -14, 16, 0, 0, 12); ctx.fill(); ctx.restore();
  }
  function toren(ctx, x, y, s) {   // silhouet in de stijl van een kerktoren
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.beginPath();
    ctx.moveTo(-40, 0); ctx.lineTo(-40, -220); ctx.lineTo(-30, -230); ctx.lineTo(-30, -300); ctx.lineTo(-20, -310); ctx.lineTo(-20, -370); ctx.lineTo(-10, -380); ctx.lineTo(0, -440);
    ctx.lineTo(10, -380); ctx.lineTo(20, -370); ctx.lineTo(20, -310); ctx.lineTo(30, -300); ctx.lineTo(30, -230); ctx.lineTo(40, -220); ctx.lineTo(40, 0); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function zeil(ctx, x, y, s) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.beginPath(); ctx.moveTo(0, -300); ctx.lineTo(0, 0); ctx.lineTo(-150, 0); ctx.closePath(); ctx.moveTo(14, -280); ctx.lineTo(120, -10); ctx.lineTo(14, -10); ctx.closePath(); ctx.moveTo(-170, 20); ctx.lineTo(150, 20); ctx.lineTo(110, 60); ctx.lineTo(-140, 60); ctx.closePath(); ctx.fill(); ctx.restore(); }
  function molen(ctx, x, y, s) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillRect(-8, -300, 16, 300); ctx.translate(0, -300); for (let k = 0; k < 3; k++) { ctx.rotate(Math.PI * 2 / 3); ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(0, -190); ctx.lineTo(10, -10); ctx.closePath(); ctx.fill(); } ctx.restore(); }
  function bliksem(ctx, x, y, s) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.beginPath(); ctx.moveTo(20, -300); ctx.lineTo(-60, -110); ctx.lineTo(0, -110); ctx.lineTo(-30, 0); ctx.lineTo(70, -170); ctx.lineTo(10, -170); ctx.closePath(); ctx.fill(); ctx.restore(); }

  async function maakPoster(m, opt = {}) {
    await fonts();
    const wijThuis = /gchc/i.test(m.thuis), tegen = wijThuis ? m.uit : m.thuis, th = themaVan(tegen), tegenNaam = (th.naam || korteNaam(tegen)).toUpperCase();
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const ctx = cv.getContext("2d");
    const [logo, leeuw] = await Promise.all([laad("logo.png"), th.motief === "leeuw" ? laad("data:image/svg+xml;charset=utf-8," + encodeURIComponent(LEEUW)) : Promise.resolve(null)]);
    const SPLIT_T = 640, SPLIT_B = 440;   // schuine scheiding (x boven, x onder)

    /* ----- achtergrond: woestijn links, tegenstander rechts ----- */
    ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(SPLIT_T, 0); ctx.lineTo(SPLIT_B, H); ctx.lineTo(0, H); ctx.closePath(); ctx.clip();
    let g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#ffb347"); g.addColorStop(.45, ORANJE); g.addColorStop(1, "#9a3f0e"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    /* zon en duinen */
    g = ctx.createRadialGradient(230, 330, 20, 230, 330, 330); g.addColorStop(0, "rgba(255,240,190,.9)"); g.addColorStop(1, "rgba(255,240,190,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(120,45,10,.35)"; ctx.beginPath(); ctx.moveTo(0, 640); ctx.quadraticCurveTo(220, 560, 520, 650); ctx.lineTo(520, H); ctx.lineTo(0, H); ctx.fill();
    ctx.fillStyle = "rgba(90,30,5,.35)"; ctx.beginPath(); ctx.moveTo(0, 700); ctx.quadraticCurveTo(300, 640, 600, 720); ctx.lineTo(600, H); ctx.lineTo(0, H); ctx.fill();
    ctx.restore();

    ctx.save(); ctx.beginPath(); ctx.moveTo(SPLIT_T, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H); ctx.lineTo(SPLIT_B, H); ctx.closePath(); ctx.clip();
    g = ctx.createLinearGradient(SPLIT_B, 0, W, H); g.addColorStop(0, th.licht); g.addColorStop(1, th.kleur); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (th.vlag === "fries") {   // schuine banen en rode pompebl\u00eaden zoals in de Friese vlag
      ctx.save(); ctx.translate(760, 400); ctx.rotate(-.55);
      for (let k = -8; k < 9; k++) { ctx.fillStyle = k % 2 ? "rgba(255,255,255,.10)" : "rgba(255,255,255,0)"; ctx.fillRect(-1200, k * 70, 2400, 70); }
      ctx.restore();
      ctx.fillStyle = "rgba(220,40,50,.55)";
      [[1000, 300, 1.3, .2], [700, 330, 1, -.5], [1020, 560, 1.5, .1], [660, 610, .9, .4], [880, 650, 1.1, -.2], [1030, 1000, 1.2, .3], [600, 990, 1, -.1]].forEach(([x, y, s, r]) => friesHart(ctx, x, y, s * 2.2, r));
    } else {
      ctx.fillStyle = "rgba(255,255,255,.07)";
      for (let k = 0; k < 14; k++) ctx.fillRect(560 + k * 46, 0, 18, H);
    }
    /* motief achter de tegenstander */
    ctx.fillStyle = "rgba(0,0,0,.22)";
    if (th.motief === "toren") toren(ctx, 860, 690, 1.1);
    if (th.motief === "zeil") zeil(ctx, 860, 640, 1.2);
    if (th.motief === "molen") { molen(ctx, 800, 690, .9); molen(ctx, 980, 690, .7); }
    if (th.motief === "bliksem") bliksem(ctx, 860, 660, 1.4);
    ctx.restore();

    /* scheidingslijn met gloed */
    ctx.save(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 6; ctx.shadowColor = "rgba(255,255,255,.8)"; ctx.shadowBlur = 24;
    ctx.beginPath(); ctx.moveTo(SPLIT_T, 0); ctx.lineTo(SPLIT_B, H); ctx.stroke(); ctx.restore();

    /* ----- kop: MATCHDAY ----- */
    ctx.save(); ctx.fillStyle = "#fff"; ctx.font = ZWART(138); ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowOffsetY = 8; ctx.shadowBlur = 0;
    spatie(ctx, "MATCHDAY", W / 2, 180, 4, "center"); ctx.restore();
    ctx.save(); ctx.fillStyle = "rgba(14,34,51,.85)"; ctx.font = VET(26);
    spatie(ctx, `GCHC HEREN 13  \u00b7  ${wijThuis ? "THUISWEDSTRIJD" : "UITWEDSTRIJD"}`, W / 2, 232, 6, "center"); ctx.restore();

    /* ----- de twee kampen ----- */
    ctx.save(); ctx.shadowColor = "rgba(40,10,0,.55)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14;
    const lb = 470, lh = lb * logo.height / logo.width; ctx.drawImage(logo, 30, 300, lb, lh); ctx.restore();
    if (leeuw) {
      ctx.save(); ctx.shadowColor = "rgba(0,0,20,.55)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14;
      ctx.translate(1060, 0); ctx.scale(-1, 1); ctx.drawImage(leeuw, 0, 290, 500, 312); ctx.restore();
    } else {
      /* generiek: groot embleem met de beginletter van de tegenstander */
      ctx.save(); ctx.fillStyle = "rgba(255,255,255,.95)"; ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 24;
      ctx.beginPath(); ctx.arc(820, 450, 150, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.fillStyle = th.kleur; ctx.font = ZWART(170); ctx.textAlign = "center"; ctx.fillText(tegenNaam[0], 812, 510);
    }

    /* VS-embleem */
    ctx.save(); ctx.translate(548, 470);
    ctx.fillStyle = INK; ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 30; ctx.beginPath(); ctx.arc(0, 0, 96, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.lineWidth = 8; ctx.strokeStyle = "#fff"; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = ORANJE; ctx.beginPath(); ctx.arc(0, 0, 80, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = ZWART(104); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("VS", -4, 6);
    ctx.restore(); ctx.textBaseline = "alphabetic";

    /* ----- namen in een schuine balk ----- */
    ctx.save(); ctx.translate(0, 760); ctx.rotate(-.035);
    ctx.fillStyle = INK; ctx.fillRect(-20, -78, W + 40, 128);
    ctx.fillStyle = ORANJE; ctx.fillRect(-20, 50, W + 40, 10);
    let s = past(ctx, "KAMELEN", ZWART, 470, 104); ctx.fillStyle = ORANJE; ctx.font = ZWART(s); ctx.textAlign = "left"; ctx.fillText("KAMELEN", 44, 22);
    s = past(ctx, tegenNaam, ZWART, 480, 104); ctx.fillStyle = "#fff"; ctx.font = ZWART(s); ctx.textAlign = "right"; ctx.fillText(tegenNaam, W - 44, 22);
    ctx.restore();

    /* slogan */
    ctx.save(); ctx.fillStyle = "#fff"; ctx.font = ZWART(44); ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowOffsetY = 4;
    spatie(ctx, th.slogan, W / 2, 890, 3, "center"); ctx.restore();

    /* info: datum, tijd, plek */
    const dag = new Date(m.datum + "T12:00:00").toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "long" }).toUpperCase().replace(".", "");
    const plek = (m.accommodatie || (wijThuis ? "Paddepoel" : "")).toUpperCase() + (m.veld ? `  \u00b7  ${m.veld.replace(/\s*\(.*\)/, "").toUpperCase()}` : "");
    const delen = [dag, m.tijd || "TIJD VOLGT", plek].filter(Boolean);
    ctx.save(); ctx.font = VET(30); const blok = delen.join("    ");
    let bw = ctx.measureText(blok).width + 70; if (bw > W - 80) { ctx.font = VET(24); bw = ctx.measureText(blok).width + 60; }
    ctx.fillStyle = "rgba(255,255,255,.95)"; const by = 930;
    ctx.beginPath(); ctx.roundRect((W - bw) / 2, by, bw, 62, 31); ctx.fill();
    ctx.fillStyle = INK; ctx.textAlign = "center"; ctx.fillText(blok, W / 2, by + 41); ctx.restore();

    /* ----- selectie ----- */
    const sp = (opt.spelers || []).map(n => String(n).toUpperCase());
    const py = 1020, ph = 290;
    ctx.save(); ctx.fillStyle = "rgba(14,34,51,.88)"; ctx.beginPath(); ctx.roundRect(40, py, W - 80, ph, 26); ctx.fill();
    ctx.fillStyle = ORANJE; ctx.font = ZWART(34); ctx.textAlign = "left"; spatie(ctx, "SELECTIE", 76, py + 54, 4);
    if (opt.stand) { ctx.fillStyle = "rgba(255,255,255,.65)"; ctx.font = VET(22); ctx.textAlign = "right"; ctx.fillText(opt.stand, W - 76, py + 50); }
    if (sp.length) {
      const kol = sp.length > 12 ? 4 : 3, rij = Math.ceil(sp.length / kol), kw = (W - 152) / kol, rh = Math.min(48, (ph - 90) / rij);
      sp.forEach((n, i) => {
        const c = Math.floor(i / rij), r = i % rij, x = 76 + c * kw, y = py + 104 + r * rh;
        ctx.fillStyle = ORANJE; ctx.beginPath(); ctx.arc(x + 7, y - 9, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.textAlign = "left"; const fs = past(ctx, n, VET, kw - 34, Math.min(30, rh * .72)); ctx.font = VET(fs); ctx.fillText(n, x + 24, y);
      });
    } else { ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.font = VET(30); ctx.textAlign = "center"; ctx.fillText("De selectie volgt zodra de afmeldingen binnen zijn", W / 2, py + 170); }
    ctx.restore();

    return cv;
  }
  window.maakPoster = maakPoster;
})();
