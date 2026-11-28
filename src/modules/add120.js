/* ================= v98 (JL-AI 1): المساعد الذكي «✨» عبر دالة ai (Gemini) + ملخص الرئيسية ================= */
/* كل نداء يمرّ بدالة ai على الخادم: المفتاح هناك، والحجب والصلاحية والحد اليومي والتخزين المؤقت هناك.
   المخرج اقتراح فقط يعتمده الموظف، والفشل رسالة هادئة ولا يوقف شيئًا. */
const AI_QUIET = "المساعد الذكي غير متاح الآن، والمنصة تعمل كالمعتاد.";
async function aiCall(kind, input){
  const { data, error } = await sb.functions.invoke("ai", { body:{ kind, input } });
  if (error) { console.warn("ai", kind, error); return { ok:false, msg:AI_QUIET }; }
  return data && typeof data === "object" ? data : { ok:false, msg:AI_QUIET };
}
// أيقونة المساعد (شرارة SVG) تُضاف دائمًا قبل التسمية النصية، والتسمية تُهرَّب وحدها
const aiBtn = (attrs, label = "", title = "اقتراح من المساعد الذكي") => `<button type="button" class="btn btn-ghost ai-btn" ${attrs} title="${esc(title)}" aria-label="${esc(title)}">${ei("spark")}${esc(label)}</button>`;
const aiNote = `<span class="ai-note">اقتراح من المساعد الذكي، راجعه قبل الاعتماد</span>`;
const aiBusy = (btn, on) => { if (!btn) return; btn.disabled = on; btn.classList.toggle("spin", on); };

/* ملخص الرئيسية: ثلاثة أسطر لأهم ما اليوم (الحقائق من بيانات الصفحة، والصياغة من المساعد) */
S.aiBrief = null;
function aiHomeFacts(){ const E = S.E || [], me = S.me?.id;
  const today = E.filter(e => e.live && e.days?.includes(new Date(TODAY + "T12:00:00").getDay()));
  const exp = (S.docs || []).filter(d => d.end && d.end >= TODAY && diffDays(TODAY, d.end) <= 7).map(d => ({ no:d.no, comm:d.comm, days:diffDays(TODAY, d.end) }));
  const tasks = (S.tasks || []).filter(t => t.assignee === me && TK_OPEN.includes(t.status));
  return { date:TODAY, activities_today:today.length, conflicts:E.filter(e => e.live && e.cf.length).length,
    approvals_expiring_7d:exp.slice(0, 8), my_open_tasks:tasks.length, my_late_tasks:tasks.filter(t => t.due && t.due < TODAY).length,
    open_requests:(S.reqs || []).filter(r => !["معتمد", "مرفوض", "مكتمل"].includes(r.status)).length,
    watheqa_replies_to_forward:typeof wqPendList === "function" && S.canWrite ? wqPendList().length : 0,
    watheqa_sync_hours:typeof wqSyncInfo === "function" && wqSyncInfo().last ? Math.round((Date.now() - new Date(wqSyncInfo().last)) / 36e5) : null }; }
function aiBriefCard(){
  const b = S.aiBrief;
  const body = !b ? `<span class="s">ثلاثة أسطر بأهم ما يحتاج انتباهك اليوم.</span>`
    : b.ok ? `<ol class="ai-lines">${(b.out?.lines || []).slice(0, 3).map(l => `<li>${esc(l)}</li>`).join("")}</ol>${aiNote}`
    : `<span class="s">${esc(b.msg || AI_QUIET)}</span>`;
  return `<div class="panel ai-card"><div class="panel-b"><div class="ai-h"><b>${ei("spark")}ملخص اليوم</b>${aiBtn("data-aibrief", b ? "تحديث" : "لخّص يومي", "ملخص اليوم من المساعد الذكي")}</div>${body}</div></div>`; }
const _vHome98 = vHome;
vHome = function(){ return aiBriefCard() + _vHome98(); };
document.addEventListener("click", async ev => { const t = ev.target.closest("[data-aibrief]"); if (!t) return;
  aiBusy(t, true); S.aiBrief = await aiCall("home_brief", aiHomeFacts()); aiBusy(t, false); if (S.view === "home") render(); });
