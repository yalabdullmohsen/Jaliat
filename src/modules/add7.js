/* ================= v9.6: Copilot embedded inside the system (via the free bridge extension) ================= */
const BR = { ready:false, frame:null, queue:[], primed:false };
const hasBridge = () => !!document.documentElement.dataset.copilotBridge;
function vCopilot(){
  if (!hasBridge()) return `<div class="cp" style="display:grid;gap:20px">
    <div class="panel cp-install"><div class="panel-b" style="display:grid;gap:14px">
      <div class="cp-bar"><span class="cp-badge">${icon("i-spark", 16)} Microsoft 365 Copilot داخل النظام</span></div>
      <h3 style="font-size:20px">خطوة واحدة لكل جهاز: ثبّت «جسر Copilot» ليظهر Copilot هنا داخل النظام</h3>
      <ol class="cp-steps">
        <li><a class="btn btn-primary" href="jaliyat-copilot.zip" download>${icon("i-down")} تنزيل الجسر</a> ثم افتح الملف المضغوط واستخرجه (Extract All).</li>
        <li>افتح في المتصفح الرابط: <code dir="ltr">edge://extensions</code> في Edge، أو <code dir="ltr">chrome://extensions</code> في Chrome.</li>
        <li>فعّل <b>Developer mode / وضع المطوّر</b>.</li>
        <li>اضغط <b>Load unpacked / تحميل غير مضغوط</b> واختر مجلد <b dir="ltr">jaliyat-copilot</b>.</li>
        <li>ارجع هنا وحدّث الصفحة، يظهر Copilot داخل النظام بحسابك في الوزارة.</li></ol>
      <span class="hint">الجسر مجاني، لا يجمع أي بيانات، ويعمل فقط داخل صفحة النظام.</span>
    </div></div>
    ${vCopilotMS()}</div>`;
  return `<div class="cp cp-embed">
    <div class="cp-side">
      <span class="cp-badge">${icon("i-spark", 16)} Microsoft 365 Copilot</span>
      <textarea class="f" id="br-q" rows="4" placeholder="اكتب سؤالك… يُرسل لـ Copilot مع بيانات النظام عند الحاجة  (Enter للإرسال)"></textarea>
      <button class="btn btn-primary" id="br-go" type="button">${icon("i-spark")} اسأل Copilot</button>
      <span class="s" id="br-st">${BR.ready ? "Copilot جاهز" : "جارٍ تحميل Copilot…"}</span>
      <div class="cp-chips">${CP_PROMPTS.map((p, i) => `<button type="button" data-brp="${i}">${esc(p[0])}</button>`).join("")}</div>
    </div>
    <iframe id="br-frame" class="cp-frame" src="https://m365.cloud.microsoft/chat/?auth=2" allow="clipboard-read; clipboard-write; microphone" title="Microsoft 365 Copilot"></iframe>
  </div>`;
}
/* give Copilot the system's data once per conversation, automatically */
function brPrime(){
  if (BR.primed) return; BR.primed = true;
  const intro = "أنا موظف في قسم الجاليات ورعاية المهتدين وطلبة البعوث بوزارة الأوقاف. هذه بيانات «نظام أنشطة الجاليات» المفتوح أمامي الآن (الأنشطة والمساجد والجاليات والمحاضرون والحالات والتعارضات). اعتمد عليها في كل إجاباتك القادمة في هذه المحادثة، وعندما أقول «النظام» أو أسأل عن نشاط أو جالية أو مسجد أو محاضر فأقصد هذه البيانات. لا تلخصها الآن، ورد فقط بعبارة: «تم استلام بيانات النظام ✓، اسألني ما تشاء».";
  const f = $("#br-frame"); if (f) f.contentWindow.postMessage({ type:"jaliyat-ask", text:`${intro}\n\n${cpData("", 14000)}` }, "https://m365.cloud.microsoft");
}
function brSend(q, withData){
  q = String(q || "").trim(); if (!q) return toast("اكتب سؤالك أولاً");
  const text = withData && !BR.primed ? `${q}\n\n${cpData(q)}` : q;
  const f = $("#br-frame"); if (!f) return;
  if (!BR.ready) { BR.queue.push(text); $("#br-st").textContent = "سيُرسل فور جاهزية Copilot…"; return; }
  f.contentWindow.postMessage({ type:"jaliyat-ask", text }, "https://m365.cloud.microsoft");
  const qi = $("#br-q"); if (qi) qi.value = "";
  $("#br-st").textContent = "أُرسل السؤال، الرد يظهر في Copilot";
}
window.addEventListener("message", e => {
  if (!/^https:\/\/m365\.cloud\.microsoft$/.test(e.origin)) return;
  if (e.data?.type === "jaliyat-copilot-ready") { BR.ready = true; const st = $("#br-st"); if (st) st.textContent = "Copilot جاهز ويعرف بيانات النظام"; brPrime(); const f = $("#br-frame"); while (BR.queue.length && f) f.contentWindow.postMessage({ type:"jaliyat-ask", text:BR.queue.shift() }, "https://m365.cloud.microsoft"); }
  if (e.data?.type === "jaliyat-copilot-error") { const st = $("#br-st"); if (st) st.textContent = "سجّل دخولك في Copilot داخل الإطار إن طُلب منك"; }
});
document.addEventListener("click", ev => { const t = ev.target.closest("button"); if (!t) return;
  if (t.id === "br-go") { const q = $("#br-q").value; return brSend(q, cpNeedsData(q)); }
  if (t.dataset.brp !== undefined) { const p = CP_PROMPTS[+t.dataset.brp]; return brSend(p[2], p[3]); }
});
document.addEventListener("keydown", ev => { if (ev.target.id === "br-q" && ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); const q = ev.target.value; brSend(q, cpNeedsData(q)); } });
const _afterRender7 = afterRender;
afterRender = function(v){ _afterRender7(v); if (v === "copilot" && hasBridge()) { BR.ready = false; BR.primed = false; } };
