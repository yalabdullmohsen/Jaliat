/* ================= v180: بلا «جسر إنجاز» — واتساب يفتح في تطبيق واتساب مباشرة (طلب يوسف 28/11/2026)
   - أُلغيت كل بطاقات وأزرار تركيب الجسر وتنزيله وتحديثه في كل الصفحات.
   - كل زر واتساب في النظام يفتح تطبيق واتساب مباشرة (whatsapp://) والرسالة جاهزة؛ على الجوال wa.me يفتح التطبيق نفسه.
   - الإرسال المتتابع (next) يبقى بشريط «التالي» الصغير كما في v99.
   ملفات الجسر في المستودع باقية كما هي (لم يُطلب حذفها). ================= */
function waApp(n, text){ const t = text ? encodeURIComponent(text) : "";
  if (isTouchDev()) return window.open(`https://wa.me/${n}${t ? "?text=" + t : ""}`, "_blank", "noopener");
  const a = document.createElement("a"); a.href = `whatsapp://send?phone=${n}${t ? "&text=" + t : ""}`; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove(); }
waInside = function(phone, text, next, name){ const n = waNum(phone); if (n.length < 10) return toast("لا يوجد رقم هاتف صحيح");
  waApp(n, text);
  $("#wa-next")?.remove(); if (typeof next !== "function") return;
  document.body.insertAdjacentHTML("beforeend", `<div id="wa-next" class="wa-next" role="status"><span>فُتح واتساب${name ? ` إلى ${esc(name)}` : ""}. بعد الإرسال:</span><button type="button" class="btn btn-primary" data-wanext>التالي</button><button type="button" class="btn btn-ghost" data-wastop>إنهاء</button></div>`);
  window.__waNext = next; };
waOpen = (phone, text) => waInside(phone, text);
waGo = (phone, text, next, name) => waInside(phone, text, next, name);

/* أي رابط واتساب مكتوب داخل الصفحات (wa.me أو واتساب ويب) يفتح التطبيق مباشرة */
document.addEventListener("click", ev => { const a = ev.target.closest('a[href*="wa.me/"],a[href*="web.whatsapp.com"],a[href*="api.whatsapp.com"]'); if (!a) return;
  try { const u = new URL(a.href); const n = (u.pathname.match(/\d{8,}/) || [])[0] || u.searchParams.get("phone") || ""; if (!n) return;
    ev.preventDefault(); ev.stopPropagation(); waApp(n, u.searchParams.get("text") || ""); } catch (_) {} }, true);

/* بطاقة «ركّب الجسر» في الرئيسية: أُلغيت */
bridgeCard = () => "";

/* صفحة «واتساب القسم»: فتح التطبيق مباشرة، أو مراسلة رقم */
const _vWhatsApp180 = vWhatsApp;
vWhatsApp = function(){ if (S.waCfg?.on) return _vWhatsApp180();
  return `<div class="panel wa180"><div class="panel-b"><span class="wa180-i">${ei("wa")}</span><div><b>واتساب القسم</b><span class="s">يفتح في تطبيق واتساب مباشرة.</span></div>
    <button type="button" class="btn btn-primary" data-wa180open>${ei("wa")}فتح تطبيق واتساب</button></div>
    <form class="wa180-f" data-wa180><input class="f" name="p" inputmode="tel" dir="ltr" placeholder="رقم الهاتف" autocomplete="off"><input class="f" name="t" placeholder="الرسالة (اختياري)"><button class="btn" type="submit">مراسلة</button></form></div>`; };
document.addEventListener("click", ev => { if (ev.target.closest("[data-wa180open]")) { ev.preventDefault(); location.href = isTouchDev() ? "https://wa.me/" : "whatsapp://"; } });
document.addEventListener("submit", ev => { const f = ev.target.closest("[data-wa180]"); if (!f) return; ev.preventDefault(); waOpen(f.p.value, f.t.value); });

/* إزالة كل تعليمات تركيب الجسر وتنزيله وتحديثه من أي صفحة */
const BR180 = /(ركب|ثبت|نزل|حدث|تنزيل|تثبيت|تحديث|غير مثبتة|لم تثبت)[^.]{0,40}(الجسر|جسر)|(الجسر|جسر)[^.]{0,40}(غير مثبت|مثبت على هذا الجهاز|متاح|2\.\d)/, br180T = e => (e.textContent || "").replace(/[\u064B-\u0652]/g, "");
function br180Clean(root){
  root.querySelectorAll('a[href*="jaliyat-copilot.zip"]').forEach(a => { const box = a.closest("details,.check,.cp-steps,ol,ul,li") || a; const prev = box.previousElementSibling;
    if (prev && /^H[1-6]$/.test(prev.tagName) && /جسر/.test(prev.textContent)) prev.remove(); box.remove(); });
  root.querySelectorAll(".check,.wa-need,.bad-t,.hint,span.s,p,li,h3,small").forEach(e => { if (e.isConnected && BR180.test(br180T(e))) (e.closest(".check,.wa-need") || e).remove(); });
  root.querySelectorAll("button,a.btn").forEach(b => { if (b.isConnected && /جسر|الجسر/.test(b.textContent || "")) b.remove(); }); }
const _afterRender180 = afterRender;
afterRender = function(v){ _afterRender180(v); try { br180Clean($("#view")); } catch (_) {} };
