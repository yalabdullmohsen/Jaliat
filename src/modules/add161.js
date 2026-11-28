/* JL-SYNC / JL-SYNC-2 (طلب يوسف 2026-11-28): «مزامنة الآن» في بطاقة وثيقة وصفحتها، من أي جهاز.
   يسجّل طلبًا (wq_sync_now). إن كان جسر إنجاز 2.6 على هذا الجهاز: يلتقط الطلب بنفسه (wq_sync_claim_me)، ويقرأ وثيقة
   بجلسة الموظف فيها، ويرسل الكتب إلى watheqa-ingest بجلسة المستخدم في «إنجاز»؛ وإلا بقي الطلب لأي جهاز متصل بوثيقة (wq_sync_poll).
   المحفّز يغلق الطلب «تم» حين تصل المزامنة. المزامنة الدورية متوقفة مؤقتًا بعلَم settings.wq_sync_auto. */
const WQNOW = {
  CLAIM_S: 120,   // لا جسر على هذا الجهاز: ينتظر دقيقتين أن يلتقطه جهاز آخر متصل بوثيقة
  RUN_S: 600,     // والمزامنة تكتمل خلال 10 دقائق من التقاطها
  POLL_MS: 4000,
  BRIDGE_V: 2.6,
  LOGIN: "جلسة وثيقة منتهية على هذا الجهاز: افتح وثيقة وسجّل الدخول ثم أعد «مزامنة الآن»",
  /* حالة الطلب للواجهة (دالة صرفة تُختبر): idle | pending | running | done | failed. step: خطوة الجسر الجارية إن وُجدت */
  state(req, sync, now, step){
    if (!req) return { phase:"idle", text:"" };
    const t = s => s ? new Date(s).getTime() : NaN, at = t(req.requested_at), last = t(sync && sync.last);
    if (req.status === "done" || (last >= at)) return { phase:"done", text:"✓ تمت المزامنة الآن" };
    if (req.status === "failed") return { phase:"failed", text:`✗ ${req.error === "login" ? WQNOW.LOGIN : req.error || "تعذّرت المزامنة"}` };
    if (sync && sync.state === "login") return { phase:"failed", text:`✗ ${WQNOW.LOGIN}` };
    if (req.status === "pending")
      return (now - at) / 1e3 > WQNOW.CLAIM_S
        ? { phase:"failed", text:`✗ لم يلتقط الطلب أي جهاز متصل بوثيقة خلال دقيقتين. ثبّت جسر إنجاز ${WQNOW.BRIDGE_V} على هذا الجهاز وافتح وثيقة فيه، ثم أعد المحاولة` }
        : { phase:"pending", text:"جارٍ… بانتظار جهاز متصل بوثيقة" };
    if (req.status === "running")
      return (now - (t(req.claimed_at) || at)) / 1e3 > WQNOW.RUN_S
        ? { phase:"failed", text:"✗ بدأت المزامنة ولم تكتمل خلال 10 دقائق" }
        : { phase:"running", text:`جارٍ… ${step || "المزامنة تعمل الآن"}` };
    return { phase:"idle", text:"" };
  },
  /* يزامن هذا الجهاز بنفسه إن كان عليه جسر 2.6 فأعلى */
  bridgeOk(ds){ return !!ds && ds.copilotBridge === "ready" && parseFloat(ds.copilotBridgeV || "0") >= WQNOW.BRIDGE_V; },
  /* بداية نافذة القراءة: يومان قبل آخر مزامنة (بتوقيت الكويت كما يعرضه وارد وثيقة)، وبلا مزامنة سابقة يقرأ الكل */
  since(sync){ const l = sync && sync.last ? new Date(sync.last).getTime() : NaN; if (!(l > 0)) return "";
    return new Date(l - 2 * 864e5 + 3 * 36e5).toISOString().slice(0, 16); }
};
if (typeof module !== "undefined") module.exports = WQNOW;

if (typeof window !== "undefined") {
  S.wqReq = null; S.wqStep = "";
  const busy = () => ["pending", "running"].includes(WQNOW.state(S.wqReq, S.wqSync, Date.now()).phase);
  const nowBtn = () => `<button type="button" class="btn" data-wqnow ${busy() ? "disabled" : ""}>${busy() ? "جارٍ…" : "مزامنة الآن"}</button>`;
  const nowLine = () => { const st = WQNOW.state(S.wqReq, S.wqSync, Date.now(), S.wqStep);
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
    if (!busy()) { clearInterval(timer); timer = null; S.wqStep = ""; }
    render();
  }
  // الجسر يبلّغ بخطواته: «فتح وثيقة» ← «قراءة الكتب…» ← تمّ/تعذّر (الفشل يُسجَّل على الطلب ليراه الجميع)
  window.addEventListener("message", async e => {
    if (e.source !== window || e.data?.type !== "jaliyat-wq-sync-status" || !S.wqReq || String(S.wqReq.id) !== String(e.data.id)) return;
    if (e.data.state === "working") { S.wqStep = String(e.data.step || ""); render(); return; }
    if (e.data.state === "failed") await sb.rpc("wq_sync_fail_me", { p_id: S.wqReq.id, p_error: String(e.data.error || "") });
    if (e.data.state === "done") toast(`✓ تمت المزامنة: قُرئ ${e.data.read || 0} كتابًا وحُفظ ${e.data.n || 0} في إنجاز`);
    wqNowTick();
  });
  async function syncHere(req){
    const { data: c } = await sb.rpc("wq_sync_claim_me", { p_id: req.id });
    if (c) S.wqReq = c;
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.access_token) return;
    S.wqStep = "فتح وثيقة على هذا الجهاز"; render();
    window.postMessage({ type: "jaliyat-wq-sync", job: { id: req.id, url: `${SB_URL}/functions/v1/watheqa-ingest`, token: session.access_token, anon: SB_KEY, since: WQNOW.since(S.wqSync), max: 300 } }, location.origin);
  }
  document.addEventListener("click", async ev => { const b = ev.target.closest("[data-wqnow]"); if (!b) return; ev.preventDefault();
    if (busy()) return;
    b.disabled = true;
    const { data, error } = await sb.rpc("wq_sync_now");
    if (error || !data) {
      // PGRST202: الدالة غير موجودة بعد (ترحيل 2026-11-28_wq_sync_now.sql ينتظر تطبيقه)
      toast(error?.code === "42501" ? "لا تملك صلاحية طلب المزامنة" : error?.code === "PGRST202" ? "«مزامنة الآن» تنتظر تفعيلها في قاعدة البيانات" : "تعذّر تسجيل طلب المزامنة، حاول مرة أخرى");
      b.disabled = false; return; }
    S.wqReq = data; S.wqStep = ""; render();
    if (WQNOW.bridgeOk(document.documentElement.dataset)) await syncHere(data);
    clearInterval(timer); timer = setInterval(wqNowTick, WQNOW.POLL_MS);
  });
}
