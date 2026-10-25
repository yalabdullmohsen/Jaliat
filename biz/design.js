/* إنجاز أعمال — تصميم النظام: المزايا وترتيبها، أنواع العمل وحقولها، الأدوار والصلاحيات، الشعار والبوابة */
(() => {
  const X = window.BIZX, CAT = window.BIZ_CATALOG || [], SECT = window.BIZ_SECTORS || {};
  if (!X) return;
  const CORE = ['tasks', 'bookings', 'requests', 'clients', 'news'];
  const CAPS = [
    ['assign', 'يسند مهام لغيره', 'يكلّف زملاءه بالمهام'], ['tasks_all', 'يشوف كل المهام', 'وإلا يشوف مهامه واللي أنشأها بس'], ['tasks_del', 'يحذف المهام', 'غير اللي أنشأها بنفسه'],
    ['bookings', 'يدير الحجوزات والقاعات', 'يعتمد ويلغي حجوزات غيره ويضيف القاعات'], ['requests', 'يرد على طلبات العملاء', 'ويغيّر حالتها'], ['clients', 'يدير العملاء', 'يضيف ويعدّل ويحذف'],
    ['news', 'ينشر التعاميم', 'للفريق وللبوابة'], ['team', 'يدير الفريق', 'الأقسام، رمز الانضمام، أدوار الموظفين'], ['records', 'يدير كل أنواع العمل', 'يتجاوز صلاحيات كل نوع'], ['import', 'يستورد من الملفات', 'يرفع ملف ويضيفه للنظام'],
  ];
  const MEMBER_DEF = { assign: true, tasks_all: true, tasks_del: false, bookings: true, requests: true, clients: true, news: false, team: false, records: false, import: false };
  const FT = [['text', 'نص قصير'], ['textarea', 'نص طويل'], ['number', 'رقم'], ['date', 'تاريخ'], ['select', 'قائمة اختيار'], ['yesno', 'نعم / لا'], ['phone', 'هاتف'], ['email', 'بريد']];
  const LV = { all: 'الكل', admin: 'المدراء فقط', own: 'صاحب السجل والمدراء', roles: 'أدوار محددة' };
  const css = `
  .dz-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--line)}
  .dz-row:first-child{border-top:0}
  .dz-row .ic{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent-fg);flex:none}
  .dz-row .ic svg{width:19px;height:19px}
  .dz-row .tx{flex:1;min-width:0;cursor:pointer}.dz-row b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .dz-row .sub{font-size:.8rem;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .dz-row .tx b::after{content:' ✎';color:var(--muted);font-weight:400;font-size:.85em}
  .dz-row .ib{width:30px;height:30px}
  .dz-row.off .tx,.dz-row.off .ic{opacity:.45}
  .tag{font-size:.72rem;font-weight:700;padding:1px 7px;border-radius:99px;background:var(--surface-2);color:var(--muted);margin-inline-start:4px;vertical-align:1px}
  .ib{width:34px;height:34px;border-radius:9px;border:1px solid var(--line);background:var(--surface);color:var(--ink);display:grid;place-items:center;cursor:pointer;flex:none;font:inherit;font-size:.95rem}
  .ib:disabled{opacity:.35;cursor:default}
  .sw2{appearance:none;width:42px;height:24px;border-radius:99px;background:var(--line);position:relative;cursor:pointer;flex:none;transition:background .15s}
  .sw2::after{content:"";position:absolute;top:3px;inset-inline-start:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:inset-inline-start .15s}
  .sw2:checked{background:var(--accent)}.sw2:checked::after{inset-inline-start:21px}
  .savebar{position:sticky;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:5;display:flex;align-items:center;gap:10px;justify-content:space-between;background:var(--ink);color:var(--surface);border-radius:14px;padding:10px 12px 10px 10px;box-shadow:0 6px 24px rgba(0,0,0,.18)}
  .savebar .btn{background:var(--accent);color:#fff}
  @media (min-width:1000px){.savebar{bottom:16px}}
  .icg{display:grid;grid-template-columns:repeat(auto-fill,minmax(42px,1fr));gap:6px}
  .icg label{display:grid;place-items:center;height:42px;border:1px solid var(--line);border-radius:10px;cursor:pointer;color:var(--muted)}
  .icg input{position:absolute;opacity:0;pointer-events:none}
  .icg label:has(input:checked){border-color:var(--accent);color:var(--accent-fg);background:color-mix(in srgb,var(--accent) 10%,transparent)}
  .icg svg{width:20px;height:20px}
  .fe{border:1px solid var(--line);border-radius:12px;padding:10px;display:grid;gap:8px;background:var(--surface-2)}
  .fe .r1{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,42%);gap:6px}.fe .r1 input,.fe .r1 select,.fe .fo{width:100%;min-width:0;box-sizing:border-box}
  .fe input,.fe select{padding:9px 10px;border:1px solid var(--line);border-radius:9px;background:var(--surface);font:inherit;color:inherit}
  .fe .r2{display:flex;gap:10px;flex-wrap:wrap;align-items:center;font-size:.86rem}
  .fe .r2 label{display:flex;gap:5px;align-items:center}
  .fe .r2 input[type=checkbox]{accent-color:var(--accent);width:17px;height:17px}
  .caps{display:grid;gap:6px}
  .caps label{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--line);border-radius:12px;padding:10px 12px;cursor:pointer}
  .caps input{accent-color:var(--accent);width:18px;height:18px;margin-top:3px;flex:none}
  .caps small{display:block;color:var(--muted);font-size:.8rem}
  .logo-pv{width:64px;height:64px;border-radius:16px;object-fit:cover;border:1px solid var(--line);background:var(--surface-2)}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const rid = p => p + Math.random().toString(36).slice(2, 8).replace(/[^a-z0-9]/g, 'x');

  let S = null;
  const init = () => {
    const d = JSON.parse(JSON.stringify(ORG.design || {}));
    d.types ||= {}; d.order ||= []; d.roles ||= []; d.core ||= {};
    S = { d, extra: [...(ORG.extra || [])], modules: { ...ORG.modules }, labels: { ...(ORG.labels || {}) }, sector: ORG.sector || 'عام', dirty: false };
  };
  const defOf = k => {
    const c = X.CAT_M[k], o = S.d.types[k] || {};
    const b = c || { label: '', icon: 'file', group: 'خاص بالجهة', fields: [], status: ['جديد'] };
    return { key: k, label: o.label || b.label, icon: o.icon || b.icon, group: o.group || b.group, fields: o.fields?.length ? o.fields : b.fields, status: o.status?.length ? o.status : b.status, perm: { view: 'all', add: 'all', edit: 'all', ...(o.perm || {}) }, portal: !!o.portal, home: o.home !== false, custom: !c, changed: !!S.d.types[k] };
  };
  const rowKeys = () => {
    const custom = Object.keys(S.d.types).filter(k => k.startsWith('c_'));
    const keys = [...CORE, ...[...new Set([...S.extra, ...custom])].filter(k => X.CAT_M[k] || S.d.types[k]).map(k => 'm-' + k)];
    const o = S.d.order, ix = k => { const i = o.indexOf(k); return i < 0 ? 900 + keys.indexOf(k) : i; };
    return keys.sort((a, b) => ix(a) - ix(b));
  };
  const dirty = () => { S.dirty = true; const b = $('dzSave'); if (b) b.hidden = false; };
  const roleOpts = () => [['member', 'موظف (افتراضي)'], ...S.d.roles.map(r => [r.id, r.name])];

  VIEWS.design = async el => {
    if (!isAdmin()) { el.innerHTML = '<p class="empty">تصميم النظام لمدير الجهة.</p>'; return; }
    if (!S || !S.dirty) init();
    const keys = rowKeys();
    const row = (k, i) => {
      const isCore = !k.startsWith('m-'), key = isCore ? k : k.slice(2);
      let name, ic, sub, on;
      if (isCore) { name = S.labels[k] || MODS[k]; ic = X.GI[S.d.core[k]?.icon] || IC[k] || X.GI.file; on = !!S.modules[k]; sub = 'ميزة أساسية' + ((S.d.core[k]?.perm?.view) === 'admin' ? ' · للمدراء' : ''); }
      else { const d = defOf(key); name = d.label; ic = X.GI[d.icon] || X.GI.file; on = S.extra.includes(key); sub = [d.custom ? 'خاص بجهتك' : 'من المكتبة', `${d.fields.length} حقول`, d.portal && 'بالبوابة', d.perm.view !== 'all' && LV[d.perm.view]].filter(Boolean).join(' · '); }
      return `<div class="dz-row${on ? '' : ' off'}" data-k="${k}"><span class="ic">${svg(ic)}</span><div class="tx" data-ed role="button" tabindex="0" aria-label="تعديل ${esc(name)}"><b>${esc(name)}</b><div class="sub">${esc(sub)}</div></div>
        <button type="button" class="ib" data-up aria-label="لأعلى"${i === 0 ? ' disabled' : ''}>↑</button><button type="button" class="ib" data-dn aria-label="لأسفل"${i === keys.length - 1 ? ' disabled' : ''}>↓</button><input type="checkbox" class="sw2" data-on aria-label="تفعيل ${esc(name)}"${on ? ' checked' : ''}></div>`;
    };
    const cnt = id => PEOPLE.filter(p => p.role === 'member' && (p.prole || 'member') === id).length;
    el.innerHTML = `<div class="h"><h2>تصميم النظام</h2></div>
      <p class="muted sm" style="margin:-6px 0 0">كل شيء في نظام جهتك من هنا: المزايا وترتيبها في القائمة، حقول كل نوع عمل وحالاته، ومن يشوف ومن يعدّل، وأدوار الموظفين.</p>
      <section class="card"><div class="h" style="margin-bottom:2px"><h2 style="font-size:1rem">المزايا وترتيبها</h2></div>
        <p class="muted sm" style="margin:0 0 6px">الترتيب هنا هو ترتيب القائمة. ✎ لتغيير الاسم والأيقونة والحقول والصلاحيات.</p>
        <div id="dzRows">${keys.map(row).join('')}</div>
        <div class="g2" style="margin-top:10px"><button type="button" class="btn" id="dzNew">+ نوع عمل جديد</button><button type="button" class="btn ghost" id="dzLib">مكتبة الأنواع (${CAT.length})</button></div></section>
      <section class="card"><div class="h" style="margin-bottom:2px"><h2 style="font-size:1rem">الأدوار والصلاحيات</h2><button class="link" id="dzRole">+ دور جديد</button></div>
        <p class="muted sm" style="margin:0 0 6px">المدير عنده كل الصلاحيات. للموظفين: صمّم أدوار (مثل «منسق» أو «مشرف قسم») وحدد وش يقدر كل دور يسوي، مثل إسناد المهام لغيره. وتعطي كل موظف دوره من «الفريق».</p>
        <div>${roleOpts().map(([id, n]) => `<div class="dz-row" data-role="${id}"><span class="ic">${svg(X.GI.users)}</span><div class="tx" data-red2><b>${esc(n)}</b><div class="sub">${cnt(id)} موظف · ${Object.values(id === 'member' ? { ...MEMBER_DEF, ...(S.d.member || {}) } : S.d.roles.find(r => r.id === id).perms).filter(Boolean).length} من ${CAPS.length} صلاحيات</div></div></div>`).join('')}</div>
        <button type="button" class="btn ghost sm" data-go="team" style="margin-top:8px">وزّع الأدوار على الموظفين</button></section>
      <section class="card form"><h2 style="margin:0;font-size:1rem">الشعار وبوابة العملاء</h2>
        <div style="display:flex;gap:12px;align-items:center"><img class="logo-pv" id="dzLogo" src="${esc(S.d.logo || 'logo-180.png')}" alt=""><div style="display:flex;gap:8px;flex-wrap:wrap"><label class="btn ghost sm" style="cursor:pointer">رفع شعار جهتك<input type="file" accept="image/png,image/jpeg,image/webp" id="dzLogoF" hidden></label>${S.d.logo ? '<button type="button" class="link" id="dzLogoX">إزالة</button>' : ''}</div></div>
        <label class="f"><span>رسالة ترحيب في البوابة</span><textarea id="dzWel" placeholder="مثال: أهلًا بكم، نستقبل طلباتكم من الأحد إلى الخميس">${esc(S.d.welcome || '')}</textarea></label>
        <p class="muted sm" style="margin:0">لتفعيل نموذج نوع عمل للعملاء في البوابة (مثل الشكاوى): ✎ على النوع ← «متاح للعملاء في البوابة».</p></section>
      <div class="savebar" id="dzSave"${S.dirty ? '' : ' hidden'}><span>عندك تغييرات ما انحفظت</span><span style="display:flex;gap:6px"><button type="button" class="btn sm ghost" id="dzUndo" style="background:transparent;color:inherit;border-color:rgba(255,255,255,.3)">تراجع</button><button type="button" class="btn sm" id="dzGo">حفظ التصميم</button></span></div>`;

    const rerender = () => VIEWS.design(el);
    $('dzRows').onclick = e => {
      const r = e.target.closest('[data-k]'); if (!r) return; const k = r.dataset.k;
      if (e.target.closest('[data-up],[data-dn]')) {
        const ks = rowKeys(), i = ks.indexOf(k), j = e.target.closest('[data-up]') ? i - 1 : i + 1; if (j < 0 || j >= ks.length) return;
        [ks[i], ks[j]] = [ks[j], ks[i]]; S.d.order = ks; dirty(); rerender();
      } else if (e.target.closest('[data-ed]')) k.startsWith('m-') ? typeDlg(k.slice(2), rerender) : coreDlg(k, rerender);
    };
    $('dzRows').onchange = e => {
      const r = e.target.closest('[data-k]'); if (!r || !e.target.matches('[data-on]')) return; const k = r.dataset.k, on = e.target.checked;
      if (!k.startsWith('m-')) S.modules[k] = on; else { const key = k.slice(2); S.extra = on ? [...new Set([...S.extra, key])] : S.extra.filter(x => x !== key); }
      r.classList.toggle('off', !on); dirty();
    };
    $('dzNew').onclick = () => typeDlg(null, rerender);
    $('dzLib').onclick = () => libDlg(rerender);
    $('dzRole').onclick = () => roleDlg(null, rerender);
    el.querySelectorAll('[data-red2]').forEach(b => b.onclick = () => roleDlg(b.closest('[data-role]').dataset.role, rerender));
    $('dzWel').oninput = e => { S.d.welcome = e.target.value; dirty(); };
    $('dzLogoF').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { S.d.logo = await shrink(f); dirty(); rerender(); } catch { toast('ما قدرت أقرأ الصورة'); } };
    if ($('dzLogoX')) $('dzLogoX').onclick = () => { delete S.d.logo; dirty(); rerender(); };
    $('dzUndo').onclick = () => { init(); rerender(); };
    $('dzGo').onclick = async () => {
      const b = $('dzGo'); b.disabled = true; b.textContent = 'جارٍ الحفظ…';
      try {
        ORG = (await call('org_update', { design: S.d, extra: S.extra, modules: S.modules, labels: S.labels, sector: S.sector })).org;
        S.dirty = false; applyOrg(); renderNav(); toast('انحفظ التصميم ✓'); rerender();
      } catch (er) { toast(er.message); b.disabled = false; b.textContent = 'حفظ التصميم'; }
    };
  };

  function shrink(file) {
    return new Promise((ok, no) => {
      const img = new Image(); img.onload = () => {
        const n = 256, c = document.createElement('canvas'), s = Math.min(img.width, img.height);
        c.width = c.height = n; const x = c.getContext('2d');
        x.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, n, n);
        let u = c.toDataURL('image/png'); if (u.length > 280000) u = c.toDataURL('image/jpeg', .85); ok(u); URL.revokeObjectURL(img.src);
      }; img.onerror = no; img.src = URL.createObjectURL(file);
    });
  }
  const iconGrid = cur => `<div class="icg">${Object.keys(X.GI).map(k => `<label title="${k}"><input type="radio" name="icon" value="${k}"${k === cur ? ' checked' : ''}>${svg(X.GI[k])}</label>`).join('')}</div>`;

  function coreDlg(k, done) {
    const c = S.d.core[k] || {};
    dialog(MODS[k], `<form class="form">
      <label class="f"><span>الاسم في نظامك</span><input name="label" value="${esc(S.labels[k] || MODS[k])}" required></label>
      <div class="f"><span>الأيقونة</span>${iconGrid(c.icon || '')}</div>
      <label class="f"><span>من يشوفها في القائمة</span><select name="view">${opt([['all', 'كل الفريق'], ['admin', 'المدراء فقط']], c.perm?.view || 'all')}</select></label>
      <p class="muted sm" style="margin:0">صلاحيات العمل داخلها (مثل الإسناد والرد) من «الأدوار والصلاحيات».</p>
      <button class="btn">تم</button>${c.icon || S.labels[k] ? '<button type="button" class="btn ghost" id="rst">رجّع الافتراضي</button>' : ''}</form>`, b => {
      b.querySelector('form').onsubmit = e => {
        e.preventDefault(); const d = formData(e.target);
        if (d.label && d.label !== MODS[k]) S.labels[k] = d.label; else delete S.labels[k];
        S.d.core[k] = { icon: d.icon || undefined, perm: { view: d.view } }; dirty(); $('dlg').close(); done();
      };
      if (b.querySelector('#rst')) b.querySelector('#rst').onclick = () => { delete S.labels[k]; delete S.d.core[k]; dirty(); $('dlg').close(); done(); };
    });
  }

  function typeDlg(k, done) {
    const isNew = !k;
    const d = isNew ? { key: rid('c_'), label: '', icon: 'file', group: 'خاص بالجهة', status: ['جديد', 'قيد التنفيذ', 'منجز'], fields: [{ k: 'title', l: 'العنوان', t: 'text', req: true, list: true }, { k: 'date', l: 'التاريخ', t: 'date', list: true }, { k: 'notes', l: 'ملاحظات', t: 'textarea' }], perm: { view: 'all', add: 'all', edit: 'all' }, portal: false, home: true, custom: true } : defOf(k);
    let F = d.fields.map(f => ({ ...f }));
    const fieldRows = () => F.map((f, i) => `<div class="fe" data-i="${i}"><div class="r1"><input class="fl" value="${esc(f.l)}" placeholder="اسم الحقل" aria-label="اسم الحقل"><select class="ft" aria-label="نوع الحقل">${opt(FT, f.t || 'text')}</select></div>
      <input class="fo" value="${esc((f.o || []).join('، '))}" placeholder="الخيارات، افصل بينها بفاصلة"${f.t === 'select' ? '' : ' hidden'}>
      <div class="r2"><label><input type="checkbox" class="fr"${f.req ? ' checked' : ''}>مطلوب</label><label><input type="checkbox" class="fs"${f.list ? ' checked' : ''}>يظهر في القائمة</label><span style="flex:1"></span>
      <button type="button" class="ib" data-fu${i === 0 ? ' disabled' : ''} aria-label="لأعلى">↑</button><button type="button" class="ib" data-fd${i === F.length - 1 ? ' disabled' : ''} aria-label="لأسفل">↓</button><button type="button" class="ib" data-fx aria-label="حذف الحقل">✕</button></div></div>`).join('');
    const sync = b => { b.querySelectorAll('.fe').forEach(r => { const f = F[+r.dataset.i]; f.l = r.querySelector('.fl').value.trim(); f.t = r.querySelector('.ft').value; f.o = r.querySelector('.fo').value.split(/[،,]/).map(s => s.trim()).filter(Boolean); f.req = r.querySelector('.fr').checked; f.list = r.querySelector('.fs').checked; }); };
    const rolesBox = () => `<div class="xg" id="rolesBox">${roleOpts().map(([id, n]) => `<label><input type="checkbox" name="r_${id}"${(d.perm.roles || []).includes(id) ? ' checked' : ''}><span>${esc(n)}</span></label>`).join('')}</div>`;
    dialog(isNew ? 'نوع عمل جديد' : 'تصميم: ' + d.label, `<form class="form" id="tf">
      <label class="f"><span>الاسم</span><input name="label" value="${esc(d.label)}" required placeholder="مثال: طلبات الصيانة"></label>
      <div class="f"><span>الأيقونة</span>${iconGrid(d.icon)}</div>
      <div class="f"><span>الحقول</span><div id="fRows" style="display:grid;gap:8px">${fieldRows()}</div><button type="button" class="btn ghost sm" id="fAdd" style="justify-self:start">+ حقل</button></div>
      <label class="f"><span>الحالات (بالترتيب، افصل بفاصلة)</span><input name="status" value="${esc(d.status.join('، '))}" required></label>
      <div class="f"><span>الصلاحيات</span><div class="g2">
        <label class="f"><span class="muted sm">من يشوف</span><select name="pv">${opt(['all', 'admin', 'roles'].map(x => [x, LV[x]]), d.perm.view)}</select></label>
        <label class="f"><span class="muted sm">من يضيف</span><select name="pa">${opt(['all', 'admin', 'roles'].map(x => [x, LV[x]]), d.perm.add)}</select></label></div>
        <label class="f"><span class="muted sm">من يعدّل ويحذف</span><select name="pe">${opt(['all', 'own', 'admin', 'roles'].map(x => [x, LV[x]]), d.perm.edit)}</select></label>
        <div id="rolesWrap"${[d.perm.view, d.perm.add, d.perm.edit].includes('roles') ? '' : ' hidden'}><span class="muted sm">الأدوار المسموح لها</span>${rolesBox()}</div></div>
      <label class="tog" style="border:0;padding:0"><span>يظهر في الرئيسية</span><input type="checkbox" name="home"${d.home ? ' checked' : ''}></label>
      <label class="tog" style="border:0;padding:0"><span>متاح للعملاء في البوابة (يرسلون عليه نموذج)</span><input type="checkbox" name="portal"${d.portal ? ' checked' : ''}></label>
      <button class="btn">${isNew ? 'إنشاء النوع' : 'تم'}</button>
      ${!isNew && d.custom ? '<button type="button" class="btn bad" id="tDel">حذف النوع</button>' : ''}${!isNew && !d.custom && d.changed ? '<button type="button" class="btn ghost" id="tRst">رجّع التصميم الافتراضي</button>' : ''}</form>`, b => {
      const fr = b.querySelector('#fRows');
      const redraw = () => { fr.innerHTML = fieldRows(); };
      fr.addEventListener('change', e => { if (e.target.matches('.ft')) { const r = e.target.closest('.fe'); r.querySelector('.fo').hidden = e.target.value !== 'select'; } });
      fr.addEventListener('click', e => {
        const r = e.target.closest('.fe'); if (!r) return; const i = +r.dataset.i; sync(b);
        if (e.target.closest('[data-fx]')) { if (F.length < 2) return toast('لازم حقل واحد على الأقل'); F.splice(i, 1); redraw(); }
        else if (e.target.closest('[data-fu]') && i > 0) { [F[i - 1], F[i]] = [F[i], F[i - 1]]; redraw(); }
        else if (e.target.closest('[data-fd]') && i < F.length - 1) { [F[i + 1], F[i]] = [F[i], F[i + 1]]; redraw(); }
      });
      b.querySelector('#fAdd').onclick = () => { sync(b); if (F.length >= 40) return; F.push({ k: rid('f'), l: '', t: 'text' }); redraw(); fr.lastElementChild.querySelector('.fl').focus(); };
      b.querySelectorAll('[name=pv],[name=pa],[name=pe]').forEach(s => s.onchange = () => { b.querySelector('#rolesWrap').hidden = ![...b.querySelectorAll('[name=pv],[name=pa],[name=pe]')].some(x => x.value === 'roles'); });
      b.querySelector('#tf').onsubmit = e => {
        e.preventDefault(); sync(b); const v = formData(e.target);
        const fields = F.filter(f => f.l).map(f => ({ k: f.k, l: f.l.slice(0, 40), t: f.t, ...(f.t === 'select' ? { o: f.o } : {}), req: !!f.req, list: !!f.list }));
        if (!fields.length) return toast('أضف حقل واحد على الأقل');
        if (fields.some(f => f.t === 'select' && !(f.o || []).length)) return toast('اكتب خيارات قائمة الاختيار');
        const status = v.status.split(/[،,]/).map(s => s.trim()).filter(Boolean).slice(0, 12); if (!status.length) return toast('اكتب حالة واحدة على الأقل');
        const roles = roleOpts().map(([id]) => id).filter(id => v['r_' + id]);
        const perm = { view: v.pv, add: v.pa, edit: v.pe, ...(roles.length ? { roles } : {}) };
        if ([v.pv, v.pa, v.pe].includes('roles') && !roles.length) return toast('اختر الأدوار المسموح لها');
        S.d.types[d.key] = { label: v.label.trim().slice(0, 40), icon: v.icon || 'file', group: d.group, fields, status, perm, portal: !!v.portal, home: !!v.home };
        if (isNew) { S.extra = [...new Set([...S.extra, d.key])]; S.d.order = [...rowKeys().filter(x => x !== 'm-' + d.key), 'm-' + d.key]; }
        dirty(); $('dlg').close(); done();
      };
      if (b.querySelector('#tDel')) b.querySelector('#tDel').onclick = e => {
        const t = e.currentTarget; if (!t.dataset.sure) { t.dataset.sure = 1; t.textContent = 'تأكيد الحذف؟ السجلات الموجودة تختفي من القائمة'; return; }
        delete S.d.types[d.key]; S.extra = S.extra.filter(x => x !== d.key); S.d.order = S.d.order.filter(x => x !== 'm-' + d.key); dirty(); $('dlg').close(); done();
      };
      if (b.querySelector('#tRst')) b.querySelector('#tRst').onclick = () => { delete S.d.types[d.key]; dirty(); $('dlg').close(); done(); };
    });
  }

  function libDlg(done) {
    const groups = [...new Set(CAT.map(c => c.group))], on = new Set(S.extra);
    dialog('مكتبة أنواع العمل', `<form class="form">
      <label class="f"><span>قطاع الجهة</span><select name="sector" id="lSec">${opt(Object.keys(SECT).map(s => [s, s]), S.sector)}</select></label>
      <p class="muted sm" style="margin:-4px 0 0">اختيار القطاع يفعّل الأنواع المناسبة له، وتقدر تعدّل بنفسك.</p>
      ${groups.map(g => `<div class="grp">${esc(g)}</div><div class="xg">${CAT.filter(c => c.group === g).map(c => `<label><input type="checkbox" name="x_${c.key}"${on.has(c.key) ? ' checked' : ''}>${X.icon(c.key)}<span>${esc(defOf(c.key).label)}</span></label>`).join('')}</div>`).join('')}
      <button class="btn">تم</button></form>`, b => {
      b.querySelector('#lSec').onchange = e => { (SECT[e.target.value] || []).forEach(k => { const i = b.querySelector(`[name="x_${k}"]`); if (i) i.checked = true; }); };
      b.querySelector('form').onsubmit = e => {
        e.preventDefault(); const v = formData(e.target); S.sector = v.sector;
        const lib = CAT.map(c => c.key).filter(k => v['x_' + k]);
        S.extra = [...new Set([...S.extra.filter(k => !X.CAT_M[k]), ...S.extra.filter(k => lib.includes(k)), ...lib])];
        dirty(); $('dlg').close(); done();
      };
    });
  }

  function roleDlg(id, done) {
    const isMember = id === 'member', r = isMember ? { name: 'موظف (افتراضي)', perms: { ...MEMBER_DEF, ...(S.d.member || {}) } } : id ? S.d.roles.find(x => x.id === id) : { name: '', perms: { ...MEMBER_DEF } };
    dialog(isMember ? 'صلاحيات الموظف الافتراضية' : id ? 'دور: ' + r.name : 'دور جديد', `<form class="form">
      ${isMember ? '<p class="muted sm" style="margin:0">تنطبق على كل موظف ما له دور محدد.</p>' : `<label class="f"><span>اسم الدور</span><input name="name" value="${esc(r.name)}" required placeholder="مثال: منسق، مشرف قسم، مدخل بيانات"></label>`}
      <div class="caps">${CAPS.map(([k, l, s]) => `<label><input type="checkbox" name="c_${k}"${r.perms[k] ? ' checked' : ''}><span><b>${l}</b><small>${s}</small></span></label>`).join('')}</div>
      <button class="btn">تم</button>${id && !isMember ? '<button type="button" class="btn bad" id="rDel">حذف الدور</button>' : ''}</form>`, b => {
      b.querySelector('form').onsubmit = e => {
        e.preventDefault(); const v = formData(e.target); const perms = Object.fromEntries(CAPS.map(([k]) => [k, !!v['c_' + k]]));
        if (isMember) S.d.member = perms;
        else if (id) Object.assign(r, { name: v.name.trim().slice(0, 40), perms });
        else S.d.roles.push({ id: rid('r_'), name: v.name.trim().slice(0, 40), perms });
        dirty(); $('dlg').close(); done();
      };
      if (b.querySelector('#rDel')) b.querySelector('#rDel').onclick = e => {
        const t = e.currentTarget; if (!t.dataset.sure) { t.dataset.sure = 1; t.textContent = 'تأكيد؟ موظفينه يرجعون للصلاحيات الافتراضية'; return; }
        S.d.roles = S.d.roles.filter(x => x.id !== id); dirty(); $('dlg').close(); done();
      };
    });
  }
})();
