/* منظومة إنجاز — الهوية الموحّدة وسطر الحقوق
   ملف واحد مشترك بين: إنجاز (الموظفين) · بوابة إنجاز (المنسقين والخطباء)
   الاستخدام: <script src="…/brand/brand.js" data-app="injaz|bawaba" defer></script>
   © 2026 يوسف عبد المحسن المطيري — جميع الحقوق محفوظة */
(function () {
  var OWNER = 'يوسف عبد المحسن المطيري';
  var YEAR = 2026;
  var COPY = '© ' + YEAR + ' ' + OWNER + ' — جميع الحقوق محفوظة';
  var COPY_HTML = '<span class="ij-nw">© ' + YEAR + ' ' + OWNER + '</span> — <span class="ij-nw">جميع الحقوق محفوظة</span>';
  var me = document.currentScript || document.querySelector('script[src*="brand/brand.js"]');
  var app = (me && me.getAttribute('data-app')) || 'injaz';

  // علامات المنظومة: نفس المربع الأخضر والحلقة الذهبية، والرمز في الوسط يختلف
  var GLYPH = {
    injaz: '<path d="M17 25l5 5 10-11" stroke-width="3.4"/>',
    bawaba: '<path d="M16 34V24a8 8 0 0 1 16 0v10"/><path d="M13 34h22"/>'
  };
  var NAMES = { injaz: 'إنجاز', bawaba: 'بوابة إنجاز' };
  function mark(k, size) {
    return '<svg class="ij-mark" width="' + size + '" height="' + size + '" viewBox="0 0 48 48" aria-hidden="true">' +
      '<rect width="48" height="48" rx="11" fill="#1B5A43"/>' +
      '<circle cx="24" cy="24" r="14" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="3.4"/>' +
      '<circle cx="24" cy="24" r="14" fill="none" stroke="#E2BC55" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="70 100" transform="rotate(-90 24 24)"/>' +
      '<g fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' + GLYPH[k] + '</g></svg>';
  }
  window.InjazBrand = { owner: OWNER, copy: COPY, mark: mark, names: NAMES };

  var css = '' +
    '.ij-foot{max-width:680px;margin:28px auto 8px;padding:16px 16px 4px;border-top:1px solid color-mix(in srgb,currentColor 14%,transparent);' +
    'display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;font-size:12.5px;line-height:1.6}' +
    '.ij-fam{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 14px}' +
    '.ij-fam span{display:inline-flex;align-items:center;gap:6px;font-weight:600;opacity:.55}' +
    '.ij-fam span.on{opacity:1}' +
    '.ij-fam .ij-mark{border-radius:6px;flex:none}' +
    '.ij-copy{margin:0;opacity:.6}.ij-nw{white-space:nowrap}' +
    '.ij-copy-inline{display:block;margin-top:10px;font-size:11.5px;line-height:1.5;opacity:.6;text-align:center}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function footer() {
    var f = document.createElement('footer');
    f.className = 'ij-foot';
    f.setAttribute('lang', 'ar');
    f.innerHTML = '<div class="ij-fam" aria-label="منظومة إنجاز">' +
      ['injaz', 'bawaba'].filter(function (k) { return k !== 'injaz' || app === 'injaz'; }).map(function (k) {
        return '<span class="' + (k === app ? 'on' : '') + '">' + mark(k, 18) + NAMES[k] + '</span>';
      }).join('') + '</div><p class="ij-copy">' + COPY_HTML + '</p>';
    return f;
  }
  function inlineCopy() { var s = document.createElement('small'); s.className = 'ij-copy-inline'; s.innerHTML = COPY_HTML; return s; }


  function place() {
    if (app === 'injaz') {
      // نظام الموظفين: سطر الحقوق في بطاقة الدخول وأسفل القائمة الجانبية
      var card = document.querySelector('#login .login-card');
      if (card && !card.querySelector('.ij-copy-inline')) card.appendChild(inlineCopy());
      var side = document.querySelector('#side .side-foot');
      if (side && !side.querySelector('.ij-copy-inline')) side.appendChild(inlineCopy());
      return;
    }
    if (document.querySelector('.ij-foot')) return;
    var slot = document.querySelector('[data-brand-slot]') || (app === 'bawaba' ? document.querySelector('.w') : document.querySelector('main')) || document.body;
    slot.appendChild(footer());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', place); else place();
  // الصفحات اللي تعيد رسم محتواها: نعيد وضع السطر إذا انشال
  var busy = false;
  new MutationObserver(function () { if (busy) return; busy = true; requestAnimationFrame(function () { place(); busy = false; }); })
    .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
})();
