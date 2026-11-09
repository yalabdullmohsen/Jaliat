/* ================= v82: أساسيات كل قسم ================= */
/* التقارير والسجلات (الحفظ في OneDrive، التقرير الشهري، الإحصائيات، الملاحظات، ملاحظاتي، سجل التحديثات) والإدارة
   (نشاط الموظفين، المستخدمون، النسخ الاحتياطية، سجل التعديلات) لكل قسم. الفصل الحقيقي في قاعدة البيانات (dept_ok)؛
   صفحات الجاليات نفسها تُعاد استعمالها بتصفية بيانات القسم، والتقرير والإحصائيات والنسخ تُبنى من سجلات القسم (dept_items). */
const DPX = { bk:null, rep:"" };
const dpOnly = () => document.body.classList.contains("dp-only");
const noteDept = id => S.meta.get("notes:" + id)?.dept || DP_LEGACY;
const dpInScope = p => { const me = dpMe(), c = p.dept || DP_LEGACY; return me === "all" || me === c || DP.depts.some(d => d.code === c && d.parent === me); };
const dpMyItems = () => DP.items.filter(x => x.dept === dpMe());
const dpDoneAt = x => x.data?.done_at || (x.status === "منجز" ? (x.updated_at || "").slice(0, 10) : "");
const dpDays = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / 864e5));

async function dpLoadNotes(){
  const { data } = await sb.from("notes").select("*").limit(2000);
  S.notes.clear(); (data || []).forEach(r => putRow("notes", r)); S.got.add("notes");
}
async function dpBoot(){
  await Promise.all([dpLoadNotes(), loadMine().catch(() => {}), loadAudit().catch(() => {}), typeof loadSeen === "function" ? loadSeen().catch(() => {}) : 0]);
  ["acts", "khatibs", "notes", "mosques", "docs", "comms", "coords"].forEach(k => S.got.add(k)); /* صفحات النظام المعاد استعمالها تنتظر اكتمال هذه المجموعات */
  render(); odxAuto();
}

/* ملاحظات القسم المشتركة: تُحفظ بقسم صاحبها، وكل قسم يرى ملاحظاته فقط */
const _tput82 = T.put, _tdel82 = T.del;
T.put = async function(tbl, id, data){
  if (tbl !== "notes" || !dpOnly()) return _tput82.call(T, tbl, id, data);
  const row = id ? { id, data, dept:dpMe() } : { data, dept:dpMe() };
  const { error } = id ? await sb.from("notes").upsert(row) : await sb.from("notes").insert(row); if (error) throw error;
  await dpLoadNotes();
};
T.del = async function(tbl, id){ await _tdel82.call(T, tbl, id); if (tbl === "notes" && dpOnly()) await dpLoadNotes(); };
const _vNotes82 = vNotes;
vNotes = function(){
  const all = S.notes, want = dpOnly() ? dpMe() : DP_LEGACY;
  S.notes = new Map([...all].filter(([id]) => noteDept(id) === want));
  try { return _vNotes82(); } finally { S.notes = all; }
};

/* المستخدمون: حسابات قسمك فقط (والتحقق في الخادم manage-users) */
const _vUsers82 = vUsers;
vUsers = function(){ const all = S.profiles; S.profiles = all.filter(dpInScope); try { return _vUsers82(); } finally { S.profiles = all; } };

/* سجل التعديلات: القاعدة تعيد تعديلات قسمك فقط؛ سجلات الأقسام تُسمّى «سجل قسم» */
const _vAudit82 = vAudit;
vAudit = function(){ return _vAudit82().replaceAll(">dept_items<", ">سجل قسم<"); };

/* الحفظ في OneDrive: الصفحة نفسها، وteam_backup في القاعدة تعيد بيانات القسم فقط */
const _vOdSave82 = vOdSave;
vOdSave = function(){
  const h = _vOdSave82();
  return dpOnly() ? h.replace(/<details class="odx-d">[\s\S]*?<\/details>/, `<details class="odx-d"><summary>ماذا يُحفظ؟</summary><span>سجلات قسمك وملاحظاته وطلبات الإضافة وسجل تعديلاته، في ملفي إكسل وJSON.</span></details>`) : h;
};

/* ---------- التقرير الشهري من سجلات القسم ---------- */
const dpMonths = () => { let [y, m] = TODAY.slice(0, 7).split("-").map(Number); const o = []; for (let i = 0; i < 12; i++) { o.push(`${y}-${String(m).padStart(2, "0")}`); if (--m === 0) { m = 12; y--; } } return o; };
const dpMonthName = ym => new Date(ym + "-15T00:00:00").toLocaleDateString("ar-KW-u-nu-latn", { month:"long", year:"numeric" });
function dpMonthStats(L, ym){
  const made = L.filter(x => (x.created_at || "").slice(0, 7) === ym), done = L.filter(x => dpDoneAt(x).slice(0, 7) === ym);
  const dd = done.filter(x => x.data?.due), ontime = dd.filter(x => dpDoneAt(x) <= x.data.due);
  const days = done.map(x => dpDays(x.created_at, dpDoneAt(x)));
  return { made, done, open:L.filter(x => dpOpen(x) && (x.created_at || "").slice(0, 7) <= ym), ontime:dd.length ? Math.round(100 * ontime.length / dd.length) : null, avg:days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null };
}
function dpReportView(){
  if (!DP.loaded) { dpLoad().then(() => S.view === "report" && render()); return `<div class="loading">جارٍ التحميل…</div>`; }
  const ym = DPX.rep || TODAY.slice(0, 7), L = dpMyItems(), m = dpMonthStats(L, ym), late = L.filter(dpLate);
  const kinds = [...new Set([...(DP.depts.find(d => d.code === dpMe())?.kinds || []), ...L.map(x => x.kind)])];
  const row = k => { const a = m.made.filter(x => x.kind === k).length, b = m.done.filter(x => x.kind === k).length, c = m.open.filter(x => x.kind === k).length; return a || b || c ? `<tr><td>${esc(k)}</td><td class="num">${a}</td><td class="num">${b}</td><td class="num">${c}</td></tr>` : ""; };
  return `<div class="dp dpx-rep"><div class="toolbar dpx-noprint"><select class="f" id="dpx-m">${dpMonths().map(x => `<option value="${x}"${x === ym ? " selected" : ""}>${esc(dpMonthName(x))}</option>`).join("")}</select>
      <button class="btn btn-primary" type="button" data-dpxprint>طباعة / PDF</button></div>
    <div class="dpx-ph"><b>${esc(dpName(dpMe()))}</b><span>التقرير الشهري · ${esc(dpMonthName(ym))}</span></div>
    <div class="kpis">
      <div class="kpi"><span>سجلات جديدة</span><b>${m.made.length}</b></div>
      <div class="kpi" style="--k:var(--ok)"><span>أُنجزت</span><b>${m.done.length}</b></div>
      <div class="kpi" style="--k:var(--warn)"><span>مفتوحة</span><b>${m.open.length}</b></div>
      <div class="kpi" style="--k:var(--bad)"><span>متأخرة الآن</span><b>${late.length}</b></div>
      <div class="kpi"><span>متوسط زمن الإنجاز</span><b>${m.avg === null ? "—" : m.avg + " يوم"}</b></div>
      <div class="kpi"><span>الالتزام بالمواعيد</span><b>${m.ontime === null ? "—" : m.ontime + "٪"}</b></div></div>
    <div class="panel"><div class="table-wrap"><table><thead><tr><th>النوع</th><th>جديدة</th><th>منجزة</th><th>مفتوحة</th></tr></thead><tbody>${kinds.map(row).join("") || `<tr><td colspan="4" class="s">لا سجلات في هذا الشهر</td></tr>`}</tbody></table></div></div>
    ${m.done.length ? `<h3 class="dp-h">المنجز في الشهر</h3><div class="dp-list">${m.done.map(dpRow).join("")}</div>` : ""}
    ${late.length ? `<h3 class="dp-h">المتأخر</h3><div class="dp-list">${late.map(dpRow).join("")}</div>` : ""}</div>`;
}

/* ---------- إحصائيات القسم ---------- */
function dpBars(rows){
  const mx = Math.max(1, ...rows.map(r => r[1]));
  return rows.map(([t, n, c]) => `<div class="dpx-bar"><span>${esc(t)}</span><i style="--w:${Math.round(100 * n / mx)}%;--c:${c || "var(--primary)"}"></i><b class="num">${n}</b></div>`).join("") || `<div class="s">لا بيانات</div>`;
}
function dpStatsView(){
  if (!DP.loaded) { dpLoad().then(() => S.view === "stats" && render()); return `<div class="loading">جارٍ التحميل…</div>`; }
  const L = dpMyItems(), c = dpCounts(dpMe()), kinds = [...new Set(L.map(x => x.kind))], ms = dpMonths().slice(0, 6).reverse();
  return `<div class="dp"><div class="kpis">
      <div class="kpi"><span>كل السجلات</span><b>${L.length}</b></div><div class="kpi"><span>مفتوحة</span><b>${c.open}</b></div>
      <div class="kpi" style="--k:var(--bad)"><span>متأخرة</span><b>${c.late}</b></div><div class="kpi" style="--k:var(--ok)"><span>منجزة هذا الشهر</span><b>${c.done}</b></div></div>
    <div class="panel"><div class="panel-h"><h3>حسب النوع</h3></div><div class="panel-b">${dpBars(kinds.map(k => [k, L.filter(x => x.kind === k).length]))}</div></div>
    <div class="panel"><div class="panel-h"><h3>حسب الحالة</h3></div><div class="panel-b">${dpBars(DP_ST.map(s => [s, L.filter(x => x.status === s).length, DP_STC[s]]))}</div></div>
    <div class="panel"><div class="panel-h"><h3>آخر 6 أشهر: جديدة ومنجزة</h3></div><div class="panel-b">${ms.map(ym => { const m = dpMonthStats(L, ym); return `<div class="dpx-m"><b>${esc(dpMonthName(ym))}</b>${dpBars([["جديدة", m.made.length], ["منجزة", m.done.length, "var(--ok)"]])}</div>`; }).join("")}</div></div></div>`;
}

/* ---------- النسخ الاحتياطية لبيانات القسم ---------- */
async function dpBkLoad(){ const { data } = await sb.from("dept_backups").select("id,at,dept").order("at", { ascending:false }).limit(60); DPX.bk = data || []; if (S.view === "backups") render(); }
function dpBackupsView(){
  if (!DPX.bk) { dpBkLoad(); return `<div class="empty">جارٍ التحميل…</div>`; }
  return `<div class="toolbar"><span class="count">نسخة تلقائية لبيانات القسم كل ليلة، وتُحفظ آخر 45 يوماً</span>${S.canWrite ? `<button class="btn btn-primary" type="button" data-dpbknow>نسخة احتياطية الآن</button>` : ""}</div>
    <div class="panel"><div class="list">${DPX.bk.map(b => `<div class="li"><span class="t num">${new Date(b.at).toLocaleString("ar-KW", { dateStyle:"full", timeStyle:"short", hour12:true })}</span><button type="button" class="btn" data-dpbkx="${b.id}">تنزيل إكسل</button></div>`).join("") || `<div class="empty">لا نسخ بعد</div>`}</div></div>`;
}
async function dpBkXlsx(id){
  const { data, error } = await sb.from("dept_backups").select("*").eq("id", id).single(); if (error) return toast("تعذّر التنزيل: " + error.message);
  await loadXLSX(); const wb = XLSX.utils.book_new(); wb.Workbook = { Views:[{ RTL:true }] };
  const NM = { dept_items:"السجلات", notes:"الملاحظات", feature_requests:"طلبات الإضافة" };
  const flat = r => { const o = {}; for (const [k, v] of Object.entries({ ...r, ...(r.data && typeof r.data === "object" ? r.data : {}) })) if (k !== "data") o[k] = v && typeof v === "object" ? JSON.stringify(v) : v; return o; };
  for (const [t, rows] of Object.entries(data.data.tables || {})) if (rows?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.map(flat)), NM[t] || t);
  XLSX.writeFile(wb, `نسخة-${dpShort(data.dept)}-${data.at.slice(0, 10)}.xlsx`);
}
DP_OWN.report = dpReportView; DP_OWN.stats = dpStatsView; DP_OWN.backups = dpBackupsView;

document.addEventListener("click", async ev => {
  const t = ev.target.closest("[data-dpxprint],[data-dpbknow],[data-dpbkx]"); if (!t) return;
  if (t.dataset.dpxprint !== undefined) return window.print();
  if (t.dataset.dpbkx) return dpBkXlsx(t.dataset.dpbkx);
  if (t.dataset.dpbknow !== undefined) { t.disabled = true; const { error } = await sb.rpc("take_dept_backup", { p_dept:dpMe() }); t.disabled = false; if (error) return toast("تعذّرت النسخة: " + error.message); toast("أُخذت نسخة احتياطية"); dpBkLoad(); }
});
document.addEventListener("change", ev => { if (ev.target.id === "dpx-m") { DPX.rep = ev.target.value; render(); } });
