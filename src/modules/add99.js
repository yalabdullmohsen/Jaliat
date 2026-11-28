/* ================= v99 (JL-8 ج، د): واتساب مباشر بلا جسر، وزر 💡 للأفكار ================= */

/* ج) كل زر واتساب في النظام يفتح واتساب مباشرة برابط wa.me والرسالة جاهزة (لا الجسر ولا الإطار).
   الإرسال المتتابع (next) يظهر شريطًا صغيرًا بزر «التالي» لأن المتصفح يمنع فتح عدة نوافذ دون ضغطة. */
waInside = function(phone, text, next, name){ const n = waNum(phone); if (n.length < 10) return toast("لا يوجد رقم هاتف صحيح");
  window.open(`https://wa.me/${n}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  $("#wa-next")?.remove(); if (typeof next !== "function") return;
  document.body.insertAdjacentHTML("beforeend", `<div id="wa-next" class="wa-next" role="status"><span>فُتح واتساب${name ? ` إلى ${esc(name)}` : ""}. بعد الإرسال:</span><button type="button" class="btn btn-primary" data-wanext>التالي</button><button type="button" class="btn btn-ghost" data-wastop>إنهاء</button></div>`);
  window.__waNext = next; };
waOpen = (phone, text) => waInside(phone, text);
waGo = (phone, text, next, name) => waInside(phone, text, next, name);
document.addEventListener("click", ev => { const t = ev.target.closest("[data-wanext],[data-wastop]"); if (!t) return; const f = window.__waNext; window.__waNext = null; $("#wa-next")?.remove(); if (t.dataset.wanext !== undefined && typeof f === "function") f(); });

/* د) «لديك فكرة لتحسين إنجاز؟» بأيقونة 💡 في الترويسة وأعلى الدليل، بدل صفحة «طلبات الميزات» (النموذج نفسه dpFreqForm) */
const IDEA_BTN = cls => `<button type="button" class="btn ${cls} idea-b" data-dpfreq title="أضف مقترحًا لتحسين إنجاز"><span aria-hidden="true">${ei("bulb")}</span><span class="idea-t">أضف مقترحًا</span></button>`;
const _afterRender99 = afterRender;
afterRender = function(v){ _afterRender99(v); const top = document.querySelector("header.top"); if (top && !top.querySelector(".idea-b")) { const at = top.querySelector("#add-act"); at ? at.insertAdjacentHTML("beforebegin", IDEA_BTN("btn-ghost")) : top.insertAdjacentHTML("beforeend", IDEA_BTN("btn-ghost")); } };
const _vGuide99 = vGuide;
vGuide = function(){ const n = (typeof DP !== "undefined" && DP.freq?.length) || 0;
  return `<div class="panel idea-p"><div class="panel-b"><span class="idea-i" aria-hidden="true">${ei("bulb")}</span><div><b>أضف مقترحًا لتحسين إنجاز</b><span>اكتبه، ويصل إلى مدير النظام ليدرسه.</span></div>${IDEA_BTN("btn-primary")}${S.admin ? `<button type="button" class="btn btn-ghost" data-go="freq">الأفكار المقترحة${n ? ` (${n})` : ""}</button>` : ""}</div></div>` + _vGuide99(); };
