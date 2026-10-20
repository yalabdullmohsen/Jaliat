/* ================= v30: replies inside a task — the employee can answer or ask the head for what he needs to finish ================= */
S.tkr = {};
async function tkrLoad(id){ const { data } = await sb.from("task_replies").select("*").eq("task_id", id).order("created_at"); S.tkr[id] = data || []; tkrPaint(id); }
function tkrHTML(id){ const L = S.tkr[id];
  if (!L) return `<div class="s">جارٍ التحميل…</div>`;
  return L.map(r => `<div class="tkr-m ${r.user_id === S.me.id ? "me" : ""} ${r.kind === "need" ? "need" : ""}"><span class="tkr-w">${r.kind === "need" ? "🙋 يحتاج لإكمال المهمة · " : ""}${esc(pname(r.user_id))} · ${fmtTime(r.created_at)}</span><div>${esc(r.body).replace(/\n/g, "<br>")}</div></div>`).join("") || `<div class="s">لا توجد ردود بعد — اكتب أول رد.</div>`; }
function tkrPaint(id){ const b = $("#tkr-l"); if (b && S.form?.kind === "task" && S.form.id === id) { b.innerHTML = tkrHTML(id); b.scrollTop = b.scrollHeight; } }
const TKR_Q = ["أحتاج معلومات إضافية", "أحتاج موافقتك قبل التنفيذ", "أحتاج كتاباً أو مستنداً", "أحتاج تمديد الموعد"];
const _taskForm30 = taskForm;
taskForm = function(id, preset){ _taskForm30(id, preset); const t = id && S.tasks.find(x => x.id === id); if (!t) return;
  const mine = t.assignee === S.me.id;
  $(".drawer-b")?.insertAdjacentHTML("beforeend", `<div class="rq-sec tkr"><b>💬 الردود على المهمة</b>
    ${t.waiting === "mgr" ? `<div class="check warn"><b>🙋 ${mine ? "طلبك وصل لرئيس القسم — بانتظار رده" : `${esc(pname(t.assignee))} يحتاج منك شيئاً لإكمال المهمة`}</b></div>` : ""}
    <div class="tkr-l" id="tkr-l">${tkrHTML(id)}</div>
    ${mine ? `<div class="tkr-q">${TKR_Q.map(q => `<button type="button" class="chip" data-tkrq="${esc(q)}">${esc(q)}</button>`).join("")}</div>` : ""}
    <textarea class="f" id="tkr-in" rows="2" placeholder="${mine ? "اكتب ردك، أو ما تحتاجه من رئيس القسم لإكمال المهمة…" : "اكتب ردك على الموظف…"}"></textarea>
    <div class="br-acts">${mine ? `<button type="button" class="btn btn-primary" data-tkrsend="need">🙋 أحتاج هذا لإكمال المهمة</button><button type="button" class="btn" data-tkrsend="reply">إرسال رد</button>` : `<button type="button" class="btn btn-primary" data-tkrsend="reply">إرسال الرد</button>`}</div></div>`);
  tkrLoad(id);
};
async function tkrSend(kind){ const id = S.form?.id, i = $("#tkr-in"), body = i?.value.trim(); if (!id || !body) return toast("اكتب الرد أولاً");
  const b = document.querySelectorAll("[data-tkrsend]"); b.forEach(x => x.disabled = true);
  const { data, error } = await sb.from("task_replies").insert({ task_id:id, kind, body }).select().single(); b.forEach(x => x.disabled = false);
  if (error) return writeFail(error); i.value = ""; (S.tkr[id] = S.tkr[id] || []).some(r => r.id === data.id) || S.tkr[id].push(data); tkrPaint(id);
  const t = S.tasks.find(x => x.id === id); if (t) t.waiting = kind === "need" ? "mgr" : t.assignee === S.me.id ? t.waiting : null;
  toast(kind === "need" ? "وصل طلبك لرئيس القسم مع إشعار" : `وصل ردك لـ ${pname(t?.assignee === S.me.id ? t.assigner : t?.assignee)}`);
}
document.addEventListener("click", ev => { const t = ev.target.closest("button"); if (!t) return; const D = t.dataset;
  if (D.tkrsend) return tkrSend(D.tkrsend);
  if (D.tkrq) { const i = $("#tkr-in"); if (i) { i.value = D.tkrq + ": "; i.focus(); } }
});
let tkrCh = null;
const _boot9tkr30 = boot9;
boot9 = function(){ _boot9tkr30(); if (tkrCh) sb.removeChannel(tkrCh);
  tkrCh = sb.channel("tkr").on("postgres_changes", { event:"INSERT", schema:"public", table:"task_replies" }, p => { const r = p.new, L = S.tkr[r.task_id]; if (L && !L.some(x => x.id === r.id)) { L.push(r); tkrPaint(r.task_id); } }).subscribe(); };
const _taskCard30 = taskCard;
taskCard = function(t, mgr){ const h = _taskCard30(t, mgr); return t.waiting === "mgr" && t.status !== "منجزة" ? h.replace('</div>\n    <b>', `<span class="chip warn">🙋 ${mgr ? "يحتاج ردك" : "بانتظار رد الرئيس"}</span></div>\n    <b>`) : h; };
const _prio30 = priorities;
priorities = function(){ const P = _prio30(); if (S.admin) { const L = (S.tasks || []).filter(t => t.waiting === "mgr" && t.status !== "منجزة"); if (L.length) P.push({ w:96, k:"warn", t:`${L.length} مهمة يحتاج فيها الموظف ردك لإكمالها`, s:L.slice(0, 3).map(t => `${pname(t.assignee)}: ${t.title}`).join("، "), act:{ go:"tasks", l:"افتح المهام" } }); } return P.sort((a, b) => b.w - a.w); };
NEWF.splice(1, 0, ["v30-tkr", "nav:tasks", "الرد على المهمة", "داخل كل مهمة: الموظف يرد أو يطلب من رئيس القسم ما يحتاجه لإكمالها («أحتاج موافقة / معلومات / كتاب»)، ويصل إشعار فوري والرد يرجع له.", false, "2026-10-20"]);
