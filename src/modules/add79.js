/* ================= v79: كتاب وثيقة بمسار واحد واضح: اقرأ الكتاب، سجّل الموافقة، أصدر التصاريح، أرسلها للمنسق.
   حلّت هذه الدالة محل عشر طبقات كانت تضيف أزرارها فوق بعض؛ والكتاب يُعرض كاملاً داخل النظام (ورقة + PDF) بدل فتح وثيقة الرسمية ================= */
const wqIsApproval = w => !!(w.approval || w.act_ok || wqKids(w).some(k => wqRes(k) === "ok"));
const wqActsOf = w => { const nos = new Set([w.no, wqParent(w)?.no, ...wqKids(w).map(k => k.no)].filter(Boolean)); return S.E.filter(e => nos.has(e.doc) && !["ملغى", "مكتمل"].includes(e.status)); };
const wqRegNo = w => [w.no, ...(w.refs || []), wqParent(w)?.no, ...wqKids(w).map(k => k.no)].find(r => r && docBy[r]) || "";
function wqPermitsOf(w, acts){ const ids = new Set(acts.map(e => e.id)); return S.permits.filter(p => !p.revoked && ((p.act_id && ids.has(p.act_id)) || String(p.data?.note || "").includes("كتاب " + w.no))); }

/* ---------- الكتاب الأصلي والردود عليه ---------- */
function wqLinksBox(w){
  if (wqDir(w) === "out") { const kids = wqKids(w);
    return `<div class="rq-sec wqk"><b>كتاب الموافقة</b>${kids.length ? kids.map(k => `<button type="button" class="as-i" data-wq="${esc(k.id)}"><span>${wqRes(k) === "ok" ? "✓ موافقة" : wqRes(k) === "no" ? "✕ اعتذار" : "رد"} · <span class="num">${esc(k.no || "")}</span> · ${fmt(wqDate(k))} · ${esc(wqFrom(k) || "")}</span></button>`).join("")
      : w.act_ok ? `<div class="check ok"><b>لا يوجد كتاب موافقة، الموافقة مكتوبة في الإجراءات</b><span>${esc(wqActSnip(w) || "«لا مانع»")}</span></div>`
      : `<span class="s">لا يوجد رد بعد${w.actions ? "، ولا موافقة مكتوبة في الإجراءات" : ""}.</span>`}</div>`; }
  const p = wqParent(w), ownActs = /بعد\s*صلا|الساعة|\d{1,2}[:.]\d{2}\s*(ص|م|مساء|صباح)/.test(w.body || "");
  return p ? `<div class="rq-sec wqk"><b>هذا ${wqRes(w) === "no" ? "اعتذار" : "رد"} على كتابنا الأصلي</b><span class="s">${ownActs ? "" : "كتاب الموافقة ليس فيه الأوقات ولا الجدول، التفاصيل من الكتاب الأصلي:"}</span>${wqDocBox(p, "الكتاب الأصلي", !ownActs)}</div>`
    : (w.approval || /موافق|رد/.test(w.kind || "")) ? `<div class="rq-sec wqk"><b>الكتاب الأصلي</b><span class="s">لم يُعثر على كتابنا الأصلي لهذا الرد في وثيقة.</span></div>` : ""; }

/* ---------- المسار ---------- */
function wqStep(n, title, state, sub, btn){ return `<div class="wqstep ${state}"><i>${state === "done" ? "✓" : n}</i><div><b>${title}</b><span>${sub}</span></div>${btn || ""}</div>`; }
function wqPath(w, acts, inSys){
  if (!S.canWrite) return "";
  const nt = S.wqn.get(w.id);
  if (!wqIsApproval(w)) {
    const oc = wqOutcome(w); if (!oc) return "";
    return `<div class="wqpath"><div class="wqpath-h">المسار</div>${wqStep(1, "إبلاغ المنسق بالرد", nt ? "done" : "now", nt ? `${esc(nt.coord || "")} · ${fmtTime(nt.sent_at)}` : "رد بلا موافقة، أبلغه بالواتساب من الرسالة أدناه")}${wqNotifyBox(w)}</div>`; }
  const target = w.approval ? w : (wqKids(w).find(k => k.approval) || w), perms = wqPermitsOf(w, acts), pend = canPermit() ? pWqItems(w).length : 0, can = canPermit();
  const s1 = inSys ? wqStep(1, "تسجيل الموافقة في النظام", "done", `مسجّلة برقم ${esc(inSys)}`) : wqStep(1, "تسجيل الموافقة في النظام", "now", "تُسجَّل الموافقة وأنشطتها من الكتاب بضغطة", `<button class="btn btn-primary" type="button" data-wqap="${esc(target.id)}">اعتماد وتسجيل</button>`);
  const s2done = inSys && perms.length && !pend;
  const issueBtn = !can ? "" : pend > 1 ? `<button class="btn btn-primary" type="button" data-pwball="${esc(w.id)}">إصدار كل التصاريح (${pend})</button>` : (pend === 1 || (inSys && !perms.length)) ? `<button class="btn btn-primary" type="button" data-pwqissue="${esc(w.id)}">إصدار التصريح</button>` : "";
  const s2 = wqStep(2, "إصدار التصاريح", s2done ? "done" : inSys ? "now" : "wait", !inSys ? "بعد تسجيل الموافقة" : perms.length ? `صدر ${perms.length}${pend ? ` · ينقص ${pend}` : ""}` : "لكل درس تصريح برقمه وباركوده وملف PDF", inSys ? issueBtn : "");
  const sendBtn = !perms.length ? "" : perms.length === 1 ? `<button class="btn btn-ok" type="button" data-permit="${esc(perms[0].id)}">إرسال التصريح للمنسق</button>` : `<button class="btn btn-ok" type="button" data-wqsendall="${esc(w.id)}">إرسال التصاريح (${perms.length})</button>`;
  const s3 = wqStep(3, "إرسال التصريح للمنسق", nt ? "done" : perms.length ? "now" : "wait", nt ? `${esc(nt.coord || "")} · ${fmtTime(nt.sent_at)}` : perms.length ? "إرسال التصريح PDF هو إبلاغ المنسق بالموافقة" : "بعد إصدار التصريح",
    nt ? `<button class="btn btn-ghost" type="button" data-wnunmark="${esc(w.id)}">إلغاء علامة «أُبلغ»</button>` : sendBtn);
  const mark = !nt && perms.length ? `<div class="wqmark"><span class="s">بعد ما ترسل التصريح في واتساب:</span><button class="btn" type="button" data-wqmk="${esc(w.id)}">✓ تم الإبلاغ</button></div>` : "";
  return `<div class="wqpath" id="wn"><div class="wqpath-h">المسار</div>${s1}${s2}${s3}${mark}</div>`; }

/* العلامة يضعها المستخدم بنفسه فقط، والمنسق يُؤخذ من جالية التصريح لا من تخمين النص */
async function wqMarkSent(id){ const w = wqById(id); if (!w) return; const acts = wqActsOf(w), cm = (acts.find(e => e.comm) || {}).comm || wqPermitsOf(w, acts).map(p => p.data?.comm).find(Boolean) || "";
  const c = coFor(cm).sort((a, b) => (a.role === "منسق" ? 0 : 1) - (b.role === "منسق" ? 0 : 1))[0]; if (!c) return toast("ما لقيت منسقاً بهاتف لهذه الجالية");
  const { data, error } = await sb.from("wq_notify").insert({ wq_id:w.id, outcome:"موافقة", coord:c.name, phone:waNum(c.phone), comm:c.comm || cm || null }).select().single(); if (error) return writeFail(error);
  S.wqn.set(w.id, data); toast(`عُلِّم: أُبلغ ${c.name} ✓`); wqForm(w.id); }

/* ---------- نافذة الكتاب ---------- */
function wqForm(id){
  const w = wqById(id); if (!w) return; S.form = { kind:"wq", id };
  const acts = wqActsOf(w), inSys = wqRegNo(w), linked = S.E.filter(e => e.doc && (e.doc === w.no || (w.refs || []).includes(e.doc))), d = WQ_DIR[w.dir] || ["كتاب", ""], no = String(w.no || "").trim();
  const reply = wqIndex(), st = wqStage(w, reply), tr = S.wqt.get(id), r = reply.get(id);
  const more = [`<button class="btn btn-ghost" type="button" data-ext="${WQ_VIEW(w.id)}">فتح في وثيقة الرسمية</button>`,
    S.admin ? `<button class="btn btn-ghost" type="button" data-wqtask="${esc(w.id)}">إسناد متابعة لموظف</button>` : "",
    S.admin && canPermit() ? (() => { const lect = (String(w.body || "").match(/(?:الشيخ|فضيلة الشيخ|الداعية)\s*\/?\s*([^\n،,.(]{4,40})/) || [])[1] || "", mos = (String(w.body || "").match(/(مسجد\s*\/?\s*[^\n،,.(]{3,40})/) || [])[1] || ""; return `<button class="btn btn-ghost" type="button" data-pgfrom="1" data-pd='${esc(JSON.stringify({ sheikh:lect.trim(), mosque:mos.trim(), topic:w.subj || "", source:`#wq:${w.id}` }))}'>تفويض موظف بالتصريح</button>`; })() : "",
    S.canWrite ? (st === "done" ? `<button class="btn btn-ghost" type="button" data-wqts="follow:${esc(id)}">↺ إرجاع لقيد المتابعة</button>` : `<button class="btn btn-ok" type="button" data-wqts="done:${esc(id)}">✓ تم الإنجاز</button>`) : ""].filter(Boolean).join("");
  openDrawer(`كتاب وثيقة ⁦${no}⁩`, `
    <div class="wq-id ${esc(w.dir || "")}"><div class="wq-dir"><b>${d[0]}</b><span>${d[1]}${w.kind ? (d[1] ? " · " : "") + esc(w.kind) : ""}</span></div>${no ? `<button type="button" class="btn wq-cp" data-cpno="${esc(no)}" title="نسخ رقم الكتاب"><bdi dir="ltr">${esc(no)}</bdi><span>نسخ رقم الكتاب</span></button>` : ""}</div>
    <div class="wqs ${st || ""}"><b>${st === "done" ? "✓ منجز" : st === "follow" ? "⏳ قيد المتابعة" : "كتاب وارد"}</b><span>${wqDir(w) === "out" ? (r ? `وصل الرد ${esc(r.no || "")} بتاريخ ${fmt(wqDate(r))}` : `أُرسل ${fmt(wqDate(w))}، بانتظار رد ${esc(wqClean(w.to_whom).replace(/^مدير\s+/, "") || "الجهة")}`) : esc(wqFrom(w) || "")}${tr?.note ? ` · ملاحظة: ${esc(tr.note)}` : ""}</span>${r ? `<button type="button" class="lnk" data-wq="${esc(r.id)}">فتح الرد</button>` : ""}</div>
    <div class="q-meta"><b>${esc(w.subj)}</b><span class="s">${esc(fmt(wqDate(w)))} · ${esc(w.sender || "")}${w.status ? " · " + esc(w.status) : ""}</span><span class="s">${esc(w.to_whom || "")}</span></div>
    ${wqPath(w, acts, inSys)}
    ${wqLinksBox(w)}
    <div class="q-body">${esc(w.body || "لا يوجد نص").replace(/\n/g, "<br>")}</div>
    ${w.signer ? `<span class="s">التوقيع: ${esc(w.signer)}</span>` : ""}
    ${(w.refs || []).length ? `<span class="s">كتب مشار إليها: ${w.refs.map(x => docBy[x] ? `<button type="button" class="chip t1" data-wqdoc="${esc(x)}">${esc(x)} ✓</button>` : `<span class="chip">${esc(x)}</span>`).join(" ")}</span>` : ""}
    ${linked.length ? `<div class="rq-sec"><b>أنشطة مرتبطة (${linked.length})</b>${linked.map(e => `<button type="button" class="as-i" data-prio-open="act:${e.id}"><span>#${e.n} · ${esc(e.comm || "")} · ${esc(e.mosName || "")}</span></button>`).join("")}</div>` : ""}
    <details class="wq-more"><summary>خيارات أخرى</summary><div class="wq-more-b">${more}${S.canWrite && st !== "done" ? fld("wqt-n", "ملاحظة المتابعة (اختياري)", `<input class="f" id="wqt-n" placeholder="مثال: تم الاتصال بالإدارة وأفادوا بالموافقة" value="${esc(tr?.note || "")}">`) : ""}</div></details>`,
    `<button class="btn btn-primary" type="button" data-wqview="${esc(id)}">${icon("i-doc")} عرض الكتاب كاملاً (PDF)</button><button class="btn btn-ghost" data-close>إغلاق</button>`);
  if (S.canWrite && typeof wqNeeds === "function" && wqNeeds(w)) setTimeout(() => { const b = $("#wn"); if (b) { b.scrollIntoView({ behavior:"smooth", block:"start" }); b.classList.add("wn-hot"); } }, 150); }

/* ---------- الكتاب كاملاً داخل النظام ---------- */
function wqPaper(w){ const row = (k, v) => v ? `<tr><th>${k}</th><td>${esc(v)}</td></tr>` : "", d = WQ_DIR[w.dir]?.[0] || "كتاب";
  return `<div class="wqpaper" id="wq-paper"><div class="wqp-top"><b>${d}${w.kind ? " · " + esc(w.kind) : ""}</b><span dir="ltr">${esc(w.no || "")}</span></div>
    <table class="wqp-t">${row("التاريخ", fmt(wqDate(w)))}${row("من", wqFrom(w) || w.sender || "")}${row("إلى", wqClean(w.to_whom))}${row("الحالة", w.status || "")}</table>
    <h2>${esc(w.subj || "")}</h2><div class="wqp-body">${esc(w.body || "لا يوجد نص").replace(/\n/g, "<br>")}</div>
    ${w.signer ? `<div class="wqp-sg">${esc(w.signer)}</div>` : ""}${(w.refs || []).length ? `<div class="wqp-rf">كتب مشار إليها: ${w.refs.map(esc).join("، ")}</div>` : ""}</div>`; }
function wqViewer(id){ const w = wqById(id); if (!w) return; S.form = { kind:"wqview", id };
  openDrawer(`الكتاب ⁦${w.no || ""}⁩`, wqPaper(w), `<button class="btn btn-primary" type="button" data-wqpdf="${esc(id)}">${icon("i-doc")} تنزيل / مشاركة PDF</button><button class="btn" type="button" data-wqback="${esc(id)}">رجوع للكتاب</button><button class="btn btn-ghost" data-close>إغلاق</button>`); }
async function wqPdf(id){ const w = wqById(id), src = $("#wq-paper"); if (!w || !src) return null;
  await loadScript("https://cdn.jsdelivr.net/npm/html2canvas-pro@1.5.8/dist/html2canvas-pro.min.js"); await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  await Promise.all(['700 40px Amiri', '400 16px "IBM Plex Sans Arabic"'].map(f => document.fonts.load(f, "كتاب"))).catch(() => {});
  const host = document.createElement("div"); host.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;background:#fff;z-index:-1"; const el = src.cloneNode(true); el.removeAttribute("id"); el.style.cssText = "width:794px;max-width:none;margin:0;box-sizing:border-box;min-height:1123px;box-shadow:none;border:0"; host.appendChild(el); document.body.appendChild(host);
  const cv = await html2canvas(el, { scale:2, width:794, windowWidth:794, backgroundColor:"#ffffff", useCORS:true, logging:false }).finally(() => host.remove());
  const { jsPDF } = window.jspdf, pdf = new jsPDF({ unit:"mm", format:"a4", compress:true }), m = 8, pw = 210 - 2 * m, k = pw / cv.width, pagePx = Math.floor((297 - 2 * m) / k);
  for (let y = 0, i = 0; y < cv.height; y += pagePx, i++) { const h = Math.min(pagePx, cv.height - y), c = document.createElement("canvas"); c.width = cv.width; c.height = h; c.getContext("2d").drawImage(cv, 0, y, cv.width, h, 0, 0, cv.width, h); if (i) pdf.addPage(); pdf.addImage(c.toDataURL("image/jpeg", .92), "JPEG", m, m, pw, h * k); }
  return new File([pdf.output("blob")], `Watheqa-${String(w.no || id).replace(/[^A-Za-z0-9-]/g, "")}.pdf`, { type:"application/pdf" }); }

document.addEventListener("click", async ev => { const t = ev.target.closest("[data-wqview],[data-wqback],[data-wqpdf],[data-wqsendall],[data-wqmk]"); if (!t) return; const D = t.dataset;
  if (D.wqview) { ev.preventDefault(); return wqViewer(D.wqview); }
  if (D.wqback) { ev.preventDefault(); return wqForm(D.wqback); }
  if (D.wqmk) { ev.preventDefault(); return wqMarkSent(D.wqmk); }
  if (D.wqsendall) { ev.preventDefault(); const w = wqById(D.wqsendall); if (w) { const P = wqPermitsOf(w, wqActsOf(w)); closeDrawer(); setTimeout(() => pBulkSummary(w, P, 0), 60); } return; }
  if (D.wqpdf) { ev.preventDefault(); const old = t.innerHTML; t.disabled = true; t.textContent = "يجهّز PDF…";
    try { const f = await wqPdf(D.wqpdf); if (!f) throw new Error("no pdf");
      const touch = matchMedia("(pointer:coarse)").matches || /iPhone|iPad|Android/i.test(navigator.userAgent);
      if (touch && navigator.canShare && navigator.canShare({ files:[f] })) { try { await navigator.share({ files:[f] }); return; } catch (_) { return; } }
      const bu = URL.createObjectURL(f), a = document.createElement("a"); a.href = bu; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(bu), 8000); toast("نزل ملف PDF"); }
    catch (_) { toast("تعذّر تجهيز PDF، حاول مرة ثانية"); }
    finally { t.disabled = false; t.innerHTML = old; } } });

/* ---------- «المطلوب منك الآن»: أعلى صفحة وثيقة، لكل كتاب خطوته التالية وزرها ---------- */
function wqTodo(){ if (!S.canWrite) return []; const out = [];
  for (const w of S.wq) { if (wqDate(w) < WQ_FROM || S.wqn.has(w.id) || wqDir(w) !== "in") continue;
    const comm = (typeof wqComm === "function" && wqComm(w)) || "";
    if (!wqIsApproval(w)) { if (wqOutcome(w) === "اعتذار") out.push({ w, comm, k:3, step:"اعتذار: أبلغ المنسق", btn:`<button class="btn btn-ok" type="button" data-wnq="${esc(w.id)}">أبلغ المنسق</button>` }); continue; }
    const acts = wqActsOf(w), inSys = wqRegNo(w), perms = wqPermitsOf(w, acts), can = canPermit(), pend = can && inSys ? pWqItems(w).length : 0;
    if (!inSys) out.push({ w, comm, k:0, step:"١ تسجيل الموافقة", btn:`<button class="btn btn-primary" type="button" data-wqap="${esc((w.approval ? w : (wqKids(w).find(k => k.approval) || w)).id)}">سجّل الموافقة</button>` });
    else if (!perms.length || pend) out.push({ w, comm, k:1, step:"٢ إصدار التصريح", btn: !can ? `<span class="s">بانتظار من يصدر التصريح</span>` : pend > 1 ? `<button class="btn btn-primary" type="button" data-pwball="${esc(w.id)}">أصدر التصاريح (${pend})</button>` : `<button class="btn btn-primary" type="button" data-pwqissue="${esc(w.id)}">أصدر التصريح</button>` });
    else out.push({ w, comm, k:2, step:"٣ إرسال التصريح للمنسق", btn: perms.length === 1 ? `<button class="btn btn-ok" type="button" data-permit="${esc(perms[0].id)}">أرسله للمنسق</button>` : `<button class="btn btn-ok" type="button" data-wqsendall="${esc(w.id)}">أرسلها للمنسق (${perms.length})</button>` }); }
  return out.sort((a, b) => a.k - b.k || wqDate(b.w).localeCompare(wqDate(a.w))); }
function wqTodoBox(){ const L = wqTodo(); if (!S.canWrite) return "";
  if (!L.length) return `<div class="wqtodo ok"><b>✓ لا يوجد كتاب ينتظر إجراءً منك</b></div>`;
  return `<div class="wqtodo"><div class="wqtodo-h"><b>المطلوب منك الآن</b><span class="chip warn">${L.length}</span></div><span class="s">كل كتاب موافقة يمرّ بثلاث خطوات: ١ سجّل الموافقة، ٢ أصدر التصريح، ٣ أرسله للمنسق. اضغط الزر وكمّل.</span>
    ${L.slice(0, 12).map(x => `<div class="wqt-r"><button type="button" class="wqt-t" data-wq="${esc(x.w.id)}"><b>${esc(String(x.w.subj || "").replace(/^بشأن\s*:?\s*/, "").slice(0, 70))}</b><span class="s">${x.comm ? esc(x.comm) + " · " : ""}<span class="num">${esc(x.w.no || "")}</span> · ${x.step}</span></button>${x.btn}</div>`).join("")}${L.length > 12 ? `<span class="s">و${L.length - 12} كتاب آخر تظهر بعد إنجاز ما فوق.</span>` : ""}</div>`; }
NEWF.splice(1, 0, ["v79-wqpath", "nav:watheqa", "كتاب وثيقة بمسار واحد", "افتح أي كتاب موافقة: ثلاث خطوات واضحة (سجّل الموافقة، أصدر التصاريح، أرسل التصريح للمنسق)، وزر «عرض الكتاب كاملاً» يفتحه داخل النظام بدون الدخول لوثيقة، مع تنزيل PDF.", true, "2026-11-08"]);
