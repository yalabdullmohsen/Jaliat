/* ================= v181: مساجد الجاليات (خطب الجمعة) منفصلة عن مساجد الدروس والدورات (طلب يوسف 28/11/2026)
   «مساجد الجاليات» = مساجد خطب الجمعة فقط (عددها ثابت تقريباً، نحو 79)، مأخوذة من ربط الخطباء بكشف المساجد (mosLink).
   «مساجد الدروس والدورات» = كل مسجد فيه درس أو دورة أو محاضرة (قد يكون من مساجد الخطب أو غيرها).
   لا قائمة مدموجة: صفحة المساجد قسمان بلسانين، والافتراضي مساجد الجاليات. ================= */
const _vMosques181 = vMosques;
function mos181Sets(){ const L = mosLink(), kh = new Set(L.ids.keys()), les = new Set();
  S.E.forEach(e => { if (e.mosque && !/خطبة/.test(String(e.type || ""))) les.add(e.mosque); });
  return { kh, les }; }
vMosques = function(){ const t = S.f.mk181 === "les" ? "les" : "kh", keep = S.mosques, { kh, les } = mos181Sets(), fk = S.f.mkind;
  S.mosques = keep.filter(m => (t === "kh" ? kh : les).has(m.id)); S.f.mkind = ""; let h;
  try { h = _vMosques181(); } finally { S.mosques = keep; S.f.mkind = fk; }
  h = h.replace(/<select class="f" data-fk="mkind">[\s\S]*?<\/select>/, "");
  if (t === "les") h = h.replace(/<div class="check warn"><b>\d+ من \d+ مسجد خطباء[\s\S]*?<\/div>(?=<div class="toolbar">)/, "");
  const n = s => keep.filter(m => s.has(m.id)).length;
  const bar = `<div class="vg-bar mk181" role="tablist" aria-label="المساجد">${[["kh", "مساجد الجاليات (خطب الجمعة)", n(kh)], ["les", "مساجد الدروس والدورات", n(les)]].map(([k, l, c]) => `<button type="button" role="tab" aria-selected="${k === t}" class="${k === t ? "on" : ""}" data-mk181="${k}">${l} <span class="num">${c}</span></button>`).join("")}</div>`;
  return bar + h; };
document.addEventListener("click", ev => { const b = ev.target.closest("[data-mk181]"); if (!b) return; ev.preventDefault(); S.f.mk181 = b.dataset.mk181; render(); });
