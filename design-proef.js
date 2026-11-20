/* =========================================================
   Design-extra's voor iedereen
   - glazen kaarten op home met de woestijnfoto erachter
   - kop die meeschuift bij scrollen + compacte balk bovenin
   - kameeltje in de tabbalk dat naar het actieve tabje loopt
   - zandvlaag bij het wisselen van tabje
   - lege schermen met humor
   - jarige-modus: feestmuts op het logo en confetti
   ========================================================= */
(function () {
  document.body.classList.add("design-proef");
  const rustig = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 2. Kop die meeschuift + compacte balk ---------- */
  const mini = document.createElement("div");
  mini.className = "dp-mini"; mini.setAttribute("aria-hidden", "true");
  mini.innerHTML = `<img src="logo.png" alt=""><b>Kamelen</b><span class="dp-mini-ik"></span>`;
  document.body.appendChild(mini);
  mini.addEventListener("click", () => window.scrollTo({ top: 0, behavior: rustig ? "auto" : "smooth" }));
  let tik = false;
  const opScroll = () => {
    tik = false;
    const y = window.scrollY, hero = document.querySelector(".hero"), foto = document.querySelector(".hero .hero-foto");
    const h = hero ? hero.offsetHeight : 200;
    if (foto && !rustig && document.body.dataset.page === "home") {
      const t = Math.min(y, h);
      foto.style.transform = `translate3d(0,${Math.round(t * .4)}px,0)`;
    }
    mini.classList.toggle("zicht", y > h - 50);
  };
  addEventListener("scroll", () => { if (!tik) { tik = true; requestAnimationFrame(opScroll); } }, { passive: true });
  const ikMini = () => { const c = document.getElementById("ik-chip"), d = mini.querySelector(".dp-mini-ik"); if (c && d) d.innerHTML = c.querySelector(".avatar")?.outerHTML || ""; };
  setTimeout(ikMini, 1500); setTimeout(ikMini, 5000);

  /* ---------- 3. Kameeltje in de tabbalk ---------- */
  const tabbar = document.querySelector(".tabbar");
  const kameel = document.createElement("span");
  kameel.className = "dp-tabkameel"; kameel.setAttribute("aria-hidden", "true"); kameel.innerHTML = `<img src="logo.png" alt="">`;
  tabbar?.appendChild(kameel);
  let vorigeX = null;
  const loop = () => {
    if (!tabbar) return;
    const actief = tabbar.querySelector('[aria-current="page"]') || tabbar.querySelector('button[aria-expanded="true"]');
    /* Alleen tonen als er onder de tabjes ruimte is (iPhone met thuisbalk), zodat hij nergens overheen loopt */
    const ruimte = parseFloat(getComputedStyle(tabbar).paddingBottom) || 0;
    if (!actief || ruimte < 22) { kameel.style.opacity = 0; return; }
    const tb = tabbar.getBoundingClientRect(), r = actief.getBoundingClientRect();
    const x = r.left - tb.left + r.width / 2 - 11;
    kameel.style.opacity = 1;
    if (vorigeX !== null && Math.abs(x - vorigeX) > 2 && !rustig) {
      kameel.classList.toggle("links", x < vorigeX);
      kameel.classList.remove("loopt"); void kameel.offsetWidth; kameel.classList.add("loopt");
      setTimeout(() => kameel.classList.remove("loopt"), 650);
    }
    kameel.style.transform = `translateX(${x}px)`;
    vorigeX = x;
  };
  addEventListener("resize", () => { vorigeX = null; loop(); });

  /* ---------- 4. Zandvlaag bij het wisselen van tabje ---------- */
  const zand = document.createElement("div");
  zand.className = "dp-zand"; zand.setAttribute("aria-hidden", "true");
  document.body.appendChild(zand);
  let vorigePagina = null;
  const wissel = () => {
    const p = document.body.dataset.page;
    if (vorigePagina && p !== vorigePagina && !rustig) { zand.classList.remove("waai"); void zand.offsetWidth; zand.classList.add("waai"); }
    vorigePagina = p;
    setTimeout(loop, 30);
    setTimeout(opScroll, 50);
    if (p !== "home") { const f = document.querySelector(".hero .hero-foto"); if (f) f.style.transform = ""; }
  };
  addEventListener("hashchange", () => setTimeout(wissel, 0));
  setTimeout(wissel, 300);

  /* ---------- 5. Lege schermen met humor ---------- */
  const GRAPPEN = [
    "Hier is het stiller dan in de Sahara.",
    "Zelfs een kameel vindt hier niks te drinken.",
    "De karavaan is hier nog niet langs geweest.",
    "Niks te zien. De kamelen houden even pauze.",
    "Leeg. Net als de bidon na de tweede helft.",
    "Hier ligt alleen zand. Kom later nog eens kijken.",
    "Een oase is dit nog niet, maar dat komt goed."
  ];
  const leeg = () => {
    document.querySelectorAll(".empty:not([data-grap])").forEach(e => {
      const t = e.textContent.trim();
      if (!t || /laden|bezig/i.test(t) || e.offsetHeight > 400) return;
      e.dataset.grap = "1";
      const g = GRAPPEN[Math.floor(Math.random() * GRAPPEN.length)];
      e.insertAdjacentHTML("afterbegin", `<span class="dp-leeg-kameel" aria-hidden="true"><img src="logo.png" alt=""></span>`);
      e.insertAdjacentHTML("beforeend", `<span class="dp-leeg-grap">${g}</span>`);
    });
  };
  let lw = null;
  new MutationObserver(() => { if (!lw) lw = setTimeout(() => { lw = null; leeg(); }, 200); }).observe(document.body, { childList: true, subtree: true });

  /* ---------- 6. Jarige-modus ---------- */
  const jarigVandaag = () => {
    try { return [...INFO.entries()].filter(([, i]) => i.verjaardag && dagenTot(i.verjaardag) === 0).map(([n]) => n); } catch { return []; }
  };
  let jarigKlaar = false;
  const jarig = () => {
    if (jarigKlaar) return;
    const wie = jarigVandaag(); if (!wie.length) return;
    jarigKlaar = true;
    document.body.classList.add("dp-jarig");
    const logo = document.querySelector(".hero .wrap > img");
    if (logo && !document.querySelector(".dp-muts")) {
      const box = document.createElement("span"); box.className = "dp-logo-box";
      logo.replaceWith(box); box.appendChild(logo);
      box.insertAdjacentHTML("beforeend", `<svg class="dp-muts" viewBox="0 0 40 52" aria-hidden="true"><defs><clipPath id="dpm"><path d="M20 4 L36 46 Q20 52 4 46 Z"/></clipPath></defs><path d="M20 4 L36 46 Q20 52 4 46 Z" fill="#e8384f"/><g clip-path="url(#dpm)" fill="#ffd400"><rect x="-10" y="14" width="60" height="5" transform="rotate(-18 20 16)"/><rect x="-10" y="28" width="60" height="5" transform="rotate(-18 20 30)"/><rect x="-10" y="42" width="60" height="5" transform="rotate(-18 20 44)"/></g><circle cx="20" cy="5" r="5" fill="#fff"/></svg>`);
    }
    const lig = document.querySelector(".hero .league");
    if (lig && !document.querySelector(".dp-jarig-pil")) lig.insertAdjacentHTML("afterend", `<div class="dp-jarig-pil">🎉 Vandaag jarig: <b>${wie.map(n => String(n).replace(/[<>&"]/g, "")).join(" & ")}</b></div>`);
    const sleutel = "kamelen-jarig-confetti-" + new Date().toDateString();
    try { if (!localStorage.getItem(sleutel) && !rustig && typeof schietConfetti === "function") { localStorage.setItem(sleutel, "1"); setTimeout(schietConfetti, 600); } } catch {}
  };
  let pogingen = 0;
  const wacht = setInterval(() => { jarig(); if (jarigKlaar || ++pogingen > 30) clearInterval(wacht); }, 500);
})();
