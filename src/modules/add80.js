/* ================= v80: إرفاق ملف (PDF أو صورة أو نص) في صفحة Copilot عبر الجسر ================= */
const CPA = { file:null, max:10 * 1024 * 1024 };
const _vCopilot80 = vCopilot;
vCopilot = function(){
  const h = _vCopilot80();
  if (!hasBridge() || brV() < 1.1) return h;
  const nm = CPA.file ? `📎 ${esc(CPA.file.name)} <button type="button" class="btn btn-ghost" data-cpa-x title="إزالة المرفق">✕</button>` : "";
  return h.replace('<button class="btn" type="button" data-intake', `<label class="btn" title="أرفق ملفاً لـ Copilot (PDF أو صورة أو نص)">${icon("i-down")} ملف<input type="file" id="br-att" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.csv,image/*" hidden></label><button class="btn" type="button" data-intake`)
    .replace('<span class="s" id="br-st">', `<span class="s" id="br-attn">${nm}</span><span class="s" id="br-st">`);
};
document.addEventListener("change", ev => {
  const i = ev.target; if (!i || i.id !== "br-att") return;
  const f = i.files && i.files[0]; i.value = "";
  if (!f) return;
  if (f.size > CPA.max) return toast("الملف أكبر من 10 ميغابايت");
  CPA.file = f; if (S.view === "copilot") render();
});
document.addEventListener("click", ev => {
  if (!ev.target.closest("[data-cpa-x]")) return;
  CPA.file = null; if (S.view === "copilot") render();
});
const _brSend80 = brSend;
brSend = function(q, withData){
  const f = CPA.file; if (!f) return _brSend80(q, withData);
  q = String(q || "").trim() || "اقرأ الملف المرفق ولخّصه لي.";
  CPA.file = null;
  brPost({ type:"jaliyat-ask", text:q, file:{ name:f.name, content:f, type:f.type || "application/octet-stream" } });
  const qi = $("#br-q"); if (qi) qi.value = "";
  const n = $("#br-attn"); if (n) n.innerHTML = "";
  const st = $("#br-st"); if (st) st.textContent = BR.ready ? "أُرسل الملف لـ Copilot…" : "سيُرسل فور جاهزية Copilot…";
};
