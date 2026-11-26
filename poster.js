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
    soc: { src: "steden/soc-a.jpg", fx: .4, fy: .4, door: "Wutsje" },
    madurodam: { src: "steden/soc-i.jpg", fx: .5, fy: .4, door: "Willem Nabuurs" },
    elfsteden: { src: "steden/elfsteden.jpg", fx: .42, fy: .45, door: "Harry Pot / Anefo" },
    klunen: { src: "steden/elfsteden2.jpg", fx: .55, fy: .55, door: "Nationaal Archief" },
    oldehovezw: { src: "steden/oldehove2.jpg", fx: .62, fy: .45, door: "Willem van de Poll" },
    matahari: { src: "steden/matahari.jpg", fx: .42, fy: .3, door: "Michielverbeek" },
    w2: { src: "woestijn/2.jpg", fx: .55, fy: .5, door: "" }, w4: { src: "woestijn/4.jpg", fx: .5, fy: .55, door: "" },
    w6: { src: "woestijn/6.jpg", fx: .42, fy: .55, door: "" }, w8: { src: "woestijn/8.jpg", fx: .6, fy: .5, door: "" },
    w14: { src: "woestijn/14.jpg", fx: .55, fy: .55, door: "" }, w16: { src: "woestijn/16.jpg", fx: .55, fy: .5, door: "" },
    usmem: { src: "steden/usmem2.jpg", fx: .4, fy: .5, door: "Michielverbeek" },
    paard: { src: "steden/friespaard2.jpg", fx: .42, fy: .22, door: "Oleg Yunakov" },
    ljeppen: { src: "steden/fierljeppen.jpg", fx: .5, fy: .45, door: "Peter van der Sluijs" },
    w3: { src: "woestijn/3.jpg", fx: .7, fy: .6, door: "" }, w9: { src: "woestijn/9.jpg", fx: .5, fy: .55, door: "" }, w12: { src: "woestijn/12.jpg", fx: .55, fy: .55, door: "" },
    leeuwfront: { src: "steden/leeuw3.jpg", fx: .5, fy: .42, door: "Giles Laurent" },
    leeuwzij: { src: "steden/leeuw4.jpg", fx: .72, fy: .45, door: "Anmol Waychal" },
    piste: { src: "steden/temmer.jpg", fx: .5, fy: .74, zoom: 1.25, door: "EgorovaSvetlana" },
    kooi: { src: "steden/temmer3.jpg", fx: .45, fy: .55, door: "Anefo" },
    kameelkop: { src: "steden/kameel.jpg", fx: .45, fy: .45, door: "Skander Zarrad" },
    stadion: { src: "steden/veld4.jpg", fx: .5, fy: .45, door: "Macabe5387" },
    doel: { src: "steden/doel3.jpg", fx: .5, fy: .55, door: "Richard Webb" },
    bal: { src: "steden/doel5.jpg", fx: .5, fy: .5, door: "Clément Bucco-Lechat" },
    olifant: { src: "steden/olifant.jpg", fx: .5, fy: .35, door: "Eric de Redelijkheid" }
  };
  /* Kleurgrading: schaduwen, hooglichten, hoeveel kleur er overblijft */
  const GRADE = {
    nacht: { s: [8, 14, 28], h: [255, 214, 160], kleur: .25 },
    zand: { s: [24, 14, 8], h: [255, 222, 176], kleur: .45 },
    staal: { s: [10, 18, 22], h: [226, 236, 238], kleur: .2 },
    groen: { s: [8, 18, 12], h: [236, 232, 200], kleur: .35 },
    amber: { s: [26, 10, 2], h: [255, 196, 120], kleur: .25 },
    sloop: { s: [20, 14, 10], h: [255, 236, 210], kleur: .7 },
    vergeeld: { s: [40, 30, 30], h: [255, 236, 200], kleur: .75 },
    zw: { s: [6, 6, 6], h: [246, 244, 240], kleur: 0 },
    rood: { s: [26, 8, 8], h: [255, 216, 190], kleur: .3 }
  };
  /* Per tegenstander: compositie, hun beeld, ons beeld (Groningen of kamelen), opmaak en zin.
     silhouet: onze kameel, gevuld met Groningen, stapt hun stad in
     diagonaal: Groningen en hun stad schuin tegen elkaar, een kameel loopt over de naad
     route: de karavaan loopt van Groningen naar hun stad (of andersom) */
  /* Elke wedstrijd een eigen concept. Per tegenstander, en waar nodig apart voor thuis en uit. */
  const IDEE = [
    { test: /leeuwarden/i, thuis: { opmaak: "torens", beeld: "oldehove", ons: "martini", zin: "Zij hebben hun toren nooit afgemaakt." },
      uit: { opmaak: "stempelkaart", zin: "Finish in Leeuwarden." } },
    { test: /ghbs\s*h13/i, uit: { opmaak: "kalender", zin: "Uitgesteld, niet vergeten." }, thuis: { opmaak: "serie", ons: "martini", zin: "" } },
    { test: /ghbs\s*h11/i, opmaak: "album", zin: "Ruilen? Geen sprake van." },
    { test: /ghbs\s*h12/i, opmaak: "bon", zin: "Vorige keer betaalden zij. Dat houden we zo." },
    { test: /ghbs\s*h14/i, opmaak: "zwitsers", groot: "13", klein: "14", zin: "Het veertiende." },
    { test: /ghbs/i, opmaak: "bord", beeld: "vismarkt", zin: "Er is maar één Stad." },
    { test: /sneek/i, opmaak: "stand", beeld: "waterpoort", zin: "" },
    { test: /hcso/i, opmaak: "ticket", beeld: "toren", grade: "staal", code: "STK", zin: "Alleen retour verkrijgbaar." },
    { test: /daring/i, opmaak: "scorebord", zin: "Ze mogen het nog een keer proberen." },
    { test: /studs/i, opmaak: "uitnodiging", zin: "" },
    { test: /eemsmond/i, opmaak: "weer", zin: "" },
    { test: /emmen/i, opmaak: "kaart", beeld: "flat", zin: "Mooier dan dit wordt Emmen niet." },
    { test: /./, opmaak: "bord", beeld: "vismarkt", zin: "De karavaan trekt door." }
  ];
  const POS = { Groningen: [53.219, 6.566], Leeuwarden: [53.201, 5.799], Sneek: [53.033, 5.659], Stadskanaal: [52.99, 6.95], Veendam: [53.105, 6.877], Delfzijl: [53.33, 6.92], Emmen: [52.785, 6.897] };
  const korteNaam = t => String(t).replace(/\s+(H|D)\d+.*$/i, "").replace(/^Gron\.?\s*Studs/i, "Studs").trim();
  const STADVAN = { GHBS: "Groningen", Studs: "Groningen", Sneek: "Sneek", HCSO: "Stadskanaal", Daring: "Veendam", Eemsmond: "Delfzijl", Emmen: "Emmen", Leeuwarden: "Leeuwarden" };

  const laad = src => new Promise((ok, fout) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fout; i.src = src; });
  let fontKlaar = null;
  const fonts = () => fontKlaar || (fontKlaar = Promise.all([
    ["PCond", "fonts/BarlowCondensed-Medium.woff", "500"], ["PCond", "fonts/BarlowCondensed-Bold.woff", "700"], ["PCond", "fonts/BarlowCondensed-Light.woff", "300"], ["PSans", "fonts/InterDisplay-SemiBold.woff", "600"], ["PSerif", "fonts/DMSerifDisplay-Italic.woff", "400", "italic"], ["PSerifR", "fonts/DMSerifDisplay-Regular.woff", "400"]
  ].map(async ([n, u, w, st]) => { try { const f = new FontFace(n, `url(${u})`, { weight: w, style: st || "normal" }); await f.load(); document.fonts.add(f); } catch {} })));
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
      const s = (f.breed ? w / img.width * f.breed : Math.max(w / img.width, h / img.height) * 1.04) * (f.zoom || 1), iw = img.width * s, ih = img.height * s;
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

  /* Studs: de kamelen nemen de sociëteit aan de Grote Markt over (coördinaten in de originele foto) */
  function overname(img, logo) {
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const t = c.getContext("2d"), k = img.width / 1280;
    t.drawImage(img, 0, 0); t.save(); t.scale(k, k);
    /* oude letters weg: lucht eroverheen, dan een nieuw bord */
    const lucht = t.createLinearGradient(0, 150, 0, 260); lucht.addColorStop(0, "#9fb6d4"); lucht.addColorStop(1, "#aec2dc");
    t.fillStyle = lucht; t.fillRect(322, 160, 192, 52); t.fillRect(322, 205, 40, 50);
    t.fillStyle = "#3a2a1c"; t.fillRect(372, 238, 4, 22); t.fillRect(470, 238, 4, 22);
    t.fillStyle = "#1c140d"; t.fillRect(300, 160, 230, 80); t.strokeStyle = "#d9b27c"; t.lineWidth = 3; t.strokeRect(304, 164, 222, 72);
    const lh = 54, lw = lh * logo.width / logo.height; t.drawImage(logo, 312, 172, lw, lh);
    t.fillStyle = "#f4efe6"; let fs = 46; t.font = `700 ${fs}px PCond, Arial Narrow, sans-serif`; while (t.measureText("KAMELEN").width > 522 - (312 + lw + 8) && fs > 20) { fs -= 2; t.font = `700 ${fs}px PCond, Arial Narrow, sans-serif`; } t.textBaseline = "alphabetic"; t.fillText("KAMELEN", 312 + lw + 8, 215);
    t.fillStyle = "#d9b27c"; t.font = `500 13px PCond, Arial Narrow, sans-serif`; t.fillText("SOCIËTEIT  SINDS  VANDAAG", 312 + lw + 10, 230);
    /* gevelsteen: MVTVA FIDES wordt MVTVA KAMELEN */
    t.fillStyle = "#cdbb9a"; t.fillRect(430, 518, 108, 30); t.fillStyle = "#5b4630"; t.font = `500 19px PCond, Arial Narrow, sans-serif`; t.textAlign = "center"; t.fillText("MVTVA KAMELEN", 484, 540);
    /* spandoek op het balkon */
    t.fillStyle = "#f4efe6"; t.fillRect(284, 478, 98, 22); t.fillStyle = "#c8461b"; t.font = `700 15px PCond, Arial Narrow, sans-serif`; t.fillText("BEZET", 333, 494); t.textAlign = "left";
    /* kamelen op het dak */
    const kameel = (x, y, h, spiegel) => { const w = h * logo.width / logo.height; t.save(); t.translate(x, y - h); if (spiegel) { t.scale(-1, 1); t.translate(-w, 0); } t.drawImage(logo, 0, 0, w, h); t.restore(); };
    [[250, 265, 34], [300, 248, 30, 1], [540, 252, 32], [610, 260, 26, 1], [700, 352, 30], [770, 352, 34, 1], [850, 352, 28], [930, 350, 32]].forEach(a => kameel(...a));
    t.restore(); return c;
  }

  async function maakPoster(m, opt = {}) {
    await fonts();
    const wijThuis = /gchc/i.test(m.thuis), tegen = wijThuis ? m.uit : m.thuis;
    let idee = IDEE.find(x => x.test.test(tegen)); idee = { grade: "nacht", ...idee, ...(wijThuis ? idee.thuis : idee.uit) || {} };
    const g = GRADE[idee.grade];
    const tk = korteNaam(tegen);
    const zijF = FOTO[(opt.mini && opt.mini.foto) || idee.beeld || "markt"], onsF = FOTO[idee.ons || "martini"];
    const fotos = [zijF, onsF];
    let [logo, zijImg, onsImg, kameelImg] = await Promise.all([laad("logo.png").catch(() => null), laad(zijF.src).catch(() => null), laad(onsF.src).catch(() => null), laad("steden/kameel-uit.png").catch(() => null)]);
    const KAMEEL = { door: "Darthjipsu" };
    const TENUE = { shirt: await laad("tenue/shirt.png").catch(() => null) }; for (const it of ((opt.mini || {}).items || [])) if (!TENUE[it.img]) TENUE[it.img] = await laad(`tenue/${it.img}.png`).catch(() => null);
    const mo = opt.mini || {}, imgs2 = await Promise.all([mo.zij || mo.foto, mo.ons].map(k => k && FOTO[k] ? laad(FOTO[k].src).catch(() => null) : null));
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const ctx = cv.getContext("2d");
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);

    const L = 72;
    /* halftoonraster van een beeld, in één inktkleur */
    const raster = (img, f, w, h, inkt, stap = 10, max = 5.8) => {
      const c = document.createElement("canvas"); c.width = w; c.height = h; beeld(c.getContext("2d"), img, f, { s: [0, 0, 0], h: [255, 255, 255], kleur: 0 }, 0, 0, w, h);
      const px = c.getContext("2d").getImageData(0, 0, w, h).data, o = document.createElement("canvas"); o.width = w; o.height = h; const t = o.getContext("2d"); t.fillStyle = inkt;
      for (let yy = 0; yy < h; yy += stap) for (let xx = (yy / stap) % 2 ? stap / 2 : 0; xx < w; xx += stap) { const i = (Math.floor(yy) * w + Math.floor(xx)) * 4, v = 1 - px[i] / 255, r = Math.sqrt(v) * max; if (r > .5) { t.beginPath(); t.arc(xx, yy, r, 0, 7); t.fill(); } }
      return o;
    };
    /* achtergrond van de compositie */
    const foto = (x, y, w, h) => {
      if (idee.comp === "diagonaal") {
        beeld(ctx, onsImg, onsF, GRADE.zand, x, y, w, h);
        ctx.save(); ctx.beginPath(); ctx.moveTo(x, y + h * .78); ctx.lineTo(x + w, y + h * .3); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.clip();
        beeld(ctx, zijImg, zijF, g, x, y, w, h); ctx.restore();
      } else { beeld(ctx, zijImg, zijF, g, x, y, w, h); ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(x, y, w, h); }
    };
    /* voorgrond na de verlopen: de kameel of de naad */
    const kameelVorm = (vul, bw) => { const bh = bw * logo.height / logo.width, c = document.createElement("canvas"); c.width = bw; c.height = bh; const t = c.getContext("2d");
      if (typeof vul === "string") { t.fillStyle = vul; t.fillRect(0, 0, bw, bh); } else t.drawImage(vul, 0, 0, bw, bh);
      t.globalCompositeOperation = "destination-in"; t.drawImage(logo, 0, 0, bw, bh); return c; };
    const voorgrond = (x, y, w, h, plaats = {}) => {
      if (!logo) return;
      if (idee.comp === "silhouet") {
        const bw = Math.round(w * (plaats.b || .7)), bh = Math.round(bw * logo.height / logo.width);
        const kx = plaats.x != null ? x + plaats.x : x + (w - bw) / 2, ky = plaats.y != null ? y + plaats.y : y + h - bh - 24;
        /* vulling: ingezoomd zodat het beeld de hele kameel vult */
        const vul = document.createElement("canvas"); vul.width = bw; vul.height = bh; const vt = vul.getContext("2d");
        vt.fillStyle = "#e48a2c"; vt.fillRect(0, 0, bw, bh); vt.globalCompositeOperation = "multiply";
        vt.drawImage(raster(onsImg, { ...onsF, zoom: idee.ons === "martini" ? 1.6 : 1.2, fy: idee.ons === "martini" ? .4 : onsF.fy }, bw, bh, "#3a1d08", 8, 4.6), 0, 0);
        const kam = kameelVorm(vul, bw), rand = kameelVorm("#17120d", bw);
        /* schaduw op de grond */
        ctx.save(); ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.filter = "blur(14px)"; ctx.beginPath(); ctx.ellipse(kx + bw * .5, ky + bh - 8, bw * .42, 16, 0, 0, 7); ctx.fill(); ctx.restore();
        ctx.save(); for (let a = 0; a < 24; a++) ctx.drawImage(rand, kx + Math.cos(a / 24 * Math.PI * 2) * 3, ky + Math.sin(a / 24 * Math.PI * 2) * 3); ctx.restore();
        ctx.drawImage(kam, kx, ky);
      } else if (idee.comp === "diagonaal") {
        const y0 = y + h * .78, y1 = y + h * .3, hoek = Math.atan2(y1 - y0, w);
        ctx.strokeStyle = ZAND; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + w, y1); ctx.stroke();
        const bw = 170, bh = bw * logo.height / logo.width, t = plaats.t || .42;
        ctx.save(); ctx.translate(x + w * t, y0 + (y1 - y0) * t); ctx.rotate(hoek); ctx.drawImage(logo, -bw / 2, -bh + 6, bw, bh); ctx.restore();
        ctx.fillStyle = WIT; ctx.font = F(500, 22);
        ctx.save(); ctx.translate(x + 40, y0 - 22); ctx.rotate(hoek); spatie(ctx, "GRONINGEN", 0, 0, 8); ctx.restore();
        ctx.save(); ctx.translate(x + w - 40, y1 + 44); ctx.rotate(hoek); spatie(ctx, (STADVAN[tk] || tk).toUpperCase(), 0, 0, 8, "right"); ctx.restore();
      }
    };
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

    const bandTekst = (y) => {
        /* naam 1 vol, "tegen", naam 2 als omlijning */
        let s = 120; const meet = () => { ctx.font = F(700, s); const a = breedte(ctx, namen[0], s / 30), b = breedte(ctx, namen[1], s / 30); ctx.font = F(300, s * .34); return a + b + ctx.measureText(" tegen ").width + 30; };
        while (meet() > W - 2 * L && s > 50) s -= 2;
        let x = L;
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
    };
    let bron = null;
    /* selectie als doorlopende regel, en de info op één regel */
    const selectieRegel = (y, kleur, midden = false, sz = 24) => {
      const lijst = spelers.length ? spelers : leeg; ctx.font = F(700, sz - 2); ctx.fillStyle = kleur;
      const regels = [[]]; let w = breedte(ctx, "SELECTIE", 6) + 24; ctx.font = F(500, sz);
      lijst.forEach(n => { const bw = breedte(ctx, n, 3); if (w + bw > W - 2 * L) { regels.push([]); w = 0; } regels[regels.length - 1].push(n); w += bw + 22; });
      regels.forEach((r, i) => { let x = L; if (midden) { ctx.font = F(500, sz); const tw = r.reduce((a, n) => a + breedte(ctx, n, 3) + 22, -22) + (i ? 0 : (ctx.font = F(700, sz - 2), breedte(ctx, "SELECTIE", 6) + 24)); x = (W - tw) / 2; }
        if (!i) { ctx.font = F(700, sz - 2); ctx.fillStyle = kleur; spatie(ctx, "SELECTIE", x, y, 6); x += breedte(ctx, "SELECTIE", 6) + 24; }
        ctx.font = F(500, sz); ctx.fillStyle = kleur; r.forEach(n => { spatie(ctx, n, x, y + i * (sz + 12), 3); x += breedte(ctx, n, 3) + 22; }); });
    };
    const infoKort = (y, kleur, links = false) => {
      const t = `${weekdag} ${datum}  /  ${tijd.toUpperCase()}  /  ${wijThuis ? "THUIS" : "UIT"}, ${plek.toUpperCase()}  /  HEREN RESERVE 1E KLASSE`;
      ctx.fillStyle = kleur; let s2 = 24; ctx.font = F(500, s2); while (breedte(ctx, t, 4) > W - 2 * L && s2 > 14) { s2--; ctx.font = F(500, s2); }
      spatie(ctx, t, links ? L : W / 2, y, 4, links ? "left" : "center");
    };
    /* Een echte kameel in ons shirt, eventueel met onze oranje sokken (coördinaten in de uitgeknipte foto, 787 x 608) */
    const o2 = opt.mini || {};
    const aangekleed = (bw, { spiegel = false, sokken = false } = {}) => {
      const K = kameelImg; if (!K) { const c = document.createElement("canvas"); c.width = bw; c.height = 1; return c; }
      const sc = bw / K.width, bh = Math.round(K.height * sc);
      const nieuw = () => { const c = document.createElement("canvas"); c.width = bw; c.height = bh; const t = c.getContext("2d"); if (spiegel) { t.translate(bw, 0); t.scale(-1, 1); } return [c, t]; };
      const [c, t] = nieuw(); t.drawImage(K, 0, 0, bw, bh);
      const afwerken = (l, masker) => {
        /* eerst schaduw van de kameel erover, dan pas uitsnijden: anders wordt de hele kameel grijs */
        l.globalCompositeOperation = "multiply"; l.filter = "grayscale(1) brightness(1.55) contrast(1.25)"; l.drawImage(K, 0, 0, bw, bh); l.filter = "none";
        l.globalCompositeOperation = "destination-in"; l.drawImage(K, 0, 0, bw, bh); l.fillStyle = masker; l.fillRect(0, 0, K.width * sc, bh);
        l.globalCompositeOperation = "source-over"; };
      const sh = TENUE.shirt;
      if (sh) { const [lc, l] = nieuw();
        l.save(); l.translate(318 * sc, 182 * sc); l.rotate(Math.PI / 2); l.drawImage(sh, -168 * sc, -250 * sc, 336 * sc, 500 * sc); l.restore();
        const m = l.createLinearGradient(0, 0, 0, bh); m.addColorStop(0, "#000"); m.addColorStop(318 / 608, "#000"); m.addColorStop(342 / 608, "rgba(0,0,0,0)"); m.addColorStop(1, "rgba(0,0,0,0)");
        afwerken(l, m);
        /* alleen waar het shirt zit (anders wordt de bult grijs) */
        l.globalCompositeOperation = "destination-in"; l.save(); l.translate(318 * sc, 182 * sc); l.rotate(Math.PI / 2); l.drawImage(sh, -168 * sc, -250 * sc, 336 * sc, 500 * sc); l.restore(); l.globalCompositeOperation = "source-over";
        /* hals vrijlaten */
        l.globalCompositeOperation = "destination-out"; const n = l.createLinearGradient(530 * sc, 0, 575 * sc, 0); n.addColorStop(0, "rgba(0,0,0,0)"); n.addColorStop(1, "#000"); l.fillStyle = n; l.fillRect(530 * sc, 0, bw, bh); l.globalCompositeOperation = "source-over";
        t.save(); t.setTransform(1, 0, 0, 1, 0, 0); t.drawImage(lc, 0, 0); t.restore(); }
      if (sokken) { const [lc, l] = nieuw();
        const g = l.createLinearGradient(0, 360 * sc, 0, bh); g.addColorStop(0, "#ff8a3d"); g.addColorStop(.12, "#ff8a3d"); g.addColorStop(.13, "#f26a1b"); g.addColorStop(.86, "#f26a1b"); g.addColorStop(.87, "#3a3a3a"); g.addColorStop(1, "#2a2a2a");
        l.fillStyle = g; l.fillRect(0, 360 * sc, bw, bh);
        const m = l.createLinearGradient(0, 0, 0, bh); m.addColorStop(0, "rgba(0,0,0,0)"); m.addColorStop(356 / 608, "rgba(0,0,0,0)"); m.addColorStop(364 / 608, "#000"); m.addColorStop(1, "#000");
        afwerken(l, m);
        t.save(); t.setTransform(1, 0, 0, 1, 0, 0); t.drawImage(lc, 0, 0); t.restore(); }
      return c;
    };
    const clubVan = n => String(n || "").replace(/^Gron\.?\s*/i, "").replace(/\s+[HD]\d+.*$/i, "").trim();
    const kortTeam = n => { const c = clubVan(n), alle = (opt.standLijst || []).map(t => t.team); return alle.filter(t => clubVan(t) === c).length > 1 ? String(n).replace(/^Gron\.?\s*/i, "") : c; };
    const OPMAAK = {
      ticket() {
        const tmp = document.createElement("canvas"); tmp.width = W; tmp.height = H; beeld(tmp.getContext("2d"), zijImg, zijF, g, 0, 0, W, H);
        ctx.save(); ctx.filter = "blur(10px) brightness(.55)"; ctx.drawImage(tmp, -20, -20, W + 40, H + 40); ctx.restore(); vignet(.6);
        logoOp(L, 54); ctx.fillStyle = WIT; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 94, 7, "right");
        const CW = 880, CH = 930, INK = "#17120d", ACC = "#e2792b", c = document.createElement("canvas"); c.width = CW; c.height = CH; const t = c.getContext("2d");
        t.fillStyle = "#f4efe6"; t.beginPath(); t.roundRect(0, 0, CW, CH, 30); t.fill();
        t.fillStyle = ACC; t.beginPath(); t.roundRect(0, 0, CW, 116, [30, 30, 0, 0]); t.fill();
        if (logo) { const lh = 70, lw = lh * logo.width / logo.height; t.drawImage(kameelVorm("#f4efe6", lw), 40, 24); }
        t.fillStyle = "#f4efe6"; t.font = F(700, 46); t.textAlign = "left"; t.fillText("KARAVAAN AIR", 150, 76);
        t.font = F(500, 20); const ins = "INSTAPKAART"; let xx = CW - 40; for (const ch of [...ins].reverse()) { xx -= t.measureText(ch).width; t.fillText(ch, xx, 70); xx -= 6; }
        const [van, naar] = wijThuis ? [[idee.code || "XXX", plek], ["GRQ", "Groningen"]] : [["GRQ", "Groningen"], [idee.code || "XXX", plek]];
        t.fillStyle = INK; t.font = F(700, 160); t.textAlign = "left"; t.fillText(van[0], 40, 320); t.textAlign = "right"; t.fillText(naar[0], CW - 40, 320);
        t.font = F(500, 26); t.textAlign = "left"; t.fillText(van[1].toUpperCase(), 44, 362); t.textAlign = "right"; t.fillText(naar[1].toUpperCase(), CW - 44, 362);
        t.setLineDash([4, 10]); t.lineWidth = 3; t.strokeStyle = ACC; t.beginPath(); t.moveTo(330, 260); t.lineTo(CW - 330, 260); t.stroke(); t.setLineDash([]);
        if (logo) { const lh = 52, lw = lh * logo.width / logo.height; t.drawImage(logo, CW / 2 - lw / 2, 260 - lh + 4, lw, lh); }
        const veld = (lbl, waarde, x, y) => { t.textAlign = "left"; t.fillStyle = "rgba(23,18,13,.5)"; t.font = F(500, 18); t.fillText(lbl, x, y); t.fillStyle = INK; t.font = F(700, 36); t.fillText(waarde, x, y + 40); };
        const kw = (CW - 80) / 3;
        veld("DATUM", `${datum.toLowerCase()}`, 40, 430); veld("AFTRAP", tijd, 40 + kw, 430); veld("KLASSE", "Eerste klasse", 40 + kw * 2, 430);
        veld("TEGENSTANDER", tk, 40, 530); veld("PASSAGIERS", `${spelers.length || "?"} kamelen`, 40 + kw, 530); veld("STOEL", "Achterin de bus", 40 + kw * 2, 530);
        /* perforatie */
        t.globalCompositeOperation = "destination-out"; t.beginPath(); t.arc(0, 640, 26, 0, 7); t.arc(CW, 640, 26, 0, 7); t.fill(); t.globalCompositeOperation = "source-over";
        t.setLineDash([10, 10]); t.strokeStyle = "rgba(23,18,13,.35)"; t.lineWidth = 2; t.beginPath(); t.moveTo(40, 640); t.lineTo(CW - 40, 640); t.stroke(); t.setLineDash([]);
        t.fillStyle = "rgba(23,18,13,.5)"; t.font = F(500, 18); t.textAlign = "left"; t.fillText("PASSAGIERSLIJST", 40, 694);
        const lijst = spelers.length ? spelers : leeg; t.fillStyle = INK; t.font = F(500, 24);
        lijst.forEach((n, i) => t.fillText(n, 40 + (i % 4) * 150, 734 + Math.floor(i / 4) * 34));
        /* streepjescode */
        let zaad = [...m.datum].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0; const rnd = () => (zaad = (zaad * 1103515245 + 12345) >>> 0) / 4294967296;
        t.fillStyle = INK; for (let bx = CW - 200; bx < CW - 40;) { const bw2 = 2 + Math.floor(rnd() * 5); if (rnd() > .35) t.fillRect(bx, 680, bw2, 190); bx += bw2 + 2; }
        ctx.save(); ctx.translate(W / 2, 640); ctx.rotate(-.035); ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20; ctx.drawImage(c, -CW / 2, -CH / 2); ctx.restore();
        ctx.fillStyle = WIT; ctx.font = F(700, 54); spatie(ctx, `${namen[0]}  TEGEN  ${namen[1]}`, W / 2, 1200, 5, "center");
        ctx.fillStyle = ZAND; ctx.font = F(300, 38); ctx.textAlign = "center"; ctx.fillText(idee.zin, W / 2, 1258);
        bron = [zijF];
      },
      route() {
        ctx.fillStyle = "#0d0a07"; ctx.fillRect(0, 0, W, H);
        let gr = ctx.createRadialGradient(W / 2, 430, 50, W / 2, 430, 700); gr.addColorStop(0, "rgba(217,178,124,.12)"); gr.addColorStop(1, "rgba(217,178,124,0)"); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, 800);
        ctx.fillStyle = "rgba(244,239,230,.07)"; for (let yy = 150; yy < 780; yy += 22) for (let xx = 20; xx < W; xx += 22) { ctx.beginPath(); ctx.arc(xx, yy, 1.4, 0, 7); ctx.fill(); }
        logoOp(L, 54); ctx.fillStyle = WIT; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 94, 7, "right");
        const stad = STADVAN[tk] || tk, pa = POS.Groningen, pb = POS[stad] || [53.0, 6.9];
        const proj = p => [p[1] * Math.cos(53.1 * Math.PI / 180), -p[0]];
        let A = proj(pa), B = proj(pb); const dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy) || 1;
        /* de lijn tussen de steden schalen naar een vaste lengte en centreren */
        const S = 470 / len, mx = W / 2, my = 400 - Math.max(0, Math.abs(dy * S) / 2 - 140);
        A = [mx - dx * S / 2, my - dy * S / 2]; B = [mx + dx * S / 2, my + dy * S / 2];
        const r = 104, [van, naar] = wijThuis ? [B, A] : [A, B];
        const nx = -(naar[1] - van[1]) / 470, ny = (naar[0] - van[0]) / 470, C = [(van[0] + naar[0]) / 2 + nx * 150, (van[1] + naar[1]) / 2 + ny * 150];
        const punt = t => [(1 - t) ** 2 * van[0] + 2 * (1 - t) * t * C[0] + t * t * naar[0], (1 - t) ** 2 * van[1] + 2 * (1 - t) * t * C[1] + t * t * naar[1]];
        /* hoefafdrukken */
        ctx.fillStyle = ZAND; let k = 0;
        for (let t = .2; t < .8; t += .032, k++) { const [px, py] = punt(t), [qx, qy] = punt(t + .01), h = Math.atan2(qy - py, qx - px), z = k % 2 ? 1 : -1;
          ctx.save(); ctx.translate(px + Math.cos(h + Math.PI / 2) * 11 * z, py + Math.sin(h + Math.PI / 2) * 11 * z); ctx.rotate(h); ctx.globalAlpha = .35 + .6 * t;
          ctx.beginPath(); ctx.ellipse(0, -3.5, 7, 3.2, 0, 0, 7); ctx.ellipse(0, 3.5, 7, 3.2, 0, 0, 7); ctx.fill(); ctx.restore(); }
        ctx.globalAlpha = 1;
        /* medaillons */
        const medaillon = ([cx, cy], img, f, gg, naam, coord) => {
          const c = document.createElement("canvas"); c.width = c.height = r * 2; beeld(c.getContext("2d"), img, f, gg, 0, 0, r * 2, r * 2);
          ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.clip(); ctx.drawImage(c, cx - r, cy - r); ctx.restore();
          ctx.lineWidth = 4; ctx.strokeStyle = ZAND; ctx.beginPath(); ctx.arc(cx, cy, r + 8, 0, 7); ctx.stroke();
          ctx.fillStyle = WIT; ctx.font = F(700, 28); spatie(ctx, naam.toUpperCase(), cx, cy + r + 56, 8, "center");
          ctx.fillStyle = MUTED; ctx.font = F(300, 20); ctx.textAlign = "center"; ctx.fillText(coord, cx, cy + r + 84);
        };
        const co = p => `${p[0].toFixed(2)}° N  ${p[1].toFixed(2)}° O`;
        medaillon(A, onsImg, onsF, GRADE.zand, "Groningen", co(pa)); medaillon(B, zijImg, zijF, g, stad, co(pb));
        /* afstand over de weg, ongeveer: hemelsbreed x 1,25, afgerond op 5 */
        const rad = x => x * Math.PI / 180, hs = Math.sin(rad(pb[0] - pa[0]) / 2) ** 2 + Math.cos(rad(pa[0])) * Math.cos(rad(pb[0])) * Math.sin(rad(pb[1] - pa[1]) / 2) ** 2;
        const km = Math.round(6371 * 2 * Math.asin(Math.sqrt(hs)) * 1.25 / 5) * 5;
        const [kx, ky] = punt(.5), ox = kx - nx * 110, oy = ky - ny * 110;
        ctx.fillStyle = WIT; ctx.font = F(700, 120); ctx.textAlign = "center"; ctx.fillText(String(km), ox, oy + 30);
        ctx.fillStyle = ZAND; ctx.font = F(500, 22); spatie(ctx, "KILOMETER", ox, oy + 66, 9, "center");
        ctx.fillStyle = ZAND; ctx.fillRect(0, 780, W, 4);
        bandTekst(900); infoRij(H - 100);
      },
      zwitsers() {
        const PAP = "#ec8f2f", INK = "#17120d"; bron = [];
        ctx.fillStyle = PAP; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = INK; ctx.fillRect(64, 150, W - 128, 3); ctx.fillRect(64, 1196, W - 128, 3);
        ctx.font = F(500, 24); spatie(ctx, "GCHC HEREN 13", 64, 116, 5); spatie(ctx, "GRONINGEN", W / 2, 116, 5, "center"); spatie(ctx, ronde, W - 64, 116, 5, "right");
        if (logo) { const k = kameelVorm(INK, 560); ctx.drawImage(k, W - 64 - 560, 205); }
        /* selectie links naast de kameel */
        ctx.font = F(700, 22); spatie(ctx, "SELECTIE", 64, 222, 6);
        const lijst = spelers.length ? spelers : ["VOLGT", "NOG"], half = Math.ceil(lijst.length / 2);
        ctx.font = F(500, 30); lijst.forEach((n, i) => spatie(ctx, n, 64 + (i >= half ? 200 : 0), 272 + (i % half) * 42, 2));
        /* het grote getal en het kleine, uitgeholde getal */
        ctx.font = `600 560px PSans, Arial, sans-serif`; ctx.fillStyle = INK; spatie(ctx, idee.groot, 34, 1050, -34);
        const gb = breedte(ctx, idee.groot, -34);
        ctx.font = `600 230px PSans, Arial, sans-serif`; ctx.lineWidth = 4; ctx.strokeStyle = INK; let cx = 34 + gb + 30;
        for (const c of idee.klein) { ctx.strokeText(c, cx, 1050); cx += ctx.measureText(c).width - 12; }
        ctx.font = F(300, 34); ctx.textAlign = "left"; ctx.fillText(idee.zin, 34 + gb + 34, 1100 - 0);
        /* namen en info */
        ctx.font = F(700, 60); let x = 64; spatie(ctx, namen[0], x, 1150, 2); x += breedte(ctx, namen[0], 2) + 16;
        ctx.font = F(300, 40); ctx.fillText("tegen", x, 1150); x += ctx.measureText("tegen").width + 16; ctx.font = F(700, 60); spatie(ctx, namen[1], x, 1150, 2);
        const cellen = [[`${weekdag} ${datum}`, tijd], [wijThuis ? "THUIS" : "UIT", plek], ["HEREN RESERVE", "1e klasse"]], cw = (W - 128) / 3;
        cellen.forEach(([a, b], i) => { ctx.fillStyle = INK; ctx.font = F(700, 26); spatie(ctx, a, 64 + cw * i, 1256, 3); ctx.font = F(300, 26); ctx.textAlign = "left"; ctx.fillText(b, 64 + cw * i, 1292); });
      },
      /* Studs: corpsuitnodiging voor hun ontgroening, met lakzegel */
      uitnodiging() {
        let gr = ctx.createRadialGradient(W / 2, 560, 100, W / 2, 600, 900); gr.addColorStop(0, "#173a29"); gr.addColorStop(1, "#06140d"); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 9000; i++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * .025})`; ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5); }
        const GOUD = "#b8954a", INKT = "#1d2a22";
        const cx = W / 2, kw = 820, kh = 940, ky = 120;
        ctx.save(); ctx.translate(cx, ky + kh / 2); ctx.rotate(-.018);
        ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 60; ctx.shadowOffsetY = 20; ctx.fillStyle = "#f4ecd8"; ctx.fillRect(-kw / 2, -kh / 2, kw, kh); ctx.shadowColor = "transparent";
        ctx.strokeStyle = GOUD; ctx.lineWidth = 4; ctx.strokeRect(-kw / 2 + 28, -kh / 2 + 28, kw - 56, kh - 56); ctx.lineWidth = 1.5; ctx.strokeRect(-kw / 2 + 40, -kh / 2 + 40, kw - 80, kh - 80);
        if (logo) { const bw = 150; ctx.drawImage(kameelVorm(GOUD, bw), -bw / 2, -kh / 2 + 80); }
        const y0 = -kh / 2;
        const regel = (t, y, font, kleur = INKT, sp = 0) => { ctx.fillStyle = kleur; ctx.font = font; if (sp) spatie(ctx, t, 0, y0 + y, sp, "center"); else { ctx.textAlign = "center"; ctx.fillText(t, 0, y0 + y); } };
        regel("HET KAMELENCORPS", 250, F(500, 24), GOUD, 10);
        regel("heeft de eer", 318, `italic 400 38px PSerif, Georgia, serif`);
        regel(`de heren van ${tk}`, 392, `400 62px PSerifR, Georgia, serif`);
        regel("uit te nodigen voor hun", 452, `italic 400 38px PSerif, Georgia, serif`);
        regel("Ontgroening", 574, `400 120px PSerifR, Georgia, serif`);
        regel("op het kunstgras", 632, `italic 400 38px PSerif, Georgia, serif`);
        ctx.fillStyle = GOUD; ctx.fillRect(-120, y0 + 668, 240, 2);
        regel(`${weekdag.toLowerCase()} ${datum.toLowerCase()} 2027`, 728, `400 40px PSerifR, Georgia, serif`);
        regel(`aanvang ${tijd.toLowerCase()}, Groningen`, 772, `italic 400 30px PSerif, Georgia, serif`);
        regel("Dresscode: scheenbeschermers", 828, `italic 400 30px PSerif, Georgia, serif`, "#5a5045");
        regel("R.S.V.P. niet nodig, jullie komen toch", 868, F(500, 20), GOUD, 4);
        ctx.restore();
        /* lakzegel */
        const zx = cx + 300, zy = ky + kh - 40;
        ctx.save(); ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6; ctx.fillStyle = "#8e1a1a"; ctx.beginPath();
        for (let a = 0; a < 7; a += .2) { const r = 86 + Math.sin(a * 7) * 6 + Math.cos(a * 3) * 4; ctx.lineTo(zx + Math.cos(a) * r, zy + Math.sin(a) * r); } ctx.fill(); ctx.restore();
        ctx.fillStyle = "#a82424"; ctx.beginPath(); ctx.arc(zx, zy, 62, 0, 7); ctx.fill(); ctx.strokeStyle = "#6e1010"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(zx, zy, 62, 0, 7); ctx.stroke();
        if (logo) { const bw = 96, bh = bw * logo.height / logo.width; ctx.drawImage(kameelVorm("#6e1010", bw), zx - bw / 2, zy - bh / 2); }
        ctx.fillStyle = WIT; ctx.font = F(700, 50); spatie(ctx, `${namen[0]}  TEGEN  ${namen[1]}`, L, 1170, 3);
        selectieRegel(1218, "rgba(244,239,230,.75)"); infoKort(1306, WIT, true); bron = [];
      },

      /* Ronde 17: stickeralbum, de selectie als plaatjes */
      album() {
        ctx.fillStyle = "#efe7d6"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "rgba(228,138,44,.08)"; for (let y = 0; y < H; y += 40) for (let x = (y / 40) % 2 ? 20 : 0; x < W; x += 40) { ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); }
        ctx.fillStyle = "#e48a2c"; ctx.fillRect(0, 0, W, 170);
        ctx.fillStyle = "#1b120a"; ctx.font = F(700, 64); ctx.textAlign = "left"; ctx.fillText("KAMELEN", L, 96); ctx.font = F(500, 24); spatie(ctx, "STICKERALBUM 2026/2027  /  BLZ. " + (opt.ronde || 1), L, 140, 5);
        if (logo) { const lh = 120, lw = lh * logo.width / logo.height; ctx.drawImage(logo, W - L - lw, 26, lw, lh); }
        const lijst = spelers.length ? spelers : [], kol = 4, sw = 216, sh = 208, gx = (W - kol * sw) / (kol + 1), y0 = 200;
        for (let i = 0; i < 16; i++) { const x = gx + (i % kol) * (sw + gx), y = y0 + Math.floor(i / kol) * (sh + 18), n = lijst[i];
          ctx.save(); ctx.translate(x + sw / 2, y + sh / 2); ctx.rotate(n ? ((i * 53) % 9 - 4) / 300 : 0); ctx.translate(-sw / 2, -sh / 2);
          if (!n) { ctx.setLineDash([8, 6]); ctx.strokeStyle = "rgba(27,18,10,.3)"; ctx.lineWidth = 2; ctx.strokeRect(6, 6, sw - 12, sh - 12); ctx.setLineDash([]); ctx.fillStyle = "rgba(27,18,10,.3)"; ctx.font = F(700, 54); ctx.textAlign = "center"; ctx.fillText(String(i + 1), sw / 2, sh / 2 + 18); ctx.restore(); continue; }
          ctx.shadowColor = "rgba(0,0,0,.25)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.roundRect(0, 0, sw, sh, 10); ctx.fill(); ctx.shadowColor = "transparent";
          const g2 = ctx.createLinearGradient(0, 0, 0, sh); const glim = i === 0;
          if (glim) { g2.addColorStop(0, "#ffd36e"); g2.addColorStop(.35, "#ff8fb1"); g2.addColorStop(.7, "#8fd3ff"); g2.addColorStop(1, "#c9a2ff"); } else { g2.addColorStop(0, "#f2b45a"); g2.addColorStop(1, "#b9601d"); }
          ctx.fillStyle = g2; ctx.beginPath(); ctx.roundRect(8, 8, sw - 16, sh - 52, 6); ctx.fill();
          if (kameelImg) { const bw = sw - 40, bh = bw * kameelImg.height / kameelImg.width; ctx.save(); ctx.beginPath(); ctx.roundRect(8, 8, sw - 16, sh - 52, 6); ctx.clip(); ctx.drawImage(kameelImg, i % 2 ? sw - 20 : 20, sh - 44 - bh + 14, i % 2 ? -bw : bw, bh); ctx.restore(); }
          ctx.fillStyle = "#1b120a"; ctx.beginPath(); ctx.arc(30, 30, 18, 0, 7); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = F(700, 20); ctx.textAlign = "center"; ctx.fillText(String(i + 1), 30, 37);
          ctx.fillStyle = "#1b120a"; let fs = 26; ctx.font = F(700, fs); while (breedte(ctx, n, 2) > sw - 24 && fs > 14) { fs--; ctx.font = F(700, fs); } spatie(ctx, n, sw / 2, sh - 16, 2, "center");
          ctx.restore(); }
        ctx.fillStyle = "#1b120a"; ctx.font = F(700, 52); spatie(ctx, `${namen[0]}  TEGEN  ${namen[1]}`, L, 1150, 3);
        ctx.fillStyle = "#b9601d"; ctx.font = F(500, 32); ctx.textAlign = "left"; ctx.fillText(idee.zin, L, 1198);
        ctx.fillStyle = "#1b120a"; ctx.fillRect(L, 1236, W - 2 * L, 2); infoKort(1290, "#1b120a", true); bron = [KAMEEL];
      },

      /* Ronde 18: kassabon van de vorige ontmoeting */
      bon() {
        const gr = ctx.createLinearGradient(0, 0, W, H); gr.addColorStop(0, "#2a1b11"); gr.addColorStop(1, "#120b06"); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 2; for (let y = 0; y < H; y += 11) { ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x <= W; x += 60) ctx.lineTo(x, y + Math.sin(x / 120 + y / 40) * 3); ctx.stroke(); }
        const vorige = (opt.seizoen || []).find(x => x.score && (x.thuis === tegen || x.uit === tegen));
        let wij = 0, zij = 0, vd = ""; if (vorige) { const [a, b] = vorige.score.split("-").map(Number), th = /gchc/i.test(vorige.thuis); wij = th ? a : b; zij = th ? b : a; vd = new Date(vorige.datum + "T12:00").toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" }); }
        const BW = 540, BH = 1150, c = document.createElement("canvas"); c.width = BW; c.height = BH; const t = c.getContext("2d");
        t.fillStyle = "#fbfaf6"; t.beginPath(); t.moveTo(0, 0); t.lineTo(BW, 0); t.lineTo(BW, BH - 14); for (let x = BW; x >= 0; x -= 18) t.lineTo(x, BH - (x / 18 % 2 ? 0 : 14)); t.closePath(); t.fill();
        const INK = "#26221e", M = `500 22px PSans, Arial, sans-serif`, MB = `600 24px PSans, Arial, sans-serif`;
        let y = 70; const mid = (s, f = M) => { t.font = f; t.fillStyle = INK; t.textAlign = "center"; t.fillText(s, BW / 2, y); y += 34; };
        const rij = (l, r, f = M) => { t.font = f; t.fillStyle = INK; t.textAlign = "left"; t.fillText(l, 36, y); t.textAlign = "right"; t.fillText(r, BW - 36, y); y += 36; };
        const streep = () => { t.fillStyle = INK; for (let x = 36; x < BW - 36; x += 12) t.fillRect(x, y - 14, 7, 2); y += 22; };
        if (logo) { const bw = 120, bh = bw * logo.height / logo.width; t.drawImage(kameelVorm(INK, bw), BW / 2 - bw / 2, y - 30); y += bh; }
        mid("CAFÉ DE KAMEEL", `600 34px PSans, Arial, sans-serif`); mid("Grote Markt, Groningen"); y += 10; streep();
        rij(`Datum ${vd || "-"}`, `Tafel ${tk}`); rij("Bediening", "Heren 13"); streep();
        rij(`${wij} x Doelpunt Kamelen`, `${wij},00`); rij(`${zij} x Doelpunt ${tk}`, `${zij},00`); rij("1 x Rondje verliezers", "6,50"); rij("1 x Ijszakje", "0,00"); streep();
        rij("TOTAAL", `${zij}–${wij}`, `600 40px PSans, Arial, sans-serif`); y += 6; rij("Betaald door", `${tk} ${(tegen.match(/H\d+/) || [""])[0]}`); streep();
        mid("VOLGENDE BESTELLING", MB); mid(`${weekdag.toLowerCase()} ${datum.toLowerCase()}, ${tijd.toLowerCase()}`); mid(wijThuis ? "thuis, Groningen" : `uit, ${plek}`); y += 10;
        let zaad = 97; const rnd = () => (zaad = (zaad * 1103515245 + 12345) >>> 0) / 4294967296; t.fillStyle = INK; for (let bx = 90; bx < BW - 90;) { const w2 = 2 + Math.floor(rnd() * 5); if (rnd() > .35) t.fillRect(bx, y, w2, 90); bx += w2 + 2; } y += 130;
        mid("Bedankt en tot ziens!"); mid("Geen retour mogelijk.");
        ctx.save(); ctx.translate(70 + BW / 2, 90 + BH / 2); ctx.rotate(.02); ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16; ctx.drawImage(c, -BW / 2, -BH / 2); ctx.restore();
        /* rechterkolom */
        const rx = 660; ctx.fillStyle = WIT; ctx.font = F(700, 86); ctx.textAlign = "left"; ctx.fillText(namen[0], rx, 220); ctx.fillStyle = ZAND; ctx.font = F(300, 40); ctx.fillText("tegen", rx, 280); ctx.fillStyle = WIT; ctx.font = F(700, 86); ctx.fillText(namen[1], rx, 370);
        ctx.fillStyle = ZAND; ctx.font = F(300, 32); const woorden = idee.zin.split(" "); let r2 = "", yz = 450; woorden.forEach(w => { if (ctx.measureText(r2 + w).width > W - rx - 40) { ctx.fillText(r2, rx, yz); yz += 42; r2 = ""; } r2 += w + " "; }); ctx.fillText(r2, rx, yz);
        ctx.fillStyle = MUTED; ctx.font = F(700, 20); spatie(ctx, "SELECTIE", rx, yz + 90, 6); ctx.fillStyle = WIT; ctx.font = F(500, 30);
        (spelers.length ? spelers : ["VOLGT"]).forEach((n, i) => spatie(ctx, n, rx + (i >= 8 ? 190 : 0), yz + 136 + (i % 8) * 40, 3));
        logoOp(W - L - 80, 50, 56); bron = [];
      },

      /* Ronde 19: weerbericht, een echte kameel als weerman */
      weer() {
        const zee = ctx.createLinearGradient(0, 0, 0, 1000); zee.addColorStop(0, "#1f5ea8"); zee.addColorStop(1, "#174a86"); ctx.fillStyle = zee; ctx.fillRect(0, 0, W, 1000);
        /* provincie Groningen, grof */
        const pr = [[6.19, 53.41], [6.35, 53.43], [6.55, 53.45], [6.72, 53.47], [6.86, 53.45], [6.93, 53.37], [7.02, 53.33], [7.1, 53.29], [7.2, 53.24], [7.21, 53.12], [7.18, 53.0], [7.09, 52.87], [6.98, 52.85], [6.88, 52.96], [6.72, 53.03], [6.55, 53.07], [6.4, 53.08], [6.27, 53.12], [6.2, 53.2], [6.18, 53.32]];
        const pj = ([lo, la]) => [230 + (lo - 6.1) * 660, 250 + (53.52 - la) * 1100];
        const land = ctx.createLinearGradient(0, 100, 0, 1000); land.addColorStop(0, "#7cb35f"); land.addColorStop(1, "#5c9447"); ctx.fillStyle = land;
        ctx.beginPath(); pr.forEach((p, i) => { const [x, y] = pj(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 3; ctx.stroke();
        /* Friesland en Drenthe als vlakken aan de rand */
        ctx.fillStyle = "#6aa352"; ctx.beginPath(); ctx.moveTo(0, pj([6.19, 53.41])[1]); [[6.18, 53.32], [6.2, 53.2], [6.27, 53.12], [6.4, 53.08], [6.55, 53.07], [6.72, 53.03], [6.88, 52.96], [6.98, 52.85], [7.09, 52.87]].forEach(p => ctx.lineTo(...pj(p))); ctx.lineTo(pj([7.09, 52.87])[0], 1000); ctx.lineTo(0, 1000); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#6aa352"; ctx.beginPath(); ctx.moveTo(...pj([7.21, 53.12])); ctx.lineTo(...pj([7.2, 53.24])); ctx.lineTo(W, pj([7.2, 53.24])[1] - 40); ctx.lineTo(W, 1000); ctx.lineTo(...pj([7.18, 53.0])); ctx.closePath(); ctx.fill();
        const stad = (naam, p, icoon, temp) => { const [x, y] = pj(p); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill();
          ctx.fillStyle = "rgba(10,30,60,.85)"; ctx.font = F(700, 30); const tw = ctx.measureText(naam.toUpperCase()).width + 30; ctx.fillRect(x + 18, y - 22, tw, 42); ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.fillText(naam.toUpperCase(), x + 33, y + 10);
          ctx.fillStyle = "#e0262b"; ctx.fillRect(x + 18 + tw, y - 22, 70, 42); ctx.fillStyle = "#fff"; ctx.fillText(temp, x + 30 + tw, y + 10); icoon(x, y - 110); };
        const zon = (x, y) => { ctx.fillStyle = "#ffcc33"; ctx.beginPath(); ctx.arc(x, y, 50, 0, 7); ctx.fill(); ctx.strokeStyle = "#ffcc33"; ctx.lineWidth = 8; ctx.lineCap = "round"; for (let a = 0; a < 8; a++) { ctx.beginPath(); ctx.moveTo(x + Math.cos(a * .785) * 64, y + Math.sin(a * .785) * 64); ctx.lineTo(x + Math.cos(a * .785) * 86, y + Math.sin(a * .785) * 86); ctx.stroke(); } };
        const storm = (x, y) => { ctx.fillStyle = "#4a5260"; [[0, 0, 56], [-50, 14, 42], [52, 16, 44], [0, 26, 50]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, 7); ctx.fill(); });
          ctx.fillStyle = "#ffd400"; ctx.beginPath(); ctx.moveTo(x - 6, y + 50); ctx.lineTo(x - 30, y + 110); ctx.lineTo(x - 6, y + 104); ctx.lineTo(x - 20, y + 160); ctx.lineTo(x + 26, y + 90); ctx.lineTo(x, y + 96); ctx.lineTo(x + 16, y + 50); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = "#9fd3ff"; ctx.lineWidth = 5; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x - 70 + i * 34, y + 70); ctx.lineTo(x - 80 + i * 34, y + 100); ctx.stroke(); } };
        stad("Groningen", [6.566, 53.219], zon, "24°"); stad("Delfzijl", [6.92, 53.33], storm, "9°");
        /* windpijl met kracht */
        const [wx, wy] = pj([6.8, 53.41]); ctx.save(); ctx.translate(wx - 60, wy - 50); ctx.rotate(.5); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(-70, -16); ctx.lineTo(30, -16); ctx.lineTo(30, -36); ctx.lineTo(80, 0); ctx.lineTo(30, 36); ctx.lineTo(30, 16); ctx.lineTo(-70, 16); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#174a86"; ctx.font = F(700, 30); ctx.textAlign = "center"; ctx.fillText("8", -10, 11); ctx.restore();
        /* de weerman */
        if (kameelImg) { const bw = 560, bh = bw * kameelImg.height / kameelImg.width; ctx.save(); ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 30; ctx.drawImage(kameelImg, -60, 1000 - bh + 30, bw, bh); ctx.restore(); }
        /* onderbalk */
        ctx.fillStyle = "#0c2340"; ctx.fillRect(0, 1000, W, H - 1000);
        ctx.fillStyle = "#e0262b"; ctx.fillRect(0, 900, 520, 70); ctx.fillStyle = "#fff"; ctx.font = F(700, 38); spatie(ctx, "WEERBERICHT", 30, 948, 6);
        ctx.fillStyle = "#fff"; ctx.fillRect(520, 900, W - 520, 70); ctx.fillStyle = "#0c2340"; ctx.font = F(700, 32); spatie(ctx, `${weekdag} ${datum}`, 545, 946, 4);
        ctx.fillStyle = "#fff"; ctx.font = F(500, 34); ctx.textAlign = "left"; ctx.fillText("Delfzijl: zwaar bewolkt, kans op een pak slaag 90%.", L, 1060);
        ctx.font = F(700, 50); spatie(ctx, `${namen[0]}  TEGEN  ${namen[1]}`, L, 1140, 3);
        selectieRegel(1196, "rgba(255,255,255,.75)"); infoKort(1300, "#fff", true); logoOp(W - L - 80, 50, 56); bron = [KAMEEL];
      },

      /* Ronde 20: ansichtkaarten, groeten uit Emmen */
      kaart() {
        const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#8a6a45"); gr.addColorStop(1, "#5e4429"); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 14000; i++) { ctx.fillStyle = `rgba(${Math.random() > .5 ? "40,25,10" : "255,230,200"},${Math.random() * .12})`; ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
        const CW = 760, CH = 500;
        /* achterkant met de boodschap */
        const ach = document.createElement("canvas"); ach.width = CW; ach.height = CH; const a = ach.getContext("2d");
        a.fillStyle = "#f3ecdc"; a.fillRect(0, 0, CW, CH); a.fillStyle = "rgba(60,40,20,.35)"; a.fillRect(CW / 2, 40, 2, CH - 80);
        a.fillStyle = "#2a3b6b"; a.font = `italic 400 30px PSerif, Georgia, serif`; a.textAlign = "left";
        ["Beste Emmen,", "", "Kom gerust langs op " + datum.toLowerCase() + ".", "Neem een foto van thuis mee,", "dan lijkt het hier nog mooier.", "", "Groeten uit Stad,", "de Kamelen"].forEach((t2, i) => a.fillText(t2, 36, 90 + i * 40));
        for (let i = 0; i < 4; i++) { a.fillStyle = "rgba(60,40,20,.35)"; a.fillRect(CW / 2 + 30, 290 + i * 50, CW / 2 - 70, 2); }
        a.fillStyle = "#2a3b6b"; a.font = `italic 400 28px PSerif, Georgia, serif`; a.fillText(`${tk} H1`, CW / 2 + 36, 280); a.fillText("Ergens in Drenthe", CW / 2 + 36, 330); a.fillText("(niet naar kijken)", CW / 2 + 36, 380);
        /* postzegel met de echte kameel en een stempel */
        const sx = CW - 170, sy = 36, sw = 130, sh = 160; a.fillStyle = "#fff"; a.fillRect(sx, sy, sw, sh);
        a.globalCompositeOperation = "destination-out"; for (let x = sx; x <= sx + sw; x += 13) { a.beginPath(); a.arc(x, sy, 5, 0, 7); a.arc(x, sy + sh, 5, 0, 7); a.fill(); } for (let y = sy; y <= sy + sh; y += 13) { a.beginPath(); a.arc(sx, y, 5, 0, 7); a.arc(sx + sw, y, 5, 0, 7); a.fill(); } a.globalCompositeOperation = "source-over";
        a.fillStyle = "#e48a2c"; a.fillRect(sx + 12, sy + 12, sw - 24, sh - 24); if (kameelImg) { const bw = sw - 30, bh = bw * kameelImg.height / kameelImg.width; a.drawImage(kameelImg, sx + 15, sy + sh - 30 - bh, bw, bh); }
        a.fillStyle = "#fff"; a.font = F(700, 18); a.fillText("13 CT", sx + 18, sy + 34);
        a.strokeStyle = "rgba(40,40,60,.7)"; a.lineWidth = 3; a.beginPath(); a.arc(sx - 30, sy + 110, 56, 0, 7); a.stroke(); a.font = F(700, 16); a.fillStyle = "rgba(40,40,60,.75)"; a.textAlign = "center"; a.fillText("GRONINGEN", sx - 30, sy + 104); a.fillText(datum, sx - 30, sy + 126);
        for (let i = 0; i < 4; i++) { a.beginPath(); for (let x = sx + 30; x < sx + 200; x += 6) a.lineTo(x, sy + 170 + i * 14 + Math.sin(x / 9) * 4); a.stroke(); }
        ctx.save(); ctx.translate(590, 800); ctx.rotate(.07); ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12; ctx.drawImage(ach, -CW / 2, -CH / 2); ctx.restore();
        /* voorkant: groeten uit Emmen */
        const vk = document.createElement("canvas"); vk.width = CW; vk.height = CH; const v = vk.getContext("2d");
        v.fillStyle = "#fff"; v.fillRect(0, 0, CW, CH); beeld(v, zijImg, zijF, GRADE.vergeeld, 18, 18, CW - 36, CH - 36);
        v.fillStyle = "rgba(255,255,255,.95)"; v.font = `italic 400 70px PSerif, Georgia, serif`; v.textAlign = "left"; v.shadowColor = "rgba(0,0,0,.6)"; v.shadowBlur = 10; v.fillText("Groeten uit", 44, 110);
        v.font = F(700, 130); v.fillStyle = "#e9c46a"; v.fillText("EMMEN", 40, 230); v.shadowBlur = 0;
        ctx.save(); ctx.translate(450, 330); ctx.rotate(-.06); ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 36; ctx.shadowOffsetY = 14; ctx.drawImage(vk, -CW / 2, -CH / 2); ctx.restore();
        logoOp(W - L - 80, 40, 56);
        ctx.fillStyle = "rgba(20,12,4,.55)"; ctx.fillRect(0, 1040, W, H - 1040);
        ctx.fillStyle = WIT; ctx.font = F(700, 52); spatie(ctx, `${namen[0]}  TEGEN  ${namen[1]}`, L, 1112, 3);
        ctx.fillStyle = "#f2d39a"; ctx.font = F(300, 32); ctx.textAlign = "left"; ctx.fillText(idee.zin, L, 1158); selectieRegel(1212, "rgba(244,239,230,.85)"); infoKort(1306, WIT, true); bron = [zijF, KAMEEL];
      },

      /* Ronde 21: de laatste thuiswedstrijd als docuserie op een streamingdienst */
      serie() {
        ctx.fillStyle = "#0b0b0b"; ctx.fillRect(0, 0, W, H);
        beeld(ctx, onsImg, onsF, GRADE.nacht, 0, 0, W, 760);
        let gr = ctx.createLinearGradient(0, 300, 0, 760); gr.addColorStop(0, "rgba(11,11,11,0)"); gr.addColorStop(1, "#0b0b0b"); ctx.fillStyle = gr; ctx.fillRect(0, 300, W, 460);
        gr = ctx.createLinearGradient(0, 0, 700, 0); gr.addColorStop(0, "rgba(11,11,11,.85)"); gr.addColorStop(1, "rgba(11,11,11,0)"); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, 760);
        if (kameelImg) { const bw = 640, bh = bw * kameelImg.height / kameelImg.width; ctx.save(); ctx.translate(W + 60, 760 - bh); ctx.scale(-1, 1); ctx.filter = "brightness(.85) contrast(1.1)"; ctx.drawImage(kameelImg, 0, 0, bw, bh); ctx.restore(); }
        ctx.fillStyle = "#0b0b0b"; ctx.fillRect(0, 740, W, 30);
        ctx.fillStyle = "#e48a2c"; ctx.font = F(700, 22); spatie(ctx, "DOCUSERIE", L, 110, 8);
        ctx.fillStyle = "#fff"; ctx.font = F(700, 140); ctx.textAlign = "left"; ctx.fillText("KAMELEN", L - 6, 250);
        ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.font = F(500, 26); ctx.fillText("2026–2027   22 afleveringen   Sport   16+", L, 300);
        ctx.fillStyle = "#fff"; ctx.font = F(700, 36); ctx.fillText(`Aflevering ${opt.ronde || ""}: de laatste thuiswedstrijd`, L, 380);
        ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.font = F(300, 28); ["Nog één keer in Stad. " + tk + " komt langs om", "het seizoen af te sluiten. De karavaan", "wil met een overwinning de zomer in."].forEach((t2, i) => ctx.fillText(t2, L, 428 + i * 36));
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.roundRect(L, 560, 250, 70, 8); ctx.fill(); ctx.fillStyle = "#0b0b0b"; ctx.beginPath(); ctx.moveTo(L + 40, 576); ctx.lineTo(L + 40, 614); ctx.lineTo(L + 72, 595); ctx.closePath(); ctx.fill(); ctx.font = F(700, 32); ctx.fillText("Afspelen", L + 92, 607);
        ctx.fillStyle = "rgba(120,120,120,.55)"; ctx.beginPath(); ctx.roundRect(L + 270, 560, 270, 70, 8); ctx.fill(); ctx.fillStyle = "#fff"; ctx.fillText("+  Mijn lijst", L + 300, 607);
        ctx.fillStyle = "#fff"; ctx.font = F(700, 32); ctx.textAlign = "left"; ctx.fillText("Afleveringen", L, 820);
        const ons = opt.seizoen || [], hier = ons.findIndex(x => x.datum === m.datum), eps = ons.slice(Math.max(0, hier - 2), hier + 1);
        eps.forEach((w, i) => { const y = 860 + i * 130, th = /gchc/i.test(w.thuis), t1 = th ? "Kamelen" : korteNaam(w.thuis), t2 = th ? korteNaam(w.uit) : "Kamelen", nu = w.datum === m.datum;
          const g3 = ctx.createLinearGradient(L, y, L + 200, y + 112); g3.addColorStop(0, nu ? "#e48a2c" : "#3a3a3a"); g3.addColorStop(1, nu ? "#7a3d0d" : "#1c1c1c"); ctx.fillStyle = g3; ctx.fillRect(L, y, 200, 112);
          if (logo) { const lh = 52, lw = lh * logo.width / logo.height; ctx.drawImage(nu ? logo : kameelVorm("#777", lw), L + 100 - lw / 2, y + 30, lw, lh); }
          if (!nu) { ctx.fillStyle = "#e0262b"; ctx.fillRect(L, y + 108, 200, 4); }
          ctx.fillStyle = "#fff"; ctx.font = F(700, 30); ctx.textAlign = "left"; ctx.fillText(`${ons.indexOf(w) + 1}. ${t1} – ${t2}`, L + 230, y + 42);
          ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.font = F(500, 24); ctx.fillText(nu ? `Nieuw: ${weekdag.toLowerCase()} ${datum.toLowerCase()}, ${tijd.toLowerCase()}` : (w.score ? `Uitslag ${w.score}` : new Date(w.datum + "T12:00").toLocaleDateString("nl-NL", { day: "numeric", month: "long" })), L + 230, y + 80);
          if (nu) { ctx.fillStyle = "#e48a2c"; ctx.font = F(700, 20); spatie(ctx, "NIEUWE AFLEVERING", W - L, y + 42, 4, "right"); } });
        ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.font = F(500, 22); ctx.textAlign = "left";
        const met = "Met: " + (spelers.length ? spelers.map(n => n[0] + n.slice(1).toLowerCase()).join(", ") : "de selectie volgt");
        let r3 = "", ym = 1262; met.split(" ").forEach(w => { if (ctx.measureText(r3 + w).width > W - 2 * L) { ctx.fillText(r3, L, ym); ym += 30; r3 = ""; } r3 += w + " "; }); ctx.fillText(r3, L, ym);
        bron = [onsF, KAMEEL];
      },
      /* Natuurfilm, twee filmbeelden met ondertitels */
      filmstills() {
        const o = opt.mini || {}, A = FOTO[o.zij], B = FOTO[o.ons];
        ctx.fillStyle = "#050505"; ctx.fillRect(0, 0, W, H);
        logoOp(L, 40, 48); ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.font = F(500, 20); spatie(ctx, "DE LEEUW EN DE KAMEEL  /  EEN NATUURFILM", W - L, 78, 6, "right");
        const frame = (img, f, gg, y, h, tc, sub) => { beeld(ctx, img, f, gg, 0, y, W, h);
          ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.font = F(500, 18); spatie(ctx, tc, L, y - 14, 4);
          ctx.font = `600 36px PSans, Arial, sans-serif`; ctx.textAlign = "center"; ctx.lineWidth = 6; ctx.strokeStyle = "rgba(0,0,0,.85)"; ctx.lineJoin = "round";
          ctx.strokeText(sub, W / 2, y + h - 34); ctx.fillStyle = "#fff"; ctx.fillText(sub, W / 2, y + h - 34); };
        frame(imgs2[0], A, GRADE[o.gradeZij || "zand"], 140, 470, "00:41:12", o.r1);
        frame(imgs2[1], B, GRADE[o.gradeOns || "zand"], 660, 470, "01:12:56", o.r2);
        ctx.fillStyle = WIT; ctx.font = F(700, 34); spatie(ctx, `${namen[0]} \u2013 ${namen[1]}`, L, 1196, 5);
        infoKort(1232, MUTED, true); selectieRegel(1272, "rgba(244,239,230,.6)", false, 20); bron = [A, B];
      },

      /* Natuurfilm, titelkaart over een echte leeuw */
      titelkaart() {
        const o = opt.mini || {}, f = FOTO[o.foto];
        beeld(ctx, imgs2[0], f, GRADE[o.grade || "zand"], 0, 0, W, H); vignet(.7); verloop(560, 1000, 0, .88); ctx.fillStyle = "rgba(6,5,4,.88)"; ctx.fillRect(0, 1000, W, H - 1000); verloop(220, 0, 0, .6);
        logoOp(L, 50, 52); ctx.fillStyle = WIT; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 92, 7, "right");
        ctx.fillStyle = "rgba(244,239,230,.8)"; ctx.font = F(500, 24); spatie(ctx, o.boven || "EEN NATUURFILM", W / 2, 720, 14, "center");
        ctx.fillStyle = WIT; ctx.font = F(300, 118); spatie(ctx, o.r1, W / 2, 846, 22, "center"); spatie(ctx, o.r2, W / 2, 966, 22, "center");
        ctx.fillStyle = ZAND; ctx.font = `italic 400 36px PSerif, Georgia, serif`; ctx.textAlign = "center"; ctx.fillText(o.sub, W / 2, 1040);
        ctx.fillStyle = "rgba(244,239,230,.3)"; ctx.fillRect(L, 1096, W - 2 * L, 1);
        ctx.fillStyle = WIT; ctx.font = F(500, 26); spatie(ctx, o.premiere || `${namen[0]} \u2013 ${namen[1]}`, W / 2, 1146, 6, "center");
        infoKort(1188, MUTED); 
        const lijst = spelers.length ? spelers : leeg; ctx.fillStyle = "rgba(244,239,230,.6)"; ctx.font = F(500, 20);
        const met = (o.met || "MET") + "  " + lijst.join("   "); let regel = "", y = 1240, regels = [];
        met.split("   ").forEach(w => { if (breedte(ctx, regel + w, 3) > W - 2 * L) { regels.push(regel.trim()); regel = ""; } regel += w + "   "; }); regels.push(regel.trim());
        regels.forEach((r, i) => spatie(ctx, r, W / 2, y + i * 30, 3, "center")); bron = [f];
      },

      /* Oog in oog: links hun dier, rechts het onze */
      oogInOog() {
        const o = opt.mini || {}, A = FOTO[o.zij], B = FOTO[o.ons];
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
        beeld(ctx, imgs2[0], A, GRADE.zw, 0, 0, W / 2 - 3, 1060); beeld(ctx, imgs2[1], B, GRADE.zw, W / 2 + 3, 0, W / 2 - 3, 1060);
        vignet(.5); verloop(760, 1060, 0, .95); ctx.fillStyle = "rgba(6,5,4,.95)"; ctx.fillRect(0, 1060, W, H - 1060); verloop(180, 0, 0, .5);
        logoOp(L, 50, 52); ctx.fillStyle = WIT; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 92, 7, "right");
        ctx.fillStyle = "rgba(244,239,230,.8)"; ctx.font = F(500, 22); spatie(ctx, "LEEUW", W / 4, 160, 10, "center"); spatie(ctx, "KAMEEL", W * .75, 160, 10, "center");
        ctx.fillStyle = WIT; ctx.font = F(700, 220); spatie(ctx, o.kop || "GETEMD.", L - 4, 1030, 4);
        ctx.fillStyle = "rgba(244,239,230,.3)"; ctx.fillRect(L, 1112, W - 2 * L, 1);
        ctx.fillStyle = WIT; ctx.font = F(700, 38); spatie(ctx, `${namen[0]} \u2013 ${namen[1]}`, L, 1170, 5);
        infoKort(1212, MUTED, true); selectieRegel(1262, "rgba(244,239,230,.6)", false, 20); bron = [A, B];
      },

      /* Tweeluik: boven hun beeld, onder het onze, de zin loopt over de naad */
      tweeluik() {
        const o = opt.mini || {}, A = FOTO[o.zij], B = FOTO[o.ons];
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
        beeld(ctx, imgs2[0], A, GRADE[o.gradeZij || "staal"], 0, 0, W, 560);
        beeld(ctx, imgs2[1], B, GRADE[o.gradeOns || "zand"], 0, 566, W, 540);
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, 560); ctx.clip(); verloop(300, 560, 0, .75); verloop(160, 0, 0, .55); ctx.restore();
        ctx.save(); ctx.beginPath(); ctx.rect(0, 566, W, 540); ctx.clip(); verloop(840, 1106, 0, .85); ctx.restore();
        ctx.fillStyle = ZAND; ctx.fillRect(0, 560, W, 6);
        logoOp(L, 44, 52); ctx.fillStyle = WIT; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 86, 7, "right");
        let ks = o.size || 120; ctx.font = F(700, ks); while ([o.r1, o.r2].some(t => breedte(ctx, t, 2) > W - 2 * L) && ks > 50) { ks -= 4; ctx.font = F(700, ks); }
        ctx.save(); ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 24;
        ctx.fillStyle = WIT; spatie(ctx, o.r1, L - 3, 530, 2); ctx.fillStyle = ZAND; spatie(ctx, o.r2, L - 3, 1076, 2);
        ctx.fillStyle = "rgba(244,239,230,.85)"; ctx.font = F(500, 22); spatie(ctx, o.l1 || tk.toUpperCase(), L, 530 - ks * .8 - 18, 7); spatie(ctx, o.l2 || "KAMELEN", L, 1076 - ks * .8 - 18, 7); ctx.restore();
        ctx.fillStyle = WIT; ctx.font = F(700, 34); spatie(ctx, `${namen[0]} \u2013 ${namen[1]}`, L, 1162, 5);
        infoKort(1202, MUTED, true); selectieRegel(1250, "rgba(244,239,230,.6)", false, 20);
        bron = [A, B];
      },

      /* Woordenboek: "kamiel", het Friese woord voor kameel */
      woord() {
        const o = opt.mini || {}, f = FOTO[o.foto]; beeld(ctx, imgs2[0], f, GRADE.zand, 0, 0, W, H);
        verloop(300, 1000, 0, .92); ctx.fillStyle = "rgba(6,5,4,.92)"; ctx.fillRect(0, 1000, W, H - 1000); verloop(180, 0, 0, .5);
        logoOp(L, 50, 52); ctx.fillStyle = WIT; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 92, 7, "right");
        ctx.fillStyle = WIT; ctx.font = `400 170px PSerifR, Georgia, serif`; ctx.textAlign = "left"; ctx.fillText("ka·miel", L - 6, 700);
        ctx.fillStyle = ZAND; ctx.font = `italic 400 36px PSerif, Georgia, serif`; ctx.fillText("(Fries) de; meervoud kamielen", L, 756);
        const def = ["1  Kameel. Taai hoefdier, kan lang zonder water.", "2  Ploeg uit Grins die op snein 29 novimber", "    om 15.30 oere fan Ljouwert wint."];
        ctx.fillStyle = "rgba(244,239,230,.9)"; ctx.font = `400 38px PSerifR, Georgia, serif`; def.forEach((t2, i) => ctx.fillText(t2, L, 840 + i * 52));
        ctx.fillStyle = "rgba(244,239,230,.55)"; ctx.font = `italic 400 30px PSerif, Georgia, serif`; ctx.fillText("Zie ook: Leeuwarden, verliezen.", L, 1024);
        ctx.fillStyle = "rgba(244,239,230,.3)"; ctx.fillRect(L, 1112, W - 2 * L, 1);
        ctx.fillStyle = WIT; ctx.font = F(700, 38); spatie(ctx, `${namen[0]} \u2013 ${namen[1]}`, L, 1170, 5);
        infoKort(1212, MUTED, true); selectieRegel(1262, "rgba(244,239,230,.6)", false, 20); bron = [f];
      },

      /* Teamfoto: de selectie als kamelen in ons shirt, op een echt hockeyveld */
      teamfoto() {
        beeld(ctx, zijImg, FOTO.stadion, GRADE.staal, 0, 0, W, H); ctx.fillStyle = "rgba(0,10,30,.35)"; ctx.fillRect(0, 0, W, H);
        verloop(0, 360, .75, 0); verloop(980, H, 0, .95);
        logoOp(L, 50, 52); ctx.fillStyle = WIT; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 92, 7, "right");
        ctx.fillStyle = WIT; ctx.font = F(700, 112); ctx.textAlign = "left"; ctx.fillText("DE SELECTIE.", L - 4, 250);
        ctx.fillStyle = ZAND; ctx.font = F(300, 34); ctx.fillText(o2.sub || "Zestien kamelen. Eén plan.", L, 300);
        const lijst = (spelers.length ? spelers : Array.from({ length: 12 }, () => "")).slice(0, 18);
        const rijen = lijst.length > 12 ? [Math.ceil(lijst.length / 3), Math.ceil(lijst.length / 3), lijst.length - 2 * Math.ceil(lijst.length / 3)] : [Math.ceil(lijst.length / 2), Math.floor(lijst.length / 2)];
        let i = 0; const yBasis = [530, 770, 1010], labels = [];
        rijen.forEach((n, r) => { const rr = r + (3 - rijen.length), bw = [165, 195, 230][rr] || 210, gap = (W - 40) / n;
          for (let k = 0; k < n; k++, i++) { const x = 20 + gap * k + gap / 2, y = yBasis[rr];
            const c = aangekleed(bw, { spiegel: (k + r) % 2 === 1 }); ctx.save(); ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 18; ctx.drawImage(c, x - bw / 2, y - c.height); ctx.restore();
            if (lijst[i]) labels.push([lijst[i], x, y]); } });
        labels.forEach(([nm, x, y]) => { ctx.font = F(700, 19); const tw = breedte(ctx, nm, 2) + 14; ctx.fillStyle = "rgba(10,20,30,.85)"; ctx.fillRect(x - tw / 2, y + 2, tw, 26); ctx.fillStyle = WIT; spatie(ctx, nm, x, y + 21, 2, "center"); });
        ctx.fillStyle = WIT; ctx.font = F(700, 38); spatie(ctx, `${namen[0]} – ${namen[1]}`, L, 1170, 5); infoKort(1212, MUTED, true);
        ctx.fillStyle = "rgba(244,239,230,.6)"; ctx.font = F(500, 22); ctx.textAlign = "left"; ctx.fillText("Teamfoto genomen vlak voor de winst.", L, 1262);
        bron = [FOTO.stadion, KAMEEL];
      },

      /* Sokken omhoog: een echte kameel in onze oranje sokken */
      sokken() {
        const gr = ctx.createRadialGradient(W / 2, 560, 80, W / 2, 600, 950); gr.addColorStop(0, "#1f5139"); gr.addColorStop(1, "#0a1f15"); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
        for (let k = 0; k < 20000; k++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * .04})`; ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
        const bw = 980, c = aangekleed(bw, { sokken: true, spiegel: true });
        ctx.save(); ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.filter = "blur(18px)"; ctx.beginPath(); ctx.ellipse(W / 2 + 20, 905, 380, 26, 0, 0, 7); ctx.fill(); ctx.restore();
        ctx.save(); ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 30; ctx.drawImage(c, W / 2 - bw / 2 + 40, 910 - c.height); ctx.restore();
        logoOp(L, 50, 52); ctx.fillStyle = WIT; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 92, 7, "right");
        ctx.fillStyle = WIT; ctx.font = F(700, 150); ctx.textAlign = "left"; ctx.fillText("SOKKEN", L - 4, 1010); ctx.fillStyle = "#f26a1b"; ctx.fillText("OMHOOG.", L - 4 + breedte((ctx.font = F(700, 150), ctx), "SOKKEN ", 0), 1010);
        ctx.fillStyle = "rgba(244,239,230,.3)"; ctx.fillRect(L, 1060, W - 2 * L, 1);
        ctx.fillStyle = WIT; ctx.font = F(700, 38); spatie(ctx, `${namen[0]} – ${namen[1]}`, L, 1120, 5);
        infoKort(1162, MUTED, true); selectieRegel(1214, "rgba(244,239,230,.6)", false, 20); bron = [KAMEEL];
      },

      /* Getemd: de leeuw in de kooi, een kameel in ons shirt ervoor */
      getemd() {
        beeld(ctx, imgs2[0] || zijImg, FOTO.kooi, GRADE.zw, 0, 0, W, H); vignet(.55); verloop(700, H, 0, .95); verloop(200, 0, 0, .5);
        const bw = 760, c = aangekleed(bw, {});
        ctx.save(); ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.filter = "blur(18px)"; ctx.beginPath(); ctx.ellipse(330, 985, 300, 24, 0, 0, 7); ctx.fill(); ctx.restore();
        ctx.save(); ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 30; ctx.drawImage(c, -60, 990 - c.height); ctx.restore();
        verloop(940, H, 0, .9);
        logoOp(L, 50, 52); ctx.fillStyle = WIT; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 92, 7, "right");
        ctx.fillStyle = WIT; ctx.font = F(700, 200); ctx.textAlign = "left"; ctx.fillText("GETEMD.", L - 6, 300);
        ctx.fillStyle = "rgba(244,239,230,.3)"; ctx.fillRect(L, 1112, W - 2 * L, 1);
        ctx.fillStyle = WIT; ctx.font = F(700, 38); spatie(ctx, `${namen[0]} – ${namen[1]}`, L, 1170, 5);
        infoKort(1212, MUTED, true); selectieRegel(1262, "rgba(244,239,230,.6)", false, 20); bron = [FOTO.kooi, KAMEEL];
      },

      /* Het plan: tactiekbord op echt kunstgras, alle pijlen eindigen in hun doel */
      plan() {
        const t = document.createElement("canvas"); t.width = W; t.height = H; beeld(t.getContext("2d"), imgs2[0], { ...FOTO.bal, fx: .15, fy: .2, zoom: 2.4 }, { s: [10, 40, 80], h: [120, 200, 255], kleur: .8 }, 0, 0, W, H);
        ctx.save(); ctx.filter = "blur(2px)"; ctx.drawImage(t, 0, 0); ctx.restore(); ctx.fillStyle = "rgba(8,40,90,.35)"; ctx.fillRect(0, 0, W, H);
        /* veldlijnen */
        const vx = 90, vy = 150, vw = W - 180, vh = 900; ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 4; ctx.strokeRect(vx, vy, vw, vh);
        ctx.beginPath(); ctx.moveTo(vx, vy + vh / 2); ctx.lineTo(vx + vw, vy + vh / 2); ctx.stroke();
        [vy, vy + vh].forEach((y, k) => { const d = k ? -1 : 1; ctx.beginPath(); ctx.arc(W / 2, y, 230, d > 0 ? 0 : Math.PI, d > 0 ? Math.PI : 2 * Math.PI); ctx.stroke(); ctx.fillStyle = "#fff"; ctx.fillRect(W / 2 - 55, y - (d > 0 ? 14 : 0), 110, 14); });
        ctx.setLineDash([12, 12]); [vy, vy + vh].forEach((y, k) => { const d = k ? -1 : 1; ctx.beginPath(); ctx.arc(W / 2, y, 300, d > 0 ? 0 : Math.PI, d > 0 ? Math.PI : 2 * Math.PI); ctx.stroke(); }); ctx.setLineDash([]);
        /* tegenstanders */
        const zij = [[300, 330], [520, 300], [760, 340], [420, 450], [650, 470]];
        zij.forEach(([x, y]) => { ctx.fillStyle = "#2a2a2a"; ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.stroke(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 9, y - 9); ctx.lineTo(x + 9, y + 9); ctx.moveTo(x + 9, y - 9); ctx.lineTo(x - 9, y + 9); ctx.stroke(); });
        /* onze kamelen als magneten, met krijtpijlen naar het doel */
        const wij = [[220, 860], [430, 760], [640, 820], [860, 700], [540, 620]];
        ctx.strokeStyle = "rgba(255,255,255,.95)"; ctx.lineWidth = 5; ctx.lineCap = "round";
        const pijl = (x1, y1, cx, cy, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx, cy, x2, y2); ctx.stroke(); const a = Math.atan2(y2 - cy, x2 - cx); ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - 22 * Math.cos(a - .5), y2 - 22 * Math.sin(a - .5)); ctx.moveTo(x2, y2); ctx.lineTo(x2 - 22 * Math.cos(a + .5), y2 - 22 * Math.sin(a + .5)); ctx.stroke(); };
        pijl(220, 830, 160, 520, 470, 200); pijl(430, 730, 300, 520, 520, 190); pijl(640, 790, 860, 500, 560, 195); pijl(860, 670, 960, 420, 610, 200); pijl(540, 590, 470, 400, 540, 200);
        wij.forEach(([x, y]) => { ctx.save(); ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 12; ctx.fillStyle = "#f26a1b"; ctx.beginPath(); ctx.arc(x, y, 38, 0, 7); ctx.fill(); ctx.restore(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 38, 0, 7); ctx.stroke();
          if (logo) { const w2 = 52, h2 = w2 * logo.height / logo.width; ctx.drawImage(kameelVorm("#fff", w2), x - w2 / 2, y - h2 / 2); } });
        logoOp(L, 40, 48); ctx.fillStyle = WIT; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 82, 7, "right");
        ctx.fillStyle = "rgba(5,20,45,.92)"; ctx.fillRect(0, 1080, W, H - 1080);
        ctx.fillStyle = WIT; ctx.font = F(700, 96); ctx.textAlign = "left"; ctx.fillText("HET PLAN.", L - 4, 1176);
        ctx.fillStyle = WIT; ctx.font = F(700, 30); spatie(ctx, `${namen[0]} – ${namen[1]}`, L + 470, 1150, 4);
        ctx.fillStyle = MUTED; ctx.font = F(500, 22); ctx.fillText("Alle pijlen wijzen dezelfde kant op.", L + 470, 1180);
        infoKort(1236, MUTED, true); selectieRegel(1282, "rgba(244,239,230,.6)", false, 19); bron = [FOTO.bal];
      },

      /* De eerste zit al: een echte bal in een echt doel */
      eerste() {
        beeld(ctx, imgs2[0], FOTO.doel, GRADE.groen, 0, 0, W, H); vignet(.55); verloop(760, H, 0, .95); verloop(200, 0, 0, .5);
        /* bal uitknippen uit de close-up en in het net leggen */
        const b = imgs2[1]; if (b) { const r = 188 * b.width / 1280, cx = b.width * .5, cy = b.height * .49, d = 74;
          const c = document.createElement("canvas"); c.width = c.height = d; const t = c.getContext("2d"); t.beginPath(); t.arc(d / 2, d / 2, d / 2, 0, 7); t.clip(); t.drawImage(b, cx - r, cy - r, r * 2, r * 2, 0, 0, d, d);
          ctx.save(); ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.filter = "blur(6px)"; ctx.beginPath(); ctx.ellipse(o2.balX || 560, (o2.balY || 760) + d / 2 - 4, d * .55, 8, 0, 0, 7); ctx.fill(); ctx.restore();
          ctx.drawImage(c, (o2.balX || 560) - d / 2, (o2.balY || 760) - d / 2); }
        logoOp(L, 50, 52); ctx.fillStyle = WIT; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 92, 7, "right");
        ctx.fillStyle = WIT; ctx.font = F(700, 150); ctx.textAlign = "left"; ctx.fillText("DE EERSTE", L - 4, 990); ctx.fillStyle = "#f26a1b"; ctx.fillText("ZIT AL.", L - 4, 1124 - 20);
        ctx.fillStyle = "rgba(244,239,230,.3)"; ctx.fillRect(L, 1140, W - 2 * L, 1);
        ctx.fillStyle = WIT; ctx.font = F(700, 34); spatie(ctx, `${namen[0]} – ${namen[1]}`, L, 1190, 5);
        infoKort(1228, MUTED, true); selectieRegel(1272, "rgba(244,239,230,.6)", false, 19); bron = [FOTO.doel, FOTO.bal];
      },
      /* Tenue: shirt, broek of sokken als echt voorwerp op een effen ondergrond */
      tenue() {
        const o = opt.mini || {}, [c1, c2] = o.bg || ["#1d4a35", "#0f2a1e"], ink = o.ink || WIT, acc = o.accent || "#f26a1b";
        const gr = ctx.createRadialGradient(W / 2, 520, 80, W / 2, 600, 950); gr.addColorStop(0, c1); gr.addColorStop(1, c2); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 26000; i++) { ctx.fillStyle = `rgba(${Math.random() > .5 ? "255,255,255" : "0,0,0"},${Math.random() * .05})`; ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
        if (o.hanger) { ctx.strokeStyle = "rgba(220,220,220,.9)"; ctx.lineWidth = 7; ctx.lineCap = "round"; const hx = o.hanger[0], hy = o.hanger[1];
          ctx.beginPath(); ctx.moveTo(hx, hy + 60); ctx.lineTo(hx, hy + 26); ctx.arc(hx + 18, hy + 26, 18, Math.PI, Math.PI * 1.9); ctx.stroke(); }
        (o.items || []).forEach(it => { const img = TENUE[it.img]; if (!img) return; const h = it.h, w = h * img.width / img.height;
          ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot || 0); ctx.imageSmoothingQuality = "high";
          ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18; ctx.drawImage(img, -w / 2, -h / 2, w, h); ctx.restore(); });
        logoOp(L, 50, 52); ctx.fillStyle = ink; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 92, 7, "right");
        const kop = o.kop || []; let ks = o.size || 150; ctx.font = F(700, ks); while (kop.some(t => breedte(ctx, t, 3) > W - 2 * L) && ks > 60) { ks -= 4; ctx.font = F(700, ks); }
        const ky = o.kopY || 1040 - (kop.length - 1) * ks * .9;
        kop.forEach((t, i) => { ctx.fillStyle = i === kop.length - 1 && o.accentKop ? acc : ink; ctx.font = F(700, ks); spatie(ctx, t, L - 4, ky + i * ks * .9, 3); });
        ctx.fillStyle = o.lijn || "rgba(244,239,230,.3)"; ctx.fillRect(L, 1112, W - 2 * L, 1);
        ctx.fillStyle = ink; ctx.font = F(700, 38); spatie(ctx, `${namen[0]} \u2013 ${namen[1]}`, L, 1170, 5);
        infoKort(1212, o.zacht || MUTED, true); selectieRegel(1262, o.zacht || "rgba(244,239,230,.6)", false, 20); bron = [];
      },

      /* Wapen met motto (Studs): hun motto is "Vindicat atque polit", het onze wordt "Venit atque vincit" */
      motto() {
        const GOUD = "#c9a45a", gr = ctx.createRadialGradient(W / 2, 520, 60, W / 2, 600, 950); gr.addColorStop(0, "#1b4a33"); gr.addColorStop(1, "#071a10"); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 30000; i++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * .03})`; ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5); }
        ctx.strokeStyle = GOUD; ctx.lineWidth = 2; ctx.strokeRect(40, 40, W - 80, H - 80); ctx.lineWidth = 1; ctx.strokeRect(52, 52, W - 104, H - 104);
        /* schild */
        const sx = W / 2, sy = 170, sw = 400, sh = 480;
        ctx.save(); ctx.beginPath(); ctx.moveTo(sx - sw / 2, sy); ctx.lineTo(sx + sw / 2, sy); ctx.lineTo(sx + sw / 2, sy + sh * .55); ctx.quadraticCurveTo(sx + sw / 2, sy + sh * .9, sx, sy + sh); ctx.quadraticCurveTo(sx - sw / 2, sy + sh * .9, sx - sw / 2, sy + sh * .55); ctx.closePath();
        const sg = ctx.createLinearGradient(0, sy, 0, sy + sh); sg.addColorStop(0, "#1f5a3d"); sg.addColorStop(1, "#0d2c1d"); ctx.fillStyle = sg; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = GOUD; ctx.stroke();
        ctx.clip(); ctx.fillStyle = "rgba(242,106,27,.9)"; ctx.fillRect(sx - sw / 2, sy, sw, 84); ctx.restore();
        if (logo) { const bw = 270, bh = bw * logo.height / logo.width; ctx.drawImage(kameelVorm(GOUD, bw), sx - bw / 2, sy + 145); }
        /* drie sterren in de bovenrand */
        ctx.fillStyle = "#fff4e0"; [-100, 0, 100].forEach(dx => { ctx.save(); ctx.translate(sx + dx, sy + 42); ctx.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 7 : 16, a = -Math.PI / 2 + k * Math.PI / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.fill(); ctx.restore(); });
        /* lint met motto */
        const ly = sy + sh + 50; ctx.fillStyle = "#e9dcc0"; ctx.beginPath(); ctx.moveTo(150, ly); ctx.lineTo(W - 150, ly); ctx.lineTo(W - 120, ly + 40); ctx.lineTo(W - 150, ly + 80); ctx.lineTo(150, ly + 80); ctx.lineTo(120, ly + 40); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#14321f"; ctx.font = `400 44px PSerifR, Georgia, serif`; spatie(ctx, "VENIT ATQUE VINCIT", W / 2, ly + 55, 6, "center");
        ctx.fillStyle = GOUD; ctx.font = F(500, 22); spatie(ctx, "SOCIETAS CAMELORUM GRONINGANA", W / 2, ly + 140, 10, "center");
        ctx.fillStyle = "#f4ecd8"; ctx.font = `400 92px PSerifR, Georgia, serif`; ctx.textAlign = "center"; ctx.fillText(`${namen[0][0]}${namen[0].slice(1).toLowerCase()} \u2013 ${namen[1][0]}${namen[1].slice(1).toLowerCase()}`, W / 2, ly + 270);
        ctx.fillStyle = GOUD; ctx.fillRect(W / 2 - 60, ly + 305, 120, 2);
        ctx.fillStyle = "#f4ecd8"; ctx.font = F(500, 24); spatie(ctx, `${weekdag} ${datum}  /  ${tijd.toUpperCase()}  /  ${wijThuis ? "THUIS" : "UIT"}, ${plek.toUpperCase()}`, W / 2, ly + 360, 5, "center");
        const lijst = spelers.length ? spelers : leeg; ctx.fillStyle = "rgba(244,236,216,.7)"; ctx.font = F(500, 20);
        let regel = "", y = ly + 410, regels = []; lijst.forEach(n => { if (breedte(ctx, regel + n + "   ", 3) > W - 260) { regels.push(regel.trim()); regel = ""; } regel += n + "   "; }); regels.push(regel.trim());
        regels.forEach((r, i) => spatie(ctx, r, W / 2, y + i * 30, 3, "center"));
        bron = [];
      },

      /* Duotoon: een echte foto in alleen groen en oranje (onze kleuren), met één woord in omlijning eroverheen */
      duotoon() {
        const o = opt.mini || {}, f = FOTO[o.foto] || zijF, img = imgs2[0] || zijImg;
        const c = document.createElement("canvas"); c.width = W; c.height = H; const t = c.getContext("2d"); beeld(t, img, f, { s: [0, 0, 0], h: [255, 255, 255], kleur: 0 }, 0, 0, W, H);
        const px = t.getImageData(0, 0, W, H), d = px.data, A = o.donker || [8, 38, 26], B = o.licht || [242, 106, 27];
        for (let i = 0; i < d.length; i += 4) { let v = d[i] / 255; v = Math.min(1, Math.max(0, (v - .12) * 1.35)); for (let k = 0; k < 3; k++) d[i + k] = A[k] + (B[k] - A[k]) * v; }
        t.putImageData(px, 0, 0); ctx.drawImage(c, 0, 0);
        /* raster van fijne lijnen voor drukwerkgevoel */
        ctx.fillStyle = "rgba(0,0,0,.08)"; for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
        verloop(880, H, 0, .9);
        logoOp(L, 50, 52); ctx.fillStyle = "#fff4e6"; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 92, 7, "right");
        /* het woord: groot, alleen de omlijning, met een volle kopie die een stukje verschoven is */
        let ks = o.size || 300; ctx.font = F(700, ks); while (breedte(ctx, o.kop, 4) > W - 2 * L && ks > 80) { ks -= 6; ctx.font = F(700, ks); }
        const ky = o.kopY || 860;
        ctx.fillStyle = "rgba(255,244,230,.95)"; spatie(ctx, o.kop, L - 6, ky, 4);
        ctx.lineWidth = 3; ctx.strokeStyle = "#fff4e6"; let cx = L - 6 + 12; for (const ch of o.kop) { ctx.strokeText(ch, cx, ky + 14); cx += ctx.measureText(ch).width + 4; }
        ctx.fillStyle = "rgba(255,244,230,.4)"; ctx.fillRect(L, 1112, W - 2 * L, 1);
        ctx.fillStyle = "#fff4e6"; ctx.font = F(700, 38); spatie(ctx, `${namen[0]} – ${namen[1]}`, L, 1170, 5);
        infoKort(1212, "rgba(255,244,230,.75)", true); selectieRegel(1262, "rgba(255,244,230,.6)", false, 20); bron = [f];
      },

      /* Vorm: de laatste vijf uitslagen van beide ploegen als grote letters */
      vorm() {
        ctx.fillStyle = "#f1ece2"; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 16000; i++) { ctx.fillStyle = `rgba(0,0,0,${Math.random() * .035})`; ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
        const INK = "#14120f", alle = (opt.alleUitslagen || []).filter(x => x.score).sort((a, b) => b.datum.localeCompare(a.datum));
        const vijf = team => alle.filter(x => x.thuis === team || x.uit === team).slice(0, 5).map(x => { const [a, b] = x.score.split("-").map(Number), th = x.thuis === team, v = th ? a : b, z = th ? b : a; return v > z ? "W" : v < z ? "V" : "G"; }).reverse();
        const wijT = wijThuis ? m.thuis : m.uit;
        logoOp(L, 50, 52); ctx.fillStyle = INK; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 92, 7, "right");
        ctx.fillStyle = INK; ctx.font = F(700, 190); ctx.textAlign = "left"; ctx.fillText("VORM.", L - 8, 300);
        ctx.font = F(500, 22); spatie(ctx, "LAATSTE VIJF WEDSTRIJDEN", L, 350, 7);
        const rij = (naam, lijst, y) => {
          ctx.fillStyle = INK; ctx.font = F(700, 44); spatie(ctx, naam, L, y, 4);
          const kleur = { W: "#2f8a57", G: "#8b9298", V: "#c94430" };
          for (let k = 0; k < 5; k++) { const r = lijst[k], x = L + 2 + k * 186, yy = y + 30;
            ctx.fillStyle = r ? kleur[r] : "rgba(0,0,0,.08)"; ctx.fillRect(x, yy, 170, 170);
            ctx.fillStyle = "#fff"; ctx.font = F(700, 140); ctx.textAlign = "center"; ctx.fillText(r || "", x + 85, yy + 138); ctx.textAlign = "left"; } };
        rij("KAMELEN", vijf(wijT), 470); rij(tk.toUpperCase(), vijf(tegen), 790);
        ctx.fillStyle = INK; ctx.fillRect(L, 1112, W - 2 * L, 2);
        ctx.fillStyle = INK; ctx.font = F(700, 38); spatie(ctx, `${namen[0]} – ${namen[1]}`, L, 1170, 5);
        infoKort(1212, "rgba(20,18,15,.7)", true); selectieRegel(1262, "rgba(20,18,15,.6)", false, 20); bron = [];
      },

      /* Plaat: de laatste thuiswedstrijd als lp, de selectie als tracklist */
      plaat() {
        ctx.fillStyle = "#121212"; ctx.fillRect(0, 0, W, H);
        const gr = ctx.createRadialGradient(W / 2, 480, 50, W / 2, 480, 800); gr.addColorStop(0, "rgba(242,106,27,.18)"); gr.addColorStop(1, "rgba(242,106,27,0)"); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
        const S = 640, hx = 110, hy = 140;
        /* plaat die uit de hoes schuift */
        const px = hx + S - 120, py = hy + S / 2, R = S / 2 - 10;
        ctx.save(); ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 30; ctx.fillStyle = "#0b0b0b"; ctx.beginPath(); ctx.arc(px, py, R, 0, 7); ctx.fill(); ctx.restore();
        for (let r = R - 8; r > 110; r -= 5) { ctx.strokeStyle = `rgba(255,255,255,${.03 + (r % 15 === 0 ? .03 : 0)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.stroke(); }
        const gl = ctx.createLinearGradient(px - R, py - R, px + R, py + R); gl.addColorStop(.35, "rgba(255,255,255,0)"); gl.addColorStop(.5, "rgba(255,255,255,.09)"); gl.addColorStop(.65, "rgba(255,255,255,0)"); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(px, py, R, 0, 7); ctx.fill();
        ctx.fillStyle = "#f26a1b"; ctx.beginPath(); ctx.arc(px, py, 100, 0, 7); ctx.fill();
        if (logo) { const w2 = 120, h2 = w2 * logo.height / logo.width; ctx.drawImage(kameelVorm("#14120f", w2), px - w2 / 2, py - h2 / 2 - 12); }
        ctx.fillStyle = "#14120f"; ctx.font = F(700, 16); ctx.textAlign = "center"; ctx.fillText("KANT A  /  33 TOEREN", px, py + 56); ctx.fillStyle = "#0b0b0b"; ctx.beginPath(); ctx.arc(px, py, 6, 0, 7); ctx.fill();
        /* hoes */
        ctx.save(); ctx.shadowColor = "rgba(0,0,0,.7)"; ctx.shadowBlur = 50; ctx.shadowOffsetX = 10; ctx.fillStyle = "#1e5a3c"; ctx.fillRect(hx, hy, S, S); ctx.restore();
        const hg = ctx.createLinearGradient(hx, hy, hx + S, hy + S); hg.addColorStop(0, "rgba(255,255,255,.06)"); hg.addColorStop(1, "rgba(0,0,0,.25)"); ctx.fillStyle = hg; ctx.fillRect(hx, hy, S, S);
        ctx.fillStyle = "#f26a1b"; ctx.fillRect(hx, hy + S - 150, S, 10); ctx.fillStyle = "#fff4e6"; ctx.fillRect(hx, hy + S - 132, S, 4);
        ctx.fillStyle = "#fff4e6"; ctx.font = F(700, 132); ctx.textAlign = "left"; ctx.fillText("KAMELEN", hx + 36, hy + 160);
        ctx.font = F(300, 44); ctx.fillText("Live in Stad", hx + 40, hy + 220);
        ctx.fillStyle = "#f26a1b"; ctx.font = F(700, 28); spatie(ctx, `${weekdag} ${datum}`, hx + 40, hy + S - 60, 6);
        ctx.fillStyle = "rgba(255,244,230,.7)"; ctx.font = F(500, 20); spatie(ctx, "SEIZOENSAFSLUITER  /  LAATSTE THUISWEDSTRIJD", hx + 40, hy + S - 26, 4);
        /* tracklist */
        const lijst = spelers.length ? spelers : ["SELECTIE VOLGT"], half = Math.ceil(lijst.length / 2);
        ctx.fillStyle = "#fff4e6"; ctx.font = F(700, 22); spatie(ctx, "TRACKLIST", L, 870, 8);
        lijst.forEach((n, k) => { const kant = k < half ? "A" : "B", nr = (k < half ? k : k - half) + 1, x = L + (k < half ? 0 : 470), y = 910 + (k < half ? k : k - half) * 30;
          ctx.fillStyle = "#f26a1b"; ctx.font = F(700, 20); ctx.textAlign = "left"; ctx.fillText(`${kant}${nr}`, x, y); ctx.fillStyle = "rgba(255,244,230,.85)"; ctx.font = F(500, 20); spatie(ctx, n, x + 44, y, 3); });
        ctx.fillStyle = "rgba(255,244,230,.25)"; ctx.fillRect(L, 1172, W - 2 * L, 1);
        ctx.fillStyle = "#fff4e6"; ctx.font = F(700, 34); spatie(ctx, `${namen[0]} – ${namen[1]}`, L, 1220, 5);
        infoKort(1262, "rgba(255,244,230,.6)", true); bron = [];
      },
      /* Data-reeks (zelfde stijl als VORM): één feit, groot en droog */
      punt() {
        ctx.fillStyle = "#f1ece2"; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 16000; i++) { ctx.fillStyle = `rgba(0,0,0,${Math.random() * .035})`; ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
        const INK = "#14120f", st = (opt.standLijst || []).slice().sort((a, b) => a.positie - b.positie);
        const wij = st.find(x => /gchc/i.test(x.team)), zij = st.find(x => x.team === tegen);
        logoOp(L, 50, 52); ctx.fillStyle = INK; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 92, 7, "right");
        const vers = zij && wij ? Math.abs(zij.punten - wij.punten) : 0;
        ctx.fillStyle = INK; ctx.font = F(700, 190); ctx.textAlign = "left"; ctx.fillText(`${vers} ${vers === 1 ? "PUNT" : "PUNTEN"}.`, L - 8, 300);
        ctx.font = F(500, 22); spatie(ctx, "HET VERSCHIL IN DE STAND", L, 350, 7);
        /* de twee regels uit de stand, de onze in oranje */
        const regels = [zij, wij].filter(Boolean).sort((a, b) => a.positie - b.positie);
        regels.forEach((r, k) => { const y = 470 + k * 200, ons = /gchc/i.test(r.team);
          ctx.fillStyle = ons ? "#f26a1b" : "#14120f"; ctx.fillRect(L, y, W - 2 * L - 120, 170);
          ctx.fillStyle = "#fff"; ctx.font = F(700, 110); ctx.textAlign = "left"; ctx.fillText(String(r.positie), L + 30, y + 128);
          ctx.font = F(700, 64); ctx.fillText(ons ? "KAMELEN" : kortTeam(r.team).toUpperCase(), L + 150, y + 108);
          ctx.textAlign = "right"; ctx.font = F(700, 90); ctx.fillText(String(r.punten), W - L - 150, y + 122); ctx.textAlign = "left"; });
        /* pijl: wij gaan erover */
        ctx.strokeStyle = "#f26a1b"; ctx.lineWidth = 12; ctx.lineCap = "round"; const ax = W - L - 50;
        ctx.beginPath(); ctx.moveTo(ax, 790); ctx.quadraticCurveTo(ax + 50, 650, ax, 520); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ax - 24, 548); ctx.lineTo(ax, 512); ctx.lineTo(ax + 30, 540); ctx.stroke();
        ctx.fillStyle = INK; ctx.fillRect(L, 1112, W - 2 * L, 2);
        ctx.font = F(700, 38); spatie(ctx, `${namen[0]} – ${namen[1]}`, L, 1170, 5);
        infoKort(1212, "rgba(20,18,15,.7)", true); selectieRegel(1262, "rgba(20,18,15,.6)", false, 20); bron = [];
      },

      vorige() {
        ctx.fillStyle = "#f1ece2"; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 16000; i++) { ctx.fillStyle = `rgba(0,0,0,${Math.random() * .035})`; ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
        const INK = "#14120f", o = opt.mini || {};
        const v = (opt.alleUitslagen || []).filter(x => x.score && (x.thuis === tegen || x.uit === tegen) && (/gchc/i.test(x.thuis) || /gchc/i.test(x.uit))).sort((a, b) => b.datum.localeCompare(a.datum))[0];
        logoOp(L, 50, 52); ctx.fillStyle = INK; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 92, 7, "right");
        const bord = (y, titel, thuisN, uitN, a, b, kleurA, kleurB) => {
          ctx.fillStyle = INK; ctx.font = F(700, o.deze ? 120 : 190); ctx.textAlign = "left"; ctx.fillText(titel, L - 8, y);
          const by = y + (o.deze ? 50 : 70), bw = (W - 2 * L - 30) / 2, bh = o.deze ? 250 : 380;
          [[thuisN, a, kleurA], [uitN, b, kleurB]].forEach(([n, sc, kl], k) => { const x = L + k * (bw + 30);
            ctx.fillStyle = kl; ctx.fillRect(x, by, bw, bh);
            ctx.fillStyle = "#fff"; ctx.font = F(700, 34); spatie(ctx, n, x + bw / 2, by + 56, 5, "center");
            ctx.font = F(700, o.deze ? 170 : 280); ctx.textAlign = "center"; ctx.fillText(sc, x + bw / 2, by + bh - (o.deze ? 34 : 50)); ctx.textAlign = "left"; });
        };
        if (v) { const [a, b] = v.score.split("-"), ta = /gchc/i.test(v.thuis) ? "KAMELEN" : kortTeam(v.thuis).toUpperCase(), tb = /gchc/i.test(v.uit) ? "KAMELEN" : kortTeam(v.uit).toUpperCase();
          const winA = +a > +b, kl = n => n === "KAMELEN" ? "#f26a1b" : "#14120f";
          bord(o.deze ? 260 : 300, "VORIGE KEER.", ta, tb, a, b, kl(ta), kl(tb));
          if (o.deze) { const th = namen[0], ut = namen[1]; bord(760, "DEZE KEER.", th, ut, "?", "?", th === "KAMELEN" ? "#f26a1b" : "#14120f", ut === "KAMELEN" ? "#f26a1b" : "#14120f"); }
          ctx.fillStyle = "rgba(20,18,15,.6)"; ctx.font = F(500, 22); spatie(ctx, new Date(v.datum + "T12:00").toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }).toUpperCase(), L, o.deze ? 300 : 352, 6); }
        ctx.fillStyle = INK; ctx.fillRect(L, 1112, W - 2 * L, 2);
        ctx.font = F(700, 38); spatie(ctx, `${namen[0]} – ${namen[1]}`, L, 1170, 5);
        infoKort(1212, "rgba(20,18,15,.7)", true); selectieRegel(1262, "rgba(20,18,15,.6)", false, 20); bron = [];
      },

      /* De derby's als lp: tracklist = alle onderlinge derby's van dit seizoen, de selectie als bezetting */
      derbyplaat() {
        ctx.fillStyle = "#0e1d2b"; ctx.fillRect(0, 0, W, H);
        const gr = ctx.createRadialGradient(W / 2, 460, 50, W / 2, 460, 800); gr.addColorStop(0, "rgba(240,140,28,.18)"); gr.addColorStop(1, "rgba(240,140,28,0)"); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
        const S = 600, hx = 90, hy = 110, px = hx + S - 110, py = hy + S / 2, R = S / 2 - 10;
        ctx.save(); ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 30; ctx.fillStyle = "#0b0b0b"; ctx.beginPath(); ctx.arc(px, py, R, 0, 7); ctx.fill(); ctx.restore();
        for (let r = R - 8; r > 105; r -= 5) { ctx.strokeStyle = `rgba(255,255,255,${.03 + (r % 15 === 0 ? .03 : 0)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.stroke(); }
        ctx.fillStyle = "#f08c1c"; ctx.beginPath(); ctx.arc(px, py, 95, 0, 7); ctx.fill();
        if (logo) { const w2 = 110, h2 = w2 * logo.height / logo.width; ctx.drawImage(kameelVorm("#14120f", w2), px - w2 / 2, py - h2 / 2 - 10); }
        ctx.fillStyle = "#0b0b0b"; ctx.beginPath(); ctx.arc(px, py, 6, 0, 7); ctx.fill();
        /* hoes: links onze helft, rechts die van hen */
        ctx.save(); ctx.shadowColor = "rgba(0,0,0,.7)"; ctx.shadowBlur = 50; ctx.fillStyle = "#163650"; ctx.fillRect(hx, hy, S, S); ctx.restore();
        ctx.fillStyle = "#f08c1c"; ctx.beginPath(); ctx.moveTo(hx + S * .78, hy); ctx.lineTo(hx + S, hy); ctx.lineTo(hx + S, hy + S); ctx.lineTo(hx + S * .22, hy + S); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#fff4e6"; ctx.font = F(700, 88); ctx.textAlign = "left"; ctx.fillText("KAMELEN", hx + 32, hy + 112);
        ctx.fillStyle = "#163650"; ctx.font = F(700, 88); ctx.textAlign = "right"; ctx.fillText(tk.toUpperCase(), hx + S - 32, hy + S - 140); ctx.textAlign = "left";
        ctx.fillStyle = "#163650"; ctx.font = F(500, 24); ctx.textAlign = "right"; spatie(ctx, "DE DERBY'S, SEIZOEN 26/27", hx + S - 32, hy + S - 100, 4, "right");
        ctx.font = F(300, 22); spatie(ctx, "LIVE OPGENOMEN IN GRONINGEN", hx + S - 32, hy + S - 66, 4, "right"); ctx.textAlign = "left";
        /* tracklist: alle duels met deze club */
        const club = clubVan(tegen), duels = [...(opt.alleUitslagen || []), ...(opt.seizoen || [])].filter((x, i, a) => a.findIndex(y => y.datum === x.datum && y.thuis === x.thuis) === i)
          .filter(x => (/gchc/i.test(x.thuis) || /gchc/i.test(x.uit)) && clubVan(/gchc/i.test(x.thuis) ? x.uit : x.thuis) === club).sort((a, b) => a.datum.localeCompare(b.datum));
        ctx.fillStyle = "#fff4e6"; ctx.font = F(700, 22); spatie(ctx, "TRACKLIST", L, 800, 8);
        duels.forEach((x, k) => { const y = 846 + k * 40, nu = x.datum === m.datum, ta = /gchc/i.test(x.thuis) ? "Kamelen" : kortTeam(x.thuis), tb = /gchc/i.test(x.uit) ? "Kamelen" : kortTeam(x.uit);
          ctx.fillStyle = "#f08c1c"; ctx.font = F(700, 24); ctx.textAlign = "left"; ctx.fillText(String(k + 1).padStart(2, "0"), L, y);
          ctx.fillStyle = nu ? "#f08c1c" : "rgba(255,244,230,.88)"; ctx.font = F(nu ? 700 : 500, 26); ctx.fillText(`${ta} – ${tb}`, L + 54, y);
          ctx.textAlign = "right"; ctx.fillText(nu ? "nieuw, live" : (x.score ? x.score.replace("-", ":") : "nog te spelen"), W - L, y); ctx.textAlign = "left"; });
        ctx.fillStyle = "rgba(255,244,230,.25)"; ctx.fillRect(L, 1150, W - 2 * L, 1);
        const lijst = spelers.length ? spelers.map(n => n[0] + n.slice(1).toLowerCase()) : ["volgt"];
        ctx.fillStyle = "rgba(255,244,230,.6)"; ctx.font = F(500, 21); ctx.textAlign = "left"; let r2 = "Bezetting: ", yb = 1190;
        lijst.forEach((n, k) => { const s2 = n + (k < lijst.length - 1 ? ", " : "."); if (ctx.measureText(r2 + s2).width > W - 2 * L) { ctx.fillText(r2, L, yb); yb += 28; r2 = ""; } r2 += s2; }); ctx.fillText(r2, L, yb);
        infoKort(yb + 50, "rgba(255,244,230,.75)", true); bron = [];
      },
      /* Daring: twee speelkaarten. Onze aas tegen hun twee. */
      kaarten() {
        const NAVY = "#163650", OR = "#f08c1c", SKY = "#b9d8e8", CR = "#f6efe2";
        const gr = ctx.createRadialGradient(W / 2, 560, 60, W / 2, 600, 900); gr.addColorStop(0, "#1f4a6b"); gr.addColorStop(1, "#0b1f33"); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 20000; i++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * .03})`; ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
        logoOp(L, 50, 52); ctx.fillStyle = CR; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 92, 7, "right");
        const kaart = (x, y, rot, waarde, naam, symbool, kleur, schaal = 1) => {
          const kw = 400 * schaal, kh = 580 * schaal; ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
          ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16; ctx.fillStyle = CR; ctx.beginPath(); ctx.roundRect(-kw / 2, -kh / 2, kw, kh, 26 * schaal); ctx.fill(); ctx.shadowColor = "transparent";
          ctx.strokeStyle = "rgba(22,54,80,.15)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-kw / 2 + 14 * schaal, -kh / 2 + 14 * schaal, kw - 28 * schaal, kh - 28 * schaal, 16 * schaal); ctx.stroke();
          const hoek = (sx, sy, r) => { ctx.save(); ctx.translate(sx, sy); ctx.rotate(r); ctx.fillStyle = kleur; ctx.font = F(700, 70 * schaal); ctx.textAlign = "center"; ctx.fillText(waarde, 0, 0); symbool(0, 34 * schaal, 26 * schaal); ctx.restore(); };
          hoek(-kw / 2 + 52 * schaal, -kh / 2 + 84 * schaal, 0); hoek(kw / 2 - 52 * schaal, kh / 2 - 84 * schaal, Math.PI);
          symbool(0, 0, 130 * schaal);
          ctx.fillStyle = kleur; ctx.font = F(700, 26 * schaal); spatie(ctx, naam, 0, kh / 2 - 130 * schaal, 6, "center");
          ctx.restore(); };
        const kameel = (x, y, s) => { if (!logo) return; const w2 = s * 1.6, h2 = w2 * logo.height / logo.width; ctx.drawImage(kameelVorm(OR, w2), x - w2 / 2, y - h2 / 2); };
        const schop = (x, y, s) => { ctx.fillStyle = NAVY; ctx.beginPath(); ctx.moveTo(x, y - s * .55); ctx.bezierCurveTo(x + s * .7, y - s * .05, x + s * .45, y + s * .45, x, y + s * .15); ctx.bezierCurveTo(x - s * .45, y + s * .45, x - s * .7, y - s * .05, x, y - s * .55); ctx.fill(); ctx.fillRect(x - s * .06, y + s * .05, s * .12, s * .4); };
        kaart(390, 600, -.12, "2", tk.toUpperCase(), schop, NAVY, .86);
        kaart(650, 560, .08, "A", "KAMELEN", kameel, OR, 1.04);
        ctx.fillStyle = CR; ctx.font = F(700, 42); spatie(ctx, `${namen[0]} – ${namen[1]}`, L, 1150, 5);
        infoKort(1194, "rgba(246,239,226,.75)", true); selectieRegel(1246, "rgba(246,239,226,.6)", false, 20); bron = [];
      },

      /* Emmen: navigatiescherm, route Emmen naar Groningen */
      navigatie() {
        const NAVY = "#163650", OR = "#f08c1c", SKY = "#b9d8e8", CR = "#f6efe2";
        ctx.fillStyle = OR; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 16000; i++) { ctx.fillStyle = `rgba(0,0,0,${Math.random() * .04})`; ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
        logoOp(L, 50, 52); ctx.fillStyle = NAVY; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 92, 7, "right");
        /* telefoon */
        const tx = W / 2 - 230, ty = 140, tw = 460, th = 900;
        ctx.save(); ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20; ctx.fillStyle = "#111"; ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, 60); ctx.fill(); ctx.restore();
        const sx = tx + 16, sy = ty + 16, sw = tw - 32, sh = th - 32;
        ctx.save(); ctx.beginPath(); ctx.roundRect(sx, sy, sw, sh, 46); ctx.clip();
        ctx.fillStyle = "#e9eef2"; ctx.fillRect(sx, sy, sw, sh);
        /* kaart: wegen, water, groen */
        ctx.fillStyle = "#cfe3c7"; ctx.beginPath(); ctx.ellipse(sx + 90, sy + 520, 140, 90, .4, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(sx + 360, sy + 260, 110, 70, -.3, 0, 7); ctx.fill();
        ctx.fillStyle = "#bcd8ea"; ctx.beginPath(); ctx.ellipse(sx + 330, sy + 600, 90, 40, .6, 0, 7); ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 14; [[0, 300, sw, 380], [120, 0, 200, sh], [0, 640, sw, 560], [300, 0, 260, sh]].forEach(([a, b, c, d]) => { ctx.beginPath(); ctx.moveTo(sx + a, sy + b); ctx.lineTo(sx + c, sy + d); ctx.stroke(); });
        /* route */
        ctx.strokeStyle = NAVY; ctx.lineWidth = 12; ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.beginPath(); ctx.moveTo(sx + 300, sy + 720); ctx.lineTo(sx + 270, sy + 560); ctx.lineTo(sx + 210, sy + 430); ctx.lineTo(sx + 230, sy + 300); ctx.lineTo(sx + 180, sy + 190); ctx.stroke();
        ctx.fillStyle = NAVY; ctx.beginPath(); ctx.arc(sx + 300, sy + 720, 14, 0, 7); ctx.fill();
        ctx.fillStyle = OR; ctx.beginPath(); ctx.arc(sx + 180, sy + 190, 22, 0, 7); ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 5; ctx.stroke();
        /* bovenbalk met instructie */
        ctx.fillStyle = NAVY; ctx.fillRect(sx, sy, sw, 170);
        ctx.fillStyle = "#fff"; ctx.font = F(700, 40); ctx.textAlign = "left"; ctx.fillText("↑  Rechtdoor", sx + 30, sy + 92);
        ctx.font = F(500, 26); ctx.fillStyle = SKY; ctx.fillText("richting Groningen, 60 km", sx + 30, sy + 132);
        /* onderkaart */
        ctx.fillStyle = "#fff"; ctx.fillRect(sx, sy + sh - 230, sw, 230);
        ctx.fillStyle = NAVY; ctx.font = F(700, 44); ctx.fillText("1 u 05 min", sx + 30, sy + sh - 160);
        ctx.fillStyle = "#6b7a86"; ctx.font = F(500, 24); ctx.fillText("Vertrek: Emmen", sx + 30, sy + sh - 118);
        ctx.fillStyle = NAVY; ctx.font = F(500, 24); ctx.fillText("Bestemming: drie punten armer", sx + 30, sy + sh - 82);
        ctx.fillStyle = OR; ctx.beginPath(); ctx.roundRect(sx + 30, sy + sh - 60, sw - 60, 0, 0); ctx.fill();
        ctx.restore();
        ctx.fillStyle = NAVY; ctx.font = F(700, 42); spatie(ctx, `${namen[0]} – ${namen[1]}`, L, 1150, 5);
        infoKort(1194, "rgba(22,54,80,.85)", true); selectieRegel(1246, "rgba(22,54,80,.75)", false, 20); bron = [];
      },

      /* Sneek: de wisselbeker van de koploper, met een nieuw naamplaatje dat al klaarligt */
      plaquette() {
        const NAVY = "#163650", OR = "#f08c1c", CR = "#f6efe2";
        ctx.fillStyle = NAVY; ctx.fillRect(0, 0, W, H);
        const gr = ctx.createRadialGradient(W / 2, 420, 40, W / 2, 500, 700); gr.addColorStop(0, "rgba(255,255,255,.14)"); gr.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
        logoOp(L, 50, 52); ctx.fillStyle = CR; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 92, 7, "right");
        /* beker */
        const cx = W / 2, gold = ctx.createLinearGradient(cx - 200, 0, cx + 200, 0); gold.addColorStop(0, "#9c6b1f"); gold.addColorStop(.35, "#f6d27a"); gold.addColorStop(.55, "#fff1c2"); gold.addColorStop(.8, "#c8902f"); gold.addColorStop(1, "#8a5a17");
        ctx.save(); ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 40; ctx.fillStyle = gold;
        ctx.beginPath(); ctx.moveTo(cx - 190, 180); ctx.lineTo(cx + 190, 180); ctx.bezierCurveTo(cx + 190, 420, cx + 110, 500, cx + 40, 520); ctx.lineTo(cx + 40, 600); ctx.lineTo(cx - 40, 600); ctx.lineTo(cx - 40, 520); ctx.bezierCurveTo(cx - 110, 500, cx - 190, 420, cx - 190, 180); ctx.fill();
        ctx.lineWidth = 22; ctx.strokeStyle = gold; ctx.beginPath(); ctx.arc(cx - 200, 290, 70, Math.PI * .5, Math.PI * 1.5); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + 200, 290, 70, -Math.PI * .5, Math.PI * .5); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(cx, 180, 190, 26, 0, 0, 7); ctx.fill(); ctx.restore();
        ctx.fillStyle = "rgba(60,30,0,.35)"; ctx.beginPath(); ctx.ellipse(cx, 180, 170, 18, 0, 0, 7); ctx.fill();
        /* voet met naamplaatjes */
        ctx.fillStyle = "#2a1a0d"; ctx.beginPath(); ctx.moveTo(cx - 120, 600); ctx.lineTo(cx + 120, 600); ctx.lineTo(cx + 210, 860); ctx.lineTo(cx - 210, 860); ctx.closePath(); ctx.fill();
        const plaat = (y, tekst, nieuw) => { const pw = 300, ph = 50; const g2 = ctx.createLinearGradient(cx - pw / 2, 0, cx + pw / 2, 0); g2.addColorStop(0, nieuw ? "#b5651a" : "#8c8c8c"); g2.addColorStop(.5, nieuw ? "#ffb35a" : "#e6e6e6"); g2.addColorStop(1, nieuw ? "#b5651a" : "#8c8c8c");
          ctx.fillStyle = g2; ctx.fillRect(cx - pw / 2, y, pw, ph); ctx.fillStyle = nieuw ? "#3a1a04" : "#333"; ctx.font = F(700, 24); spatie(ctx, tekst, cx, y + 34, 4, "center"); };
        plaat(640, "KOPLOPER", false); plaat(706, tk.toUpperCase(), false);
        ctx.save(); ctx.translate(0, 0); ctx.strokeStyle = "rgba(240,140,28,.9)"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx - 140, 731); ctx.lineTo(cx + 140, 731); ctx.stroke(); ctx.restore();
        /* het nieuwe plaatje ligt er al naast */
        ctx.save(); ctx.translate(cx + 310, 820); ctx.rotate(-.18); ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 20; const g3 = ctx.createLinearGradient(-150, 0, 150, 0); g3.addColorStop(0, "#b5651a"); g3.addColorStop(.5, "#ffb35a"); g3.addColorStop(1, "#b5651a");
        ctx.fillStyle = g3; ctx.fillRect(-150, -25, 300, 50); ctx.shadowColor = "transparent"; ctx.fillStyle = "#3a1a04"; ctx.font = F(700, 24); spatie(ctx, "KAMELEN", 0, 9, 4, "center"); ctx.restore();
        ctx.fillStyle = CR; ctx.font = F(700, 42); spatie(ctx, `${namen[0]} – ${namen[1]}`, L, 1150, 5);
        infoKort(1194, "rgba(246,239,226,.75)", true); selectieRegel(1246, "rgba(246,239,226,.6)", false, 20); bron = [];
      },
      /* Minimaal: één echte foto, een paar woorden, verder niets */
      minimaal() {
        const o = opt.mini || {}, f = FOTO[o.foto] || zijF, img = o.img || zijImg, gg = GRADE[o.grade || "zw"];
        const draai = o.draai || 0;
        if (draai) { const c = document.createElement("canvas"); c.width = W * 1.25; c.height = H * 1.25; beeld(c.getContext("2d"), img, f, gg, 0, 0, c.width, c.height); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(draai); ctx.drawImage(c, -c.width / 2, -c.height / 2); ctx.restore(); }
        else beeld(ctx, img, f, gg, 0, 0, W, H);
        vignet(.55); verloop(o.boven ? 520 : 640, o.boven ? 0 : H, 0, .92); verloop(1000, H, 0, .9); verloop(180, 0, 0, .5);
        if (o.kameel && kameelImg) { const k = o.kameel, bw = k.w, bh = bw * kameelImg.height / kameelImg.width;
          ctx.save(); ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.filter = "blur(16px)"; ctx.beginPath(); ctx.ellipse(k.x + bw / 2, k.y + bh - 6, bw * .45, 20, 0, 0, 7); ctx.fill(); ctx.restore();
          ctx.save(); ctx.filter = o.grade === "zw" || !o.grade ? "grayscale(1) contrast(1.15) brightness(.95)" : "none"; ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 30;
          if (k.spiegel) { ctx.translate(k.x + bw, k.y); ctx.scale(-1, 1); ctx.drawImage(kameelImg, 0, 0, bw, bh); } else ctx.drawImage(kameelImg, k.x, k.y, bw, bh); ctx.restore();
          if (k.vervaag) verloop(k.vervaag, H, 0, .95); }
        logoOp(L, 50, 52); ctx.fillStyle = WIT; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 92, 7, "right");
        const kop = o.kop || ["KAMELEN"]; let ks = o.size || 168; ctx.font = F(700, ks); while (kop.some(t => breedte(ctx, t, ks * .02) > W - 2 * L) && ks > 60) { ks -= 4; ctx.font = F(700, ks); }
        const y0 = o.boven ? 170 + ks * .8 : 1010 - (kop.length - 1) * ks * .9 - (o.sub ? 60 : 0);
        ctx.save(); if (o.kopDraai) { ctx.translate(L, y0); ctx.rotate(o.kopDraai); ctx.translate(-L, -y0); }
        kop.forEach((t, i) => { ctx.fillStyle = i === kop.length - 1 && o.accent ? ZAND : WIT; ctx.font = F(700, ks); spatie(ctx, t, L - 4, y0 + i * ks * .9, ks * .02); });
        ctx.restore();
        if (o.sub) { ctx.save(); ctx.shadowColor = "rgba(0,0,0,.9)"; ctx.shadowBlur = 18; ctx.fillStyle = o.subKleur || ZAND; ctx.font = F(o.boven ? 500 : 300, 38); ctx.textAlign = "left"; ctx.fillText(o.sub, L, o.boven ? y0 + (kop.length - 1) * ks * .9 + 64 : 1044); ctx.restore(); }
        ctx.fillStyle = "rgba(244,239,230,.3)"; ctx.fillRect(L, 1112, W - 2 * L, 1);
        ctx.fillStyle = WIT; ctx.font = F(700, 38); spatie(ctx, `${namen[0]} \u2013 ${namen[1]}`, L, 1170, 5);
        infoKort(1212, MUTED, true); selectieRegel(1262, "rgba(244,239,230,.6)", false, 20);
        bron = [f];
      },

      /* Leeuwarden 2: waterpas tegen de scheve Oldehove */
      waterpas() {
        ctx.fillStyle = "#0c0d10"; ctx.fillRect(0, 0, W, H);
        const tmp = document.createElement("canvas"); tmp.width = W + 200; tmp.height = 1100; beeld(tmp.getContext("2d"), zijImg, { ...zijF, fx: .45, fy: .35 }, GRADE.staal, 0, 0, W + 200, 1100);
        ctx.save(); ctx.translate(W / 2, 520); ctx.rotate(-.045); ctx.drawImage(tmp, -(W + 200) / 2, -550); ctx.restore();
        verloop(760, 1010, 0, 1); ctx.fillStyle = "#0c0d10"; ctx.fillRect(0, 1010, W, H - 1010); verloop(200, 0, 0, .6);
        logoOp(L, 50, 56); ctx.fillStyle = WIT; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 96, 7, "right");
        /* de waterpas */
        const lx = 110, ly = 600, lw = W - 220, lh = 118;
        ctx.save(); ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
        const al = ctx.createLinearGradient(0, ly, 0, ly + lh); al.addColorStop(0, "#ffd84a"); al.addColorStop(.5, "#f2bd1c"); al.addColorStop(1, "#c8960c"); ctx.fillStyle = al; ctx.beginPath(); ctx.roundRect(lx, ly, lw, lh, 10); ctx.fill(); ctx.restore();
        ctx.fillStyle = "rgba(0,0,0,.5)"; for (let x = lx + 20; x < lx + lw - 20; x += 12) ctx.fillRect(x, ly + 6, 2, (x - lx - 20) % 60 === 0 ? 22 : 12);
        ctx.fillStyle = "#2b2b2b"; ctx.beginPath(); ctx.roundRect(lx + 8, ly + lh - 30, lw - 16, 22, 4); ctx.fill();
        /* buisje met de bel ver uit het midden */
        const bx = W / 2 - 150, by = ly + 36, bw2 = 300, bh2 = 46;
        ctx.fillStyle = "#1d1d1d"; ctx.beginPath(); ctx.roundRect(bx - 14, by - 10, bw2 + 28, bh2 + 20, 12); ctx.fill();
        const vl = ctx.createLinearGradient(0, by, 0, by + bh2); vl.addColorStop(0, "#d9ff7a"); vl.addColorStop(1, "#7cc41f"); ctx.fillStyle = vl; ctx.beginPath(); ctx.roundRect(bx, by, bw2, bh2, 22); ctx.fill();
        ctx.strokeStyle = "#1d1d1d"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W / 2 - 34, by); ctx.lineTo(W / 2 - 34, by + bh2); ctx.moveTo(W / 2 + 34, by); ctx.lineTo(W / 2 + 34, by + bh2); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.beginPath(); ctx.ellipse(bx + bw2 - 42, by + bh2 / 2, 30, 15, 0, 0, 7); ctx.fill();
        ctx.fillStyle = "#1d1d1d"; ctx.font = F(700, 26); spatie(ctx, "KAMELEN", lx + 40, ly + 72, 6);
        if (logo) { const h2 = 44, w2 = h2 * logo.width / logo.height; ctx.drawImage(kameelVorm("#1d1d1d", w2), lx + lw - 40 - w2, ly + 40, w2, h2); }
        ctx.fillStyle = WIT; ctx.font = F(700, 96); ctx.textAlign = "left"; ctx.fillText("NIET IN", L, 900); ctx.fillStyle = ZAND; ctx.fillText("HET LOOD", L, 990);
        ctx.fillStyle = WIT; ctx.font = F(700, 46); spatie(ctx, `${namen[0]}  TEGEN  ${namen[1]}`, L, 1076, 3);
        ctx.fillStyle = ZAND; ctx.font = F(300, 32); ctx.textAlign = "left"; ctx.fillText(idee.zin2 || "De Oldehove staat al 500 jaar scheef. Wij zetten ze vandaag recht.", L, 1122);
        selectieRegel(1180, MUTED); infoKort(1300, WIT, true); bron = [zijF];
      },

      /* Leeuwarden 3: einde-plaatsnaambord Ljouwert, met een wegwijzer naar Groningen */
      einde() {
        const sky = ctx.createLinearGradient(0, 0, 0, 900); sky.addColorStop(0, "#14203a"); sky.addColorStop(.55, "#7a4a5e"); sky.addColorStop(1, "#f0a25a"); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, 900);
        ctx.fillStyle = "#1a1f14"; ctx.fillRect(0, 880, W, H - 880);
        ctx.fillStyle = "#232a1a"; ctx.beginPath(); ctx.moveTo(0, 900); for (let x = 0; x <= W; x += 30) ctx.lineTo(x, 884 + Math.sin(x / 70) * 3); ctx.lineTo(W, 900); ctx.fill();
        /* boerderij en molen aan de horizon */
        ctx.fillStyle = "#151a10"; ctx.beginPath(); ctx.moveTo(80, 884); ctx.lineTo(80, 850); ctx.lineTo(150, 820); ctx.lineTo(240, 850); ctx.lineTo(240, 884); ctx.fill();
        ctx.save(); ctx.translate(900, 820); ctx.fillRect(-10, 0, 20, 64); ctx.strokeStyle = "#151a10"; ctx.lineWidth = 6; for (let a = 0; a < 4; a++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a * 1.571 + .4) * 60, Math.sin(a * 1.571 + .4) * 60); ctx.stroke(); } ctx.restore();
        logoOp(L, 50, 56); ctx.fillStyle = WIT; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 96, 7, "right");
        ctx.fillStyle = "#8c9198"; ctx.fillRect(W / 2 - 11, 560, 22, 420);
        /* bord */
        const sx = 160, sy = 220, sw = W - 320, sh = 330;
        ctx.save(); ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 30; ctx.fillStyle = "#f7f7f2"; ctx.beginPath(); ctx.roundRect(sx, sy, sw, sh, 22); ctx.fill(); ctx.restore();
        ctx.strokeStyle = "#1d3f8f"; ctx.lineWidth = 12; ctx.beginPath(); ctx.roundRect(sx + 16, sy + 16, sw - 32, sh - 32, 12); ctx.stroke();
        ctx.fillStyle = "#1d3f8f"; ctx.textAlign = "center"; ctx.font = `600 130px PSans, Arial, sans-serif`; ctx.fillText("Ljouwert", W / 2, sy + 160); ctx.font = `600 70px PSans, Arial, sans-serif`; ctx.fillText("Leeuwarden", W / 2, sy + 260);
        ctx.save(); ctx.beginPath(); ctx.roundRect(sx + 16, sy + 16, sw - 32, sh - 32, 12); ctx.clip(); ctx.strokeStyle = "#d1202f"; ctx.lineWidth = 30; ctx.beginPath(); ctx.moveTo(sx + 20, sy + sh - 10); ctx.lineTo(sx + sw - 20, sy + 10); ctx.stroke(); ctx.restore();
        /* wegwijzer */
        const px = W / 2 - 300, py = 620; ctx.save(); ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 24; ctx.fillStyle = "#1d4fa3";
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 520, py); ctx.lineTo(px + 600, py + 70); ctx.lineTo(px + 520, py + 140); ctx.lineTo(px, py + 140); ctx.closePath(); ctx.fill(); ctx.restore();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(px + 10, py + 10); ctx.lineTo(px + 516, py + 10); ctx.lineTo(px + 586, py + 70); ctx.lineTo(px + 516, py + 130); ctx.lineTo(px + 10, py + 130); ctx.closePath(); ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.font = `600 64px PSans, Arial, sans-serif`; ctx.textAlign = "left"; ctx.fillText("Grins", px + 40, py + 92); ctx.textAlign = "right"; ctx.fillText("60", px + 500, py + 92);
        if (logo) { const h2 = 50, w2 = h2 * logo.width / logo.height; ctx.drawImage(kameelVorm("#fff", w2), px + 214, py + 46, w2, h2); }
        ctx.fillStyle = WIT; ctx.font = F(700, 60); spatie(ctx, `${namen[0]}  TEGEN  ${namen[1]}`, L, 1070, 3);
        ctx.fillStyle = ZAND; ctx.font = F(300, 34); ctx.textAlign = "left"; ctx.fillText("Even Friesland uit. Welkom in Stad.", L, 1120);
        selectieRegel(1176, MUTED); infoKort(1300, WIT, true); bron = [];
      },

      /* Leeuwarden 4: de Friese vlag, met kamelen in plaats van pompeblêden */
      vlag() {
        const B = "#1d4f9f", R = "#d8202a";
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, 1000); ctx.clip();
        ctx.translate(W / 2, 500); ctx.rotate(-Math.atan2(1000, W) + .02); ctx.translate(-1000, -1000);
        for (let i = 0; i < 14; i++) { ctx.fillStyle = i % 2 ? "#f6f4ef" : B; ctx.fillRect(0, i * 150, 2000, 150); }
        ctx.restore();
        if (logo) { const k = kameelVorm(R, 120), kh2 = 120 * logo.height / logo.width; const pos = [[130, 170], [330, 130], [540, 260], [250, 420], [760, 380], [470, 620], [900, 620]];
          pos.forEach(([x, y], i) => { ctx.save(); ctx.translate(x, y); ctx.rotate(-.5); ctx.drawImage(k, -60, -kh2 / 2); ctx.restore(); }); }
        /* plooien van de wapperende vlag */
        for (let x = 0; x < W; x += 4) { const v = Math.sin(x / 110) * .5 + Math.sin(x / 47) * .2; ctx.fillStyle = v > 0 ? `rgba(255,255,255,${v * .12})` : `rgba(0,0,0,${-v * .28})`; ctx.fillRect(x, 0, 4, 1000); }
        verloop(780, 1000, 0, 1); ctx.fillStyle = "#0b1730"; ctx.fillRect(0, 1000, W, H - 1000);
        ctx.fillStyle = "rgba(6,12,28,.65)"; ctx.fillRect(0, 0, W, 130); logoOp(L, 40, 56); ctx.fillStyle = WIT; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 86, 7, "right");
        ctx.fillStyle = WIT; ctx.font = F(700, 110); ctx.textAlign = "left"; ctx.fillText("FRYSLÂN BOPPE?", L - 4, 980);
        ctx.fillStyle = "#f2c94c"; ctx.font = F(300, 44); ctx.fillText("Vandaag niet.", L, 1040);
        ctx.fillStyle = WIT; ctx.font = F(700, 46); spatie(ctx, `${namen[0]}  TEGEN  ${namen[1]}`, L, 1114, 3);
        selectieRegel(1170, "rgba(244,239,230,.75)"); infoKort(1300, WIT, true); bron = [];
      },

      /* Leeuwarden 5: verpakking van een Fries suikerbrood */
      suikerbrood() {
        ctx.fillStyle = "#cfe0f2"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "rgba(29,79,159,.08)"; for (let y = 0; y < H; y += 60) for (let x = (y / 60) % 2 ? 30 : 0; x < W; x += 60) ctx.fillRect(x, y, 30, 30);
        logoOp(L, 50, 56); ctx.fillStyle = "#1d3f8f"; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 96, 7, "right");
        const kx = 90, ky = 140, kw = W - 180, kh = 960, INK = "#1b2a4a";
        ctx.save(); ctx.shadowColor = "rgba(20,40,80,.35)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16; ctx.fillStyle = "#fffdf7"; ctx.beginPath(); ctx.roundRect(kx, ky, kw, kh, 24); ctx.fill(); ctx.restore();
        ctx.fillStyle = "#1d4f9f"; ctx.beginPath(); ctx.roundRect(kx, ky, kw, 210, [24, 24, 0, 0]); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = F(500, 26); spatie(ctx, "AMBACHTELIJK UIT LJOUWERT", kx + kw / 2, ky + 62, 8, "center");
        ctx.font = `400 96px PSerifR, Georgia, serif`; ctx.textAlign = "center"; ctx.fillText("Fries Suikerbrood", kx + kw / 2, ky + 164);
        ctx.fillStyle = "#d8202a"; ctx.beginPath(); ctx.arc(kx + kw - 90, ky + 230, 74, 0, 7); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = F(700, 30); ctx.fillText("NU MET", kx + kw - 90, ky + 222); ctx.fillText("VERLIES", kx + kw - 90, ky + 254);
        ctx.fillStyle = INK; ctx.font = F(700, 24); ctx.textAlign = "left"; spatie(ctx, "INGREDIËNTEN", kx + 50, ky + 300, 6);
        ctx.font = `italic 400 34px PSerif, Georgia, serif`; ctx.fillText("Suiker, deeg, kaneel en valse hoop.", kx + 50, ky + 348); ctx.fillText("Kan sporen van Groningen bevatten.", kx + 50, ky + 392);
        /* voedingswaarde-tabel */
        const tx = kx + 50, tw = kw - 100; let ty = ky + 450;
        ctx.fillStyle = INK; ctx.fillRect(tx, ty, tw, 6); ty += 48; ctx.font = F(700, 34); ctx.fillText("Voedingswaarde per wedstrijd", tx, ty); ty += 16; ctx.fillRect(tx, ty, tw, 3);
        [["Doelpunten", "0 g"], ["Kansen", "2 g"], ["Balbezit", "31 %"], ["Valse hoop", "100 %"], ["Punten", "0"]].forEach(([a, b]) => { ty += 52; ctx.font = F(500, 32); ctx.textAlign = "left"; ctx.fillText(a, tx, ty); ctx.textAlign = "right"; ctx.font = F(700, 32); ctx.fillText(b, tx + tw, ty); ctx.fillRect(tx, ty + 16, tw, 1.5); });
        ty += 80; ctx.textAlign = "left"; ctx.font = F(700, 24); spatie(ctx, "TEN MINSTE HOUDBAAR TOT", tx, ty, 5); ctx.font = F(700, 44); ctx.fillText(`${weekdag} ${datum}, ${tijd.toUpperCase()}`, tx, ty + 52);
        let zaad = 13; const rnd = () => (zaad = (zaad * 1103515245 + 12345) >>> 0) / 4294967296; ctx.fillStyle = INK; for (let bx = kx + kw - 250; bx < kx + kw - 50;) { const w2 = 2 + Math.floor(rnd() * 5); if (rnd() > .35) ctx.fillRect(bx, ky + kh - 150, w2, 100); bx += w2 + 2; }
        if (logo) { ctx.save(); ctx.translate(kx + kw - 380, ky + kh - 105); ctx.rotate(-.2); ctx.strokeStyle = "#e48a2c"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 70, 0, 7); ctx.stroke(); const w2 = 90, h2 = w2 * logo.height / logo.width; ctx.drawImage(logo, -w2 / 2, -h2 / 2 - 10, w2, h2); ctx.fillStyle = "#e48a2c"; ctx.font = F(700, 16); ctx.textAlign = "center"; ctx.fillText("GETEST DOOR", 0, 40); ctx.fillText("DE KAMELEN", 0, 58); ctx.restore(); }
        ctx.fillStyle = INK; ctx.font = F(700, 48); spatie(ctx, `${namen[0]}  TEGEN  ${namen[1]}`, L, 1170, 3);
        selectieRegel(1214, INK); infoKort(1316, INK, true); bron = [];
      },
      /* 1. Torenduel (Leeuwarden thuis): weegschaal van een bokswedstrijd, Martinitoren tegen Oldehove */
      torens() {
        ctx.fillStyle = "#0b0b0d"; ctx.fillRect(0, 0, W, H);
        const paneel = (img, f, gg, x, hoek) => {
          const c = document.createElement("canvas"); c.width = 440; c.height = 640; beeld(c.getContext("2d"), img, f, gg, 0, 0, 440, 640);
          ctx.save(); ctx.translate(x + 220, 470); ctx.rotate(hoek); ctx.shadowColor = "rgba(0,0,0,.7)"; ctx.shadowBlur = 40; ctx.drawImage(c, -220, -320); ctx.restore();
        };
        paneel(onsImg, onsF, GRADE.zand, 70, 0); paneel(zijImg, zijF, GRADE.staal, W - 70 - 440, .055);
        ctx.fillStyle = WIT; ctx.font = F(500, 22); spatie(ctx, "TORENDUEL", W / 2, 96, 12, "center");
        logoOp(L, 50, 56); ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 96, 7, "right");
        /* "VS" in het midden */
        ctx.fillStyle = ZAND; ctx.beginPath(); ctx.arc(W / 2, 470, 54, 0, 7); ctx.fill();
        ctx.fillStyle = "#0b0b0d"; ctx.font = F(700, 52); ctx.textAlign = "center"; ctx.fillText("VS", W / 2, 488);
        /* namen onder de panelen */
        ctx.fillStyle = WIT; ctx.font = F(700, 64); spatie(ctx, "KAMELEN", 70 + 220, 880, 3, "center"); spatie(ctx, tk.toUpperCase(), W - 70 - 220, 880, 3, "center");
        ctx.fillStyle = MUTED; ctx.font = F(500, 22); spatie(ctx, "MARTINITOREN", 70 + 220, 914, 6, "center"); spatie(ctx, "OLDEHOVE", W - 70 - 220, 914, 6, "center");
        /* de cijfers */
        const st = n => (opt.standLijst || []).find(x => x.team === n);
        const a = (opt.standLijst || []).find(x => /gchc/i.test(x.team)), b = (opt.standLijst || []).find(x => x.team === tegen);
        const rijen = [["97 m", "HOOGTE", "40 m"], ["recht", "STAAT", "scheef"], ["1482", "KLAAR IN", "nooit"], [a ? `#${a.positie}` : "-", "IN DE STAND", b ? `#${b.positie}` : "-"]];
        rijen.forEach(([l, mid, r], i) => { const y = 984 + i * 46;
          ctx.fillStyle = "rgba(244,239,230,.14)"; ctx.fillRect(140, y + 14, W - 280, 1);
          ctx.fillStyle = WIT; ctx.font = F(700, 34); ctx.textAlign = "center"; ctx.fillText(l, 290, y); ctx.fillText(r, W - 290, y);
          ctx.fillStyle = ZAND; ctx.font = F(500, 18); spatie(ctx, mid, W / 2, y - 6, 6, "center"); });
        ctx.fillStyle = ZAND; ctx.font = F(300, 30); ctx.textAlign = "center"; ctx.fillText(idee.zin, W / 2, 1190);
        selectieRegel(1230, WIT, true); infoKort(1290, WIT);
        bron = [onsF, zijF];
      },

      /* 2. Scheurkalender (GHBS uit, de inhaalwedstrijd): 22 november eraf gescheurd, 28 februari staat er */
      kalender() {
        const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#3a3430"); gr.addColorStop(1, "#1d1a17"); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "rgba(255,255,255,.025)"; for (let i = 0; i < 4000; i++) ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
        logoOp(L, 50, 56); ctx.fillStyle = WIT; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 96, 7, "right");
        /* het afgescheurde blaadje van 22 november, op de grond */
        ctx.save(); ctx.translate(250, 1010); ctx.rotate(-.2); ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 24;
        ctx.fillStyle = "#ece6da"; ctx.beginPath(); ctx.moveTo(-170, -150); for (let x = -170; x <= 170; x += 17) ctx.lineTo(x, -150 + (x / 17 % 2 ? 9 : 0)); ctx.lineTo(170, 150); ctx.lineTo(-170, 150); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = "#b5261e"; ctx.fillRect(-170, -132, 340, 40); ctx.fillStyle = "#ece6da"; ctx.font = F(700, 24); spatie(ctx, "NOVEMBER 2026", 0, -104, 6, "center");
        ctx.fillStyle = "#2a2522"; ctx.font = `600 150px PSans, Arial, sans-serif`; ctx.textAlign = "center"; ctx.fillText("22", 0, 70);
        ctx.fillStyle = "#2a2522"; ctx.font = F(500, 22); spatie(ctx, "ZONDAG", 0, 110, 6, "center");
        ctx.rotate(.32); ctx.strokeStyle = "rgba(196,30,30,.85)"; ctx.lineWidth = 6; ctx.strokeRect(-150, -38, 300, 76);
        ctx.fillStyle = "rgba(196,30,30,.85)"; ctx.font = F(700, 58); spatie(ctx, "AFGELAST", 0, 20, 6, "center"); ctx.restore();
        /* het kalenderblok */
        const kx = 340, ky = 170, kw = 640, kh = 760;
        ctx.save(); ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18; ctx.fillStyle = "#f3eee4"; ctx.fillRect(kx, ky, kw, kh); ctx.restore();
        for (let i = 1; i < 6; i++) { ctx.fillStyle = `rgba(0,0,0,${.05 * i})`; ctx.fillRect(kx + 4, ky + kh + i * 3 - 3, kw - 8, 2); }
        ctx.fillStyle = "#2a2522"; ctx.fillRect(kx - 10, ky - 34, kw + 20, 46);
        for (let i = 0; i < 8; i++) { ctx.fillStyle = "#9a9188"; ctx.beginPath(); ctx.arc(kx + 50 + i * 77, ky - 11, 9, 0, 7); ctx.fill(); }
        /* gescheurde resten bovenaan */
        ctx.fillStyle = "#e4ddd0"; ctx.beginPath(); ctx.moveTo(kx, ky + 12); for (let x = 0; x <= kw; x += 14) ctx.lineTo(kx + x, ky + 12 + ((x / 14) % 2 ? 14 : 4) + Math.random() * 6); ctx.lineTo(kx + kw, ky + 12); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#b5261e"; ctx.fillRect(kx, ky + 38, kw, 74); ctx.fillStyle = "#f3eee4"; ctx.font = F(700, 38); spatie(ctx, "FEBRUARI 2027", kx + kw / 2, ky + 90, 10, "center");
        ctx.fillStyle = "#1d1a17"; ctx.font = `600 400px PSans, Arial, sans-serif`; spatie(ctx, "28", kx + kw / 2, ky + 470, -16, "center");
        ctx.font = F(700, 40); spatie(ctx, "ZONDAG", kx + kw / 2, ky + 540, 12, "center");
        ctx.fillStyle = "rgba(29,26,23,.25)"; ctx.fillRect(kx + 60, ky + 580, kw - 120, 2);
        ctx.fillStyle = "#1d1a17"; ctx.font = F(700, 46); spatie(ctx, `${namen[0]}  –  ${namen[1]}`, kx + kw / 2, ky + 640, 3, "center");
        ctx.fillStyle = "#6b625a"; ctx.font = F(500, 26); ctx.textAlign = "center"; ctx.fillText(`Inhaalwedstrijd, ${tijd.toLowerCase()}, ${plek}`, kx + kw / 2, ky + 684);
        if (logo) { const lh = 46, lw = lh * logo.width / logo.height; ctx.drawImage(logo, kx + kw - lw - 26, ky + kh - lh - 20, lw, lh); }
        ctx.fillStyle = ZAND; ctx.font = F(300, 36); ctx.textAlign = "left"; ctx.fillText(idee.zin, L, 1222);
        selectieRegel(1268, WIT); bron = [];
      },

      /* 3. Jacht op de koploper (Sneek thuis): de stand als poster, een echte kameel klimt omhoog */
      stand() {
        beeld(ctx, zijImg, zijF, GRADE.staal, 0, 0, W, 330); verloop(80, 330, 0, 1); ctx.fillStyle = "#0e0d0b"; ctx.fillRect(0, 330, W, H - 330);
        logoOp(L, 50, 56); ctx.fillStyle = WIT; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 96, 7, "right");
        ctx.fillStyle = WIT; ctx.font = F(700, 96); ctx.textAlign = "left"; spatie(ctx, "JACHT OP DE", L - 2, 236, 3); ctx.fillStyle = ZAND; spatie(ctx, "KOPLOPER", L - 2, 322, 3);
        const lijst = (opt.standLijst || []).slice().sort((a, b) => a.positie - b.positie), rh = 54, y0 = 380;
        let onsY = null;
        lijst.forEach((r, i) => { const y = y0 + i * rh, wij = /gchc/i.test(r.team), zij = r.team === tegen;
          if (wij || zij) { ctx.fillStyle = wij ? "#e48a2c" : "rgba(244,239,230,.12)"; ctx.fillRect(L - 16, y - 38, W - 2 * L + 32, rh - 6); }
          if (wij) onsY = y;
          ctx.fillStyle = wij ? "#120c06" : (zij ? WIT : "rgba(244,239,230,.7)");
          ctx.font = F(700, 30); ctx.textAlign = "right"; ctx.fillText(String(r.positie), L + 34, y);
          ctx.textAlign = "left"; ctx.font = F(wij || zij ? 700 : 500, 30); ctx.fillText(wij ? "KAMELEN" : r.team.toUpperCase(), L + 64, y);
          ctx.font = F(500, 28); ctx.textAlign = "right"; ctx.fillText(String(r.gespeeld), W - L - 150, y); ctx.fillText(String(r.punten), W - L, y);
          if (zij && r.positie === 1) { ctx.font = F(700, 30); const tw = ctx.measureText(r.team.toUpperCase()).width; ctx.fillStyle = ZAND; ctx.font = F(700, 18); spatie(ctx, "KOPLOPER", L + 64 + tw + 24, y - 4, 5); } });
        ctx.fillStyle = MUTED; ctx.font = F(500, 18); ctx.textAlign = "right"; ctx.fillText("GESP.", W - L - 150, y0 - 52); ctx.fillText("PNT", W - L, y0 - 52);
        /* de kameel staat op onze regel en kijkt omhoog naar de koploper */
        if (kameelImg && onsY != null) { const bw = 330, bh = bw * kameelImg.height / kameelImg.width;
          ctx.save(); ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 20; ctx.drawImage(kameelImg, W - L - 230 - bw, onsY - 40 - bh, bw, bh); ctx.restore(); }
        const sp = lijst.find(r => /gchc/i.test(r.team)), kop = lijst[0];
        if (sp && kop && sp !== kop) { ctx.fillStyle = ZAND; ctx.font = F(500, 24); ctx.textAlign = "left"; ctx.fillText(`Nog ${kop.punten - sp.punten} punten tot de top.`, L, y0 + lijst.length * rh + 20); }
        ctx.fillStyle = WIT; ctx.font = F(700, 44); spatie(ctx, `${namen[0]}  TEGEN  ${namen[1]}`, L, 1150, 3);
        selectieRegel(1196, MUTED); infoKort(1290, WIT); bron = [zijF, KAMEEL];
      },

      /* 5. Scorebord (Daring thuis): led-bord met de vorige uitslag */
      scorebord() {
        ctx.fillStyle = "#050505"; ctx.fillRect(0, 0, W, H);
        const gr = ctx.createRadialGradient(W / 2, 500, 50, W / 2, 500, 700); gr.addColorStop(0, "rgba(255,160,40,.12)"); gr.addColorStop(1, "rgba(255,160,40,0)"); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
        logoOp(L, 50, 56); ctx.fillStyle = WIT; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 96, 7, "right");
        const bx = 60, by = 170, bw = W - 120, bh = 720;
        ctx.fillStyle = "#1b1b1d"; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 18); ctx.fill(); ctx.strokeStyle = "#333"; ctx.lineWidth = 3; ctx.stroke();
        [[bx + 18, by + 18], [bx + bw - 18, by + 18], [bx + 18, by + bh - 18], [bx + bw - 18, by + bh - 18]].forEach(([x, y]) => { ctx.fillStyle = "#555"; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); });
        ctx.fillStyle = "#080808"; ctx.fillRect(bx + 40, by + 40, bw - 80, bh - 80);
        const AMBER = "#ffae2b";
        /* tekst als ledpuntjes: eerst klein tekenen, dan elke pixel een lampje */
        const led = (tekst, cx, y, px, cel, kleur = AMBER, wt = 700) => {
          const c = document.createElement("canvas"), t = c.getContext("2d"); t.font = `${wt} ${px}px PCond, Arial Narrow, sans-serif`;
          const w = Math.ceil(t.measureText(tekst).width) + 2, h = Math.ceil(px * 1.05); c.width = w; c.height = h; t.font = `${wt} ${px}px PCond, Arial Narrow, sans-serif`; t.fillStyle = "#fff"; t.textBaseline = "top"; t.fillText(tekst, 1, 0);
          const d = t.getImageData(0, 0, w, h).data, x0 = cx - w * cel / 2;
          ctx.save(); ctx.shadowColor = kleur; ctx.shadowBlur = cel * 1.4;
          for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const aan = d[(yy * w + xx) * 4 + 3] > 110;
            ctx.fillStyle = aan ? kleur : "rgba(255,174,43,.06)"; if (!aan) ctx.shadowBlur = 0; else ctx.shadowBlur = cel * 1.4;
            ctx.beginPath(); ctx.arc(x0 + xx * cel + cel / 2, y + yy * cel + cel / 2, cel * .38, 0, 7); ctx.fill(); }
          ctx.restore(); };
        const thuis = korteNaam(m.thuis === tegen ? tegen : m.uit) ;
        led("VORIGE KEER", W / 2, by + 66, 16, 5.5);
        const vorige = (opt.seizoen || []).find(x => x.score && (x.thuis === tegen || x.uit === tegen));
        const [l, r] = vorige ? [korteNaam(/gchc/i.test(vorige.thuis) ? "KAMELEN" : vorige.thuis).toUpperCase(), korteNaam(/gchc/i.test(vorige.uit) ? "KAMELEN" : vorige.uit).toUpperCase()] : [namen[0], namen[1]];
        const [sl, sr] = vorige ? vorige.score.split("-") : ["-", "-"];
        led(l, bx + bw * .27, by + 160, 15, 6.5); led(r, bx + bw * .73, by + 160, 15, 6.5);
        led(sl.trim(), bx + bw * .27, by + 290, 30, 9, "#ff3b2b"); led(sr.trim(), bx + bw * .73, by + 290, 30, 9, "#ff3b2b");
        led("-", W / 2, by + 330, 20, 9, "#ff3b2b");
        led(`${datum}  GRONINGEN`, W / 2, by + bh - 170, 16, 4.6);
        led("REVANCHE?", W / 2, by + bh - 104, 16, 5, "#7dff6a");
        ctx.font = F(700, 64); const nb = breedte(ctx, namen[0], 3); ctx.fillStyle = WIT; spatie(ctx, namen[0], L, 990, 3);
        ctx.fillStyle = ZAND; ctx.font = F(300, 34); ctx.textAlign = "left"; ctx.fillText("tegen", L + nb + 20, 990); const tb = ctx.measureText("tegen").width;
        ctx.fillStyle = WIT; ctx.font = F(700, 64); spatie(ctx, namen[1], L + nb + tb + 40, 990, 3);
        ctx.fillStyle = ZAND; ctx.font = F(300, 32); ctx.textAlign = "left"; ctx.fillText(idee.zin, L, 1046);
        selectieRegel(1110, MUTED); infoKort(1290, WIT); bron = [];
      },

      /* 6. Kamelen slopen de sociëteit (Studs uit): de Vindicat-sociëteit in Madurodam, een reuzenkameel met hockeystick */
      sloop() {
        ctx.fillStyle = "#2c2620"; ctx.fillRect(0, 0, W, 900); beeld(ctx, zijImg, { ...zijF, fx: .45, fy: 0 }, GRADE.sloop, 0, 190, W, 710); verloop(330, 190, 0, 1);
        const ix = 600, iy = 270;
        /* stofwolk */
        for (let i = 0; i < 90; i++) { const a = Math.random() * 7, r = 20 + Math.random() * 230; ctx.fillStyle = `rgba(222,206,180,${.06 + Math.random() * .12})`; ctx.beginPath(); ctx.arc(ix + Math.cos(a) * r, iy + Math.sin(a) * r * .55 + 30, 25 + Math.random() * 70, 0, 7); ctx.fill(); }
        /* scheuren in de gevel */
        ctx.strokeStyle = "rgba(20,14,10,.85)"; ctx.lineWidth = 3;
        for (let k = 0; k < 7; k++) { let x = ix + (k - 3) * 25, y = iy + 40; ctx.beginPath(); ctx.moveTo(x, y); for (let s2 = 0; s2 < 8; s2++) { x += (Math.random() - .5) * 46; y += 20 + Math.random() * 32; ctx.lineTo(x, y); } ctx.stroke(); }
        /* rondvliegende stukken: bakstenen en groene letters van het bord */
        for (let i = 0; i < 70; i++) { const a = -Math.PI * (.05 + Math.random() * .9), r = 50 + Math.random() * 380; ctx.save(); ctx.translate(ix + Math.cos(a) * r, iy + Math.sin(a) * r * .7 + 20); ctx.rotate(Math.random() * 7);
          ctx.fillStyle = ["#8a4b32", "#a35d3d", "#1f8a4c", "#e9e3d6", "#1f8a4c", "#6e3a26"][i % 6]; ctx.fillRect(-8, -5, 8 + Math.random() * 18, 6 + Math.random() * 10); ctx.restore(); }
        /* de reuzenkameel leunt van rechts het beeld in, de stick in zijn bek */
        if (kameelImg) { const bw = 1000, bh = bw * kameelImg.height / kameelImg.width, kx = 700, ky = 60, mx = kx + bw * .03, my = ky + bh * .1;
          ctx.save(); ctx.lineCap = "round";
          ctx.strokeStyle = "#f4efe6"; ctx.lineWidth = 26; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(ix + 50, iy - 30); ctx.stroke();
          ctx.strokeStyle = "#151515"; ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(ix + 50, iy - 30); ctx.stroke();
          ctx.strokeStyle = "#e48a2c"; ctx.lineWidth = 24; ctx.beginPath(); ctx.moveTo(ix + 50, iy - 30); ctx.quadraticCurveTo(ix + 10, iy + 30, ix - 60, iy + 10); ctx.stroke(); ctx.restore();
          ctx.save(); ctx.translate(kx + bw, ky); ctx.scale(-1, 1); ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 50; ctx.drawImage(kameelImg, 0, 0, bw, bh); ctx.restore();
          ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 4; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(mx, my, 190 + i * 26, 2.05, 2.75); ctx.stroke(); }
          /* een tweede kameel op het dak */
          const k2 = 230, h2 = k2 * kameelImg.height / kameelImg.width; ctx.save(); ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 20; ctx.drawImage(kameelImg, 110, 330 - h2, k2, h2); ctx.restore(); }
        /* inslagflits */
        const fl = ctx.createRadialGradient(ix, iy, 0, ix, iy, 120); fl.addColorStop(0, "rgba(255,240,200,.85)"); fl.addColorStop(1, "rgba(255,240,200,0)"); ctx.fillStyle = fl; ctx.beginPath(); ctx.arc(ix, iy, 120, 0, 7); ctx.fill();
        /* "live"-balk */
        ctx.fillStyle = "#c8261e"; ctx.fillRect(L, 64, 92, 40); ctx.fillStyle = "#fff"; ctx.font = F(700, 26); spatie(ctx, "LIVE", L + 46, 93, 4, "center");
        ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(L + 92, 64, 470, 40); ctx.fillStyle = "#fff"; ctx.font = F(500, 22); spatie(ctx, "GROTE MARKT, GRONINGEN", L + 112, 92, 4);
        verloop(700, 900, 0, 1); ctx.fillStyle = "#0d0a07"; ctx.fillRect(0, 900, W, H - 900);
        ctx.fillStyle = WIT; ctx.font = F(700, 92); spatie(ctx, "KAMELEN SLOPEN", L - 2, 930, 2); ctx.fillStyle = ZAND; spatie(ctx, "SOCIËTEIT", L - 2, 1018, 2);
        ctx.fillStyle = WIT; ctx.font = F(300, 32); ctx.textAlign = "left"; ctx.fillText(`${idee.zin}  ${namen[0][0]}${namen[0].slice(1).toLowerCase()} tegen ${namen[1][0]}${namen[1].slice(1).toLowerCase()}.`, L, 1078);
        selectieRegel(1132, MUTED); infoKort(1290, WIT); bron = [zijF, KAMEEL];
      },

      /* 8. Plaatsnaambord (GHBS uit): er is maar één Stad, en daar staat een kameel */
      bord() {
        const tmp = document.createElement("canvas"); tmp.width = W; tmp.height = H; beeld(tmp.getContext("2d"), zijImg, zijF, GRADE.nacht, 0, 0, W, H);
        ctx.save(); ctx.filter = "blur(6px) brightness(.7)"; ctx.drawImage(tmp, -20, -20, W + 40, H + 40); ctx.restore(); verloop(700, H, 0, .95);
        logoOp(L, 50, 56); ctx.fillStyle = WIT; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 96, 7, "right");
        /* palen */
        ctx.fillStyle = "#8c9198"; ctx.fillRect(330, 560, 22, 600); ctx.fillRect(728, 560, 22, 600);
        /* de kameel achter het bord */
        if (kameelImg) { const bw = 640, bh = bw * kameelImg.height / kameelImg.width; ctx.save(); ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 30; ctx.drawImage(kameelImg, 470, 1110 - bh, bw, bh); ctx.restore();
          ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.filter = "blur(10px)"; ctx.beginPath(); ctx.ellipse(790, 1112, 300, 16, 0, 0, 7); ctx.fill(); ctx.filter = "none"; }
        const bord = (x, y, w, h, regels) => { ctx.save(); ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 30; ctx.fillStyle = "#f7f7f2"; ctx.beginPath(); ctx.roundRect(x, y, w, h, 22); ctx.fill(); ctx.restore();
          ctx.strokeStyle = "#1d3f8f"; ctx.lineWidth = 12; ctx.beginPath(); ctx.roundRect(x + 16, y + 16, w - 32, h - 32, 12); ctx.stroke();
          regels.forEach(([t, s, wt, y2]) => { ctx.fillStyle = "#1d3f8f"; ctx.font = `${wt} ${s}px PSans, Arial, sans-serif`; ctx.textAlign = "center"; ctx.fillText(t, x + w / 2, y + y2); }); };
        bord(150, 250, 780, 300, [["Groningen", 150, 600, 180], ["Gem. Groningen", 34, 600, 246]]);
        bord(270, 580, 540, 150, [["KAMELEN", 76, 600, 104]]);
        ctx.fillStyle = WIT; ctx.font = F(700, 60); spatie(ctx, `${namen[0]}  TEGEN  ${namen[1]}`, L, 1196, 3);
        ctx.fillStyle = ZAND; ctx.font = F(300, 32); ctx.textAlign = "left"; ctx.fillText(idee.zin, L, 1244); infoKort(1300, WIT, true); bron = [zijF, KAMEEL];
      },

      /* 9. Bierviltje (GHBS thuis) */
      viltje() {
        const gr = ctx.createLinearGradient(0, 0, W, H); gr.addColorStop(0, "#3b2414"); gr.addColorStop(1, "#1e1109"); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 2; for (let y = 0; y < H; y += 9) { ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x <= W; x += 60) ctx.lineTo(x, y + Math.sin(x / 140 + y / 50) * 4); ctx.stroke(); }
        logoOp(L, 50, 56); ctx.fillStyle = WIT; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 96, 7, "right");
        const cx = W / 2, cy = 560, R = 390;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(-.12);
        ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14; ctx.fillStyle = "#efe4cc";
        ctx.beginPath(); for (let a = 0; a <= 360; a += 4) { const r = R + (a % 8 ? 0 : 3); ctx.lineTo(Math.cos(a * Math.PI / 180) * r, Math.sin(a * Math.PI / 180) * r); } ctx.fill(); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        ctx.strokeStyle = "#e48a2c"; ctx.lineWidth = 26; ctx.beginPath(); ctx.arc(0, 0, R - 40, 0, 7); ctx.stroke();
        ctx.strokeStyle = "#2a1a0e"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, R - 70, 0, 7); ctx.stroke();
        /* tekst rond de rand */
        const boogTekst = (t, r, onder) => { ctx.font = F(700, 34); ctx.fillStyle = "#2a1a0e"; ctx.textAlign = "center";
          const ws = [...t].map(c => ctx.measureText(c).width + 5), tot = ws.reduce((a, b) => a + b, 0) / r; let acc = 0;
          [...t].forEach((c, i) => { const a = onder ? Math.PI / 2 + tot / 2 - (acc + ws[i] / 2) / r : -Math.PI / 2 - tot / 2 + (acc + ws[i] / 2) / r; acc += ws[i];
            ctx.save(); ctx.translate(Math.cos(a) * r, Math.sin(a) * r); ctx.rotate(onder ? a - Math.PI / 2 : a + Math.PI / 2); ctx.fillText(c, 0, onder ? 24 : 0); ctx.restore(); }); };
        boogTekst("KAMELEN  \u2022  GCHC HEREN 13", R - 96, false); boogTekst("GRONINGEN  \u2022  DERDE HELFT", R - 108, true);
        if (logo) { const bw = 300, bh = bw * logo.height / logo.width; ctx.drawImage(logo, -bw / 2, -bh / 2 - 60, bw, bh); }
        ctx.fillStyle = "#2a1a0e"; ctx.font = F(700, 54); spatie(ctx, `${namen[0]} – ${namen[1]}`, 0, 120, 2, "center");
        ctx.font = F(500, 28); ctx.textAlign = "center"; ctx.fillText(`${weekdag.toLowerCase()} ${datum.toLowerCase()}, ${tijd.toLowerCase()}`, 0, 162);
        /* bierkring */
        ctx.strokeStyle = "rgba(120,70,20,.28)"; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(150, 140, 120, .3, 5.6); ctx.stroke(); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(150, 140, 104, 0, 7); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = ZAND; ctx.font = F(300, 36); ctx.textAlign = "left"; ctx.fillText(idee.zin, L, 1030);
        selectieRegel(1086, WIT); infoKort(1290, WIT); bron = [];
      },

      /* 11. Dierentuinbord (Emmen thuis): de kameel als bezienswaardigheid */
      zoo() {
        const tmp = document.createElement("canvas"); tmp.width = W; tmp.height = H; beeld(tmp.getContext("2d"), zijImg, zijF, GRADE.groen, 0, 0, W, H);
        ctx.save(); ctx.filter = "blur(8px) brightness(.55)"; ctx.drawImage(tmp, -20, -20, W + 40, H + 40); ctx.restore();
        logoOp(L, 50, 56); ctx.fillStyle = WIT; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 96, 7, "right");
        const bx = 90, by = 150, bw = W - 180, bh = 960;
        ctx.save(); ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 50; ctx.fillStyle = "#6b4a2b"; ctx.beginPath(); ctx.roundRect(bx - 22, by - 22, bw + 44, bh + 44, 16); ctx.fill(); ctx.restore();
        ctx.fillStyle = "#1f3b2c"; ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = "#e8dfc7"; ctx.fillRect(bx + 40, by + 40, bw - 80, 420);
        if (kameelImg) { const kw = 520, kh = kw * kameelImg.height / kameelImg.width; ctx.drawImage(kameelImg, bx + (bw - kw) / 2, by + 60, kw, kh); }
        ctx.fillStyle = "#e8dfc7"; ctx.font = F(700, 82); ctx.textAlign = "left"; spatie(ctx, "KAMEEL", bx + 40, by + 560, 4);
        ctx.font = `italic 400 34px PSerif, Georgia, serif`; ctx.fillText("Camelus groningensis", bx + 44, by + 608);
        const feit = [["HERKOMST", "Groningen"], ["LEEFGEBIED", "Kunstgras, 1e klasse"], ["VOEDSEL", "Bier en doelpunten"], ["GEVAARLIJK", "Ja, vooral thuis"]];
        feit.forEach(([a, b], i) => { const y = by + 676 + i * 52; ctx.fillStyle = "#d9b27c"; ctx.font = F(700, 22); spatie(ctx, a, bx + 44, y, 5); ctx.fillStyle = "#e8dfc7"; ctx.font = F(500, 32); ctx.textAlign = "left"; ctx.fillText(b, bx + 300, y + 2); });
        ctx.fillStyle = "#d9b27c"; ctx.fillRect(bx + 44, by + bh - 74, bw - 88, 2);
        ctx.fillStyle = "#e8dfc7"; ctx.font = F(500, 26); ctx.textAlign = "left"; ctx.fillText(`Te bezichtigen op ${weekdag.toLowerCase()} ${datum.toLowerCase()} tegen ${tk}.`, bx + 44, by + bh - 34);
        ctx.fillStyle = ZAND; ctx.font = F(300, 34); ctx.textAlign = "left"; ctx.fillText(idee.zin, L, 1190); selectieRegel(1236, WIT); infoKort(1300, WIT, true); bron = [zijF, KAMEEL];
      },

      /* 12. Festivalposter (laatste thuiswedstrijd) */
      festival() {
        const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#2b1650"); gr.addColorStop(.45, "#c2406a"); gr.addColorStop(.75, "#f39a3c"); gr.addColorStop(1, "#f6c25a"); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ffe2a0"; ctx.beginPath(); ctx.arc(W / 2, 1010, 230, 0, 7); ctx.fill();
        ctx.fillStyle = "#2a1530"; ctx.beginPath(); ctx.moveTo(0, 1100); ctx.quadraticCurveTo(300, 1010, 560, 1080); ctx.quadraticCurveTo(820, 1150, W, 1050); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
        if (kameelImg) { const k = document.createElement("canvas"), bw = 300, bh = bw * kameelImg.height / kameelImg.width; k.width = bw; k.height = bh; const t = k.getContext("2d"); t.drawImage(kameelImg, 0, 0, bw, bh); t.globalCompositeOperation = "source-in"; t.fillStyle = "#2a1530"; t.fillRect(0, 0, bw, bh); ctx.drawImage(k, 640, 1095 - bh); }
        ctx.fillStyle = "#fff4e0"; ctx.font = F(500, 26); spatie(ctx, `${weekdag} ${datum} 2027  /  GRONINGEN`, W / 2, 92, 8, "center");
        ctx.font = F(700, 150); spatie(ctx, "KAMELENFEST", W / 2, 240, 4, "center");
        ctx.font = F(500, 28); spatie(ctx, "DE SEIZOENSAFSLUITER", W / 2, 290, 10, "center");
        const lijst = spelers.length ? spelers : ["LINE-UP", "VOLGT"];
        const groottes = [76, 76, 58, 58, 58, 46, 46, 46, 46, 38, 38, 38, 38, 38, 38, 38, 38];
        let y = 400, i = 0;
        while (i < lijst.length) { const s = groottes[i] || 34; let regel = [lijst[i++]]; ctx.font = F(700, s);
          while (i < lijst.length && (groottes[i] || 34) === s && breedte(ctx, [...regel, lijst[i]].join("  /  "), 3) < W - 140) regel.push(lijst[i++]);
          ctx.fillStyle = "#fff4e0"; spatie(ctx, regel.join("  /  "), W / 2, y, 3, "center"); y += s * 1.15; }
        ctx.font = F(500, 26); spatie(ctx, `MET SPECIALE GAST: ${tk.toUpperCase()}`, W / 2, y + 30, 6, "center");
        ctx.fillStyle = "#fff4e0"; ctx.font = F(700, 30); spatie(ctx, `AFTRAP ${tijd.toUpperCase()}`, W / 2, H - 120, 6, "center");
        ctx.font = F(300, 28); ctx.textAlign = "center"; ctx.fillText(idee.zin, W / 2, H - 78); bron = [KAMEEL];
      },

      /* 13. Stempelkaart (Leeuwarden uit, laatste wedstrijd): het seizoen als Elfstedentocht, finish in Leeuwarden */
      stempelkaart() {
        ctx.fillStyle = "#14213b"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "rgba(255,255,255,.05)"; for (let i = 0; i < 60; i++) { ctx.beginPath(); ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 3, 0, 7); ctx.fill(); }
        logoOp(L, 50, 56); ctx.fillStyle = WIT; ctx.font = F(500, 22); spatie(ctx, ronde, W - L, 96, 7, "right");
        const kx = 80, ky = 150, kw = W - 160, kh = 940;
        ctx.save(); ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 40; ctx.fillStyle = "#f2ead8"; ctx.fillRect(kx, ky, kw, kh); ctx.restore();
        ctx.strokeStyle = "#14213b"; ctx.lineWidth = 3; ctx.strokeRect(kx + 20, ky + 20, kw - 40, kh - 40);
        ctx.fillStyle = "#14213b"; ctx.font = F(700, 60); spatie(ctx, "STEMPELKAART", kx + kw / 2, ky + 100, 8, "center");
        ctx.font = F(500, 24); spatie(ctx, "KAMELEN, SEIZOEN 2026/2027", kx + kw / 2, ky + 140, 8, "center");
        const ms = opt.seizoen || [], kol = 5, cw = (kw - 80) / kol, ch = 128;
        ms.forEach((w, i) => { const x = kx + 40 + (i % kol) * cw, y = ky + 172 + Math.floor(i / kol) * ch, cxm = x + cw / 2, cym = y + ch / 2 - 8, laatste = i === ms.length - 1;
          ctx.strokeStyle = "rgba(20,33,59,.3)"; ctx.lineWidth = 1.5; ctx.strokeRect(x + 6, y + 6, cw - 12, ch - 12);
          const thuisW = /gchc/i.test(w.thuis), tg = korteNaam(thuisW ? w.uit : w.thuis);
          ctx.fillStyle = "#14213b"; ctx.font = F(500, 15); ctx.textAlign = "center"; ctx.fillText(`${tg.toUpperCase()} ${thuisW ? "(T)" : "(U)"}`, cxm, y + ch - 16);
          if (w.score) { const [a, b] = w.score.split("-").map(Number), wij = thuisW ? a : b, zij = thuisW ? b : a, res = wij > zij ? "W" : wij < zij ? "V" : "G";
            const kleur = res === "W" ? "rgba(32,120,70,.85)" : res === "V" ? "rgba(190,40,30,.85)" : "rgba(80,80,90,.85)";
            ctx.save(); ctx.translate(cxm, cym); ctx.rotate((i * 37 % 20 - 10) / 60); ctx.strokeStyle = kleur; ctx.fillStyle = kleur; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 40, 0, 7); ctx.stroke(); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 33, 0, 7); ctx.stroke();
            ctx.font = F(700, 30); ctx.textAlign = "center"; ctx.fillText(`${wij}-${zij}`, 0, 10); ctx.restore(); }
          else if (laatste) { ctx.fillStyle = "#e48a2c"; ctx.fillRect(x + 6, y + 6, cw - 12, ch - 12); ctx.fillStyle = "#14213b"; ctx.font = F(700, 26); spatie(ctx, "FINISH", cxm, cym + 2, 4, "center"); ctx.font = F(500, 15); ctx.fillText(`${tg.toUpperCase()} (U)`, cxm, y + ch - 16); }
          else { ctx.fillStyle = "rgba(20,33,59,.18)"; ctx.font = F(500, 18); ctx.textAlign = "center"; ctx.fillText(new Date(w.datum + "T12:00").toLocaleDateString("nl-NL", { day: "numeric", month: "short" }), cxm, cym + 6); } });
        if (logo) { const lh = 70, lw = lh * logo.width / logo.height; ctx.drawImage(logo, kx + kw - lw - 40, ky + kh - lh - 34, lw, lh); }
        ctx.fillStyle = "#14213b"; ctx.font = F(500, 20); ctx.textAlign = "left"; ctx.fillText("Start: Groningen. Finish: Leeuwarden. Elke wedstrijd een stempel.", kx + 44, ky + kh - 50);
        ctx.fillStyle = WIT; ctx.font = F(700, 56); spatie(ctx, `${namen[0]}  TEGEN  ${namen[1]}`, L, 1170, 3);
        ctx.fillStyle = ZAND; ctx.font = F(300, 32); ctx.textAlign = "left"; ctx.fillText(idee.zin, L, 1214); selectieRegel(1252, MUTED, false, 22); infoKort(1310, WIT, true); bron = [];
      },
    };
    (OPMAAK[opt.opmaak || idee.opmaak] || OPMAAK.bord)();

    /* Uitslagkaart: dezelfde poster, maar onderaan de eindstand, de doelpuntenmakers en kameel en ezel */
    if (opt.uitslag) {
      const u = opt.uitslag, [sa, sb] = String(u.score).split("-").map(x => x.trim()), wij = +(wijThuis ? sa : sb), zij = +(wijThuis ? sb : sa);
      let gr = ctx.createLinearGradient(0, 930, 0, 1045); gr.addColorStop(0, "rgba(8,7,6,0)"); gr.addColorStop(1, "rgb(8,7,6)");
      ctx.fillStyle = gr; ctx.fillRect(0, 930, W, 115); ctx.fillStyle = "rgb(8,7,6)"; ctx.fillRect(0, 1045, W, H - 1045);
      ctx.fillStyle = ZAND; ctx.font = F(700, 24); spatie(ctx, "EINDSTAND", L, 1112, 8);
      const uit = wij > zij ? ["GEWONNEN", "#3fae6b"] : wij < zij ? ["VERLOREN", "#d4503a"] : ["GELIJK", "#9aa1a8"];
      ctx.fillStyle = uit[1]; ctx.font = F(700, 24); spatie(ctx, uit[0], W - L, 1112, 8, "right");
      const regel = `${namen[0]}  ${sa}\u2013${sb}  ${namen[1]}`; let gs = 120; ctx.font = F(700, gs);
      while (breedte(ctx, regel, 2) > W - 2 * L && gs > 50) { gs -= 4; ctx.font = F(700, gs); }
      ctx.fillStyle = WIT; spatie(ctx, regel, L - 3, 1112 + gs * .95, 2);
      let y = 1112 + gs * .95 + 54;
      if (u.scorers && u.scorers.length) { ctx.fillStyle = "rgba(244,239,230,.85)"; ctx.font = F(500, 28); ctx.textAlign = "left";
        const telling = {}; u.scorers.forEach(n => telling[n] = (telling[n] || 0) + 1);
        ctx.fillText("Doelpunten: " + Object.entries(telling).map(([n, k]) => k > 1 ? `${n} ${k}\u00d7` : n).join(", "), L, y); y += 42; }
      if (u.kameel || u.ezel) { ctx.fillStyle = ZAND; ctx.font = F(500, 28); ctx.textAlign = "left";
        ctx.fillText([u.kameel ? `\u{1F42A} Kameel: ${u.kameel}` : "", u.ezel ? `\u{1FACF} Ezel: ${u.ezel}` : ""].filter(Boolean).join("     "), L, y); }
    }

    /* ----- bron en korrel ----- */
    const makers = [...new Set((bron || [zijF, onsF]).map(f => f.door))].filter(Boolean);
    if (makers.length) { ctx.fillStyle = /zwitsers/.test(idee.opmaak) ? "rgba(23,18,13,.45)" : "rgba(244,239,230,.32)"; ctx.font = F(300, 15); ctx.textAlign = "center";
      ctx.fillText(`Foto's: ${[...new Set(makers)].join(", ")} \u00b7 Wikimedia Commons`, W / 2, H - 22); }
    const korrel = ctx.getImageData(0, 0, W, H), px = korrel.data;
    for (let i = 0; i < px.length; i += 4) { const n = (Math.random() - .5) * 14; px[i] += n; px[i + 1] += n; px[i + 2] += n; }
    ctx.putImageData(korrel, 0, 0);
    return cv;
  }
  window.maakPoster = maakPoster;
})();
