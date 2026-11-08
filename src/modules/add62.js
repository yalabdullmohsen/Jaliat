/* ================= v82: Watheqa — every approval sits with its original letter =================
   An approval/reply (the "child") is linked to the letter we sent (the "parent") in the database (parent column).
   The original letter is where the times, mosques and lecturers are, so it is always shown next to the approval,
   and activities are read from it when the approval letter itself has no table.
   Approval written only in the procedures («لا مانع») → shown as such, with «لا يوجد كتاب موافقة». */
const wqById = id => S.wq.find(x => x.id === id);
const wqParent = w => w?.parent ? wqById(w.parent) : null;
const wqKids = o => S.wq.filter(x => x.parent === o.id);
const wqActSnip = w => { const t = String(w.actions || ""); const m = t.match(/[^\n]*(لا\s*مانع|لا يوجد تعارض|موافق)[^\n]*/); return (m ? m[0] : "").trim().slice(0, 160); };
const _wqIndex82 = wqIndex;
wqIndex = function(){ const reply = _wqIndex82(); for (const w of S.wq) if (w.parent && !reply.has(w.parent)) reply.set(w.parent, w); return reply; };
const _wqState82 = wqState;
wqState = function(w, reply){ const r = _wqState82(w, reply); if (wqDir(w) === "out" && !r[2] && w.act_ok) return ["تمت الموافقة (بالإجراءات)", "ok", null]; return r; };
function wqDocBox(o, title, open){ if (!o) return "";
  return `<details class="wqp"${open ? " open" : ""}><summary><b>${title}</b><span class="num">${esc(o.no || "")}</span><span class="s">${fmt(wqDate(o))}</span><button type="button" class="lnk" data-wq="${esc(o.id)}">فتح</button></summary>
    <div class="wqp-m"><b>${esc(o.subj || "")}</b><span class="s">${wqDir(o) === "out" ? "إلى" : "من"}: ${esc(wqClean(wqDir(o) === "out" ? o.to_whom : (wqFrom(o) || o.sender || "")) || "—")}</span></div>
    <div class="q-body">${esc(o.body || "لا يوجد نص").replace(/\n/g, "<br>")}</div></details>`; }
/* activities come from the original letter when the approval has no table; the approval number stays the reference */
const _wqPlan82 = wqPlan;
wqPlan = function(w){ const P = _wqPlan82(w); const p = wqParent(w); if (!p) return P; const Q = _wqPlan82(p);
  if (Q.acts.length > P.acts.length) { P.acts = Q.acts; P.from = p.no; } if (!P.comm) P.comm = Q.comm; return P; };
const _wqApprove82 = wqApprove;
wqApprove = function(id){ _wqApprove82(id); const P = S.form?.plan; if (P?.from) $(".drawer-b .rq-sec b")?.insertAdjacentHTML("afterend", `<span class="chip gold">الأوقات والمساجد من الكتاب الأصلي ${esc(P.from)}</span>`); };
/* list: incoming replies show which letter they answer */
const _vWatheqa82 = vWatheqa;
vWatheqa = function(){ let h = _vWatheqa82();
  for (const w of S.wq) if (w.parent && wqDir(w) === "in") { const p = wqParent(w); if (!p) continue;
    h = h.replace(new RegExp(`(data-wq="${w.id}"[\\s\\S]*?<span class="wq-t"><b>[\\s\\S]*?</b>)`), `$1<span class="wq-r">↰ على كتابنا ${esc(p.no || "")} · ${fmt(wqDate(p))}</span>`); }
  return h; };
NEWF.splice(1, 0, ["v82-wqparent", "nav:watheqa", "كتاب الموافقة مع كتابه الأصلي", "كل موافقة من وثيقة تظهر مع كتابنا الأصلي (فيه الأوقات والمساجد والمحاضرين)، وتُقرأ الأنشطة منه إذا كان كتاب الموافقة بدون جدول. وإذا كانت الموافقة مكتوبة في الإجراءات فقط («لا مانع») يظهر: لا يوجد كتاب موافقة.", true, "2026-10-26"]);
/* approval documents in «الوثائق»: show the original letter and the approval letter of each other */
const _listForm82 = listForm;
listForm = function(kind, key){ const r = _listForm82.apply(this, arguments); if (kind !== "doc") return r;
  setTimeout(() => { const d = docBy[key], b = $(".drawer-b"); if (!d || !b || b.querySelector(".doc-ln")) return;
    const w = wqByNo(key), p = d.orig || (w && wqParent(w)?.no), kids = d.appr ? String(d.appr).split("،") : (w ? wqKids(w).map(k => k.no) : []);
    if (!p && !kids.length) return;
    const btn = no => { const x = wqByNo(no); return x ? `<button type="button" class="chip t1" data-wq="${esc(x.id)}">${esc(no)}</button>` : `<span class="chip">${esc(no)}</span>`; };
    b.insertAdjacentHTML("afterbegin", `<div class="check ok doc-ln">${p ? `<b>كتاب موافقة على كتابنا الأصلي ${btn(p)}</b><span>الأوقات والمساجد والمحاضرون من الكتاب الأصلي.</span>` : `<b>كتاب الموافقة: ${kids.map(btn).join(" ")}</b><span>هذا كتابنا الأصلي، والموافقة وصلت عليه.</span>`}</div>`); }, 0);
  return r; };
