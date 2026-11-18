/* =========================================================
   Quotes: uitspraken van Kamelen, door iedereen toe te voegen.
   Gebruikt uit index.html: esc, ROSTER, kamelenApi, TOTO_CONFIG
   ========================================================= */
(function () {
  const box = document.getElementById("quotes"); if (!box) return;
  const CFG = window.TOTO_CONFIG || {};
  const LS = "kamelen-toto", BLS = "kamelen-beheer";
  const eigen = () => { try { return JSON.parse(localStorage.getItem(LS) || "{}"); } catch { return {}; } };
  const bewaar = o => { try { localStorage.setItem(LS, JSON.stringify(o)); } catch {} };
  const beheercode = () => { try { return localStorage.getItem(BLS) || ""; } catch { return ""; } };
  const COACHES = ["Marie", "Toryll", "Lucia"];
  const namen = () => [...(typeof ROSTER !== "undefined" ? [...ROSTER] : []), ...COACHES];
  const datum = t => { const d = new Date(t); return isNaN(d) ? "" : d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }); };
  let QUOTES = [], filter = "";

  function render() {
    const e = eigen(), beheer = !!beheercode();
    const wie = [...new Set(QUOTES.map(q => q.wie))].sort((a, b) => QUOTES.filter(q => q.wie === b).length - QUOTES.filter(q => q.wie === a).length);
    const lijst = filter ? QUOTES.filter(q => q.wie === filter) : QUOTES;
    box.innerHTML = `
      <form class="card quote-form" id="quote-form">
        <h2 class="sub-h">Quote toevoegen</h2>
        <label class="tt-f"><span>Wat werd er gezegd?</span><textarea id="q-tekst" rows="3" maxlength="400" required placeholder="Typ de uitspraak precies zoals hij gezegd werd"></textarea></label>
        <div class="foto-velden">
          <label class="tt-f"><span>Wie zei het?</span><select id="q-wie" required><option value="">Kies</option>${namen().map(n => `<option>${esc(n)}</option>`).join("")}<option value="__anders">Iemand anders…</option></select></label>
          <label class="tt-f" id="q-anders-wrap" hidden><span>Naam</span><input id="q-anders" type="text" maxlength="40"></label>
          <label class="tt-f"><span>Wanneer of waarbij? (mag leeg)</span><input id="q-context" type="text" maxlength="200" placeholder="Bijvoorbeeld: in de rust tegen Sneek"></label>
          <div class="tt-f"><span>Toegevoegd door</span><div class="tt-ik">${esc((window.IK || {}).naam || "")}</div><input type="hidden" id="q-door" value="${esc((window.IK || {}).naam || "")}"></div>
        </div>
        <div class="foto-acties"><button class="btn" type="submit">Quote toevoegen</button><span class="tt-status" id="q-status" role="status"></span></div>
      </form>
      ${wie.length > 1 ? `<div class="q-filter" role="group" aria-label="Filter op persoon"><button type="button" data-f="" aria-pressed="${!filter}">Iedereen</button>${wie.map(n => `<button type="button" data-f="${esc(n)}" aria-pressed="${filter === n}">${esc(n)} <small>${QUOTES.filter(q => q.wie === n).length}</small></button>`).join("")}</div>` : ""}
      ${lijst.length ? `<div class="q-lijst">${lijst.map(q => `
        <figure class="quote">
          <blockquote>${esc(q.tekst)}</blockquote>
          <figcaption><b>${esc(q.wie)}</b>${q.context ? `, ${esc(q.context)}` : ""}<small>${datum(q.tijd)}${q.door ? `, toegevoegd door ${esc(q.door)}` : ""}</small></figcaption>
          ${beheer ? `<button type="button" class="foto-weg" data-weg="${esc(q.id)}">Verwijderen</button>` : ""}
        </figure>`).join("")}</div>` : `<div class="card empty">Nog geen quotes. Wie zegt er als eerste iets memorabels?</div>`}`;

    const sel = document.getElementById("q-wie");
    sel.addEventListener("change", () => { document.getElementById("q-anders-wrap").hidden = sel.value !== "__anders"; });
    document.getElementById("quote-form").addEventListener("submit", opslaan);
  }

  async function opslaan(ev) {
    ev.preventDefault();
    const st = document.getElementById("q-status");
    const tekst = document.getElementById("q-tekst").value.trim();
    let wie = document.getElementById("q-wie").value;
    if (wie === "__anders") wie = document.getElementById("q-anders").value.trim();
    const door = document.getElementById("q-door").value, context = document.getElementById("q-context").value.trim();
    if (!tekst || !wie || !door) { st.textContent = "Vul de quote, wie het zei en je eigen naam in."; return; }
    const e = eigen(); e.naam = door; bewaar(e);
    st.textContent = "Opslaan…";
    try {
      const r = await fetch(CFG.api, { method: "POST", body: JSON.stringify({ type: "quote", code: CFG.teamcode, wie, tekst, context, door }) }).then(r => r.json());
      if (!r.ok) throw new Error(r.fout);
      await laad(true);
      document.getElementById("q-status").textContent = "Quote toegevoegd.";
    } catch (err) { st.textContent = `Opslaan lukte niet (${String(err.message || err).slice(0, 120)}). Ververs de pagina en probeer het opnieuw.`; }
  }

  box.addEventListener("click", async e => {
    const f = e.target.closest("[data-f]"); if (f) { filter = f.dataset.f; return render(); }
    const w = e.target.closest("[data-weg]"); if (!w) return;
    if (w.dataset.zeker !== "1") { w.dataset.zeker = "1"; w.textContent = "Zeker weten?"; return; }
    w.disabled = true;
    await fetch(CFG.api, { method: "POST", body: JSON.stringify({ type: "beheer", actie: "verwijder-quote", beheercode: beheercode(), id: w.dataset.weg }) }).catch(() => {});
    laad(true);
  });

  async function laad(vers) {
    const api = await window.kamelenApi(vers);
    if (!api || !("quotes" in api)) { box.innerHTML = `<div class="card empty">De quotes konden niet worden geladen. Ververs de pagina (Ctrl+Shift+R).</div>`; return; }
    QUOTES = (api.quotes || []).slice().sort((a, b) => new Date(b.tijd) - new Date(a.tijd));
    window.KAMELEN_QUOTES = QUOTES;
    render(); try { renderPlayers(); } catch {}
    window.renderQuoteHome?.();
  }
  window.renderQuotes = () => laad(false);
})();
