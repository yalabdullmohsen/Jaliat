/* ===== v50: full coordinator portal ↔ إنجاز ===== */
S.creps = [];
async function crLoad(){ const { data } = await sb.from("coord_reports").select("*").order("created_at", { ascending:false }).limit(500); S.creps = data || []; }
const _boot9s50 = boot9; boot9 = function(){ _boot9s50(); crLoad().then(() => { if ($("#drawer").hidden && ["home", "portal"].includes(S.view)) render(); }); };
const RQ_KC = { "تجديد":"ok", "تعديل":"warn", "إيقاف":"bad", "تحديث بيانات":"warn", "استفسار":"" };

/* inbox: show request kind on each card */
const _vInbox50 = vInbox;
vInbox = function(){ let h = _vInbox50();
  for (const r of S.reqs) { const k = r.data?.kind; if (!k || k === "جديد") continue;
    h = h.replace(`data-rq="${r.id}"><div class="rq-h">`, `data-rq="${r.id}"><div class="rq-h"><span class="chip ${RQ_KC[k] ?? ""}">${esc(k)}</span>`); }
  return h; };

/* request drawer: kind, linked activity, team update, and a reply that the coordinator sees in the portal */
const _reqForm50 = reqForm;
reqForm = async function(id){ await _reqForm50(id); const r = S.reqs.find(x => x.id === id); const n = $("#rq-notes")?.closest(".fl, label, div"); if (!r || !n) return; const d = r.data || {};
  let top = "";
  if (d.kind && d.kind !== "جديد") top += `<div class="check${d.kind === "إيقاف" ? " warn" : ""}"><b>نوع الطلب: ${esc(d.kind)}</b><span>${esc(d.subj || "")}</span>${d.act_ref ? `<button type="button" class="btn btn-ghost" data-prio-open="act:${esc(d.act_ref)}">فتح النشاط</button>` : ""}</div>`;
  if ((d.team || []).length) top += `<div class="rq-sec"><b>بيانات المنسقين المرسلة</b>${d.team.map(t => { const o = S.coords.find(c => c.comm === d.comm && (c.phone === t.phone || c.name === t.name)); return `<div class="rq-act"><span>${esc(t.name || "—")} · ${esc(t.role || "")}<br><span class="s" dir="ltr">${esc(t.phone || "")}</span></span>${o ? (o.name === t.name && o.phone === t.phone ? `<span class="chip ok">مطابق</span>` : `<span class="chip warn">يختلف عن المسجّل</span>`) : `<span class="chip warn">جديد</span>`}</div>`; }).join("")}<span class="s">عدّل المنسقين من صفحة «المنسقون» حسب ما أرسله.</span></div>`;
  const box = document.createElement("div");
  box.innerHTML = top + fld("rq-reply", "ردّ القسم للمنسق (يظهر له في البوابة)", `<textarea class="f" id="rq-reply" rows="2" placeholder="مثال: تم اعتماد الطلب ويصلكم التصريح">${esc(d.reply || "")}</textarea>`);
  n.parentNode.insertBefore(box, n.nextSibling); };
const _rqRead50 = rqRead;
rqRead = function(){ const f = _rqRead50(); const v = $("#rq-reply"); if (v) f.reply = v.value.trim(); return f; };

/* portal page: monthly reports from coordinators */
const _vPortal50 = vPortal;
vPortal = function(){ const L = S.creps, nw = L.filter(r => !r.seen_at).length;
  const rep = `<div class="rq-sec cr-l"><div class="rq-sh"><b>تقارير المنسقين الشهرية ${nw ? `<span class="chip warn">${nw} جديد</span>` : ""}</b></div>${L.slice(0, 60).map(r => { const d = r.data || {};
    return `<div class="rq-act${r.seen_at ? "" : " cr-new"}"><span><b>${esc(r.comm)}</b> · ${esc(r.period || "")}<br><span class="s">${esc(r.coord || "")}${d.lessons != null ? ` · ${d.lessons} درس` : ""}${d.attend != null ? ` · حضور ${d.attend}` : ""}${d.converts ? ` · ${d.converts} مهتدٍ` : ""}</span>${d.notes ? `<br><span class="s">${esc(d.notes)}</span>` : ""}${d.needs ? `<br><span class="s"><b>الاحتياجات:</b> ${esc(d.needs)}</span>` : ""}</span>${r.seen_at ? `<span class="chip ok">اطُّلع</span>` : `<button type="button" class="btn btn-ghost" data-crseen="${r.id}">اطّلعت</button>`}</div>`; }).join("") || `<div class="empty">لم تصل تقارير بعد — يرسلها المنسق من البوابة</div>`}</div>`;
  return _vPortal50().replace(`<div class="pt-l">`, `<div class="check"><b>الرابط الموحّد لكل المنسقين</b><span dir="ltr" class="num">${esc(PT_ONE())}</span><span>يدخل المنسق برقم هاتفه المسجّل فتفتح له بوابة جاليته.</span><button type="button" class="btn" data-ptone>نسخ الرابط الموحّد</button></div><div class="check"><span>البوابة الآن كاملة: الرئيسية، طلب جديد أو تجديد، أنشطتي (تعديل أو إيقاف)، مراسلة القسم والتعاميم، التقرير الشهري، وبيانات المنسقين. كل ما يرسله المنسق يصل «الطلبات الواردة»، وردّك في الطلب يظهر له.</span></div>${rep}<div class="pt-l">`); };

const PT_ONE = () => `${location.origin}${location.pathname.replace(/[^/]*$/, "")}portal.html`;
document.addEventListener("click", ev => { if (!ev.target.closest("[data-ptone]")) return; navigator.clipboard?.writeText(PT_ONE()).then(() => toast("نُسخ الرابط الموحّد")); });
const _prio50 = priorities;
priorities = function(){ const P = _prio50(); const n = S.creps.filter(r => !r.seen_at).length;
  if (n) P.push({ w:70, k:"gold", t:`${n} تقرير شهري جديد من المنسقين`, s:"وصل من بوابة المنسقين", act:{ go:"portal", l:"عرضها" } }); return P.sort((a, b) => b.w - a.w); };

document.addEventListener("click", async ev => { const t = ev.target.closest("[data-crseen]"); if (!t) return;
  const id = t.dataset.crseen; const { error } = await sb.from("coord_reports").update({ seen_by:S.me?.id, seen_at:new Date().toISOString() }).eq("id", id); if (error) return writeFail(error);
  const r = S.creps.find(x => String(x.id) === id); if (r) r.seen_at = new Date().toISOString(); render(); });

NEWF.splice(1, 0, ["v50-portal", "nav:portal", "بوابة المنسقين الكاملة", "المنسق من رابطه: يتابع طلباته وردودكم، يطلب نشاطاً جديداً أو تجديداً أو تعديلاً أو إيقافاً، يحدّث بيانات منسقيه، يقرأ التعاميم، يراسل القسم، ويرسل تقريره الشهري. اكتب ردّك في الطلب الوارد فيظهر له.", false, "2026-10-20"]);
