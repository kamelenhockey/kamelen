/* =========================================================
   Beerpong-minigame (op één telefoon, telefoon doorgeven)
   Kamelen-regels:
   - 2 worpen per beurt; raak = beker blijft staan + extra worp, het geraakte team trekt een halve bak
   - na een raak: mis = beker weg, zelfde beker = BOM (alles eromheen weg), andere beker = eerste weg en weer gooien
   - stuiterbal mag weggeslagen worden; toch raak na stuiter = ook nog 1 beker naar keuze weg
   - volledig over de tafel = beurt voorbij + halve bak
   - gemist en gevangen voor de grond = trickshot (extra worp)
   - omgestoten glas = weg
   - raak in een vastgehouden biertje = meteen gewonnen
   - 1x per potje hervormen
   - alle bekers weg wint, maar begon dat team, dan krijgt de ander nog een gelijkmakende beurt
   - verliezer trekt per overgebleven glas van de winnaar een halve bak
   Maten in centimeters: tafel 61 breed, 244 lang. De gooier staat bij y = 0.
   ========================================================= */
(function () {
  const box = document.getElementById("bp-spel"); if (!box) return;
  const esc = s => String(s).replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const TAFEL_B = 61, TAFEL_L = 244, BEKER_R = 4.6, RAAK_R = 3.5, BAL_R = 2;
  const ruisG = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;   // ongeveer normaal verdeeld, -1..1
  const KLEUR = ["#3f87ad", "#f08c1c"], LICHT = ["#d4ebf6", "#ffe2bd"];
  const rustig = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Bekers ---------- */
  const piramide = () => {
    const uit = []; let id = 0;
    for (let rij = 0; rij < 4; rij++) for (let i = 0; i <= rij; i++)
      uit.push({ id: id++, x: TAFEL_B / 2 + (i - rij / 2) * 9.4, y: 207 + rij * 8.2 });
    return uit;
  };
  const VORMEN = {
    driehoek: n => { const uit = []; let rij = 0, k = 0; while (k < n) { for (let i = 0; i <= rij && k < n; i++, k++) uit.push([i - rij / 2, rij]); rij++; } return uit; },
    ruit: n => { const rijen = n <= 1 ? [1] : n <= 2 ? [1, 1] : n <= 4 ? [1, 2, 1] : n <= 6 ? [1, 2, 2, 1] : n <= 7 ? [1, 2, 3, 1] : [1, 2, 3, 2, 1]; const uit = []; let k = 0;
      rijen.forEach((m, r) => { for (let i = 0; i < m && k < n; i++, k++) uit.push([i - (m - 1) / 2, r]); }); while (k < n) { uit.push([k % 3 - 1, rijen.length + Math.floor(k / 3)]); k++; } return uit; },
    rij: n => { const uit = []; for (let k = 0; k < n; k++) uit.push([k % 3 - 1, Math.floor(k / 3)]); return uit; }
  };
  const hervorm = (bekers, vorm) => VORMEN[vorm](bekers.length).map(([c, r], k) => ({ id: bekers[k].id, x: TAFEL_B / 2 + c * 9.4, y: 207 + r * 8.2 }));
  const buren = (bekers, b) => bekers.filter(o => o.id !== b.id && Math.hypot(o.x - b.x, o.y - b.y) < 10.5);

  /* ---------- Spelstatus ---------- */
  let S = null;
  const nieuwSpel = (namen) => ({
    teams: [0, 1].map(t => ({ naam: namen[t], bekers: piramide(), bakken: 0, hervormd: false })),
    begon: 0, beurt: 0, worpen: 2, open: null, trick: false, stuiterKeuze: false,
    gelijkmaker: false, fase: "start", bier: null, klaar: null
  });
  const doel = () => S.teams[1 - S.beurt];   // de bekers waar je op gooit
  const gooier = () => S.teams[S.beurt];

  /* ---------- Opbouw ---------- */
  box.innerHTML = `
    <div class="bpg">
      <div class="bpg-bord" id="bpg-bord"></div>
      <div class="bpg-veld" id="bpg-veld">
        <canvas id="bpg-canvas" aria-label="Beerpongtafel: trek de bal naar beneden en laat los om te gooien"></canvas>
        <div class="bpg-melding" id="bpg-melding" aria-live="polite"></div>
        <div class="bpg-actie" id="bpg-actie"></div>
        <div class="bpg-laag" id="bpg-laag"></div>
      </div>
      <div class="bpg-knoppen" id="bpg-knoppen"></div>
    </div>`;
  const cv = box.querySelector("#bpg-canvas"), ctx = cv.getContext("2d");
  const bord = box.querySelector("#bpg-bord"), melding = box.querySelector("#bpg-melding"), actie = box.querySelector("#bpg-actie"), laag = box.querySelector("#bpg-laag"), knoppen = box.querySelector("#bpg-knoppen");

  /* ---------- Perspectief ---------- */
  let W = 0, H = 0, dpr = 1;
  const Y_ONDER = 112, Y_BOVEN = 252, D0 = 150;
  let Fy = 1, hor = 0, Fx = 1;
  function maat() {
    const r = cv.getBoundingClientRect(); dpr = Math.min(2.5, devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const z1 = Y_ONDER + D0, z2 = Y_BOVEN + D0, top = H * .1, bot = H * 1.02;
    Fy = (bot - top) / (1 / z1 - 1 / z2); hor = top - Fy / z2;
    Fx = W * .74 * (TAFEL_L + D0) / TAFEL_B;
    teken();
  }
  const P = (x, y, h = 0) => { const z = y + D0; return { x: W / 2 + Fx * (x - TAFEL_B / 2) / z, y: hor + Fy / z - Fx * h / z * .55, s: Fx / z }; };

  /* ---------- Tekenen ---------- */
  let bal = null, spatten = [];
  function teken() {
    if (!W) return;
    ctx.clearRect(0, 0, W, H);
    const lucht = ctx.createLinearGradient(0, 0, 0, H); lucht.addColorStop(0, "#2a2016"); lucht.addColorStop(1, "#4a3a28");
    ctx.fillStyle = lucht; ctx.fillRect(0, 0, W, H);
    /* tafel */
    const a = P(0, Y_ONDER - 30), b = P(TAFEL_B, Y_ONDER - 30), c = P(TAFEL_B, TAFEL_L), d = P(0, TAFEL_L);
    ctx.fillStyle = "#1f6b45"; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 3; ctx.stroke();
    const m1 = P(TAFEL_B / 2, Y_ONDER - 30), m2 = P(TAFEL_B / 2, TAFEL_L);
    ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.moveTo(m1.x, m1.y); ctx.lineTo(m2.x, m2.y); ctx.stroke(); ctx.setLineDash([]);
    const rand = P(0, TAFEL_L), rand2 = P(TAFEL_B, TAFEL_L);
    ctx.fillStyle = "#14472e"; ctx.fillRect(rand.x, rand.y, rand2.x - rand.x, 5);
    /* gevallen bier en vlekken */
    spatten.forEach(s => { const p = P(s.x, s.y); ctx.fillStyle = "rgba(240,200,90,.45)"; ctx.beginPath(); ctx.ellipse(p.x, p.y, s.r * p.s, s.r * p.s * .4, 0, 0, Math.PI * 2); ctx.fill(); });
    /* vastgehouden biertje */
    if (S && S.bier) tekenBier(bierPlek());
    /* bekers, achterste eerst */
    if (S) {
      const team = 1 - S.beurt;
      [...doel().bekers].sort((p, q) => q.y - p.y).forEach(k => tekenBeker(k, team, S.open === k.id, S.stuiterKeuze));
    }
    /* bal */
    if (bal) {
      const sch = P(bal.x, bal.y), p = P(bal.x, bal.y, bal.h), r = Math.max(4, BAL_R * p.s);
      if (bal.h > 0 && bal.y < TAFEL_L + 2) { ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(sch.x, sch.y, r, r * .4, 0, 0, Math.PI * 2); ctx.fill(); }
      const g = ctx.createRadialGradient(p.x - r * .35, p.y - r * .35, r * .1, p.x, p.y, r); g.addColorStop(0, "#fff"); g.addColorStop(1, "#d9d9d9");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1; ctx.stroke();
    }
    /* richten */
    if (mik) {
      const start = { x: W / 2, y: H - 46 };
      const kracht = Math.min(1, mik.dy / 160), lengte = 40 + kracht * 150, hoek = Math.atan2(-mik.dx * .9, mik.dy) + Math.sin(performance.now() / 110) * .07;   // trillende hand
      ctx.strokeStyle = `rgba(255,255,255,${.5 + kracht * .5})`; ctx.lineWidth = 3; ctx.setLineDash([4, 7]);
      ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(start.x + Math.sin(hoek) * lengte, start.y - Math.cos(hoek) * lengte); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = kracht > .97 ? "#e8384f" : "#f2c230"; ctx.fillRect(14, H - 20 - 110 * kracht, 10, 110 * kracht);
      ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.strokeRect(14, H - 130, 10, 110);
    }
    /* bal in de hand */
    if (S && S.fase === "gooien" && !bal) {
      const x = W / 2 + (mik ? Math.max(-60, Math.min(60, mik.dx)) * .3 : 0), y = H - 46 + (mik ? Math.min(90, mik.dy) * .25 : 0);
      const g = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, 13); g.addColorStop(0, "#fff"); g.addColorStop(1, "#d6d6d6");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
      if (!mik) { ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.font = "600 12px Inter, system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillText(S.trick ? "Trickshot! Trek naar beneden en laat los" : "Trek naar beneden en laat los", W / 2, H - 12); }
    }
  }
  function tekenBeker(k, team, open, kiesbaar) {
    const p = P(k.x, k.y), r = BEKER_R * p.s, hoog = r * 2.1;
    const t = P(k.x, k.y, 0); /* rand bovenaan */
    ctx.fillStyle = KLEUR[team]; ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(t.x - r, t.y); ctx.lineTo(t.x - r * .78, t.y + hoog); ctx.lineTo(t.x + r * .78, t.y + hoog); ctx.lineTo(t.x + r, t.y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(t.x - r * .6, t.y + 2, r * .25, hoog - 4);
    ctx.fillStyle = "#f4f4f4"; ctx.beginPath(); ctx.ellipse(t.x, t.y, r, r * .42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = LICHT[team]; ctx.beginPath(); ctx.ellipse(t.x, t.y + r * .05, r * .82, r * .32, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(120,180,220,.55)"; ctx.beginPath(); ctx.ellipse(t.x, t.y + r * .12, r * .6, r * .22, 0, 0, Math.PI * 2); ctx.fill();
    if (open) { ctx.strokeStyle = "#f2c230"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(t.x, t.y, r + 3, r * .42 + 3, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(t.x, t.y + r * .05, Math.max(3, BAL_R * p.s * .8), 0, Math.PI * 2); ctx.fill(); }
    if (kiesbaar) { ctx.strokeStyle = "#e8384f"; ctx.lineWidth = 2.5; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.ellipse(t.x, t.y + hoog / 2, r + 6, hoog / 2 + 6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
  }
  /* Het biertje loopt mee met degene die het vasthoudt: langs de linkerkant, achter de tafel en langs de rechterkant */
  function bierPlek() {
    const b = S.bier, t = performance.now() / 1000 * b.tempo + b.fase;
    let u = .5 + .5 * Math.sin(t) + .06 * Math.sin(t * 3.7);
    u = Math.max(0, Math.min(1, u));
    const L1 = 40, L2 = TAFEL_B + 12, tot = L1 * 2 + L2; let s = u * tot;
    if (s < L1) return { x: -6, y: 212 + s };
    s -= L1; if (s < L2) return { x: -6 + s, y: 252 };
    s -= L2; return { x: TAFEL_B + 6, y: 250 - s };
  }
  function loopBier() {
    const stap = () => { if (!S || !S.bier || S.fase === "klaar") return; if (!mik) teken(); requestAnimationFrame(stap); };
    requestAnimationFrame(stap);
  }
  function tekenBier(b) {
    const p = P(b.x, b.y), r = 6 * p.s, h = r * 2.4;
    ctx.fillStyle = "#f2c29b"; ctx.beginPath(); ctx.ellipse(p.x + (b.x < TAFEL_B / 2 ? -r * 1.1 : r * 1.1), p.y + h * .55, r * .55, r * .9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(246,189,69,.95)"; ctx.fillRect(p.x - r * .85, p.y, r * 1.7, h);
    ctx.fillStyle = "#fffaf0"; ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * .4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.font = `${Math.max(11, r)}px system-ui`; ctx.textAlign = "center"; ctx.fillText("🍺", p.x, p.y - r * .9);
  }

  /* ---------- Bord en knoppen ---------- */
  function werkBord() {
    if (!S) { bord.innerHTML = ""; knoppen.innerHTML = ""; return; }
    bord.innerHTML = S.teams.map((t, i) => `
      <div class="bpg-team ${S.beurt === i && S.fase !== "klaar" ? "aan" : ""}" style="--c:${KLEUR[i]}">
        <b>${esc(t.naam)}</b><span>${t.bekers.length} ${t.bekers.length === 1 ? "beker" : "bekers"} · 🍺 ${t.bakken} ${t.bakken === 1 ? "halve bak" : "halve bakken"}</span>
      </div>`).join("") +
      (S.fase === "gooien" || S.fase === "vlucht" ? `<div class="bpg-worpen">${S.trick ? "🎯 trickshot" : S.open !== null ? "⚡ extra worp" : "🏓".repeat(Math.max(0, S.worpen)) + ` <span>${S.worpen} ${S.worpen === 1 ? "worp" : "worpen"}</span>`}${S.gelijkmaker ? " · gelijkmaker!" : ""}</div>` : "");
    const kanHervormen = S.fase === "gooien" && !gooier().hervormd && S.open === null && doel().bekers.length > 1;
    knoppen.innerHTML = S.fase === "start" || S.fase === "klaar" ? "" :
      `${kanHervormen ? `<button type="button" class="btn sm ghost" data-bpg="hervorm">Bekers hervormen (1×)</button>` : ""}
       <button type="button" class="btn sm ghost" data-bpg="stop">Potje stoppen</button>`;
  }
  let meldTimer = null;
  function meld(t, soort = "") {
    melding.innerHTML = t; melding.className = "bpg-melding toon " + soort;
    clearTimeout(meldTimer); meldTimer = setTimeout(() => { melding.className = "bpg-melding"; }, soort === "lang" ? 3600 : 2400);
  }
  const bak = (team, n = 1) => { S.teams[team].bakken += n; };

  /* ---------- Overlays ---------- */
  function startScherm() {
    S = null; werkBord(); teken();
    let namen = ["Team blauw", "Team oranje"]; try { namen = JSON.parse(localStorage.getItem("kamelen-bp-namen")) || namen; } catch {}
    laag.innerHTML = `<div class="bpg-kaart">
      <h3>Beerpong</h3><p>Speel tegen elkaar op één telefoon. Trek de bal naar beneden en laat los om te gooien, en geef de telefoon na je beurt door.</p>
      <label>Team 1 <input id="bpg-n0" maxlength="20" value="${esc(namen[0])}"></label>
      <label>Team 2 <input id="bpg-n1" maxlength="20" value="${esc(namen[1])}"></label>
      <button type="button" class="btn" data-bpg="sps">Steen, papier, schaar: wie begint?</button></div>`;
    laag.hidden = false;
  }
  function sps() {
    const namen = [0, 1].map(i => (box.querySelector("#bpg-n" + i)?.value || "").trim() || ["Team blauw", "Team oranje"][i]);
    try { localStorage.setItem("kamelen-bp-namen", JSON.stringify(namen)); } catch {}
    S = nieuwSpel(namen);
    const H = ["✊", "✋", "✌️"], wint = (a, b) => (a === 0 && b === 2) || (a === 1 && b === 0) || (a === 2 && b === 1);
    let a, b; do { a = Math.floor(Math.random() * 3); b = Math.floor(Math.random() * 3); } while (a === b);
    S.begon = S.beurt = wint(a, b) ? 0 : 1;
    laag.innerHTML = `<div class="bpg-kaart"><h3>Steen, papier, schaar</h3>
      <div class="bpg-sps"><div><span class="bpg-hand l">✊</span><b>${esc(namen[0])}</b></div><div><span class="bpg-hand r">✊</span><b>${esc(namen[1])}</b></div></div>
      <p class="bpg-sps-uit" hidden></p></div>`;
    const [l, r] = laag.querySelectorAll(".bpg-hand");
    setTimeout(() => { l.textContent = H[a]; r.textContent = H[b]; l.classList.add("klaar"); r.classList.add("klaar");
      const uit = laag.querySelector(".bpg-sps-uit"); uit.hidden = false; uit.innerHTML = `<b>${esc(namen[S.begon])}</b> begint!`;
      setTimeout(() => doorgeven(), 1500); }, rustig ? 100 : 1500);
  }
  function doorgeven() {
    S.fase = "wissel"; S.worpen = 2; S.open = null; S.trick = false; S.stuiterKeuze = false;
    S.bier = Math.random() < .3 ? { fase: Math.random() * 6.28, tempo: .45 + Math.random() * .35 } : null;
    if (S.bier) loopBier();
    werkBord(); teken();
    laag.innerHTML = `<div class="bpg-kaart"><span class="bpg-stip" style="background:${KLEUR[S.beurt]}"></span>
      <h3>Beurt voor ${esc(gooier().naam)}</h3><p>${S.gelijkmaker ? "<b>Gelijkmakende beurt!</b> Gooi alle bekers weg om gelijk te spelen." : "Geef de telefoon door."}${S.bier ? "<br>🍺 Iemand van de tegenstander loopt met zijn biertje rond de tafel. Raak = meteen gewonnen!" : ""}</p>
      <button type="button" class="btn" data-bpg="klaar">Ik gooi!</button></div>`;
    laag.hidden = false;
  }
  function einde(winnaar, reden) {
    S.fase = "klaar"; const verliezer = 1 - winnaar, over = S.teams[winnaar].bekers.length;
    bak(verliezer, over);
    werkBord(); teken();
    try { window.schietConfetti?.(); } catch {}
    laag.innerHTML = `<div class="bpg-kaart"><div class="bpg-beker">🏆</div><h3>${esc(S.teams[winnaar].naam)} wint!</h3>
      <p>${reden}</p>
      <p class="bpg-afreken">${esc(S.teams[verliezer].naam)} trekt <b>${over} ${over === 1 ? "halve bak" : "halve bakken"}</b>${over ? ` (${over} ${over === 1 ? "glas" : "glazen"} over bij de winnaar)` : ""}.</p>
      <table class="bpg-tabel"><tr><th></th><th>Halve bakken dit potje</th></tr>${S.teams.map(t => `<tr><td>${esc(t.naam)}</td><td>${t.bakken}</td></tr>`).join("")}</table>
      <button type="button" class="btn" data-bpg="opnieuw">Nog een potje</button></div>`;
    laag.hidden = false;
  }
  function gelijkspel() {
    S.fase = "klaar"; werkBord(); teken();
    laag.innerHTML = `<div class="bpg-kaart"><div class="bpg-beker">🤝</div><h3>Gelijkspel!</h3><p>${esc(gooier().naam)} maakt het af in de gelijkmakende beurt. Dat vraagt om een nieuw potje.</p>
      <table class="bpg-tabel"><tr><th></th><th>Halve bakken dit potje</th></tr>${S.teams.map(t => `<tr><td>${esc(t.naam)}</td><td>${t.bakken}</td></tr>`).join("")}</table>
      <button type="button" class="btn" data-bpg="opnieuw">Nog een potje</button></div>`;
    laag.hidden = false;
  }
  function kiesVorm() {
    laag.innerHTML = `<div class="bpg-kaart"><h3>Bekers hervormen</h3><p>Kies de nieuwe vorm voor de ${doel().bekers.length} bekers van ${esc(doel().naam)}. Dit kan maar één keer per potje.</p>
      <div class="bpg-vormen"><button type="button" class="btn ghost" data-vorm="driehoek">🔺 Driehoek</button><button type="button" class="btn ghost" data-vorm="ruit">🔷 Ruit</button><button type="button" class="btn ghost" data-vorm="rij">▦ Blok</button></div>
      <button type="button" class="btn sm ghost" data-bpg="terug">Toch niet</button></div>`;
    laag.hidden = false;
  }

  /* ---------- Gooien ---------- */
  let mik = null, startPunt = null;
  cv.addEventListener("pointerdown", e => {
    if (!S || S.fase !== "gooien" || bal) return;
    if (S.stuiterKeuze) return kiesBeker(e);
    startPunt = { x: e.clientX, y: e.clientY }; mik = { dx: 0, dy: 0 }; cv.setPointerCapture(e.pointerId); teken();
    const tril = () => { if (!mik) return; teken(); requestAnimationFrame(tril); }; requestAnimationFrame(tril);
  });
  cv.addEventListener("pointermove", e => { if (!mik) return; mik = { dx: e.clientX - startPunt.x, dy: Math.max(0, e.clientY - startPunt.y) }; teken(); });
  const los = e => {
    if (!mik) return; const m = { ...mik, tril: Math.sin(performance.now() / 110) * .07 }; mik = null; teken();
    if (m.dy < 18) return;
    gooi(m);
  };
  cv.addEventListener("pointerup", los); cv.addEventListener("pointercancel", () => { mik = null; teken(); });

  function gooi(m) {
    S.fase = "vlucht"; werkBord();
    const afstand = 60 + m.dy * 1.3 + ruisG() * 9;          // cm vanaf de gooier: gevoelig en met spreiding
    const zij = TAFEL_B / 2 + (-m.dx / Math.max(40, m.dy)) * afstand * .7 + Math.tan(m.tril || 0) * afstand * .35 + ruisG() * 5;
    const doelY = afstand, doelX = zij;
    /* vlucht 1 */
    vlieg({ x: TAFEL_B / 2, y: 70 }, { x: doelX, y: doelY }, 34 + afstand * .1, 700, () => land(doelX, doelY, false));
  }
  function vlieg(van, naar, piek, ms, klaar) {
    const t0 = performance.now(); if (rustig) ms = 1;
    const stap = nu => {
      const t = Math.min(1, (nu - t0) / ms);
      bal = { x: van.x + (naar.x - van.x) * t, y: van.y + (naar.y - van.y) * t, h: 4 * piek * t * (1 - t) + (1 - t) * 30 * (van.y < 100 ? 1 : 0) };
      teken();
      if (t < 1) requestAnimationFrame(stap); else klaar();
    };
    requestAnimationFrame(stap);
  }
  const bekerOp = (x, y) => doel().bekers.find(k => Math.hypot(k.x - x, (k.y - y) * .9) < RAAK_R);
  const rand = (x, y) => doel().bekers.find(k => { const d = Math.hypot(k.x - x, (k.y - y) * .9); return d >= RAAK_R && d < BEKER_R + 2.4; });

  function land(x, y, naStuiter) {
    /* biertje vastgehouden? */
    const bp = S.bier && bierPlek();
    if (bp && Math.hypot(bp.x - x, bp.y - y) < 6) { bal = null; teken(); meld("🍺 RAAK IN HET BIERTJE!", "groot"); return setTimeout(() => einde(S.beurt, `Raak in het biertje dat ${esc(doel().naam)} vasthield. Meteen gewonnen!`), 900); }
    /* volledig over de tafel */
    if (!naStuiter && y > TAFEL_L + 2) {
      const verder = { x: x + (x - TAFEL_B / 2) * .3, y: y + 40 };
      return vlieg({ x, y }, verder, 10, 300, () => {
        bal = null; bak(S.beurt);
        if (S.open !== null) haalWeg(S.open);
        meld(`💨 Over de tafel! Beurt voorbij, ${esc(gooier().naam)} trekt een halve bak.`, "lang");
        S.open = null; return volgendeBeurt(1600);
      });
    }
    const k = bekerOp(x, y);
    if (k) return raak(k, naStuiter);
    /* te kort: stuiteren */
    if (!naStuiter && y < 200 && y > 120 && x > 0 && x < TAFEL_B) {
      const y2 = y + (y - 105) * .55, x2 = x + (x - TAFEL_B / 2) * .25;
      return stuiter(x, y, x2, y2);
    }
    /* rand of tafel: gemist */
    const r = rand(x, y);
    meld(r ? "😩 Op de rand… eruit!" : naStuiter ? "Gestuiterd, maar mis." : "Mis!");
    const weg = { x: x + (Math.random() - .5) * 20, y: Math.min(TAFEL_L + 30, y + 30) };
    vlieg({ x, y }, weg, 12, 350, () => { bal = null; teken(); gemist(); });
  }
  function stuiter(x, y, x2, y2) {
    let geslagen = false;
    actie.innerHTML = `<button type="button" class="bpg-mep" style="--c:${KLEUR[1 - S.beurt]}">✋ ${esc(doel().naam)}: MEP 'M WEG!</button>`;
    actie.hidden = false;
    actie.querySelector("button").addEventListener("pointerdown", e => {
      e.preventDefault(); if (geslagen) return; geslagen = true; actie.hidden = true;
      /* kans dat je je eigen glas omstoot */
      if (Math.random() < .18 && doel().bekers.length > 1) {
        const om = doel().bekers[Math.floor(Math.random() * doel().bekers.length)];
        if (om.id !== S.open) { spatten.push({ x: om.x + 6, y: om.y + 2, r: 9 }); doel().bekers = doel().bekers.filter(b => b.id !== om.id);
          setTimeout(() => meld(`🫗 ${esc(doel().naam)} stoot bij het wegslaan een glas om. Pech, dat glas is weg!`, "lang"), 700); }
      }
    }, { once: true });
    vlieg({ x, y }, { x: x2, y: y2 }, 16, 650, () => {
      actie.hidden = true;
      if (geslagen) { bal = null; teken(); meld(`✋ Weggeslagen door ${esc(doel().naam)}!`); return setTimeout(gemist, 300); }
      land(x2, y2, true);
    });
  }
  function raak(k, naStuiter) {
    bal = null;
    try { navigator.vibrate?.(40); } catch {}
    bak(1 - S.beurt);
    if (S.open !== null && S.open === k.id) {
      /* BOM */
      const weg = [k, ...buren(doel().bekers, k)];
      doel().bekers = doel().bekers.filter(b => !weg.includes(b));
      S.open = null;
      meld(`💥 BOM! ${weg.length} ${weg.length === 1 ? "beker" : "bekers"} weg. Iemand van ${esc(doel().naam)} trekt een halve bak.`, "groot");
      return naRaak(naStuiter);
    }
    if (S.open !== null) haalWeg(S.open);
    S.open = k.id;
    meld(`🎯 Raak! Iemand van ${esc(doel().naam)} trekt een halve bak. Gooi nog een keer${naStuiter ? "" : ""}.`, naStuiter ? "lang" : "");
    naRaak(naStuiter);
  }
  function naRaak(naStuiter) {
    S.trick = false;
    if (!doel().bekers.length) return allesWeg();
    if (naStuiter && doel().bekers.length > (S.open !== null ? 1 : 0)) {
      S.stuiterKeuze = true; S.fase = "gooien"; werkBord(); teken();
      meld("Raak na een stuiter! Tik op een beker die ook weg moet.", "lang");
      return;
    }
    S.fase = "gooien"; werkBord(); teken();
  }
  function kiesBeker(e) {
    const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    let beste = null, bd = 1e9;
    doel().bekers.forEach(k => { if (k.id === S.open) return; const p = P(k.x, k.y); const d = Math.hypot(p.x - mx, p.y + BEKER_R * p.s - my); if (d < bd) { bd = d; beste = k; } });
    if (!beste || bd > 40) return;
    doel().bekers = doel().bekers.filter(b => b.id !== beste.id); S.stuiterKeuze = false;
    meld("Beker weggehaald. Gooi je extra worp.");
    if (!doel().bekers.length) return allesWeg();
    werkBord(); teken();
  }
  function haalWeg(id) { doel().bekers = doel().bekers.filter(b => b.id !== id); }
  function gemist() {
    if (S.open !== null) { haalWeg(S.open); S.open = null; meld("Mis: de geraakte beker gaat weg."); if (!doel().bekers.length) return allesWeg(); }
    if (S.trick) { S.trick = false; return verder(); }
    S.worpen--;
    /* rebound */
    if (Math.random() < .3) {
      let gepakt = false;
      actie.innerHTML = `<button type="button" class="bpg-mep vang" style="--c:${KLEUR[S.beurt]}">🤲 Pak 'm voor de grond!</button>`;
      actie.hidden = false;
      actie.querySelector("button").addEventListener("pointerdown", e => { e.preventDefault(); gepakt = true; actie.hidden = true; S.trick = true; meld("Gevangen! Je mag een trickshot doen."); verder(); }, { once: true });
      return setTimeout(() => { if (!gepakt) { actie.hidden = true; verder(); } }, 1100);
    }
    verder();
  }
  function verder() {
    if (S.fase === "klaar") return;
    if (S.trick || S.worpen > 0 || S.open !== null) { S.fase = "gooien"; werkBord(); teken(); return; }
    volgendeBeurt(900);
  }
  function volgendeBeurt(ms) {
    S.fase = "wacht"; werkBord(); teken();
    setTimeout(() => {
      if (S.gelijkmaker) return einde(1 - S.beurt, `${esc(gooier().naam)} kreeg nog een gelijkmakende beurt, maar maakte het niet af.`);
      S.beurt = 1 - S.beurt; doorgeven();
    }, ms);
  }
  function allesWeg() {
    S.open = null; werkBord(); teken();
    if (S.gelijkmaker) return setTimeout(gelijkspel, 900);
    if (S.beurt === S.begon) {
      meld(`Alle bekers weg! Maar ${esc(doel().naam)} krijgt nog een gelijkmakende beurt.`, "lang");
      S.gelijkmaker = true; S.fase = "wacht";
      return setTimeout(() => { S.beurt = 1 - S.beurt; doorgeven(); }, 1800);
    }
    setTimeout(() => einde(S.beurt, "Alle bekers van de tegenstander zijn weg."), 900);
  }

  /* ---------- Knoppen ---------- */
  box.addEventListener("click", e => {
    const v = e.target.closest("[data-vorm]");
    if (v && S) { doel().bekers = hervorm(doel().bekers, v.dataset.vorm); gooier().hervormd = true; laag.hidden = true; S.fase = "gooien"; meld("Bekers hervormd."); werkBord(); teken(); return; }
    const b = e.target.closest("[data-bpg]"); if (!b) return;
    const a = b.dataset.bpg;
    if (a === "sps") return sps();
    if (a === "klaar") { laag.hidden = true; S.fase = "gooien"; werkBord(); teken(); return; }
    if (a === "hervorm") return kiesVorm();
    if (a === "terug") { laag.hidden = true; return; }
    if (a === "stop") { if (b.dataset.zeker) return startScherm(); b.dataset.zeker = "1"; b.textContent = "Zeker? Tik nog eens"; setTimeout(() => { if (b.isConnected) { delete b.dataset.zeker; b.textContent = "Potje stoppen"; } }, 2500); return; }
    if (a === "opnieuw") return startScherm();
  });

  addEventListener("resize", () => { if (box.offsetParent) maat(); });
  new ResizeObserver(() => { if (box.offsetParent) maat(); }).observe(cv);
  startScherm();
})();
