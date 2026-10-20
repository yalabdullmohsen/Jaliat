/* ===== v55: quiet motion — content rises in only when a page is entered, never on background refreshes ===== */
let _fxView = null;
const _afterRender55 = afterRender;
afterRender = function(v){ _afterRender55(v); const el = $("#view"); if (!el) return;
  if (S.view !== _fxView) { _fxView = S.view; el.classList.remove("fx-enter"); void el.offsetWidth; el.classList.add("fx-enter"); clearTimeout(el._fx); el._fx = setTimeout(() => el.classList.remove("fx-enter"), 700); } };
NEWF.splice(1, 0, ["v55-motion", "nav:home", "حركة هادئة في الواجهة", "تظهر الصفحات والبطاقات بانسياب خفيف عند فتحها، وتستجيب الأزرار للمس، دون أي بطء.", false, "2026-10-20"]);
