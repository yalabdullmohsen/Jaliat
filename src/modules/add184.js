/* ================= v184: إجراءات كثيرة بزر واحد (طلب يوسف 28/11/2026: «حط إجراءات عديدة في زر واحد حتى يسهل»)
   1) «أرسل للمنسق» في «تصاريح جاهزة للإرسال»: يجهّز ملفات PDF كلها، وعلى الكمبيوتر ينزّلها ويفتح محادثة المنسق في تطبيق واتساب
      مباشرة لترفقها (بدل: إرسال الكل ← إرسال الكل PDF ← فتح واتساب ← البحث عن الرقم). علامة «تم الإبلاغ» تبقى بيد الموظف.
   2) زر واتساب المنسق ينسخ رقمه ويفتح محادثته معاً (بدل زرّين «نسخ الرقم» و«محادثة»).
   3) زر التحديث في الشريط العلوي يحدّث الصفحة ويطلب مزامنة وثيقة معاً. ================= */

/* 1 */
const _prCard184 = prCard;
prCard = function(g){ return _prCard184(g).replace(/(data-prsend="[^"]*">[\s\S]*?)إرسال الكل PDF \((\d+)\)/, "$1أرسل للمنسق ($2)"); };
const _prSend184 = prSend;
prSend = async function(b){ await _prSend184(b); if (isTouchDev()) return;
  const g = prGroups().find(x => x.b === b), btn = document.querySelector("[data-pball]"); if (!btn) return;
  btn.click(); const n = g?.ps?.length || 1;
  if (g?.c?.phone) setTimeout(() => waOpen(g.c.phone, ""), Math.min(n * 1200 + 600, 9000)); };

/* 2 */
document.addEventListener("click", ev => { const a = ev.target.closest('.cph a[href^="whatsapp:"],.prs-cb a[href^="whatsapp:"],.prs-co a[href^="whatsapp:"]'); if (!a) return;
  const n = (a.getAttribute("href").match(/phone=(\d+)/) || [])[1]; if (n && typeof cpCopy === "function") cpCopy(n.replace(/^965(?=\d{8}$)/, "")).catch?.(() => {}); }, true);

/* 3 */
document.addEventListener("click", ev => { if (!ev.target.closest("#refresh-btn")) return;
  try { if (S.canWrite) sb.rpc("wq_sync_now").then(r => { if (r?.data) S.wqReq = r.data; }, () => {}); } catch (_) {} }, true);
