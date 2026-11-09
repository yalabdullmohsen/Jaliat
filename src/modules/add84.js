/* ================= v84: تسجيل أخطاء المتصفح في client_errors ================= */
/* كل خطأ غير مُعالَج عند موظف مسجّل يُحفظ (الرسالة والصفحة والمتصفح والإصدار) ليُصلَح من جذره. حد 20 خطأ لكل جلسة وبلا تكرار. */
const CE = { n:0, seen:new Set() };
function ceLog(msg, stack){
  msg = String(msg || "").slice(0, 1000); if (!msg || !S.me || CE.n >= 20) return;
  const k = msg + "|" + (S.view || ""); if (CE.seen.has(k)) return; CE.seen.add(k); CE.n++;
  sb.from("client_errors").insert({ page:S.view || "", msg, stack:String(stack || "").slice(0, 4000), ua:navigator.userAgent.slice(0, 300), ver:typeof CHANGELOG !== "undefined" ? String(CHANGELOG[0]?.[0] || "") : "" }).then(() => {}, () => {});
}
window.addEventListener("error", e => { if (e.message) ceLog(e.message, e.error?.stack || `${e.filename}:${e.lineno}:${e.colno}`); });
window.addEventListener("unhandledrejection", e => { const r = e.reason; ceLog(r?.message || r, r?.stack); });
