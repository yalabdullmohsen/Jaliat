/* v86 — إصدار التصاريح موقوف مؤقتاً: الصفحة مفتوحة، والإصدار والتفويض «قريباً». الأساس الآن إبلاغ المنسق بالواتساب. */
const PERMIT_SOON = true;
const pSoonMsg = () => toast("إصدار التصاريح قريباً — موقوف مؤقتاً، استخدم «إبلاغ المنسق» بالواتساب");
const P_SEL = "[data-pact],[data-gact],[data-pgself],[data-pwqissue],[data-pgfrom],[data-pguse]";
const _permitFormSoon = permitForm, _grantFormSoon = grantForm;
permitForm = function(preset, grant){ if (PERMIT_SOON) return pSoonMsg(); return _permitFormSoon(preset, grant); };
grantForm = function(preset){ if (PERMIT_SOON) return pSoonMsg(); return _grantFormSoon(preset); };
if (typeof grantUse === "function") { const _guSoon = grantUse; grantUse = function(id){ if (PERMIT_SOON) return pSoonMsg(); return _guSoon(id); }; }
document.addEventListener("click", ev => { if (!PERMIT_SOON) return; const t = ev.target.closest(P_SEL); if (!t) return; ev.preventDefault(); ev.stopImmediatePropagation(); pSoonMsg(); }, true);
const pSoonMark = () => { if (!PERMIT_SOON) return; document.querySelectorAll(P_SEL).forEach(b => { if (!b.classList.contains("p-soon")) { b.classList.add("p-soon"); b.classList.remove("btn-primary"); b.title = "قريباً"; } }); };
new MutationObserver(pSoonMark).observe(document.documentElement, { childList:true, subtree:true });
const _vPermitsSoon = vPermits;
vPermits = function(){ const h = _vPermitsSoon(); if (!PERMIT_SOON) return h; return `<div class="check warn p-pause"><b>إصدار التصاريح قريباً</b><span>موقوف مؤقتاً لين ما نستكمل المشروع. الحين نبلّغ المنسق بالواتساب من «وثيقة» ← «إبلاغ المنسق».</span><button type="button" class="btn btn-ok" onclick="go('watheqa')">📲 إبلاغ المنسقين</button></div>` + h; };
const _prioSoon = priorities;
priorities = function(){ const P = _prioSoon(); return PERMIT_SOON ? P.filter(x => x.w !== 86) : P; };
