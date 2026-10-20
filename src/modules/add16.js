/* ================= v15: «مساعد إنجاز» — instant answers from the system's own data, Copilot for deeper work ================= */
const AS = { msgs:[], sent:false };
const nk2 = s => nkey(String(s || "").replace(/^(الجاليه|جاليه|الجالية|جالية)\s*/, ""));
const runOn = iso => { const d = dOf(iso).getDay(); return S.E.filter(e => e.live && e.start <= iso && e.end >= iso && e.days.includes(d)).sort((a, b) => (a.sl?.[0] || 0) - (b.sl?.[0] || 0)); };
const actItem = e => ({ t:`#${e.n} · ${e.comm || "—"} · ${e.mosName || "—"}`, s:[daysText(e), e.time, e.lect].filter(Boolean).join(" · "), open:`act:${e.id}`, bad:!!e.cf.length });
const SUGG = [
  ["أولويات اليوم", "i-spark", "أولويات اليوم"], ["أنشطة اليوم", "i-cal", "أنشطة اليوم"], ["أنشطة الغد", "i-cal", "أنشطة الغد"],
  ["التعارضات وحلولها", "i-log", "التعارضات"], ["موافقات تنتهي قريباً", "i-doc", "موافقات تنتهي"], ["جاليات بلا نشاط", "i-people", "جاليات بلا نشاط"],
  ["أنسب يوم لنشاط جديد", "i-chart", "أنسب يوم"], ["حجوزات القاعات", "i-hall", "حجوزات القاعات"], ["مهامي", "i-list", "مهامي"],
  ["الطلبات الواردة", "i-inbox", "الطلبات الجديدة"], ["ملخص الأسبوع", "i-chart", "ملخص الأسبوع"], ["مساجد بلا خطيب احتياط", "i-mic", "بلا احتياط"],
  ["أكثر المحاضرين نشاطاً", "i-users", "المحاضرين"], ["بيانات ناقصة", "i-note", "بيانات ناقصة"]];
function answer(q){
  const n = norm(q), has = (...w) => w.some(x => n.includes(norm(x)));
  const R = (title, items, extra) => ({ title, items:items || [], extra:extra || "" });
  if (has("اولويات", "أولويات", "ماذا افعل", "شو اسوي")) return R("أولويات اليوم", priorities().map(p => ({ t:p.t, s:p.s, go:p.act.go, open:p.act.open })));
  if (has("الغد", "باكر", "بكره", "غدا")) { const L = runOn(addDays(TODAY, 1)); return R(`أنشطة الغد (${L.length})`, L.map(actItem)); }
  if (has("اليوم") && has("نشاط", "انشطه", "أنشطة", "دروس")) { const L = runOn(TODAY); return R(`أنشطة اليوم (${L.length})`, L.map(actItem)); }
  if (has("تعارض")) { const P = cfPairs(); return R(`التعارضات الجارية (${P.length})`, P.slice(0, 30).map(p => { const f = altFixes(p.a, 1)[0] || altFixes(p.b, 1)[0]; return { t:`#${p.a.n} ↔ #${p.b.n} — ${p.k === "lect" ? "نفس المحاضر" : "نفس المسجد"}`, s:f ? `حل مقترح: ${f.label}` : "لا يوجد وقت بديل خالٍ — غيّر المحاضر أو المسجد", open:`act:${p.a.id}`, bad:true }; }), P.length ? "افتح أي تعارض لتطبيق الحل بضغطة." : "لا توجد تعارضات ✓"); }
  if (has("موافق", "وثيق") && has("تنتهي", "انتهاء", "منتهي")) { const L = S.docs.filter(d => d.end && d.end >= TODAY && d.end <= addDays(TODAY, 30)).sort((a, b) => a.end.localeCompare(b.end)); return R(`موافقات تنتهي خلال 30 يوماً (${L.length})`, L.map(d => ({ t:`${d.no} — ${d.comm || ""}`, s:`تنتهي ${fmt(d.end)} · ${S.E.filter(e => e.doc === d.no && e.live).length} نشاط مرتبط`, open:`doc:${d.no}` }))); }
  if (has("بلا نشاط", "بدون نشاط")) { const run = new Set(S.E.filter(RUN).map(e => e.comm)); const L = commNames.filter(c => !run.has(c)); return R(`جاليات بلا نشاط جارٍ (${L.length})`, L.map(c => ({ t:c, s:"", go:"comms" }))); }
  if (has("انسب يوم", "أنسب يوم", "افضل يوم")) { const run = S.E.filter(RUN); const L = WEEK.filter(d => d !== 5).map(d => [d, run.filter(e => e.days.includes(d)).length]).sort((a, b) => a[1] - b[1]); return R("أنسب الأيام لجدولة نشاط جديد", L.map(([d, c]) => ({ t:DAYS[d], s:`${c} نشاط جارٍ` }))); }
  if (has("حجز", "قاع")) { const L = bkLive().filter(b => b.day >= TODAY && b.day <= addDays(TODAY, 7)); return R(`حجوزات القاعات خلال أسبوع (${L.length})`, L.map(b => ({ t:`${hallName(b.hall)} — ${b.data?.title || b.data?.comm || "حجز"}`, s:`${DAYS[dOf(b.day).getDay()]} ${fmt(b.day)} · ${bkSpan(b)}${b.status === "مبدئي" ? " · مبدئي" : ""}`, open:`bk:${b.id}` }))); }
  if (has("مهام", "مهمتي", "مهامي")) { const L = S.tasks.filter(t => t.assignee === S.me.id && TK_OPEN.includes(t.status)); return R(`مهامك المفتوحة (${L.length})`, L.map(t => ({ t:`م-${t.no} ${t.title}`, s:`${t.status}${t.due ? " · الموعد " + fmt(t.due) : ""}${late(t) ? " · متأخرة" : ""}`, open:`task:${t.id}`, bad:late(t) }))); }
  if (has("طلب", "الطلبات")) { const L = S.reqs.filter(r => !["معتمد", "مرفوض"].includes(r.status)); return R(`الطلبات المفتوحة (${L.length})`, L.map(r => ({ t:`${rqNo(r)} ${r.data?.org || r.data?.comm || "طلب"}`, s:`${r.status}${r.data?.ack ? "" : " · بلا تأكيد استلام"}`, open:`req:${r.id}` }))); }
  if (has("ملخص", "تقرير", "الاسبوع", "الأسبوع")) { const W = [...Array(7)].map((_, i) => addDays(TODAY, i)); const tot = W.reduce((s, d) => s + runOn(d).length, 0);
    return R("ملخص الأسبوع القادم", [{ t:`${tot} موعد نشاط خلال 7 أيام`, s:W.map(d => `${DAYS[dOf(d).getDay()]} ${runOn(d).length}`).join(" · "), go:"weekly" }, { t:`${S.E.filter(RUN).length} نشاط جارٍ`, s:`${cfPairs().length} تعارض · ${S.docs.filter(d => d.end && d.end >= TODAY && d.end <= addDays(TODAY, 14)).length} موافقة تنتهي خلال أسبوعين`, go:"acts" }, { t:`${bkLive().filter(b => b.day >= TODAY && b.day <= addDays(TODAY, 7)).length} حجز قاعة`, s:"", go:"halls" }, { t:`${S.tasks.filter(t => TK_OPEN.includes(t.status)).length} مهمة مفتوحة`, s:`${S.tasks.filter(late).length} متأخرة`, go:"tasks" }], "للتقرير الرسمي: الإحصائيات ← التقرير الشهري (Word)."); }
  if (has("احتياط")) { const L = [...S.khatibs.entries()].filter(([, k]) => !k.bak); return R(`مساجد جمعة بلا خطيب احتياط (${L.length})`, L.map(([id, k]) => ({ t:k.mosque, s:[k.pri, k.label || k.comm, k.area].filter(Boolean).join(" · "), open:`kh:${id}` }))); }
  if (has("ناقص")) { const L = S.E.filter(e => e.live && (!e.mosque || !e.days.length || !e.time || !e.lect)); return R(`أنشطة بياناتها ناقصة (${L.length})`, L.map(e => ({ ...actItem(e), s:["مسجد", "يوم", "وقت", "محاضر"].filter((x, i) => ![e.mosque, e.days.length, e.time, e.lect][i]).map(x => "بلا " + x).join(" · ") }))); }
  if (has("المحاضرين", "محاضرين")) { const lc = {}; S.E.filter(RUN).forEach(e => (e.lect || "").split(" / ").filter(Boolean).forEach(l => lc[l] = (lc[l] || 0) + 1)); return R("أكثر المحاضرين أنشطة جارية", Object.entries(lc).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([l, c]) => ({ t:l, s:`${c} نشاط`, go:"acts", f:F0({ q:l }) }))); }
  /* entity questions: community / mosque / lecturer / khatib / coordinator */
  const k = nkey(q);
  const ALIAS = { "بنغال":"البنغلاديشية", "بنجلاديش":"البنغلاديشية", "بنغلاديش":"البنغلاديشية", "فلبين":"الفلبينية – تجالوج", "باكستان":"الباكستانية", "سريلانك":"السريلانكية", "افغان":"الأفغانية", "اندونيس":"الإندونيسية", "صين":"الصينية", "فارس":"الفارسية", "ايران":"الفارسية", "اثيوب":"الإثيوبية", "حبش":"الإثيوبية", "مليبار":"الهندية – المليبارية", "مالايالم":"الهندية – مالايالم", "تاميل":"الهندية – التاميلية", "اوردو":"الهندية – الأوردية", "تلغو":"الهندية – التلغو", "غربي":"الغربية", "انجليز":"الغربية" };
  const alias = Object.entries(ALIAS).find(([w, c]) => n.includes(w) && commNames.includes(c))?.[1];
  const comm = alias || commNames.filter(c => nk2(c).length > 3 && k.includes(nk2(c))).sort((a, b) => b.length - a.length)[0] || commNames.find(c => norm(c).split(/[\s–-]+/).some(w => w.length > 4 && n.includes(w)));
  if (comm && has("منسق", "رقم", "هاتف")) { const L = S.coords.filter(c => c.comm === comm); return R(`منسقو ${comm}`, L.map(c => ({ t:`${c.name} — ${c.role || ""}`, s:c.phone || "", tel:c.phone }))); }
  if (comm) { const L = S.E.filter(e => e.comm === comm && RUN(e)); return R(`${comm}: ${L.length} نشاط جارٍ`, L.map(actItem), `${S.coords.filter(c => c.comm === comm).length} منسق · اسأل «منسق ${comm}» لأرقامهم.`); }
  const mos = S.mosques.filter(m => nkey(m.name).length > 3 && k.includes(nkey(m.name))).sort((a, b) => b.name.length - a.name.length)[0];
  if (mos && has("خطيب", "خطبه", "خطبة", "جمعه")) { const kh = khByMosque(mos.name); if (kh) return R(`خطبة الجمعة — مسجد ${kh[1].mosque}`, [{ t:`الأساسي: ${kh[1].pri || "—"}`, s:kh[1].pph || "", tel:kh[1].pph }, { t:`الاحتياط: ${kh[1].bak || "—"}`, s:kh[1].bph || "", tel:kh[1].bph }, { t:"فتح بطاقة المسجد", s:"", open:`kh:${kh[0]}` }]); }
  if (mos) { const L = S.E.filter(e => e.mosque === mos.id && e.live); return R(`مسجد ${mos.name}${mos.area ? " — " + mos.area : ""}: ${L.length} نشاط`, L.map(actItem)); }
  const lect = [...new Set(S.E.flatMap(e => (e.lect || "").split(" / ")).filter(Boolean))].filter(l => nkey(l).length > 5 && k.includes(nkey(l)))[0];
  if (lect) { const L = S.E.filter(e => (e.lect || "").includes(lect) && e.live); return R(`${lect}: ${L.length} نشاط`, L.map(actItem)); }
  const hits = palSearch(q).filter(x => !["إجراءات", "الصفحات"].includes(x.g)).slice(0, 8);
  return R(hits.length ? "أقرب النتائج في النظام" : "لم أجد إجابة مباشرة في بيانات النظام", hits.map(x => ({ t:x.t, s:x.s, run:x })), "لتحليل أعمق أو للبحث في بريدك وملفاتك: اسأل Copilot.");
}
function ansHTML(a, i){
  return `<div class="as-a"><b>${esc(a.title)}</b>${a.items.length ? `<div class="as-l">${a.items.slice(0, 40).map((x, j) => `<button type="button" class="as-i${x.bad ? " bad" : ""}" data-asi="${i}|${j}"><span>${esc(x.t)}</span>${x.s ? `<span class="s">${esc(x.s)}</span>` : ""}</button>`).join("")}${a.items.length > 40 ? `<span class="s">و${a.items.length - 40} أخرى…</span>` : ""}</div>` : ""}
    ${a.extra ? `<span class="s">${esc(a.extra)}</span>` : ""}
    <div class="as-x"><button type="button" class="btn btn-ghost" data-ascp="${i}">${icon("i-spark", 14)} اسأل Copilot للتعمق</button></div></div>`;
}
function vAssistant(){
  const first = !AS.msgs.length;
  return `<div class="as">
    ${first ? `<div class="as-hero"><svg class="as-logo"><use href="#star"/></svg><h2>كيف أقدر أساعدك؟</h2><p class="s">إجابات فورية من بيانات «إنجاز»، و Copilot للتحليل الأعمق والبحث في بريدك وملفاتك.</p></div>` : ""}
    <div class="as-sugg">${SUGG.map(([l, ic, q]) => `<button type="button" data-asq="${esc(q)}">${icon(ic, 15)} ${esc(l)}</button>`).join("")}</div>
    <div class="as-thread" id="as-thread">${AS.msgs.map((m, i) => m.q ? `<div class="as-q">${esc(m.q)}</div>${ansHTML(m.a, i)}` : "").join("")}</div>
    ${AS.sent ? `<div class="as-back"><span>رجعت من Copilot؟ الصق رده لينفّذ النظام أي تعديل طلبته.</span><button type="button" class="btn btn-primary" data-aspaste>لصق رد Copilot</button></div><div id="cpx"></div>` : ""}
    <form class="as-bar" id="as-form"><input class="f" id="as-in" placeholder="اسأل عن أي نشاط، جالية، مسجد، محاضر، موافقة…" autocomplete="off"><button type="button" class="btn" id="br-mic" title="تكلّم">${icon("i-mic")}</button><button class="btn btn-primary" type="submit">إرسال</button></form>
    ${!isMobileDev() ? `<details class="cp-alt"><summary>عرض Copilot داخل النظام على هذا الكمبيوتر (تثبيت الجسر)</summary>${_vCopilot16Install()}</details>` : ""}
  </div>`;
}
function asAsk(q){ q = String(q || "").trim(); if (!q) return; AS.msgs.push({ q, a:answer(q) }); render(); setTimeout(() => { const t = $("#as-thread"); t?.lastElementChild?.scrollIntoView({ behavior:"smooth", block:"start" }); }, 50); }
async function asCopilot(i){
  const m = AS.msgs[i]; const q = m?.q || "";
  const text = `${mobPrompt(q)}\n\nما وجده النظام: ${m?.a?.title || ""}\n${(m?.a?.items || []).slice(0, 25).map(x => "- " + x.t + (x.s ? " — " + x.s : "")).join("\n")}`;
  const file = new File([sysMarkdown()], `بيانات-نظام-إنجاز-${TODAY}.txt`, { type:"text/plain" });
  AS.sent = true;
  if (isMobileDev() && navigator.canShare && navigator.canShare({ files:[file] })) { try { await cpCopy(text); await navigator.share({ files:[file], text }); render(); return; } catch (e) { if (e?.name === "AbortError") { render(); return; } } }
  await cpCopy(`${text}\n\n${cpData(q, 12000)}`); toast("نُسخ سؤالك مع البيانات — الصقه في Copilot"); window.open("https://m365.cloud.microsoft/chat/", "_blank", "noopener"); render();
}
function _vCopilot16Install(){ return `<ol class="cp-steps big"><li><a class="btn btn-primary" href="jaliyat-copilot.zip" download>${icon("i-down")} تنزيل الجسر</a> ثم «استخراج الكل».</li><li>افتح <code dir="ltr">${extUrl}</code> وفعّل «وضع المطوّر».</li><li>«تحميل ملحق لم يتم فك حزمته» ← اختر مجلد <b dir="ltr">jaliyat-copilot</b>، ثم حدّث هذه الصفحة.</li></ol>`; }
const _vCopilot16 = vCopilot;
vCopilot = function(){ if (hasBridge()) return _vCopilot16(); return vAssistant(); };
document.addEventListener("submit", ev => { if (ev.target.id === "as-form") { ev.preventDefault(); const i = $("#as-in"); asAsk(i.value); } });
document.addEventListener("click", async ev => {
  const t = ev.target.closest("button"); if (!t) return; const D = t.dataset;
  if (D.asq) return asAsk(D.asq);
  if (D.ascp !== undefined) return asCopilot(+D.ascp);
  if (D.asi) { const [i, j] = D.asi.split("|").map(Number); const x = AS.msgs[i]?.a.items[j]; if (!x) return;
    if (x.tel) return location.href = "tel:" + waNum(x.tel);
    if (x.open) return openLink("#" + x.open); if (x.go) return go(x.go, x.f); if (x.run) return x.run.run(); return; }
  if (D.aspaste !== undefined) { let txt = ""; try { txt = await navigator.clipboard.readText(); } catch (_) {} if (!txt) { txt = prompt("الصق رد Copilot هنا") || ""; } const acts = findActions(txt); if (!acts.length) return toast("لا توجد أوامر تعديل في الرد — إجابة Copilot للعرض فقط"); CPX.list = acts.map(a => ({ a })); cpxRender(); $("#cpx")?.scrollIntoView({ behavior:"smooth", block:"center" }); }
});
/* voice → assistant input when no bridge */
const _voiceStart16 = voiceStart;
voiceStart = function(target){ if (!hasBridge() && $("#as-in")) { const i = $("#as-in"); if (!SR_API) return toast("الإدخال الصوتي غير مدعوم في هذا المتصفح"); const r = new SR_API(); r.lang = "ar-KW"; r.interimResults = true; r.onresult = ev => { i.value = [...ev.results].map(x => x[0].transcript).join(""); }; r.onend = () => { if (i.value.trim()) asAsk(i.value); }; r.start(); toast("تكلّم الآن…"); return; } return _voiceStart16(target); };
