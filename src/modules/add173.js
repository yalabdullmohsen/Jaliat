/* ================= v173 (JL-AI-NAV): صفحة «المساعد الذكي» عنصرًا مستقلًا في القائمة ================= */
/* تجمع ما يعمل دون سياق، باستدعاءات ai نفسها في add120 (aiBriefCard/home_brief) وadd124 (qaBox/data_qa)، بلا منطق ذكاء جديد،
   وروابط للأماكن التي تحتاج سياقًا (كتاب أو طلب أو نشاط) مع سطر يشرح كلًّا. الظهور بالصلاحية نفسها التي تُظهر الأزرار اليوم. */
TITLES.aihub = "المساعد الذكي";
const AIHUB_CTX = [
  { t:"صياغة رد رسمي", x:"افتح كتابًا واردًا في «وثيقة»، وتحت نصه زر «صياغة رد رسمي» يقترح ردًّا بأسلوب رسمي تنسخه وتعدّله.", go:"watheqa" },
  { t:"تلخيص الطلب وترجمته", x:"افتح طلبًا من «طلبات المنسقين»: «لخّص الطلب» يعرضه في سطر مع المطلوب، و«ترجمة إلى العربية» للطلب المكتوب بلغة أخرى.", go:"inbox" },
  { t:"حل التعارض", x:"افتح نشاطًا فيه تعارض: «اقترح حلًّا للتعارض» يقترح وقتًا آخر أو مسجدًا متاحًا من بيانات المنصة، مع رسالة للمنسق.", go:"acts", f:{ st:"cf" } },
];
const aihubAllowed = () => !!(S.canWrite || S.me);
function vAiHub(){
  if (!aihubAllowed()) return `<div class="panel"><div class="panel-b"><span class="s">المساعد الذكي متاح للموظفين بعد تسجيل الدخول.</span></div></div>`;
  const ctx = S.canWrite ? `<div class="panel aih-ctx"><div class="panel-h"><h3>في مكانها من المنصة</h3><span class="s">تحتاج كتابًا أو طلبًا أو نشاطًا مفتوحًا، فتظهر أزرارها هناك.</span></div><div class="panel-b"><div class="list">${AIHUB_CTX.map((c, i) => `<button type="button" class="li aih-go" data-aihgo="${i}"><span class="ic">${icon("i-spark", 15)}</span><span><span class="t">${esc(c.t)}</span><br><span class="s">${esc(c.x)}</span></span></button>`).join("")}</div></div></div>` : "";
  return `<div class="aih"><p class="aih-lead s">اقتراحات من المساعد الذكي تقرؤها وتعتمدها بنفسك، ولا يتغيّر شيء في المنصة تلقائيًا.</p>${aiBriefCard()}${qaBox()}${ctx}</div>`;
}
const _render173 = render;
render = function(){ if (S.view !== "aihub") return _render173.apply(this, arguments);
  $("#title").textContent = TITLES.aihub; $("#add-act").hidden = true; $("#view").innerHTML = vAiHub(); if (typeof afterRender === "function") afterRender("aihub"); };
/* عنصر القائمة: بعد «الرئيسية» بأيقونة الشرارة، لمن له الصلاحية فقط */
const _afterRender173 = afterRender;
afterRender = function(v){ _afterRender173(v); const nav = $("#nav"); if (!nav) return; const old = nav.querySelector('[data-nav="aihub"]');
  if (!aihubAllowed()) { old?.remove(); return; }
  if (old) { if (v === "aihub") old.setAttribute("aria-current", "page"); else old.removeAttribute("aria-current"); return; }
  nav.querySelector('button[data-nav="home"]')?.insertAdjacentHTML("afterend", `<button data-nav="aihub" class="aih-nav"${v === "aihub" ? ' aria-current="page"' : ""}><svg><use href="#i-spark"/></svg><span>المساعد الذكي</span></button>`); };
/* ملخص اليوم في هذه الصفحة: نداء add120 نفسه يعيد الرسم في الرئيسية فقط، فنعيد رسم هذه الصفحة حين تصل النتيجة */
document.addEventListener("click", ev => { if (S.view !== "aihub" || !ev.target.closest("[data-aibrief]")) return; const before = S.aiBrief; let n = 0;
  const w = setInterval(() => { if (S.aiBrief !== before || ++n > 240) { clearInterval(w); if (S.view === "aihub") render(); } }, 250); });
document.addEventListener("click", ev => { const t = ev.target.closest("[data-aihgo]"); if (!t) return; const c = AIHUB_CTX[+t.dataset.aihgo]; if (!c) return;
  if (c.f) Object.assign(S.f, F0(c.f)); go(c.go); });
GUIDES.aihub = { g:"العمل اليومي", d:"المساعد الذكي في مكان واحد: ملخص يومك، وأسئلة عن بيانات القسم، ودليل لأزراره داخل الصفحات.", s:[
  { sel:".aih .ai-card", t:"ملخص اليوم", x:"«لخّص يومي» يكتب في ثلاثة أسطر أهم ما يحتاج انتباهك اليوم من بيانات القسم. الملخص اقتراح للقراءة، ولا يغيّر شيئًا." },
  { sel:"#ai-q", t:"اسأل عن البيانات", x:"اكتب سؤالك بالعربية، مثل «كم نشاطًا جاريًا للجالية الفلبينية؟». الرقم يُحسب من بيانات المنصة مباشرة، و«افتح القائمة» يعرض الأنشطة نفسها." },
  { sel:".aih-ctx", t:"في مكانها من المنصة", x:"صياغة الرد وتلخيص الطلب وترجمته وحل التعارض تحتاج كتابًا أو طلبًا أو نشاطًا، فاضغط السطر لتنتقل إلى الصفحة التي تظهر فيها." }] };
TOURS["g-aihub"] = { title:"دليل: " + TITLES.aihub, steps:[{ t:TITLES.aihub, x:GUIDES.aihub.d + "<br><br>سنمرّ على أجزاء الصفحة واحداً واحداً." }, ...GUIDES.aihub.s] };
