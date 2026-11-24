/* ================= v87 (JL-2): الصفحة الرئيسية على كل المقاسات ================= */
/* تاريخ مقروء: «الخميس 5 نوفمبر» بدل 05/11/2026 */
const dAr = s => { if (!s) return ""; const d = new Date(String(s).slice(0, 10) + "T12:00:00"); return isNaN(d) ? String(s) : d.toLocaleDateString("ar-KW-u-nu-latn", { weekday:"long", day:"numeric", month:"long" }); };
const taskRef = no => `مهمة رقم ${no}`;
const monthPermits = () => (S.permits || []).filter(p => !p.revoked && (p.issued_at || "").startsWith(monthNow()));
const permLine = p => [p.no ? `تصريح ${p.no}` : "تصريح", p.data?.sheikh, p.data?.mosque ? "مسجد " + String(p.data.mosque).replace(/^مسجد\s+/, "") : ""].filter(Boolean).join(" · ");

/* 1) «أنجزته هذا الشهر» يشمل التصاريح التي أصدرها الموظف نفسه (كان يعدّ المهام فقط)، وكل تصريح يُنسب لمُصدِره (issued_by) */
const _myWork87 = myWork;
myWork = function(){ const W = _myWork87(); if (!W) return W; const me = S.me.id, M = monthPermits();
  const mine = M.filter(p => p.issued_by === me), others = M.filter(p => p.issued_by && p.issued_by !== me);
  const ref = s => s.replace(/^م-(\d+)/, (_, n) => taskRef(n)).replace(/(\d{2})\/(\d{2})\/(\d{4})/g, (_, d, m, y) => dAr(`${y}-${m}-${d}`));
  W.now = W.now.map(x => x.a === 'data-go="watheqa"' ? wqNowItem() : { ...x, s:ref(x.s) }).filter(Boolean);
  W.rest = W.rest.map(x => ({ ...x, s:ref(x.s) }));
  const pItem = p => ({ t:permLine(p), s:`أصدرته ${dAr(p.issued_at)}`, a:`data-permit="${esc(p.id)}"`, at:p.issued_at });
  W.done = [...W.done.map(x => ({ ...x, s:ref(x.s) })), ...mine.map(pItem)].sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  W.doneN += mine.length; W.permMine = mine; W.permOthers = others;
  W.openN += typeof wqPendList === "function" && S.canWrite ? wqPendList().length : 0;
  return W; };

/* 2) «المطلوب منك الآن»: ما المطلوب وممّن بجملة واضحة، ومعه زر الإجراء */
function wqNowItem(){ const L = S.canWrite && typeof wqPendList === "function" ? wqPendList() : []; if (!L.length) return null;
  const ok = L.filter(w => wqOutcome(w) === "موافقة").length, no = L.length - ok;
  const what = [ok ? `${ok} ${ok === 1 ? "موافقة" : "موافقات"}` : "", no ? `${no} ${no === 1 ? "اعتذار" : "اعتذارات"}` : ""].filter(Boolean).join(" و");
  return { k:"warn", t:`أبلغ المنسقين بـ${L.length} ${L.length === 1 ? "رد" : L.length <= 10 ? "ردود" : "رداً"} من وثيقة`, s:`وصل من وثيقة رد على طلبات الجاليات (${what})، والمطلوب منك إرسال القرار لمنسق كل جالية`, a:'data-go="watheqa"', btn:"إبلاغ المنسقين" }; }

myWorkCard = function(){ const W = myWork(); if (!W) return "";
  const pm = canPermit() ? W.permMine.length + (S.admin ? W.permOthers.length : 0) : 0;
  if (!(W.now.length + W.rest.length + W.done.length + pm)) return "";
  const item = x => `<button type="button" class="mw-i ${x.k || ""}" ${x.a}><b>${esc(x.t)}</b><span>${esc(x.s)}</span>${x.btn ? `<span class="mw-go">${esc(x.btn)} ←</span>` : ""}</button>`;
  const col = (cls, title, sub, L, empty) => `<div class="mw-c ${cls}"><div class="mw-h"><b>${title}</b><span class="num">${L.length}</span></div><small>${sub}</small>
    <div class="mw-l">${L.slice(0, 6).map(item).join("") || `<div class="mw-e">${empty}</div>`}${L.length > 6 ? `<button type="button" class="lnk" data-go="${cls === "done" && !W.done.some(x => x.a.startsWith("data-task")) ? "permits" : "tasks"}">+ ${L.length - 6} أخرى</button>` : ""}</div></div>`;
  const tot = W.doneN + W.openN, pct = tot ? Math.round(W.doneN / tot * 100) : null;
  const perm = canPermit() ? `<div class="mw-pm">${col("pm-mine", "تصاريحي هذا الشهر", "التصاريح التي أصدرتها أنت", W.permMine.map(p => ({ t:permLine(p), s:`أصدرته ${dAr(p.issued_at)}`, a:`data-permit="${esc(p.id)}"` })), "لم تُصدر تصاريح هذا الشهر")}${S.admin ? col("pm-others", "تصاريح غيري هذا الشهر", "باسم من أصدرها", W.permOthers.map(p => ({ t:permLine(p), s:`أصدره ${pname(p.issued_by)} · ${dAr(p.issued_at)}`, a:`data-permit="${esc(p.id)}"` })), "لا تصاريح من غيرك هذا الشهر") : ""}</div>` : "";
  return `<section class="mw panel"><div class="mw-top"><div><h2>لوحتي، ${esc((S.me.name || S.me.username || "").split(" ")[0])}</h2><span class="s">ما المطلوب منك الآن، وما المتبقي، وما أنجزته هذا الشهر</span></div>
    <div class="mw-p"><div class="mw-ring" style="--p:${pct ?? 0}"><b class="num">${pct == null ? "—" : pct + "%"}</b></div><span>${pct == null ? "لا مهام هذا الشهر" : "إنجاز الشهر"}</span></div></div>
    <div class="mw-g">${col("now", "المطلوب منك الآن", "متأخر، أو اليوم، أو جديد", W.now, "لا يوجد شيء عاجل ✓")}${col("rest", "المتبقي", "مهام مفتوحة مواعيدها لاحقاً", W.rest, "لا توجد مهام متبقية")}${col("done", "أنجزته هذا الشهر", "مهام أنجزتها وتصاريح أصدرتها", W.done, "لم تُنجز شيئاً هذا الشهر بعد")}</div>${perm}</section>`; };

/* 4-د) حلقة الإنجاز في البطاقة العلوية: بلا مهام ولا معلّقات لا تعرض 100%، والمعلّقات تُحسب */
if (typeof heroCard === "function") { const _hero87 = heroCard;
  heroCard = function(){ const h = _hero87(), W = myWork(); if (!W || W.doneN + W.openN) return h;
    return h.replace(/stroke-dashoffset="\d+"/, 'stroke-dashoffset="314"').replace(/<b class="num">\d+%<\/b><span>إنجاز الشهر<\/span>/, '<b class="num">—</b><span>لا مهام هذا الشهر</span>'); }; }

/* تُعرض التصاريح فور تحميلها إن كانت الصفحة الرئيسية مفتوحة */
const _loadPermits87 = loadPermits;
loadPermits = async function(){ try { return await _loadPermits87(); } finally { if (S.view === "home" && $("#drawer").hidden) render(); } };

/* 3) «عرض الحل»: ما يتعارض بالضبط، ثم خطوات حل بالترتيب، ثم زر التنفيذ بعد الاتفاق، بلا «حل جاهز» */
const cfCoords = comm => (typeof coFor === "function" ? coFor(comm, []) : (S.coords || []).filter(c => c.comm === comm && c.phone)).slice(0, 2);
function cfWaText(e, o){ return `السلام عليكم، لدينا تعارض بين نشاطين: #${e.n} (${e.comm || "—"}) و#${o.n} (${o.comm || "—"}) في ${e.mosName || o.mosName || "المسجد"}، ${e.time || ""}. نرجو التنسيق لاختيار وقت أو مسجد آخر.`; }
cfPanel = function(e){
  if (!e?.cf?.length) return "";
  const row = (k, v) => `<div class="cf-r"><span>${k}</span><b>${v}</b></div>`;
  const actTxt = a => `#${a.n} ${esc(a.title || a.type || "")} · ${esc(a.comm || "جالية غير محددة")}${a.lect ? " · " + esc(a.lect) : ""}`;
  const blocks = e.cf.map(c => { const o = c.o, days = e.days.filter(d => o.days.includes(d)).map(d => DAYS[d]).join("، ");
    const w = cfWhy(e, c), co = [...new Map([...cfCoords(e.comm), ...cfCoords(o.comm)].map(x => [x.phone, x])).values()];
    const alts = [...altFixes(e, 2), ...altFixes(o, 2)].slice(0, 3);
    const steps = [
      `<li><b>تواصل مع منسق الجالية</b>${co.length ? `<div class="cf-wa">${co.map(x => `<a class="btn" target="_blank" rel="noopener" href="https://wa.me/${waNum(x.phone)}?text=${encodeURIComponent(cfWaText(e, o))}">واتساب ${esc(x.name || "المنسق")} (${esc(x.comm || "")})</a>`).join("")}</div>` : `<span class="s">لا يوجد رقم منسق مسجّل لهاتين الجاليتين.</span>`}</li>`,
      `<li><b>غيّر الوقت أو المسجد</b>${alts.length ? `<span class="s">بدائل متاحة بلا أي تعارض (فُحصت مع كل الأنشطة). نفّذ البديل بعد موافقة المنسق:</span><div class="ai-fix">${alts.map(f => `<button type="button" class="btn" data-cffix="${esc(JSON.stringify(f))}">${esc(f.label)}</button>`).join("")}</div>` : `<span class="s">لا يوجد وقت أو يوم بديل خالٍ في نفس المسجد؛ اتفق مع المنسق على مسجد آخر ثم عدّل النشاط.</span>`}</li>`,
      `<li><b>أو أوقف النشاط المكرر</b><span class="s">إن كان أحدهما مسجلاً مرتين بالخطأ${e.doc && e.doc === o.doc ? " (النشاطان على نفس الموافقة، وهذا يرجّح التكرار)" : ""}:</span><div class="ai-fix"><button type="button" class="btn btn-ghost" data-cfstop="${esc(e.id)}">إيقاف #${e.n}</button><button type="button" class="btn btn-ghost" data-cfstop="${esc(o.id)}">إيقاف #${o.n}</button></div></li>`];
    return `<div class="cf-b"><b class="cf-t">${c.k === "lect" ? "المحاضر نفسه في نشاطين بنفس الوقت" : "المسجد نفسه يستضيف نشاطين بنفس الوقت"}</b>
      <div class="cf-g">${row("النشاط الأول", actTxt(e))}${row("النشاط الثاني", actTxt(o))}${row("المسجد", esc(c.k === "lect" ? `${e.mosName || "—"} / ${o.mosName || "—"}` : e.mosName || "—"))}${row("اليوم والوقت", esc(`${days} · ${e.time || "—"}${o.time && o.time !== e.time ? " / " + o.time : ""}`))}${row("المنسق", co.length ? esc(co.map(x => x.name).join("، ")) : "غير مسجّل")}</div>
      <ul class="cf-why">${w.root.map(r => `<li>${esc(r)}</li>`).join("")}</ul>
      <span class="s">خطوات الحل بالترتيب:</span><ol class="cf-steps">${steps.join("")}</ol></div>`; });
  return `<div class="ai-an cf87"><b>ما يتعارض بالضبط وكيف يُحل</b>${blocks.join("")}
    ${S.admin ? `<button type="button" class="btn btn-ghost" data-tkfrom="cf|${esc(e.id)}">أو أسند حل التعارض لموظف</button>` : ""}</div>`; };
document.addEventListener("click", async ev => { const b = ev.target.closest("[data-cfstop]"); if (!b) return;
  if (!S.canWrite) return toast("صلاحيتك عرض فقط"); const id = b.dataset.cfstop, a = S.acts.get(id), e = S.byId.get(id); if (!a) return;
  if (!confirm(`إيقاف النشاط #${e?.n ?? ""} لأنه مكرر؟ تصير حالته «ملغى» ويمكن إرجاعه بتعديل الحالة.`)) return;
  try { await T.put("acts", id, { ...a, status:"ملغى" }); toast(`أُوقف النشاط #${e?.n ?? ""}`); closeDrawer(); } catch (err) { writeFail(err); } });
const _prio87 = priorities;
priorities = function(){ return _prio87().map(p => p.act?.l === "عرض الحل" ? { ...p, s:"افتح التعارض لترى ما يتعارض بالضبط وخطوات حله مع المنسق" } : p); };

/* 4-هـ) «أنشطة اليوم»: «· المنطقة» تلتصق باسم المسجد فلا تبقى النقطة وحدها في سطر */
actRow = function(e){
  return `<button class="li" data-open="act:${esc(e.id)}"><span class="time">${esc(e.time || "—")}</span>
    <span class="li-m"><span class="t">${esc(e.mosName || "مسجد غير محدد")}</span>${e.area ? `<span class="s nw"> · ${esc(e.area)}</span>` : ""}<br><span class="s">${esc(e.comm || "جالية غير محددة")}${e.lect ? " · " + esc(e.lect) : ""}</span></span>
    ${typeChip(e.type)}</button>`; };

/* 4-أ،ب،ج) «الأيام السبعة القادمة»: العنوان سطر واحد، والبطاقات كاملة، والتاريخ والعدد مفهومان */
const _vHome87 = vHome;
vHome = function(){ return _vHome87().replace(/<span class="h"><b>([^<]+)<\/b><span class="num">(\d+)\/(\d+)<\/span><\/span>\s*<span class="c num">(\d+)<\/span>/g,
  (m, day, d, mo, n) => `<span class="h"><b>${day}</b><span class="wd-d">${d} ${["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"][+mo - 1]}</span></span><span class="c num">${n}</span><span class="wd-u">${+n === 1 ? "نشاط" : +n === 2 ? "نشاطان" : +n >= 3 && +n <= 10 ? "أنشطة" : "نشاطاً"}</span>`)
  .replace('<h3>الأيام السبعة القادمة</h3><span class="legend">', '<h3 class="wk-h">الأيام السبعة القادمة</h3><span class="legend wk-lg">'); };
