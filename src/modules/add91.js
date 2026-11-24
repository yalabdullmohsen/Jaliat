/* ================= v91: تسهيل إصدار التصاريح (طلب يوسف «سهّل إصدار التصاريح») ================= */
/* 1) إصدار مباشر من «المطلوب منك الآن» ومن بطاقة النشاط. 2) إصدار جماعي لأنشطة منسق واحد بمعاينة قبل الإصدار ثم إرسالها PDF بضغطة.
   3) معاينة حيّة لما سيُطبع أعلى النموذج. 4) رسالة نقص تسمّي الحقل بالضبط وتنقل المؤشر إليه.
   كل الإصدار يمر بالمسار نفسه (permitForm ثم permitIssue) فتبقى التعبئة التلقائية من الموافقة ووثيقة وحرّاسها كما هي. */

/* رابط عميق لنموذج تصريح نشاط معيّن: #pact:<id> */
const _openLink91 = openLink;
openLink = function(h){ const s = String(h || "").replace(/^#/, ""); if (s.startsWith("pact:")) { closeDrawer(); return setTimeout(() => permitForm({ act_id:s.slice(5) }), 60); } return _openLink91(h); };

/* «المطلوب منك الآن»: موافقة واحدة تحتاج تصريحًا تفتح نموذجها مباشرة بدل صفحة التصاريح */
const _prio91 = priorities;
priorities = function(){ const P = _prio91(); if (!canPermit()) return P; const L = permitNeeds();
  if (L.length === 1) { const it = P.find(p => p.act?.go === "permits" && /تحتاج تصريح/.test(p.t)); if (it) { const e = L[0].e; it.s = `${e.lect || "—"} · ${e.mosName || ""}`; it.act = { open:"#pact:" + e.id, l:"إصدار التصريح" }; } }
  return P; };

/* بطاقة النشاط: إن وصلت موافقته ولم يصدر تصريحه يظهر زر الإصدار أعلاها */
const _actForm91 = actForm;
actForm = function(id){ const r = _actForm91.apply(this, arguments);
  if (id && canPermit() && S.form?.kind === "act" && permitNeeds().some(x => x.e.id === id)) $("#drawer .drawer-b")?.insertAdjacentHTML("afterbegin",
    `<div class="check ok pi-act"><b>تمت الموافقة على هذا النشاط ولم يصدر تصريحه</b><span>البيانات تتعبّأ من الموافقة تلقائيًا.</span><button type="button" class="btn btn-primary" data-pact="${esc(id)}">إصدار تصريح</button></div>`);
  return r; };

/* الحقول المطلوبة بأسمائها كما يراها المستخدم */
const PI_REQ = [["p-sheikh", "اسم الشيخ"], ["p-mosque", "المسجد"], ["p-date", "تاريخ الدرس"]];
const piMissing = () => PI_REQ.filter(([id]) => $("#" + id) && !$("#" + id).value.trim());
const _permitIssue91 = permitIssue;
permitIssue = async function(){
  const miss = piMissing(); document.querySelectorAll("#drawer .pi-err").forEach(x => x.classList.remove("pi-err"));
  if (miss.length) { miss.forEach(([id]) => $("#" + id)?.closest(".fld")?.classList.add("pi-err")); $("#" + miss[0][0])?.focus();
    if (!window.PBULK) toast("ناقص: " + miss.map(x => x[1]).join("، ") + ". اكتبه ثم اضغط «إصدار التصريح»"); return null; }
  /* حارس التدقيق (add66) كان يعرض أول خطأ فقط مع «(+n)»: هنا تُعرض كلها */
  const G = !window.PBULK && typeof pGate === "function" ? pGate() : []; if (G.length > 1) return toast("دقّق قبل الإصدار: " + G.join("؛ "));
  return _permitIssue91.apply(this, arguments); };

/* معاينة حيّة أعلى النموذج: سطر واحد بما سيُطبع، يتحدّث مع كل تعديل */
function piPreview(){ const b = $("#drawer .drawer-b"); if (!b || S.form?.kind !== "permit") return; const v = id => $("#" + id)?.value.trim() || "";
  const pray = $("#p-pray")?.selectedOptions?.[0]?.textContent || "", dur = $("#p-dur")?.selectedOptions?.[0]?.textContent || "";
  const parts = [v("p-sheikh") || "؟ الشيخ", v("p-mosque") || "؟ المسجد", v("p-date") ? fmt(v("p-date")) : "؟ التاريخ", pray, dur && "المدة: " + dur].filter(Boolean);
  let el = $("#pi-prev"); if (!el) { b.insertAdjacentHTML("afterbegin", `<div class="pi-prev" id="pi-prev" aria-live="polite"><b>سيصدر التصريح:</b> <span></span></div>`); el = $("#pi-prev"); }
  el.querySelector("span").textContent = parts.join(" · "); el.classList.toggle("pi-bad", piMissing().length > 0); }
const _permitForm91 = permitForm;
permitForm = function(p, g){ const r = _permitForm91.apply(this, arguments); setTimeout(piPreview, 0); setTimeout(piPreview, 400); return r; };
document.addEventListener("input", ev => { if (ev.target.closest("#drawer") && S.form?.kind === "permit") { ev.target.closest(".fld")?.classList.remove("pi-err"); piPreview(); } });
document.addEventListener("change", ev => { if (ev.target.closest("#drawer") && S.form?.kind === "permit") piPreview(); });

/* ===== الإصدار الجماعي: زر «إصدار الكل» لكل منسق في «تحتاج تصريح» ← معاينة بقائمة قابلة للتحديد ← إصدار ← تحديدها للإرسال PDF ===== */
const _vPermits91 = vPermits;
vPermits = function(){ const h = _vPermits91(); if (!canPermit() || (S.f.ptab && S.f.ptab !== "need")) return h;
  /* كل مجموعة منسق: زر بعدد أنشطتها (من أزرار data-pact داخلها) */
  return h.replace(/<section class="pt-g([^"]*)">([\s\S]*?)<\/section>/g, (m, cls, inner) => { const ids = [...inner.matchAll(/data-pact="([^"]+)"/g)].map(x => x[1]);
    if (ids.length < 2) return m;
    return `<section class="pt-g${cls}">` + inner.replace(/(<\/header>)/, `<button type="button" class="btn btn-primary pi-all" data-pbulk="${esc(ids.join(","))}">إصدار الكل (${ids.length})</button>$1`) + `</section>`; }); };
function piBulkPreview(ids){ const L = ids.map(id => S.byId.get(id)).filter(Boolean); if (!L.length) return;
  openDrawer(`إصدار ${L.length} تصاريح دفعة واحدة`, `<div class="check"><b>راجع القائمة ثم اضغط «إصدار المحدد»</b><span>كل تصريح يتعبّأ من موافقته كما في الإصدار الفردي، وتُحدَّد بعدها لإرسالها PDF بضغطة.</span></div>
    <div class="pi-bl">${L.map(e => `<label class="pi-br"><input type="checkbox" value="${esc(e.id)}" checked><span><b>${esc(e.lect || "—")}</b><span class="s">${esc([e.mosName, e.area || e.gov].filter(Boolean).join("، "))} · ${esc([daysText(e) !== "—" && daysText(e), e.time].filter(Boolean).join(" · "))}</span></span></label>`).join("")}</div>`,
    `<button class="btn btn-primary" data-pbgo>إصدار المحدد (${L.length})</button><button class="btn btn-ghost" data-close>إلغاء</button>`); }
document.addEventListener("change", ev => { if (!ev.target.closest(".pi-bl")) return; const n = document.querySelectorAll(".pi-bl input:checked").length, b = $("[data-pbgo]"); if (b) { b.textContent = `إصدار المحدد (${n})`; b.disabled = !n; } });
/* نفس آلية إصدار كتاب وثيقة الجماعي (add65: window.PBULK ثم ملف PDF لكل تصريح ثم ملخص بأزرار الإرسال) */
async function piBulkRun(ids){ const L = ids.map(id => S.byId.get(id)).filter(Boolean), rows = [], fail = [];
  closeDrawer(); window.PBULK = rows;
  try { for (let i = 0; i < L.length; i++) { const e = L[i]; toast(`يصدر التصريح ${i + 1} من ${L.length}…`); permitForm({ act_id:e.id });
      await new Promise(r => setTimeout(r, 40)); const miss = piMissing(); if (miss.length) { fail.push(`${e.lect || "—"}: ناقص ${miss.map(x => x[1]).join("، ")}`); continue; }
      const n = rows.length; try { await permitIssue(); } catch (_) {} if (rows.length === n) fail.push(`${e.lect || "—"}: ${(typeof pGate === "function" && pGate()[0]) || "تعذّر الإصدار"}`); } }
  finally { window.PBULK = null; }
  closeDrawer(); render();
  for (let i = 0; i < rows.length; i++) { toast(`يجهّز ملف PDF ${i + 1} من ${rows.length}…`); try { await permitView(rows[i].id); await permitPdf(rows[i].id); } catch (_) {} }
  pBulkSummary({ no:"" }, rows, fail.length);
  const h = $(".drawer-h h3"); if (h) h.textContent = `صدر ${rows.length} تصاريح`;
  if (fail.length) $(".drawer-b .check")?.insertAdjacentHTML("afterend", `<div class="check warn"><b>لم يصدر ${fail.length}</b><span>${fail.map(esc).join("<br>")}</span></div>`); }
document.addEventListener("click", ev => { const a = ev.target.closest("[data-pbulk]"); if (a) return piBulkPreview(a.dataset.pbulk.split(",").filter(Boolean));
  const b = ev.target.closest("[data-pbgo]"); if (!b) return; const ids = [...document.querySelectorAll(".pi-bl input:checked")].map(x => x.value); if (!ids.length) return; b.disabled = true; b.textContent = "جارٍ الإصدار…"; piBulkRun(ids); });

/* ================= دليل البداية لكل دور (JL-AUDIT «نضيف»): 3 إلى 5 خطوات تظهر عند أول دخول، وتُعاد من «الدليل» ================= */
const START_TOURS = {
  admin: [
    { go:"home", t:"أهلًا بك في إنجاز", x:"هذه جولة من 5 خطوات على ما تحتاجه يوميًا كرئيس قسم. تُعاد في أي وقت من صفحة «الدليل»." },
    { go:"home", sel:'#nav [data-nav="inbox"]', t:"الطلبات", x:"طلبات المنسقين والبوابة تصل هنا: راجعها واعتمدها أو ردّها." },
    { go:"permits", sel:'#nav [data-nav="permits"]', t:"التصاريح", x:"الموافقات التي تحتاج تصريحًا تظهر بياناتها جاهزة: أصدر تصريحًا واحدًا، أو <b>«إصدار الكل»</b> لأنشطة منسق واحد، ثم أرسلها PDF بضغطة." },
    { go:"home", sel:'#nav [data-nav="users"]', t:"المستخدمون والصلاحيات", x:"أضف الموظفين وحدّد دور كل واحد، ومن يحق له إصدار التصاريح." },
    { go:"home", sel:"#nl-more", t:"المزيد", x:"بقية الصفحات هنا، وخانة البحث أعلى القائمة تجد أي صفحة بالاسم." }
  ],
  editor: [
    { go:"home", t:"أهلًا بك في إنجاز", x:"جولة من 4 خطوات على عملك اليومي. تُعاد في أي وقت من صفحة «الدليل»." },
    { go:"home", sel:'#nav [data-nav="acts"]', t:"الأنشطة", x:"كل درس ونشاط بمسجده وموعده وحالة موافقته. أضف نشاطًا بزر «إضافة نشاط» أعلى الصفحة." },
    { go:"home", sel:'#nav [data-nav="inbox"]', t:"الطلبات والمهام", x:"ما يحتاج ردك يصل إلى «الطلبات»، وما أُسند إليك في «المهام»." },
    { go:"home", sel:"#nl-more", t:"المزيد", x:"بقية الصفحات هنا، وخانة البحث أعلى القائمة تجد أي صفحة بالاسم." }
  ],
  viewer: [
    { go:"home", t:"أهلًا بك في إنجاز", x:"حسابك للاطلاع: ترى الأنشطة والتقويم والتصاريح دون تعديل. هذه 3 خطوات سريعة." },
    { go:"home", sel:'#nav [data-nav="cal"]', t:"التقويم", x:"أنشطة كل يوم وأسبوع بمساجدها ومواعيدها." },
    { go:"home", sel:"#nl-more", t:"المزيد", x:"بقية الصفحات هنا، وخانة البحث أعلى القائمة تجد أي صفحة بالاسم." }
  ]
};
for (const [r, steps] of Object.entries(START_TOURS)) TOURS["start-" + r] = { title:"جولة البداية", steps };
const startKey = () => "start91:" + (S.me?.id || "");
/* أول دخول لكل مستخدم على هذا الجهاز: تبدأ جولة دوره مرة واحدة (لا في مساحة الأقسام الأخرى، ولا فوق جولة جارية) */
const _afterRender91 = afterRender;
afterRender = function(v){ _afterRender91(v);
  if (!S.me || document.body.classList.contains("dp-only") || $("#tr-card") || S.view !== "home") return;
  let seen = true; try { seen = localStorage.getItem(startKey()) === "1"; localStorage.setItem(startKey(), "1"); } catch (_) {}
  if (!seen) setTimeout(() => tourStart("start-" + navRole()), 900); };
/* صفحة «الدليل»: بطاقة جولة البداية أعلاها */
const _vGuide91 = vGuide;
vGuide = function(){ return `<div class="panel gd-start"><div class="panel-b"><b>جولة البداية لدورك</b><span>${START_TOURS[navRole()].length} خطوات على ما تحتاجه يوميًا.</span><button type="button" class="btn btn-primary" data-tour="start-${navRole()}">ابدأ الجولة</button></div></div>` + _vGuide91(); };
