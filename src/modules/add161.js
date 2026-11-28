/* JL-SYNC (طلب يوسف 2026-11-28): «مزامنة الآن» في بطاقة وثيقة وصفحتها.
   يسجّل طلبًا في watheqa_sync_requests (wq_sync_now) فيلتقطه مزامن جهاز الدوام (wq_sync_poll)، والمحفّز يغلقه حين تصل المزامنة.
   الحالة: «جارٍ…» ثم «✓ تمت المزامنة» أو السبب (جلسة منتهية، جهاز غير متصل خلال المهلة، لم تكتمل). المزامنة الدورية كما هي. */
const WQNOW = {
  CLAIM_S: 120,   // جهاز الدوام يلتقط الطلب خلال دقيقتين وإلا فهو غير متصل
  RUN_S: 600,     // والمزامنة تكتمل خلال 10 دقائق من التقاطها
  POLL_MS: 4000,
  /* حالة الطلب للواجهة (دالة صرفة تُختبر): idle | pending | running | done | failed */
  state(req, sync, now){
    if (!req) return { phase:"idle", text:"" };
    const t = s => s ? new Date(s).getTime() : NaN, at = t(req.requested_at), last = t(sync && sync.last);
    if (req.status === "done" || (last >= at)) return { phase:"done", text:"✓ تمت المزامنة الآن" };
    if (req.status === "failed") return { phase:"failed", text:`✗ ${req.error || "تعذّرت المزامنة"}` };
    if (sync && sync.state === "login") return { phase:"failed", text:"✗ جلسة وثيقة منتهية على جهاز الدوام: سجّل الدخول في وثيقة" };
    if (req.status === "pending")
      return (now - at) / 1e3 > WQNOW.CLAIM_S
        ? { phase:"failed", text:"✗ جهاز الدوام غير متصل: لم يلتقط الطلب خلال دقيقتين. افتح المتصفح على جهاز الدوام وتأكد أن مهمة المزامنة تعمل" }
        : { phase:"pending", text:"جارٍ… بانتظار جهاز الدوام" };
    if (req.status === "running")
      return (now - (t(req.claimed_at) || at)) / 1e3 > WQNOW.RUN_S
        ? { phase:"failed", text:"✗ بدأت المزامنة على جهاز الدوام ولم تكتمل خلال 10 دقائق" }
        : { phase:"running", text:"جارٍ… جهاز الدوام يزامن الآن" };
    return { phase:"idle", text:"" };
  }
};
if (typeof module !== "undefined") module.exports = WQNOW;

if (typeof window !== "undefined") {
  S.wqReq = null;
  const busy = () => ["pending", "running"].includes(WQNOW.state(S.wqReq, S.wqSync, Date.now()).phase);
  const nowBtn = () => `<button type="button" class="btn" data-wqnow ${busy() ? "disabled" : ""}>${busy() ? "جارٍ…" : "مزامنة الآن"}</button>`;
  const nowLine = () => { const st = WQNOW.state(S.wqReq, S.wqSync, Date.now());
    return st.text ? `<span class="s wqnow ${st.phase === "failed" ? "bad-t" : ""}" role="status">${esc(st.text)}</span>` : ""; };

  const _wqSyncCard161 = wqSyncCard;
  wqSyncCard = function(){ const h = _wqSyncCard161(); if (!h) return h;
    return h.replace(`<div class="br-acts">`, `<div class="br-acts">${nowBtn()}`).replace(/(<\/div>\s*<div class="br-acts">)/, `${nowLine()}$1`); };

  const _vWatheqa161 = vWatheqa;
  vWatheqa = function(){ const h = _vWatheqa161(); if (!S.canWrite) return h;
    return `<div class="panel wqsy-card"><div class="panel-b"><div><b>مزامنة وثيقة</b> ${nowLine()}</div><div class="br-acts">${nowBtn()}</div></div></div>` + h; };

  let timer = null;
  async function wqNowTick(){
    try {
      const { data } = await sb.from("watheqa_sync_requests").select("*").eq("id", S.wqReq.id).maybeSingle();
      if (data) S.wqReq = data;
      await woSyncLoad();
    } catch (_) {}
    if (!busy()) { clearInterval(timer); timer = null; }
    render();
  }
  document.addEventListener("click", async ev => { const b = ev.target.closest("[data-wqnow]"); if (!b) return; ev.preventDefault();
    if (busy()) return;
    b.disabled = true;
    const { data, error } = await sb.rpc("wq_sync_now");
    if (error || !data) {
      // PGRST202: الدالة غير موجودة بعد (ترحيل 2026-11-28_wq_sync_now.sql ينتظر تطبيقه)
      toast(error?.code === "42501" ? "لا تملك صلاحية طلب المزامنة" : error?.code === "PGRST202" ? "«مزامنة الآن» تنتظر تفعيلها في قاعدة البيانات" : "تعذّر تسجيل طلب المزامنة، حاول مرة أخرى");
      b.disabled = false; return; }
    S.wqReq = data; render();
    clearInterval(timer); timer = setInterval(wqNowTick, WQNOW.POLL_MS);
  });
}
