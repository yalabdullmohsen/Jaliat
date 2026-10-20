/* ================= v20: one connected system، every record shows what it is linked to ================= */
const LK = {
  wqDoc:no => no ? S.wq.filter(w => w.no === no || (w.refs || []).includes(no)) : [],
  wqComm:c => c ? S.wq.filter(w => wqComm(w) === c) : [],
  wqText:s => { const k = nkey(s || ""); return k.length > 5 ? S.wq.filter(w => nkey(w.body + " " + w.subj).includes(k)) : []; },
  permAct:e => S.permits.filter(p => p.act_id === e.id || (e.lect && p.data?.sheikh && (e.lect || "").split(" / ").some(l => nkey(l) === nkey(p.data.sheikh)) && nkey(p.data?.mosque || "").includes(nkey(e.mosName || "~")))),
  waPhone:ph => { const k = waKey(ph); return k.length >= 10 ? S.waMsgs.filter(m => waKey(m.phone) === k) : []; },
  tasks:link => S.tasks.filter(t => t.link === link),
  reqsComm:c => S.reqs.filter(r => r.data?.comm === c && !["معتمد", "مرفوض"].includes(r.status)),
};
const uniq = (a, k = x => x.id) => { const s = new Set(); return a.filter(x => { const v = k(x); if (s.has(v)) return false; s.add(v); return true; }); };
function lkRow(icon_, t, s, open, chip){ return `<button type="button" class="lk-i" ${open.startsWith("go:") ? `data-go="${open.slice(3)}"` : `data-prio-open="${esc(open)}"`}><svg><use href="#${icon_}"/></svg><span class="lk-t"><b>${esc(t)}</b>${s ? `<span class="s">${esc(s)}</span>` : ""}</span>${chip || ""}</button>`; }
function lkPanel(title, rows){ rows = rows.filter(Boolean); return rows.length ? `<div class="lk"><div class="lk-h">${icon("i-link", 15)} ${esc(title)} <span class="num">${rows.length}</span></div>${rows.join("")}</div>` : ""; }
const wqRow = w => lkRow("i-doc", `${w.no}، ${w.subj || ""}`, `${fmt(wqDate(w))} · ${w.sender || ""}`, `wq:${w.id}`, w.approval ? `<span class="chip ok">لا مانع</span>` : "");
const pmRow = p => { const [st, c] = pStatus(p); return lkRow("i-qr", `تصريح ${p.no}، ${p.data?.sheikh || ""}`, `${p.data?.mosque || ""} · حتى ${fmt(p.until)}`, `permit:${p.id}`, `<span class="chip ${c}">${st}</span>`); };
const tkRow = t => lkRow("i-list", `مهمة #${t.no}، ${t.title}`, `${pname(t.assignee)} · ${t.status}`, `task:${t.id}`);
const rqRow = r => lkRow("i-inbox", `طلب ط-${r.no}، ${r.data?.subj || r.data?.org || ""}`, `${r.data?.coord || ""} · ${r.status}`, `req:${r.id}`);
const waRow = (ph, L) => { const last = L[0]; return lkRow("i-wa", `محادثة واتساب +${waKey(ph)}`, `${L.length} رسالة · آخرها ${last ? waTime(last.created_at) : ""}`, "go:whatsapp"); };

/* activity drawer: approval letter, permits, tasks, coordinator chat */
const _actForm20 = actForm;
actForm = function(id, preset){ _actForm20(id, preset); const e = id && S.byId.get(id); if (!e || S.form?.kind !== "act") return;
  const co = S.coords.filter(c => c.comm === e.comm && c.phone);
  const html = lkPanel("مرتبط بهذا النشاط", [
    ...(e.doc && docBy[e.doc] ? [lkRow("i-doc", `الموافقة ${e.doc}`, `${fmt(docBy[e.doc].start)} ← ${fmt(docBy[e.doc].end)}`, `doc:${e.doc}`)] : []),
    ...LK.wqDoc(e.doc).slice(0, 4).map(wqRow), ...LK.permAct(e).slice(0, 4).map(pmRow), ...LK.tasks(`#act:${id}`).map(tkRow),
    ...co.map(c => { const L = LK.waPhone(c.phone); return L.length ? waRow(c.phone, L) : ""; })]);
  if (html) $("#drawer .drawer-b")?.insertAdjacentHTML("beforeend", html); };
/* request drawer: Watheqa letters, chat, tasks */
const _reqForm20 = reqForm;
reqForm = async function(id){ await _reqForm20(id); const r = S.reqs.find(x => x.id === id); if (!r || S.form?.kind !== "req") return; const d = r.data || {};
  const L = LK.waPhone(d.phone);
  const html = lkPanel("مرتبط بهذا الطلب", [...uniq([...LK.wqDoc(d.doc), ...LK.wqText(d.coord)]).slice(0, 5).map(wqRow), ...(L.length ? [waRow(d.phone, L)] : []), ...LK.tasks(`#req:${id}`).map(tkRow)]);
  if (html) $("#drawer .rq-tools")?.insertAdjacentHTML("beforebegin", html); };
/* community page: its whole picture in one place */
const _vComm20 = vComm;
vComm = function(){ const h = _vComm20(), c = S.comm; const acts = S.E.filter(e => e.comm === c);
  const perms = uniq(acts.flatMap(LK.permAct)).filter(p => pStatus(p)[0] === "ساري");
  const chats = S.coords.filter(x => x.comm === c && x.phone).map(x => [x.phone, LK.waPhone(x.phone)]).filter(([, L]) => L.length);
  const docs = S.docs.filter(d => d.comm === c && d.end >= TODAY);
  const body = [lkPanel("موافقات سارية", docs.map(d => lkRow("i-doc", `${d.no}، ${d.subj || ""}`, `حتى ${fmt(d.end)}`, `doc:${d.no}`))),
    lkPanel("كتب وثيقة", LK.wqComm(c).slice(0, 8).map(wqRow)), lkPanel("طلبات مفتوحة", LK.reqsComm(c).map(rqRow)),
    lkPanel("تصاريح سارية", perms.map(pmRow)), lkPanel("محادثات واتساب", chats.map(([p, L]) => waRow(p, L)))].join("");
  if (!body) return h;
  const i = h.indexOf('<div class="toolbar">'); const box = `<div class="lk-grid">${body}</div>`; return i > 0 ? h.slice(0, i) + box + h.slice(i) : h + box; };

/* Watheqa page: register every pending approval in one tap (admin) */
async function wqAddAll(){
  const L = S.wq.filter(w => w.approval && w.no && !docBy[w.no] && !(w.refs || []).some(r => docBy[r]));
  if (!L.length) return toast("لا توجد موافقات غير مسجلة");
  const add = L.map(w => { const start = wqDate(w) || TODAY; return { no:w.no, date:start, subj:w.subj || "موافقة", comm:wqComm(w), start, end:addMonths(start, 6), notes:"من نظام وثيقة، " + (w.signer || "") }; });
  try { await T.ref("docs", [...S.docs, ...add]); toast(`سُجّلت ${add.length} موافقة في النظام`); render(); } catch (e) { writeFail(e); }
}
const _vWatheqa20 = vWatheqa;
vWatheqa = function(){ let h = _vWatheqa20(); const n = S.wq.filter(w => w.approval && w.no && !docBy[w.no] && !(w.refs || []).some(r => docBy[r])).length;
  if (n && S.canWrite) h = h.replace('<button type="button" class="btn btn-ghost" data-wqhelp>', `<button type="button" class="btn btn-primary" data-wqall>تسجيل كل الموافقات (${n})</button><button type="button" class="btn btn-ghost" data-wqhelp>`);
  return h; };

/* home: one connected snapshot of every part of the system */
function linkStrip(){
  const pend = S.wq.filter(w => w.approval && !docBy[w.no] && !(w.refs || []).some(r => docBy[r])).length;
  const live = S.permits.filter(p => pStatus(p)[0] === "ساري").length, gr = S.grants.filter(gOpen).length, wa = waUnread();
  const rq = S.reqs.filter(r => !["معتمد", "مرفوض"].includes(r.status)).length, tk = S.tasks.filter(t => TK_OPEN.includes(t.status)).length;
  const it = (go, label, n, k) => `<button type="button" class="ls-i" data-go="${go}" style="--k:var(${k})"><b class="num">${n}</b><span>${label}</span></button>`;
  return `<div class="ls">${it("inbox", "طلبات مفتوحة", rq, "--t1")}${it("tasks", "مهام قيد العمل", tk, "--t2")}${it("watheqa", "موافقات وثيقة غير مسجلة", pend, "--gold")}${it("permits", "تصاريح سارية", live, "--ok")}${gr ? it("permits", "تفويضات معلّقة", gr, "--t3") : ""}${it("whatsapp", "واتساب بانتظار الرد", wa, "--primary")}</div>`;
}
const _vHome20 = vHome;
vHome = function(){ const h = _vHome20(); const i = h.indexOf('<div class="kpis'); return i >= 0 ? h.slice(0, i) + linkStrip() + h.slice(i) : linkStrip() + h; };

/* assistant: knows the new parts too */
const _answer20 = answer;
answer = function(q){ const t = norm(q); const R = (title, items, extra) => ({ title, items:items || [], extra:extra || "" });
  if (/تصريح|تصاريح/.test(t) && !/تفويض/.test(t)) { const L = S.permits.filter(p => pStatus(p)[0] === "ساري"); return R(`التصاريح السارية (${L.length})`, L.map(p => ({ t:`${p.no}، ${p.data?.sheikh || ""}`, s:`${p.data?.mosque || ""} · حتى ${fmt(p.until)}`, open:`permit:${p.id}` })), S.admin ? "لإصدار تصريح جديد: صفحة «تصاريح الدروس»." : ""); }
  if (/تفويض/.test(t)) { const L = S.grants.filter(gOpen); return R(`التفويضات المعلّقة (${L.length})`, L.map(g => ({ t:`${g.preset?.sheikh || ""}، ${pname(g.grantee)}`, s:`${g.preset?.mosque || ""} · حتى ${fmt(g.expires)}`, open:`pgrant:${g.id}` }))); }
  if (/واتساب|واتس/.test(t)) { const T = waThreads().slice(0, 15); return R(`محادثات واتساب (${waUnread()} بانتظار الرد)`, T.map(x => ({ t:x.name || waWho(x.phone) || "+" + x.phone, s:String(x.last.body || "مرفق").slice(0, 80), go:"whatsapp" }))); }
  return _answer20(q); };
SUGG.splice(5, 0, ["التصاريح السارية", "i-qr", "التصاريح السارية"]);

document.addEventListener("click", ev => { const t = ev.target.closest("button"); if (!t) return; if (t.dataset.wqall !== undefined) wqAddAll(); });
