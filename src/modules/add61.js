/* ================= v76: multi-language community (لجنة التعريف بالإسلام): pick the activity language ================= */
const isMulti = n => S.comms.some(c => c.name === n && c.multi);
const MLANGS = ["البنغالية","الأوردية","المليبارية","مالايالم","التاميلية","التلغو","السنهالية","الإنجليزية","الفلبينية","الإندونيسية","النيبالية","الفارسية","الفرنسية","السواحلية","الأمهرية","الصينية","أخرى"];
function fLangSync(v){ const c = $("#f-comm"); if (!c) return; let w = $("#f-lang-w");
  if (!isMulti(c.value)) { w?.remove(); return; }
  if (!w) { const box = c.closest(".fld") || c.parentElement; box.insertAdjacentHTML("afterend", `<div class="fld" id="f-lang-w"><label for="f-lang">لغة النشاط</label><select class="f" id="f-lang"><option value="">— اختر اللغة —</option>${MLANGS.map(l => `<option>${l}</option>`).join("")}</select></div>`); }
  if (v !== undefined) $("#f-lang").value = v || ""; }
const _actForm76 = actForm;
actForm = function(id){ const r = _actForm76.apply(this, arguments); const a = id ? (S.acts.get(id) || {}) : {};
  setTimeout(() => { fLangSync(a.lang); $("#f-comm")?.addEventListener("change", () => fLangSync()); }, 0); return r; };
const _readAct76 = readAct;
readAct = function(){ const v = _readAct76.apply(this, arguments); if (v && isMulti(v.comm)) v.lang = $("#f-lang")?.value || ""; return v; };
NEWF.splice(1, 0, ["v78-lajna", "nav:comms", "لجنة التعريف بالإسلام منسق لكل اللغات", "أنشطة اللجنة تُسجَّل باسمها مهما كانت لغتها، وتختار لغة النشاط من قائمة. وتظهر اللجنة خياراً في توزيع الجاليات المشتركة.", true, "2026-10-25"]);
