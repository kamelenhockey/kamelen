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
  const url = (id, w) => `https://lh3.googleusercontent.com/d/${encodeURIComponent(id)}=w${w}`;
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
        <h2 class="sub-h">Foto's en video's toevoegen</h2>
        <div class="foto-velden">
          <div class="tt-f"><span>Jouw naam</span><div class="tt-ik">${esc((window.IK || {}).naam || "")}</div><input type="hidden" id="foto-door" value="${esc((window.IK || {}).naam || "")}"></div>
          <label class="tt-f"><span>Bijschrift (mag leeg)</span><input id="foto-tekst" type="text" maxlength="200" placeholder="Bijvoorbeeld: derde helft na Daring"></label>
        </div>
        <label class="foto-kies"><input id="foto-bestand" type="file" accept="image/*,video/*" multiple hidden><span class="btn">Kies foto's of video's</span><span class="foto-gekozen" id="foto-gekozen">Nog niets gekozen</span></label>
        <div class="foto-acties"><button class="btn" type="submit" id="foto-knop" disabled>Uploaden</button><span class="tt-status" id="foto-status" role="status"></span></div>
      </form>
      ${FOTOS.length ? `<div class="foto-grid">${FOTOS.map((f, i) => `
        <figure class="foto${f.soort === "video" ? " is-video" : ""}"><button type="button" class="foto-open" data-i="${i}" aria-label="${f.soort === "video" ? "Video afspelen" : "Foto openen"}${f.bijschrift ? `: ${esc(f.bijschrift)}` : ""}"><img src="${url(f.id, 700)}" alt="${esc(f.bijschrift || (f.soort === "video" ? "Video van de Kamelen" : "Foto van de Kamelen"))}" loading="lazy" referrerpolicy="no-referrer"${f.soort === "video" ? ` onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'video-leeg',textContent:'Video wordt nog verwerkt'}))"` : ""}>${f.soort === "video" ? `<span class="video-play" aria-hidden="true">▶</span>` : ""}</button>
          ${f.bijschrift || f.door ? `<figcaption>${f.bijschrift ? esc(f.bijschrift) : ""}<small>${f.door ? `${esc(f.door)}, ` : ""}${datum(f.tijd)}${reactiesVan(f.id).length ? ` · 💬 ${reactiesVan(f.id).length}` : ""}</small></figcaption>` : ""}
          ${beheer ? `<button type="button" class="foto-weg" data-weg="${esc(f.id)}">Verwijderen</button>` : ""}
        </figure>`).join("")}</div>` : `<div class="card empty">Nog geen foto's. Voeg de eerste toe!</div>`}`;

    const input = document.getElementById("foto-bestand");
    input.addEventListener("change", () => {
      const n = input.files.length;
      const v = [...input.files].filter(isVideo).length, f = n - v;
      document.getElementById("foto-gekozen").textContent = n ? [f ? `${f} ${f === 1 ? "foto" : "foto's"}` : "", v ? `${v} ${v === 1 ? "video" : "video's"}` : ""].filter(Boolean).join(" en ") + " gekozen" : "Nog niets gekozen";
      document.getElementById("foto-knop").disabled = !n;
    });
    document.getElementById("foto-form").addEventListener("submit", upload);
  }

  const isVideo = f => /^video\//.test(f.type) || /\.(mov|mp4|m4v|webm|3gp)$/i.test(f.name || "");
  /* Video: het script opent een upload-sessie in Drive, de telefoon stuurt het bestand daar rechtstreeks heen */
  async function uploadVideo(f, bijschrift, door, voortgang) {
    const mime = /^video\//.test(f.type) ? f.type : /\.mov$/i.test(f.name) ? "video/quicktime" : "video/mp4";
    const s = await fetch(CFG.api, { method: "POST", body: JSON.stringify({ type: "video-start", code: CFG.teamcode, naam: f.name, mime, grootte: f.size }) }).then(r => r.json());
    if (!s.ok) throw new Error(s.fout || "start mislukt");
    const id = await new Promise((ok, fout) => {
      const x = new XMLHttpRequest();
      x.open("PUT", s.url);
      x.setRequestHeader("Content-Type", mime);
      x.upload.onprogress = e => { if (e.lengthComputable) voortgang(Math.round(e.loaded / e.total * 100)); };
      x.onload = () => { try { const j = JSON.parse(x.responseText); if (x.status < 300 && j.id) ok(j.id); else fout(new Error("Drive " + x.status)); } catch { fout(new Error("Drive " + x.status)); } };
      x.onerror = () => fout(new Error("verbinding verbroken"));
      x.send(f);
    });
    const k = await fetch(CFG.api, { method: "POST", body: JSON.stringify({ type: "video-klaar", code: CFG.teamcode, id, bijschrift, door }) }).then(r => r.json());
    if (!k.ok) throw new Error(k.fout || "opslaan mislukt");
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
      const wat = isVideo(f) ? "Video" : "Foto";
      st.textContent = `${wat} ${i + 1} van ${files.length} uploaden…`;
      try {
        if (isVideo(f)) {
          await uploadVideo(f, bijschrift, door, pct => { st.textContent = `Video ${i + 1} van ${files.length} uploaden… ${pct}%`; });
          gelukt++; continue;
        }
        const data = await verklein(f);
        const r = await fetch(CFG.api, { method: "POST", body: JSON.stringify({ type: "foto", code: CFG.teamcode, door, bijschrift, data }) }).then(r => r.json());
        if (r.ok) gelukt++; else throw new Error(r.fout);
      } catch (err) { st.textContent = `${wat} ${i + 1} lukte niet. ${/DriveApp|rechten|permission/i.test(String(err)) ? "Het script heeft nog geen toegang tot Drive (stap 'machtigen')." : `(${String(err.message || err).slice(0, 120)})`}`; }
    }
    if (gelukt) { await laad(true); document.getElementById("foto-status").textContent = `${gelukt} ${gelukt === 1 ? "bestand" : "bestanden"} toegevoegd.${files.some(isVideo) ? " Een video kan een paar minuten nodig hebben voordat hij afspeelt." : ""}`; }
    else knop.disabled = false;
  }

  /* Grote weergave met vorige/volgende en vegen */
  let REACTIES = [];
  const reactiesVan = id => REACTIES.filter(r => r.foto === id).sort((a, b) => new Date(a.tijd) - new Date(b.tijd));
  const verversStil = () => window.kamelenApi(true).then(api => { if (api && api.reacties) REACTIES = api.reacties; render(); }).catch(() => {});
  function open(i) {
    let k = i, bewerk = false;
    const dlg = document.createElement("dialog"); dlg.className = "lightbox";
    const toon = () => {
      const f = FOTOS[k];
      dlg.innerHTML = `<button type="button" class="lb-sluit" aria-label="Sluiten">✕</button>
        ${f.soort === "video" ? `<iframe class="lb-video" src="https://drive.google.com/file/d/${encodeURIComponent(f.id)}/preview" allow="autoplay; fullscreen" allowfullscreen title="${esc(f.bijschrift || "Video")}"></iframe>` : `<img src="${url(f.id, 1600)}" alt="${esc(f.bijschrift || "Foto")}" referrerpolicy="no-referrer">`}
        <div class="lb-info">
          <div class="lb-tekst">${bewerk ? `<form class="lb-bewerk" data-bewerk="${esc(f.id)}"><input type="text" maxlength="200" value="${esc(f.bijschrift || "")}" placeholder="Bijschrift" aria-label="Bijschrift"><button type="submit">Opslaan</button><button type="button" data-lb="annuleer">Annuleren</button></form>`
            : f.bijschrift ? `<b>${esc(f.bijschrift)}</b>` : ""}<span>${f.door ? `${esc(f.door)}, ` : ""}${datum(f.tijd)} · ${k + 1} van ${FOTOS.length}${f.door && f.door === (window.IK || {}).naam && !bewerk ? ` · <button type="button" class="lb-link" data-lb="bewerk">✏️ ${f.bijschrift ? "bijschrift aanpassen" : "bijschrift toevoegen"}</button>` : ""}</span></div>
          <div class="lb-reacties">
            ${reactiesVan(f.id).map(r => `<div class="lb-reactie"><b>${esc(r.door)}</b> ${esc(r.tekst)}${r.door === (window.IK || {}).naam ? ` <button type="button" class="lb-link" data-rweg="${esc(r.id)}" aria-label="Reactie verwijderen">✕</button>` : beheercode() ? ` <button type="button" class="lb-link" data-rbweg="${esc(r.id)}" aria-label="Reactie verwijderen">✕</button>` : ""}</div>`).join("")}
            <form class="lb-nieuw" data-reageer="${esc(f.id)}"><input type="text" maxlength="400" placeholder="Reageer…" aria-label="Reactie"><button type="submit">Plaats</button></form>
          </div>
        </div>
        ${FOTOS.length > 1 ? `<button type="button" class="lb-pijl vorige" aria-label="Vorige">‹</button><button type="button" class="lb-pijl volgende" aria-label="Volgende">›</button>` : ""}`;
    };
    const stap = d => { bewerk = false; k = (k + d + FOTOS.length) % FOTOS.length; toon(); };
    const post = body => fetch(CFG.api, { method: "POST", body: JSON.stringify({ code: CFG.teamcode, ...body }) }).then(r => r.json()).catch(() => ({ ok: false }));
    dlg.addEventListener("submit", async e => {
      e.preventDefault();
      const f = FOTOS[k], inp = e.target.querySelector("input"), tekst = inp.value.trim();
      if (e.target.dataset.reageer) {
        if (!tekst) return;
        const tijdelijk = { id: "nieuw-" + Date.now(), foto: f.id, door: (window.IK || {}).naam, tekst, tijd: new Date().toISOString() };
        REACTIES.push(tijdelijk); toon(); dlg.querySelector(".lb-nieuw input")?.focus();
        const r = await post({ type: "reactie", foto: f.id, tekst });
        if (!r.ok) { REACTIES = REACTIES.filter(x => x !== tijdelijk); toon(); alert("Reageren lukte niet. Misschien moet het script nog bijgewerkt worden."); }
        else verversStil();
      }
      if (e.target.dataset.bewerk) {
        const oud = f.bijschrift; f.bijschrift = tekst; bewerk = false; toon(); render();
        const r = await post({ type: "bijschrift", id: f.id, tekst });
        if (!r.ok) { f.bijschrift = oud; toon(); render(); alert(r.fout === "niet van jou" ? "Alleen wie de foto uploadde kan het bijschrift aanpassen." : "Opslaan lukte niet. Misschien moet het script nog bijgewerkt worden."); }
      }
    });
    dlg.addEventListener("click", e => {
      if (e.target.closest(".lb-sluit") || e.target === dlg) dlg.close();
      else if (e.target.closest('[data-lb="bewerk"]')) { bewerk = true; toon(); dlg.querySelector(".lb-bewerk input")?.focus(); }
      else if (e.target.closest('[data-lb="annuleer"]')) { bewerk = false; toon(); }
      else if (e.target.closest("[data-rweg], [data-rbweg]")) {
        const b = e.target.closest("[data-rweg], [data-rbweg]"), id = b.dataset.rweg || b.dataset.rbweg;
        REACTIES = REACTIES.filter(x => x.id !== id); toon(); render();
        post(b.dataset.rweg ? { type: "reactie-weg", id } : { type: "beheer", actie: "verwijder-reactie", beheercode: beheercode(), id });
      }
      else if (e.target.closest(".vorige")) stap(-1);
      else if (e.target.closest(".volgende")) stap(1);
    });
    dlg.addEventListener("keydown", e => { if (e.target.matches("input")) return; if (e.key === "ArrowLeft") stap(-1); if (e.key === "ArrowRight") stap(1); });
    let x0 = null;
    dlg.addEventListener("touchstart", e => { x0 = e.target.closest("input, form, iframe") ? null : e.touches[0].clientX; }, { passive: true });
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
    if (!api || !("fotos" in api)) { box.innerHTML = `<div class="card empty">De foto's konden niet worden geladen. Tik op ↻ bovenin om het opnieuw te proberen.</div>`; return; }
    FOTOS = (api.fotos || []).slice().sort((a, b) => new Date(b.tijd) - new Date(a.tijd));
    DATA.fotos = FOTOS;
    REACTIES = api.reacties || [];
    if (api.profielfotos && typeof zetProfielfotos === "function") zetProfielfotos(api.profielfotos);
    render(); try { renderPlayers(); } catch {}
  }
  window.renderFotos = () => laad(false);
})();
