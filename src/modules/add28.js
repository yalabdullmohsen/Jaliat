/* ================= v28: «تذكير التجديد»، approvals ending soon → the coordinator, a ready WhatsApp message, one tap ================= */
Object.assign(TITLES, { renew:"تذكير التجديد" });
const arDays = n => n === 1 ? "يوم واحد" : n === 2 ? "يومين" : n >= 3 && n <= 10 ? `${n} أيام` : `${n} يوماً`;
S.renewLog = []; S.renewDays = 30;
async function loadRenew(){ const { data } = await sb.from("renew_reminders").select("*").order("sent_at", { ascending:false }).limit(1000); S.renewLog = data || []; }
const renewSent = no => S.renewLog.find(r => r.doc_no === no);
function renewList(){
  const lim = addDays(TODAY, +S.renewDays);
  return S.docs.filter(d => d.end && d.end >= addDays(TODAY, -7) && d.end <= lim).map(d => {
    const acts = S.E.filter(e => e.doc === d.no && !["ملغى", "مكتمل"].includes(e.status));
    const comm = d.comm || acts[0]?.comm || "";
    const coords = S.coords.filter(c => c.comm === comm && c.status !== "سابق" && c.phone);
    return { d, acts, comm, coords, left:diffDays(TODAY, d.end) };
  }).filter(x => x.acts.length || x.coords.length).sort((a, b) => a.d.end.localeCompare(b.d.end));
}
function renewMsg(x, c){
  const actsTxt = x.acts.slice(0, 12).map((e, i) => `${i + 1}) ${e.type || "درس"}، ${e.mosName || ""}${e.area ? " (" + e.area + ")" : ""}، ${daysText(e)} ${e.time || ""}${e.lect ? "، " + e.lect : ""}`).join("\n");
  const when = x.left < 0 ? `انتهت بتاريخ ${fmt(x.d.end)}` : x.left === 0 ? `تنتهي اليوم ${fmt(x.d.end)}` : `تنتهي بتاريخ ${fmt(x.d.end)} (بعد ${arDays(x.left)})`;
  return `السلام عليكم ورحمة الله وبركاته\n${c ? `الأخ الفاضل / ${c.name}${c.role ? "، " + c.role : ""} الجالية ${commBase(x.comm)}` : `منسق الجالية ${commBase(x.comm)}`}\n\nنود إفادتكم بأن موافقة الأنشطة الدينية رقم (${x.d.no}) ${when}${x.acts.length ? `، وتشمل:\n${actsTxt}` : "."}\n\nللاستمرار في إقامة الأنشطة دون انقطاع، نأمل التكرم بإرسال طلب التجديد قبل تاريخ الانتهاء، مع بيان أي تعديل على المساجد أو المحاضرين أو الأوقات.\n\nوجزاكم الله خيراً${SIGN}`;
}
function vRenew(){
  const L = renewList(), pending = L.filter(x => !renewSent(x.d.no));
  return `<div class="rn">
    <div class="rn-head"><div><b>تذكير التجديد</b><span>موافقات تنتهي خلال ${S.renewDays} يوماً، رسالة جاهزة لمنسق كل جالية تُرسل بضغطة واتساب.</span></div>
      <div class="rn-seg">${[[14, "١٤ يوم"], [30, "٣٠ يوم"], [60, "٦٠ يوم"]].map(([n, l]) => `<button type="button" class="${+S.renewDays === n ? "on" : ""}" data-rndays="${n}">${l}</button>`).join("")}</div></div>
    <div class="rn-sum"><span><b>${L.length}</b> موافقة</span><span><b>${pending.length}</b> لم يُذكَّر منسقها</span><span><b>${L.reduce((n, x) => n + x.acts.length, 0)}</b> نشاط مرتبط</span></div>
    ${L.map(x => { const s = renewSent(x.d.no), urg = x.left <= 7 ? "bad" : x.left <= 14 ? "warn" : "ok";
      return `<div class="rn-c${s ? " sent" : ""}"><div class="rn-ct"><span class="rn-left ${urg}">${x.left < 0 ? "انتهت" : x.left === 0 ? "اليوم" : arDays(x.left)}</span><div><b>${esc(x.comm || "—")}</b><span>موافقة ${esc(x.d.no)} · تنتهي ${fmt(x.d.end)} · ${x.acts.length} نشاط</span></div>
          ${s ? `<span class="rn-ok">✓ ذُكِّر ${ago(s.sent_at)}، ${esc(pname(s.sent_by) || "")}</span>` : ""}</div>
        ${x.coords.length ? `<div class="rn-co">${x.coords.map((c, i) => `<div class="rn-p"><span class="rn-av">${esc((c.name || "؟").trim().charAt(0))}</span><div><b>${esc(c.name)}</b><span>${esc(c.role || "منسق")} · <bdi dir="ltr">${esc(c.phone)}</bdi></span></div>
            <button type="button" class="btn btn-primary rn-send" data-rnsend="${esc(x.d.no)}" data-rni="${i}">${icon("i-wa")} إرسال تذكير</button><button type="button" class="btn btn-ghost" data-rncopy="${esc(x.d.no)}" data-rni="${i}">نسخ</button></div>`).join("")}</div>`
        : `<div class="rn-none">لا يوجد رقم منسق لهذه الجالية، <button type="button" class="lnk" data-go="coords">أضف المنسق</button></div>`}
        <details class="rn-pre"><summary>معاينة الرسالة</summary><pre>${esc(renewMsg(x, x.coords[0]))}</pre></details></div>`; }).join("") || `<div class="rn-empty"><b>لا توجد موافقات تنتهي خلال ${S.renewDays} يوماً ✓</b></div>`}
  </div>`;
}
async function renewSend(no, i, copyOnly){
  const x = renewList().find(y => y.d.no === no); if (!x) return; const c = x.coords[+i]; const msg = renewMsg(x, c);
  if (copyOnly) { const ok = await cpCopy(msg); return toast(ok ? "نُسخت الرسالة" : "تعذّر النسخ"); }
  waOpen(c?.phone || "", msg);
  const { data } = await sb.from("renew_reminders").insert({ doc_no:no, doc_end:x.d.end, phone:c?.phone || "", coord:c?.name || "", sent_by:S.me.id }).select().single();
  if (data) { S.renewLog = [data, ...S.renewLog]; if (S.view === "renew" && $("#drawer").hidden) render(); }
}
let rnCh = null;
const _boot9r28 = boot9;
boot9 = function(){ _boot9r28(); loadRenew().then(() => { if (rnCh) sb.removeChannel(rnCh); rnCh = sb.channel("rn").on("postgres_changes", { event:"INSERT", schema:"public", table:"renew_reminders" }, p => { if (!S.renewLog.some(r => r.id === p.new.id)) S.renewLog = [p.new, ...S.renewLog]; if (S.view === "renew" && $("#drawer").hidden) render(); }).subscribe(); if (S.view === "renew") render(); }); };
const _prio28 = priorities;
priorities = function(){ const P = _prio28(); const L = renewList().filter(x => !renewSent(x.d.no) && x.left <= 14 && x.coords.length); if (L.length) P.push({ w:93, k:"warn", t:`${L.length} موافقة تنتهي قريباً ولم يُذكَّر منسقها`, s:L.slice(0, 3).map(x => x.comm).join("، "), act:{ go:"renew", l:"تذكير بالواتساب" } }); return P.sort((a, b) => b.w - a.w); };
const _answer28 = answer;
answer = function(q){ const t = norm(q); if (/تجديد|تنتهي|ينتهي|انتهاء/.test(t) && /تذكير|منسق|ارسل|رساله|رسالة|واتس/.test(t)) { const L = renewList(); return { title:`موافقات تنتهي قريباً (${L.length})`, items:L.map(x => ({ t:`${x.comm}، ${x.d.no}`, s:`تنتهي ${fmt(x.d.end)}${renewSent(x.d.no) ? " · ذُكِّر ✓" : " · لم يُذكَّر"}`, go:"renew" })), extra:"افتح «تذكير التجديد» وأرسل لكل منسق بضغطة." }; } return _answer28(q); };
const _palAll28 = palAll;
palAll = function(){ const A = _palAll28(); A.unshift({ g:"إجراءات", t:"تذكير المنسقين بانتهاء الموافقات (واتساب)", s:"", ic:"i-wa", run:() => go("renew"), txt:"تذكير تجديد انتهاء موافقة منسق واتساب" }); return A; };
NEWF.splice(1, 0, ["v28-renew", "nav:renew", "تذكير التجديد", "الموافقات اللي تنتهي قريباً مع منسق كل جالية ورقمه، ورسالة تذكير رسمية جاهزة تُرسل بضغطة واتساب، ويُسجَّل من أرسل ومتى.", false, "2026-10-20"]);
document.addEventListener("click", ev => { const t = ev.target.closest("button"); if (!t || S.view !== "renew") return; const D = t.dataset;
  if (D.rndays) { S.renewDays = +D.rndays; return render(); }
  if (D.rnsend) return renewSend(D.rnsend, D.rni);
  if (D.rncopy) return renewSend(D.rncopy, D.rni, true);
});
