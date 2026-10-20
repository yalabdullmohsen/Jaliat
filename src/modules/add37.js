/* ================= v37: replies arriving from Watheqa → clear path to the coordinator (approved or not) ================= */
S.wqn = new Map(); S.wqPend = false;
const WQ_REL = /جالي|درس|دروس|محاضر|دورة|دورات|خطب|خطبة|تجديد|حلق|مهتد/;
const WQ_NO = /(عدم الموافق|نعتذر|يتعذر|تعذّر|تعذر|لا يمكن|عدم إمكان|عدم امكان|لا نوافق|غير موافق|رفض)/;
const WQ_FROM = "2026-10-01";
function wqOutcome(w){ if (wqDir(w) !== "in") return null; const t = (w.subj || "") + " " + (w.body || ""); if (!WQ_REL.test(t)) return null; if (w.approval) return "موافقة"; if (WQ_NO.test(w.body || "")) return "اعتذار"; return null; }
const wqNeeds = w => wqDate(w) >= WQ_FROM && !!wqOutcome(w) && !S.wqn.has(w.id);
const wqPendList = () => S.wq.filter(wqNeeds);
async function wqnLoad(){ const { data } = await sb.from("wq_notify").select("*").order("sent_at", { ascending:true }).limit(3000); S.wqn = new Map((data || []).map(r => [r.wq_id, r])); }
const _loadWq37 = loadWq;
loadWq = async function(){ await Promise.all([_loadWq37(), wqnLoad()]); };

/* coordinators most likely concerned: the matched community first, then everyone */
function wqCoords(w){ const c = wqComm(w), all = S.coords.filter(x => x.phone && waNum(x.phone).length >= 10);
  const first = all.filter(x => c && (x.comm === c || (x.lang && c.includes(x.lang)))); return [...first, ...all.filter(x => !first.includes(x))]; }
const WQ_OC = { "موافقة":["✓ تمت الموافقة", "ok"], "اعتذار":["✕ لم تتم الموافقة", "bad"], "ملاحظات":["! ملاحظات تحتاج استكمال", "warn"] };
function wqMsg(w, oc, c, why){
  const doc = docBy[w.no] || (w.refs || []).map(r => docBy[r]).find(Boolean);
  const hi = `السلام عليكم ورحمة الله وبركاته\nالأخ الفاضل/ ${c?.name || ""} حفظه الله\n\n`;
  const sub = `بشأن: ${(w.subj || "").replace(/^بشأن\s*:?\s*/, "")}\nرقم الكتاب: ${w.no || "—"}`;
  if (oc === "موافقة") return `${hi}يسرّنا إفادتكم بصدور الموافقة على طلبكم ${sub}${doc?.start ? `\nالمدة: من ${fmt(doc.start)} إلى ${fmt(doc.end)}` : ""}\n\nنرجو الالتزام بالمواعيد والأماكن المعتمدة، وإبلاغنا بأي تغيير، وجزاكم الله خيراً.${SIGN}`;
  if (oc === "اعتذار") return `${hi}نفيدكم بأنه تعذّرت الموافقة على طلبكم ${sub}${why ? `\nالسبب: ${why}` : ""}\n\nيسعدنا تواصلكم مع القسم لتعديل الطلب وإعادة تقديمه، وجزاكم الله خيراً.${SIGN}`;
  return `${hi}نفيدكم بورود الرد على طلبكم ${sub}\nوقد تضمّن ملاحظات تحتاج إلى استكمال${why ? `:\n${why}` : ""}\n\nنرجو تزويدنا بها لاستكمال الإجراء، وجزاكم الله خيراً.${SIGN}`; }

function wqFlow(w){ const oc = wqOutcome(w), n = S.wqn.get(w.id), inSys = docBy[w.no] ? w.no : (w.refs || []).find(r => docBy[r]);
  const st = [["وصل الرد من وثيقة", true, fmt(wqDate(w))], ["النتيجة", !!oc, oc ? WQ_OC[oc][0] : "حدّدها عند الإبلاغ"]];
  if (oc === "موافقة") st.push(["تسجيل الموافقة في النظام", !!inSys, inSys ? `برقم ${inSys}` : "اضغط «تسجيل الموافقة في النظام»"]);
  st.push(["إبلاغ المنسق", !!n, n ? `${n.coord || ""} · ${fmtTime(n.sent_at)}` : "بالواتساب من هنا"]);
  const next = st.findIndex(s => !s[1]);
  return `<div class="wf">${st.map(([t, ok, s], i) => `<div class="wf-s${ok ? " ok" : i === next ? " now" : ""}"><i>${ok ? "✓" : i + 1}</i><b>${t}</b><span>${esc(s)}</span></div>`).join("")}</div>`; }
function wqNotifyBox(w){ const oc = wqOutcome(w) || "ملاحظات", L = wqCoords(w), n = S.wqn.get(w.id); S.wqF = { id:w.id, oc, ci:0 };
  return `<div class="rq-sec wn" id="wn"><b>📲 إبلاغ المنسق${n ? " (أُبلغ سابقاً، يمكن الإعادة)" : ""}</b>
    <div class="seg" id="wn-oc">${Object.keys(WQ_OC).map(k => `<button type="button" data-wnoc="${k}" class="${k === oc ? "on" : ""}">${WQ_OC[k][0]}</button>`).join("")}</div>
    ${fld("wn-c", "المنسق", `<select class="f" id="wn-c">${L.map((c, i) => `<option value="${i}">${esc(c.name)}، ${esc(c.comm || c.lang || "")}${c.role && c.role !== "منسق" ? " (" + esc(c.role) + ")" : ""}</option>`).join("")}</select>`)}
    <div id="wn-why-w" ${oc === "موافقة" ? "hidden" : ""}>${fld("wn-why", "السبب / الملاحظات (اختياري)", `<textarea class="f" id="wn-why" rows="2"></textarea>`)}</div>
    ${fld("wn-t", "نص الرسالة", `<textarea class="f" id="wn-t" rows="9">${esc(wqMsg(w, oc, L[0]))}</textarea>`)}
    <button type="button" class="btn btn-ok" data-wnsend>📲 إبلاغ المنسق بالواتساب</button></div>`; }
function wnRefresh(){ const w = S.wq.find(x => x.id === S.wqF?.id); if (!w) return; const c = wqCoords(w)[+($("#wn-c")?.value || 0)]; $("#wn-t").value = wqMsg(w, S.wqF.oc, c, $("#wn-why")?.value.trim()); const ww = $("#wn-why-w"); if (ww) ww.hidden = S.wqF.oc === "موافقة"; }
async function wnSend(){ const w = S.wq.find(x => x.id === S.wqF?.id); if (!w) return; const c = wqCoords(w)[+($("#wn-c")?.value || 0)]; if (!c) return toast("اختر المنسق");
  waGo(c.phone, $("#wn-t").value, null, c.name);
  const { data, error } = await sb.from("wq_notify").insert({ wq_id:w.id, outcome:S.wqF.oc, coord:c.name, phone:waNum(c.phone), comm:c.comm || null }).select().single(); if (error) return writeFail(error);
  S.wqn.set(w.id, data); toast(`أُبلغ ${c.name} ✓`); wqForm(w.id); }

const _wqForm37 = wqForm;
wqForm = function(id){ _wqForm37(id); const w = S.wq.find(x => x.id === id); if (!w) return;
  const b = $(".drawer-b"); if (!b) return; b.insertAdjacentHTML("afterbegin", wqFlow(w));
  if (S.canWrite) { const q = b.querySelector(".q-body"); (q || b.lastElementChild).insertAdjacentHTML("beforebegin", wqNotifyBox(w));
    $(".drawer-f [data-close]")?.insertAdjacentHTML("beforebegin", `<button class="btn btn-ok" type="button" data-wngo>📲 إبلاغ المنسق</button>`); } };

/* Watheqa page: banner + filter for replies still waiting to be passed on */
const _vWatheqa37 = vWatheqa;
vWatheqa = function(){ const P = wqPendList();
  const ban = P.length || S.wqPend ? `<div class="check ${P.length ? "warn" : "ok"} wn-ban"><b>${P.length ? `${P.length === 1 ? "رد واحد" : P.length === 2 ? "ردّان" : P.length + (P.length < 11 ? " ردود" : " رداً")} من وثيقة بانتظار إبلاغ المنسق` : "أُبلغ المنسقون بكل الردود ✓"}</b><span>موافقات وردود اعتذار وصلت منذ بداية أكتوبر، افتح الرد واضغط «إبلاغ المنسق».</span><button type="button" class="btn ${S.wqPend ? "" : "btn-primary"}" data-wnpend>${S.wqPend ? "عرض كل الكتب" : "عرضها فقط"}</button></div>` : "";
  let h; if (S.wqPend) { const all = S.wq; S.wq = P; try { h = _vWatheqa37(); } finally { S.wq = all; } } else h = _vWatheqa37();
  const i = h.indexOf('<div class="toolbar">'); return i < 0 ? ban + h : h.slice(0, i) + ban + h.slice(i); };
const _afterRender37 = afterRender;
afterRender = function(v){ _afterRender37(v); if (S.view !== "watheqa") return;
  document.querySelectorAll(".wq-i[data-wq]:not(.wq2)").forEach(b => { if (b.querySelector(".wn-c")) return; const w = S.wq.find(x => x.id === b.dataset.wq); if (!w || wqDate(w) < WQ_FROM) return; const oc = wqOutcome(w); if (!oc) return;
    const n = S.wqn.get(w.id); b.insertAdjacentHTML("beforeend", `<span class="chip wn-c ${n ? "ok" : "warn"}">${n ? "أُبلغ المنسق ✓" : oc === "موافقة" ? "موافقة، أبلغ المنسق" : "اعتذار، أبلغ المنسق"}</span>`); }); };
const _prio37 = priorities;
priorities = function(){ const P = _prio37(); const n = S.canWrite ? wqPendList().length : 0; if (n) P.push({ w:90, k:"warn", t:`ردود وثيقة بانتظار إبلاغ المنسق: ${n}`, s:"موافقة أو اعتذار، المنسق ينتظر", act:{ go:"watheqa", l:"أبلغهم" } }); return P.sort((a, b) => b.w - a.w); };
document.addEventListener("click", ev => { const t = ev.target.closest("button"); if (!t) return; const D = t.dataset;
  if (D.wnoc) { S.wqF.oc = D.wnoc; document.querySelectorAll("#wn-oc button").forEach(x => x.classList.toggle("on", x === t)); return wnRefresh(); }
  if (D.wnsend !== undefined) return wnSend();
  if (D.wngo !== undefined) { $("#wn")?.scrollIntoView({ behavior:"smooth", block:"start" }); return; }
  if (D.wnpend !== undefined) { S.wqPend = !S.wqPend; return render(); }
});
document.addEventListener("change", ev => { if (ev.target.id === "wn-c") wnRefresh(); });
document.addEventListener("input", ev => { if (ev.target.id === "wn-why") wnRefresh(); });
NEWF.splice(1, 0, ["v37-wn", "nav:watheqa", "إبلاغ المنسق برد وثيقة", "كل رد يصل من وثيقة (موافقة أو اعتذار) يظهر مساره خطوة بخطوة، وزر «إبلاغ المنسق» يرسل له الرسالة الرسمية بالواتساب ويُسجَّل.", false, "2026-10-20"]);

/* v44: one-tap «أبلغ المنسق» from the list, and opening a reply from its notification jumps straight to the ready message */
async function wnQuick(id){ const w = S.wq.find(x => x.id === id); if (!w) return; const c = wqCoords(w)[0]; if (!c) return wqForm(id);
  const oc = wqOutcome(w) || "ملاحظات";
  waGo(c.phone, wqMsg(w, oc, c), null, c.name);
  const { data, error } = await sb.from("wq_notify").insert({ wq_id:w.id, outcome:oc, coord:c.name, phone:waNum(c.phone), comm:c.comm || null }).select().single(); if (error) return writeFail(error);
  S.wqn.set(w.id, data); toast(`الرسالة جاهزة لـ ${c.name}، اضغط إرسال في واتساب`); }
document.addEventListener("click", ev => { const t = ev.target.closest("[data-wnq]"); if (!t) return; ev.preventDefault(); ev.stopPropagation(); wnQuick(t.dataset.wnq); }, true);
const _wqForm44 = wqForm;
wqForm = function(id){ _wqForm44(id); const w = S.wq.find(x => x.id === id); if (w && S.canWrite && typeof wqNeeds === "function" && wqNeeds(w)) setTimeout(() => { const b = $("#wn"); if (b) { b.scrollIntoView({ behavior:"smooth", block:"start" }); b.classList.add("wn-hot"); } }, 150); };
