/* ================= v103 (JL-AI 6): ترجمة طلبات البوابة إلى العربية للموظف «» ================= */
/* تظهر عند وجود نص غير عربي في الطلب (لغات البوابة الثلاث عشرة)، وتُترجم الحقول النصية وحدها؛ الأصل يبقى كما هو. */
const hasForeign = s => /[A-Za-zऀ-෿฀-๿ሀ-፿Ѐ-ӿঀ-৿]{3,}/.test(String(s || "")) || (/[؀-ۿ]/.test(s) && /[پچژگکی]/.test(s));
const trFields = r => Object.entries(r.data || {}).filter(([k, v]) => typeof v === "string" && v.length > 2 && !/phone|civil|email|date|time|no$|^id$/.test(k) && hasForeign(v));
const _reqForm103 = reqForm;
reqForm = async function(id){ await _reqForm103(id); const r = S.reqs.find(x => x.id === id); if (!r || S.form?.kind !== "req" || !trFields(r).length) return;
  $("#drawer .rq-tools")?.insertAdjacentHTML("beforebegin", `<div class="ai-row">${aiBtn(`data-aitr="${esc(id)}"`, "ترجمة إلى العربية", "ترجمة نصوص الطلب من المساعد الذكي")}<div class="ai-host"></div></div>`); };
document.addEventListener("click", async ev => { const t = ev.target.closest("[data-aitr]"); if (!t) return;
  const r = S.reqs.find(x => String(x.id) === t.dataset.aitr), host = t.parentElement.querySelector(".ai-host"); if (!r || !host) return;
  const F = trFields(r); if (!F.length) return;
  aiBusy(t, true); const a = await aiCall("translate", { text:F.map(([k, v]) => `[${k}]\n${v.slice(0, 1500)}`).join("\n\n") }); aiBusy(t, false);
  host.innerHTML = a.ok ? `<div class="ai-out" dir="rtl">${a.out?.lang ? `<span class="s">لغة الأصل: ${esc(a.out.lang)}</span>\n` : ""}${esc(a.out?.ar || "")}${aiNote}</div>` : `<div class="ai-out s">${esc(a.msg || AI_QUIET)}</div>`; });
