/* ================= v9.4: Microsoft 365 Copilot bridge (no admin consent needed) ================= */
TITLES.copilot = "Copilot";
const CP = { url:"https://m365.cloud.microsoft/chat/?auth=2", useData:true, max:11000, q:"" };
const CP_PROMPTS = [
  ["ابحث في ملفاتي", "كتب الموافقات وجداول الجاليات", "ابحث في ملفاتي على OneDrive وSharePoint وفي بريدي عن آخر كتب وموافقات أنشطة الجاليات، واعرضها مع روابطها وتواريخها.", false],
  ["ملخص بريدي", "رسائل الجاليات التي تحتاج رداً", "لخّص لي آخر الرسائل في بريدي المتعلقة بالجاليات أو الدروس والمحاضرات الدينية، وحدد ما يحتاج رداً مني.", false],
  ["قارن بالنظام", "موافقات ملفاتي مقابل الأنشطة المسجلة", "قارن بين كتب الموافقات الموجودة في ملفاتي وبريدي وبين قائمة الأنشطة المسجلة في النظام المرفقة أدناه، وأخبرني بأي نشاط غير مسجل أو موافقة ناقصة أو منتهية.", true],
  ["تقرير الأسبوع", "جاهز للرفع لرئيس القسم", "اكتب تقريراً أسبوعياً موجزاً عن أنشطة القسم من البيانات المرفقة أدناه، بصيغة رسمية مناسبة للرفع لرئيس القسم، مع الأرقام والتوصيات.", true],
  ["التعارضات", "حلول عملية للتعارضات", "حلّل التعارضات في البيانات المرفقة أدناه، واقترح لكل تعارض حلاً عملياً (يوم أو وقت أو مسجد بديل).", true],
  ["كتاب رسمي", "طلب تجديد موافقة", "اكتب مسودة كتاب رسمي باسم إدارة العلاقات الخارجية — قسم الجاليات ورعاية المهتدين وطلبة البعوث، لطلب تجديد موافقة الأنشطة التي تنتهي قريباً في البيانات المرفقة أدناه، مع ترك فراغات للرقم والتاريخ والتوقيع.", true],
  ["اجتماعاتي", "ما نوقش بخصوص الجاليات", "ما أبرز ما نوقش في اجتماعاتي ومحادثات Teams الأخيرة بخصوص الجاليات والأنشطة الدينية؟", false],
  ["ملفات Excel", "جداول الأنشطة في ملفاتي", "ابحث في ملفاتي عن جداول Excel الخاصة بأنشطة الجاليات أو خطباء الجمعة، ولخّص محتواها.", false],
];
function cpData(q, max){
  max = max || CP.max;
  const cl = x => String(x ?? "").replace(/\s+/g, " ").trim();
  const nq = nkey(q || "");
  const hit = e => !nq || [e.comm, e.mosName, e.area, e.gov, e.lect, e.doc, e.type].some(v => { const k = nkey(v || ""); return k.length > 3 && nq.includes(k.replace(/^ال/, "").slice(0, 8)); });
  let L = S.E.filter(hit); if (L.length < 3) L = S.E;
  L = [...L].sort((a, b) => (RUN(b) - RUN(a)) || (b.cf.length - a.cf.length) || (a.n - b.n));
  const head = [`[بيانات من نظام أنشطة الجاليات — قسم الجاليات ورعاية المهتدين وطلبة البعوث — بتاريخ ${fmt(TODAY)}]`,
    `الإجمالي: ${S.E.length} نشاط (${S.E.filter(RUN).length} جارٍ، ${conflicts().length} فيها تعارض)، ${S.khatibs.size} مسجد خطبة جمعة، ${commNames.length} جالية.`,
    `حسب الجالية: ${commRows().filter(r => r.L.length).map(r => `${r.c} ${r.L.length}`).join("، ")}.`,
    `الأنشطة (الرقم | النوع | الجالية | المسجد — المنطقة | الأيام والوقت | المحاضر | من–إلى | الحالة | الوثيقة | تعارض):`];
  const rows = []; let size = head.join("\n").length;
  for (const e of L) { const r = [`#${e.n}`, e.type, e.comm, [e.mosName, e.area].filter(Boolean).join(" — "), daysText(e) + " " + (e.time || ""), e.lect, `${fmt(e.start)}–${fmt(e.end)}`, e.st, e.doc, e.cf.map(c => "#" + c.o.n).join("،")].map(cl).join(" | ");
    if (size + r.length > max) { rows.push(`… و${L.length - rows.length} نشاطاً آخر (الكل في النظام)`); break; } rows.push(r); size += r.length + 1; }
  return head.concat(rows).join("\n");
}
function vCopilot(){
  return `<div class="cp cp-simple">
    <div class="cp-box"><span class="cp-badge">${icon("i-spark", 16)} Microsoft 365 Copilot</span>
      <h3>اسأل Copilot عن أي شيء</h3>
      <textarea class="f" id="cp-q" rows="3" placeholder="مثال: ابحث في ملفاتي عن موافقة الجالية الباكستانية">${esc(CP.q)}</textarea>
      <button class="btn btn-primary btn-lg" id="cp-go" type="button">${icon("i-spark", 18)} اسأل Copilot</button>
      <div class="ai-chips">${CP_PROMPTS.slice(0, 6).map((p, i) => `<button type="button" data-cpp="${i}"><b>${esc(p[0])}</b></button>`).join("")}</div>
    </div></div>`;
}
function cpDone(){
  document.getElementById("cp-ok")?.remove();
  const d = document.createElement("div"); d.id = "cp-ok"; d.className = "cp-ok";
  d.innerHTML = `<div><b>✓ جاهز</b><span>في Copilot اضغط <kbd>⌘</kbd> + <kbd>V</kbd> ثم <kbd>Enter</kbd></span><button type="button" class="btn btn-ghost" onclick="this.closest('.cp-ok').remove()">تم</button></div>`;
  document.body.appendChild(d); setTimeout(() => d.remove(), 9000);
}
async function cpCopy(text){
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) { const t = document.createElement("textarea"); t.value = text; t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select(); let ok = false; try { ok = document.execCommand("copy"); } catch (_) {} t.remove(); return ok; }
}
async function cpAsk(q, withData){
  q = String(q || "").trim(); if (!q) { toast("اكتب سؤالك أولاً"); $("#cp-q")?.focus(); return; }
  const text = withData ? `${q}\n\n${cpData(q)}` : q;
  const ok = await cpCopy(text);
  const w = window.open(CP.url, "jaliyat-copilot");
  if (ok) cpDone(); else toast("افتح Copilot والصق السؤال يدوياً");
  if (!w) toast("اسمح بفتح النوافذ المنبثقة لهذا الموقع");
}
/* attach system data automatically when the question is about the department's work */
function cpNeedsData(q){ return /نشاط|أنشط|انشط|درس|دروس|دور|محاضر|جالي|مسجد|مساجد|خطيب|خطب|منسق|موافق|وثيق|تعارض|تقرير|النظام|قارن/.test(q); }
function cpSize(){ const el = $("#cp-size"); if (!el) return; el.textContent = CP.useData ? `(${cpData(CP.q).length.toLocaleString("en")} حرف)` : ""; }
document.addEventListener("click", ev => {
  const t = ev.target.closest("button"); if (!t) return;
  if (t.id === "cp-go") { const q = $("#cp-q").value; return cpAsk(q, cpNeedsData(q)); }
  if (t.id === "cp-fab") return go("copilot");
  if (t.id === "cp-open") { window.open(CP.url, "jaliyat-copilot"); return; }
  if (t.id === "cp-xlsx") return exportXlsx();
  if (t.dataset.cpp !== undefined) { const p = CP_PROMPTS[+t.dataset.cpp]; return cpAsk(p[2], p[3]); }
});
document.addEventListener("input", ev => { if (ev.target.id === "cp-q") { CP.q = ev.target.value; clearTimeout(cpSize.t); cpSize.t = setTimeout(cpSize, 300); } });
document.addEventListener("change", ev => { if (ev.target.id === "cp-data") { CP.useData = ev.target.checked; cpSize(); } });
document.addEventListener("keydown", ev => { if (ev.target.id === "cp-q" && ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); cpAsk(ev.target.value, cpNeedsData(ev.target.value)); } });
const _afterRender5 = afterRender;
afterRender = function(v){ _afterRender5(v); const f = $("#cp-fab"); if (f) f.hidden = v === "copilot"; if (v === "copilot") { if (matchMedia("(min-width:901px)").matches) $("#cp-q")?.focus(); } };
const _palAll5 = palAll;
palAll = function(){ const A = _palAll5(); A.splice(1, 0, { g:"إجراءات", t:"اسأل Copilot", s:"ملفاتك وبريدك واجتماعاتك + بيانات النظام", ic:"i-spark", run:() => go("copilot"), txt:"copilot كوبايلت مايكروسوفت ذكاء ملفات بريد" }); return A; };

/* floating Copilot button on every page */
document.body.insertAdjacentHTML("beforeend", `<button type="button" class="cp-fab" id="cp-fab" title="اسأل Copilot" hidden>${icon("i-spark", 22)}<span>Copilot</span></button>`);
const _boot9c = boot9; boot9 = function(){ _boot9c(); const f = $("#cp-fab"); if (f) f.hidden = S.view === "copilot"; };
