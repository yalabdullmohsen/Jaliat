/* ===== v61: guided tours: the system stops on each part of the real screen and explains it (first tour: Friday sermon recordings) ===== */
const TOURS = { serm:{ title:"جولة: تسجيل خطب الجمعة ومتابعتها", steps:[
  { t:"تسجيل خطب الجمعة", x:"الهدف: كل خطبة جمعة للجاليات تصلنا بصوت الخطيب نفسه، مترجمة للعربية تلقائياً، ومقارنة بموضوع الخطبة الرسمي، حتى نتابع الخطباء ونتأكد من التزامهم.<br><br>سنمرّ معاً على الشاشات خطوة خطوة. اضغط «التالي»." },
  { go:"sermrec", sel:'#nav [data-nav="sermrec"]', t:"صفحة «تسجيلات الخطب»", x:"من القائمة الجانبية ← قسم «خطب الجمعة» ← <b>تسجيلات الخطب</b>. هنا تصل كل التسجيلات، ومنها نكتب موضوع الجمعة ونراجع الخطباء." },
  { go:"sermrec", sel:'#nav [data-nav="portal"]', t:"من أين يأتي التسجيل؟ بوابة إنجاز", x:"المنسق (أو الخطيب) يدخل <b>بوابة إنجاز</b> من جواله ← تبويب <b>«المراسلات»</b> ← <b>«خطبة الجمعة»</b> (أو «تسجيل خطبة» من الرئيسية) ← يضغط <b>زر الميكروفون</b> عند بداية الخطبة، ثم <b>«إيقاف التسجيل»</b> بعدها، ثم <b>«إرسال الخطبة للقسم»</b>.<br><br>• تسجيل مباشر فقط: لا يستطيع رفع ملف جاهز ولا كتابة نص ولا التعديل.<br>• الحد الأقصى ساعة، والشاشة تبقى شغالة بإضاءة منخفضة حتى لا يطفئ الجوال، وبجودة صوت خفيفة توفر البطارية والإنترنت.<br>• يصلنا التسجيل هنا فوراً باسم الخطيب والمسجد والجالية." },
  { go:"sermrec", tab:"rec", sel:"[data-srtab]", up:".seg", t:"ثلاثة تبويبات", x:"<b>التسجيلات</b>: كل خطبة وصلت.<br><b>سجل الخطباء</b>: التزام كل خطيب عبر الأسابيع.<br><b>طلبات تسجيل الدروس</b>: نطلب من منسق تسجيل درس معيّن ليصلنا مترجماً أيضاً." },
  { go:"sermrec", tab:"rec", sel:"[data-srf]", up:".seg", t:"الفرز السريع", x:"<b>لم يُطّلع عليها</b>: التسجيلات الجديدة التي تحتاج مراجعة، ابدأ منها دائماً.<br><b>خرج عن الموضوع</b>: الخطب التي لم تلتزم بالموضوع الرسمي.<br><b>فيها ملاحظات</b>: خطب نبّه الذكاء الاصطناعي على شيء فيها يستحق المراجعة." },
  { go:"sermrec", tab:"rec", sel:".sr-i", t:"بطاقة الخطبة", x:"لكل خطبة بطاقة فيها اسم الخطيب والجالية والمسجد والتاريخ والمدة.<br><br><b>الترجمة تلقائية ومجانية</b>: بعد وصول التسجيل بدقائق يحوّله النظام إلى نص بلغة الخطيب، ثم يترجمه للعربية، جزءاً كل 10 دقائق. الحالة تظهر هنا: «جارٍ الترجمة» ثم «تمت الترجمة».<br>زر <b>استماع</b> لسماع الصوت الأصلي.", none:"لا توجد تسجيلات بعد، وستظهر هنا البطاقة لكل خطبة تصل." },
  { go:"sermrec", tab:"rec", sel:".sr-adh", t:"الالتزام بالموضوع", x:"يقارن الذكاء الاصطناعي الخطبة بالموضوع الرسمي ويعطي النتيجة: <b>ملتزم</b> (أخضر) أو <b>خرج جزئياً</b> (أصفر) أو <b>خارج الموضوع</b> (أحمر)، مع نسبة الالتزام وسبب مختصر.", none:"تظهر هنا نتيجة الالتزام لكل خطبة: ملتزم، أو خرج جزئياً، أو خارج الموضوع، مع النسبة والسبب." },
  { go:"sermrec", tab:"rec", sel:".sr-d", t:"الترجمة والنص الأصلي", x:"افتح <b>الترجمة العربية الكاملة</b> لقراءة الخطبة كلها، أو <b>النص الأصلي</b> بلغة الخطيب. وزر <b>نسخ الترجمة</b> لنسخها ولصقها في تقرير أو كتاب.", none:"في كل بطاقة: الترجمة العربية الكاملة، والنص الأصلي، وزر نسخ الترجمة." },
  { go:"sermrec", tab:"rec", sel:".sr-f", t:"المراجعة: «اطّلعت» والملاحظة", x:"بعد القراءة اكتب <b>ملاحظة القسم</b> إن وجدت، واضغط <b>«اطّلعت»</b>.<br><br>• تختفي الخطبة من «لم يُطّلع عليها».<br>• الملاحظة تصل للمنسق في البوابة مع تنبيه على جواله.", none:"أسفل كل بطاقة: خانة «ملاحظة القسم» وزر «اطّلعت». الملاحظة تصل للمنسق في البوابة مع تنبيه." },
  { go:"sermrec", tab:"kh", sel:".seg", t:"سجل الخطباء", x:"لكل خطيب: عدد خطبه، ونسبة التزامه، وكم مرة خرج عن الموضوع.<br><br>من خرج عن الموضوع أكثر من مرة يظهر عليه <b>تنبيه في صفحة المكافآت قبل الصرف</b>." },
  { go:"sermrec", tab:"les", sel:".seg", t:"طلبات تسجيل الدروس", x:"إذا أردنا متابعة درس معيّن: اختر الجالية والنشاط واضغط إرسال. يصل الطلب للمنسق في البوابة، فيسجّل الدرس بنفس الطريقة، ويصلنا مترجماً هنا." },
  { t:"الإجراء الأسبوعي المعتمد", x:"<b>الأربعاء</b>: الموظف المختص يكتب موضوع الجمعة القادمة ويحفظه.<br><b>الخميس 9 الصبح</b>: يصل الموضوع للمنسقين مترجماً تلقائياً.<br><b>الجمعة</b>: الخطيب يسجّل الخطبة مباشرة من البوابة.<br><b>السبت والأحد</b>: الموظف يفتح «لم يُطّلع عليها»، يقرأ الترجمة ونتيجة الالتزام، يكتب الملاحظة ويضغط «اطّلعت».<br><b>نهاية الشهر</b>: ملخص الخطب يظهر في «التقرير الشهري»، وتنبيهات الخطباء المخالفين تظهر قبل صرف المكافآت.<br><br>المطلوب منكم: تحديد الموظف المسؤول عن الموضوع الأسبوعي، والموظف المسؤول عن مراجعة التسجيلات." } ] } };
const TR = { k:null, i:0 };
function tourStart(k){ if (!TOURS[k]) return; TR.k = k; TR.i = 0; closeDrawer?.(); $("#side")?.classList.remove("open"); tourShow(); }
function tourEnd(done){ $("#tr-ov")?.remove(); $("#tr-card")?.remove(); window.removeEventListener("resize", tourPlace);
  if (done && TR.k) { try { localStorage.setItem("tour-" + TR.k, "1"); } catch (_) {} if (S.me?.username !== "yousef") sb.from("notifications").insert({ user_id:"d9633e3f-90f6-4b31-8ea9-3cece14e2583", kind:"note_new", title:`${S.me?.name || "موظف"} أنهى ${TOURS[TR.k].title}`, body:"أكمل الجولة التعليمية كاملة.", link:"#sermrec" }).then(() => {}, () => {}); }
  TR.k = null; }
function tourEl(s){ if (!s.sel) return null; let e = [...document.querySelectorAll(s.sel)].find(x => x.offsetParent); if (e && s.up) e = e.closest(s.up) || e; return e || null; }
async function tourShow(){ const T = TOURS[TR.k], s = T.steps[TR.i]; if (!s) return tourEnd(true);
  if (s.go && S.view !== s.go) { go(s.go); await new Promise(r => setTimeout(r, 350)); }
  if (s.tab && S.f.srtab !== s.tab) { S.f.srtab = s.tab; render(); await new Promise(r => setTimeout(r, 250)); }
  if (s.sel?.startsWith("#nav")) { if (innerWidth < 900) $("#side")?.classList.add("open"); } else $("#side")?.classList.remove("open");
  const el = tourEl(s); if (el) { if (innerWidth < 700 && !s.sel.startsWith("#nav")) { const y = el.getBoundingClientRect().top + scrollY - 76; window.scrollTo({ top:y, behavior:"smooth" }); $("#view")?.scrollTo?.({ top:0 }); el.scrollIntoView({ block:"start", behavior:"smooth" }); } else el.scrollIntoView({ block:"center", behavior:"smooth" }); await new Promise(r => setTimeout(r, 380)); }
  if (!$("#tr-ov")) { document.body.insertAdjacentHTML("beforeend", `<div id="tr-ov"></div><div id="tr-card" role="dialog" aria-live="polite"></div>`); window.addEventListener("resize", tourPlace); }
  const n = T.steps.length, txt = el || !s.none ? s.x : s.none;
  $("#tr-card").innerHTML = `<div class="tr-k">${esc(T.title)} · <span class="num">${TR.i + 1} / ${n}</span></div><b>${esc(s.t)}</b><p>${txt}</p>
    <div class="tr-dots">${T.steps.map((_, j) => `<i class="${j === TR.i ? "on" : j < TR.i ? "ok" : ""}"></i>`).join("")}</div>
    <div class="tr-a">${TR.i ? `<button type="button" class="btn btn-ghost" data-tr="prev">السابق</button>` : `<span></span>`}<button type="button" class="btn btn-ghost" data-tr="end">إنهاء</button><button type="button" class="btn btn-primary" data-tr="next">${TR.i === n - 1 ? "تم، فهمت ✓" : "التالي"}</button></div>`;
  TR.el = el; tourPlace(); }
function tourPlace(){ const ov = $("#tr-ov"), c = $("#tr-card"); if (!ov || !c) return; const el = TR.el && document.contains(TR.el) ? TR.el : null;
  if (!el) { ov.className = "full"; ov.style.cssText = ""; c.className = "mid"; c.style.cssText = ""; return; }
  const r = el.getBoundingClientRect(), p = 6, mob = innerWidth < 700, hh = Math.min(r.height, innerHeight * (mob ? .38 : .6)); ov.className = "hole"; Object.assign(ov.style, { top:r.top - p + "px", left:r.left - p + "px", width:r.width + p * 2 + "px", height:hh + p * 2 + "px" });
  if (mob) { c.className = "sheet"; c.style.cssText = ""; return; }
  c.className = ""; const below = r.bottom + 16 + c.offsetHeight < innerHeight || r.top < innerHeight / 2, w = Math.min(380, innerWidth - 24);
  c.style.width = w + "px"; c.style.top = (below ? Math.min(r.top + Math.min(r.height, innerHeight * .6) + 16, innerHeight - c.offsetHeight - 12) : Math.max(12, r.top - c.offsetHeight - 16)) + "px";
  c.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2)) + "px"; }
document.addEventListener("click", ev => { const t = ev.target.closest("[data-tr]"); if (t) { ev.preventDefault(); const k = t.dataset.tr;
    if (k === "end") return tourEnd(false); if (k === "prev") { TR.i = Math.max(0, TR.i - 1); return tourShow(); } TR.i++; return tourShow(); }
  const s = ev.target.closest("[data-tour]"); if (s) { ev.preventDefault(); tourStart(s.dataset.tour); } }, true);
document.addEventListener("keydown", ev => { if (!TR.k) return; if (ev.key === "Escape") tourEnd(false); if (ev.key === "ArrowLeft") { TR.i++; tourShow(); } if (ev.key === "ArrowRight" && TR.i) { TR.i--; tourShow(); } });
const _openLink61 = openLink; openLink = function(h){ const s = String(h || "").replace(/^#/, ""); if (s.startsWith("tour:")) return tourStart(s.slice(5)); return _openLink61(h); };
/* a start button on the sermons page */
const _vSermRec61 = vSermRec; vSermRec = function(){ return `<div class="tr-start"><span>جديد في الصفحة؟ جولة تشرح كل جزء على الشاشة نفسها.</span><button type="button" class="btn" data-tour="serm">▶ ابدأ الجولة التعليمية</button></div>` + _vSermRec61(); };
/* opened from a link like …/#tour:serm */
const _boot961 = boot9; boot9 = function(){ _boot961(); const m = location.hash.match(/^#tour:(\w+)/); if (m) setTimeout(() => tourStart(m[1]), 1500); };
NEWF.splice(1, 0, ["v61-tour", "nav:sermrec", "جولة تعليمية: تسجيل خطب الجمعة", "زر «ابدأ الجولة التعليمية» في صفحة تسجيلات الخطب يقف عند كل جزء من الشاشة ويشرحه، مع الإجراء الأسبوعي المعتمد.", false, "2026-10-21"]);
