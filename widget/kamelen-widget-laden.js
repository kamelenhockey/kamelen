// Kamelen-widget (Scriptable) – dit kleine script haalt steeds de nieuwste versie van de widget op.
// Plak dit één keer in Scriptable; verbeteringen aan de widget komen daarna vanzelf mee.
const BRON = "https://kamelenhockey.github.io/kamelen/widget/kamelen-widget.js";
const fm = FileManager.local(), pad = fm.joinPath(fm.documentsDirectory(), "kamelen-widget-code.js");
let code = null;
try { const r = new Request(BRON + "?" + Math.floor(Date.now() / 36e5)); r.timeoutInterval = 8; code = await r.loadString(); if (!/ListWidget/.test(code)) code = null; else fm.writeString(pad, code); } catch (e) {}
if (!code && fm.fileExists(pad)) code = fm.readString(pad);
if (!code) { const w = new ListWidget(); w.backgroundColor = new Color("#b9d8e8"); const t = w.addText("Kamelen: geen verbinding"); t.textColor = new Color("#163650"); Script.setWidget(w); Script.complete(); }
else { const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor; await new AsyncFunction(code)(); }
