/* ===== v62: «الدليل» — a usage guide for every page and every main action, shown on the real screen with arrows (tours),
   a «دليل الصفحة» button on every page, small «؟» marks next to each explained part, and a guide center listing everything.
   Plus fewer clicks: approving a Watheqa approval can now register it and notify the coordinator in ONE press. ===== */
Object.assign(TITLES, { guide:"الدليل" });
/* step: { sel, txt (find by text inside sel), up (climb to container), t (title), x (explanation), none (text when the part is not on screen), pre(fn) } */
const G = (sel, t, x, o = {}) => ({ sel, t, x, ...o });
const GT = (txt, t, x, o = {}) => ({ sel:"#view h2,#view h3,#view b", txt, up:o.up || ".panel", t, x, ...o });
const TOP_ADD = G("#add-act", "إضافة نشاط", "الزر الأخضر أعلى الشاشة يضيف نشاطاً جديداً من أي صفحة. وعلى الجوال: زر «+» في الشريط السفلي.");
const GUIDES = {
  home:{ g:"العمل اليومي", d:"لوحتك اليومية: ما المطلوب منك اليوم وما يحدث في القسم.", s:[
    GT("أولويات اليوم", "أولويات اليوم", "أهم ما يحتاج تصرّفك الآن مرتباً حسب الأهمية: موافقات وصلت، مهام، طلبات، تعارضات. <b>كل سطر فيه زر يأخذك مباشرة للإجراء</b>، ابدأ دائماً من هنا."),
    GT("الأيام السبعة القادمة", "الأيام السبعة القادمة", "الأنشطة القادمة خلال أسبوع. اضغط أي يوم لترى تفاصيله."),
    GT("أنشطة اليوم", "أنشطة اليوم", "كل نشاط يقام اليوم مع المسجد والوقت. اضغط النشاط لفتحه."),
    GT("وثائق تنتهي قريباً", "وثائق تنتهي قريباً", "موافقات تقترب من نهايتها. اضغطها ثم «تذكير التجديد» لإرسال رسالة للمنسق."),
    G("#finder", "البحث الذكي", "ابحث عن أي شيء: مسجد، جالية، منسق، رقم كتاب. اختصار لوحة المفاتيح Ctrl K."), TOP_ADD,
    G("#bell", "الإشعارات", "الجرس: كل جديد يخصك (مهمة، موافقة، طلب). اضغط الإشعار يأخذك للمكان مباشرة.") ] },
  copilot:{ g:"العمل اليومي", d:"اسأل النظام بالعربي واحصل على الجواب من بيانات القسم.", s:[
    G("#view input.f", "اكتب سؤالك", "مثال: «كم درس للجالية الباكستانية في حولي؟» أو «ما الموافقات التي تنتهي هذا الشهر؟» ثم «إرسال»."),
    G("#view .btn-primary", "إرسال", "يجيبك النظام من البيانات الموجودة في إنجاز مع روابط تفتح العنصر مباشرة.") ] },
  tasks:{ g:"العمل اليومي", d:"إسناد المهام للموظفين ومتابعة إنجازها.", s:[
    G("#view .seg", "التبويبات", "<b>مهام الفريق</b> (لرئيس القسم): كل المهام. <b>مهامي</b>: المسندة لك. <b>إنجازاتي</b>: ما أنجزته. <b>سجل الإنجاز</b>: إنجاز كل موظف."),
    G("[data-tknew]", "إسناد مهمة", "اكتب المهمة، اختر الموظف والموعد والأولوية، ثم «إسناد المهمة». يصله إشعار فوراً."),
    G("[data-tkcf]", "إسناد التعارضات بضغطة", "يحوّل كل تعارض في الجدول إلى مهمة لموظف دفعة واحدة."),
    { t:"إنجاز المهمة (للموظف)", x:"افتح المهمة: <b>«تم الإنجاز ✅»</b> مباشرة بضغطة واحدة، أو «استلمت» و«بدأت» إن أردت إظهار التقدم. رئيس القسم يرى كل خطوة بوقتها." } ] },
  fix:{ g:"العمل اليومي", d:"كل ما ينقص النظام ليعمل بدقة، وكل ما تكمله يختفي من القائمة.", s:[
    G("#view .fx-tabs", "تبويبات النقص", "<b>توزيع على المنسقين</b>: موافقات قديمة مسجلة باسم جالية مشتركة. <b>أنشطة ناقصة</b>: بلا مسجد أو وقت. <b>جاليات بلا منسق</b>. <b>منسقون بلا رقم</b>."),
    G("[data-spall]", "اعتماد المقترحات بضغطة", "النظام يقرأ الكتاب ويقترح المنسق الصحيح؛ هذا الزر ينقل كل المقترحات دفعة واحدة.", { none:"عند وجود موافقات للتوزيع يظهر زر «اعتماد المقترحات» لنقلها كلها بضغطة." }),
    G(".sp2-i", "بطاقة الموافقة", "«عرض الكتاب» لقراءة الكتاب الأصلي، ثم اضغط اسم المنسق الصحيح (المقترح عليه علامة «مقترح»).", { none:"لكل موافقة بطاقة فيها «عرض الكتاب» وأسماء المنسقين، اضغط المنسق الصحيح." }),
    G(".fx-i", "سطر ناقص", "اضغط السطر يفتح النشاط مباشرة، أكمل الحقل الناقص واحفظ.", { none:"كل سطر ناقص يفتح بضغطة لإكماله." }) ] },
  questions:{ g:"العمل اليومي", d:"أسئلة بين الموظفين ورئيس القسم بإجابة موثقة.", s:[
    G("[data-qnew]", "سؤال جديد", "اكتب السؤال واختر الموظف، يصله إشعار، ويجيب من هنا."),
    G("#view .seg", "التبويبات", "واردة لي، أرسلتها، كل الأسئلة.") ] },
  inbox:{ g:"العمل اليومي", d:"طلبات المنسقين الواردة من البوابة ومن الاستقبال.", s:[
    G("#view .seg", "حالات الطلب", "المفتوحة، جديد، قيد المراجعة، بانتظار الموافقة، معتمد، مرفوض."),
    { t:"إنجاز الطلب", x:"افتح الطلب: راجع المرفقات وخريطة رحلة الطلب، اكتب ردك للمنسق، ثم اختر الحالة. <b>«مسودة كتاب وثيقة»</b> يجهّز كتاب إدارة المساجد من بيانات الطلب، و<b>«إرسال إلى وثيقة تلقائياً»</b> يحفظه مسودة في السكرتارية دون أن تدخل وثيقة." },
    G("#ocr-top", "إرفاق ملف أو صورة", "أرفق صورة أو PDF أو إكسل أو وورد، يقرؤه Copilot ويضع كل معلومة في مكانها.", { none:"زر «إرفاق» أعلى الشاشة: أي ملف يقرؤه Copilot ويضعه في مكانه." }) ] },
  watheqa:{ g:"العمل اليومي", d:"كتب وثيقة: طلباتنا لإدارات المساجد، وردودهم بالموافقة أو الرفض.", s:[
    G(".wqk-day", "اليوم في وثيقة", "ملخص اليوم: كم طلباً أرسلنا، وكم موافقة ورفضاً وصلنا."),
    G(".wqk-seg", "الفرز", "<b>طلباتنا لإدارات المساجد</b> / <b>موافقات وصلتنا</b> / <b>رفض</b> / <b>ردود أخرى</b>. النظام يفرز كل كتاب تلقائياً حسب من وقّعه."),
    G(".wq-tiles", "المتابعة", "الكتب المرسلة، قيد المتابعة (بانتظار الرد أو تحتاج إبلاغ المنسق)، المنجزة، الواردة."),
    { t:"إنجاز الموافقة بضغطة واحدة", x:"افتح كتاب الموافقة ← <b>«اعتماد الموافقة وتسجيل أنشطتها»</b> ← اختر الجالية ← <b>«اعتماد وإبلاغ المنسق»</b>: يسجّل الموافقة وأنشطتها ويرسل للمنسق رسالة الواتساب في خطوة واحدة." },
    { t:"المزامنة", x:"تتحدث كتب وثيقة تلقائياً مرتين يومياً (9 و11 الصبح) ما دام Chrome مفتوحاً على جهاز الدوام وفيه دخول وثيقة." } ] },
  permits:{ g:"العمل اليومي", d:"تصاريح الدروس بباركود يتحقق منه إمام المسجد.", s:[
    G("[data-pnew]", "إصدار تصريح", "اكتب الشيخ والمسجد والموضوع والتاريخ والوقت (أو أصدره من داخل النشاط فتتعبأ البيانات)، ثم «إصدار». يخرج التصريح بالباركود والختم للطباعة أو الواتساب. الإصدار لرئيس القسم أو بتفويض منه."),
    G("[data-pgnew]", "تفويض موظف", "رئيس القسم يفوّض موظفاً بإصدار تصريح لكتاب محدد فقط."),
    G("[data-passets]", "التوقيع والختم", "ارفع صورة التوقيع والختم مرة واحدة لتظهر على كل تصريح.") ] },
  whatsapp:{ g:"التواصل", d:"واتساب القسم داخل النظام.", s:[ { t:"واتساب القسم", x:"كل الرسائل للمنسقين تخرج من رقم القسم من داخل إنجاز. يحتاج تركيب «جسر إنجاز» مرة واحدة على جهاز الدوام." } ] },
  chat:{ g:"التواصل", d:"محادثات الموظفين الداخلية.", s:[ { t:"المحادثات", x:"اختر زميلاً أو مجموعة واكتب. يصل إشعار للطرف الآخر." } ] },
  renew:{ g:"التواصل", d:"تذكير المنسقين بتجديد الموافقات قبل انتهائها.", s:[
    G("#view .rn-seg", "المدة", "اعرض الموافقات التي تنتهي خلال 14 أو 30 أو 60 يوماً."),
    G(".rn-send", "إرسال تذكير", "رسالة جاهزة بالموافقة وتاريخ انتهائها تُرسل للمنسق بضغطة، ويُسجَّل أنك أرسلتها.", { none:"لكل منسق زر «إرسال تذكير» برسالة جاهزة." }) ] },
  avail:{ g:"الأنشطة والجدولة", d:"هل المسجد متاح في وقت معين؟", s:[ { t:"فحص الوقت", x:"اختر المسجد واليوم والوقت، يخبرك النظام فوراً إن كان هناك نشاط آخر في نفس الوقت (تعارض)." } ] },
  docs:{ g:"الأنشطة والجدولة", d:"الموافقات المسجلة ومددها.", s:[
    G("[data-new=doc]", "إضافة وثيقة", "سجّل رقم الكتاب والجالية وتاريخ البداية والنهاية. الأفضل: اعتمادها من صفحة «وثيقة» لتُسجَّل تلقائياً مع أنشطتها.") ] },
  portal:{ g:"الجاليات والمساجد", d:"بوابة إنجاز: الحسابات والطلبات والتقارير.", s:[
    G("[data-ptone]", "نسخ الرابط", "رابط البوابة الموحد، أرسله لأي منسق."),
    G(".pv-t", "الملخص", "الحسابات المفعلة، الطلبات المفتوحة، التقارير الجديدة. اضغط أي رقم يفتح قائمته."),
    G("#view .seg", "التبويبات", "<b>طلبات الحسابات</b>: المنسق يطلب حساباً (مع نائبه) ← «موافقة» ← «تأكيد الموافقة»: يُفعَّل الحساب وتُفتح رسالة الواتساب للمنسق تلقائياً. <b>الحسابات</b>: «فتح بوابتهم» لترى ما يراه المنسق.") ] },
  acts:{ g:"الأنشطة والجدولة", d:"كل الأنشطة مع البحث والتصفية والتصدير.", s:[
    G("#view input[data-fk=q]", "البحث", "اكتب مسجداً أو محاضراً أو جالية أو رقم وثيقة. اختصار: «/»."),
    G("#view select[data-fk=type]", "التصفية", "النوع، الجالية، المحافظة، اليوم، الحالة (منها «فيها تعارض»)."),
    G("[data-xf]", "تصدير", "يصدّر النتائج الظاهرة إلى إكسل."), TOP_ADD ] },
  cal:{ g:"الأنشطة والجدولة", d:"تقويم شهري لكل الأنشطة.", s:[ G("[data-cal='0']", "التنقل", "الشهر السابق والتالي و«اليوم»، واضغط أي يوم لرؤية أنشطته.") ] },
  lmap:{ g:"الأنشطة والجدولة", d:"خريطة الدروس على المساجد.", s:[ G("#view select.f", "تصفية الجالية", "اختر جالية لرؤية مواقع دروسها، واضغط أي نقطة لتفاصيل المسجد والأنشطة.") ] },
  weekly:{ g:"الأنشطة والجدولة", d:"جدول أسبوعي جاهز للطباعة والواتساب.", s:[
    G("#view .seg", "الأسبوع", "السابق، هذا الأسبوع، التالي."), G("[data-wktxt]", "نسخ للواتساب", "ينسخ الجدول نصاً منسقاً للصقه في أي محادثة."), G("[data-wkprint]", "طباعة / PDF", "جدول رسمي بترويسة القسم.") ] },
  halls:{ g:"الأنشطة والجدولة", d:"حجز قاعات المسجد الكبير.", s:[ G("[data-bknew]", "حجز جديد", "اختر القاعة واليوم والوقت والجهة، ويُنبّهك النظام إن كانت القاعة محجوزة. ويُسند تجهيزها كمهمة."), G("[data-bkprint]", "طباعة", "جدول الحجوزات للأسبوع.") ] },
  comms:{ g:"الجاليات والمساجد", d:"الجاليات وأنشطتها ومنسقوها.", s:[ { t:"الجاليات", x:"كل جالية في بطاقة: منسقها، أنشطتها، موافقاتها. اضغط الجالية لصفحتها الكاملة." } ] },
  coords:{ g:"الجاليات والمساجد", d:"المنسقون ونوابهم وأرقامهم.", s:[ G("#view input[data-fk=coq]", "البحث", "باسم المنسق أو الجالية أو الهاتف."), G("[data-new=co]", "إضافة منسق", "الاسم والجالية والدور (منسق / نائب) والهاتف والبريد.") ] },
  coordeval:{ g:"الجاليات والمساجد", d:"تقييم المنسقين حسب التزامهم.", s:[ { t:"التقييم", x:"درجة من 100 تُحسب تلقائياً: ترتفع بعدد الأنشطة الجارية، والرد على تذكير التجديد، وتأكيد التصاريح في المسجد، وتنقص بالموافقات التي انتهت دون تجديد والأنشطة بلا موافقة. ومنها تُصدر شهادات الشكر." } ] },
  mosques:{ g:"الجاليات والمساجد", d:"المساجد ومناطقها.", s:[ G("#view input[data-fk=mq]", "البحث", "باسم المسجد أو المنطقة، وصفِّ بالمحافظة."), G("[data-new=mos]", "إضافة مسجد", "الاسم والمنطقة والمحافظة.") ] },
  khatibs:{ g:"خطب الجمعة", d:"خطباء الجاليات ومساجدهم.", s:[ G("#view input[data-fk=kq]", "البحث", "بالاسم أو المسجد أو الهاتف."), G("[data-new=kh]", "إضافة خطيب", "الخطيب والمسجد واللغة والجالية وبياناته للمكافأة.") ] },
  rewards:{ g:"خطب الجمعة", d:"مكافآت خطب الجمعة الشهرية.", s:[
    G("#view .seg", "التبويبات", "<b>تسجيل الخطب</b>، <b>كشف المكافآت</b>، <b>كشوف البنوك المعتمدة</b>."),
    G("[data-srauto]", "تعبئة تلقائية بضغطة", "يعبّئ الخطيب الأساسي لكل الجُمع الفارغة دفعة واحدة، ثم عدّل الاستثناءات فقط."),
    { t:"تنبيه قبل الصرف", x:"من خرج عن موضوع الخطبة أكثر من مرة يظهر عليه تنبيه هنا قبل اعتماد الكشف." } ] },
  sermrec:{ g:"خطب الجمعة", d:"تسجيلات الخطب المترجمة والتزامها بالموضوع.", tour:"serm" },
  odsave:{ g:"التقارير والسجلات", d:"نسخة كاملة من النظام في OneDrive.", s:[ G("[data-odx=save]", "احفظ الآن", "يحفظ نسخة كاملة في OneDrive حسابك بالوزارة. ويحفظ وحده كل يوم عند فتح إنجاز."), GT("آخر حفظ لكل موظف", "آخر حفظ لكل موظف", "تتأكد منه أن الحفظ تم.") ] },
  report:{ g:"التقارير والسجلات", d:"التقرير الشهري للإدارة.", s:[ G("#view select.f", "الشهر", "اختر الشهر."), G("[data-rppdf]", "طباعة / PDF", "تقرير رسمي جاهز للإدارة بالأرقام والرسوم وملخص الخطب.") ] },
  stats:{ g:"التقارير والسجلات", d:"إحصائيات الأنشطة.", s:[ G("[data-report]", "التقرير (Word)", "ملف وورد للتقرير الشهري."), { t:"الرسوم", x:"حسب النوع والحالة والمحافظة ووقت الصلاة وأيام الأسبوع." } ] },
  notes:{ g:"التقارير والسجلات", d:"ملاحظات القسم المشتركة.", s:[ G("[data-new=note]", "ملاحظة جديدة", "ملاحظة يراها الجميع، مع حالة مفتوحة أو مغلقة.") ] },
  mine:{ g:"التقارير والسجلات", d:"ملاحظاتك الخاصة.", s:[ G("[data-mine=new]", "ملاحظة خاصة", "لا يراها غيرك.") ] },
  changes:{ g:"التقارير والسجلات", d:"كل تحديثات إنجاز.", s:[ { t:"سجل التحديثات", x:"كل ميزة جديدة مع شرحها. الجديد يظهر عليه «جديد» حتى تضغطه." } ] },
  users:{ g:"الإدارة", d:"المستخدمون وصلاحياتهم.", s:[ G("[data-new=user]", "إضافة مستخدم", "الاسم واسم الدخول والصلاحية: مدير، محرر، عرض فقط.") ] },
  backups:{ g:"الإدارة", d:"النسخ الاحتياطية.", s:[ G("[data-bknow]", "نسخة الآن", "نسخة احتياطية في قاعدة البيانات (تلقائية كل ليلة 3 الفجر). ولحفظها في OneDrive استخدم «الحفظ في OneDrive».") ] },
  audit:{ g:"الإدارة", d:"سجل كل تعديل: من ومتى وماذا.", s:[ { t:"سجل التعديلات", x:"كل إضافة أو تعديل أو حذف بالاسم والوقت، للرجوع عند الحاجة." } ] } };
for (const [k, v] of Object.entries(GUIDES)) if (v.s) TOURS["g-" + k] = { title:"دليل: " + (TITLES[k] || k), steps:[{ t:TITLES[k] || k, x:v.d + "<br><br>سنمرّ على أجزاء الصفحة واحداً واحداً. اضغط «التالي»." }, ...v.s.map(s => ({ go:k, ...s }))] };
const tourKey = v => GUIDES[v]?.tour || (GUIDES[v] ? "g-" + v : null);

/* engine extensions: find by text, run a preparation step */
const _tourEl62 = tourEl;
tourEl = function(s){ if (s.txt) { const e = [...document.querySelectorAll(s.sel)].find(x => x.offsetParent && x.textContent.includes(s.txt)); return e ? (s.up && e.closest(s.up)) || e : null; } return _tourEl62(s); };
function tourStartAt(k, i){ if (!TOURS[k]) return; TR.k = k; TR.i = i || 0; closeDrawer?.(); tourShow(); };

/* «دليل الصفحة» in the top bar of every page */
function guideBtn(){ const top = $("header.top"); if (!top || $("#guide-btn")) return; top.querySelector("#finder")?.insertAdjacentHTML("afterend", `<button type="button" class="btn btn-ghost" id="guide-btn" title="شرح هذه الصفحة خطوة بخطوة على الشاشة"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 21V5M9 7h6"/></svg><span>دليل الصفحة</span></button>`); }
/* small «؟» marks next to every part a guide explains */
function guidePins(v){ document.querySelectorAll(".g-pin").forEach(p => p.remove()); const k = tourKey(v); if (!k || TR.k) return;
  TOURS[k].steps.forEach((s, i) => { if (!s.sel || s.sel.startsWith("#nav") || s.sel === "#add-act" || s.sel === "#finder" || s.sel === "#bell" || s.sel === "#ocr-top") return; if (s.go && s.go !== v) return;
    const e = tourEl(s); if (!e || e.querySelector(":scope > .g-pin")) return; const host = e.matches("input,select,button,textarea") ? e.parentElement : e; if (!host || host.querySelector(":scope > .g-pin")) return;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    host.insertAdjacentHTML("beforeend", `<button type="button" class="g-pin" data-gpin="${k}:${i}" title="${esc(s.t)}: كيف يُستخدم؟">؟</button>`); }); }
document.addEventListener("click", ev => { const p = ev.target.closest("[data-gpin]"); if (p) { ev.preventDefault(); ev.stopPropagation(); const [k, i] = p.dataset.gpin.split(":"); return tourStartAt(k, +i); }
  if (ev.target.closest("#guide-btn")) { const k = tourKey(S.view); if (k) tourStartAt(k, 0); else go("guide"); }
  const gs = ev.target.closest("[data-gstart]"); if (gs) { const v = gs.dataset.gstart, k = tourKey(v); if (k) tourStartAt(k, 0); } }, true);
const _afterRender62 = afterRender; afterRender = function(v){ _afterRender62(v); guideBtn(); setTimeout(() => guidePins(S.view), 60); };
const _tourEnd62 = tourEnd; tourEnd = function(d){ _tourEnd62(d); setTimeout(() => guidePins(S.view), 80); };

/* guide center: every page, what it is for and how to do the work, with a «show me on the screen» button */
function vGuide(){ const groups = [...new Set(Object.values(GUIDES).map(x => x.g))], q = nkey(S.f.gq || "");
  const steps = k => { const T = TOURS[tourKey(k)]; return T ? T.steps.slice(GUIDES[k].tour ? 0 : 1) : []; };
  return `<div class="gd-h panel"><div class="panel-b"><b>دليل استخدام إنجاز</b><span>لكل صفحة: ما فائدتها، وكيف تُنجز العمل فيها خطوة بخطوة. زر <b>«اشرح لي على الشاشة»</b> يفتح الصفحة ويقف عند كل جزء بأسهم ويشرحه. وفي أعلى كل صفحة زر <b>«📘 دليل الصفحة»</b>، وبجانب كل جزء علامة <b>«؟»</b> تشرحه وحده.</span>
    <div class="search" style="margin-top:10px"><svg><use href="#i-search"/></svg><input class="f" data-fk="gq" placeholder="ابحث: تصريح، موافقة، مكافأة، تذكير…" value="${esc(S.f.gq || "")}"></div></div></div>
    ${groups.map(g => { const ks = Object.keys(GUIDES).filter(k => GUIDES[k].g === g && $(`#nav [data-nav="${k}"]`) && (!q || nkey(TITLES[k] + " " + GUIDES[k].d + " " + steps(k).map(s => s.t + " " + s.x).join(" ")).includes(q))); if (!ks.length) return "";
      return `<div class="gd-g"><h3>${esc(g)}</h3>${ks.map(k => `<details class="gd-i panel"${q ? " open" : ""}><summary><b>${esc(TITLES[k] || k)}</b><span>${esc(GUIDES[k].d)}</span></summary>
        <ol>${steps(k).map(s => `<li><b>${esc(s.t)}</b><span>${s.x}</span></li>`).join("")}</ol>
        <div class="gd-a"><button type="button" class="btn btn-primary" data-gstart="${k}">▶ اشرح لي على الشاشة</button><button type="button" class="btn btn-ghost" data-go="${k}">فتح الصفحة</button></div></details>`).join("")}</div>`; }).join("")}`; }

/* fewer clicks: approve + register activities + notify the coordinator on WhatsApp, one press */
const _wqApprove62 = wqApprove;
wqApprove = function(id){ _wqApprove62(id); $(".drawer-f [data-apgo]")?.insertAdjacentHTML("beforebegin", `<button class="btn btn-ok" type="button" data-apgowa>اعتماد وإبلاغ المنسق</button>`); };
document.addEventListener("click", async ev => { const t = ev.target.closest("[data-apgowa]"); if (!t) return; ev.stopPropagation();
  const F = S.form, w = S.wq.find(x => x.id === F?.id), comm = $("#ap-comm")?.value; if (!w || !comm) return toast("اختر الجالية");
  t.disabled = true; t.textContent = "جارٍ الاعتماد…"; await wqApproveGo(); if (!docBy[w.no]) { t.disabled = false; t.textContent = "اعتماد وإبلاغ المنسق"; return; }
  const c = S.coords.find(k => k.comm === comm && k.phone && (k.role || "منسق") === "منسق") || S.coords.find(k => k.comm === comm && k.phone); if (!c) return toast("سُجّلت الموافقة، ولا يوجد رقم للمنسق");
  waGo(c.phone, wqMsg(w, "موافقة", c), null, c.name);
  const { data } = await sb.from("wq_notify").insert({ wq_id:w.id, outcome:"موافقة", coord:c.name, phone:waNum(c.phone), comm }).select().single(); if (data) S.wqn?.set(w.id, data); }, true);

NEWF.splice(1, 0, ["v62-guide", "nav:guide", "الدليل: شرح كل صفحة على الشاشة", "زر «📘 دليل الصفحة» أعلى كل صفحة يشرحها خطوة بخطوة بأسهم على الشاشة، وعلامة «؟» بجانب كل جزء، وصفحة «الدليل» فيها كل الشروحات. واعتماد موافقة وثيقة وإبلاغ المنسق صار بضغطة واحدة.", false, "2026-10-21"]);
