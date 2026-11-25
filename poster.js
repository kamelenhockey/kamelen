/* =========================================================
   Wedstrijdposter (1080 x 1350): twee steden tegenover elkaar,
   de teams, een zinnetje, datum en tijd, en de selectie.
   window.maakPoster(wedstrijd, { spelers }) -> Promise<canvas>
   ========================================================= */
(function () {
  const W = 1080, H = 1350;
  const NACHT = "#0c1821", ORANJE = "#f29a2e", ROOM = "#f6ead7";

  /* Steden: foto (uit /steden, Wikimedia Commons), waar in de foto de toren staat, en de maker */
  const STAD = {
    groningen: { naam: "Groningen", foto: "steden/groningen-markt.jpg", fx: .37, fy: .32, door: "Uberprutser" },
    groningen2: { naam: "Groningen", foto: "steden/groningen.jpg", fx: .5, fy: .35, door: "Rudolphous" },
    leeuwarden: { naam: "Leeuwarden", foto: "steden/leeuwarden.jpg", fx: .56, fy: .3, door: "Gouwenaar" }
  };
  /* Tegenstanders: stad en een zinnetje */
  const TEGEN = [
    { test: /leeuwarden|daring/i, stad: "leeuwarden", zin: "Twee torens. Eén winnaar." },
    { test: /ghbs|studs|gron/i, stad: "groningen2", zin: "Stadsderby. Wie heeft de stad?" },
    { test: /sneek|hcso/i, stad: null, plaats: "Sneek", zin: "De wind waait vandaag uit de woestijn." },
    { test: /emmen/i, stad: null, plaats: "Emmen", zin: "Van de woestijn naar het Drentse zand." },
    { test: /eemsmond/i, stad: null, plaats: "Eemsmond", zin: "Van het wad naar de woestijn." },
    { test: /./, stad: null, plaats: "", zin: "De karavaan trekt door." }
  ];
  const korteNaam = t => String(t).replace(/\s+(H|D)\d+.*$/i, "").replace(/^Gron\.?\s*Studs/i, "Groningen Studs").trim();

  const laad = src => new Promise((ok, fout) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fout; i.src = src; });
  let fontKlaar = null;
  const fonts = () => fontKlaar || (fontKlaar = (async () => {
    const lijst = [
      ["PSerif", "fonts/DMSerifDisplay-Regular.woff", {}],
      ["PSerif", "fonts/DMSerifDisplay-Italic.woff", { style: "italic" }],
      ["PSans", "fonts/InterDisplay-SemiBold.woff", { weight: "600" }]
    ];
    await Promise.all(lijst.map(async ([n, u, o]) => { try { const f = new FontFace(n, `url(${u})`, o); await f.load(); document.fonts.add(f); } catch {} }));
  })());
  const SERIF = (s, it) => `${it ? "italic " : ""}${s}px PSerif, "DM Serif Display", Georgia, serif`;
  const SANS = s => `600 ${s}px PSans, "DM Sans", "Helvetica Neue", Arial, sans-serif`;

  function spatie(ctx, tekst, x, y, sp, uitlijn = "left") {
    const tw = [...tekst].reduce((a, c) => a + ctx.measureText(c).width + sp, -sp);
    let cx = uitlijn === "center" ? x - tw / 2 : uitlijn === "right" ? x - tw : x;
    ctx.textAlign = "left";
    for (const c of tekst) { ctx.fillText(c, cx, y); cx += ctx.measureText(c).width + sp; }
    return tw;
  }
  const breedte = (ctx, tekst, sp) => [...tekst].reduce((a, c) => a + ctx.measureText(c).width + sp, -sp);

  /* foto in een vak, met de toren in beeld (cover) en een kleurbehandeling */
  function foto(ctx, img, x, y, w, h, fx, fy, tint) {
    const s = Math.max(w / img.width, h / img.height) * 1.05;
    const iw = img.width * s, ih = img.height * s;
    let ox = x + w / 2 - fx * iw, oy = y + h * .42 - fy * ih;
    ox = Math.min(x, Math.max(x + w - iw, ox)); oy = Math.min(y, Math.max(y + h - ih, oy));
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.filter = "saturate(.55) contrast(1.12) brightness(.82)";
    ctx.drawImage(img, ox, oy, iw, ih); ctx.filter = "none";
    ctx.globalCompositeOperation = "soft-light"; ctx.fillStyle = tint; ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }

  async function maakPoster(m, opt = {}) {
    await fonts();
    const wijThuis = /gchc/i.test(m.thuis), tegen = wijThuis ? m.uit : m.thuis;
    const t = TEGEN.find(x => x.test.test(tegen)), zij = STAD[t.stad] || null;
    const ons = STAD.groningen;
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const ctx = cv.getContext("2d");
    const nr = 2 + (m.datum.split("-").reduce((a, b) => a + Number(b), 0) % 15);
    const [imgOns, imgZij, logo] = await Promise.all([
      laad(ons.foto).catch(() => null),
      laad(zij ? zij.foto : `woestijn/${nr}.jpg`).catch(() => null),
      laad("logo.png").catch(() => null)
    ]);

    /* ----- achtergrond ----- */
    ctx.fillStyle = NACHT; ctx.fillRect(0, 0, W, H);

    /* ----- twee foto's ----- */
    const FH = 860, GAP = 6, HALF = (W - GAP) / 2;
    const links = wijThuis ? imgOns : imgZij, rechts = wijThuis ? imgZij : imgOns;
    const fl = wijThuis ? ons : (zij || { fx: .5, fy: .5 }), fr = wijThuis ? (zij || { fx: .5, fy: .5 }) : ons;
    if (links) foto(ctx, links, 0, 0, HALF, FH, fl.fx, fl.fy, wijThuis ? "#f2a23a" : "#3a6fb0");
    if (rechts) foto(ctx, rechts, HALF + GAP, 0, HALF, FH, fr.fx, fr.fy, wijThuis ? "#3a6fb0" : "#f2a23a");
    /* donker verloop boven (voor de kop) en onder (naar de nacht) */
    let g = ctx.createLinearGradient(0, 0, 0, 260); g.addColorStop(0, "rgba(12,24,33,.88)"); g.addColorStop(1, "rgba(12,24,33,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 260);
    g = ctx.createLinearGradient(0, FH - 470, 0, FH); g.addColorStop(0, "rgba(12,24,33,0)"); g.addColorStop(.65, "rgba(12,24,33,.78)"); g.addColorStop(1, NACHT); ctx.fillStyle = g; ctx.fillRect(0, FH - 470, W, 470);
    /* vignet */
    g = ctx.createRadialGradient(W / 2, H * .38, H * .25, W / 2, H * .45, H * .85); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.45)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    /* ----- kop ----- */
    ctx.fillStyle = ROOM; ctx.font = SANS(22);
    spatie(ctx, "MATCHDAY", 64, 86, 7);
    spatie(ctx, "HEREN 13", W - 64, 86, 7, "right");
    if (logo) { const lw = 92, lh = lw * logo.height / logo.width; ctx.globalAlpha = .95; ctx.drawImage(logo, W / 2 - lw / 2, 38, lw, lh); ctx.globalAlpha = 1; }
    ctx.fillStyle = "rgba(246,234,215,.35)"; ctx.fillRect(64, 104, 150, 1.5); ctx.fillRect(W - 214, 104, 150, 1.5);

    /* ----- teams ----- */
    const thuisNaam = wijThuis ? "Kamelen" : korteNaam(tegen), uitNaam = wijThuis ? korteNaam(tegen) : "Kamelen";
    const stadL = wijThuis ? "GRONINGEN" : (zij ? zij.naam : t.plaats || "").toUpperCase(), stadR = wijThuis ? (zij ? zij.naam : t.plaats || "").toUpperCase() : "GRONINGEN";
    const NY = 760;
    let s = 112; ctx.font = SERIF(s); while (Math.max(ctx.measureText(thuisNaam).width, ctx.measureText(uitNaam).width) > 430 && s > 60) { s -= 4; ctx.font = SERIF(s); }
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 24;
    ctx.fillStyle = wijThuis ? ORANJE : ROOM; ctx.textAlign = "left"; ctx.fillText(thuisNaam, 64, NY);
    ctx.fillStyle = wijThuis ? ROOM : ORANJE; ctx.textAlign = "right"; ctx.fillText(uitNaam, W - 64, NY);
    ctx.restore();
    ctx.fillStyle = "rgba(246,234,215,.7)"; ctx.font = SANS(20);
    spatie(ctx, stadL, 68, NY + 44, 6); spatie(ctx, stadR, W - 68, NY + 44, 6, "right");
    /* vs in het midden */
    ctx.fillStyle = ROOM; ctx.font = SERIF(54, true); ctx.textAlign = "center"; ctx.fillText("vs", W / 2, NY - 22);

    /* ----- zinnetje ----- */
    ctx.fillStyle = ORANJE; ctx.font = SERIF(46, true); ctx.textAlign = "center";
    ctx.fillText(t.zin, W / 2, 935);

    /* ----- datum en tijd ----- */
    const dag = new Date(m.datum + "T12:00:00").toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" }).toUpperCase();
    const regel = `${dag}   ·   ${m.tijd || "TIJD VOLGT"}`;
    ctx.fillStyle = ROOM; ctx.font = SANS(28);
    const rb = breedte(ctx, regel, 5); spatie(ctx, regel, W / 2, 1010, 5, "center");
    ctx.fillStyle = "rgba(246,234,215,.3)"; ctx.fillRect(64, 1000, (W - rb) / 2 - 64 - 28, 1.5); ctx.fillRect(W / 2 + rb / 2 + 28, 1000, (W - rb) / 2 - 64 - 28, 1.5);

    /* ----- selectie ----- */
    const sp = (opt.spelers || []).map(n => String(n).toUpperCase());
    ctx.fillStyle = ORANJE; ctx.font = SANS(20); spatie(ctx, "SELECTIE", W / 2, 1078, 8, "center");
    if (sp.length) {
      const kol = 4, rij = Math.ceil(sp.length / kol), kw = (W - 128) / kol, rh = Math.min(44, 190 / rij);
      ctx.fillStyle = ROOM;
      sp.forEach((n, i) => {
        const c = i % kol, r = Math.floor(i / kol), x = 64 + c * kw + kw / 2, y = 1130 + r * rh;
        let fs = 25; ctx.font = SANS(fs); while (breedte(ctx, n, 3) > kw - 16 && fs > 14) { fs--; ctx.font = SANS(fs); }
        spatie(ctx, n, x, y, 3, "center");
      });
    } else { ctx.fillStyle = "rgba(246,234,215,.7)"; ctx.font = SERIF(34, true); ctx.textAlign = "center"; ctx.fillText("De selectie volgt.", W / 2, 1160); }

    /* ----- voet: fotomakers ----- */
    const makers = [wijThuis ? ons : zij, wijThuis ? zij : ons].filter(Boolean).map(x => x.door);
    ctx.fillStyle = "rgba(246,234,215,.32)"; ctx.font = SANS(14); ctx.textAlign = "center";
    ctx.fillText(makers.length ? `Foto's: ${makers.join(", ")} · Wikimedia Commons (CC BY-SA)` : "", W / 2, H - 26);

    /* ----- filmkorrel ----- */
    const korrel = ctx.getImageData(0, 0, W, H), d = korrel.data;
    for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - .5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    ctx.putImageData(korrel, 0, 0);
    return cv;
  }
  window.maakPoster = maakPoster;
})();
