/* v87 — تعديل التصريح الصادر: رئيس القسم ومدير النظام يعدّلون البيانات، ويبقى نفس الرقم ورمز التحقق والباركود */
const _pvEdit65 = permitView;
permitView = async function(id){ await _pvEdit65(id); const p = S.permits.find(x => x.id === id); if (!p || !S.admin || p.revoked) return;
  const f = $(".drawer-f"); if (!f || f.querySelector("[data-pedit]")) return;
  f.querySelector("[data-prevoke]")?.insertAdjacentHTML("beforebegin", `<button class="btn" type="button" data-pedit="${esc(p.id)}">تعديل التصريح</button>`) || f.querySelector("[data-close]")?.insertAdjacentHTML("beforebegin", `<button class="btn" type="button" data-pedit="${esc(p.id)}">تعديل التصريح</button>`); };
document.addEventListener("click", ev => { const t = ev.target.closest("[data-pedit]"); if (!t) return; if (!S.admin) return toast("تعديل التصريح لرئيس القسم أو مدير النظام");
  const p = S.permits.find(x => x.id === t.dataset.pedit); if (!p || p.revoked) return; const d = p.data || {}; closeDrawer();
  setTimeout(() => { const keep = { ...d, act_id:p.act_id || "" }; if (d.days?.length) keep.days = d.days; permitForm(keep); if (S.form?.kind !== "permit") return;
    S.form.edit = p.id; S.form.act = p.act_id || ""; const e = $("#p-date2"); if (e && p.until) e.value = p.until; if (d.rep && $("#p-rep")) $("#p-rep").value = d.rep;
    const dr = $("#p-dur"); if (dr && d.dur) { const k = DUR.find(x => x[1] === d.dur); if (k) dr.value = k[0]; }
    if (d.time_mode && $("#p-pray")) { $("#p-pray").value = d.time_mode; if (typeof pTimeSync === "function") pTimeSync(); }
    $("#p-act")?.closest(".p-auto")?.remove();
    const h = $(".drawer-h h3"); if (h) h.textContent = `تعديل التصريح ${p.no}`;
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
