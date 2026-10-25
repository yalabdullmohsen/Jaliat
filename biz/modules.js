/* إنجاز أعمال — أنواع العمل (الكتالوج) + استيراد عمل الجهة من ملف
   يُحمَّل بعد السكربت الرئيسي ويضيف عليه بدون تعديل منطقه الأساسي. */
(() => {
  const CAT = window.BIZ_CATALOG || [], SECT = window.BIZ_SECTORS || {};
  const CAT_M = Object.fromEntries(CAT.map(c => [c.key, c]));
  let CM = { ...CAT_M };
  // تعريف كل نوع = الكتالوج + تصميم الجهة (أو نوع خاص صممته الجهة)
  const rebuild = () => {
    CM = { ...CAT_M };
    for (const [k, d] of Object.entries(ORG?.design?.types || {})) {
      const b = CAT_M[k] || { group: 'خاص بالجهة', icon: 'file', fields: [], status: ['جديد'] };
      CM[k] = { ...b, ...d, key: k, group: d.group || b.group, icon: d.icon || b.icon, fields: d.fields?.length ? d.fields : b.fields, status: d.status?.length ? d.status : b.status, custom: !CAT_M[k] };
    }
  };
  const lvlOk = (p, l, r) => l === 'all' || l == null || (l === 'own' && r && r.created_by === ME.id) || (l === 'roles' && (p.roles || []).includes(ME.prole || 'member'));
  const canR = (k, act, r) => isAdmin() || !!ME?.perms?.records || lvlOk(CM[k]?.perm || {}, (CM[k]?.perm || {})[act], r);
  const extras = () => (ORG && Array.isArray(ORG.extra) ? ORG.extra.filter(k => CM[k] && canR(k, 'view')) : []);
  const mlabel = k => ORG?.design?.types?.[k]?.label || (ORG?.labels?.[k]) || CM[k]?.label || k;
  const coreOk = k => isAdmin() || (ORG?.design?.core?.[k]?.perm?.view || 'all') === 'all';
  const ordered = keys => { const o = ORG?.design?.order || []; const ix = k => { const i = o.indexOf(k); return i < 0 ? 999 : i; }; return [...keys].sort((a, b) => ix(a) - ix(b)); };
  const GI = {
    gavel: '<path d="M14 4l6 6M12 6l6 6M5 19l7-7M9 9l6 6"/><path d="M3 21h8"/>', bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.6c2 .7 3.2 2.5 3.5 5.4"/>',
    pulse: '<path d="M3 12h4l2-6 4 12 2-6h6"/>', search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
    check: '<path d="M4 12l5 5L20 6"/>', layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    message: '<path d="M4 4h16v12H8l-4 4z"/>', receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>', file: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>', wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 13h2M3 10h18"/>', box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
    badge: '<circle cx="12" cy="9" r="6"/><path d="M9 14l-2 7 5-3 5 3-2-7"/>', calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', book: '<path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-4a3 3 0 0 0-3 3"/>',
    star: '<path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9z"/>', truck: '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  };
  const icon = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${GI[CM[k]?.icon] || GI.file}</svg>`;
  const fmtVal = (f, v) => v == null || v === '' ? '' : f.t === 'date' ? fmtD(v) : f.t === 'number' ? Number(v).toLocaleString('en') : String(v);
  const toneOf = (c, s) => { const i = c.status.indexOf(s); return i === 0 ? 'new' : i === c.status.length - 1 ? 'done' : 'doing'; };
  const css = `
  .xg{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
  .xg label{display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:12px;padding:10px;background:var(--surface-2);cursor:pointer;font-weight:600;font-size:.9rem}
  .xg label:has(input:checked){border-color:var(--accent);background:var(--surface);color:var(--accent-fg)}
  .xg input{accent-color:var(--accent);width:18px;height:18px;flex:none}
  .xg svg,.mrow svg{width:20px;height:20px;flex:none}
  .grp{font-size:.8rem;font-weight:700;color:var(--muted);margin:10px 0 6px}
  .mrow{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid var(--line);cursor:pointer}
  .mrow:first-child{border-top:0}
  .mrow .ic{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent-fg);flex:none}
  .mrow .tx{flex:1;min-width:0}.mrow b{display:block}.mrow .sub{font-size:.84rem;color:var(--muted)}
  .cnt{font-weight:700;font-variant-numeric:tabular-nums;color:var(--muted)}
  .drop{border:2px dashed color-mix(in srgb,var(--accent) 45%,var(--line));border-radius:14px;padding:22px 14px;text-align:center;display:grid;gap:8px;justify-items:center;background:color-mix(in srgb,var(--accent) 5%,var(--surface));cursor:pointer}
  .drop b{font-size:1.05rem}.drop svg{width:34px;height:34px;color:var(--accent-fg)}
  .drop.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--surface))}
  .pv{display:grid;gap:8px}
  .pv label{display:flex;align-items:flex-start;gap:10px;border:1px solid var(--line);border-radius:12px;padding:10px 12px}
  .pv input{margin-top:4px;accent-color:var(--accent);width:18px;height:18px;flex:none}
  .pv .s{font-size:.82rem;color:var(--muted);display:block;margin-top:2px;overflow-wrap:anywhere}
  .aibox{background:color-mix(in srgb,var(--accent) 8%,var(--surface));border-radius:12px;padding:12px;font-size:.92rem}
  .stline{display:flex;gap:6px;flex-wrap:wrap}
  .spin{display:inline-block;width:16px;height:16px;border:2.5px solid currentColor;border-inline-end-color:transparent;border-radius:50%;animation:spn .8s linear infinite;vertical-align:-3px}
  @keyframes spn{to{transform:rotate(360deg)}}
  .hero-imp{display:flex;gap:14px;align-items:center}
  .hero-imp .tx{flex:1;min-width:0}
  @media (max-width:520px){.hero-imp{flex-direction:column;align-items:stretch;text-align:center}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ---------- التنقل ---------- */
  const desk = matchMedia('(min-width:1000px)');
  const coreIcon = k => GI[ORG?.design?.core?.[k]?.icon] || IC[k];
  renderNav = function () {
    rebuild();
    const m = ORG.modules || {};
    let keys = ['tasks', 'bookings', 'requests'].filter(k => m[k] && coreOk(k));
    if (desk.matches) keys = keys.concat(extras().map(k => 'm-' + k));
    keys = ordered(keys);
    if (!desk.matches) keys = keys.slice(0, 3);
    const items = [['home', 'الرئيسية', IC.home]].concat(keys.map(k => k.startsWith('m-') ? [k, mlabel(k.slice(2)), GI[CM[k.slice(2)].icon] || GI.file] : [k, label(k), coreIcon(k)]));
    items.push(['more', 'المزيد', IC.more]);
    const inMore = !items.some(([k]) => k === VIEW);
    $('nav').innerHTML = items.map(([k, l, ic]) => `<button type="button" data-go="${k}"${VIEW === k || (k === 'more' && inMore) ? ' aria-current="page"' : ''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ic}</svg><span>${esc(l)}</span></button>`).join('');
    const lg = $('orgLogo'); if (lg) lg.src = ORG?.design?.logo || 'logo-180.png';
  };
  desk.addEventListener?.('change', () => ME && renderNav());
  const _go = go;
  go = async function (v) {
    if (typeof v === 'string' && v.startsWith('m-')) {
      rebuild(); const k = v.slice(2); if (!CM[k]) return _go('home');
      VIEW = v; if (location.hash.slice(1) !== v) history.replaceState(null, '', '#' + v); renderNav();
      const el = $('view'); el.innerHTML = '<p class="empty">جارٍ التحميل…</p>';
      try { await modView(el, k); } catch (e) { el.innerHTML = `<p class="empty">${esc(e.message)}</p>`; }
      window.scrollTo(0, 0); return;
    }
    return _go(v);
  };

  /* ---------- شاشة نوع العمل ---------- */
  const shown = c => { const l = c.fields.filter(f => f.list); return l.length ? l.slice(0, 4) : c.fields.slice(0, 3); };
  const fv = (f, v) => f.t === 'yesno' ? (v === true || v === 'نعم' ? 'نعم' : v === false || v === 'لا' ? 'لا' : '') : fmtVal(f, v);
  async function modView(el, k) {
    const c = CM[k]; const rows = (await call('rec_list', { module: k })).rows;
    let q = '', f = 'all';
    const draw = () => {
      const items = rows.filter(r => (f === 'all' || r.status === f) && (!q || JSON.stringify(r.data).includes(q)));
      const counts = Object.fromEntries(c.status.map(s => [s, rows.filter(r => r.status === s).length]));
      const [f1, ...fr] = shown(c);
      el.innerHTML = `<div class="h"><h2>${esc(mlabel(k))}</h2>${canR(k, 'add') ? '<button class="btn sm" id="addR">+ إضافة</button>' : ''}</div>
        <div class="seg" id="sf"><button type="button" data-f="all" aria-pressed="${f === 'all'}">الكل (${rows.length})</button>${c.status.map(s => `<button type="button" data-f="${esc(s)}" aria-pressed="${f === s}">${esc(s)} (${counts[s] || 0})</button>`).join('')}</div>
        <input id="rq" placeholder="ابحث" value="${esc(q)}" style="padding:11px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface)">
        <section class="card"><div class="list">${items.map(r => `<div class="row" data-rid="${r.id}" style="cursor:pointer"><div class="tx"><b>${esc((f1 && fv(f1, r.data[f1.k])) || r.data._from || '—')}</b><div class="sub">${esc([r.source === 'portal' ? 'من البوابة' + (r.data._from ? ': ' + r.data._from : '') : '', ...fr.map(x => fv(x, r.data[x.k]))].filter(Boolean).join(' · '))}</div></div><span class="pill p-${toneOf(c, r.status)}">${esc(r.status || '')}</span></div>`).join('') || `<p class="empty">ما فيه ${esc(mlabel(k))} بعد.${canR(k, 'add') ? ' أضف أول واحد، أو ارفع ملف ونرتبه لك.' : ''}</p>`}</div></section>`;
      $('sf').onclick = e => { const b = e.target.closest('[data-f]'); if (b) { f = b.dataset.f; draw(); } };
      $('rq').oninput = e => { q = e.target.value.trim(); const p = e.target.selectionStart; draw(); $('rq').focus(); $('rq').setSelectionRange(p, p); };
      if ($('addR')) $('addR').onclick = () => recForm(k);
      el.querySelectorAll('[data-rid]').forEach(x => x.onclick = () => recForm(k, rows.find(r => r.id === x.dataset.rid)));
    };
    draw();
  }
  function recForm(k, r) {
    const c = CM[k], ro = r ? !canR(k, 'edit', r) : !canR(k, 'add');
    const dis = ro ? ' disabled' : '';
    const inp = fd => {
      const v = r?.data?.[fd.k] ?? '', rq = fd.req ? ' required' : '';
      if (fd.t === 'textarea') return `<textarea name="${fd.k}"${rq}${dis}>${esc(v)}</textarea>`;
      if (fd.t === 'select') return `<select name="${fd.k}"${rq}${dis}>${opt((fd.o || []).map(x => [x, x]), v, '—')}</select>`;
      if (fd.t === 'yesno') return `<select name="${fd.k}"${rq}${dis}>${opt([['نعم', 'نعم'], ['لا', 'لا']], v === true ? 'نعم' : v === false ? 'لا' : v, '—')}</select>`;
      const ty = { number: 'number', date: 'date', phone: 'tel', email: 'email' }[fd.t] || 'text';
      return `<input name="${fd.k}" type="${ty}"${['number', 'phone', 'email'].includes(fd.t) ? ' dir="ltr"' : ''}${fd.t === 'number' ? ' step="any"' : ''} value="${esc(v)}"${rq}${dis}>`;
    };
    const portal = r?.source === 'portal' ? `<div class="aibox">من بوابة العملاء: <b>${esc(r.data._from || '')}</b> <span dir="ltr">${esc(r.data._phone || '')}</span>${r.data._code ? ` · رقم الطلب <b dir="ltr">${esc(r.data._code)}</b>` : ''}</div>` : '';
    dialog(r ? mlabel(k) : 'إضافة — ' + mlabel(k), `<form class="form">${portal}${c.fields.map(fd => `<label class="f"><span>${esc(fd.l)}${fd.req ? ' *' : ''}</span>${inp(fd)}</label>`).join('')}
      <label class="f"><span>الحالة</span><select name="__st"${dis}>${opt(c.status.map(s => [s, s]), r?.status || c.status[0])}</select></label>
      ${r?.source === 'portal' ? `<label class="f"><span>الرد على العميل (يشوفه في «تابع طلبك»)</span><textarea name="__reply"${dis}>${esc(r.data._reply || '')}</textarea></label>` : ''}
      ${ro ? '<p class="muted sm" style="margin:0">عرض فقط، ما عندك صلاحية تعديل.</p>' : `<button class="btn">${r ? 'حفظ' : 'إضافة'}</button>${r ? '<button type="button" class="btn bad" id="delR">حذف</button>' : ''}`}</form>`,
      b => {
        b.querySelector('form').onsubmit = async e => {
          e.preventDefault(); if (ro) return; const d = formData(e.target), data = {};
          for (const fd of c.fields) if (d[fd.k] !== '' && d[fd.k] != null) data[fd.k] = fd.t === 'number' ? Number(d[fd.k]) : d[fd.k];
          if ('__reply' in d) data._reply = d.__reply;
          try { await call('rec_save', { module: k, row: { id: r?.id, data, status: d.__st } }); $('dlg').close(); toast('انحفظ ✓'); go('m-' + k); } catch (er) { toast(er.message); }
        };
        if (b.querySelector('#delR')) b.querySelector('#delR').onclick = async () => { if (!confirmDel()) return; try { await call('rec_remove', { id: r.id }); $('dlg').close(); go('m-' + k); } catch (er) { toast(er.message); } };
      });
  }
  const confirmDel = () => { const b = $('delR'); if (b.dataset.sure) return true; b.dataset.sure = 1; b.textContent = 'اضغط مرة ثانية للتأكيد'; return false; };

  /* ---------- المزيد + الرئيسية ---------- */
  const canImport = () => isAdmin() || !!ME?.perms?.import;
  const _more = VIEWS.more;
  VIEWS.more = async el => {
    await _more(el);
    const ex = ordered(extras().map(k => 'm-' + k)).map(k => k.slice(2)); let counts = {};
    try { counts = (await call('rec_counts')).counts; } catch {}
    const sec = document.createElement('section'); sec.className = 'card';
    sec.innerHTML = `<div class="h" style="margin-bottom:4px"><h2 style="font-size:1rem">أعمال الجهة</h2>${isAdmin() ? '<button class="link" data-go="design">+ صمّم وأضف</button>' : ''}</div>
      <div>${ex.map(k => `<div class="mrow" data-go="m-${k}"><span class="ic">${icon(k)}</span><div class="tx"><b>${esc(mlabel(k))}</b><div class="sub">${esc(CM[k].group || '')}</div></div><span class="cnt">${counts[k] || 0}</span></div>`).join('') || '<p class="empty">ما فيه أنواع عمل إضافية بعد.</p>'}</div>`;
    el.insertBefore(sec, el.children[1] || null);
    if (isAdmin()) { const d = document.createElement('section'); d.className = 'card'; d.innerHTML = `<div class="mrow" data-go="design" style="border:0"><span class="ic">${GI.layers}</span><div class="tx"><b>تصميم النظام</b><div class="sub">المزايا والحقول والترتيب والأدوار والصلاحيات والشعار</div></div><span class="muted">‹</span></div>`; el.insertBefore(d, el.children[1]); }
    if (canImport()) { const imp = document.createElement('section'); imp.className = 'card'; imp.innerHTML = importCardHTML(); el.insertBefore(imp, sec.nextSibling); wireImport(imp); }
  };
  const _home = VIEWS.home;
  VIEWS.home = async el => {
    await _home(el);
    const ex = ordered(extras().map(k => 'm-' + k)).map(k => k.slice(2)).filter(k => CM[k].home !== false); let counts = {};
    try { counts = (await call('rec_counts')).counts; } catch {}
    if (ex.length) {
      const g = document.createElement('section'); g.className = 'card';
      g.innerHTML = `<div class="h" style="margin-bottom:4px"><h2 style="font-size:1rem">أعمال الجهة</h2></div>${ex.slice(0, 10).map(k => `<div class="mrow" data-go="m-${k}"><span class="ic">${icon(k)}</span><div class="tx"><b>${esc(mlabel(k))}</b></div><span class="cnt">${counts[k] || 0}</span></div>`).join('')}`;
      const stats = el.querySelector('.stats'); el.insertBefore(g, stats ? stats.nextSibling : el.children[1]);
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (isAdmin() && total < 5) {
      const h = document.createElement('section'); h.className = 'card';
      h.innerHTML = `<div class="hero-imp"><div class="tx"><h2 style="margin:0 0 4px;font-size:1.05rem">ارفع ملف عملك، ونبني نظامك</h2><p class="muted sm" style="margin:0">إكسل، وورد، PDF، أو صورة. النظام يقرأه ويرتب منه الأقسام والمهام والقرارات والعملاء وغيرها.</p></div><button class="btn" data-go="import">ارفع ملف</button></div>`;
      el.insertBefore(h, el.children[1] || null);
    }
  };

  /* ---------- الإعدادات: رابط تصميم النظام ---------- */
  const _settings = VIEWS.settings;
  VIEWS.settings = async el => {
    await _settings(el);
    if (!isAdmin()) return;
    const sec = document.createElement('section'); sec.className = 'card';
    sec.innerHTML = `<div class="hero-imp"><div class="tx"><h2 style="margin:0 0 4px;font-size:1.05rem">تصميم النظام</h2><p class="muted sm" style="margin:0">فعّل المزايا ورتبها، صمّم أنواع عمل بحقولها، وحدد أدوار الموظفين وصلاحياتهم (مثل إسناد المهام).</p></div><button class="btn" data-go="design">افتح التصميم</button></div>`;
    const orgF = $('orgF'); orgF.parentNode.insertBefore(sec, orgF);
    const imp = document.createElement('section'); imp.className = 'card'; imp.innerHTML = importCardHTML(); orgF.parentNode.insertBefore(imp, orgF.nextSibling); wireImport(imp);
  };
  VIEWS.import = async el => { el.innerHTML = `<h2 style="margin:0">ارفع ملف عملك</h2><section class="card">${importCardHTML(true)}</section>`; wireImport(el); };
  window.BIZX = { get CM() { return CM; }, CAT_M, GI, rebuild, icon: k => icon(k), mlabel };

  /* ---------- استيراد الملف ---------- */
  function importCardHTML(big) {
    return `<h2 style="margin:0 0 6px;font-size:1rem">${big ? '' : 'استيراد عمل الجهة من ملف'}</h2>
      <label class="drop" data-drop><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>
        <b>اختر ملف عمل الجهة</b><span class="muted sm">إكسل، CSV، وورد، PDF، نص، أو صورة</span>
        <input type="file" hidden data-file accept=".xlsx,.xls,.csv,.tsv,.ods,.docx,.pdf,.txt,.md,.json,.png,.jpg,.jpeg,.webp"></label>
      <p class="muted sm" style="margin:8px 0 0" data-aiinfo></p>`;
  }
  let AI = null;
  async function aiOn() { if (AI === null) { try { AI = (await call('ai_status')).ai; } catch { AI = false; } } return AI; }
  function wireImport(root) {
    const drop = root.querySelector('[data-drop]'), inp = root.querySelector('[data-file]'), info = root.querySelector('[data-aiinfo]');
    aiOn().then(on => { info.textContent = on ? 'القراءة بالذكاء الاصطناعي مفعّلة: يفهم أي ملف، حتى الكلام الحر والصور.' : 'القراءة الحالية مجانية: ممتازة للجداول (إكسل وCSV)، والذكاء الاصطناعي يتفعّل لاحقًا للملفات الحرة والصور.'; });
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('on'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('on'));
    drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('on'); if (e.dataTransfer.files[0]) handle(e.dataTransfer.files[0]); });
    inp.addEventListener('change', () => { if (inp.files[0]) handle(inp.files[0]); inp.value = ''; });
  }
  const loadJS = (src) => new Promise((ok, no) => { if (document.querySelector(`script[src="${src}"]`)) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('ما قدرت أحمّل أداة قراءة الملف، تأكد من الإنترنت')); document.head.appendChild(s); });
  async function extract(file) {
    const n = file.name.toLowerCase(), ext = n.split('.').pop();
    if (file.size > 25 * 1024 * 1024) throw new Error('الملف أكبر من 25 ميجا');
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
      const data = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = no; r.readAsDataURL(file); });
      return { kind: 'image', images: [{ media_type: file.type || 'image/jpeg', data }], text: '' };
    }
    if (['xlsx', 'xls', 'ods', 'csv', 'tsv'].includes(ext)) {
      await loadJS('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const sheets = wb.SheetNames.map(sn => ({ name: sn, rows: XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: false, dateNF: 'yyyy-mm-dd', defval: '' }).filter(r => r.some(c => String(c).trim())) })).filter(s => s.rows.length);
      const text = sheets.map(s => `# ${s.name}\n` + s.rows.slice(0, 3000).map(r => r.join(' | ')).join('\n')).join('\n\n');
      return { kind: 'sheet', sheets, text };
    }
    if (ext === 'docx') {
      await loadJS('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js');
      const r = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      return { kind: 'text', text: r.value };
    }
    if (ext === 'pdf') {
      await loadJS('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise; let text = '';
      for (let i = 1; i <= Math.min(pdf.numPages, 80); i++) { const pg = await pdf.getPage(i); const tc = await pg.getTextContent(); text += tc.items.map(x => x.str).join(' ') + '\n'; }
      return { kind: 'text', text };
    }
    return { kind: 'text', text: await file.text() };
  }

  // ---- القراءة المجانية: تتعرف على الجداول من عناوين الأعمدة ----
  const CORE = [
    { key: 'clients', label: label('clients'), fields: [{ k: 'name', a: ['اسم العميل', 'العميل', 'الاسم', 'اسم', 'client', 'customer', 'name', 'الشركة', 'الجهة'] }, { k: 'phone', a: ['هاتف', 'الهاتف', 'جوال', 'موبايل', 'phone', 'mobile', 'tel'] }, { k: 'email', a: ['بريد', 'ايميل', 'إيميل', 'email', 'e-mail'] }, { k: 'notes', a: ['ملاحظات', 'notes'] }] },
    { key: 'tasks', label: label('tasks'), fields: [{ k: 'title', a: ['المهمة', 'مهمة', 'task', 'العمل', 'الإجراء', 'المعاملة', 'موضوع', 'title'] }, { k: 'details', a: ['التفاصيل', 'تفاصيل', 'الوصف', 'details', 'description'] }, { k: 'due', a: ['الموعد', 'موعد', 'تاريخ الاستحقاق', 'due', 'deadline'] }, { k: 'status', a: ['الحالة', 'حالة', 'status'] }, { k: 'assignee', a: ['المسؤول', 'المكلف', 'المكلّف', 'assignee', 'owner'] }, { k: 'dept', a: ['القسم', 'قسم', 'الإدارة', 'department'] }] },
    { key: 'resources', label: 'القاعات والموارد', fields: [{ k: 'name', a: ['القاعة', 'قاعة', 'المورد', 'الغرفة', 'room', 'hall', 'resource'] }, { k: 'kind', a: ['النوع', 'نوع', 'type'] }] },
    { key: 'news', label: label('news'), fields: [{ k: 'title', a: ['التعميم', 'الإعلان', 'العنوان', 'announcement'] }, { k: 'body', a: ['النص', 'المحتوى', 'body'] }] },
  ];
  const norm = s => String(s || '').toLowerCase().replace(/[ًٌٍَُِّْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim();
  const defs = () => CORE.concat(Object.values(CM).map(c => ({ key: c.key, label: c.label, rec: true, fields: c.fields.map(f => ({ k: f.k, a: f.a || [f.l], t: f.t })) })));
  function mapHeaders(hdr, def) {
    const used = new Set(), map = {};
    for (const f of def.fields) {
      let best = -1, bs = 0;
      hdr.forEach((h, i) => { if (used.has(i)) return; const H = norm(h); for (const a of f.a) { const A = norm(a); if (!A) continue; const sc = H === A ? 3 : H.includes(A) ? 2 : A.includes(H) && H.length > 2 ? 1 : 0; if (sc > bs) { bs = sc; best = i; } } });
      if (best >= 0) { map[f.k] = best; used.add(best); }
    }
    return map;
  }
  const STMAP = s => { const x = norm(s); if (/منجز|مكتمل|تم|done|complete|closed|مغلق/.test(x)) return 'done'; if (/جار|قيد|in ?progress|doing|متابع/.test(x)) return 'doing'; return 'new'; };
  const toISO = v => { if (!v) return ''; const s = String(v).trim(); let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`; m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/); if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; } const d = new Date(s); return isNaN(d) ? '' : d.toISOString().slice(0, 10); };
  function freeAnalyze(x, fileName) {
    const plan = { summary: '', depts: [], resources: [], clients: [], tasks: [], news: [], records: {}, extra_modules: [] };
    const D = defs(), seen = [];
    if (x.kind === 'sheet') {
      for (const sh of x.sheets) {
        // سطر العناوين: أول سطر فيه أكثر من خانتين نصيتين
        let hi = sh.rows.findIndex(r => r.filter(c => String(c).trim() && isNaN(Number(c))).length >= 2); if (hi < 0) hi = 0;
        const hdr = sh.rows[hi].map(String), body = sh.rows.slice(hi + 1);
        let best = null, bestN = 0, bestMap = null;
        for (const d of D) { const mp = mapHeaders(hdr.concat([sh.name]).slice(0, hdr.length), d); const n = Object.keys(mp).length + (norm(sh.name).includes(norm(d.label).split(' ')[0]) ? 1 : 0); if (n > bestN) { best = d; bestN = n; bestMap = mp; } }
        if (!best || bestN < 1 || !Object.keys(bestMap).length) continue;
        const get = (r, k) => bestMap[k] != null ? String(r[bestMap[k]] ?? '').trim() : '';
        const rows = body.filter(r => r.some(c => String(c).trim()));
        if (best.rec) {
          const c = CM[best.key]; const stCol = hdr.findIndex(h => /حال|status/i.test(h));
          plan.records[best.key] = (plan.records[best.key] || []).concat(rows.map(r => { const data = {}; for (const f of best.fields) { let v = get(r, f.k); if (!v) continue; if (f.t === 'date') v = toISO(v); if (f.t === 'number') { const n = Number(String(v).replace(/[^\d.\-]/g, '')); if (isFinite(n)) v = n; } data[f.k] = v; } const sv = stCol >= 0 ? String(r[stCol] || '').trim() : ''; return { data, status: c.status.includes(sv) ? sv : c.status[STMAP(sv) === 'done' ? c.status.length - 1 : STMAP(sv) === 'doing' ? Math.min(1, c.status.length - 1) : 0] }; }).filter(o => Object.keys(o.data).length));
          plan.extra_modules.push(best.key);
        } else if (best.key === 'clients') plan.clients.push(...rows.map(r => ({ name: get(r, 'name'), phone: get(r, 'phone'), email: get(r, 'email'), notes: get(r, 'notes') })).filter(o => o.name));
        else if (best.key === 'tasks') plan.tasks.push(...rows.map(r => ({ title: get(r, 'title'), details: get(r, 'details'), due: toISO(get(r, 'due')), status: STMAP(get(r, 'status')), assignee: get(r, 'assignee'), dept: get(r, 'dept') })).filter(o => o.title));
        else if (best.key === 'resources') plan.resources.push(...rows.map(r => ({ name: get(r, 'name'), kind: get(r, 'kind') })).filter(o => o.name));
        else if (best.key === 'news') plan.news.push(...rows.map(r => ({ title: get(r, 'title'), body: get(r, 'body') })).filter(o => o.title));
        seen.push(`«${sh.name}» ← ${best.label}`);
        // أي عمود «القسم» يضيف الأقسام
        const dc = hdr.findIndex(h => /قسم|اداره|إدارة|department/i.test(norm(h))); if (dc >= 0) for (const r of rows) { const v = String(r[dc] || '').trim(); if (v) plan.depts.push({ name: v }); }
      }
    } else {
      // نص حر: نلتقط القرارات والتوصيات والبنود المرقمة
      const lines = x.text.split(/\n+/).map(s => s.trim()).filter(Boolean);
      for (const l of lines) {
        if (/^(قرار|القرار)\s*(رقم)?/.test(l)) (plan.records.decisions ||= []).push({ data: { title: l.slice(0, 300) }, status: 'ساري' });
        else if (/توصي/.test(l) && l.length < 400) (plan.records.recommendations ||= []).push({ data: { title: l.replace(/^[\-•*\d.)\s]+/, '').slice(0, 300) }, status: 'جديدة' });
        else if (/^(قسم|إدارة|ادارة)\s+\S+/.test(l) && l.length < 60) plan.depts.push({ name: l });
        else if (/^([\-•*]|\d+[.)\-])\s+/.test(l) && l.length < 300) plan.tasks.push({ title: l.replace(/^([\-•*]|\d+[.)\-])\s+/, ''), status: 'new' });
      }
      Object.keys(plan.records).forEach(k => plan.extra_modules.push(k));
    }
    // تخمين القطاع من الكلمات
    const T = norm((x.text || '') + ' ' + fileName);
    const guess = [['استثمار', /استثمار|محفظ|صندوق|عائد|اسهم/], ['جهة حكومية', /وزار|ديوان|حكوم|قرار وزاري|تعميم/], ['مقاولات وهندسة', /مقاول|مشروع انشائ|هندس|موقع العمل/], ['تعليم وتدريب', /مدرس|طلاب|تدريب|دوره/], ['صحة', /مستشف|عياد|مريض|طبي/], ['عقار', /عقار|ايجار|وحده سكني|مستاجر/], ['تجارة وتجزئة', /مخزون|صنف|مبيعات|فاتور/], ['جمعية خيرية وأهلية', /جمعيه|تبرع|خيري|متطوع/]].find(([, re]) => re.test(T));
    if (guess) { plan.sector = guess[0]; plan.extra_modules.push(...(SECT[guess[0]] || [])); }
    plan.depts = [...new Map(plan.depts.map(d => [d.name, d])).values()];
    plan.extra_modules = [...new Set(plan.extra_modules)];
    plan.summary = seen.length ? 'تعرّفت على: ' + seen.join('، ') : (x.kind === 'sheet' ? 'ما قدرت أتعرف على أعمدة الجدول.' : 'قرأت النص والتقطت البنود الواضحة منه.');
    return plan;
  }

  async function handle(file) {
    dialog('قراءة الملف', `<p><span class="spin"></span> جارٍ قراءة «${esc(file.name)}»…</p>`);
    let x; try { x = await extract(file); } catch (e) { $('dlgB').innerHTML = `<p class="err">${esc(e.message || 'ما قدرت أقرأ الملف')}</p>`; return; }
    const on = await aiOn();
    const free = x.kind === 'image' ? null : freeAnalyze(x, file.name);
    const useAI = async () => {
      $('dlgB').innerHTML = '<p><span class="spin"></span> الذكاء الاصطناعي يقرأ الملف ويبني نظامك… (قد ياخذ دقيقة)</p>';
      try { const r = await call('ai_import', { text: x.text, images: x.images, file_name: file.name, org_name: ORG.name, org_kind: KINDS[ORG.kind] }); preview(r.plan, true); }
      catch (e) { $('dlgB').innerHTML = `<p class="err">${esc(e.message)}</p>${free ? '<button class="btn ghost" id="useFree">استخدم القراءة المجانية</button>' : ''}`; if ($('useFree')) $('useFree').onclick = () => preview(free, false); }
    };
    if (on && (x.kind !== 'sheet' || !count(free))) return useAI();
    if (!free) { $('dlgB').innerHTML = '<p>الصور تحتاج الذكاء الاصطناعي، وهو غير مفعّل بعد. صدّر الملف إكسل أو وورد وارفعه.</p>'; return; }
    preview(free, false, on ? useAI : null);
  }
  const count = p => (p.depts?.length || 0) + (p.resources?.length || 0) + (p.clients?.length || 0) + (p.tasks?.length || 0) + (p.news?.length || 0) + Object.values(p.records || {}).reduce((a, l) => a + (l?.length || 0), 0);
  function preview(plan, ai, aiAlt) {
    plan = plan || {};
    const cats = [['depts', 'الأقسام', d => d.name], ['tasks', label('tasks'), t => t.title], ['clients', label('clients'), c => c.name], ['resources', 'القاعات والموارد', r => r.name], ['news', label('news'), n => n.title]]
      .map(([k, l, s]) => [k, l, (plan[k] || []).filter(Boolean), s]).concat(Object.entries(plan.records || {}).filter(([k]) => CM[k]).map(([k, list]) => ['r:' + k, CM[k].label, (list || []), o => { const d = o?.data || o; return d[CM[k].fields[0].k] || Object.values(d)[0] || ''; }]))
      .filter(c => c[2].length);
    const sugg = [plan.sector && `القطاع: ${plan.sector}`, (plan.extra_modules || []).filter(k => CM[k]).length && `أنواع عمل: ${(plan.extra_modules || []).filter(k => CM[k]).map(k => CM[k].label).join('، ')}`, plan.labels && Object.values(plan.labels).filter(v => v && String(v).trim()).length && `أسماء: ${Object.entries(plan.labels).filter(([, v]) => v && String(v).trim()).map(([, v]) => v).join('، ')}`].filter(Boolean);
    $('dlgT').textContent = ai ? 'هذا اللي فهمه الذكاء من ملفك' : 'هذا اللي قرأته من ملفك';
    $('dlgB').innerHTML = `<div class="form">
      ${plan.summary ? `<div class="aibox">${esc(plan.summary)}</div>` : ''}
      ${cats.length ? `<div class="pv">${cats.map(([k, l, list, s]) => `<label><input type="checkbox" data-cat="${k}" checked><span><b>${esc(l)}</b> — ${list.length}<span class="s">${esc(list.slice(0, 4).map(s).filter(Boolean).join('، '))}${list.length > 4 ? '…' : ''}</span></span></label>`).join('')}</div>` : '<p class="empty">ما لقيت بيانات أقدر أضيفها.</p>'}
      ${sugg.length ? `<label class="pv" style="display:block"><label><input type="checkbox" id="applySet" checked><span><b>طبّق إعدادات مقترحة</b><span class="s">${esc(sugg.join(' · '))}</span></span></label></label>` : ''}
      ${cats.length || sugg.length ? '<button class="btn" id="doImp">أضف للنظام</button>' : ''}
      ${aiAlt ? '<button class="btn ghost" id="tryAI">اقرأه بالذكاء الاصطناعي بدلًا من ذلك</button>' : ''}
    </div>`;
    if ($('tryAI')) $('tryAI').onclick = aiAlt;
    if ($('doImp')) $('doImp').onclick = async () => {
      const on = new Set([...$('dlgB').querySelectorAll('[data-cat]')].filter(i => i.checked).map(i => i.dataset.cat));
      const P = { ...plan, records: {} };
      for (const k of ['depts', 'tasks', 'clients', 'resources', 'news']) if (!on.has(k)) P[k] = [];
      for (const [k, list] of Object.entries(plan.records || {})) if (on.has('r:' + k)) P.records[k] = list;
      $('doImp').disabled = true; $('doImp').innerHTML = '<span class="spin"></span> جارٍ الإضافة…';
      try {
        const r = await call('import_apply', { plan: P, apply_settings: !!$('applySet')?.checked });
        if (r.org) { ORG = r.org; applyOrg(); }
        const me = await call('me'); ORG = me.org; DEPTS = me.depts; PEOPLE = me.people; renderNav();
        const total = Object.values(r.done || {}).reduce((a, b) => a + b, 0);
        $('dlg').close(); toast(`تمت إضافة ${total} عنصر ✓`); go('home');
      } catch (e) { toast(e.message); $('doImp').disabled = false; $('doImp').textContent = 'أضف للنظام'; }
    };
  }
})();
