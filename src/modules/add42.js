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

/* ---------- coordinator accounts (civil id + PIN) on the portal page ---------- */
S.pacc = [];
async function paLoad(){ const { data } = await sb.rpc("staff_portal_accounts"); S.pacc = data || []; }
const _boot9s50b = boot9; boot9 = function(){ _boot9s50b(); paLoad().then(() => { if ($("#drawer").hidden && S.view === "portal") render(); }); };
const _vPortal50b = vPortal;
vPortal = function(){ const A = S.pacc, by = {}; A.forEach(a => (by[a.comm] = by[a.comm] || []).push(a));
  const box = `<div class="rq-sec cr-l"><div class="rq-sh"><b>حسابات المنسقين ونوابهم (${A.length})</b></div><span class="s">يفعّل المنسق حسابه برقمه المدني وهاتفه المسجّل، ويضيف نائبه من حسابه. إن نسي أحدهم رمزه اضغط «إعادة تعيين» فيفعّله من جديد.</span>${Object.keys(by).sort().map(c => `<div class="pa-g"><b class="s">${esc(c)}</b>${by[c].map(a => `<div class="rq-act"><span><b>${esc(a.name)}</b> · ${a.role === "نائب" ? `نائب المنسق${a.by ? ` (أضافه ${esc(a.by)})` : ""}` : "المنسق"}<br><span class="s" dir="ltr">${esc(a.civil)} · ${esc(a.phone || "")}</span> <span class="s">${a.ready ? (a.last ? `آخر دخول ${fmt(String(a.last).slice(0, 10))}` : "مفعّل") : "بانتظار التفعيل"}</span></span>${S.canWrite ? `<button type="button" class="btn btn-ghost" data-pareset="${a.id}">إعادة تعيين الرمز</button><button type="button" class="btn btn-ghost bad-t" data-paoff="${a.id}">إيقاف</button>` : ""}</div>`).join("")}</div>`).join("") || `<div class="empty">لم يفعّل أي منسق حسابه بعد</div>`}</div>`;
  return _vPortal50b().replace(/يدخل المنسق برقم هاتفه المسجّل فتفتح له بوابة جاليته\./, "يدخل كل منسق ونائبه بحسابه الخاص: الرقم المدني والرمز السري.").replace(`<div class="pt-l">`, box + `<div class="pt-l">`); };
document.addEventListener("click", async ev => { const t = ev.target.closest("[data-pareset],[data-paoff]"); if (!t) return;
  if (t.dataset.sure !== "1") { t.dataset.sure = "1"; t.textContent = "اضغط للتأكيد"; return; }
  const { error } = await sb.rpc("staff_portal_reset", { p_id:t.dataset.pareset || t.dataset.paoff, p_off:!!t.dataset.paoff }); if (error) return writeFail(error);
  await paLoad(); render(); toast(t.dataset.paoff ? "أُوقف الحساب" : "أُعيد التعيين — يفعّله صاحبه برقمه المدني وهاتفه"); });

/* request drawer: who sent it (coordinator or deputy) */
const _reqForm50b = reqForm;
reqForm = async function(id){ await _reqForm50b(id); const r = S.reqs.find(x => x.id === id), b = r?.data?.by; if (!b) return; const h = $("#rq-org")?.closest(".g2");
  if (h) h.insertAdjacentHTML("beforebegin", `<div class="check"><b>قدّمه عبر البوابة: ${esc(b.name)}</b><span>${b.role === "نائب" ? "نائب المنسق" : "المنسق"}</span></div>`); };
const _vInbox50b = vInbox;
vInbox = function(){ let h = _vInbox50b(); for (const r of S.reqs) { const b = r.data?.by; if (b?.role === "نائب") h = h.replace(`data-rq="${r.id}"><div class="rq-h">`, `data-rq="${r.id}"><div class="rq-h"><span class="chip">النائب</span>`); } return h; };

/* ---------- staff quick code: after idle the app locks; 9740 opens it again (the session stays) ---------- */
function lockApp(){ try { localStorage.setItem("jl-lock", "1"); } catch (_) {} if ($("#lk-box")) return;
  const b = document.createElement("div"); b.id = "lk-box"; b.className = "ra";
  b.innerHTML = `<form class="ra-c" id="lk-form"><b>رمز موظفي القسم</b><span>اكتب الرمز للمتابعة</span><input class="f num" id="lk-p" type="password" inputmode="numeric" dir="ltr" maxlength="8" autocomplete="off"><p class="err" id="lk-e" hidden>الرمز غير صحيح</p><button class="btn btn-primary" type="submit">دخول</button></form>`;
  document.body.appendChild(b); setTimeout(() => $("#lk-p")?.focus(), 30);
  $("#lk-p").addEventListener("input", ev => { if (ev.target.value === "9740") unlockApp(); });
  $("#lk-form").addEventListener("submit", ev => { ev.preventDefault(); if ($("#lk-p").value === "9740") unlockApp(); else { $("#lk-e").hidden = false; $("#lk-p").value = ""; } }); }
function unlockApp(){ try { localStorage.removeItem("jl-lock"); } catch (_) {} $("#lk-box")?.remove(); idleReset(); }
const _boot9s50c = boot9; boot9 = function(){ _boot9s50c(); let l = null; try { l = localStorage.getItem("jl-lock"); } catch (_) {} if (l) lockApp(); };

/* staff open any community's portal directly (no coordinator account needed) */
document.addEventListener("click", async ev => { const t = ev.target.closest("[data-ptopen]"); if (!t) return;
  const w = window.open("about:blank", "_blank"); const { data, error } = await sb.rpc("staff_portal_open", { p_comm:t.dataset.ptopen });
  if (error || !data?.s) { w?.close(); return writeFail(error || { message:"تعذّر فتح البوابة" }); }
  const u = PT_ONE() + "#s=" + data.s; if (w) w.location = u; else location.href = u; });
