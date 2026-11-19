/* =========================================================
   Ideeënbox: iedereen kan ideeën toevoegen (voor de app, het team, de derde helft…)
   en op ideeën van anderen stemmen. De beheerder zet een status en kan reageren.
   Gebruikt uit index.html: esc, kamelenApi, TOTO_CONFIG, IK
   ========================================================= */
(function () {
  const box = document.getElementById("ideeen"); if (!box) return;
  const CFG = window.TOTO_CONFIG || {};
  const beheercode = () => { try { return localStorage.getItem("kamelen-beheer") || ""; } catch { return ""; } };
  const SOORTEN = { app: "📱 App", team: "🏑 Team", "derde helft": "🍺 Derde helft", anders: "💡 Anders" };
  const STATUS = { nieuw: "Nieuw", gepland: "Komt eraan", gedaan: "Gedaan", afgewezen: "Niet nu" };
  const datum = t => { const d = new Date(t); return isNaN(d) ? "" : d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" }); };
  let IDEEEN = [], filter = "open", sorteer = "stemmen", soortKeuze = "app", bezig = false;

  const post = body => fetch(CFG.api, { method: "POST", body: JSON.stringify({ code: CFG.teamcode, ...body }) }).then(r => r.json());

  function render() {
    const ik = (window.IK || {}).naam || "", beheer = !!beheercode();
    const open = i => i.status === "nieuw" || i.status === "gepland";
    let lijst = IDEEEN.filter(i => filter === "alle" ? true : filter === "open" ? open(i) : filter === "mijn" ? i.door === ik : i.status === filter);
    lijst = lijst.slice().sort(sorteer === "stemmen" ? (a, b) => b.stemmen.length - a.stemmen.length || new Date(b.tijd) - new Date(a.tijd) : (a, b) => new Date(b.tijd) - new Date(a.tijd));
    const tel = f => IDEEEN.filter(f).length;
    box.innerHTML = `
      <form class="card idee-form" id="idee-form">
        <h2 class="sub-h">Nieuw idee</h2>
        <div class="idee-soorten" role="radiogroup" aria-label="Waar gaat je idee over?">${Object.entries(SOORTEN).map(([k, v]) => `<button type="button" role="radio" aria-checked="${k === soortKeuze}" data-soort="${esc(k)}">${v}</button>`).join("")}</div>
        <label class="tt-f"><span>Je idee</span><textarea id="idee-tekst" rows="3" maxlength="600" required placeholder="Bijvoorbeeld: een teller voor wie het vaakst te laat komt"></textarea></label>
        <div class="foto-acties"><button class="btn" type="submit" id="idee-knop">Idee insturen</button><span class="tt-status" id="idee-status" role="status"></span></div>
      </form>
      <div class="idee-balk">
        <div class="q-filter" role="tablist">
          ${[["open", "Open", tel(open)], ["gedaan", "Gedaan", tel(i => i.status === "gedaan")], ["mijn", "Van mij", tel(i => i.door === ik)], ["alle", "Alles", IDEEEN.length]].map(([k, l, n]) => `<button type="button" data-filter="${k}" aria-pressed="${filter === k}">${l} <small>${n}</small></button>`).join("")}
        </div>
        <label class="idee-sort">Sorteer <select id="idee-sort"><option value="stemmen"${sorteer === "stemmen" ? " selected" : ""}>Meeste stemmen</option><option value="nieuw"${sorteer === "nieuw" ? " selected" : ""}>Nieuwste</option></select></label>
      </div>
      ${lijst.length ? `<div class="idee-lijst">${lijst.map(i => {
        const gestemd = i.stemmen.includes(ik);
        return `<article class="card idee st-${esc(i.status)}">
          <button type="button" class="idee-stem${gestemd ? " aan" : ""}" data-stem="${esc(i.id)}" aria-pressed="${gestemd}" aria-label="${gestemd ? "Stem intrekken" : "Stem op dit idee"} (${i.stemmen.length} stemmen)"><span aria-hidden="true">▲</span><b>${i.stemmen.length}</b></button>
          <div class="idee-body">
            <div class="idee-meta"><span class="idee-soort">${SOORTEN[i.soort] || SOORTEN.anders}</span>${i.status !== "nieuw" ? `<span class="idee-status">${STATUS[i.status] || esc(i.status)}</span>` : ""}</div>
            <p class="idee-tekst">${esc(i.tekst)}</p>
            ${i.reactie ? `<p class="idee-reactie"><b>Reactie:</b> ${esc(i.reactie)}</p>` : ""}
            <div class="idee-voet">${esc(i.door)} · ${datum(i.tijd)}${i.stemmen.length ? ` · <span title="${esc(i.stemmen.join(", "))}">gesteund door ${esc(i.stemmen.slice(0, 3).join(", "))}${i.stemmen.length > 3 ? ` +${i.stemmen.length - 3}` : ""}</span>` : ""}
              ${i.door === ik ? ` · <button type="button" class="idee-link" data-weg="${esc(i.id)}">verwijderen</button>` : ""}</div>
            ${beheer ? `<div class="idee-beheer">${Object.entries(STATUS).map(([k, l]) => `<button type="button" data-status="${k}" data-id="${esc(i.id)}" aria-pressed="${i.status === k}">${l}</button>`).join("")}<button type="button" data-reactie="${esc(i.id)}">Reageren</button>${i.door !== ik ? `<button type="button" class="idee-link" data-bweg="${esc(i.id)}">Verwijderen</button>` : ""}</div>` : ""}
          </div>
        </article>`;
      }).join("")}</div>` : `<div class="card empty">${filter === "mijn" ? "Je hebt nog geen ideeën ingestuurd." : filter === "gedaan" ? "Nog niks afgerond. Komt goed!" : "Nog geen ideeën. Wees de eerste!"}</div>`}`;
  }

  box.addEventListener("click", async e => {
    const s = e.target.closest("[data-soort]");
    if (s) { soortKeuze = s.dataset.soort; box.querySelectorAll("[data-soort]").forEach(b => b.setAttribute("aria-checked", b === s)); return; }
    const f = e.target.closest("[data-filter]");
    if (f) { filter = f.dataset.filter; render(); return; }
    if (bezig) return;
    const st = e.target.closest("[data-stem]");
    if (st) {
      /* Meteen tonen, daarna opslaan */
      const ik = (window.IK || {}).naam, i = IDEEEN.find(x => x.id === st.dataset.stem); if (!i || !ik) return;
      i.stemmen = i.stemmen.includes(ik) ? i.stemmen.filter(n => n !== ik) : [...i.stemmen, ik];
      render();
      post({ type: "idee-stem", id: i.id }).catch(() => {});
      return;
    }
    const w = e.target.closest("[data-weg], [data-bweg]");
    if (w) {
      if (w.dataset.zeker !== "1") { w.dataset.zeker = "1"; w.textContent = "zeker weten?"; return; }
      bezig = true;
      const id = w.dataset.weg || w.dataset.bweg;
      IDEEEN = IDEEEN.filter(x => x.id !== id); render();
      await (w.dataset.weg ? post({ type: "idee-weg", id }) : post({ type: "beheer", actie: "verwijder-idee", beheercode: beheercode(), id })).catch(() => {});
      bezig = false; return;
    }
    const b = e.target.closest("[data-status]");
    if (b) {
      const i = IDEEEN.find(x => x.id === b.dataset.id); if (!i) return;
      i.status = b.dataset.status; render();
      post({ type: "beheer", actie: "idee-status", beheercode: beheercode(), id: i.id, status: i.status }).catch(() => {});
      return;
    }
    const r = e.target.closest("[data-reactie]");
    if (r) {
      const i = IDEEEN.find(x => x.id === r.dataset.reactie); if (!i) return;
      const t = prompt("Reactie bij dit idee (leeg = weghalen):", i.reactie || ""); if (t === null) return;
      i.reactie = t.trim(); render();
      post({ type: "beheer", actie: "idee-status", beheercode: beheercode(), id: i.id, reactie: i.reactie }).catch(() => {});
    }
  });
  box.addEventListener("change", e => { if (e.target.id === "idee-sort") { sorteer = e.target.value; render(); } });
  box.addEventListener("submit", async e => {
    if (e.target.id !== "idee-form") return;
    e.preventDefault();
    const tekst = document.getElementById("idee-tekst").value.trim(), st = document.getElementById("idee-status"), knop = document.getElementById("idee-knop");
    if (tekst.length < 3) { st.textContent = "Schrijf iets meer op."; return; }
    knop.disabled = true; st.textContent = "Insturen…";
    try {
      const r = await post({ type: "idee", tekst, soort: soortKeuze });
      if (!r.ok) throw new Error(r.fout);
      document.getElementById("idee-tekst").value = "";
      filter = "mijn"; await laad(true);
      const s2 = document.getElementById("idee-status"); if (s2) s2.textContent = "Ingestuurd, bedankt! 💡";
    } catch (err) {
      st.textContent = /invoer|type/i.test(String(err)) || !String(err.message || "") ? "Dat lukte niet. Mogelijk moet het script nog bijgewerkt worden." : `Dat lukte niet (${String(err.message || err).slice(0, 80)}).`;
      knop.disabled = false;
    }
  });

  async function laad(vers) {
    const api = await window.kamelenApi(vers);
    if (!api || !("ideeen" in api)) { box.innerHTML = `<div class="card empty">De ideeënbox is er bijna: het script moet nog bijgewerkt worden.</div>`; return; }
    IDEEEN = (api.ideeen || []).map(i => ({ ...i, stemmen: Array.isArray(i.stemmen) ? i.stemmen : [] }));
    render();
  }
  window.renderIdeeen = () => laad(false);
})();
