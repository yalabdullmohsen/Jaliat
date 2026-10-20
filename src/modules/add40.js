/* ================= v42: «لوحتي» — every employee sees what is required of him, what remains and what he finished ================= */
const monthNow = () => TODAY.slice(0, 7);
function myWork(){ const me = S.me?.id; if (!me) return null;
  const T = S.tasks.filter(t => t.assignee === me), open = T.filter(t => TK_OPEN.includes(t.status));
  const lateT = open.filter(t => t.due && t.due < TODAY), today = open.filter(t => t.due === TODAY), newT = open.filter(t => !t.seen_at || t.status === "جديدة");
  const waitMgr = open.filter(t => t.waiting === "mgr"), later = open.filter(t => !lateT.includes(t) && !today.includes(t));
  const doneM = T.filter(t => t.status === "منجزة" && (t.done_at || "").startsWith(monthNow()));
  const decs = (S.decs || []).filter(d => !d.cancelled && d.issued_by !== me && !dRead(d.id));
  const recs = S.admin ? (S.recs || []).filter(r => r.status === "قيد الدراسة") : [];
  const wqF = S.canWrite && typeof wqPendList === "function" ? wqPendList() : [];
  const now = [...lateT.map(t => ({ k:"bad", t:`متأخرة: ${t.title}`, s:`م-${t.no} · كان موعدها ${fmt(t.due)}`, a:`data-task="${t.id}"` })),
    ...today.map(t => ({ k:"warn", t:t.title, s:`م-${t.no} · موعدها اليوم`, a:`data-task="${t.id}"` })),
    ...newT.filter(t => !lateT.includes(t) && !today.includes(t)).map(t => ({ k:"gold", t:`جديدة: ${t.title}`, s:`م-${t.no} · من ${pname(t.assigner)}`, a:`data-task="${t.id}"` })),
    ...decs.map(d => ({ k:"t1", t:`قرار يحتاج اطّلاعك: ${d.title}`, s:`ق-${d.no}`, a:`data-go="decisions"` })),
    ...(wqF.length ? [{ k:"warn", t:`${wqF.length} رد من وثيقة ينتظر إبلاغ المنسق`, s:"موافقة أو اعتذار", a:`data-go="watheqa"` }] : []),
    ...(recs.length ? [{ k:"t1", t:`${recs.length} توصية تنتظر قرارك`, s:"من الموظفين", a:`data-go="recs"` }] : [])];
  const rest = [...later.filter(t => !newT.includes(t)).map(t => ({ t:t.title, s:`م-${t.no} · ${t.status}${t.due ? " · الموعد " + fmt(t.due) : ""}`, a:`data-task="${t.id}"` })),
    ...waitMgr.map(t => ({ t:`بانتظار رئيس القسم: ${t.title}`, s:`م-${t.no}`, a:`data-task="${t.id}"` }))];
  const done = doneM.sort((a, b) => (b.done_at || "").localeCompare(a.done_at || "")).map(t => ({ t:t.title, s:`م-${t.no} · ${fmt(t.done_at.slice(0, 10))}`, a:`data-task="${t.id}"` }));
  return { now, rest, done, openN:open.length, doneN:doneM.length, totalM:T.filter(t => (t.created_at || "").startsWith(monthNow())).length }; }
function myWorkCard(){ const W = myWork(); if (!W) return "";
  const col = (cls, title, sub, L, empty) => `<div class="mw-c ${cls}"><div class="mw-h"><b>${title}</b><span class="num">${L.length}</span></div><small>${sub}</small>
    <div class="mw-l">${L.slice(0, 6).map(x => `<button type="button" class="mw-i ${x.k || ""}" ${x.a}><b>${esc(x.t)}</b><span>${esc(x.s)}</span></button>`).join("") || `<div class="mw-e">${empty}</div>`}${L.length > 6 ? `<button type="button" class="lnk" data-go="tasks">+ ${L.length - 6} أخرى</button>` : ""}</div></div>`;
  const pct = W.doneN + W.openN ? Math.round(W.doneN / (W.doneN + W.openN) * 100) : 100;
  return `<section class="mw panel"><div class="mw-top"><div><h2>لوحتي — ${esc((S.me.name || S.me.username || "").split(" ")[0])}</h2><span class="s">ما المطلوب منك الآن، وما المتبقي، وما أنجزته هذا الشهر</span></div>
    <div class="mw-p"><div class="mw-ring" style="--p:${pct}"><b class="num">${pct}%</b></div><span>إنجاز الشهر</span></div></div>
    <div class="mw-g">${col("now", "🔴 المطلوب منك الآن", "متأخر، أو اليوم، أو جديد", W.now, "لا يوجد شيء عاجل ✓")}${col("rest", "⏳ المتبقي", "مهام مفتوحة مواعيدها لاحقاً", W.rest, "لا توجد مهام متبقية")}${col("done", "✅ أنجزته هذا الشهر", "تُحسب في سجل إنجازك", W.done, "لم تُنجز مهام هذا الشهر بعد")}</div></section>`; }

/* bridge for every employee on a computer: one card until it is installed */
function bridgeCard(){ if (isTouchDev() || waEmbedOk()) return ""; try { if (+localStorage.getItem("br-later") > Date.now()) return ""; } catch (_) {}
  return `<div class="check warn br-all"><b>🔌 ركّب «جسر إنجاز 2.3» على هذا الجهاز — مرة واحدة</b><span>يشغّل Copilot وواتساب القسم داخل «إنجاز»، وتُرسل كل الرسائل من داخل النظام.</span><div class="br-acts"><button type="button" class="btn btn-primary" data-go="whatsapp">خطوات التركيب (دقيقتان)</button><button type="button" class="btn btn-ghost" data-brlater>لاحقاً</button></div></div>`; }
const _vHome42 = vHome;
vHome = function(){ return bridgeCard() + myWorkCard() + _vHome42(); };
document.addEventListener("click", ev => { const t = ev.target.closest("button"); if (!t) return;
  if (t.dataset.brlater !== undefined) { try { localStorage.setItem("br-later", Date.now() + 3 * 864e5); } catch (_) {} return render(); }
});
NEWF.splice(1, 0, ["v42-mw", "nav:home", "لوحتي", "في أول الرئيسية: المطلوب منك الآن، والمتبقي، وما أنجزته هذا الشهر مع نسبة إنجازك — كل بند يفتح بضغطة.", false, "2026-10-20"]);
