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
    kameel: { src: "steden/kameel.jpg", fx: .42, fy: .42, door: "Skander Zarrad" },
    karavaan: { src: "steden/kameel-woestijn.jpg", fx: .55, fy: .55, door: "ASC Leiden" },
    wind: { src: "steden/eemshaven.jpg", fx: .42, fy: .4, door: "Uberprutser" },
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
    { test: /leeuwarden/i, kort: "LWD", beeld: ["martini", "oldehove"], grade: "nacht", zin: "Twee torens. Eén winnaar." },
    { test: /ghbs\s*h13/i, kort: "GHB", beeld: ["martini"], grade: "nacht", zin: "Ingehaald. Nu telt het." },
    { test: /ghbs\s*h11/i, kort: "GHB", beeld: ["karavaan"], grade: "zand", zin: "Zelfde stad, andere woestijn." },
    { test: /ghbs\s*h12/i, kort: "GHB", beeld: ["kameel"], grade: "rood", zin: "Derby. Geen genade." },
    { test: /ghbs/i, kort: "GHB", beeld: ["markt"], grade: "nacht", zin: "Wie heeft de stad?" },
    { test: /sneek/i, kort: "SNK", beeld: ["waterpoort"], grade: "staal", zin: "De nummer één. De poort staat open." },
    { test: /hcso/i, kort: "HCSO", beeld: ["karavaan"], grade: "rood", zin: "Er staat nog een 1–8 open." },
    { test: /daring/i, kort: "DAR", beeld: ["kameel"], grade: "zand", zin: "Wie durft, wint." },
    { test: /studs/i, kort: "STU", beeld: ["plantsoen"], grade: "groen", zin: "Collegegeld betaald. Les krijgen ze hier." },
    { test: /eemsmond/i, kort: "EEM", beeld: ["wind"], grade: "staal", zin: "Tegenwind? Kamelen lopen door." },
    { test: /emmen/i, kort: "EMM", beeld: ["olifant"], grade: "zand", zin: "Olifanten vergeten nooit. Wij ook niet." },
    { test: /./, kort: null, beeld: ["karavaan"], grade: "zand", zin: "De karavaan trekt door." }
  ];
  const korteNaam = t => String(t).replace(/\s+(H|D)\d+.*$/i, "").replace(/^Gron\.?\s*Studs/i, "Studs").trim();
  const STADVAN = { GHBS: "Groningen", Studs: "Groningen", Sneek: "Sneek", Daring: "Veendam", Eemsmond: "Uithuizen", Emmen: "Emmen", Leeuwarden: "Leeuwarden" };

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
    if (img) {
      const s = Math.max(w / img.width, h / img.height) * 1.04, iw = img.width * s, ih = img.height * s;
      let ox = w / 2 - f.fx * iw, oy = h * .4 - f.fy * ih;
      ox = Math.min(0, Math.max(w - iw, ox)); oy = Math.min(0, Math.max(h - ih, oy));
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

    /* ----- beeld ----- */
    const BH = 1000;
    if (fotos.length === 2) {
      /* rivaliteit: links thuisploeg, rechts uitploeg, smalle naad ertussen */
      const [l, r] = wijThuis ? [0, 1] : [1, 0];
      beeld(ctx, imgs[l], fotos[l], g, 0, 0, W / 2 - 3, BH); beeld(ctx, imgs[r], fotos[r], g, W / 2 + 3, 0, W / 2 - 3, BH);
    } else beeld(ctx, imgs[0], fotos[0], g, 0, 0, W, BH);
    /* vignet en overgang naar zwart */
    let gr = ctx.createRadialGradient(W / 2, BH * .42, 200, W / 2, BH * .45, 900);
    gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,.7)"); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, BH);
    gr = ctx.createLinearGradient(0, 520, 0, BH); gr.addColorStop(0, "rgba(6,5,4,0)"); gr.addColorStop(.75, "rgba(6,5,4,.92)"); gr.addColorStop(1, "#060504");
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, BH); ctx.fillStyle = "#060504"; ctx.fillRect(0, BH, W, H - BH);
    gr = ctx.createLinearGradient(0, 0, 0, 220); gr.addColorStop(0, "rgba(0,0,0,.55)"); gr.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, 220);

    /* ----- kop: logo en team ----- */
    if (logo) { const lh = 64, lw = lh * logo.width / logo.height; ctx.globalAlpha = .95; ctx.drawImage(logo, 64, 52, lw, lh); ctx.globalAlpha = 1; }
    ctx.fillStyle = WIT; ctx.font = F(500, 24); spatie(ctx, "GCHC HEREN 13", W - 64, 92, 6, "right");

    /* ----- KAM VS LWD ----- */
    const titel = wijThuis ? ["KAM", kort] : [kort, "KAM"];
    let s = 150, sp = 30; const maak = () => `${[...titel[0]].join(" ")}   V S   ${[...titel[1]].join(" ")}`;
    ctx.font = F(500, s); while (breedte(ctx, maak(), sp) > W - 128 && s > 70) { s -= 4; sp = s / 5; ctx.font = F(500, s); }
    ctx.fillStyle = WIT; spatie(ctx, maak(), W / 2, 860, sp, "center");
    ctx.fillStyle = ZAND; ctx.font = F(300, 40); ctx.textAlign = "center"; ctx.fillText(idee.zin, W / 2, 926);

    /* ----- selectie ----- */
    const spelers = (opt.spelers || []).map(n => String(n).toUpperCase());
    ctx.fillStyle = MUTED; ctx.font = F(500, 20); spatie(ctx, "SELECTIE", W / 2, 1000, 8, "center");
    if (spelers.length) {
      const kol = spelers.length > 12 ? 4 : 3, rijen = Math.ceil(spelers.length / kol), kw = (W - 200) / kol, rh = Math.min(36, 144 / rijen);
      ctx.fillStyle = WIT; ctx.font = F(500, 28);
      spelers.forEach((n, i) => spatie(ctx, n, 100 + (i % kol) * kw + kw / 2, 1040 + Math.floor(i / kol) * rh, 3, "center"));
    } else { ctx.fillStyle = WIT; ctx.font = F(300, 28); ctx.textAlign = "center"; ctx.fillText("Volgt zodra de afmeldingen binnen zijn", W / 2, 1050); }

    /* ----- onderrij: datum | plek | competitie ----- */
    const d = new Date(m.datum + "T12:00:00");
    const dag = d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
    const plek = wijThuis ? ["THUIS", "Groningen"] : ["UIT", STADVAN[tk] || tk];
    const cellen = [[dag.charAt(0).toUpperCase() + dag.slice(1), m.tijd ? `${m.tijd.replace(":", ".")} uur` : "Tijd volgt"], [plek[0], plek[1]], ["1E KLASSE", opt.ronde ? `Ronde ${opt.ronde}` : "Heren Reserve"]];
    const cw = (W - 128) / 3, ry = 1232;
    ctx.fillStyle = "rgba(244,239,230,.25)"; ctx.fillRect(64, ry - 52, W - 128, 1);
    cellen.forEach(([a, b], i) => {
      const cx = 64 + cw * i + cw / 2;
      if (i) { ctx.fillStyle = "rgba(244,239,230,.25)"; ctx.fillRect(64 + cw * i, ry - 18, 1, 66); }
      ctx.fillStyle = WIT; ctx.font = F(700, i ? 30 : 28); spatie(ctx, i ? a : a.toUpperCase(), cx, ry + 4, 3, "center");
      ctx.fillStyle = MUTED; ctx.font = F(300, 26); ctx.textAlign = "center"; ctx.fillText(b, cx, ry + 40);
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
