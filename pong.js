/* =========================================================
   Pong teams: iedereen legt een vinger op het scherm,
   na 3 seconden stilte verdeelt de app ze in 2 teams.
   Team 1 = lichtblauw, team 2 = oranje. Maximaal 8 vingers.
   ========================================================= */
(function () {
  const open = document.getElementById("pong-open");
  const veld = document.getElementById("pong-veld");
  if (!open || !veld) return;

  const MAX = 8, WACHT = 3000;
  const KLEUR = { 1: "#b9d8e8", 2: "#f08c1c" };
  const vingers = new Map();          // pointerId -> { x, y, el, team }
  let fase = "wachten";               // wachten | aftellen | klaar
  let modus = "vingers";              // vingers | tikken
  const balk = veld.querySelector(".pong-balk"), knopVerdeel = veld.querySelector("[data-pong=verdeel]");
  let volgnr = 0;
  let timer = null;
  const tekst = veld.querySelector(".pong-tekst");
  const sluit = veld.querySelector(".pong-sluit");

  function zetTekst(t) { tekst.textContent = t; }
  function stand() {
    if (fase === "klaar") return;
    const n = vingers.size;
    if (modus === "tikken") {
      zetTekst(n === 0 ? "Tik om de beurt één keer op het scherm" : n < 2 ? "Volgende speler: tik op het scherm" : n >= MAX ? `${n} spelers · tik op Verdeel` : `${n} spelers · volgende, of tik op Verdeel`);
      knopVerdeel.disabled = n < 2;
      return;
    }
    zetTekst(n === 0 ? "Leg allemaal één vinger op het scherm" :
             n === 1 ? "Nog minstens één vinger…" :
             `${n} spelers · niet bewegen…`);
  }

  function bol(x, y) {
    const el = document.createElement("div");
    el.className = "pong-bol";
    el.innerHTML = `<svg viewBox="0 0 120 120" aria-hidden="true"><circle class="ring" cx="60" cy="60" r="54"/></svg><span class="pong-label"></span>`;
    el.style.transform = `translate(${x - 60}px, ${y - 60}px)`;
    veld.appendChild(el);
    return el;
  }

  function herstart() {
    clearTimeout(timer);
    if (fase === "klaar") return;
    vingers.forEach(v => v.el.classList.remove("telt"));
    if (vingers.size >= 2) {
      fase = "aftellen";
      void veld.offsetWidth;                       // animatie opnieuw starten
      vingers.forEach(v => v.el.classList.add("telt"));
      timer = setTimeout(verdeel, WACHT);
    } else fase = "wachten";
    stand();
  }

  function verdeel() {
    const ids = [...vingers.keys()];
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    const helft = Math.ceil(ids.length / 2);
    // bij een oneven aantal krijgt een willekeurig team de extra speler
    const eersteGroot = Math.random() < 0.5;
    ids.forEach((id, i) => {
      const inEerste = eersteGroot ? i < helft : i < ids.length - helft;
      const v = vingers.get(id); v.team = inEerste ? 1 : 2;
      v.el.classList.remove("telt"); v.el.classList.add("team", `t${v.team}`);
      v.el.style.setProperty("--kleur", KLEUR[v.team]);
      v.el.querySelector(".pong-label").textContent = `Team ${v.team}`;
    });
    fase = "klaar";
    const t1 = ids.filter(id => vingers.get(id).team === 1).length;
    zetTekst(`Team 1: ${t1} · Team 2: ${ids.length - t1}`);
    try { navigator.vibrate?.([60, 40, 60]); } catch {}
    if (modus === "tikken") { knopVerdeel.textContent = "Opnieuw"; knopVerdeel.disabled = false; }
  }

  function reset() {
    clearTimeout(timer);
    vingers.forEach(v => v.el.remove());
    vingers.clear(); volgnr = 0;
    fase = "wachten"; stand();
  }

  /* ---------- Aanraken ---------- */
  veld.addEventListener("pointerdown", e => {
    if (e.target.closest(".pong-sluit, .pong-balk")) return;
    e.preventDefault();
    if (modus === "tikken") {
      if (fase === "klaar") return;
      // tik op een bestaand bolletje = weghalen (verkeerd getikt)
      for (const [id, v] of vingers) if (Math.hypot(v.x - e.clientX, v.y - e.clientY) < 50) { v.el.remove(); vingers.delete(id); return stand(); }
      if (vingers.size >= MAX) return;
      const id = "t" + (++volgnr), el = bol(e.clientX, e.clientY);
      el.classList.add("vast"); el.querySelector(".pong-label").textContent = String(vingers.size + 1);
      vingers.set(id, { x: e.clientX, y: e.clientY, el, team: 0 });
      try { navigator.vibrate?.(20); } catch {}
      return stand();
    }
    if (fase === "klaar" || vingers.size >= MAX) return;
    veld.setPointerCapture?.(e.pointerId);
    vingers.set(e.pointerId, { x: e.clientX, y: e.clientY, el: bol(e.clientX, e.clientY), team: 0 });
    herstart();
  });
  veld.addEventListener("pointermove", e => {
    if (modus === "tikken") return;
    const v = vingers.get(e.pointerId); if (!v) return;
    v.x = e.clientX; v.y = e.clientY;
    v.el.style.transform = `translate(${v.x - 60}px, ${v.y - 60}px)`;
  });
  function los(e) {
    if (modus === "tikken") return;
    const v = vingers.get(e.pointerId); if (!v) return;
    if (fase === "klaar") {
      // uitslag blijft staan; als iedereen heeft losgelaten, begint het opnieuw
      v.el.classList.add("los");
      v.losgelaten = true;
      if ([...vingers.values()].every(x => x.losgelaten)) setTimeout(reset, 1800);
      return;
    }
    v.el.remove(); vingers.delete(e.pointerId);
    herstart();
  }
  veld.addEventListener("pointerup", los);
  veld.addEventListener("pointercancel", los);
  veld.addEventListener("contextmenu", e => e.preventDefault());

  /* ---------- Openen en sluiten ---------- */
  knopVerdeel.addEventListener("click", () => {
    if (fase === "klaar") { knopVerdeel.textContent = "Verdeel"; return reset(); }
    if (vingers.size >= 2) verdeel();
  });
  document.getElementById("pong-open-tik")?.addEventListener("click", () => start("tikken"));
  function start(m) {
    modus = m; balk.hidden = m !== "tikken"; knopVerdeel.textContent = "Verdeel";
    veld.hidden = false; document.body.classList.add("pong-actief"); reset();
    try { veld.requestFullscreen?.().catch(() => {}); } catch {}
  }
  open.addEventListener("click", () => {
    modus = "vingers"; balk.hidden = true;
    veld.hidden = false; document.body.classList.add("pong-actief"); reset();
    try { veld.requestFullscreen?.().catch(() => {}); } catch {}
  });
  sluit.addEventListener("click", () => {
    reset(); veld.hidden = true; document.body.classList.remove("pong-actief");
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch {}
  });
})();
