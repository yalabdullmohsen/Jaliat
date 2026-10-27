/* v87 — تعديل التصريح الصادر: رئيس القسم ومدير النظام يعدّلون البيانات، ويبقى نفس الرقم ورمز التحقق والباركود */
const _pvEdit65 = permitView;
permitView = async function(id){ await _pvEdit65(id); const p = S.permits.find(x => x.id === id); if (!p || !S.admin || p.revoked) return;
  const f = $(".drawer-f"); if (!f || f.querySelector("[data-pedit]")) return;
  const at = f.querySelector("[data-prevoke]") || f.querySelector("[data-close]");
  at?.insertAdjacentHTML("beforebegin", `<button class="btn" type="button" data-pedit="${esc(p.id)}">تعديل التصريح</button>`); };
document.addEventListener("click", ev => { const t = ev.target.closest("[data-pedit]"); if (!t) return; if (!S.admin) return toast("تعديل التصريح لرئيس القسم أو مدير النظام");
  const p = S.permits.find(x => x.id === t.dataset.pedit); if (!p || p.revoked) return; const d = p.data || {}; closeDrawer();
  setTimeout(() => { const keep = { ...d, act_id:p.act_id || "" }; if (d.days?.length) keep.days = d.days; permitForm(keep); if (S.form?.kind !== "permit") return;
    S.form.edit = p.id; S.form.act = p.act_id || ""; const e = $("#p-date2"); if (e && p.until) e.value = p.until; if (d.rep && $("#p-rep")) $("#p-rep").value = d.rep;
    const dr = $("#p-dur"); if (dr && d.dur) { const k = DUR.find(x => x[1] === d.dur); if (k) dr.value = k[0]; }
    if (d.time_mode && $("#p-pray")) { $("#p-pray").value = d.time_mode; if (typeof pTimeSync === "function") pTimeSync(); }
    $("#p-act")?.closest(".p-auto")?.remove();
    const h = $(".drawer-h h3"); if (h) h.textContent = `تعديل التصريح \u2066${p.no}\u2069`;
    const b = $("[data-pissue]"); if (b) b.textContent = "حفظ التعديل";
    $(".drawer-b")?.insertAdjacentHTML("afterbegin", `<span class="hint">يبقى نفس الرقم والباركود، ويظهر للإمام بالبيانات الجديدة عند المسح.</span>`); }, 60); });
NEWF.splice(1, 0, ["v87-pedit", "nav:permits", "تعديل التصريح", "افتح أي تصريح صادر واضغط «تعديل التصريح» لتغيير الشيخ أو المسجد أو الموعد أو المدة. يبقى نفس رقم التصريح والباركود، ويتحدّث للإمام عند المسح. لرئيس القسم ومدير النظام.", true, "2026-10-27"]);

/* v88 — كتاب موافقة فيه أكثر من مسجد/شيخ/موعد: تصريح مستقل لكل نشاط بضغطة وحدة (ملف PDF لكل تصريح) */
function pWqItems(w){ const par = wqParent(w), nos = new Set([w.no, par?.no, ...wqKids(w).map(k => k.no)].filter(Boolean));
  const allE = S.E.filter(e => nos.has(e.doc) && !["ملغى", "مكتمل"].includes(e.status));
  if (allE.length) { const has = new Set(S.permits.filter(p => !p.revoked).map(p => p.act_id).filter(Boolean)); return allE.filter(e => !has.has(e.id)).map(e => ({ e })); }
  const out = []; for (const x of [par, w].filter(Boolean)) { let P = null; try { P = wqPlan(x); } catch (_) {} for (const a of (P?.acts || [])) out.push({ a, w:x }); }
  return out.filter(it => !S.permits.some(p => !p.revoked && p.data?.sheikh === (it.a.lect || "").split(" / ")[0] && String(p.data?.note || "").includes("كتاب " + it.w.no))); }
const _wqForm88b = wqForm;
wqForm = function(id){ _wqForm88b(id); const w = wqById(id); const f = $(".drawer-f"); if (!w || !S.admin || !f || f.querySelector("[data-pwball]")) return;
  const n = pWqItems(w).length; if (n < 2) return;
  const at = f.querySelector("[data-pwqissue]") || f.querySelector("[data-close]"); at?.insertAdjacentHTML("beforebegin", `<button class="btn btn-primary" type="button" data-pwball="${esc(id)}">إصدار كل التصاريح (${n})</button>`); };
async function pBulk(wid){ const w = wqById(wid); if (!w) return; const items = pWqItems(w); if (!items.length) return toast("كل أنشطة هذا الكتاب صدرت لها تصاريح");
  closeDrawer(); const rows = [], fail = []; window.PBULK = rows;
  try { for (let i = 0; i < items.length; i++) { const it = items[i]; toast(`يصدر التصريح ${i + 1} من ${items.length}…`);
      if (it.e) permitForm({ act_id:it.e.id }); else { permitForm({}); pFillPlan(it.a, it.w); }
      await new Promise(r => setTimeout(r, 40)); const n = rows.length; try { await permitIssue(); } catch (_) {} if (rows.length === n) fail.push(it); } }
  finally { window.PBULK = null; }
  closeDrawer(); render();
  for (let i = 0; i < rows.length; i++) { toast(`يجهّز ملف PDF ${i + 1} من ${rows.length}…`); try { await permitView(rows[i].id); await permitPdf(rows[i].id); } catch (_) {} }
  pBulkSummary(w, rows, fail.length); }
function pBulkSummary(w, rows, failed){ S.form = { kind:"pbulk", ids:rows.map(r => r.id) };
  openDrawer(`تصاريح الكتاب ${w.no}`, `<div class="check ${failed ? "warn" : "ok"}"><b>صدر ${rows.length} تصريح${failed ? ` · تعذّر ${failed}، أصدره من نفس الكتاب` : ""}</b><span>لكل نشاط تصريح مستقل برقمه وباركوده وملف PDF خاص.</span></div>
    <div class="wq-list">${rows.map(p => `<button type="button" class="wq-i" data-permit="${p.id}"><span class="num wq-no">${esc(p.no)}</span><span class="wq-t"><b>${esc(p.data?.sheikh || "—")}</b><span class="s">${esc(p.data?.mosque || "")} · ${esc(p.data?.time || "")}</span></span><span class="wq-m"><span class="s">حتى ${fmt(p.until)}</span></span></button>`).join("")}</div>`,
    `${rows.length ? `<button class="btn btn-primary" type="button" data-pball>${icon("i-wa")} إرسال الكل PDF</button>` : ""}<button class="btn btn-ghost" data-close>إغلاق</button>`); }
document.addEventListener("click", async ev => { const a = ev.target.closest("[data-pwball]"); if (a) { ev.preventDefault(); if (!S.admin) return; return pBulk(a.dataset.pwball); }
  const b = ev.target.closest("[data-pball]"); if (!b || S.form?.kind !== "pbulk") return; ev.preventDefault(); ev.stopImmediatePropagation();
  const ids = S.form.ids || []; const files = []; for (const id of ids) { const f = await (PPDF.get(id) || Promise.resolve(null)).catch(() => null); if (f) files.push(f); }
  if (!files.length) return toast("ملفات PDF ما جهزت، افتح كل تصريح وأرسله");
  if (navigator.canShare && navigator.canShare({ files })) { try { await navigator.share({ files, title:"تصاريح إلقاء دروس", text:`${files.length} تصريح إلقاء درس` }); } catch (_) {} return; }
  files.forEach((f, i) => setTimeout(() => { const l = document.createElement("a"); l.href = URL.createObjectURL(f); l.download = f.name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(l.href), 4000); }, i * 400));
  toast("نزلت ملفات PDF، أرفقها في واتساب القسم"); }, true);
NEWF.splice(1, 0, ["v88-pbulk", "nav:watheqa", "تصريح لكل نشاط بضغطة وحدة", "في كتاب الموافقة اللي فيه أكثر من مسجد أو شيخ أو موعد: اضغط «إصدار كل التصاريح» فيصدر تصريح مستقل لكل نشاط، وكل واحد بملف PDF خاص، ثم «إرسال الكل». يشتغل على الكتب السابقة والجديدة.", true, "2026-10-27"]);

/* v89 — جولة إصدار التصاريح: تفتح تلقائياً مرة واحدة لرئيس القسم وتمشي معه على الشاشة خطوة بخطوة، وزرها يبقى في صفحة التصاريح */
if (typeof GUIDES === "object" && GUIDES.permits && typeof TOURS === "object") {
  GUIDES.permits.s.push(
    { sel:"[data-permit]", t:"افتح أي تصريح صادر", x:"من القائمة افتح التصريح: <b>طباعة / PDF</b>، <b>إرسال PDF واتساب</b>، <b>تعديل التصريح</b> (يبقى نفس الرقم والباركود)، أو <b>إلغاء التصريح</b>.", none:"افتح أي تصريح صادر: طباعة، إرسال PDF واتساب، تعديل التصريح، أو إلغاؤه." },
    { go:"watheqa", sel:".wq-i", t:"كتاب فيه أكثر من مسجد أو شيخ", x:"افتح كتاب الموافقة من وثيقة، وتحت بتلقى <b>«إصدار تصريح»</b> (تتعبّى بياناته من الكتاب)، وإذا الكتاب فيه أكثر من مسجد أو شيخ أو موعد يطلع <b>«إصدار كل التصاريح»</b>: تصريح مستقل لكل واحد بضغطة وحدة، وبعدها <b>«إرسال الكل PDF»</b>.", none:"في كتاب الموافقة: «إصدار تصريح» يعبّي من الكتاب، و«إصدار كل التصاريح» لكتب فيها أكثر من مسجد أو شيخ." });
  TOURS["g-permits"].steps = [TOURS["g-permits"].steps[0], ...GUIDES.permits.s.map(s => ({ go:s.go || "permits", ...s }))];
  TOURS["permits-new"] = { title:"جولة: إصدار التصاريح", steps:[
    { go:"permits", t:"أهلاً، نمشي معك على إصدار التصريح", x:"بنمرّ على الشاشة خطوة خطوة: كيف تصدر تصريحاً، وكيف تصدر لكتاب فيه أكثر من مسجد، وكيف تعدّل وترسل. اضغط «التالي»." },
    { go:"watheqa", sel:".wq-i", t:"١. ابدأ من كتاب الموافقة", x:"افتح أي كتاب موافقة من وثيقة. تحت بتلقى <b>«إصدار تصريح»</b>: تتعبّى كل البيانات من الكتاب نفسه (الشيخ، المسجد، المحافظة، الأيام، الوقت، المدة)، وتراجعها وتضغط «إصدار التصريح».", none:"افتح أي كتاب موافقة من وثيقة، وتحت بتلقى «إصدار تصريح»: تتعبّى بياناته من الكتاب نفسه." },
    { go:"watheqa", sel:".wq-i", t:"٢. كتاب فيه أكثر من مسجد أو شيخ", x:"إذا الكتاب فيه أكثر من مسجد أو شيخ أو موعد يطلع زر <b>«إصدار كل التصاريح»</b>: يصدر تصريح مستقل لكل واحد بضغطة وحدة، ولكل تصريح ملف PDF خاص، وبعدها <b>«إرسال الكل PDF»</b>.", none:"في الكتاب اللي فيه أكثر من نشاط يطلع زر «إصدار كل التصاريح»: تصريح مستقل لكل مسجد أو شيخ بضغطة وحدة." },
    { go:"permits", sel:"[data-pnew]", t:"٣. أو أصدر تصريح يدوي", x:"من هنا تفتح نموذج تصريح فاضي: اكتب رقم الكتاب في الخانة العلوية فتتعبّى البيانات، أو عبّيها بنفسك." },
    { go:"permits", sel:"[data-permit]", t:"٤. افتح التصريح الصادر", x:"من التصريح تقدر: <b>طباعة / PDF</b>، <b>إرسال PDF واتساب</b>، <b>تعديل التصريح</b> (يبقى نفس الرقم والباركود)، أو <b>إلغاء التصريح</b>.", none:"بعد ما يصدر أول تصريح يظهر هنا، وتفتحه لإرساله أو تعديله." },
    { go:"permits", sel:"[data-passets]", t:"٥. التوقيع والختم", x:"ارفع صورة التوقيع والختم مرة وحدة وتظهر على كل التصاريح." },
    { go:"permits", t:"خلصنا ✓", x:"تقدر ترجع للجولة أي وقت من زر «جولة التصاريح» أعلى هذي الصفحة، أو من زر «دليل الصفحة» فوق." } ] };
  const _tourEnd89 = tourEnd; tourEnd = function(d){ if (TR.k === "permits-new") { try { localStorage.setItem("tour-permits-new", "1"); } catch (_) {} } _tourEnd89(d); };
  const _afterRender89 = afterRender;
  afterRender = function(v){ _afterRender89(v); if (v !== "permits" || !S.admin) return;
    const tb = $(".toolbar"); if (tb && !$("#pn-tour")) tb.insertAdjacentHTML("beforebegin", `<div class="check ok" id="pn-tour" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><span style="flex:1;min-width:200px"><b>جولة التصاريح</b><br><span class="s">نمشي معك على الشاشة: كيف تصدر وتعدّل وترسل، وكيف تصدر لكتاب فيه أكثر من مسجد.</span></span><button class="btn btn-primary" type="button" data-tour="permits-new">ابدأ الجولة</button></div>`);
    let seen = false; try { seen = !!localStorage.getItem("tour-permits-new"); } catch (_) { seen = true; }
    if (!seen && !TR.k && !window.__pnAuto && S.me?.username !== "yousef") { window.__pnAuto = true; setTimeout(() => { if (!TR.k && S.view === "permits") tourStart("permits-new"); }, 1200); } };
}

/* v89 — أرقام الكتب والتصاريح (2610-6707 / JL-…) تُعرض دائماً بالاتجاه الصحيح في كل الشاشات بدل ما تنعكس وسط العربي */
(function(){ const RE = /\d{4}\s*[-‐-―ـ]\s*\d{4}|JL-\d{4,8}-\d{3,4}/g, SKIP = "bdi,script,style,textarea,input,select,option,[contenteditable],.ij-nw";
  function fix(root){ if (!root) return; const base = root.nodeType === 3 ? root.parentNode : root; if (!base || base.nodeType !== 1) return; const nodes = [];
    const w = document.createTreeWalker(base, NodeFilter.SHOW_TEXT, { acceptNode: n => { const p = n.parentElement; if (!p || p.closest(SKIP)) return NodeFilter.FILTER_REJECT; RE.lastIndex = 0; return RE.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; } });
    while (w.nextNode()) nodes.push(w.currentNode);
    for (const n of nodes) { const t = n.nodeValue, f = document.createDocumentFragment(); let last = 0, m; RE.lastIndex = 0;
      while ((m = RE.exec(t))) { if (m.index > last) f.appendChild(document.createTextNode(t.slice(last, m.index))); const b = document.createElement("bdi"); b.setAttribute("dir", "ltr"); b.textContent = m[0]; f.appendChild(b); last = m.index + m[0].length; }
      if (last < t.length) f.appendChild(document.createTextNode(t.slice(last))); n.parentNode.replaceChild(f, n); } }
  let q = false; const pend = new Set();
  new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 || n.nodeType === 3) pend.add(n);
    if (q || !pend.size) return; q = true; requestAnimationFrame(() => { const L = [...pend]; pend.clear(); q = false; for (const n of L) if (document.contains(n)) fix(n); }); }).observe(document.body, { childList:true, subtree:true });
  document.addEventListener("DOMContentLoaded", () => fix(document.body)); setTimeout(() => fix(document.body), 1500); })();

/* v90 — تعديل التصريح على الصورة نفسها: اضغط أي معلومة في التصريح وعدّلها، تنحفظ تلقائياً وتتحدث البيانات والقائمة */
const _pvInline90 = permitView;
permitView = async function(id){ await _pvInline90(id); const p = S.permits.find(x => x.id === id); const paper = $("#permit-paper"); if (!p || !paper || !S.admin || p.revoked) return;
  paper.classList.add("editing");
  paper.querySelectorAll("[data-pf]").forEach(n => { try { n.contentEditable = "plaintext-only"; if (n.contentEditable !== "plaintext-only") n.contentEditable = "true"; } catch (_) { n.contentEditable = "true"; } n.setAttribute("spellcheck", "false"); });
  if (!$(".pf-st")) paper.closest(".permit-wrap")?.insertAdjacentHTML("beforebegin", `<div class="pf-st" id="pf-st"><span>✎ اضغط على أي معلومة في التصريح لتعدّلها، وتنحفظ تلقائياً.</span></div>`); };
const pfSt = (t, bad) => { const e = $("#pf-st"); if (!e) return; e.className = "pf-st" + (bad ? " bad" : ""); e.innerHTML = `<b>${t}</b>`; };
async function pfSave(id, patch, until){ const p = S.permits.find(x => x.id === id); if (!p) return; const upd = { data:{ ...(p.data || {}), ...patch } }; if (until) upd.until = until;
  pfSt("جاري الحفظ…"); const { data:row, error } = await sb.from("permits").update(upd).eq("id", id).select().single();
  if (error) { pfSt("تعذّر الحفظ", true); return writeFail(error); }
  S.permits = S.permits.map(x => x.id === id ? row : x); PPDF.delete(id); pfSt("تم الحفظ ✓"); render(); setTimeout(() => permitPdf(id).catch(() => {}), 500); return row; }
const PFT = {};
document.addEventListener("input", ev => { const n = ev.target.closest?.("#permit-paper [data-pf]"); if (!n || S.form?.kind !== "permitv") return; const k = n.dataset.pf, id = S.form.id, v = n.textContent.replace(/\s+/g, " ").trim();
  document.querySelectorAll(`#permit-paper [data-pf="${k}"]`).forEach(x => { if (x !== n) x.textContent = v; });
  pfSt("…"); clearTimeout(PFT[k]); PFT[k] = setTimeout(() => pfCommit(n, id), 800); });
async function pfCommit(n, id){ const k = n.dataset.pf, v = n.textContent.replace(/\s+/g, " ").trim(), p = S.permits.find(x => x.id === id); if (!p || !document.contains(n)) return;
  if (v === (p.data?.[k] || "")) return pfSt("تم الحفظ ✓"); if ((k === "sheikh" || k === "mosque") && !v) { pfSt("الاسم ما يصير فاضي", true); return; } await pfSave(id, { [k]:v }); }
document.addEventListener("focusout", ev => { const n = ev.target.closest?.("#permit-paper [data-pf]"); if (!n || S.form?.kind !== "permitv") return; clearTimeout(PFT[n.dataset.pf]); pfCommit(n, S.form.id); });
document.addEventListener("keydown", ev => { const n = ev.target.closest?.("#permit-paper [data-pf]"); if (n && ev.key === "Enter") { ev.preventDefault(); n.blur(); } });
document.addEventListener("paste", ev => { const n = ev.target.closest?.("#permit-paper [data-pf]"); if (!n) return; ev.preventDefault(); const t = (ev.clipboardData || window.clipboardData).getData("text").replace(/\s+/g, " "); document.execCommand("insertText", false, t); });
document.addEventListener("click", ev => { const c = ev.target.closest?.("#permit-paper.editing [data-pd]"); if (!c || c.querySelector("input") || S.form?.kind !== "permitv") return; const id = S.form.id, p = S.permits.find(x => x.id === id); if (!p) return;
  const k = c.dataset.pd, cur = k === "date" ? p.data?.date : p.until; const i = document.createElement("input"); i.type = "date"; i.value = cur || ""; c.textContent = ""; c.appendChild(i); i.focus(); try { i.showPicker?.(); } catch (_) {}
  let done = false; const fin = async save => { if (done) return; done = true; const v = i.value;
    if (save && v && v !== cur) { if (k === "date") { const until = p.until && p.until < v ? v : null; await pfSave(id, { date:v }, until); } else { if (v < (p.data?.date || "")) { toast("تاريخ الانتهاء قبل تاريخ الدرس"); } else await pfSave(id, {}, v); } }
    permitView(id); };
  i.addEventListener("change", () => fin(true)); i.addEventListener("blur", () => setTimeout(() => fin(false), 150)); });
NEWF.splice(1, 0, ["v90-pinline", "nav:permits", "تعديل التصريح على الصورة نفسها", "افتح أي تصريح صادر واضغط على المعلومة اللي تبي تغيّرها (الشيخ، المسجد، الموضوع، الوقت، الملاحظات، التاريخ…) وعدّل مباشرة على التصريح. تنحفظ تلقائياً وتتحدث القائمة وملف PDF.", true, "2026-10-27"]);
