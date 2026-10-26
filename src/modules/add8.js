/* ================= v9.7: Copilot at full depth (data file, replies back, ask-about-this) ================= */
const brV = () => parseFloat(document.documentElement.dataset.copilotBridgeV || "1.0");
function sysMarkdown(){
  const c = x => String(x ?? "").replace(/\|/g, "/").replace(/\s+/g, " ").trim() || "—";
  const T = (head, rows) => `| ${head.join(" | ")} |\n|${head.map(() => "---").join("|")}|\n` + rows.map(r => `| ${r.map(c).join(" | ")} |`).join("\n");
  const td = dOf(TODAY);
  const out = [`# بيانات نظام أنشطة الجاليات`, `وزارة الشؤون الإسلامية، إدارة العلاقات الخارجية، قسم الجاليات ورعاية المهتدين وطلبة البعوث.`,
    `تاريخ الملف: ${DAYS[td.getDay()]} ${fmt(TODAY)} م، ${hijri(td)}. أسبوع العمل يبدأ السبت. الحالات محسوبة تلقائياً من التواريخ.`,
    `\n## ملخص\n- عدد الأنشطة: ${S.E.length} (جارية ${S.E.filter(RUN).length}، فيها تعارض ${conflicts().length})\n- مساجد خطبة الجمعة: ${S.khatibs.size}\n- الجاليات: ${commNames.length}\n- المساجد المسجلة: ${S.mosques.length}\n- الوثائق: ${S.docs.length}`,
    `\n## الأنشطة (${S.E.length})`, T(["الرقم", "النوع", "الجالية", "المسجد", "المنطقة", "المحافظة", "الأيام", "الوقت", "المحاضر", "العنوان", "من", "إلى", "الحالة", "رقم الوثيقة", "يتعارض مع", "ملاحظات"],
      [...S.E].sort((a, b) => a.n - b.n).map(e => [e.n, e.type, e.comm, e.mosName, e.area, e.gov, daysText(e), e.time, e.lect, e.title, fmt(e.start), fmt(e.end), e.st, e.doc, e.cf.map(x => "#" + x.o.n).join("، "), e.notes])),
    `\n## خطباء الجمعة (${S.khatibs.size})`, T(["م", "المسجد", "المنطقة", "المحافظة", "الجالية", "الخطيب الأساسي", "هاتفه", "الخطيب الاحتياط", "هاتفه", "ملاحظات"],
      [...S.khatibs.values()].sort((a, b) => (a.n || 0) - (b.n || 0)).map((k, i) => [i + 1, k.mosque, k.area, k.gov, k.label || k.comm, k.pri, k.pph, k.bak, k.bph, k.note])),
    `\n## المنسقون حسب الجالية (${S.coords.length})`, T(["الجالية", "الاسم", "الصفة", "اللغة", "الهاتف", "الحالة"], [...S.coords].sort((a, b) => (a.comm || "").localeCompare(b.comm || "", "ar")).map(x => [x.comm, x.name, x.role, x.lang, x.phone, x.status])),
    `\n## الوثائق والموافقات (${S.docs.length})`, T(["رقم الوثيقة", "الموضوع", "الجالية", "تاريخ الكتاب", "بداية السريان", "نهاية السريان", "ملاحظات", "عدد الأنشطة"], S.docs.map(d => [d.no, d.subj, d.comm, fmt(d.date), fmt(d.start), fmt(d.end), d.notes, S.E.filter(e => e.doc === d.no).length])),
    `\n## المساجد (${S.mosques.length})`, T(["المسجد", "المنطقة", "المحافظة", "عدد الأنشطة"], S.mosques.map(m => ["مسجد " + m.name, m.area, m.gov, S.E.filter(e => e.mosque === m.id).length])),
    `\n## الملاحظات`, T(["التاريخ", "العنوان", "الأولوية", "الحالة", "الجالية", "التفاصيل"], [...S.notes.values()].map(n => [fmt(n.date), n.title, n.prio, n.status, n.comm, n.body]))];
  const pub = (S.cm || []).filter(x => !x.private); if (pub.length) out.push(`\n## تعليقات الفريق`, T(["على", "الكاتب", "التاريخ", "التعليق"], pub.slice(0, 300).map(x => [cmTarget(x.tbl, x.row_id).l, whoName(x.user_id), fmtTime(x.created_at), x.body])));
  if (typeof SR !== "undefined" && SR.rows?.size) out.push(`\n## سجل خطب الجمعة المسجل (آخر 3 أشهر)`, T(["الجمعة", "المسجد", "من ألقى الخطبة", "النوع", "المكافأة"], [...SR.rows.values()].filter(r => r.fri >= isoOf(new Date(td.getFullYear(), td.getMonth() - 3, 1))).map(r => [fmt(r.fri), S.khatibs.get(r.kh_id)?.mosque, r.name, ({ pri:"أساسي", bak:"احتياط", other:"بديل", none:"لم تُلقَ" })[r.who], r.amount])));
  return out.join("\n");
}
let PRIME_MSG = "مرفق ملف «بيانات نظام إنجاز» المفتوح أمامي الآن (الأنشطة والمساجد والجاليات والمحاضرون والخطباء والمنسقون والوثائق والملاحظات). اعتمد عليه كمصدر رئيسي في كل إجاباتك في هذه المحادثة، وعندما أقول «النظام» أو أسأل عن نشاط أو جالية أو مسجد أو خطيب أو منسق أو وثيقة فأقصد هذا الملف، ويمكنك أيضاً البحث في ملفاتي وبريدي عند الحاجة. أجب بالعربية بدقة واذكر أرقام الأنشطة والوثائق. لا تلخص الملف الآن، ورد فقط بعبارة: «تم استلام بيانات النظام ✓، اسألني ما تشاء».";
brPrime = function(){
  if (BR.primed) return; BR.primed = true;
  const f = $("#br-frame"); if (!f) return;
  if (brV() >= 1.1) f.contentWindow.postMessage({ type:"jaliyat-ask", text:PRIME_MSG, file:{ name:`بيانات-نظام-الجاليات-${TODAY}.md`, content:sysMarkdown(), type:"text/markdown" } }, "https://m365.cloud.microsoft");
  else { const intro = PRIME_MSG.replace("مرفق ملف «بيانات نظام إنجاز»", "هذه بيانات «نظام أنشطة الجاليات»"); f.contentWindow.postMessage({ type:"jaliyat-ask", text:`${intro}\n\n${cpData("", 14000)}` }, "https://m365.cloud.microsoft"); }
  const st = $("#br-st"); if (st) st.textContent = brV() >= 1.1 ? "جارٍ إرفاق ملف بيانات النظام لـ Copilot…" : "جارٍ إرسال بيانات النظام…";
};
BR.last = "";
window.addEventListener("message", e => {
  if (!/^https:\/\/m365\.cloud\.microsoft$/.test(e.origin)) return;
  const d = e.data || {};
  if (d.type === "jaliyat-copilot-status" && d.s === "uploading") { const st = $("#br-st"); if (st) st.textContent = "جارٍ رفع ملف البيانات…"; }
  if (d.type === "jaliyat-reply" || d.type === "jaliyat-last") {
    BR.last = String(d.text || "").trim(); const st = $("#br-st"); if (st) st.textContent = BR.last ? "وصل رد Copilot ✓" : "Copilot جاهز";
    const box = $("#br-last"); if (box && BR.last && !/^تم استلام بيانات النظام/.test(BR.last)) box.hidden = false;
  }
});
const _vCopilot8 = vCopilot;
vCopilot = function(){
  let h = _vCopilot8();
  if (!hasBridge()) return h;
  const upd = brV() < 1.1 ? `<div class="check warn" style="font-size:13px"><b>تحديث الجسر متاح (1.1)</b><span>يرفع ملف بيانات النظام كاملاً لـ Copilot ويعيد الردود للنظام. نزّل <a href="jaliyat-copilot.zip" download>الجسر الجديد</a>، استخرجه فوق المجلد القديم، ثم اضغط «إعادة تحميل» على الجسر في صفحة الملحقات.</span></div>` : "";
  const tools = `<div id="br-last" class="br-last"${BR.last && brV() >= 1.1 ? "" : " hidden"}><b>آخر رد من Copilot</b>
      <div class="br-acts"><button type="button" class="btn" data-brsave="mine">حفظ في ملاحظاتي الخاصة</button><button type="button" class="btn" data-brsave="team">حفظ كملاحظة للفريق</button><button type="button" class="btn" data-brsave="copy">نسخ</button></div></div>
    <button type="button" class="btn btn-ghost" id="br-reprime" title="أعد إرسال بيانات النظام المحدثة">${icon("i-down")} تحديث بيانات النظام لدى Copilot</button>`;
  return h.replace('<div class="cp-chips">', upd + tools + '<div class="cp-chips">');
};
async function brSave(kind){
  const send = async txt => {
    if (kind === "copy") { const ok = await cpCopy(txt); return toast(ok ? "نُسخ رد Copilot" : "تعذّر النسخ"); }
    const title = "رد Copilot، " + fmt(TODAY) + " " + (txt.split("\n").find(l => l.trim()) || "").slice(0, 50);
    if (kind === "mine") { const { error } = await sb.from("my_notes").insert({ user_id:S.me.id, title, body:txt, color:"b" }); if (error) return writeFail(error); await loadMine(); toast("حُفظ في ملاحظاتك الخاصة"); }
    else { if (!S.canWrite) return toast("صلاحيتك عرض فقط"); await T.put("notes", null, { title, body:txt, prio:"متوسطة", status:"مفتوحة", date:TODAY, comm:"", src:"Microsoft 365 Copilot" }); toast("حُفظ كملاحظة للفريق"); }
  };
  if (BR.last) return send(BR.last);
  const f = $("#br-frame"); if (!f) return;
  const once = e => { if (e.origin === "https://m365.cloud.microsoft" && e.data?.type === "jaliyat-last") { window.removeEventListener("message", once); if (e.data.text) send(e.data.text); else toast("لا يوجد رد بعد"); } };
  window.addEventListener("message", once); f.contentWindow.postMessage({ type:"jaliyat-get-last" }, "https://m365.cloud.microsoft");
}
/* "ask Copilot about this" from any record */
function askAbout(text){ BR.pending = text; if (S.view !== "copilot") { closeDrawer(); go("copilot"); } else { brSend(text, false); BR.pending = ""; } }
const _brPrime8 = brPrime;
brPrime = function(){ _brPrime8(); if (BR.pending) { const t = BR.pending; BR.pending = ""; setTimeout(() => brSend(t, false), 1500); } };
function actQuestion(e){ return `حلّل النشاط رقم ${e.n} في النظام: ${e.type} للجالية ${e.comm || "—"} في ${e.mosName || "مسجد غير محدد"} (${[e.area, e.gov].filter(Boolean).join("، ")}) يوم ${daysText(e)} ${e.time || ""}، المحاضر: ${e.lect || "—"}، الوثيقة: ${e.doc || "—"} (${fmt(e.start)} إلى ${fmt(e.end)})، الحالة: ${e.st}. تحقق من: صحة الموافقة وسريانها، أي تعارض مع أنشطة أخرى، ابحث في ملفاتي وبريدي عن كتاب الموافقة رقم ${e.doc || "—"}، واقترح ما يلزم.`; }
document.addEventListener("click", ev => { const t = ev.target.closest("button"); if (!t) return;
  if (t.dataset.brsave) return brSave(t.dataset.brsave);
  if (t.id === "br-reprime") { BR.primed = false; brPrime(); return; }
  if (t.dataset.askact) { const e = S.byId.get(t.dataset.askact); if (e) askAbout(actQuestion(e)); return; }
  if (t.dataset.askdoc) { const d = docBy[t.dataset.askdoc]; if (d) askAbout(`ابحث في ملفاتي وبريدي عن الكتاب رقم ${d.no} (${d.subj}) وأعطني تفاصيله، وقارنه بالأنشطة المسجلة عليه في النظام (${S.E.filter(e => e.doc === d.no).map(e => "#" + e.n).join("، ") || "لا يوجد"}). هل الموافقة بكتاب رسمي أم «لا مانع»؟ وما مدة سريانها؟`); return; }
});
/* buttons inside forms */
const _actForm8 = actForm;
actForm = function(id, preset){ _actForm8(id, preset); if (id && S.form?.kind === "act") $(".drawer-f [data-close]")?.insertAdjacentHTML("afterend", `<button class="btn btn-ghost cp-ask" type="button" data-askact="${esc(id)}">${icon("i-spark")} اسأل Copilot</button>`); };
const _listForm8 = listForm;
listForm = function(kind, key){ _listForm8(kind, key); if (kind === "doc" && key !== undefined && docBy[key]) $(".drawer-f [data-close]")?.insertAdjacentHTML("afterend", `<button class="btn btn-ghost cp-ask" type="button" data-askdoc="${esc(key)}">${icon("i-spark")} ابحث بـ Copilot</button>`); };
