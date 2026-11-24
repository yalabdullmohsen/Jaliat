/* ================= v99 (JL-AI 2): صياغة ردود وكتب وثيقة بأسلوب رسمي عربي «✨» ================= */
/* اقتراح يُعرض تحت الكتاب مع «نسخ»؛ لا يُحفظ ولا يُرسل شيء تلقائيًا، والموظف يعتمد. */
const aiPlain = html => { const d = document.createElement("div"); d.innerHTML = String(html || ""); return (d.innerText || d.textContent || "").replace(/\n{3,}/g, "\n\n").trim(); };
function aiDraftBox(host, r){ host.innerHTML = r.ok
  ? `<div class="ai-out"><b>الموضوع:</b> ${esc(r.out?.subject || "")}\n\n${esc(r.out?.body || "")}<div class="br-acts"><button type="button" class="btn btn-primary" data-aicopy="body">نسخ النص</button><button type="button" class="btn" data-aicopy="subject">نسخ الموضوع</button></div>${aiNote}</div>`
  : `<div class="ai-out s">${esc(r.msg || AI_QUIET)}</div>`; host._ai = r.ok ? r.out : null; }
/* كتاب وارد في وثيقة: مسودة رد رسمي */
const _wqForm99 = wqForm;
wqForm = function(id){ _wqForm99(id); const w = wqById(id); if (!w || !S.canWrite) return;
  $("#drawer .q-body")?.insertAdjacentHTML("afterend", `<div class="ai-row">${aiBtn(`data-aiwq="${esc(id)}"`, "✨ صياغة رد رسمي", "مسودة رد رسمي من المساعد الذكي")}<input class="f" id="ai-wq-n" placeholder="فكرة الرد باختصار (اختياري)، مثال: نوافق ونطلب تزويدنا بالجدول"><div class="ai-host"></div></div>`); };
/* مسودة كتاب مولّدة من النظام: تحسين الصياغة الرسمية */
const _letterOpen99 = letterOpen;
letterOpen = function(src){ _letterOpen99(src); if (!S.letters?.length || !S.canWrite) return;
  document.querySelectorAll("#drawer .lt").forEach((el, i) => el.querySelector(".br-acts")?.insertAdjacentHTML("beforeend", aiBtn(`data-ailt="${i}"`, "✨ تحسين الصياغة", "صياغة رسمية مقترحة من المساعد الذكي")))
  document.querySelectorAll("#drawer .lt").forEach(el => el.insertAdjacentHTML("beforeend", `<div class="ai-host"></div>`)); };
document.addEventListener("click", async ev => { const t = ev.target.closest("[data-aiwq],[data-ailt],[data-aicopy]"); if (!t) return;
  if (t.dataset.aicopy) { const o = t.closest(".ai-host")?._ai; if (!o) return; const ok = await cpCopy(String(o[t.dataset.aicopy] || "")); return toast(ok ? "نُسخ" : "تعذّر النسخ"); }
  if (t.dataset.aiwq) { const w = (S.wq || []).find(x => String(x.id) === t.dataset.aiwq), host = t.parentElement.querySelector(".ai-host"); if (!w || !host) return;
    aiBusy(t, true); const r = await aiCall("wq_draft", { mode:"reply", original_subject:w.subj || "", original_from:w.sender || "", original_no:w.no || "", original_body:String(w.body || "").slice(0, 3500), staff_idea:$("#ai-wq-n")?.value || "", from:"قسم الجاليات ورعاية المهتدين وطلبة البعوث" });
    aiBusy(t, false); return aiDraftBox(host, r); }
  if (t.dataset.ailt !== undefined) { const x = S.letters?.[+t.dataset.ailt], host = t.closest(".lt")?.querySelector(".ai-host"); if (!x || !host) return;
    aiBusy(t, true); const r = await aiCall("wq_draft", { mode:"letter", to:x.to, subject:x.subj, current_text:aiPlain(x.html).slice(0, 4000), keep:"احتفظ بكل البيانات (الأنشطة والمساجد والأوقات والتواريخ) كما هي، وحسّن الصياغة فقط" });
    aiBusy(t, false); return aiDraftBox(host, r); }
});
