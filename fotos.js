/* =========================================================
   Foto's: iedereen kan foto's toevoegen; ze komen in de Drive-map van de beheerder.
   De site verkleint foto's eerst (max. 1600 px, JPEG) zodat uploaden snel gaat.
   Gebruikt uit index.html: esc, ROSTER, kamelenApi, TOTO_CONFIG
   ========================================================= */
(function () {
  const box = document.getElementById("fotos"); if (!box) return;
  const CFG = window.TOTO_CONFIG || {};
  const LS = "kamelen-toto", BLS = "kamelen-beheer";
  const eigen = () => { try { return JSON.parse(localStorage.getItem(LS) || "{}"); } catch { return {}; } };
  const bewaar = o => { try { localStorage.setItem(LS, JSON.stringify(o)); } catch {} };
  const beheercode = () => { try { return localStorage.getItem(BLS) || ""; } catch { return ""; } };
  const url = (id, w) => `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${w}`;
  const datum = t => { const d = new Date(t); return isNaN(d) ? "" : d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }); };
  let FOTOS = [];

  function namenOpties(gekozen) {
    const namen = typeof ROSTER !== "undefined" ? [...ROSTER] : [];
    return `<option value="">Kies je naam</option>${namen.map(n => `<option${n === gekozen ? " selected" : ""}>${esc(n)}</option>`).join("")}`;
  }

  function render() {
    const e = eigen();
    const beheer = !!beheercode();
    box.innerHTML = `
      <form class="card foto-form" id="foto-form">
        <h2 class="sub-h">Foto's toevoegen</h2>
        <div class="foto-velden">
          <label class="tt-f"><span>Jouw naam</span><select id="foto-door" required>${namenOpties(e.naam)}</select></label>
          <label class="tt-f"><span>Bijschrift (mag leeg)</span><input id="foto-tekst" type="text" maxlength="200" placeholder="Bijvoorbeeld: derde helft na Daring"></label>
        </div>
        <label class="foto-kies"><input id="foto-bestand" type="file" accept="image/*" multiple hidden><span class="btn">Kies foto's</span><span class="foto-gekozen" id="foto-gekozen">Nog niets gekozen</span></label>
        <div class="foto-acties"><button class="btn" type="submit" id="foto-knop" disabled>Uploaden</button><span class="tt-status" id="foto-status" role="status"></span></div>
      </form>
      ${FOTOS.length ? `<div class="foto-grid">${FOTOS.map((f, i) => `
        <figure class="foto"><button type="button" class="foto-open" data-i="${i}" aria-label="Foto openen${f.bijschrift ? `: ${esc(f.bijschrift)}` : ""}"><img src="${url(f.id, 700)}" alt="${esc(f.bijschrift || "Foto van de Kamelen")}" loading="lazy" referrerpolicy="no-referrer"></button>
          ${f.bijschrift || f.door ? `<figcaption>${f.bijschrift ? esc(f.bijschrift) : ""}<small>${f.door ? `${esc(f.door)}, ` : ""}${datum(f.tijd)}</small></figcaption>` : ""}
          ${beheer ? `<button type="button" class="foto-weg" data-weg="${esc(f.id)}">Verwijderen</button>` : ""}
        </figure>`).join("")}</div>` : `<div class="card empty">Nog geen foto's. Voeg de eerste toe!</div>`}`;

    const input = document.getElementById("foto-bestand");
    input.addEventListener("change", () => {
      const n = input.files.length;
      document.getElementById("foto-gekozen").textContent = n ? `${n} ${n === 1 ? "foto" : "foto's"} gekozen` : "Nog niets gekozen";
      document.getElementById("foto-knop").disabled = !n;
    });
    document.getElementById("foto-form").addEventListener("submit", upload);
  }

  /* Verklein naar max. 1600 px en geef base64-JPEG terug */
  function verklein(file) {
    return new Promise((ok, fout) => {
      const img = new Image(), u = URL.createObjectURL(file);
      img.onload = () => {
        const max = 1600, s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(u);
        ok(c.toDataURL("image/jpeg", .82).split(",")[1]);
      };
      img.onerror = () => { URL.revokeObjectURL(u); fout(new Error("geen foto")); };
      img.src = u;
    });
  }

  async function upload(ev) {
    ev.preventDefault();
    const door = document.getElementById("foto-door").value, st = document.getElementById("foto-status");
    const bijschrift = document.getElementById("foto-tekst").value.trim();
    const files = [...document.getElementById("foto-bestand").files];
    if (!door) { st.textContent = "Kies eerst je naam."; return; }
    const knop = document.getElementById("foto-knop"); knop.disabled = true;
    const e = eigen(); e.naam = door; bewaar(e);
    let gelukt = 0;
    for (const [i, f] of files.entries()) {
      st.textContent = `Foto ${i + 1} van ${files.length} uploaden…`;
      try {
        const data = await verklein(f);
        const r = await fetch(CFG.api, { method: "POST", body: JSON.stringify({ type: "foto", code: CFG.teamcode, door, bijschrift, data }) }).then(r => r.json());
        if (r.ok) gelukt++; else throw new Error(r.fout);
      } catch (err) { st.textContent = `Foto ${i + 1} lukte niet. ${/Drive|toestemming|permission/i.test(String(err)) ? "Het script heeft nog geen toegang tot Drive." : "Probeer het opnieuw."}`; }
    }
    if (gelukt) { await laad(true); document.getElementById("foto-status").textContent = `${gelukt} ${gelukt === 1 ? "foto" : "foto's"} toegevoegd.`; }
    else knop.disabled = false;
  }

  /* Grote weergave met vorige/volgende en vegen */
  function open(i) {
    let k = i;
    const dlg = document.createElement("dialog"); dlg.className = "lightbox";
    const toon = () => {
      const f = FOTOS[k];
      dlg.innerHTML = `<button type="button" class="lb-sluit" aria-label="Sluiten">✕</button>
        <img src="${url(f.id, 1600)}" alt="${esc(f.bijschrift || "Foto")}" referrerpolicy="no-referrer">
        <div class="lb-tekst">${f.bijschrift ? `<b>${esc(f.bijschrift)}</b>` : ""}<span>${f.door ? `${esc(f.door)}, ` : ""}${datum(f.tijd)} · ${k + 1} van ${FOTOS.length}</span></div>
        ${FOTOS.length > 1 ? `<button type="button" class="lb-pijl vorige" aria-label="Vorige">‹</button><button type="button" class="lb-pijl volgende" aria-label="Volgende">›</button>` : ""}`;
    };
    const stap = d => { k = (k + d + FOTOS.length) % FOTOS.length; toon(); };
    dlg.addEventListener("click", e => {
      if (e.target.closest(".lb-sluit") || e.target === dlg) dlg.close();
      else if (e.target.closest(".vorige")) stap(-1);
      else if (e.target.closest(".volgende")) stap(1);
    });
    dlg.addEventListener("keydown", e => { if (e.key === "ArrowLeft") stap(-1); if (e.key === "ArrowRight") stap(1); });
    let x0 = null;
    dlg.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
    dlg.addEventListener("touchend", e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) stap(dx < 0 ? 1 : -1); x0 = null; });
    dlg.addEventListener("close", () => dlg.remove());
    toon(); document.body.appendChild(dlg); dlg.showModal();
  }

  box.addEventListener("click", async e => {
    const o = e.target.closest(".foto-open"); if (o) return open(Number(o.dataset.i));
    const w = e.target.closest("[data-weg]"); if (!w) return;
    if (w.dataset.zeker !== "1") { w.dataset.zeker = "1"; w.textContent = "Zeker weten?"; return; }
    w.disabled = true;
    await fetch(CFG.api, { method: "POST", body: JSON.stringify({ type: "beheer", actie: "verwijder-foto", beheercode: beheercode(), id: w.dataset.weg }) }).catch(() => {});
    laad(true);
  });

  async function laad(vers) {
    const api = await window.kamelenApi(vers);
    FOTOS = (api.fotos || []).slice().sort((a, b) => new Date(b.tijd) - new Date(a.tijd));
    render();
  }
  window.renderFotos = () => laad(false);
})();
