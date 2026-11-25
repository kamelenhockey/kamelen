/* =========================================================
   Wedstrijdposter (1080 x 1350), filmisch en minimaal:
   één beeld per wedstrijd (steeds een ander idee), donker
   gegradeerd, grote gespatieerde letters "KAM VS LWD",
   de selectie en onderaan datum | plek | competitie.
   window.maakPoster(wedstrijd, { spelers, ronde }) -> Promise<canvas>
   ========================================================= */
(function () {
  const W = 1080, H = 1350;
  const WIT = "#f4efe6", ZAND = "#d9b27c", MUTED = "rgba(244,239,230,.62)";

  /* Foto's uit /steden (Wikimedia Commons): bestand, focuspunt, maker */
  const FOTO = {
    martini: { src: "steden/groningen.jpg", fx: .39, fy: .32, door: "Rudolphous" },
    markt: { src: "steden/groningen-markt.jpg", fx: .37, fy: .3, door: "Uberprutser" },
    oldehove: { src: "steden/leeuwarden-staand.jpg", fx: .45, fy: .3, door: "Gouwenaar" },
    plantsoen: { src: "steden/groningen-studs.jpg", fx: .55, fy: .4, door: "Wutsje" },
    waterpoort: { src: "steden/sneek.jpg", fx: .5, fy: .35, door: "Michielverbeek" },
    kameel: { src: "steden/kameel.jpg", fx: .42, fy: .42, breed: 1.35, door: "Skander Zarrad" },
    karavaan: { src: "steden/kameel-woestijn.jpg", fx: .55, fy: .55, door: "ASC Leiden" },
    wind: { src: "steden/eemshaven.jpg", fx: .42, fy: .4, door: "Uberprutser" },
    parkeren: { src: "steden/stadskanaal.jpg", fx: .5, fy: .4, door: "Donald Trung" },
    senaat: { src: "steden/vindicat.jpg", fx: .5, fy: .45, door: "Rijksmuseum", crop: [.19, .556, .81, .869] },
    emmen: { src: "steden/emmen.jpg", fx: .45, fy: .5, door: "Richard Broekhuijzen" },
    flat: { src: "steden/emmen-a.jpg", fx: .5, fy: .35, door: "A. J. van der Wal" },
    toren: { src: "steden/skanaal-d.jpg", fx: .5, fy: .42, door: "Mr. Documents Uploader" },
    stootblok: { src: "steden/delfzijl-a.jpg", fx: .42, fy: .55, door: "Hardscarf" },
    kerkstraat: { src: "steden/veendam-b.jpg", fx: .45, fy: .4, door: "Anthony Ruijtenbeek" },
    museum: { src: "steden/gron-a.jpg", fx: .3, fy: .5, door: "C messier" },
    vismarkt: { src: "steden/gron-c.jpg", fx: .45, fy: .5, door: "C messier" },
    olifant: { src: "steden/olifant.jpg", fx: .5, fy: .35, door: "Eric de Redelijkheid" }
  };
  /* Kleurgrading: schaduwen, hooglichten, hoeveel kleur er overblijft */
  const GRADE = {
    nacht: { s: [8, 14, 28], h: [255, 214, 160], kleur: .25 },
    zand: { s: [24, 14, 8], h: [255, 222, 176], kleur: .45 },
    staal: { s: [10, 18, 22], h: [226, 236, 238], kleur: .2 },
    groen: { s: [8, 18, 12], h: [236, 232, 200], kleur: .35 },
    rood: { s: [26, 8, 8], h: [255, 216, 190], kleur: .3 }
  };
  /* Per tegenstander een eigen beeld, zin en opmaak (volgorde telt: specifiek eerst) */
  const IDEE = [
    { test: /leeuwarden/i, beeld: ["martini", "oldehove"], grade: "nacht", opmaak: "centraal", zin: "Friezen op bezoek." },
    { test: /ghbs\s*h13/i, beeld: ["martini"], grade: "nacht", opmaak: "zijlijn", zin: "Uitgesteld, niet vergeten." },
    { test: /ghbs\s*h11/i, beeld: ["vismarkt"], grade: "nacht", opmaak: "centraal", zin: "Stadsderby." },
    { test: /ghbs\s*h12/i, beeld: ["museum"], grade: "rood", opmaak: "zijlijn", zin: "Vorige keer 0–3." },
    { test: /ghbs\s*h14/i, beeld: ["markt"], grade: "nacht", opmaak: "centraal", zin: "Het veertiende." },
    { test: /ghbs/i, beeld: ["markt"], grade: "nacht", opmaak: "centraal", zin: "Stadsderby." },
    { test: /sneek/i, beeld: ["waterpoort"], grade: "staal", opmaak: "centraal", zin: "De koploper komt langs." },
    { test: /hcso/i, beeld: ["toren"], grade: "staal", opmaak: "band", zin: "Het mooiste gebouw van Stadskanaal." },
    { test: /daring/i, beeld: ["kerkstraat"], grade: "zand", opmaak: "stapel", zin: "Vorige keer 1–6." },
    { test: /studs/i, beeld: ["senaat"], grade: "zand", opmaak: "band", zin: "Ze komen vooral voor de borrel." },
    { test: /eemsmond/i, beeld: ["stootblok"], grade: "staal", opmaak: "band", zin: "Delfzijl. Einde van de lijn." },
    { test: /emmen/i, beeld: ["flat"], grade: "groen", opmaak: "stapel", zin: "Uit Emmen. Straf genoeg." },
    { test: /./, beeld: ["karavaan"], grade: "zand", opmaak: "stapel", zin: "De karavaan trekt door." }
  ];
  const korteNaam = t => String(t).replace(/\s+(H|D)\d+.*$/i, "").replace(/^Gron\.?\s*Studs/i, "Studs").trim();
  const STADVAN = { GHBS: "Groningen", Studs: "Groningen", Sneek: "Sneek", HCSO: "Stadskanaal", Daring: "Veendam", Eemsmond: "Delfzijl", Emmen: "Emmen", Leeuwarden: "Leeuwarden" };

  const laad = src => new Promise((ok, fout) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fout; i.src = src; });
  let fontKlaar = null;
  const fonts = () => fontKlaar || (fontKlaar = Promise.all([
    ["PCond", "fonts/BarlowCondensed-Medium.woff", "500"], ["PCond", "fonts/BarlowCondensed-Bold.woff", "700"], ["PCond", "fonts/BarlowCondensed-Light.woff", "300"]
  ].map(async ([n, u, w]) => { try { const f = new FontFace(n, `url(${u})`, { weight: w }); await f.load(); document.fonts.add(f); } catch {} })));
  const F = (w, s) => `${w} ${s}px PCond, "Arial Narrow", Arial, sans-serif`;

  const breedte = (ctx, t, sp) => [...t].reduce((a, c) => a + ctx.measureText(c).width + sp, -sp);
  function spatie(ctx, tekst, x, y, sp, uitlijn = "left") {
    let cx = uitlijn === "center" ? x - breedte(ctx, tekst, sp) / 2 : uitlijn === "right" ? x - breedte(ctx, tekst, sp) : x;
    ctx.textAlign = "left"; for (const c of tekst) { ctx.fillText(c, cx, y); cx += ctx.measureText(c).width + sp; }
  }

  /* foto vullend in een vlak, daarna filmisch gegradeerd */
  function beeld(ctx, img, f, g, x, y, w, h) {
    const tmp = document.createElement("canvas"); tmp.width = w; tmp.height = h; const t = tmp.getContext("2d");
    if (img && f.crop) { const [a, b, c, e] = f.crop, cc = document.createElement("canvas"); cc.width = img.width * (c - a); cc.height = img.height * (e - b); cc.getContext("2d").drawImage(img, -img.width * a, -img.height * b); img = cc; }
    if (img) {
      const s = f.breed ? w / img.width * f.breed : Math.max(w / img.width, h / img.height) * 1.04, iw = img.width * s, ih = img.height * s;
      let ox = w / 2 - f.fx * iw, oy = h * .4 - f.fy * ih;
      ox = Math.min(0, Math.max(w - iw, ox)); oy = f.breed ? 0 : Math.min(0, Math.max(h - ih, oy));
      if (f.breed) { t.fillStyle = "#000"; t.fillRect(0, 0, w, h); }
      t.drawImage(img, ox, oy, iw, ih);
      const px = t.getImageData(0, 0, w, h), d = px.data, S = g.s, Hh = g.h, k = g.kleur;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], gg = d[i + 1], b = d[i + 2];
        let l = (r * .299 + gg * .587 + b * .114) / 255;
        l = l < .5 ? 2 * l * l * .9 : 1 - 2 * (1 - l) * (1 - l) * 1.05; l = Math.max(0, Math.min(1, l * .92));
        for (let c = 0; c < 3; c++) {
          const tint = S[c] + (Hh[c] - S[c]) * l, orig = [r, gg, b][c] * (.35 + l * .55);
          d[i + c] = tint * (1 - k) + orig * k;
        }
      }
      t.putImageData(px, 0, 0);
    } else { t.fillStyle = "#1a140e"; t.fillRect(0, 0, w, h); }
    ctx.drawImage(tmp, x, y);
  }

  async function maakPoster(m, opt = {}) {
    await fonts();
    const wijThuis = /gchc/i.test(m.thuis), tegen = wijThuis ? m.uit : m.thuis;
    const idee = IDEE.find(x => x.test.test(tegen)), g = GRADE[idee.grade];
    const tk = korteNaam(tegen), kort = idee.kort || tk.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase();
    const fotos = idee.beeld.map(n => FOTO[n]);
    const [logo, ...imgs] = await Promise.all([laad("logo.png").catch(() => null), ...fotos.map(f => laad(f.src).catch(() => null))]);
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const ctx = cv.getContext("2d");
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);

    const L = 72;
    const foto = (x, y, w, h) => { if (fotos.length === 2) { const [l, r] = wijThuis ? [0, 1] : [1, 0];
      beeld(ctx, imgs[l], fotos[l], g, x, y, w / 2 - 2, h); beeld(ctx, imgs[r], fotos[r], g, x + w / 2 + 2, y, w / 2 - 2, h); } else beeld(ctx, imgs[0], fotos[0], g, x, y, w, h); };
    const verloop = (y0, y1, a0, a1) => { const gr = ctx.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, `rgba(6,5,4,${a0})`); gr.addColorStop(1, `rgba(6,5,4,${a1})`); ctx.fillStyle = gr; ctx.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0)); };
    const vignet = (k = .65) => { const gr = ctx.createRadialGradient(W / 2, H * .35, 150, W / 2, H * .4, 1000); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, `rgba(0,0,0,${k})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); };
    const logoOp = (x, y, lh = 60, mid) => { if (!logo) return; const lw = lh * logo.width / logo.height; ctx.drawImage(logo, mid ? x - lw / 2 : x, y, lw, lh); };
    const past = (tekst, w, wt, s, spf) => { ctx.font = F(wt, s); while (tekst.some(t => breedte(ctx, t, s * spf) > w) && s > 50) { s -= 2; ctx.font = F(wt, s); } return s; };
    const namen = (wijThuis ? ["KAMELEN", tk] : [tk, "KAMELEN"]).map(n => n.toUpperCase());
    const spelers = (opt.spelers || []).map(n => String(n).toUpperCase());
    const d = new Date(m.datum + "T12:00:00");
    const weekdag = d.toLocaleDateString("nl-NL", { weekday: "long" }).toUpperCase(), datum = d.toLocaleDateString("nl-NL", { day: "numeric", month: "long" }).toUpperCase();
    const tijd = m.tijd ? `${m.tijd.replace(":", ".")} uur` : "Tijd volgt", plek = wijThuis ? "Groningen" : (STADVAN[tk] || tk);
    const ronde = opt.ronde ? `RONDE ${opt.ronde}` : "MATCHDAY";
    const zin = (x, y, s, uitlijn = "left", w = W - 2 * L) => { ctx.fillStyle = ZAND; ctx.textAlign = uitlijn; let z = s; ctx.font = F(300, z); while (ctx.measureText(idee.zin).width > w && z > 24) { z -= 2; ctx.font = F(300, z); } ctx.fillText(idee.zin, x, y); };
    const infoRij = (ry, midden) => {
      const cellen = [[`${weekdag} ${datum}`, tijd], [wijThuis ? "THUIS" : "UIT", plek], ["HEREN RESERVE", "1e klasse"]], cw = (W - 2 * L) / 3;
      ctx.fillStyle = "rgba(244,239,230,.25)"; ctx.fillRect(L, ry - 46, W - 2 * L, 1);
      cellen.forEach(([a, b], i) => {
        const cx = midden ? L + cw * i + cw / 2 : L + cw * i + (i ? 28 : 0);
        if (i) { ctx.fillStyle = "rgba(244,239,230,.25)"; ctx.fillRect(L + cw * i, ry - 22, 1, 62); }
        ctx.fillStyle = WIT; ctx.font = F(700, 26); spatie(ctx, a, cx, ry, 3, midden ? "center" : "left");
        ctx.fillStyle = MUTED; ctx.font = F(300, 26); ctx.textAlign = midden ? "center" : "left"; ctx.fillText(b, cx, ry + 34);
      });
    };
    const leeg = ["VOLGT ZODRA DE AFMELDINGEN BINNEN ZIJN"];

    const OPMAAK = {
      /* namen groot onder elkaar linksonder, selectie als aftiteling */
      stapel() {
        foto(0, 0, W, H); vignet(); verloop(430, 1010, 0, .97); ctx.fillStyle = "rgba(6,5,4,.97)"; ctx.fillRect(0, 1010, W, H - 1010); verloop(200, 0, 0, .6);
        logoOp(L, 54); ctx.fillStyle = WIT; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 94, 7, "right");
        const s = past(namen, W - 2 * L, 700, 168, 1 / 16), sp = s / 16, y1 = 700, y2 = y1 + s * .92 + 56;
        ctx.fillStyle = WIT; spatie(ctx, namen[0], L - 4, y1, sp);
        ctx.fillStyle = ZAND; ctx.font = F(300, 40); spatie(ctx, "TEGEN", L, y1 + 58, 14);
        const tw = breedte(ctx, "TEGEN", 14) + 24; ctx.fillStyle = "rgba(244,239,230,.3)"; ctx.fillRect(L + tw, y1 + 44, W - 2 * L - tw, 1);
        ctx.fillStyle = WIT; ctx.font = F(700, s); spatie(ctx, namen[1], L - 4, y2, sp);
        zin(L, y2 + 66, 38);
        let sy = y2 + 140; ctx.font = F(700, 22); ctx.fillStyle = WIT; spatie(ctx, "SELECTIE", L, sy, 6);
        let x = L + breedte(ctx, "SELECTIE", 6) + 28; ctx.font = F(500, 24); ctx.fillStyle = "rgba(244,239,230,.78)";
        (spelers.length ? spelers : leeg).forEach(n => { const bw = breedte(ctx, n, 4); if (x + bw > W - L) { x = L; sy += 38; } spatie(ctx, n, x, sy, 4); x += bw + 26; });
        infoRij(H - 112);
      },
      /* alles gecentreerd, dunne gespatieerde letters, selectie in kolommen */
      centraal() {
        foto(0, 0, W, H); ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(0, 0, W, H); vignet(.75);
        verloop(380, 900, 0, .93); ctx.fillStyle = "rgba(6,5,4,.93)"; ctx.fillRect(0, 900, W, H - 900);
        logoOp(W / 2, 50, 70, true);
        const s = past(namen, W - 2 * L, 500, 130, .3), sp = s * .3;
        ctx.fillStyle = WIT; spatie(ctx, namen[0], W / 2, 610, sp, "center");
        ctx.fillStyle = ZAND; ctx.font = F(300, 30); spatie(ctx, "TEGEN", W / 2, 610 + 64, 16, "center");
        ctx.fillStyle = WIT; ctx.font = F(500, s); spatie(ctx, namen[1], W / 2, 610 + 64 + s * .95, sp, "center");
        const yz = 610 + 64 + s * .95 + 70; zin(W / 2, yz, 34, "center");
        ctx.fillStyle = MUTED; ctx.font = F(500, 20); spatie(ctx, `SELECTIE  /  ${ronde}`, W / 2, yz + 78, 7, "center");
        const lijst = spelers.length ? spelers : leeg, kol = lijst.length > 1 ? 4 : 1, kw = (W - 2 * L) / kol;
        ctx.fillStyle = WIT; ctx.font = F(500, 26);
        lijst.forEach((n, i) => spatie(ctx, n, L + (i % kol) * kw + kw / 2, yz + 126 + Math.floor(i / kol) * 36, 3, "center"));
        infoRij(H - 104, true);
      },
      /* namen bovenaan, selectie als rij rechts, datum groot linksonder */
      zijlijn() {
        foto(0, 0, W, H); ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.fillRect(0, 0, W, H); vignet(.6);
        verloop(560, 0, 0, .92); verloop(640, H, 0, .95);
        logoOp(W - L - 80, 56);
        const s = past(namen, W - 2 * L, 700, 140, 1 / 18), sp = s / 18;
        ctx.fillStyle = WIT; spatie(ctx, namen[0], L - 3, 110 + s * .8, sp);
        ctx.fillStyle = ZAND; ctx.font = F(300, 34); spatie(ctx, "TEGEN", L, 110 + s * .8 + 54, 14);
        ctx.fillStyle = WIT; ctx.font = F(700, s); spatie(ctx, namen[1], L - 3, 110 + s * .8 + 54 + s * .9, sp);
        zin(L, 110 + s * 1.7 + 54 + 60, 34, "left", 640);
        /* selectie rechts onder elkaar */
        const lijst = spelers.length ? spelers : ["VOLGT", "ZODRA", "BEKEND"], rh = Math.min(34, 520 / lijst.length), sy = H - 80 - lijst.length * rh;
        ctx.fillStyle = MUTED; ctx.font = F(500, 18); spatie(ctx, "SELECTIE", W - L, sy - 18, 7, "right");
        ctx.fillStyle = "rgba(244,239,230,.25)"; ctx.fillRect(W - L - 200, sy - 6, 200, 1);
        ctx.fillStyle = WIT; ctx.font = F(500, 26); lijst.forEach((n, i) => spatie(ctx, n, W - L, sy + 26 + i * rh, 3, "right"));
        /* datum groot links */
        ctx.fillStyle = ZAND; ctx.font = F(500, 26); spatie(ctx, weekdag, L, H - 300, 8);
        ctx.fillStyle = WIT; const ds = past([datum], 600, 700, 96, .02); spatie(ctx, datum, L - 3, H - 210, ds * .02);
        ctx.fillStyle = WIT; ctx.font = F(500, 30); ctx.textAlign = "left"; ctx.fillText(`${tijd}, ${wijThuis ? "thuis in" : "uit in"} ${plek}`, L, H - 150);
        ctx.fillStyle = MUTED; ctx.font = F(300, 24); ctx.fillText(`Heren Reserve 1e klasse, ${ronde.toLowerCase()}`, L, H - 112);
      },
      /* foto als vlak bovenin, namen op één regel, selectie in een raster */
      band() {
        ctx.fillStyle = "#0d0a07"; ctx.fillRect(0, 0, W, H);
        foto(0, 0, W, 780); ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, 780); ctx.clip(); vignet(.55); verloop(560, 780, 0, .55); verloop(180, 0, 0, .55); ctx.restore();
        ctx.fillStyle = ZAND; ctx.fillRect(0, 780, W, 4);
        logoOp(L, 54); ctx.fillStyle = WIT; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 94, 7, "right");
        /* naam 1 vol, "tegen", naam 2 als omlijning */
        let s = 120; const meet = () => { ctx.font = F(700, s); const a = breedte(ctx, namen[0], s / 30), b = breedte(ctx, namen[1], s / 30); ctx.font = F(300, s * .34); return a + b + ctx.measureText(" tegen ").width + 30; };
        while (meet() > W - 2 * L && s > 50) s -= 2;
        const y = 900; let x = L;
        /* wij vol, de tegenstander alleen als omlijning */
        const naam = (n, x) => { ctx.font = F(700, s); if (n === "KAMELEN") { ctx.fillStyle = WIT; spatie(ctx, n, x, y, s / 30); }
          else { ctx.lineWidth = 2.5; ctx.strokeStyle = WIT; let cx = x; for (const c of n) { ctx.strokeText(c, cx, y); cx += ctx.measureText(c).width + s / 30; } } return breedte(ctx, n, s / 30); };
        x += naam(namen[0], x) + 15;
        ctx.font = F(300, s * .34); ctx.fillStyle = ZAND; ctx.textAlign = "left"; ctx.fillText(" tegen ", x, y - s * .05); x += ctx.measureText(" tegen ").width + 15;
        naam(namen[1], x);
        zin(L, y + 62, 34);
        ctx.fillStyle = MUTED; ctx.font = F(500, 18); spatie(ctx, "SELECTIE", L, y + 126, 7);
        const lijst = spelers.length ? spelers : leeg, kol = lijst.length > 1 ? 4 : 1, kw = (W - 2 * L) / kol;
        ctx.fillStyle = WIT; ctx.font = F(500, 26); lijst.forEach((n, i) => spatie(ctx, n, L + (i % kol) * kw, y + 168 + Math.floor(i / kol) * 32, 3));
        infoRij(H - 100);
      }
    };
    (OPMAAK[opt.opmaak || idee.opmaak] || OPMAAK.stapel)();

    /* ----- bron en korrel ----- */
    ctx.fillStyle = "rgba(244,239,230,.32)"; ctx.font = F(300, 15); ctx.textAlign = "center";
    ctx.fillText(`Foto${fotos.length > 1 ? "'s" : ""}: ${fotos.map(f => f.door).join(", ")} · Wikimedia Commons`, W / 2, H - 26);
    const korrel = ctx.getImageData(0, 0, W, H), px = korrel.data;
    for (let i = 0; i < px.length; i += 4) { const n = (Math.random() - .5) * 14; px[i] += n; px[i + 1] += n; px[i + 2] += n; }
    ctx.putImageData(korrel, 0, 0);
    return cv;
  }
  window.maakPoster = maakPoster;
})();
