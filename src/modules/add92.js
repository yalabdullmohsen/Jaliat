/* ================= v92 (JL-6): «نشاطاته» لكل شيخ أو منسق، وطلبات الحسابات في صفحة الطلبات ================= */
/* صفحة الشخص نفسها التي يراها في بوابته («أنشطتي»): الجارية والقادمة والسابقة، ولكل نشاط موافقته وتصريحه وحالته.
   الشيخ: أنشطته بمطابقة اسمه مع المحاضر. المنسق أو نائبه: أنشطة جاليته. */
function personActs(o){
  const sh = o.role === "شيخ", me = lectNames(o.name || "");
  const L = S.E.filter(e => e.status !== "ملغى" && (sh ? sameLect(e.names || [], me) : e.comm === o.comm));
  const grp = e => ["منتهٍ", "مكتمل"].includes(e.st) ? "past" : e.st === "قادم" ? "next" : "now";
  const G = { now:[], next:[], past:[] }; L.forEach(e => G[grp(e)].push(e));
  const c = typeof apprCtx === "function" ? apprCtx() : null;
  const row = e => { const ap = typeof apprOf === "function" ? apprOf(e, c) : null, p = S.permits.filter(x => x.act_id === e.id && !x.revoked).sort((a, b) => String(b.until).localeCompare(String(a.until)))[0];
    return `<button type="button" class="li pa-r" data-open="act:${esc(e.id)}"><span><span class="t">${esc(e.mosName || "مسجد غير محدد")}</span> <span class="s">· ${esc([daysText(e) !== "—" && daysText(e), e.time].filter(Boolean).join(" · "))}</span><br>
      <span class="s">${esc(e.lect || "—")}${e.doc ? ` · كتاب <bdi dir="ltr">${esc(e.doc)}</bdi>` : " · بلا رقم كتاب"}${e.end ? ` · حتى ${fmt(e.end)}` : ""}</span><br>
      <span class="chip${ap?.k === "ok" ? " ok" : ap?.k === "no" ? " bad" : ""}">${ap?.k === "ok" ? "تمت الموافقة" : ap?.k === "no" ? "لم تتم الموافقة" : esc(ap?.label || "بانتظار الموافقة")}</span>
      <span class="chip${p ? " ok" : " gold"}">${p ? `تصريح <bdi dir="ltr">${esc(p.no || "")}</bdi>` : "بلا تصريح"}</span></span>${typeChip(e.type)}</button>`; };
  const sec = (k, t) => G[k].length ? `<h4 class="pa-h">${t} <span class="chip">${G[k].length}</span></h4><div class="pa-l">${G[k].map(row).join("")}</div>` : "";
  openDrawer(`نشاطات ${o.name || ""}`, `<div class="check"><b>${esc(o.name || "")}</b><span>${sh ? "شيخ / خطيب" : o.role === "نائب" ? "نائب منسق" : "منسق"}${o.comm ? " · " + esc(o.comm) : ""} · ${L.length} نشاط. هي نفسها صفحة «أنشطتي» التي يراها في بوابته.</span></div>`
    + (L.length ? sec("now", "الجارية") + sec("next", "القادمة") + sec("past", "السابقة") : `<div class="empty">لا توجد أنشطة مسجّلة ${sh ? "باسمه" : "لجاليته"} حتى الآن.</div>`),
    `<button class="btn btn-ghost" data-close>إغلاق</button>`);
}
document.addEventListener("click", ev => { const t = ev.target.closest("[data-pacts]"); if (!t) return; const a = (S.pacc || []).find(x => x.id === t.dataset.pacts); if (a) personActs(a); });
/* ملف المنسق (صفحة المنسقين): الزر نفسه أعلى ملفه */
const _listForm92 = listForm;
listForm = function(kind, key){ const r = _listForm92.apply(this, arguments);
  if (kind === "co" && S.form?.kind === "list") { const c = (S.coords || [])[+key]; if (c) $("#drawer .drawer-b")?.insertAdjacentHTML("afterbegin", `<button type="button" class="btn btn-ghost pa-open" data-paco="${esc(String(key))}">نشاطاته</button>`); }
  return r; };
document.addEventListener("click", ev => { const t = ev.target.closest("[data-paco]"); if (!t) return; const c = (S.coords || [])[+t.dataset.paco]; if (!c) return;
  personActs({ name:c.name, comm:c.comm, role:/^نائب/.test(c.role || "") ? "نائب" : "منسق" }); });

/* صفحة «الطلبات»: طلبات الحسابات المعلّقة تظهر أعلاها أيضًا (لا في البوابة وحدها) */
const _vInbox92 = vInbox;
vInbox = function(){ const h = _vInbox92(), n = (S.psign || []).filter(g => g.status === "pending").length; if (!n || !S.canWrite) return h;
  return `<div class="check warn pa-sg"><b>${n} طلب حساب جديد في بوابة إنجاز بانتظار موافقتك</b><span>شيخ أو منسق أنشأ حسابه بنفسه، ولا يرى أي بيانات قبل موافقتك.</span><button type="button" class="btn btn-primary" data-go="portal" data-pvt-go="sign">مراجعة الطلبات</button></div>` + h; };
document.addEventListener("click", ev => { const t = ev.target.closest("[data-pvt-go]"); if (t) S.f.pvt = t.dataset.pvtGo; }, true);
