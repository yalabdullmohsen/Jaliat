/* منظومة إنجاز — الهوية الموحّدة وسطر الحقوق
   ملف واحد مشترك بين: إنجاز (الموظفين) · بوابة إنجاز (المنسقين والخطباء) · بصمة إنجاز
   الاستخدام: <script src="…/brand/brand.js" data-app="injaz|bawaba|basma" defer></script>
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
    bawaba: '<path d="M16 34V24a8 8 0 0 1 16 0v10"/><path d="M13 34h22"/>',
    biz: '<rect x="15" y="20" width="18" height="13" rx="2.5"/><path d="M20.5 20v-2.2a1.6 1.6 0 0 1 1.6-1.6h3.8a1.6 1.6 0 0 1 1.6 1.6V20"/><path d="M15 26h18"/>',
    basma: '<path d="M18 33c1.5-3 2-6 2-9a4 4 0 0 1 8 0c0 3.5-.6 7-2 10"/><path d="M24 24c0 4-1 7.5-2.6 10.5"/><path d="M15 29.5c.6-1.5 1-3.4 1-5.5a8 8 0 0 1 16 0c0 2-.2 4-.6 6"/><path d="M17 17.5a10.5 10.5 0 0 1 14 0"/>',
  };
  var THEME = {
    injaz: ['#1B5A43', '#E2BC55'], biz: ['#0B0B0F', '#2563EB'],
    bawaba: ['#0F4C4A', '#C9A24B'], basma: ['#6D5BF0', '#FFE27A']
  };
  var NAMES = { injaz: 'إنجاز', biz: 'إنجاز أعمال', bawaba: 'بوابة إنجاز', basma: 'بصمة إنجاز' };
  function mark(k, size) {
    return '<svg class="ij-mark" width="' + size + '" height="' + size + '" viewBox="0 0 48 48" aria-hidden="true">' +
      '<rect width="48" height="48" rx="11" fill="' + THEME[k][0] + '"/>' +
      '<circle cx="24" cy="24" r="14" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="3.4"/>' +
      '<circle cx="24" cy="24" r="14" fill="none" stroke="' + THEME[k][1] + '" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="70 100" transform="rotate(-90 24 24)"/>' +
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
    '.ij-new{position:fixed;z-index:60;inset-inline:max(12px,env(safe-area-inset-left,0px));bottom:calc(14px + env(safe-area-inset-bottom,0px));margin:0 auto;max-width:520px;' +
    'display:flex;align-items:center;gap:12px;background:#1E3A31;color:#F2F6F4;border-radius:16px;padding:12px 12px 12px 14px;box-shadow:0 14px 36px -12px rgba(0,0,0,.45);font-size:13.5px;line-height:1.55}' +
    '.ij-new .ij-mark{border-radius:10px;flex:none;box-shadow:0 0 0 1px rgba(226,188,85,.5)}' +
    '.ij-new-t{flex:1;min-width:0}.ij-new-t b{display:block;font-size:14.5px;color:#E2BC55}.ij-new-t span{opacity:.85}' +
    '.ij-new-go{flex:none;background:#E2BC55;color:#1E3A31;font-weight:700;text-decoration:none;border-radius:10px;padding:8px 14px}' +
    '.ij-new-x{flex:none;background:none;border:0;color:#F2F6F4;opacity:.7;font-size:22px;line-height:1;cursor:pointer;padding:4px 6px}' +
    '.ij-copy-inline{display:block;margin-top:10px;font-size:11.5px;line-height:1.5;opacity:.6;text-align:center}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function footer() {
    var f = document.createElement('footer');
    f.className = 'ij-foot';
    f.setAttribute('lang', 'ar');
    f.innerHTML = '<div class="ij-fam" aria-label="منظومة إنجاز">' +
      ['injaz', 'biz', 'bawaba', 'basma'].filter(function (k) { return k !== 'injaz' || app === 'injaz'; }).map(function (k) {
        return '<span class="' + (k === app ? 'on' : '') + '">' + mark(k, 18) + NAMES[k] + '</span>';
      }).join('') + '</div><p class="ij-copy">' + COPY_HTML + '</p>';
    return f;
  }
  function inlineCopy() { var s = document.createElement('small'); s.className = 'ij-copy-inline'; s.innerHTML = COPY_HTML; return s; }

  // «جديد» في إنجاز: بطاقة تعرّف الموظف ببصمة إنجاز، تختفي نهائيًا بعد ما يضغطها
  function newCard() {
    var K = 'ij-new-basma';
    try { if (localStorage.getItem(K)) return; } catch (e) { return; }
    var appEl = document.getElementById('app');
    if (!appEl || appEl.hidden || document.querySelector('.ij-new')) return;
    var c = document.createElement('div');
    c.className = 'ij-new'; c.setAttribute('role', 'status');
    c.innerHTML = mark('basma', 40) + '<div class="ij-new-t"><b>جديد: بصمة إنجاز</b><span>يذكّرك ببصمة التواجد والخروج في وقتها، مع تقرير شهري ورصيد التأخير.</span></div>' +
      '<a class="ij-new-go" href="basma/" target="_blank" rel="noopener">افتح</a><button type="button" class="ij-new-x" aria-label="إخفاء">×</button>';
    function done() { try { localStorage.setItem(K, '1'); } catch (e) {} c.remove(); }
    c.querySelector('.ij-new-go').addEventListener('click', done);
    c.querySelector('.ij-new-x').addEventListener('click', done);
    document.body.appendChild(c);
  }

  function place() {
    if (app === 'injaz') {
      newCard();
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
