/* ================= v14: smart conflict analysis & fixes, today's priorities, cross-checks, Watheqa ================= */
const SLOTS = ["بعد صلاة الفجر", "بعد صلاة العصر", "بعد صلاة المغرب", "بين المغرب والعشاء", "بعد صلاة العشاء"];
const WATHEQA = "https://watheqa.awqaf.gov.kw/Account/Login?ReturnUrl=%2F";
const freeWith = (cand, skipId) => !S.E.some(o => o.id !== skipId && clash(cand, o));
function altFixes(e, max = 4){
  const out = [], base = { ...e, cf:[] };
  for (const t of SLOTS) { if (t === e.time) continue; const c = { ...base, time:t, sl:slot(t) }; if (c.sl && freeWith(c, e.id)) out.push({ id:e.id, label:`نقل #${e.n} إلى «${t}»`, patch:{ time:t } }); if (out.length >= max) return out; }
  if (!e.daily && e.days.length === 1) for (const d of WEEK) { if (d === e.days[0] || d === 5) continue; const c = { ...base, days:[d] }; if (freeWith(c, e.id)) out.push({ id:e.id, label:`نقل #${e.n} إلى يوم ${DAYS[d]} (نفس الوقت)`, patch:{ days:[d], daily:false } }); if (out.length >= max + 2) break; }
  return out;
}
function cfWhy(e, c){
  const o = c.o, days = e.days.filter(d => o.days.includes(d)).map(d => DAYS[d]).join("، ");
  const from = e.start > o.start ? e.start : o.start, to = e.end < o.end ? e.end : o.end;
  const why = c.k === "lect"
    ? `المحاضر «${(e.lect || "").split(" / ").find(l => (o.lect || "").includes(l.trim())) || e.lect}» مسجّل في نشاطين بنفس الوقت: #${e.n} في ${e.mosName || "—"} و#${o.n} في ${o.mosName || "—"}، يوم ${days} (${e.time || "—"} / ${o.time || "—"}). لا يمكنه حضور الاثنين.`
    : `${e.mosName} يستضيف نشاطين بنفس الوقت: #${e.n} للجالية ${e.comm || "—"} و#${o.n} للجالية ${o.comm || "—"}، يوم ${days} (${e.time || "—"} / ${o.time || "—"}).`;
  const root = [];
  if (e.doc && e.doc === o.doc) root.push("النشاطان على نفس الموافقة — غالباً أُدخل الوقت نفسه لهما عند التسجيل");
  else if (e.doc && o.doc) root.push(`الموافقتان مختلفتان (${e.doc} و${o.doc}) وصدرتا دون فحص تعارض بينهما`);
  if (!e.doc || !o.doc) root.push("أحد النشاطين بلا رقم موافقة — راجع صحة بياناته");
  root.push(`فترة التداخل: من ${fmt(from)} إلى ${fmt(to)}`);
  return { why, root };
}
function cfPanel(e){
  if (!e?.cf?.length) return "";
  const fixes = [...altFixes(e), ...e.cf.flatMap(c => altFixes(c.o, 2))].slice(0, 7);
  return `<div class="ai-an"><b>🧠 تحليل التعارض والحلول المقترحة</b>
    ${e.cf.map(c => { const w = cfWhy(e, c); return `<div class="ai-why"><span>${esc(w.why)}</span><ul>${w.root.map(r => `<li>${esc(r)}</li>`).join("")}</ul></div>`; }).join("")}
    ${fixes.length ? `<span class="s">حلول خالية من أي تعارض (تم فحصها مع كل الأنشطة):</span><div class="ai-fix">${fixes.map(f => `<button type="button" class="btn" data-cffix="${esc(JSON.stringify(f))}">✓ ${esc(f.label)}</button>`).join("")}</div>` : `<span class="s">لا يوجد وقت أو يوم بديل خالٍ — الحل: تغيير المحاضر أو المسجد.</span>`}
    ${S.admin ? `<button type="button" class="btn btn-ghost" data-tkfrom="cf|${esc(e.id)}">أو أسند حل التعارض لموظف</button>` : ""}</div>`;
}
async function applyFix(f){
  if (!S.canWrite) return toast("صلاحيتك عرض فقط");
  const a = S.acts.get(f.id); if (!a) return;
  try { await T.put("acts", f.id, { ...a, ...f.patch }); toast(`تم: ${f.label}`); closeDrawer(); setTimeout(() => { const e = S.byId.get(f.id); if (e) actForm(f.id); }, 600); } catch (e) { writeFail(e); }
}
const _actForm15 = actForm;
actForm = function(id, preset){ _actForm15(id, preset); const e = id && S.byId.get(id); if (e?.cf?.length && S.form?.kind === "act") $(".drawer-b")?.insertAdjacentHTML("afterbegin", cfPanel(e)); };

/* ---------- today's priorities: one ranked, actionable list ---------- */
function priorities(){
  const P = [], me = S.me?.id, td = dOf(TODAY).getDay();
  const pairs = typeof cfPairs === "function" ? cfPairs() : [];
  if (pairs.length) { const solvable = pairs.filter(p => altFixes(p.a, 1).length || altFixes(p.b, 1).length).length;
    P.push({ w:100, k:"bad", t:`${pairs.length} تعارض في الأنشطة الجارية`, s:`${solvable} منها لها حل جاهز بضغطة — افتح النشاط وستجد التحليل والحلول`, act:{ open:`act:${pairs[0].a.id}`, l:"عرض الحل" } }); }
  const myLate = (S.tasks || []).filter(t => t.assignee === me && TK_OPEN.includes(t.status) && t.due && t.due <= TODAY);
  if (myLate.length) P.push({ w:95, k:"bad", t:`${myLate.length} مهمة عليك موعدها اليوم أو متأخرة`, s:myLate.slice(0, 2).map(t => t.title).join(" · "), act:{ go:"tasks", l:"مهامي" } });
  const unseen = (S.tasks || []).filter(t => t.assignee === me && !t.seen_at && TK_OPEN.includes(t.status));
  if (unseen.length) P.push({ w:90, k:"gold", t:`${unseen.length} مهمة جديدة لم تفتحها`, s:"رئيس القسم يرى أنك لم تطّلع عليها بعد", act:{ go:"tasks", l:"فتح" } });
  const newReq = (S.reqs || []).filter(r => !r.data?.ack && r.status !== "مرفوض");
  if (newReq.length) P.push({ w:85, k:"gold", t:`${newReq.length} طلب وارد بلا تأكيد استلام للمنسق`, s:"أكّد الاستلام برقم الطلب عبر واتساب", act:{ go:"inbox", l:"الطلبات" } });
  const exp = S.docs.filter(d => d.end && d.end >= TODAY && d.end <= addDays(TODAY, 10) && S.E.some(e => e.doc === d.no && e.live) && !(S.tasks || []).some(t => t.link === `#doc:${d.no}` && TK_OPEN.includes(t.status)));
  if (exp.length) P.push({ w:80, k:"warn", t:`${exp.length} موافقة تنتهي خلال 10 أيام بلا مهمة تجديد`, s:exp.slice(0, 3).map(d => `${d.no} (${fmt(d.end)})`).join("، "), act:S.admin ? { tkfrom:`doc|${exp[0].no}`, l:"إسناد تجديد" } : { open:`doc:${exp[0].no}`, l:"فتح" } });
  const tent = (S.bks || []).filter(b => b.status === "مبدئي" && b.day >= TODAY && b.day <= addDays(TODAY, 3));
  if (tent.length) P.push({ w:70, k:"warn", t:`${tent.length} حجز قاعة مبدئي خلال 3 أيام يحتاج تأكيد`, s:"", act:{ go:"halls", l:"الحجوزات" } });
  if ((td === 6 || td === 0) && typeof SR !== "undefined") { const d = dOf(TODAY); d.setDate(d.getDate() - ((d.getDay() + 2) % 7)); const fri = isoOf(d); const miss = [...S.khatibs.keys()].filter(k => !SR.rows.has(fri + "|" + k)).length; if (miss && S.khatibs.size) P.push({ w:65, k:"t1", t:`سجّل خطب جمعة ${fmt(fri)} (${miss} غير مسجلة)`, s:"زر «تعبئة تلقائية» يسجّل الخطيب الأساسي لكل مسجد", act:{ go:"rewards", l:"المكافآت" } }); }
  const miss = S.E.filter(e => e.live && (!e.mosque || !e.days.length || !e.time)).length;
  if (miss) P.push({ w:50, k:"", t:`${miss} نشاط بياناته ناقصة (مسجد/يوم/وقت)`, s:"البيانات الناقصة تُخفي التعارضات وتضعف الإحصاءات", act:{ go:"acts", f:F0({ st:"miss" }), l:"إكمالها" } });
  const run = S.E.filter(RUN); const lc = {}; run.forEach(e => (e.lect || "").split(" / ").filter(Boolean).forEach(l => { (lc[l] = lc[l] || new Set()).add(e.days.join()); }));
  const today = S.E.filter(e => e.live && e.start <= TODAY && e.end >= TODAY && e.days.includes(td)).length, bt = (S.bks || []).filter(b => b.day === TODAY && b.status !== "ملغى").length;
  P.push({ w:10, k:"ok", t:`اليوم: ${today} نشاط${bt ? ` و${bt} حجز قاعة` : ""}`, s:"", act:{ go:"weekly", l:"الجدول" } });
  return P.sort((a, b) => b.w - a.w);
}
function prioPanel(){
  const P = priorities();
  return `<div class="panel prio"><div class="panel-h"><h3>أولويات اليوم</h3><span class="chip">${P.length - 1}</span><span class="s">مرتبة حسب الأهمية — كل بند بإجرائه</span></div>
    <div class="prio-l">${P.map((p, i) => `<div class="prio-i ${p.k}"><span class="num pr-n">${i + 1}</span><span class="pr-t"><b>${esc(p.t)}</b>${p.s ? `<br><span class="s">${esc(p.s)}</span>` : ""}</span>
      <button type="button" class="btn" ${p.act.go ? `data-go="${p.act.go}"${p.act.f ? ` data-f="${esc(JSON.stringify(p.act.f))}"` : ""}` : p.act.open ? `data-prio-open="${esc(p.act.open)}"` : `data-tkfrom="${esc(p.act.tkfrom)}"`}>${esc(p.act.l)}</button></div>`).join("")}</div></div>`;
}
const _vHome15 = vHome;
vHome = function(){ const h = _vHome15(); const i = h.indexOf('<div class="kpis'); return i >= 0 ? h.slice(0, i) + prioPanel() + h.slice(i) : prioPanel() + h; };

/* ---------- cross-checks: hall bookings ↔ activities at the Grand Mosque ---------- */
const _bkAvail15 = bkAvail;
bkAvail = function(){
  _bkAvail15(); const box = $("#bk-av"); if (!box) return; const f = bkRead(); if (!f.day || !/^gm-/.test(f.hall)) return;
  const d = dOf(f.day).getDay(), a = hm(f.t_from), z = hm(f.t_to);
  const L = S.E.filter(e => e.live && /الكبير/.test(e.mosName || "") && e.start <= f.day && e.end >= f.day && e.days.includes(d) && e.sl && e.sl[0] < z && a < e.sl[1]);
  if (L.length) box.insertAdjacentHTML("beforeend", `<div class="check warn"><b>تنبيه: أنشطة في المسجد الكبير بنفس الوقت</b><span>${L.map(e => `#${e.n} ${esc(e.comm || "")} (${esc(e.time || "")})`).join("، ")} — تأكد من عدم التأثير على القاعة.</span></div>`);
};

/* ---------- Watheqa ---------- */
document.addEventListener("click", ev => {
  const t = ev.target.closest("button"); if (!t) return;
  if (t.dataset.ext) { window.open(t.dataset.ext, "_blank", "noopener"); return; }
  if (t.dataset.cffix) { try { applyFix(JSON.parse(t.dataset.cffix)); } catch (_) {} return; }
  if (t.dataset.prioOpen) return openLink("#" + t.dataset.prioOpen);
});
const _letterOpen15 = letterOpen;
letterOpen = function(src){ _letterOpen15(src); $(".drawer-f [data-close]")?.insertAdjacentHTML("beforebegin", `<button class="btn btn-primary" type="button" data-ext="${WATHEQA}">فتح نظام وثيقة</button>`); };
const _palAll15 = palAll;
palAll = function(){ const A = _palAll15(); A.unshift({ g:"إجراءات", t:"فتح نظام وثيقة", s:"watheqa.awqaf.gov.kw", ic:"i-doc", run:() => window.open(WATHEQA, "_blank", "noopener"), txt:"وثيقه watheqa كتب" }); return A; };
/* attendance was removed — stop loading it */
loadAtt = async function(){ S.att = []; };

/* ================= questions between colleagues ================= */
TITLES.questions = "الأسئلة";
S.qs = [];
async function loadQs(){ const { data, error } = await sb.from("questions").select("*").order("created_at", { ascending:false }).limit(1000); if (!error) S.qs = data || []; }
let qCh = null;
function liveQs(){ if (qCh) sb.removeChannel(qCh); qCh = sb.channel("qs").on("postgres_changes", { event:"*", schema:"public", table:"questions" }, p => { S.qs = p.eventType === "DELETE" ? S.qs.filter(x => x.id !== p.old?.id) : [p.new, ...S.qs.filter(x => x.id !== p.new.id)]; qBadge(); if (S.view === "questions" && $("#drawer").hidden) render(); }).subscribe(); }
const qOpen = () => S.qs.filter(q => q.to_id === S.me?.id && !q.answer);
function qBadge(){ const b = document.querySelector('#nav [data-nav="questions"]'); if (!b) return; let s = b.querySelector(".nb"); if (!s) { s = document.createElement("span"); s.className = "nb"; b.appendChild(s); } const n = qOpen().length; s.textContent = n || ""; s.hidden = !n; }
function qCard(q){
  const mine = q.from_id === S.me?.id, toMe = q.to_id === S.me?.id;
  return `<button type="button" class="tk ${q.answer ? "done" : toMe ? "late" : ""}" data-q="${q.id}"><div class="rq-h"><b class="num rq-no">س-${q.no}</b>${q.answer ? `<span class="chip ok">أُجيب</span>` : q.seen_at ? `<span class="chip t1">قُرئ</span>` : `<span class="chip gold">لم يُقرأ</span>`}<span class="s">${ago(q.created_at)}</span></div>
    <span class="s">${mine ? `إلى ${esc(pname(q.to_id))}` : `من ${esc(pname(q.from_id))}${toMe ? "" : ` إلى ${esc(pname(q.to_id))}`}`}</span><b>${esc(q.body.slice(0, 160))}</b>${q.answer ? `<span class="s">💬 ${esc(q.answer.slice(0, 140))}</span>` : ""}</button>`;
}
function vQuestions(){
  const tab = S.f.qt || "in", me = S.me.id;
  const L = tab === "in" ? S.qs.filter(q => q.to_id === me) : tab === "out" ? S.qs.filter(q => q.from_id === me) : S.qs;
  const open = L.filter(q => !q.answer), done = L.filter(q => q.answer);
  return `<div class="toolbar"><div class="seg"><button type="button" data-qt="in" class="${tab === "in" ? "on" : ""}">واردة لي <span class="num">${qOpen().length}</span></button><button type="button" data-qt="out" class="${tab === "out" ? "on" : ""}">أرسلتها</button>${S.admin ? `<button type="button" data-qt="all" class="${tab === "all" ? "on" : ""}">كل الأسئلة</button>` : ""}</div><button class="btn btn-primary" type="button" data-qnew>${icon("i-plus")} سؤال جديد</button></div>
    <h3 class="q-h">بانتظار الإجابة (${open.length})</h3><div class="tk-grid">${open.map(qCard).join("") || `<div class="empty">لا توجد أسئلة بانتظار الإجابة ✓</div>`}</div>
    <h3 class="q-h">تمت الإجابة (${done.length})</h3><div class="tk-grid">${done.slice(0, 60).map(qCard).join("") || `<div class="empty s">—</div>`}</div>`;
}
function qForm(id, preset){
  const q = id ? S.qs.find(x => x.id === id) : null; if (id && !q) return toast("السؤال غير متاح لك");
  S.form = { kind:"q", id:id || null, link:preset?.link || "" };
  if (!q) { const people = S.profiles.filter(p => p.active && p.id !== S.me.id);
    return openDrawer("سؤال جديد", `${fld("q-to", "إلى", `<select class="f" id="q-to">${people.map(p => `<option value="${p.id}"${preset?.to === p.id ? " selected" : ""}>${esc(p.name || p.username)}</option>`).join("")}</select>`)}
      ${fld("q-body", "السؤال", `<textarea class="f" id="q-body" rows="5" placeholder="اكتب سؤالك بوضوح…">${esc(preset?.body || "")}</textarea>`)}
      ${preset?.link ? `<span class="hint">مرتبط بـ ${esc(linkName(preset.link))}</span>` : ""}<span class="hint">يصله إشعار فوراً، وتعرف متى قرأه ومتى أجاب.</span>`,
      `<button class="btn btn-primary" data-qsend>إرسال السؤال</button><button class="btn btn-ghost" data-close>إلغاء</button>`); }
  const toMe = q.to_id === S.me.id;
  openDrawer(`السؤال س-${q.no}`, `<div class="q-meta"><span>من <b>${esc(pname(q.from_id))}</b> إلى <b>${esc(pname(q.to_id))}</b></span><span class="s">${fmtTime(q.created_at)}${q.seen_at ? ` · قُرئ ${fmtTime(q.seen_at)}` : " · لم يُقرأ بعد"}</span></div>
    <div class="q-body">${esc(q.body).replace(/\n/g, "<br>")}</div>
    ${q.link ? `<button type="button" class="btn" data-tklink="${esc(q.link)}">فتح ${esc(linkName(q.link))}</button>` : ""}
    ${toMe || S.admin ? fld("q-ans", q.answer ? `الإجابة${q.answered_at ? " — " + fmtTime(q.answered_at) : ""}` : "إجابتك", `<textarea class="f" id="q-ans" rows="5" placeholder="اكتب الإجابة…">${esc(q.answer || "")}</textarea>`) : q.answer ? `<div class="q-ans"><b>💬 الإجابة</b><span class="s">${fmtTime(q.answered_at)}</span><div>${esc(q.answer).replace(/\n/g, "<br>")}</div></div>` : `<div class="empty s">لم تصل إجابة بعد</div>`}`,
    `${toMe || S.admin ? `<button class="btn btn-primary" data-qans>${q.answer ? "تعديل الإجابة" : "إرسال الإجابة"}</button>` : ""}${q.from_id === S.me.id && !q.answer ? `<button class="btn btn-ghost" data-qnew="${q.to_id}">سؤال آخر لنفس الشخص</button>` : ""}<button class="btn btn-ghost" data-close>إغلاق</button>`);
  if (toMe && !q.seen_at) { q.seen_at = new Date().toISOString(); sb.from("questions").update({ seen_at:q.seen_at }).eq("id", q.id).then(() => {}); }
}
async function qSend(){
  const body = $("#q-body").value.trim(); if (!body) return toast("اكتب السؤال");
  const row = { to_id:$("#q-to").value, body, link:S.form?.link || "" };
  const { data, error } = await sb.from("questions").insert(row).select(); if (error) return writeFail(error);
  S.qs = [...(data || []), ...S.qs]; closeDrawer(); toast(`أُرسل السؤال إلى ${pname(row.to_id)}`); if (S.view === "questions") render();
}
async function qAnswer(){
  const id = S.form?.id, answer = $("#q-ans").value.trim(); if (!answer) return toast("اكتب الإجابة");
  const { data, error } = await sb.from("questions").update({ answer }).eq("id", id).select(); if (error) return writeFail(error);
  const q = S.qs.find(x => x.id === id); if (q && data?.[0]) Object.assign(q, data[0]); closeDrawer(); qBadge(); toast("أُرسلت الإجابة"); if (S.view === "questions") render();
}
const _openLink15 = openLink;
openLink = function(h){ const s = String(h || "").replace(/^#/, ""); if (s.startsWith("q:")) { if (S.view !== "questions") go("questions"); return qForm(s.slice(2)); } return _openLink15(h); };
/* ask from any task */
const _taskForm15 = taskForm;
taskForm = function(id, preset){ _taskForm15(id, preset); const t = id && S.tasks.find(x => x.id === id); if (!t) return; const other = t.assignee === S.me.id ? t.assigner : t.assignee; if (other && other !== S.me.id) $(".drawer-f [data-close]")?.insertAdjacentHTML("beforebegin", `<button class="btn btn-ghost" type="button" data-qnew="${other}" data-qlink="#task:${t.id}">❓ اسأل ${esc(pname(other))}</button>`); };
const _palAll15q = palAll;
palAll = function(){ const A = _palAll15q(); A.unshift({ g:"إجراءات", t:"توجيه سؤال لموظف", s:"", ic:"i-chat", run:() => qForm(null), txt:"سؤال اسئله اسال موظف" }); return A; };
const _alerts15 = alerts;
alerts = function(){ const A = _alerts15(); const n = qOpen().length; if (n) A.unshift({ k:"gold", t:`${n} سؤال موجّه لك بانتظار إجابتك`, go:"questions" }); return A; };
const _prio15 = priorities;
priorities = function(){ const P = _prio15(); const n = qOpen().length; if (n) P.push({ w:88, k:"gold", t:`${n} سؤال موجّه لك بانتظار إجابتك`, s:qOpen().slice(0, 2).map(q => `${pname(q.from_id)}: ${q.body.slice(0, 50)}`).join(" · "), act:{ go:"questions", l:"الإجابة" } }); return P.sort((a, b) => b.w - a.w); };
const _boot9q = boot9;
boot9 = function(){ _boot9q(); loadQs().then(() => { liveQs(); qBadge(); if (S.view === "questions" && $("#drawer").hidden) render(); }); };
document.addEventListener("click", ev => {
  const t = ev.target.closest("button"); if (!t) return; const D = t.dataset;
  if (D.qt) { S.f.qt = D.qt; return render(); }
  if (D.qnew !== undefined) return qForm(null, { to:D.qnew || undefined, link:D.qlink || "" });
  if (D.q) return qForm(D.q);
  if (D.qsend !== undefined) return qSend();
  if (D.qans !== undefined) return qAnswer();
});
