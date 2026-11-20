/* Seizoenskameel: hoedje of zonnebril op het logo
   - week van St. Patrick's Day (17 maart): groene hoge hoed
   - week van Sinterklaas (5 december): mijter
   - week van kerst (25 december): kerstmuts
   - juli en augustus: zonnebril
   Proef: ?seizoen=patrick | sint | kerst | zomer (uit: ?seizoen=uit)
   Jarig gaat voor: dan krijgt de kameel de feestmuts. */
const SEIZOEN_SVG = {
  patrick: `<g transform="translate(0 8) rotate(-8 392 14)">
      <ellipse cx="392" cy="14" rx="58" ry="12" fill="#1f8f45" stroke="#0f3a1f" stroke-width="5"/>
      <path d="M358 12 L352 -66 Q392 -76 432 -66 L426 12 Z" fill="#23a04f" stroke="#0f3a1f" stroke-width="5" stroke-linejoin="round"/>
      <path d="M357 -6 L427 -6 L426 8 L358 8 Z" fill="#1b1b1b"/>
      <rect x="380" y="-10" width="24" height="22" rx="3" fill="none" stroke="#f2c230" stroke-width="5"/>
      <g fill="#7fe08a" transform="translate(372 -38)"><circle cx="0" cy="-7" r="6"/><circle cx="-7" cy="1" r="6"/><circle cx="7" cy="1" r="6"/><rect x="-1.5" y="2" width="3" height="11" rx="1.5" fill="#0f3a1f"/></g>
    </g>`,
  kerst: `<g transform="translate(-4 12) rotate(10 392 12)">
      <path d="M346 10 C350 -42 330 -78 286 -62 C318 -58 342 -40 350 -20 C362 -54 412 -60 438 10 Z" fill="#d7263d" stroke="#6e1020" stroke-width="5" stroke-linejoin="round"/>
      <rect x="338" y="-4" width="108" height="26" rx="13" fill="#fff" stroke="#c9d3db" stroke-width="3"/>
      <circle cx="284" cy="-62" r="16" fill="#fff" stroke="#c9d3db" stroke-width="3"/>
    </g>`,
  sint: `<g transform="translate(0 8) rotate(-6 392 14)">
      <path d="M352 14 L352 -40 Q358 -70 392 -96 Q426 -70 432 -40 L432 14 Z" fill="#c8102e" stroke="#5c0614" stroke-width="5" stroke-linejoin="round"/>
      <path d="M352 -2 L432 -2 L432 14 L352 14 Z" fill="#f2c230" stroke="#8a6a08" stroke-width="3"/>
      <rect x="386" y="-80" width="12" height="78" fill="#f2c230"/>
      <path d="M382 -52 h20 M392 -62 v22" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
      <path d="M382 -52 h20 M392 -62 v22" stroke="#f2c230" stroke-width="3" stroke-linecap="round"/>
    </g>`,
  zomer: `<g transform="translate(-6 -4) scale(1.08)" transform-origin="420 46">
      <path d="M352 40 L398 44" stroke="#111" stroke-width="7" stroke-linecap="round"/>
      <path d="M394 34 Q394 30 400 30 L438 32 Q446 33 444 40 L440 54 Q437 62 428 61 L406 59 Q396 58 395 49 Z" fill="#141414" stroke="#000" stroke-width="3"/>
      <path d="M404 37 L420 38" stroke="#7fb8ff" stroke-width="4" stroke-linecap="round" opacity=".8"/>
      <path d="M442 38 L460 44" stroke="#111" stroke-width="6" stroke-linecap="round"/>
    </g>`
};

function seizoenVan(d = new Date()){
  const dag = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const inWeekVan = (m, dd) => {
    const f = new Date(dag.getFullYear(), m, dd);
    const ma = new Date(f); ma.setDate(f.getDate() - ((f.getDay() + 6) % 7));
    const zo = new Date(ma); zo.setDate(ma.getDate() + 6);
    return dag >= ma && dag <= zo;
  };
  if (inWeekVan(2, 17)) return "patrick";
  if (inWeekVan(11, 5)) return "sint";
  if (inWeekVan(11, 25)) return "kerst";
  if (dag.getMonth() === 6 || dag.getMonth() === 7) return "zomer";
  return null;
}

(() => {
  let s = null;
  try {
    const q = new URLSearchParams(location.search).get("seizoen");
    if (q && SEIZOEN_SVG[q]) sessionStorage.setItem("kamelen-seizoen-proef", q);
    if (q === "uit") sessionStorage.removeItem("kamelen-seizoen-proef");
    s = sessionStorage.getItem("kamelen-seizoen-proef") || seizoenVan();
  } catch { s = seizoenVan(); }
  if (!s || !SEIZOEN_SVG[s]) return;
  document.body.classList.add("seizoen-" + s);
  const logo = document.querySelector(".hero .wrap > img");
  if (!logo) return;
  const box = document.createElement("span"); box.className = "dp-logo-box";
  logo.replaceWith(box); box.appendChild(logo);
  box.insertAdjacentHTML("beforeend", `<svg class="dp-seizoen" viewBox="0 0 520 404" aria-hidden="true">${SEIZOEN_SVG[s]}</svg>`);
})();
