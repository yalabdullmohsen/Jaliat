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
async function paLoad(){ const [a, b] = await Promise.all([sb.rpc("staff_portal_accounts"), sb.rpc("staff_portal_signups")]); S.pacc = a.data || []; S.psign = b.data || []; }
S.psign = [];
const _boot9s50b = boot9; boot9 = function(){ _boot9s50b(); paLoad().then(() => { if ($("#drawer").hidden && S.view === "portal") render(); }); };
document.addEventListener("click", async ev => { const t = ev.target.closest("[data-pareset],[data-paoff]"); if (!t) return;
  if (t.dataset.sure !== "1") { t.dataset.sure = "1"; t.textContent = "اضغط للتأكيد"; return; }
  const { error } = await sb.rpc("staff_portal_reset", { p_id:t.dataset.pareset || t.dataset.paoff, p_off:!!t.dataset.paoff }); if (error) return writeFail(error);
  await paLoad(); render(); toast(t.dataset.paoff ? "أُوقف الحساب" : "أُعيد التعيين، يفعّله صاحبه برقمه المدني وهاتفه"); });

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

/* ---------- portal page: one clean layout (link · numbers · tabs) ---------- */
vPortal = function(){
  const G = S.psign || [], pend = G.filter(g => g.status === "pending").length; const tab = S.f.pvt || (pend ? "sign" : "comms"), A = S.pacc, R = S.creps, nw = R.filter(r => !r.seen_at).length, ready = A.filter(a => a.ready).length;
  const open = S.reqs.filter(r => r.data?.src === "portal" && !["معتمد", "مرفوض", "مكتمل"].includes(r.status)).length;
  const accBy = {}; A.forEach(a => (accBy[a.comm] = accBy[a.comm] || []).push(a));
  const rows = commNames.filter(c => S.portal.some(x => x.comm === c && x.active)).map(c => ({ c, co:S.coords.find(k => k.comm === c && k.phone && k.status !== "سابق"), acc:accBy[c] || [] }))
    .sort((x, y) => (!!y.co - !!x.co) || x.c.localeCompare(y.c, "ar"));
  const head = `<div class="pv-hd"><div class="pv-l"><b>رابط البوابة الموحّد</b><span dir="ltr">${esc(PT_ONE().replace(/^https?:\/\//, ""))}</span><small>المنسق الجديد يطلب حساباً من البوابة بإدخال بياناته وبيانات نائبه، ويُعتمد هنا. بعدها يدخل كل منهما برقمه المدني ورمزه السري.</small></div><div class="pv-a"><button type="button" class="btn btn-primary" data-ptone>نسخ الرابط</button></div></div>
  <div class="wq-tiles pv-t">${pend ? `<button type="button" class="wq-tile bad" data-pvt="sign"><b>${pend}</b><span>طلب حساب جديد</span><small>بانتظار موافقتك</small></button>` : ""}<button type="button" class="wq-tile ok" data-pvt="accs"><b>${ready}</b><span>حساب مفعّل</span><small>من ${rows.filter(r => r.co).length} منسق</small></button><button type="button" class="wq-tile warn" data-go="inbox"><b>${open}</b><span>طلب مفتوح</span><small>مفتوح في الطلبات الواردة</small></button><button type="button" class="wq-tile${nw ? " bad" : ""}" data-pvt="reps"><b>${nw}</b><span>تقرير جديد</span><small>من ${R.length} تقرير</small></button></div>
  <div class="toolbar"><div class="seg">${[["sign", "طلبات الحسابات", pend], ["comms", "الجاليات", rows.length], ["accs", "الحسابات", A.length], ["reps", "التقارير", R.length]].map(([k, l, n]) => `<button type="button" class="${tab === k ? "on" : ""}" data-pvt="${k}">${l} <span class="num">${n}</span></button>`).join("")}</div>${tab === "comms" ? `<input class="f pv-q" id="pv-q" placeholder="ابحث باسم الجالية أو المنسق" autocomplete="off">` : ""}</div>`;
  let body = "";
  if (tab === "comms") body = `<div class="pv-list">${rows.map(({ c, co, acc }) => { const on = acc.filter(a => a.ready).length;
    return `<div class="pv-r" data-k="${esc((c + " " + (co?.name || "")).toLowerCase())}"><div class="pv-n"><b>${esc(c)}</b><span>${co ? `${esc(co.name)} · <span dir="ltr">${esc(co.phone)}</span>` : "لا يوجد منسق برقم"}</span></div>
      <span class="chip ${on ? "ok" : ""}">${on ? `${on} حساب مفعّل` : "لم يفعّل"}</span>
      <div class="pv-b"><button type="button" class="btn btn-ghost" data-ptopen="${esc(c)}" title="فتح بوابتهم">فتح</button>${co ? `<button type="button" class="btn btn-ghost" data-ptwa="${esc(c)}" title="إرسال الرابط بالواتساب">${icon("i-wa")}</button>` : ""}</div></div>`; }).join("")}</div>`;
  if (tab === "sign") body = G.length ? `<div class="pv-list">${G.map(g => { const cm = g.comm || g.comm_new || "";
    return `<div class="pv-r pv-sg${g.status === "pending" ? " pv-new" : ""}"><div class="pv-n"><b>${esc(cm)}${!g.comm ? ` <span class="chip warn">جالية جديدة</span>` : ""}</b>
      <span><b>المنسق:</b> ${esc(g.name)} · <span dir="ltr">${esc(g.phone)}</span> · مدني ${esc(g.civil)}</span>
      <span><b>النائب:</b> ${esc(g.dep_name)} · <span dir="ltr">${esc(g.dep_phone)}</span> · مدني ${esc(g.dep_civil)}</span>
      ${g.notes ? `<span>${esc(g.notes)}</span>` : ""}<span class="s">${fmt(String(g.at).slice(0, 10))}</span>
      ${g.status === "pending" && S.canWrite ? `<div class="pv-dec"><select class="f" id="sg-c-${g.id}"><option value="">${g.comm ? esc(g.comm) : "إنشاء جالية: " + esc(g.comm_new)}</option>${commNames.filter(c => c !== g.comm).map(c => `<option>${esc(c)}</option>`).join("")}</select><input class="f" id="sg-r-${g.id}" placeholder="سبب الرفض (عند الرفض)"></div>` : ""}</div>
      ${g.status === "pending" ? (S.canWrite ? `<div class="pv-b pv-bv"><button type="button" class="btn btn-primary" data-sgok="${g.id}">موافقة</button><button type="button" class="btn btn-ghost bad-t" data-sgno="${g.id}">رفض</button></div>` : `<span class="chip warn">بانتظار الموافقة</span>`)
        : g.status === "approved" ? `<div class="pv-b pv-bv"><span class="chip ok">معتمد</span><button type="button" class="btn btn-ghost" data-sgwa="${g.id}">${icon("i-wa")} إبلاغه</button></div>` : `<span class="chip bad">مرفوض</span>`}</div>`; }).join("")}</div>` : `<div class="empty">لا توجد طلبات حسابات. يقدّمها المنسق من البوابة بزر «طلب حساب جديد».</div>`;
  if (tab === "accs") body = Object.keys(accBy).length ? `<div class="pv-list">${Object.keys(accBy).sort().map(c => accBy[c].map(a => `<div class="pv-r"><div class="pv-n"><b>${esc(a.name)}</b><span>${a.role === "نائب" ? "نائب" : "منسق"} · ${esc(c)}${a.by ? ` · أضافه ${esc(a.by)}` : ""}</span><span dir="ltr" class="s">${esc(a.civil)}${a.phone ? " · " + esc(a.phone) : ""}</span></div>
      <span class="chip ${a.ready ? "ok" : "warn"}">${a.ready ? (a.last ? "آخر دخول " + fmt(String(a.last).slice(0, 10)) : "مفعّل") : "بانتظار التفعيل"}</span>
      ${S.canWrite ? `<div class="pv-b"><button type="button" class="btn btn-ghost" data-pareset="${a.id}">إعادة الرمز</button><button type="button" class="btn btn-ghost bad-t" data-paoff="${a.id}">إيقاف</button></div>` : ""}</div>`).join("")).join("")}</div>` : `<div class="empty">لم يفعّل أي منسق حسابه بعد. أرسل لهم الرابط من تبويب «الجاليات».</div>`;
  if (tab === "reps") body = R.length ? `<div class="pv-list">${R.slice(0, 80).map(r => { const d = r.data || {};
    return `<div class="pv-r${r.seen_at ? "" : " pv-new"}"><div class="pv-n"><b>${esc(r.comm)} · ${esc(r.period || "")}</b><span>${esc(r.coord || "")}${d.lessons != null ? ` · ${d.lessons} درس` : ""}${d.attend != null ? ` · حضور ${d.attend}` : ""}${d.converts ? ` · ${d.converts} مهتدٍ` : ""}</span>${d.notes ? `<span class="s">${esc(d.notes)}</span>` : ""}${d.needs ? `<span class="s"><b>الاحتياجات:</b> ${esc(d.needs)}</span>` : ""}</div>
      ${r.seen_at ? `<span class="chip ok">اطُّلع</span>` : `<div class="pv-b"><button type="button" class="btn btn-ghost" data-crseen="${r.id}">اطّلعت</button></div>`}</div>`; }).join("")}</div>` : `<div class="empty">لم تصل تقارير بعد. يرسلها المنسق من البوابة كل شهر.</div>`;
  return head + body; };
document.addEventListener("click", ev => { const t = ev.target.closest("[data-pvt]"); if (!t) return; S.f.pvt = t.dataset.pvt; render(); });
document.addEventListener("input", ev => { if (ev.target.id !== "pv-q") return; const q = ev.target.value.trim().toLowerCase(); document.querySelectorAll(".pv-r[data-k]").forEach(r => { r.hidden = !!q && !r.dataset.k.includes(q); }); });

/* account requests: approve / reject / tell the coordinator */
const sgMsg = g => `السلام عليكم ورحمة الله وبركاته\nالأخ الفاضل / ${g.name}\n\nتم اعتماد حسابكم في بوابة المنسقين للجالية ${g.comm || g.comm_new}.\nالدخول برقمكم المدني والرمز السري الذي اخترتموه:\n${PT_ONE()}\n\nنائب المنسق (${g.dep_name}) يفعّل حسابه من «نائب منسق؟ فعّل حسابك» برقمه المدني وهاتفه.\n\nللاستفسار: 97512995\nوجزاكم الله خيراً${SIGN}`;
document.addEventListener("click", async ev => { const t = ev.target.closest("[data-sgok],[data-sgno],[data-sgwa]"); if (!t) return;
  if (t.dataset.sgwa) { const g = S.psign.find(x => x.id === t.dataset.sgwa); if (g) waOpen(g.phone, sgMsg(g)); return; }
  const id = t.dataset.sgok || t.dataset.sgno, ok = !!t.dataset.sgok, g = S.psign.find(x => x.id === id);
  if (!ok && !$("#sg-r-" + id)?.value.trim()) { $("#sg-r-" + id)?.focus(); return toast("اكتب سبب الرفض أولاً"); }
  if (t.dataset.sure !== "1") { t.dataset.sure = "1"; t.textContent = ok ? "تأكيد الموافقة" : "تأكيد الرفض"; return; }
  t.disabled = true; const { data, error } = await sb.rpc("staff_portal_decide", { p_id:id, p_ok:ok, p_comm:$("#sg-c-" + id)?.value || null, p_reason:$("#sg-r-" + id)?.value.trim() || null });
  if (error) { t.disabled = false; return writeFail(error); }
  await Promise.all([paLoad(), loadPortal(), sb.from("refs").select("*").eq("id", "coords").maybeSingle().then(({ data }) => { if (data) { putRow("refs", data); derive(); } })]); render();
  if (ok && g) { g.comm = data?.comm || g.comm; toast("اعتُمد الحساب، أبلغ المنسق"); waOpen(g.phone, sgMsg(g)); } else toast("رُفض الطلب"); });
const _prio50s = priorities;
priorities = function(){ const P = _prio50s(); const n = (S.psign || []).filter(g => g.status === "pending").length;
  if (n && S.canWrite) P.push({ w:88, k:"gold", t:`${n} طلب حساب جديد في بوابة المنسقين`, s:"منسق ونائبه بانتظار موافقتك", act:{ go:"portal", l:"مراجعة" } }); return P.sort((a, b) => b.w - a.w); };
NEWF.splice(1, 0, ["v52-id", "nav:home", "هوية «إنجاز» الجديدة", "ألوان أعمق وأهدأ، وأرقام أوضح، وبطاقات نظيفة بلا خطوط ملوّنة، وشريط علوي ثابت، وعبارات مرتبة بلا شَخطات.", false, "2026-10-20"]);
