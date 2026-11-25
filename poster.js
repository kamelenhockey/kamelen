/* =========================================================
   Wedstrijdposter in retrostijl (1080 x 1350):
   zonnestralen, 70s-strepen, twee steden in boogramen,
   dikke retroletters, datum op een kaartje en de selectie.
   window.maakPoster(wedstrijd, { spelers }) -> Promise<canvas>
   ========================================================= */
(function () {
  const W = 1080, H = 1350;
  const PAPIER = "#f2e4c6", BRUIN = "#2b1a10", ROEST = "#c8461b", ORANJE = "#ee8a1d", MOSTERD = "#f2b53a", ZAND = "#e8cf9f";

  /* Steden: foto uit /steden (Wikimedia Commons), waar het onderwerp staat, en de maker */
  const STAD = {
    groningen: { naam: "Groningen", foto: "steden/groningen-markt.jpg", fx: .37, fy: .3, door: "Uberprutser" },
    groningen2: { naam: "Groningen", foto: "steden/groningen.jpg", fx: .5, fy: .32, door: "Rudolphous" },
    studs: { naam: "Groningen", foto: "steden/groningen-studs.jpg", fx: .5, fy: .45, door: "Wutsje" },
    leeuwarden: { naam: "Leeuwarden", foto: "steden/leeuwarden.jpg", fx: .56, fy: .28, door: "Gouwenaar" },
    sneek: { naam: "Sneek", foto: "steden/sneek.jpg", fx: .5, fy: .4, door: "Michielverbeek" },
    veendam: { naam: "Veendam", foto: "steden/veendam.jpg", fx: .5, fy: .45, door: "" },
    uithuizen: { naam: "Uithuizen", foto: "steden/uithuizen.jpg", fx: .5, fy: .4, door: "DrTW" },
    emmen: { naam: "Emmen", foto: "steden/emmen.jpg", fx: .45, fy: .45, door: "Richard Broekhuijzen" }
  };
  const TEGEN = [
    { test: /leeuwarden/i, stad: "leeuwarden", zin: "Twee torens, één winnaar" },
    { test: /studs/i, stad: "studs", zin: "Studenten tegen de woestijn" },
    { test: /ghbs/i, stad: "groningen2", zin: "Stadsderby: wie heeft de stad?" },
    { test: /sneek|hcso/i, stad: "sneek", zin: "Door de Waterpoort, de woestijn in" },
    { test: /daring/i, stad: "veendam", zin: "Wie durft, wint" },
    { test: /eemsmond/i, stad: "uithuizen", zin: "Van het wad naar de woestijn" },
    { test: /emmen/i, stad: "emmen", zin: "Van het Drentse zand naar ons zand" },
    { test: /./, stad: null, zin: "De karavaan trekt door" }
  ];
  const korteNaam = t => String(t).replace(/\s+(H|D)\d+.*$/i, "").replace(/^Gron\.?\s*Studs/i, "Studs").trim();

  const laad = src => new Promise((ok, fout) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fout; i.src = src; });
  let fontKlaar = null;
  const fonts = () => fontKlaar || (fontKlaar = Promise.all([
    ["PRetro", "fonts/Shrikhand-Regular.woff"], ["PSlab", "fonts/AlfaSlabOne-Regular.woff"], ["PSans", "fonts/InterDisplay-SemiBold.woff"]
  ].map(async ([n, u]) => { try { const f = new FontFace(n, `url(${u})`); await f.load(); document.fonts.add(f); } catch {} })));
  const RETRO = s => `${s}px PRetro, "Cooper Black", Georgia, serif`;
  const SLAB = s => `${s}px PSlab, Rockwell, Georgia, serif`;
  const SANS = s => `600 ${s}px PSans, "Helvetica Neue", Arial, sans-serif`;

  const breedte = (ctx, t, sp) => [...t].reduce((a, c) => a + ctx.measureText(c).width + sp, -sp);
  function spatie(ctx, tekst, x, y, sp, uitlijn = "left") {
    let cx = uitlijn === "center" ? x - breedte(ctx, tekst, sp) / 2 : uitlijn === "right" ? x - breedte(ctx, tekst, sp) : x;
    ctx.textAlign = "left"; for (const c of tekst) { ctx.fillText(c, cx, y); cx += ctx.measureText(c).width + sp; }
  }
  /* retro tekst: dikke donkere rand + verschoven schaduw */
  function retroTekst(ctx, tekst, x, y, font, vul, schaduw = BRUIN, uitlijn = "center", diepte = 8) {
    ctx.font = font; ctx.textAlign = uitlijn; ctx.lineJoin = "round";
    for (let d = diepte; d > 0; d--) { ctx.fillStyle = schaduw; ctx.fillText(tekst, x + d, y + d); }
    ctx.lineWidth = 10; ctx.strokeStyle = BRUIN; ctx.strokeText(tekst, x, y);
    ctx.fillStyle = vul; ctx.fillText(tekst, x, y);
  }
  function boog(ctx, x, y, w, h) { const r = w / 2; ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + r); ctx.arc(x + r, y + r, r, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath(); }

  /* foto als duotoon met rasterpuntjes in een boograam */
  function raamFoto(ctx, img, x, y, w, h, fx, fy, licht) {
    ctx.save(); boog(ctx, x, y, w, h); ctx.clip();
    ctx.fillStyle = ZAND; ctx.fillRect(x, y, w, h);
    if (img) {
      const s = Math.max(w / img.width, h / img.height) * 1.06, iw = img.width * s, ih = img.height * s;
      let ox = x + w / 2 - fx * iw, oy = y + h * .45 - fy * ih;
      ox = Math.min(x, Math.max(x + w - iw, ox)); oy = Math.min(y, Math.max(y + h - ih, oy));
      /* duotoon: grijs, dan donkerbruin in de schaduwen en een warme kleur in het licht */
      const tmp = document.createElement("canvas"); tmp.width = w; tmp.height = h; const t = tmp.getContext("2d");
      t.filter = "grayscale(1) contrast(1.35) brightness(1.08)"; t.drawImage(img, ox - x, oy - y, iw, ih); t.filter = "none";
      const px = t.getImageData(0, 0, w, h), d = px.data;
      const a = [0x2b, 0x1a, 0x10], b = licht;
      for (let i = 0; i < d.length; i += 4) { const v = d[i] / 255; d[i] = a[0] + (b[0] - a[0]) * v; d[i + 1] = a[1] + (b[1] - a[1]) * v; d[i + 2] = a[2] + (b[2] - a[2]) * v; }
      t.putImageData(px, 0, 0);
      ctx.drawImage(tmp, x, y);
      /* rasterpuntjes */
      ctx.fillStyle = "rgba(43,26,16,.16)";
      for (let yy = y; yy < y + h; yy += 7) for (let xx = x + ((yy / 7) % 2) * 3.5; xx < x + w; xx += 7) { ctx.beginPath(); ctx.arc(xx, yy, 1.3, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
    ctx.save(); ctx.lineWidth = 9; ctx.strokeStyle = BRUIN; boog(ctx, x, y, w, h); ctx.stroke(); ctx.restore();
  }

  async function maakPoster(m, opt = {}) {
    await fonts();
    const wijThuis = /gchc/i.test(m.thuis), tegen = wijThuis ? m.uit : m.thuis;
    const t = TEGEN.find(x => x.test.test(tegen)), zij = STAD[t.stad] || null, ons = STAD.groningen;
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const ctx = cv.getContext("2d");
    const nr = 2 + (m.datum.split("-").reduce((a, b) => a + Number(b), 0) % 15);
    const [imgOns, imgZij, logo] = await Promise.all([laad(ons.foto).catch(() => null), laad(zij ? zij.foto : `woestijn/${nr}.jpg`).catch(() => null), laad("logo.png").catch(() => null)]);

    /* ----- papier ----- */
    ctx.fillStyle = PAPIER; ctx.fillRect(0, 0, W, H);
    /* zonnestralen vanuit het midden */
    ctx.save(); ctx.translate(W / 2, 560); ctx.fillStyle = "rgba(232,190,120,.45)";
    for (let k = 0; k < 36; k += 2) { const a1 = k / 36 * Math.PI * 2, a2 = (k + 1) / 36 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a1) * 1400, Math.sin(a1) * 1400); ctx.lineTo(Math.cos(a2) * 1400, Math.sin(a2) * 1400); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    /* 70s-strepen dwars achter de ramen */
    [ROEST, ORANJE, MOSTERD, BRUIN].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, 470 + i * 34, W, 34); });

    /* ----- kop ----- */
    retroTekst(ctx, "MATCHDAY", W / 2, 158, SLAB(124), PAPIER, ROEST, "center", 9);
    ctx.fillStyle = BRUIN; ctx.font = SANS(24); spatie(ctx, `★  GCHC HEREN 13  ★  ${wijThuis ? "THUIS" : "UIT"}  ★`, W / 2, 214, 6, "center");

    /* ----- twee boogramen met de steden ----- */
    const RW = 420, RH = 500, RY = 250;
    const fl = wijThuis ? ons : (zij || { fx: .5, fy: .5 }), fr = wijThuis ? (zij || { fx: .5, fy: .5 }) : ons;
    const imgL = wijThuis ? imgOns : imgZij, imgR = wijThuis ? imgZij : imgOns;
    ctx.fillStyle = BRUIN; boog(ctx, 72 + 14, RY + 14, RW, RH); ctx.fill(); boog(ctx, W - 72 - RW + 14, RY + 14, RW, RH); ctx.fill();
    raamFoto(ctx, imgL, 72, RY, RW, RH, fl.fx, fl.fy, wijThuis ? [0xf6, 0xc3, 0x6a] : [0xf2, 0xe4, 0xc6]);
    raamFoto(ctx, imgR, W - 72 - RW, RY, RW, RH, fr.fx, fr.fy, wijThuis ? [0xf2, 0xe4, 0xc6] : [0xf6, 0xc3, 0x6a]);
    /* stadsnaam onderin elk raam */
    const stadL = (wijThuis ? "Groningen" : (zij ? zij.naam : "")).toUpperCase(), stadR = (wijThuis ? (zij ? zij.naam : "") : "Groningen").toUpperCase();
    ctx.font = SLAB(26); [[stadL, 72 + RW / 2], [stadR, W - 72 - RW / 2]].forEach(([s, x]) => { if (!s) return;
      const bw = breedte(ctx, s, 4) + 36; ctx.fillStyle = BRUIN; ctx.beginPath(); ctx.roundRect(x - bw / 2, RY + RH - 62, bw, 44, 22); ctx.fill(); ctx.fillStyle = PAPIER; spatie(ctx, s, x, RY + RH - 31, 4, "center"); });

    /* vs-badge tussen de ramen */
    ctx.save(); ctx.translate(W / 2, RY + 330);
    ctx.fillStyle = BRUIN; ctx.beginPath(); ctx.arc(7, 7, 74, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = MOSTERD; ctx.beginPath(); ctx.arc(0, 0, 74, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = BRUIN; ctx.stroke();
    ctx.setLineDash([6, 7]); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 58, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = BRUIN; ctx.font = RETRO(64); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("vs", 0, 4); ctx.textBaseline = "alphabetic";
    ctx.restore();

    /* ----- teams ----- */
    const thuisNaam = wijThuis ? "Kamelen" : korteNaam(tegen), uitNaam = wijThuis ? korteNaam(tegen) : "Kamelen";
    let s = 104; ctx.font = RETRO(s); while (Math.max(ctx.measureText(thuisNaam).width, ctx.measureText(uitNaam).width) > 440 && s > 56) { s -= 4; ctx.font = RETRO(s); }
    retroTekst(ctx, thuisNaam, 72 + RW / 2, 870, RETRO(s), wijThuis ? ORANJE : PAPIER, BRUIN, "center", 7);
    retroTekst(ctx, uitNaam, W - 72 - RW / 2, 870, RETRO(s), wijThuis ? PAPIER : ORANJE, BRUIN, "center", 7);

    /* ----- zinnetje ----- */
    ctx.fillStyle = ROEST; ctx.font = RETRO(44); ctx.textAlign = "center"; ctx.fillText(t.zin, W / 2, 950);

    /* ----- datum op een kaartje ----- */
    const dag = new Date(m.datum + "T12:00:00").toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" }).toUpperCase();
    const regel = `${dag}  ★  ${m.tijd || "TIJD VOLGT"}`;
    ctx.font = SLAB(34); const kb = breedte(ctx, regel, 3) + 110, kx = (W - kb) / 2, ky = 985, kh = 74;
    const kaart = (dx, dy) => { ctx.beginPath(); ctx.moveTo(kx + dx, ky + dy); ctx.lineTo(kx + kb + dx, ky + dy); ctx.lineTo(kx + kb - 30 + dx, ky + kh / 2 + dy); ctx.lineTo(kx + kb + dx, ky + kh + dy); ctx.lineTo(kx + dx, ky + kh + dy); ctx.lineTo(kx + 30 + dx, ky + kh / 2 + dy); ctx.closePath(); ctx.fill(); };
    ctx.fillStyle = ROEST; kaart(8, 8); ctx.fillStyle = BRUIN; kaart(0, 0);
    ctx.fillStyle = PAPIER; spatie(ctx, regel, W / 2, ky + 49, 3, "center");

    /* ----- selectie ----- */
    const sp = (opt.spelers || []).map(n => String(n).toUpperCase());
    ctx.fillStyle = BRUIN; ctx.font = RETRO(38); ctx.textAlign = "center"; ctx.fillText("De selectie", W / 2, 1112);
    ctx.fillRect(W / 2 - 170 - 150, 1100, 150, 3); ctx.fillRect(W / 2 + 170, 1100, 150, 3);
    /* kameeltjes die naar de selectie lopen */
    if (logo) { const lw = 96, lh = lw * logo.height / logo.width; ctx.drawImage(logo, W / 2 - 170 - 150 - lw - 6, 1104 - lh + 8, lw, lh);
      ctx.save(); ctx.translate(W / 2 + 170 + 150 + lw + 6, 0); ctx.scale(-1, 1); ctx.drawImage(logo, 0, 1104 - lh + 8, lw, lh); ctx.restore(); }
    if (sp.length) {
      const kol = 4, rij = Math.ceil(sp.length / kol), kw = (W - 140) / kol, rh = Math.min(37, 140 / rij);
      sp.forEach((n, i) => { const x = 70 + (i % kol) * kw + kw / 2, y = 1158 + Math.floor(i / kol) * rh;
        let fs = 26; ctx.font = SLAB(fs); while (breedte(ctx, n, 2) > kw - 12 && fs > 14) { fs--; ctx.font = SLAB(fs); }
        ctx.fillStyle = BRUIN; spatie(ctx, n, x, y, 2, "center"); });
    } else { ctx.fillStyle = BRUIN; ctx.font = SLAB(30); ctx.textAlign = "center"; ctx.fillText("VOLGT ZODRA DE AFMELDINGEN BINNEN ZIJN", W / 2, 1200); }

    /* ----- lijst eromheen ----- */
    ctx.lineWidth = 14; ctx.strokeStyle = BRUIN; ctx.beginPath(); ctx.roundRect(20, 20, W - 40, H - 40, 30); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(38, 38, W - 76, H - 76, 20); ctx.stroke();
    const makers = [ons, zij].filter(x => x && x.door).map(x => x.door);
    if (makers.length) { ctx.fillStyle = "rgba(43,26,16,.55)"; ctx.font = SANS(13); ctx.textAlign = "center"; ctx.fillText(`Foto's: ${makers.join(", ")} · Wikimedia Commons (CC BY-SA)`, W / 2, H - 52); }

    /* ----- papierkorrel en vergeelde randen ----- */
    const korrel = ctx.getImageData(0, 0, W, H), d = korrel.data;
    for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - .5) * 22; d[i] += n; d[i + 1] += n; d[i + 2] += n * .8; }
    ctx.putImageData(korrel, 0, 0);
    const g = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .8); g.addColorStop(0, "rgba(120,70,20,0)"); g.addColorStop(1, "rgba(120,70,20,.22)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    return cv;
  }
  window.maakPoster = maakPoster;
})();
