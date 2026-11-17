/* ===== v55: quiet motion — content rises in only when a page is entered, never on background refreshes ===== */
let _fxView = null;
const _afterRender55 = afterRender;
afterRender = function(v){ _afterRender55(v); const el = $("#view"); if (!el) return;
  if (S.view !== _fxView) { _fxView = S.view; el.classList.remove("fx-enter"); void el.offsetWidth; el.classList.add("fx-enter"); clearTimeout(el._fx); el._fx = setTimeout(() => el.classList.remove("fx-enter"), 700); } };
