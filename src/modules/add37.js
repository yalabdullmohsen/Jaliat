/* ================= v37: replies arriving from Watheqa → clear path to the coordinator (approved or not) ================= */
S.wqn = new Map();
const WQ_REL = /جالي|درس|دروس|محاضر|دورة|دورات|خطب|خطبة|تجديد|حلق|مهتد/;
const WQ_NO = /(عدم الموافق|نعتذر|يتعذر|تعذّر|تعذر|لا يمكن|عدم إمكان|عدم امكان|لا نوافق|غير موافق|رفض)/;
const WQ_FROM = "2026-11-08";
function wqOutcome(w){ if (wqDir(w) !== "in") return null; const t = (w.subj || "") + " " + (w.body || ""); if (!WQ_REL.test(t)) return null; if (w.approval) return "موافقة"; if (WQ_NO.test(w.body || "")) return "اعتذار"; return null; }
const wqNeeds = w => wqDate(w) >= WQ_FROM && !!wqOutcome(w) && !S.wqn.has(w.id);
const wqPendList = () => S.wq.filter(wqNeeds);
async function wqnLoad(){ const { data } = await sb.from("wq_notify").select("*").order("sent_at", { ascending:true }).limit(3000); S.wqn = new Map((data || []).map(r => [r.wq_id, r])); }
const _loadWq37 = loadWq;
loadWq = async function(){ await Promise.all([_loadWq37(), wqnLoad()]); };

/* coordinators most likely concerned: the matched community first, then everyone */
function wqCoords(w){ const all = S.coords.filter(x => x.phone && waNum(x.phone).length >= 10 && x.status !== "سابق"), { M, N } = wqCommAll(w);
  const exp = c => { const g = S.comms.find(x => x.name === c); return g?.pending ? (g.split || []) : [c]; };
  const pick = new Set(N.length ? N : M.flatMap(exp)), first = all.filter(x => pick.has(x.comm)).sort((a, b) => (a.role === "منسق" ? 0 : 1) - (b.role === "منسق" ? 0 : 1));
  const L = [...first, ...all.filter(x => !first.includes(x))]; L.sure = new Set(first.filter(x => x.role === "منسق").map(x => x.comm)).size === 1; L.hit = first.length; return L; }
const wnIdx = () => { const v = $("#wn-c")?.value; return v === "" || v == null ? -1 : +v; };
const WQ_OC = { "موافقة":["✓ تمت الموافقة", "ok"], "اعتذار":["✕ لم تتم الموافقة", "bad"], "ملاحظات":["! ملاحظات تحتاج استكمال", "warn"] };
function wqMsg(w, oc, c, why){
  const doc = docBy[w.no] || (w.refs || []).map(r => docBy[r]).find(Boolean);
  const hi = `السلام عليكم ورحمة الله وبركاته\nالأخ الفاضل/ ${c?.name || ""} حفظه الله\n\n`;
  const sub = `بشأن: ${(w.subj || "").replace(/^بشأن\s*:?\s*/, "")}\nرقم الكتاب: ${w.no || "—"}`;
  if (oc === "موافقة") return `${hi}يسرّنا إفادتكم بصدور الموافقة على طلبكم ${sub}${doc?.start ? `\nالمدة: من ${fmt(doc.start)} إلى ${fmt(doc.end)}` : ""}\n\nنرجو الالتزام بالمواعيد والأماكن المعتمدة، وإبلاغنا بأي تغيير، وجزاكم الله خيراً.${SIGN}`;
  if (oc === "اعتذار") return `${hi}نفيدكم بأنه تعذّرت الموافقة على طلبكم ${sub}${why ? `\nالسبب: ${why}` : ""}\n\nيسعدنا تواصلكم مع القسم لتعديل الطلب وإعادة تقديمه، وجزاكم الله خيراً.${SIGN}`;
  return `${hi}نفيدكم بورود الرد على طلبكم ${sub}\nوقد تضمّن ملاحظات تحتاج إلى استكمال${why ? `:\n${why}` : ""}\n\nنرجو تزويدنا بها لاستكمال الإجراء، وجزاكم الله خيراً.${SIGN}`; }

function wqNotifyBox(w){ const oc = wqOutcome(w) || "ملاحظات", L = wqCoords(w), n = S.wqn.get(w.id); S.wqF = { id:w.id, oc, ci:0 };
  return `<div class="rq-sec wn" id="wn"><b>📲 إبلاغ المنسق${n ? " (أُبلغ سابقاً، يمكن الإعادة)" : ""}</b>
    <div class="seg" id="wn-oc">${Object.keys(WQ_OC).map(k => `<button type="button" data-wnoc="${k}" class="${k === oc ? "on" : ""}">${WQ_OC[k][0]}</button>`).join("")}</div>
    ${fld("wn-c", "المنسق", `<select class="f" id="wn-c">${L.sure ? "" : `<option value="" selected>— اختر المنسق (لم يتضح من الكتاب) —</option>`}${L.map((c, i) => `<option value="${i}"${L.sure && !i ? " selected" : ""}>${i < L.hit ? "★ " : ""}${esc(c.name)}، ${esc(c.comm || c.lang || "")}${c.role && c.role !== "منسق" ? " (" + esc(c.role) + ")" : ""}</option>`).join("")}</select>`)}
    <div id="wn-why-w" ${oc === "موافقة" ? "hidden" : ""}>${fld("wn-why", "السبب / الملاحظات (اختياري)", `<textarea class="f" id="wn-why" rows="2"></textarea>`)}</div>
    ${fld("wn-t", "نص الرسالة", `<textarea class="f" id="wn-t" rows="9">${esc(wqMsg(w, oc, L.sure ? L[0] : null))}</textarea>`)}
    <button type="button" class="btn btn-ok" data-wnsend>📲 إبلاغ المنسق بالواتساب</button>${n ? `<button type="button" class="btn btn-ghost" data-wnunmark="${esc(w.id)}">إلغاء علامة «أُبلغ»</button>` : `<button type="button" class="btn" data-wnmark="${esc(w.id)}">✓ تم الإبلاغ (أعلّمها أنا)</button>`}</div>`; }
function wnRefresh(){ const w = S.wq.find(x => x.id === S.wqF?.id); if (!w) return; const c = wqCoords(w)[wnIdx()]; $("#wn-t").value = wqMsg(w, S.wqF.oc, c, $("#wn-why")?.value.trim()); const ww = $("#wn-why-w"); if (ww) ww.hidden = S.wqF.oc === "موافقة"; }
async function wnSend(){ const w = S.wq.find(x => x.id === S.wqF?.id); if (!w) return; const c = wqCoords(w)[wnIdx()]; if (!c) return toast("اختر المنسق أولاً");
  waGo(c.phone, $("#wn-t").value, null, c.name);
  toast("بعد ما ترسل في واتساب اضغط «تم الإبلاغ» لتعلّمها"); }
/* العلامة يضعها المستخدم بنفسه فقط، النظام لا يعرف هل أُرسلت الرسالة فعلاً */
async function wnMark(id, byForm){ const w = S.wq.find(x => x.id === id); if (!w) return; const c = wqCoords(w)[byForm ? wnIdx() : 0]; if (!c) return toast("اختر المنسق أولاً");
  const { data, error } = await sb.from("wq_notify").insert({ wq_id:w.id, outcome:(byForm && S.wqF?.oc) || wqOutcome(w) || "ملاحظات", coord:c.name, phone:waNum(c.phone), comm:c.comm || null }).select().single(); if (error) return writeFail(error);
  S.wqn.set(w.id, data); toast(`عُلِّم: أُبلغ ${c.name} ✓`); if (byForm) wqForm(w.id); else render(); }
async function wnUnmark(id){ const { error } = await sb.from("wq_notify").delete().eq("wq_id", id); if (error) return writeFail(error); S.wqn.delete(id); toast("أُلغيت علامة الإبلاغ"); wqForm(id); }
document.addEventListener("click", ev => { const m = ev.target.closest("[data-wnmark],[data-wnmk],[data-wnunmark]"); if (!m) return; ev.preventDefault(); ev.stopPropagation(); if (m.dataset.wnunmark) return wnUnmark(m.dataset.wnunmark); wnMark(m.dataset.wnmark || m.dataset.wnmk, !!m.dataset.wnmark); }, true);


/* Watheqa page: banner + filter for replies still waiting to be passed on */
const _vWatheqa37 = vWatheqa;
vWatheqa = function(){ const h = _vWatheqa37(), ban = wqTodoBox(), i = h.indexOf('<div class="toolbar">'); return i < 0 ? ban + h : h.slice(0, i) + ban + h.slice(i); };
const _afterRender37 = afterRender;
afterRender = function(v){ _afterRender37(v); if (S.view !== "watheqa") return;
  document.querySelectorAll(".wq-i[data-wq]:not(.wq2)").forEach(b => { if (b.querySelector(".wn-c")) return; const w = S.wq.find(x => x.id === b.dataset.wq); if (!w || wqDate(w) < WQ_FROM) return; const oc = wqOutcome(w); if (!oc) return;
    const n = S.wqn.get(w.id); b.insertAdjacentHTML("beforeend", `<span class="chip wn-c ${n ? "ok" : "warn"}">${n ? "أُبلغ المنسق ✓" : oc === "موافقة" ? "موافقة، أبلغ المنسق" : "اعتذار، أبلغ المنسق"}</span>`); }); };
const _prio37 = priorities;
priorities = function(){ const P = _prio37(); const n = S.canWrite ? wqTodo().length : 0; if (n) P.push({ w:90, k:"warn", t:`كتب وثيقة تحتاج إجراء منك: ${n}`, s:"سجّل الموافقة، أصدر التصريح، أرسله للمنسق", act:{ go:"watheqa", l:"افتحها" } }); return P.sort((a, b) => b.w - a.w); };
document.addEventListener("click", ev => { const t = ev.target.closest("button"); if (!t) return; const D = t.dataset;
  if (D.wnoc) { S.wqF.oc = D.wnoc; document.querySelectorAll("#wn-oc button").forEach(x => x.classList.toggle("on", x === t)); return wnRefresh(); }
  if (D.wnsend !== undefined) return wnSend();
  if (D.wngo !== undefined) { $("#wn")?.scrollIntoView({ behavior:"smooth", block:"start" }); return; }
});
document.addEventListener("change", ev => { if (ev.target.id === "wn-c") wnRefresh(); });
document.addEventListener("input", ev => { if (ev.target.id === "wn-why") wnRefresh(); });
NEWF.splice(1, 0, ["v37-wn", "nav:watheqa", "إبلاغ المنسق برد وثيقة", "كل رد يصل من وثيقة (موافقة أو اعتذار) يظهر مساره خطوة بخطوة، وزر «إبلاغ المنسق» يرسل له الرسالة الرسمية بالواتساب ويُسجَّل.", false, "2026-10-20"]);

/* v44: one-tap «أبلغ المنسق» from the list, and opening a reply from its notification jumps straight to the ready message */
async function wnQuick(id){ const w = S.wq.find(x => x.id === id); if (!w) return; const c = wqCoords(w)[0]; if (!c) return wqForm(id);
  const oc = wqOutcome(w) || "ملاحظات";
  waGo(c.phone, wqMsg(w, oc, c), null, c.name);
  toast(`الرسالة جاهزة لـ ${c.name}، أرسلها ثم اضغط ✓ تم`); }
document.addEventListener("click", ev => { const t = ev.target.closest("[data-wnq]"); if (!t) return; ev.preventDefault(); ev.stopPropagation(); wnQuick(t.dataset.wnq); }, true);
