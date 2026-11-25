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
  /* Per tegenstander een eigen idee (volgorde telt: specifiek eerst) */
  const IDEE = [
    { test: /leeuwarden/i, beeld: ["martini", "oldehove"], grade: "nacht", zin: "Hun toren staat al scheef. Wij duwen nog even." },
    { test: /ghbs\s*h13/i, beeld: ["martini"], grade: "nacht", zin: "Ingehaald. Nu telt het." },
    { test: /ghbs\s*h11/i, beeld: ["karavaan"], grade: "zand", zin: "Zelfde stad, andere woestijn." },
    { test: /ghbs\s*h12/i, beeld: ["kameel"], grade: "rood", zin: "Derby. Geen genade." },
    { test: /ghbs\s*h14/i, beeld: ["markt"], grade: "nacht", zin: "Het veertiende van GHBS. Er zitten er dertien boven." },
    { test: /ghbs/i, beeld: ["markt"], grade: "nacht", zin: "Wie heeft de stad?" },
    { test: /sneek/i, beeld: ["waterpoort"], grade: "staal", zin: "De nummer één. De poort staat open." },
    { test: /hcso/i, beeld: ["parkeren"], grade: "staal", zin: "Max. twee uur in Stadskanaal. Langer houdt niemand het vol." },
    { test: /daring/i, beeld: ["kameel"], grade: "zand", zin: "Durven wel. Kunnen niet." },
    { test: /studs/i, beeld: ["senaat"], grade: "zand", zin: "Vindicat sinds 1815. Hockey sinds vorige week." },
    { test: /eemsmond/i, beeld: ["wind"], grade: "staal", zin: "Tegenwind? Kamelen lopen door." },
    { test: /emmen/i, beeld: ["emmen"], grade: "groen", zin: "Emmen. Ook van bovenaf geen gezicht." },
    { test: /./, beeld: ["karavaan"], grade: "zand", zin: "De karavaan trekt door." }
  ];
  const korteNaam = t => String(t).replace(/\s+(H|D)\d+.*$/i, "").replace(/^Gron\.?\s*Studs/i, "Studs").trim();
  const STADVAN = { GHBS: "Groningen", Studs: "Groningen", Sneek: "Sneek", HCSO: "Stadskanaal", Daring: "Veendam", Eemsmond: "Uithuizen", Emmen: "Emmen", Leeuwarden: "Leeuwarden" };

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

    /* ----- beeld: vult de hele poster ----- */
    if (fotos.length === 2) {
      const [l, r] = wijThuis ? [0, 1] : [1, 0];
      beeld(ctx, imgs[l], fotos[l], g, 0, 0, W / 2 - 2, H); beeld(ctx, imgs[r], fotos[r], g, W / 2 + 2, 0, W / 2 - 2, H);
    } else beeld(ctx, imgs[0], fotos[0], g, 0, 0, W, H);
    let gr = ctx.createRadialGradient(W / 2, H * .3, 150, W / 2, H * .35, 1000);
    gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,.65)"); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    gr = ctx.createLinearGradient(0, 430, 0, 1010); gr.addColorStop(0, "rgba(6,5,4,0)"); gr.addColorStop(.6, "rgba(6,5,4,.82)"); gr.addColorStop(1, "rgba(6,5,4,.97)");
    ctx.fillStyle = gr; ctx.fillRect(0, 430, W, 580); ctx.fillStyle = "rgba(6,5,4,.97)"; ctx.fillRect(0, 1010, W, H - 1010);
    gr = ctx.createLinearGradient(0, 0, 0, 200); gr.addColorStop(0, "rgba(0,0,0,.6)"); gr.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, 200);

    /* ----- kop ----- */
    const L = 72;
    if (logo) { const lh = 60, lw = lh * logo.width / logo.height; ctx.drawImage(logo, L, 54, lw, lh); }
    ctx.fillStyle = WIT; ctx.font = F(500, 22); spatie(ctx, opt.ronde ? `RONDE ${opt.ronde}` : "MATCHDAY", W - L, 94, 7, "right");

    /* ----- namen onder elkaar, helemaal uitgeschreven ----- */
    const namen = (wijThuis ? ["KAMELEN", tk] : [tk, "KAMELEN"]).map(n => n.toUpperCase());
    let s = 168, sp = 10; ctx.font = F(700, s);
    while (Math.max(...namen.map(n => breedte(ctx, n, sp))) > W - 2 * L && s > 80) { s -= 4; sp = s / 16; ctx.font = F(700, s); }
    const y1 = 700, y2 = y1 + s * .92 + 56;
    ctx.fillStyle = WIT; spatie(ctx, namen[0], L - 4, y1, sp);
    ctx.fillStyle = ZAND; ctx.font = F(300, 40); spatie(ctx, "TEGEN", L, y1 + 58, 14);
    const tw = breedte(ctx, "TEGEN", 14) + 24; ctx.fillStyle = "rgba(244,239,230,.3)"; ctx.fillRect(L + tw, y1 + 44, W - 2 * L - tw, 1);
    ctx.fillStyle = WIT; ctx.font = F(700, s); spatie(ctx, namen[1], L - 4, y2, sp);
    ctx.fillStyle = ZAND; ctx.font = F(300, 38); ctx.textAlign = "left";
    let zs = 38; while (ctx.measureText(idee.zin).width > W - 2 * L && zs > 26) { zs -= 2; ctx.font = F(300, zs); }
    ctx.fillText(idee.zin, L, y2 + 66);

    /* ----- selectie als aftiteling ----- */
    const spelers = (opt.spelers || []).map(n => String(n).toUpperCase());
    let sy = y2 + 140; ctx.font = F(700, 22); ctx.fillStyle = WIT; spatie(ctx, "SELECTIE", L, sy, 6);
    ctx.font = F(500, 24); ctx.fillStyle = "rgba(244,239,230,.78)";
    const tekst = spelers.length ? spelers : ["VOLGT ZODRA DE AFMELDINGEN BINNEN ZIJN"];
    let x = L + breedte((ctx.font = F(700, 22), ctx), "SELECTIE", 6) + 28; ctx.font = F(500, 24);
    tekst.forEach(n => { const bw = breedte(ctx, n, 4); if (x + bw > W - L) { x = L; sy += 38; } spatie(ctx, n, x, sy, 4); x += bw + 26; });

    /* ----- onderrij: datum | plek | competitie ----- */
    const d = new Date(m.datum + "T12:00:00");
    const dag = d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" }).toUpperCase();
    const plek = wijThuis ? ["THUIS", "Groningen"] : ["UIT", STADVAN[tk] || tk];
    const cellen = [[dag, m.tijd ? `${m.tijd.replace(":", ".")} uur` : "Tijd volgt"], plek, ["HEREN RESERVE", "1e klasse"]];
    const ry = H - 112, cw = (W - 2 * L) / 3;
    ctx.fillStyle = "rgba(244,239,230,.25)"; ctx.fillRect(L, ry - 46, W - 2 * L, 1);
    cellen.forEach(([a, b], i) => {
      const cx = L + cw * i + (i ? 28 : 0);
      if (i) { ctx.fillStyle = "rgba(244,239,230,.25)"; ctx.fillRect(L + cw * i, ry - 22, 1, 62); }
      ctx.fillStyle = WIT; ctx.font = F(700, 26); spatie(ctx, a, cx, ry, 3);
      ctx.fillStyle = MUTED; ctx.font = F(300, 26); ctx.textAlign = "left"; ctx.fillText(b, cx, ry + 34);
    });

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
