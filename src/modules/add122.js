/* ================= v100 (JL-AI 3): تلخيص الطلبات الطويلة في سطر مع المطلوب «✨» ================= */
const aiReqInput = r => { const d = { ...(r.data || {}) }; delete d.ack; delete d.files;
  const keep = {}; for (const [k, v] of Object.entries(d)) if (v != null && v !== "" && typeof v !== "object") keep[k] = String(v).slice(0, 1500); else if (Array.isArray(v) && v.length) keep[k] = JSON.stringify(v).slice(0, 2500);
  return { no:r.no, status:r.status, fields:keep }; };
const _reqForm100 = reqForm;
reqForm = async function(id){ await _reqForm100(id); const r = S.reqs.find(x => x.id === id); if (!r || S.form?.kind !== "req") return;
  $("#drawer .rq-tools")?.insertAdjacentHTML("beforebegin", `<div class="ai-row">${aiBtn(`data-aireq="${esc(id)}"`, "لخّص الطلب", "سطر واحد مع المطلوب من المساعد الذكي")}<div class="ai-host"></div></div>`); };
document.addEventListener("click", async ev => { const t = ev.target.closest("[data-aireq]"); if (!t) return;
  const r = S.reqs.find(x => String(x.id) === t.dataset.aireq), host = t.parentElement.querySelector(".ai-host"); if (!r || !host) return;
  aiBusy(t, true); const a = await aiCall("req_summary", aiReqInput(r)); aiBusy(t, false);
  host.innerHTML = a.ok ? `<div class="ai-out"><b>${esc(a.out?.line || "")}</b>${(a.out?.asks || []).length ? `<ul class="ai-lines">${a.out.asks.slice(0, 4).map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}${aiNote}</div>` : `<div class="ai-out s">${esc(a.msg || AI_QUIET)}</div>`; });
