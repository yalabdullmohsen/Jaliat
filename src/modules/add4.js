/* ================= v9.3: clear statistics + coordinators by community ================= */
const RUN = e => e.st === "جارٍ" || e.st === "ينتهي قريباً";
const khMos = () => { const s = new Set(); for (const k of S.khatibs.values()) s.add(nkey(k.mosque)); return s; };
const pct = (n, t) => t ? Math.round(n / t * 100) : 0;
function statTabs(cur){
  const T = [["all", "نظرة عامة"], ["comms", "الجاليات وفعالياتها"], ["mos", "المساجد ومواقعها"], ["acts", "تفاصيل الأنشطة"]];
  return `<div class="stabs">${T.map(([k, l]) => `<button type="button" data-stab="${k}" aria-pressed="${k === cur}">${l}</button>`).join("")}<button type="button" class="pr" onclick="window.print()">طباعة</button></div>`;
}
const kp = (l, n, c, sub) => `<div class="kpi"${c ? ` style="--k:var(--${c})"` : ""}><span>${l}</span><b>${n}</b>${sub ? `<small>${sub}</small>` : ""}</div>`;
function commRows(){
  const E = S.E;
  return commNames.map(c => { const L = E.filter(e => e.comm === c);
    const co = S.coords.filter(x => x.comm === c && x.status !== "سابق");
    return { c, L, t:TYPES.map(t => L.filter(e => e.type === t).length), run:L.filter(RUN).length, mos:new Set(L.map(e => e.mosque).filter(Boolean)).size,
      kh:[...S.khatibs.values()].filter(k => k.comm === c).length, coord:co.filter(x => x.role === "منسق").map(x => x.name), dep:co.filter(x => x.role !== "منسق").map(x => x.name),
      govs:[...new Set(L.map(e => e.gov).filter(Boolean))] };
  }).sort((a, b) => b.L.length - a.L.length || b.kh - a.kh);
}
function vStatsAll(){
  const E = S.E, run = E.filter(RUN).length;
  const mos = new Set(E.map(e => e.mosque).filter(Boolean)).size, lects = new Set(E.flatMap(e => e.names)).size;
  const activeC = new Set(E.map(e => e.comm).filter(Boolean)).size;
  const byType = TYPES.map(t => [t, E.filter(e => e.type === t).length]);
  const byGov = GOVS.map(g => [g, E.filter(e => e.gov === g).length]).sort((a, b) => b[1] - a[1]);
  const byDay = WEEK.map(d => [DAYS[d], E.filter(e => e.live && e.days.includes(d)).length]); const maxD = Math.max(1, ...byDay.map(r => r[1]));
  const slots = ["الفجر", "الصباح", "الجمعة", "العصر", "المغرب", "العشاء", "غير محدد"].map(s => [s, E.filter(e => slotName(e.time) === s).length]).filter(r => r[1]);
  const sts = ["جارٍ", "ينتهي قريباً", "قادم", "منتهٍ", "بلا تاريخ", "مكتمل", "مؤجل", "ملغى"].map(s => [s, E.filter(e => e.st === s).length]).filter(r => r[1]);
  return `<div class="kpis k6">${kp("كل الأنشطة", E.length)}${kp("الجارية الآن", run, "ok", pct(run, E.length) + "%")}${kp("المساجد المستخدمة", mos, "gold", `من ${S.mosques.length} مسجداً`)}
    ${kp("الجاليات النشطة", activeC, "t3", `من ${commNames.length} جالية`)}${kp("المحاضرون", lects, "t1")}${kp("مساجد خطبة الجمعة", S.khatibs.size, "t2")}</div>
  <div class="sgrid">
    <div class="panel"><div class="panel-h"><h3>حسب نوع النشاط</h3></div><div class="panel-b"><div class="tbig">${byType.map(([t, n]) => `<div class="tb ${TK[t]}"><b class="num">${n}</b><span>${esc(TPL[t])}</span><small>${pct(n, E.length)}%</small></div>`).join("")}</div></div></div>
    <div class="panel"><div class="panel-h"><h3>حسب الحالة</h3></div><div class="panel-b">${barList(sts, 0, k => ({ "جارٍ":"var(--ok)", "ينتهي قريباً":"var(--warn)", "منتهٍ":"var(--bad)", "بلا تاريخ":"var(--bad)", "قادم":"var(--gold)" }[k] || "var(--muted)"))}</div></div>
    <div class="panel"><div class="panel-h"><h3>حسب المحافظة</h3></div><div class="panel-b">${barList(byGov)}</div></div>
    <div class="panel"><div class="panel-h"><h3>حسب وقت الصلاة</h3></div><div class="panel-b">${barList(slots, 0, () => "var(--gold)")}</div></div>
  </div>
  <div class="panel"><div class="panel-h"><h3>الأنشطة الجارية خلال أيام الأسبوع</h3></div><div class="panel-b"><div class="vbars">
    ${byDay.map(([d, n]) => `<div class="vbar"><span class="num">${n}</span><span class="col" style="height:${n / maxD * 100}%"></span><span>${esc(d)}</span></div>`).join("")}</div></div></div>`;
}
function vStatsComms(){
  const R = commRows(); const mx = Math.max(1, ...R.map(r => r.L.length));
  const tot = TYPES.map((_, i) => R.reduce((s, r) => s + r.t[i], 0));
  return `<div class="panel"><div class="panel-h"><h3>الجاليات وفعالياتها</h3><span class="chip">${R.length} جالية</span><span class="legend">${TYPES.map(t => `<span><i class="dot ${TK[t]}"></i>${esc(TPL[t])}</span>`).join("")}</span></div>
  <div class="table-wrap"><table class="stbl"><thead><tr><th>الجالية</th><th>المنسق</th><th class="c">دروس</th><th class="c">دورات</th><th class="c">محاضرات</th><th>الإجمالي</th><th class="c">الجارية</th><th class="c">المساجد</th><th class="c">خطب الجمعة</th><th>المحافظات</th></tr></thead><tbody>
  ${R.map(r => `<tr data-comm="${esc(r.c)}"><td class="nm">${esc(r.c)}</td><td class="s2">${esc(r.coord.join("، ") || "—")}</td>
    ${r.t.map((n, i) => `<td class="c num">${n ? `<span class="pill t${i + 1}">${n}</span>` : `<span class="z">—</span>`}</td>`).join("")}
    <td><div class="mini"><span class="track">${r.t.map((n, i) => n ? `<i style="width:${n / mx * 100}%;background:var(--t${i + 1})"></i>` : "").join("")}</span><b class="num">${r.L.length}</b></div></td>
    <td class="c num">${r.run || `<span class="z">—</span>`}</td><td class="c num">${r.mos || `<span class="z">—</span>`}</td><td class="c num">${r.kh || `<span class="z">—</span>`}</td><td class="s2">${esc(r.govs.join("، ") || "—")}</td></tr>`).join("")}
  </tbody><tfoot><tr><td class="nm">المجموع</td><td></td>${tot.map(n => `<td class="c num">${n}</td>`).join("")}<td class="num"><b>${S.E.length}</b></td><td class="c num">${S.E.filter(RUN).length}</td><td class="c num">${new Set(S.E.map(e => e.mosque).filter(Boolean)).size}</td><td class="c num">${S.khatibs.size}</td><td></td></tr></tfoot></table></div></div>
  <p class="fine">اضغط على أي جالية لعرض أنشطتها ومساجدها بالتفصيل.</p>`;
}
function vStatsMos(){
  const q = nkey(S.f.smq || ""); const all = !!S.f.small; const KM = khMos();
  const use = {}; S.E.forEach(e => { if (!e.mosque) return; (use[e.mosque] = use[e.mosque] || []).push(e); });
  const rows = S.mosques.map(m => ({ m, L:use[m.id] || [], kh:KM.has(nkey(m.name)) })).filter(r => (all || r.L.length || r.kh) && (!q || nkey(m_txt(r.m)).includes(q)));
  function m_txt(m){ return m.name + " " + m.area + " " + m.gov; }
  const groups = GOVS.concat([""]).map(g => [g, rows.filter(r => (r.m.gov || "") === g).sort((a, b) => b.L.length - a.L.length || a.m.area.localeCompare(b.m.area, "ar"))]).filter(([, L]) => L.length);
  return `<div class="toolbar"><div class="search"><svg><use href="#i-search"/></svg><input id="smq" class="f" placeholder="ابحث عن مسجد أو منطقة…" value="${esc(S.f.smq || "")}" data-fk="smq"></div>
    <div class="seg" style="flex:none"><button type="button" data-small="0" aria-pressed="${!all}">المساجد المستخدمة</button><button type="button" data-small="1" aria-pressed="${all}">كل المساجد (${S.mosques.length})</button></div><span class="count">${rows.length} مسجد</span></div>
  <div class="govs">${groups.map(([g, L]) => `<div class="panel"><div class="panel-h"><h3>${esc(g || "محافظة غير محددة")}</h3><span class="chip">${L.length} مسجد</span><span class="chip ok">${L.reduce((s, r) => s + r.L.length, 0)} نشاط</span></div>
    <div class="table-wrap"><table class="stbl"><thead><tr><th>المسجد</th><th>المنطقة</th><th class="c">الأنشطة</th><th>الجاليات</th><th class="c">جمعة</th></tr></thead><tbody>
    ${L.map(r => `<tr data-open="mos:${esc(r.m.id)}"><td class="nm">مسجد ${esc(r.m.name)}</td><td class="s2">${esc(r.m.area || "—")}</td><td class="c num">${r.L.length ? `<span class="pill">${r.L.length}</span>` : `<span class="z">—</span>`}</td>
      <td class="s2">${esc([...new Set(r.L.map(e => e.comm).filter(Boolean))].join("، ") || "—")}</td><td class="c">${r.kh ? `<span class="chip gold">✓</span>` : ""}</td></tr>`).join("")}
    </tbody></table></div></div>`).join("") || `<div class="empty">لا نتائج</div>`}</div>`;
}
function vStatsActs(){
  const E = S.E;
  const mtx = (rows, cols, f) => `<div class="table-wrap"><table class="stbl mtx"><thead><tr><th></th>${cols.map(c => `<th class="c">${esc(c[1])}</th>`).join("")}<th class="c">المجموع</th></tr></thead><tbody>
    ${rows.map(r => { const v = cols.map(c => f(r[0], c[0])); const mx = Math.max(1, ...v); const s = v.reduce((a, b) => a + b, 0);
      return `<tr><td class="nm">${esc(r[1])}</td>${v.map(n => `<td class="c num"><span class="heat" style="--h:${n ? .12 + n / mx * .6 : 0}">${n || ""}</span></td>`).join("")}<td class="c num"><b>${s}</b></td></tr>`; }).join("")}</tbody></table></div>`;
  const SL = ["الفجر", "الصباح", "الجمعة", "العصر", "المغرب", "العشاء"];
  const lc = {}; E.filter(RUN).forEach(e => (e.lect || "").split(" / ").filter(Boolean).forEach(l => { lc[l] = lc[l] || { n:0, c:new Set() }; lc[l].n++; if (e.comm) lc[l].c.add(e.comm); }));
  const topL = Object.entries(lc).sort((a, b) => b[1].n - a[1].n).slice(0, 12);
  return `<div class="sgrid">
    <div class="panel"><div class="panel-h"><h3>المحافظة × نوع النشاط</h3></div>${mtx(GOVS.map(g => [g, g]), TYPES.map(t => [t, TPL[t]]), (g, t) => E.filter(e => e.gov === g && e.type === t).length)}</div>
    <div class="panel"><div class="panel-h"><h3>اليوم × وقت الصلاة (الجارية)</h3></div>${mtx(WEEK.map(d => [d, DAYS[d]]), SL.map(s => [s, s]), (d, s) => E.filter(e => RUN(e) && e.days.includes(d) && slotName(e.time) === s).length)}</div>
  </div>
  <div class="panel"><div class="panel-h"><h3>المحاضرون الأكثر نشاطاً (الجارية)</h3><span class="chip">${Object.keys(lc).length} محاضر</span></div><div class="list">
    ${topL.map(([l, v], i) => `<button class="li" data-go="acts" data-f="${esc(JSON.stringify(F0({ q:l })))}"><span class="rk num">${i + 1}</span><span><span class="t">${esc(l)}</span><br><span class="s">${esc([...v.c].join("، "))}</span></span><span class="pill">${v.n} نشاط</span></button>`).join("") || `<div class="empty">—</div>`}</div></div>`;
}
function vStats(){
  const tab = S.f.stab || "all";
  return statTabs(tab) + ({ all:vStatsAll, comms:vStatsComms, mos:vStatsMos, acts:vStatsActs }[tab] || vStatsAll)();
}

/* ---------- coordinators grouped by community ---------- */
function vCoords(){
  const q = nkey(S.f.coq || "");
  const idx = S.coords.map((c, i) => ({ ...c, i })).filter(c => !q || nkey([c.name, c.comm, c.lang, c.phone].join(" ")).includes(q));
  const groups = commNames.map(cn => [cn, idx.filter(c => c.comm === cn)]).filter(([, L]) => L.length);
  const other = idx.filter(c => !commNames.includes(c.comm)); if (other.length) groups.push(["جالية غير محددة", other]);
  const nC = idx.filter(c => c.role === "منسق").length;
  return `<div class="toolbar"><div class="search"><svg><use href="#i-search"/></svg><input id="coq" class="f" placeholder="ابحث باسم المنسق أو الجالية أو الهاتف…" value="${esc(S.f.coq || "")}" data-fk="coq"></div>
    ${S.admin ? `<button class="btn btn-primary" data-new="co">${icon("i-plus")}إضافة منسق</button>` : ""}<span class="count">${groups.length} جالية · ${nC} منسق · ${idx.length - nC} نائب</span></div>
  <div class="cgrid">${groups.map(([cn, L]) => { L.sort((a, b) => (a.role === "منسق" ? 0 : 1) - (b.role === "منسق" ? 0 : 1)); const lang = [...new Set(L.map(c => c.lang).filter(Boolean))].join("، ");
    return `<div class="cocard"><div class="coh"><h3>${esc(cn)}</h3>${lang ? `<span class="s">${esc(lang)}</span>` : ""}<span class="chip">${L.length}</span></div>
      ${L.map(c => `<div class="corow" role="button" tabindex="0" data-open="co:${c.i}"><span class="cav ${c.role === "منسق" ? "m" : ""}">${esc((c.name || "؟").trim().charAt(0))}</span><span class="cn"><b>${esc(c.name)}</b><span class="s">${c.role === "منسق" ? "منسق" : "نائب منسق"}${c.status && c.status !== "نشط" ? " · " + esc(c.status) : ""}</span></span><a class="ph num" href="tel:${esc(c.phone)}" dir="ltr">${esc(c.phone || "")}</a></div>`).join("")}</div>`; }).join("") || `<div class="empty">لا نتائج</div>`}</div>`;
}
document.addEventListener("click", ev => {
  const t = ev.target.closest("button,a"); if (!t) return;
  if (t.tagName === "A" && t.classList.contains("ph")) { ev.stopPropagation(); return; }
  if (t.dataset.stab) { S.f.stab = t.dataset.stab; return render(); }
  if (t.dataset.small !== undefined) { S.f.small = t.dataset.small === "1"; return render(); }
}, true);
