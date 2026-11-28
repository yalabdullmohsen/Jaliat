/* JL-HALLS (طلب يوسف 2026-11-28): كتب وثيقة عن حجز القاعات تُسجَّل تلقائيًا في «حجز القاعات» (wq_hall_sync في قاعدة البيانات).
   هنا لوحة «يحتاج مراجعة» في صفحة القاعات: ما لم يُفهم بثقة من الكتاب (قاعة خارج القائمة، لا وقت صريح، أكثر من قاعة…)،
   والتعارض مع حجز قائم (لم يُكتب فوقه). لكل بند: فتح الكتاب، وفتح الحجز المتعارض، و«تجاهل». */
const HREV = {
  /* البنود الظاهرة: غير المتجاهلة، التعارض أولًا ثم الأحدث (دالة صرفة تُختبر) */
  view(rows){ return (rows || []).filter(r => !r.dismissed)
    .sort((a, b) => (b.conflict_ids?.length ? 1 : 0) - (a.conflict_ids?.length ? 1 : 0) || String(b.no || "").localeCompare(String(a.no || ""))); },
  isConflict(r){ return !!(r && r.conflict_ids && r.conflict_ids.length); }
};
if (typeof module !== "undefined") module.exports = HREV;

if (typeof window !== "undefined") {
  S.hrev = [];
  async function hrevLoad(){ if (!S.canWrite) return; const { data, error } = await sb.from("watheqa_hall_review").select("*").eq("dismissed", false); if (!error) S.hrev = data || []; }
  const _vHalls185 = vHalls;
  vHalls = function(){ const h = _vHalls185(); const L = HREV.view(S.hrev); if (!S.canWrite || !L.length) return h;
    const row = r => `<div class="hl-i hrev-i"><span class="hl-t"><b>${esc(r.subj || "")}</b><span class="s">${esc(r.no || "")} · ${esc(r.reason)}</span></span>
      <span class="br-acts"><button type="button" class="btn btn-ghost" data-wq="${esc(r.doc_id)}">الكتاب</button>${(r.conflict_ids || []).map(id => `<button type="button" class="btn btn-ghost" data-bk="${esc(id)}">الحجز المتعارض</button>`).join("")}<button type="button" class="btn btn-ghost" data-hrev-x="${esc(r.doc_id)}">تجاهل</button></span></div>`;
    const nConf = L.filter(HREV.isConflict).length;
    return `<div class="panel hl-w hrev"><div class="panel-b"><div class="hl-h"><b>${ei("mail")}من وثيقة: يحتاج مراجعة</b><span class="chip warn">${L.length}${nConf ? ` · ${nConf} تعارض` : ""}</span></div>
      <span class="s">كتب حجز لم يُسجَّل منها حجز تلقائيًا لأن بياناتها غير مؤكدة أو تتعارض مع حجز قائم. سجّلها يدويًا أو تجاهلها.</span>
      <div class="hl-l">${L.slice(0, 12).map(row).join("")}</div></div></div>` + h; };
  const _boot9h185 = boot9; boot9 = function(){ _boot9h185(); hrevLoad().then(() => { if (S.view === "halls" && $("#drawer").hidden) render(); }); };
  document.addEventListener("click", async ev => { const b = ev.target.closest("[data-hrev-x]"); if (!b) return; ev.preventDefault();
    const id = b.dataset.hrevX; const { error } = await sb.from("watheqa_hall_review").update({ dismissed:true, updated_at:new Date().toISOString() }).eq("doc_id", id);
    if (error) return writeFail(error);
    S.hrev = S.hrev.filter(r => r.doc_id !== id); render(); toast("تُجوهل البند"); });
}
