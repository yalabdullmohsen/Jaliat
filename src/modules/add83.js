/* ================= v83: لوحة المدير الصباحية (لحسابي الإدارة all فقط) ================= */
/* ما تأخر في كل قسم، ومن ينتظر رد من، وما يحتاج التوقيع اليوم — من سجلات الأقسام (dept_items) ومهام الجاليات وكتب وثيقة المحفوظة مسودة. */
Object.assign(TITLES, { morning:"لوحة المدير الصباحية" });
DP_VIEWS.add("morning");
const MB = { tasks:null, drafts:null, busy:false };
async function mbLoad(){
  if (MB.busy) return; MB.busy = true;
  const [t, w] = await Promise.all([
    sb.from("tasks").select("id,title,assignee,assigner,due,status,waiting,created_at").neq("status", "منجزة").limit(2000),
    sb.from("watheqa_outbox").select("id,subj,to_whom,status,created_by,created_at").eq("status", "drafted").limit(300)]);
  MB.tasks = t.data || []; MB.drafts = w.data || []; MB.busy = false; if (S.view === "morning") render();
}
const mbAgo = d => { const n = dpDays(d, TODAY); return n ? `منذ ${n} يوم` : "اليوم"; };
function mbItem(title, sub, attrs, bad){ return `<button type="button" class="mb-i${bad ? " bad" : ""}" ${attrs}><b>${esc(title)}</b><span class="s">${sub}</span></button>`; }
function vMorning(){
  if (dpMe() !== "all") return `<div class="empty">هذه اللوحة لمدير الإدارة ومدير النظام.</div>`;
  if (!DP.loaded || !MB.tasks) { dpLoad().then(() => S.view === "morning" && render()); mbLoad(); return `<div class="loading">جارٍ تجهيز لوحة الصباح…</div>`; }
  const vis = dpVisible();
  /* 1) المتأخر في كل قسم */
  const lateBy = vis.map(d => {
    const L = d.code === DP_LEGACY ? MB.tasks.filter(t => t.due && t.due < TODAY).map(t => ({ t:t.title, s:`مهمة · ${esc(whoName(t.assignee))} · الموعد ${fmt(t.due)}`, a:`data-go="tasks"` }))
      : DP.items.filter(x => x.dept === d.code && dpLate(x)).map(x => ({ t:x.title, s:`${esc(x.kind)}${x.data?.owner ? " · " + esc(whoName(x.data.owner)) : ""} · الموعد ${fmt(x.data.due)}`, a:`data-dpopen="${x.id}"` }));
    return { d, L };
  }).filter(g => g.L.length);
  const lateN = lateBy.reduce((a, g) => a + g.L.length, 0);
  /* 2) من ينتظر رد من */
  const wait = [
    ...DP.items.filter(x => x.status === "بانتظار رد" && vis.some(d => d.code === x.dept)).map(x => ({ t:x.title, s:`${esc(dpShort(x.dept))} ينتظر رد ${esc(x.data?.party || "الجهة")} · ${mbAgo((x.updated_at || "").slice(0, 10))}`, a:`data-dpopen="${x.id}"`, at:x.updated_at })),
    ...MB.tasks.filter(t => t.waiting === "mgr").map(t => ({ t:t.title, s:`${esc(whoName(t.assignee))} ينتظر رد رئيس القسم · الجاليات`, a:`data-go="tasks"`, at:t.created_at }))
  ].sort((a, b) => (a.at || "") < (b.at || "") ? -1 : 1);
  /* 3) ما يحتاج توقيعك اليوم */
  const sign = [
    ...MB.drafts.map(w => ({ t:w.subj || "كتاب", s:`مسودة في وثيقة إلى ${esc(w.to_whom || "—")} · ${esc(whoName(w.created_by))} · ${mbAgo((w.created_at || "").slice(0, 10))}`, a:`data-go="watheqa"` })),
    ...DP.items.filter(x => x.status === "بانتظار التوقيع" && vis.some(d => d.code === x.dept)).map(x => ({ t:x.title, s:`${esc(dpShort(x.dept))}${x.data?.ref ? " · كتاب " + esc(x.data.ref) : ""}`, a:`data-dpopen="${x.id}"` })),
    ...DP.items.filter(x => dpOpen(x) && x.data?.due === TODAY && x.status !== "بانتظار التوقيع" && vis.some(d => d.code === x.dept)).map(x => ({ t:x.title, s:`${esc(dpShort(x.dept))} · موعده اليوم`, a:`data-dpopen="${x.id}"` }))];
  const greet = new Date().getHours() < 12 ? "صباح الخير" : "مساء الخير";
  return `<div class="dp mb"><div class="mb-h"><b>${greet}، ${esc((S.me?.name || "").split(" ")[0])}</b><span class="s">${new Date().toLocaleDateString("ar-KW-u-nu-latn", { weekday:"long", day:"numeric", month:"long" })}</span></div>
    <div class="kpis">
      <div class="kpi" style="--k:var(--bad)"><span>متأخر</span><b>${lateN}</b></div>
      <div class="kpi" style="--k:var(--warn)"><span>بانتظار رد</span><b>${wait.length}</b></div>
      <div class="kpi" style="--k:var(--primary)"><span>للتوقيع اليوم</span><b>${sign.length}</b></div></div>
    <div class="panel"><div class="panel-h"><h3>يحتاج توقيعك اليوم</h3></div><div class="panel-b mb-l">${sign.map(x => mbItem(x.t, x.s, x.a)).join("") || `<div class="s">لا شيء بانتظار توقيعك ✓</div>`}</div></div>
    <div class="panel"><div class="panel-h"><h3>المتأخر في كل قسم</h3></div><div class="panel-b">${lateBy.map(g => `<details class="mb-g"${g.L.length < 6 ? " open" : ""}><summary><b>${esc(dpShort(g.d.code))}</b><span class="chip bad">${g.L.length}</span></summary><div class="mb-l">${g.L.map(x => mbItem(x.t, x.s, x.a, true)).join("")}</div></details>`).join("") || `<div class="s">لا متأخر في أي قسم ✓</div>`}</div></div>
    <div class="panel"><div class="panel-h"><h3>من ينتظر رد من</h3></div><div class="panel-b mb-l">${wait.map(x => mbItem(x.t, x.s, x.a)).join("") || `<div class="s">لا أحد ينتظر رداً</div>`}</div></div></div>`;
}
DP_OWN.morning = vMorning;
/* المدير يدخل على مساحة القسم بالقائمة، وDP_OWN يعمل لـdp-only فقط؛ فلحساب all نعرض اللوحة من هنا */
const _render83 = render;
render = function(){
  if (S.view === "morning" && !document.body.classList.contains("dp-only")) { $("#title").textContent = TITLES.morning; $("#add-act").hidden = true; $("#view").innerHTML = vMorning(); if (typeof afterRender === "function") afterRender("morning"); return; }
  _render83();
};
const _mount83 = dpMountNav;
dpMountNav = function(){ _mount83(); if (dpMe() !== "all" || $('#nav [data-nav="morning"]')) return; $('#nav .sep.dp-n')?.insertAdjacentHTML("afterend", `<button class="dp-n" data-nav="morning">${icon("i-home")}لوحة المدير الصباحية</button>`); };
