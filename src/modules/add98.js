/* ================= v98 (JL-8 «ندمج» و«نحذف»): الصفحات المتشابهة صفحة واحدة بتبويبات ================= */
/* كل مجموعة تظهر في القائمة زرًا واحدًا باسمها، وتفتح بتبويبات لصفحاتها القديمة نفسها (لا تُفقد وظيفة ولا تتغيّر صلاحية).
   كل رابط قديم (#weekly، #rewards، #mine…) يبقى يعمل ويفتح داخل مجموعته على تبويبه.
   «نحذف»: الأسئلة صارت تبويبًا في المهام، وسجل التحديثات تبويبًا في الدليل؛ المحادثات وطلبات الميزات مخفيتان، ورابطاهما يرجعان للرئيسية/قسمي.
   لا حذف لأي جدول أو بيانات. */
const VGROUPS = [
  { title:"التقويم", tabs:[["cal", "الشهر"], ["weekly", "الأسبوع"], ["lmap", "الخريطة"]] },
  { title:"خطب الجمعة", tabs:[["khatibs", "الخطباء"], ["fsched", "جدول الجمعة"], ["rewards", "السجل والمكافآت"], ["sermrec", "التسجيلات"]] },
  { title:"الموافقات", tabs:[["docs", "الموافقات"], ["renew", "تذكيرات المنسقين"]] },
  { title:"الجاليات", tabs:[["comms", "الجاليات"], ["coords", "المنسقون"], ["coordeval", "التقييم"]] },
  { title:"الملاحظات", tabs:[["notes", "مشتركة"], ["mine", "خاصة"]] },
  { title:"النسخ الاحتياطي", tabs:[["backups", "النسخ الآلية"], ["odsave", "OneDrive"]] },
  { title:"السجل", tabs:[["audit", "كل التعديلات"], ["staffday", "يوم كل موظف"]] },
  { title:"المساجد والقاعات", tabs:[["avail", "هل المسجد متاح؟"], ["halls", "حجز القاعات"]] },
  { title:"التقارير", tabs:[["stats", "الإحصائيات"], ["report", "التقرير الشهري"]] },
  { title:"المهام", tabs:[["tasks", "المهام"], ["questions", "الأسئلة"]] },
  { title:"الدليل", tabs:[["guide", "الدليل"], ["changes", "سجل التحديثات"]] }
];
const VG_HIDDEN = { chat:"home" };
/* «طلبات الميزات» زرها مخفي فقط؛ صفحتها تبقى مفتوحة من «الدليل» لقراءة الأفكار المقترحة (زر في add99) */
const VG_NAV_OFF = ["chat", "freq"];
const vgOf = v => VGROUPS.find(g => g.tabs.some(t => t[0] === v));
/* المسموح من تبويبات المجموعة: صفحة لها زر في القائمة غير مخفي بالصلاحية (قبل إخفاء الدمج) */
const vgAllowed = g => g.tabs.filter(([k]) => { const b = document.querySelector(`#nav button[data-nav="${k}"]`); return b && !b.hidden && !b.closest("[hidden]"); });
function vgNav(){ const nav = $("#nav"); if (!nav) return;
  for (const k of VG_NAV_OFF) nav.querySelectorAll(`button[data-nav="${k}"]`).forEach(b => b.classList.add("vg-off"));
  for (const g of VGROUPS) { const A = vgAllowed(g); nav.querySelectorAll(g.tabs.map(([k]) => `button[data-nav="${k}"]`).join(",")).forEach(b => b.classList.remove("vg-main"));
    g.tabs.forEach(([k]) => nav.querySelectorAll(`button[data-nav="${k}"]`).forEach(b => b.classList.toggle("vg-off", !A.length || k !== A[0][0])));
    if (!A.length) continue; const main = nav.querySelector(`button[data-nav="${A[0][0]}"]`); if (!main) continue; main.classList.add("vg-main");
    const sp = main.querySelector("span") || main; if (sp.textContent !== g.title) { if (!main.dataset.vgOld) main.dataset.vgOld = sp.textContent; if (main.querySelector("span")) sp.textContent = g.title; }
    if (vgOf(S.view) === g) main.setAttribute("aria-current", "page"); } }
const _go98 = go;
go = function(v, opt){ if (VG_HIDDEN[v]) v = VG_HIDDEN[v]; return _go98.call(this, v, opt); };
const _render98 = render;
render = function(){ if (VG_HIDDEN[S.view]) S.view = VG_HIDDEN[S.view];
  const r = _render98.apply(this, arguments), g = vgOf(S.view); if (!g) return r; const A = vgAllowed(g); if (A.length < 2) return r;
  const view = $("#view"); if (!view || view.querySelector(":scope > .vg-bar")) return r;
  view.insertAdjacentHTML("afterbegin", `<div class="vg-bar" role="tablist" aria-label="${esc(g.title)}">${A.map(([k, l]) => `<button type="button" role="tab" aria-selected="${k === S.view}" class="${k === S.view ? "on" : ""}" data-vgtab="${k}">${esc(l)}</button>`).join("")}</div>`);
  const t = $("#title"); if (t && !t.querySelector(".sub")) t.textContent = g.title; return r; };
document.addEventListener("click", ev => { const t = ev.target.closest("[data-vgtab]"); if (!t) return; go(t.dataset.vgtab); });
const _afterRender98 = afterRender;
afterRender = function(v){ _afterRender98(v); vgNav(); };
