/* =========================================================
   Pushmeldingen: aan- en uitzetten op deze telefoon/computer.
   Op een iPhone werkt het alleen in de app op het beginscherm (iOS 16.4 of nieuwer).
   ========================================================= */
(function () {
  const VAPID = "BCK-agIGdX3s3--RJJ7UYgdxtKS1hKiz1BxITrQxprx9gggsXMjHBZEG0LKnE9WIQjUCIOEFrCgi88TCqyL9HsQ";
  const box = document.getElementById("push-card"); if (!box) return;
  const api = () => (window.TOTO_CONFIG || {}).api;
  const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const kan = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  const sleutel = b => { const p = "=".repeat((4 - b.length % 4) % 4), r = atob((b + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...r].map(c => c.charCodeAt(0))); };
  const stuur = (type, abonnement) => fetch(api(), { method: "POST", body: JSON.stringify({ type, abonnement, code: (window.IK || {}).code || "" }) }).then(r => r.json());

  const WAT = "Avond voor de wedstrijd, selectie bekend, uitslag, stemmen open, kameel en ezel van de dag en verjaardagen.";
  function toon(staat, melding = "") {
    let knop = "", tekst = "";
    if (!kan && iOS && !standalone) tekst = `Op je iPhone werkt dit alleen in de app: tik in Safari op <b>Deel</b> → <b>Zet op beginscherm</b>, open de Kamelen-app en zet hier de meldingen aan.`;
    else if (!kan) tekst = "Deze browser ondersteunt geen meldingen. Op een iPhone: zet de site op je beginscherm (iOS 16.4 of nieuwer).";
    else if (Notification.permission === "denied") tekst = "Meldingen zijn geblokkeerd. Zet ze aan bij Instellingen → Meldingen → Kamelen (of in je browserinstellingen).";
    else if (staat === "aan") { box.classList.add("compact"); box.innerHTML = `<div class="push-row"><span>🔔 Meldingen staan aan${melding ? ` · ${melding}` : ""}</span><button type="button" class="btn sm ghost" data-push="uit">Uitzetten</button></div>`; return; }
    else { tekst = `Krijg een seintje bij: ${WAT.charAt(0).toLowerCase() + WAT.slice(1)}`; knop = `<button type="button" class="btn sm" data-push="aan">🔔 Meldingen aanzetten</button>`; }
    box.classList.remove("compact");
    box.innerHTML = `<div class="push-row"><div><h2 class="push-h">Meldingen${staat === "aan" ? " <span class=\"pill done\">aan</span>" : ""}</h2><p>${tekst}</p>${melding ? `<p class="push-msg">${melding}</p>` : ""}</div>${knop}</div>`;
  }
  async function huidige() { if (!kan) return null; const reg = await navigator.serviceWorker.ready; return reg.pushManager.getSubscription(); }

  box.addEventListener("click", async e => {
    const b = e.target.closest("[data-push]"); if (!b) return;
    b.disabled = true;
    try {
      if (b.dataset.push === "aan") {
        const toestemming = await Notification.requestPermission();
        if (toestemming !== "granted") return toon("uit", "Geen toestemming gekregen.");
        const reg = await navigator.serviceWorker.ready;
        const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: sleutel(VAPID) });
        const r = await stuur("push-aan", sub.toJSON());
        if (!r.ok) throw new Error(r.fout);
        toon("aan", "Gelukt! Je krijgt voortaan een melding.");
      } else {
        const sub = await huidige();
        if (sub) { await stuur("push-uit", sub.toJSON()).catch(() => {}); await sub.unsubscribe(); }
        toon("uit", "Meldingen staan uit.");
      }
    } catch (err) { toon((await huidige().catch(() => null)) ? "aan" : "uit", "Dat lukte niet. Probeer het zo nog eens."); }
  });

  toon("uit");
  huidige().then(s => { toon(s ? "aan" : "uit"); if (s) stuur("push-aan", s.toJSON()).catch(() => {}); }).catch(() => {});
})();
