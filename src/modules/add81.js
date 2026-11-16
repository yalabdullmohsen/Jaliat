/* ================= v81: إنجاز لكل إدارة العلاقات الخارجية ================= */
/* الأقسام والمراقبات من جدول depts، وسجلات كل قسم في dept_items، وطلبات الإضافة في feature_requests.
   الفصل الحقيقي في قاعدة البيانات (dept_ok): المدير يرى الكل، المراقب أقسام مراقبته، الموظف قسمه. */
Object.assign(TITLES, { dept:"أقسام الإدارة", freq:"طلبات الإضافة" });
const DP_ST = ["جديد", "قيد التنفيذ", "بانتظار رد", "بانتظار التوقيع", "منجز", "ملغى"];
const DP_STC = { "جديد":"var(--t1)", "قيد التنفيذ":"var(--primary)", "بانتظار رد":"var(--warn)", "بانتظار التوقيع":"var(--gold)", "منجز":"var(--ok)", "ملغى":"var(--muted)" };
const DP_LEGACY = "com_m"; /* قسم الجاليات - رجال: صفحاته الأصلية في النظام */
const DP = { depts:[], items:[], freq:[], loaded:false, loading:null, cur:"", kind:"", st:"open", q:"", ch:null };
const dpMe = () => S.me?.dept || DP_LEGACY;
const dpName = c => DP.depts.find(d => d.code === c)?.name || c;
const dpShort = c => dpName(c).replace(/^قسم\s+/, "").replace("الجاليات ورعاية المهتدين وطلبة البعوث", "الجاليات");
const dpOpen = x => x.status !== "منجز" && x.status !== "ملغى";
const dpLate = x => dpOpen(x) && x.data?.due && x.data.due < TODAY;
const dpOwner = () => ["yousef", "fayez"].includes(S.me?.username);
/* الأقسام التي يراها المستخدم (أقسام فعلية فقط، بلا المراقبات) */
function dpVisible(){
  const me = dpMe(), leaf = DP.depts.filter(d => d.parent && d.parent !== "all");
  if (me === "all") return leaf;
  if (/^ctl_/.test(me)) return leaf.filter(d => d.parent === me);
  return leaf.filter(d => d.code === me);
}
async function dpLoad(force){
  if (DP.loading && !force) return DP.loading;
  DP.loading = (async () => {
    const [d, i, f] = await Promise.all([
      sb.from("depts").select("*").order("ord"),
      sb.from("dept_items").select("*").order("updated_at", { ascending:false }).limit(3000),
      sb.from("feature_requests").select("*").order("created_at", { ascending:false }).limit(500)]);
    DP.depts = d.data || []; DP.items = i.data || []; DP.freq = f.data || []; DP.loaded = true;
    const vis = dpVisible(); if (!DP.cur && vis.length === 1) DP.cur = vis[0].code;
    dpLive(); dpNavBadge();
  })();
  return DP.loading;
}
function dpLive(){
  if (DP.ch) return;
  const up = (arr, p) => p.eventType === "DELETE" ? arr.filter(x => x.id !== p.old?.id) : [p.new, ...arr.filter(x => x.id !== p.new.id)];
  DP.ch = sb.channel("dp").on("postgres_changes", { event:"*", schema:"public", table:"dept_items" }, p => { DP.items = up(DP.items, p); dpRefresh(); })
    .on("postgres_changes", { event:"*", schema:"public", table:"feature_requests" }, p => { DP.freq = up(DP.freq, p); dpNavBadge(); dpRefresh(); }).subscribe();
}
const dpRefresh = () => { if ((S.view === "dept" || S.view === "freq") && !$("#dp-dlg")?.open) render(); };
function dpNavBadge(){
  const b = $('#nav [data-nav="freq"]'); if (!b) return;
  const n = dpOwner() ? DP.freq.filter(x => x.status === "جديد").length : 0;
  let s = b.querySelector(".nb"); if (!s) { s = document.createElement("span"); s.className = "nb"; b.appendChild(s); }
  s.textContent = n || ""; s.hidden = !n;
}

/* ---------- الواجهة ---------- */
const dpChip = st => `<span class="dp-st" style="--c:${DP_STC[st] || "var(--muted)"}">${esc(st)}</span>`;
function dpCounts(code){
  const L = DP.items.filter(x => x.dept === code), m = TODAY.slice(0, 7);
  return { open:L.filter(dpOpen).length, late:L.filter(dpLate).length, wait:L.filter(x => x.status === "بانتظار رد").length, done:L.filter(x => x.status === "منجز" && (x.data?.done_at || x.updated_at || "").slice(0, 7) === m).length, all:L.length };
}
function vDept(){
  if (!DP.loaded) { dpLoad().then(() => S.view === "dept" && render()); return `<div class="loading">جارٍ تحميل الأقسام…</div>`; }
  const vis = dpVisible();
  if (!vis.length) return `<div class="empty">حسابك غير مربوط بقسم بعد. اطلب من مدير النظام تحديد قسمك.</div>`;
  const tabs = vis.length > 1 ? `<div class="dp-tabs"><button class="dp-tab${DP.cur ? "" : " on"}" data-dpcur="">نظرة عامة</button>${vis.map(d => `<button class="dp-tab${DP.cur === d.code ? " on" : ""}" data-dpcur="${d.code}">${esc(dpShort(d.code))}</button>`).join("")}</div>` : "";
  return `<div class="dp">${tabs}${DP.cur ? dpSection(DP.cur) : dpOverview(vis)}${dpPeople()}</div>`;
}
/* نظرة المدير والمراقب: بطاقة لكل قسم مجمّعة تحت مراقبتها */
function dpOverview(vis){
  const groups = [...new Set(vis.map(d => d.parent))];
  const tot = vis.reduce((a, d) => { const c = dpCounts(d.code); a.open += c.open; a.late += c.late; a.wait += c.wait; a.done += c.done; return a; }, { open:0, late:0, wait:0, done:0 });
  return `<div class="kpis">
      <div class="kpi"><span>مفتوحة في كل الأقسام</span><b>${tot.open}</b></div>
      <div class="kpi" style="--k:var(--bad)"><span>متأخرة عن موعدها</span><b>${tot.late}</b></div>
      <div class="kpi" style="--k:var(--warn)"><span>بانتظار رد</span><b>${tot.wait}</b></div>
      <div class="kpi" style="--k:var(--ok)"><span>أُنجزت هذا الشهر</span><b>${tot.done}</b></div></div>
    ${groups.map(g => `<h3 class="dp-h">${esc(dpName(g))}</h3><div class="dp-grid">${vis.filter(d => d.parent === g).map(d => {
      if (d.code === DP_LEGACY) return `<button class="dp-card" data-go="home"><b>${esc(dpShort(d.code))}</b><span class="s">صفحاته الكاملة: الأنشطة والخطباء والتصاريح ووثيقة</span><span class="dp-go">فتح ←</span></button>`;
      const c = dpCounts(d.code);
      return `<button class="dp-card" data-dpcur="${d.code}"><b>${esc(dpShort(d.code))}</b>
        <span class="dp-n"><i>${c.open}<small>مفتوحة</small></i><i class="${c.late ? "bad" : ""}">${c.late}<small>متأخرة</small></i><i>${c.done}<small>منجزة هذا الشهر</small></i></span>
        ${c.all ? "" : `<span class="s">لا سجلات بعد</span>`}</button>`; }).join("")}</div>`).join("")}`;
}
function dpSection(code){
  const d = DP.depts.find(x => x.code === code);
  if (code === DP_LEGACY) return `<div class="empty">قسم الجاليات - رجال يُدار من صفحاته في القائمة. <button class="btn" data-go="home">فتح الرئيسية</button></div>`;
  const kinds = d?.kinds || [], c = dpCounts(code);
  const q = DP.q.trim();
  let L = DP.items.filter(x => x.dept === code && (!DP.kind || x.kind === DP.kind));
  if (DP.st === "open") L = L.filter(dpOpen); else if (DP.st === "late") L = L.filter(dpLate); else if (DP.st) L = L.filter(x => x.status === DP.st);
  if (q) L = L.filter(x => [x.title, x.kind, x.data?.ref, x.data?.party, x.data?.notes, whoName(x.data?.owner)].join(" ").includes(q));
  L.sort((a, b) => (dpLate(b) - dpLate(a)) || ((a.data?.due || "9999") < (b.data?.due || "9999") ? -1 : 1));
  return `<div class="dp-head"><div><h3>${esc(dpName(code))}</h3><span class="s">${esc(dpName(d?.parent))}</span></div>
      <div class="dp-acts">${S.canWrite ? `<button class="btn btn-primary" data-dpnew>${icon("i-plus")} سجل جديد</button>` : ""}<button class="btn" data-dpfreq>${icon("i-spark")} طلب إضافة</button></div></div>
    <div class="kpis">
      <button class="kpi" data-dpst="open"><span>مفتوحة</span><b>${c.open}</b></button>
      <button class="kpi" style="--k:var(--bad)" data-dpst="late"><span>متأخرة</span><b>${c.late}</b></button>
      <button class="kpi" style="--k:var(--warn)" data-dpst="بانتظار رد"><span>بانتظار رد</span><b>${c.wait}</b></button>
      <button class="kpi" style="--k:var(--ok)" data-dpst="منجز"><span>منجزة هذا الشهر</span><b>${c.done}</b></button></div>
    <div class="dp-kinds"><button class="dp-k${DP.kind ? "" : " on"}" data-dpkind="">الكل</button>${kinds.map(k => `<button class="dp-k${DP.kind === k ? " on" : ""}" data-dpkind="${esc(k)}">${esc(k)} <small>${DP.items.filter(x => x.dept === code && x.kind === k && dpOpen(x)).length}</small></button>`).join("")}</div>
    <div class="toolbar dp-tb"><input class="f" id="dp-q" placeholder="ابحث بالعنوان أو رقم الكتاب أو الجهة أو المسؤول…" value="${esc(DP.q)}">
      <select class="f" id="dp-st"><option value="open"${DP.st === "open" ? " selected" : ""}>المفتوحة</option><option value="late"${DP.st === "late" ? " selected" : ""}>المتأخرة</option><option value=""${DP.st === "" ? " selected" : ""}>الكل</option>${DP_ST.map(s => `<option${DP.st === s ? " selected" : ""}>${s}</option>`).join("")}</select></div>
    ${L.length ? `<div class="dp-list">${L.map(dpRow).join("")}</div>` : `<div class="empty">${DP.items.some(x => x.dept === code) ? "لا سجلات بهذا التصفية." : "لا سجلات بعد. ابدأ بـ«سجل جديد»، وما تحتاجه من صفحات أو أزرار اطلبه من «طلب إضافة»."}</div>`}`;
}
function dpRow(x){
  const d = x.data || {};
  return `<button class="dp-row${dpLate(x) ? " late" : ""}" data-dpopen="${x.id}">
    <span class="dp-r1"><b>${esc(x.title)}</b>${dpChip(x.status)}</span>
    <span class="s">${esc(x.kind)}${d.ref ? ` · كتاب ${esc(d.ref)}` : ""}${d.party ? ` · ${esc(d.party)}` : ""}${d.owner ? ` · ${esc(whoName(d.owner))}` : ""}${d.due ? ` · <span class="${dpLate(x) ? "bad-t" : ""}">الموعد ${fmt(d.due)}</span>` : ""}</span></button>`;
}
/* توزيع الموظفين على الأقسام: للمدير ومالك النظام */
function dpPeople(){
  if (dpMe() !== "all") return "";
  /* حسابان فقط يدخلان كل الأقسام: مدير النظام ومدير الإدارة؛ وكل حساب آخر يدخل قسمه فقط */
  const opts = [...DP.depts.filter(d => d.parent && d.parent !== "all").map(d => [d.code, d.name]), ["all", "كل الإدارة (مدير النظام / مدير الإدارة)"]];
  return `<details class="dp-people"><summary>${icon("i-users")} توزيع الموظفين على الأقسام</summary>
    ${(S.profiles || []).filter(p => p.active).map(p => `<div class="dp-pr"><span>${esc(p.name || p.username)} <small class="s">${esc(p.title || "")}</small></span>
      <select class="f" data-dpuser="${p.id}">${opts.map(([c, n]) => `<option value="${c}"${(p.dept || DP_LEGACY) === c ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></div>`).join("")}</details>`;
}

/* ---------- نافذة السجل ---------- */
function dpDlg(html){
  let g = $("#dp-dlg"); if (!g) { g = document.createElement("dialog"); g.id = "dp-dlg"; g.className = "dp-dlg"; document.body.appendChild(g); g.addEventListener("close", () => { if (S.view === "dept" || S.view === "freq") render(); }); }
  g.innerHTML = `<button class="dp-x" data-dpclose aria-label="إغلاق">✕</button>${html}`; if (!g.open) g.showModal();
  return g;
}
function dpForm(x){
  const code = x?.dept || DP.cur, d = x?.data || {}, kinds = DP.depts.find(z => z.code === code)?.kinds || [];
  const staff = (S.profiles || []).filter(p => p.active && (p.dept === code || p.dept === "all" || p.dept === DP.depts.find(z => z.code === code)?.parent));
  const ro = !S.canWrite;
  const log = (d.log || []).slice().reverse();
  dpDlg(`<h3>${x ? esc(x.title) : "سجل جديد · " + esc(dpShort(code))}</h3>
    <form id="dp-f" class="dp-form" data-id="${x?.id || ""}" data-dept="${code}">
      <label>النوع<select class="f" name="kind" ${ro ? "disabled" : ""}>${[...new Set([...kinds, x?.kind].filter(Boolean))].map(k => `<option${(x?.kind || DP.kind || kinds[0]) === k ? " selected" : ""}>${esc(k)}</option>`).join("")}</select></label>
      <label>الحالة<select class="f" name="status" ${ro ? "disabled" : ""}>${DP_ST.map(s => `<option${(x?.status || "جديد") === s ? " selected" : ""}>${s}</option>`).join("")}</select></label>
      <label class="w">العنوان<input class="f" name="title" required maxlength="300" value="${esc(x?.title || "")}" ${ro ? "readonly" : ""}></label>
      <label>رقم الكتاب<input class="f" name="ref" dir="ltr" value="${esc(d.ref || "")}" ${ro ? "readonly" : ""}></label>
      <label>الجهة / الدولة<input class="f" name="party" value="${esc(d.party || "")}" ${ro ? "readonly" : ""}></label>
      <label>التاريخ<input class="f" type="date" name="date" value="${esc(d.date || (x ? "" : TODAY))}" ${ro ? "readonly" : ""}></label>
      <label>الموعد النهائي<input class="f" type="date" name="due" value="${esc(d.due || "")}" ${ro ? "readonly" : ""}></label>
      <label>المسؤول<select class="f" name="owner" ${ro ? "disabled" : ""}><option value="">—</option>${staff.map(p => `<option value="${p.id}"${d.owner === p.id ? " selected" : ""}>${esc(p.name || p.username)}</option>`).join("")}</select></label>
      <label>المبلغ (د.ك)<input class="f" name="amount" inputmode="decimal" dir="ltr" value="${esc(d.amount || "")}" ${ro ? "readonly" : ""}></label>
      <label class="w">التفاصيل والملاحظات<textarea class="f" name="notes" rows="4" ${ro ? "readonly" : ""}>${esc(d.notes || "")}</textarea></label>
      ${x && !ro ? `<label class="w">إضافة تحديث للسجل<input class="f" name="upd" placeholder="مثال: أُرسل الكتاب للجهة، أو وصل الرد"></label>` : ""}
      <div class="w dp-fb">${ro ? "" : `<button class="btn btn-primary" type="submit">حفظ</button>`}${x && S.admin && !ro ? `<button class="btn dp-del" type="button" data-dpdel="${x.id}">حذف</button>` : ""}</div>
    </form>
    ${log.length ? `<div class="dp-log"><b>سجل المتابعة</b>${log.map(l => `<div><span class="s">${esc(fmtTime(l.at))} · ${esc(whoName(l.by))}</span><p>${esc(l.t)}</p></div>`).join("")}</div>` : ""}`);
}
async function dpSave(f){
  const fd = Object.fromEntries(new FormData(f)), id = f.dataset.id, old = DP.items.find(x => x.id === id);
  const title = String(fd.title || "").trim(); if (!title) return toast("اكتب العنوان");
  const data = { ...(old?.data || {}) };
  for (const k of ["ref", "party", "date", "due", "owner", "amount", "notes"]) data[k] = String(fd[k] || "").trim();
  const log = data.log = [...(data.log || [])], by = S.me.id, at = new Date().toISOString();
  if (!old) log.push({ at, by, t:"أُنشئ السجل" });
  else { if (old.status !== fd.status) log.push({ at, by, t:`الحالة: ${old.status} ← ${fd.status}` }); if ((old.data?.owner || "") !== data.owner && data.owner) log.push({ at, by, t:`أُسند إلى ${whoName(data.owner)}` }); }
  if (fd.upd?.trim()) log.push({ at, by, t:fd.upd.trim() });
  if (fd.status === "منجز" && old?.status !== "منجز") data.done_at = TODAY;
  const row = { kind:fd.kind, title, status:fd.status, data, updated_at:at };
  const b = f.querySelector("[type=submit]"); if (b) b.disabled = true;
  const r = old ? await sb.from("dept_items").update(row).eq("id", id).select().single() : await sb.from("dept_items").insert({ ...row, dept:f.dataset.dept }).select().single();
  if (r.error) { if (b) b.disabled = false; return toast("تعذّر الحفظ: " + r.error.message); }
  DP.items = [r.data, ...DP.items.filter(x => x.id !== r.data.id)];
  $("#dp-dlg").close(); toast("حُفظ السجل ✓");
}

/* ---------- طلبات الإضافة ---------- */
function dpFreqForm(){
  dpDlg(`<h3>${icon("i-spark")} طلب إضافة</h3>
    <p class="s">اكتب ما يحتاجه قسمك: صفحة، زر، إجراء، تقرير، أو حقل جديد. يصل لمدير النظام، وبعد موافقته يُبنى ويظهر لكم.</p>
    <form id="dp-fr" class="dp-form"><label class="w">ماذا تحتاج؟<input class="f" name="title" required maxlength="200" placeholder="مثال: زر لطباعة كشف المنح الشهري"></label>
      <label class="w">التفاصيل<textarea class="f" name="details" rows="5" placeholder="لماذا تحتاجه، ومن يستخدمه، وما الذي يظهر فيه…"></textarea></label>
      <div class="w dp-fb"><button class="btn btn-primary" type="submit">إرسال الطلب</button></div></form>`);
}
async function dpFreqSave(f){
  const fd = Object.fromEntries(new FormData(f)); const title = String(fd.title || "").trim(); if (!title) return toast("اكتب ما تحتاجه");
  const dept = DP.cur || dpMe();
  const { data, error } = await sb.from("feature_requests").insert({ title, details:String(fd.details || "").trim(), dept }).select().single();
  if (error) return toast("تعذّر الإرسال: " + error.message);
  DP.freq = [data, ...DP.freq.filter(x => x.id !== data.id)]; $("#dp-dlg").close(); toast("وصل طلبك لمدير النظام ✓");
}
function vFreq(){
  if (!DP.loaded) { dpLoad().then(() => S.view === "freq" && render()); return `<div class="loading">جارٍ التحميل…</div>`; }
  const L = DP.freq, st = { "جديد":"var(--t1)", "موافق":"var(--primary)", "منفّذ":"var(--ok)", "مرفوض":"var(--bad)" };
  return `<div class="dp"><div class="dp-head"><div><h3>${dpOwner() ? "طلبات الأقسام" : "طلباتي"}</h3><span class="s">${dpOwner() ? "وافق على ما تريد بناءه، وارفض ما لا يلزم مع سبب مختصر." : "تابع حالة ما طلبته."}</span></div>
    <div class="dp-acts"><button class="btn btn-primary" data-dpfreq>${icon("i-spark")} طلب جديد</button></div></div>
    ${L.length ? `<div class="dp-list">${L.map(x => `<div class="dp-fq">
      <div class="dp-r1"><b>${esc(x.title)}</b><span class="dp-st" style="--c:${st[x.status] || "var(--muted)"}">${esc(x.status)}</span></div>
      <span class="s">${esc(dpShort(x.dept))} · ${esc(whoName(x.uid))} · ${esc(fmtTime(x.created_at))}</span>
      ${x.details ? `<p>${esc(x.details)}</p>` : ""}${x.reply ? `<p class="dp-rep">الرد: ${esc(x.reply)}</p>` : ""}
      ${dpOwner() ? `<div class="dp-fb"><input class="f" id="dp-rp-${x.id}" placeholder="رد مختصر (اختياري)" value="${esc(x.reply || "")}">
        ${x.status !== "موافق" ? `<button class="btn btn-primary" data-dpfq="${x.id}|موافق">موافقة</button>` : ""}${x.status !== "منفّذ" ? `<button class="btn" data-dpfq="${x.id}|منفّذ">تم التنفيذ</button>` : ""}${x.status !== "مرفوض" ? `<button class="btn" data-dpfq="${x.id}|مرفوض">رفض</button>` : ""}</div>` : ""}
    </div>`).join("")}</div>` : `<div class="empty">لا طلبات بعد.</div>`}</div>`;
}

/* ---------- الأحداث ---------- */
document.addEventListener("click", async ev => {
  const t = ev.target.closest("[data-dpcur],[data-dpkind],[data-dpst],[data-dpnew],[data-dpopen],[data-dpfreq],[data-dpclose],[data-dpdel],[data-dpfq]"); if (!t) return;
  const ds = t.dataset;
  if (ds.dpcur !== undefined) { DP.cur = ds.dpcur; DP.kind = ""; DP.st = "open"; DP.q = ""; return render(); }
  if (ds.dpkind !== undefined) { DP.kind = ds.dpkind; return render(); }
  if (ds.dpst !== undefined) { DP.st = ds.dpst; return render(); }
  if (ds.dpnew !== undefined) return dpForm(null);
  if (ds.dpopen) return dpForm(DP.items.find(x => x.id === ds.dpopen));
  if (ds.dpfreq !== undefined) return dpFreqForm();
  if (ds.dpclose !== undefined) return $("#dp-dlg")?.close();
  if (ds.dpdel) { if (!confirm("حذف هذا السجل نهائياً؟")) return; const { error } = await sb.from("dept_items").delete().eq("id", ds.dpdel); if (error) return toast("تعذّر الحذف: " + error.message); DP.items = DP.items.filter(x => x.id !== ds.dpdel); $("#dp-dlg").close(); return toast("حُذف"); }
  if (ds.dpfq) { const [id, st] = ds.dpfq.split("|"); const reply = $("#dp-rp-" + id)?.value.trim() || null;
    const { data, error } = await sb.from("feature_requests").update({ status:st, reply, decided_at:new Date().toISOString() }).eq("id", id).select().single();
    if (error) return toast("تعذّر الحفظ: " + error.message); DP.freq = DP.freq.map(x => x.id === data.id ? data : x); dpNavBadge(); render(); return toast("حُفظ ✓"); }
});
document.addEventListener("submit", ev => {
  if (ev.target.id === "dp-f") { ev.preventDefault(); dpSave(ev.target); }
  if (ev.target.id === "dp-fr") { ev.preventDefault(); dpFreqSave(ev.target); }
});
document.addEventListener("input", ev => { if (ev.target.id !== "dp-q") return; DP.q = ev.target.value; clearTimeout(DP.qt); DP.qt = setTimeout(() => { render(); const i = $("#dp-q"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); });
document.addEventListener("change", async ev => {
  if (ev.target.id === "dp-st") { DP.st = ev.target.value; return render(); }
  const u = ev.target.dataset?.dpuser; if (!u) return;
  const { error } = await sb.rpc("set_user_dept", { p_uid:u, p_dept:ev.target.value });
  if (error) return toast("تعذّر التغيير: " + error.message);
  const p = S.profiles.find(x => x.id === u); if (p) p.dept = ev.target.value; toast("نُقل الموظف إلى " + dpName(ev.target.value));
});

/* ---------- التوجيه والقائمة والدخول ---------- */
const _render81 = render;
/* صفحات مساحة القسم: dept/freq هنا، والبقية في add82 (DP_OWN) أو من صفحات النظام نفسها مفصولةً بالبيانات */
const DP_VIEWS = new Set(["dept", "freq", "odsave", "report", "stats", "notes", "mine", "changes", "staffday", "users", "backups", "audit"]);
const DP_OWN = {};
render = function(){
  const only = document.body.classList.contains("dp-only");
  if (only && !DP_VIEWS.has(S.view)) S.view = "dept";
  if (only && DP_OWN[S.view]) { $("#title").textContent = TITLES[S.view] || ""; $("#add-act").hidden = true; $("#view").innerHTML = DP_OWN[S.view](); if (typeof afterRender === "function") afterRender(S.view); return; }
  if (S.view === "dept" || S.view === "freq") {
    $("#title").textContent = S.view === "dept" && DP.loaded && dpVisible().length === 1 ? dpShort(dpVisible()[0].code) : TITLES[S.view]; $("#add-act").hidden = true;
    $("#view").innerHTML = S.view === "dept" ? vDept() : vFreq(); return;
  }
  _render81();
};
/* أساسيات كل قسم بنفس أسماء وترتيب قائمة الجاليات: «التقارير والسجلات» ثم «الإدارة» (للمدير) */
function dpBaseNav(){
  if (dpMe() === DP_LEGACY || dpMe() === "all" || dpMe() === "ctl_com") return "";
  const b = (v, ic) => `<button class="dp-n" data-nav="${v}">${icon(ic)}${esc(TITLES[v])}</button>`;
  return `<div class="sep dp-n">التقارير والسجلات</div>${b("odsave", "i-down")}${b("report", "i-doc")}${b("stats", "i-chart")}${b("notes", "i-note")}${b("mine", "i-note")}${b("changes", "i-log")}`
    + (S.admin ? `<div class="sep dp-n">الإدارة</div>${b("staffday", "i-users")}${b("users", "i-users")}${b("backups", "i-down")}${b("audit", "i-log")}` : "");
}
function dpMountNav(){
  const nav = $("#nav"); if (!nav || nav.querySelector(".dp-n")) return;
  const h = `<div class="sep dp-n">الإدارة والأقسام</div>${dpMe() === DP_LEGACY ? "" : `<button class="dp-n" data-nav="dept">${icon("i-people")}${dpMe() === "all" || /^ctl_/.test(dpMe()) ? "أقسام الإدارة" : "قسمي"}</button>`}<button class="dp-n" data-nav="freq">${icon("i-spark")}طلبات الإضافة</button>${dpBaseNav()}`;
  nav.insertAdjacentHTML("afterbegin", h);
  dpNavBadge();
}
const _start81 = start;
start = async function(session){
  const { data: prof } = await sb.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
  const d = prof?.dept || DP_LEGACY;
  if (!prof || !prof.active || d === DP_LEGACY || d === "all" || d === "ctl_com") { await _start81(session); dpMountNav(); if (S.me) { dpLoad(); if (d === "all") { const bs = $(".brand span"); if (bs) bs.textContent = "إدارة العلاقات الخارجية"; } } return; }
  /* أقسام بلا صفحات الجاليات: مساحة القسم فقط */
  S.me = prof; S.admin = prof.role === "admin"; S.canWrite = prof.role !== "viewer"; S.profiles = [prof];
  document.body.classList.add("dp-only");
  $("#me-name").textContent = prof.name || prof.username; $("#me-av").textContent = (prof.name || prof.username).trim().charAt(0);
  dpMountNav();
  $("#login").hidden = true; $("#app").hidden = false; $("#tabbar").hidden = true;
  S.view = (location.hash || "").slice(1) === "freq" ? "freq" : "dept"; render();
  const { data } = await sb.from("profiles").select("*").order("created_at"); S.profiles = data || [prof];
  await dpLoad(); dpBoot();
  $("#me-role").textContent = [prof.title, dpShort(d)].filter(Boolean).join(" · "); const bs = $(".brand span"); if (bs) bs.textContent = dpName(d);
  render();
};
/* زر «طلب إضافة» دائم في أسفل القائمة تحت «الاقتراحات» لكل الموظفين */
(function dpFootBtn(){ const f = document.querySelector(".side-foot"); if (!f || f.querySelector("[data-dpfreq]")) return; const h = `<button class="btn sugg-btn" type="button" data-dpfreq>${icon("i-spark")} طلب إضافة للنظام</button>`; const sg = $("#sugg-btn"); if (sg) sg.insertAdjacentHTML("afterend", h); else f.insertAdjacentHTML("beforeend", h); })();
