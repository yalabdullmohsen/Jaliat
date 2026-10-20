/* ================= v12: bridge 2.0 — settings pushed from the system (no reinstall for future fixes) ================= */
/* Edit these when Microsoft changes Copilot's page; every bridge 2.0 picks them up automatically. */
const BRIDGE_CFG = {
  editor: ["#m365-chat-editor-target-element", '[role="textbox"][contenteditable="true"]', "textarea[placeholder]"],
  send: ['button[aria-label="Send"]', 'button[aria-label="إرسال"]', 'button[data-testid="sendButton"]', 'button[aria-label*="Send"]', 'button[aria-label*="إرسال"]', 'button[aria-label="Submit"]', 'button[title*="Send"]', ".fai-SendButton", 'button[type="submit"]'],
  reply: ['[data-testid="markdown-reply"]', '[data-content="ai-message"]'],
  busy: ['[data-testid="loading-message"]', 'button[aria-label="Stop generating"]', 'button[aria-label="إيقاف"]'],
  upload: ["#upload-file-button", 'input[type="file"]'],
  newchat: ['button[aria-label="New chat"]', 'button[aria-label="محادثة جديدة"]', 'button[data-testid="newChatButton"]'],
  stableTicks: 6, replyWait: 180000, uploadWait: 60000
};
const BRIDGE_HOSTS = ["m365.cloud.microsoft", "microsoft365.com", "office.com"];
const BRIDGE_LATEST = 2.0;
window.addEventListener("message", e => {
  if (!/^https:\/\/m365\.cloud\.microsoft$/.test(e.origin)) return;
  if (e.data?.type === "jaliyat-copilot-hello") e.source?.postMessage({ type:"jaliyat-config", cfg:BRIDGE_CFG }, e.origin);
  if (e.data?.type === "jaliyat-new-done") { BR.primed = false; BR.busy = false; setTimeout(brPrime, 1500); }
});
function bridgeHosts(){ if (hasBridge()) window.postMessage({ type:"jaliyat-bridge-hosts", hosts:BRIDGE_HOSTS }, location.origin); }
const bridgeOld = () => hasBridge() && brV() < BRIDGE_LATEST;
const BR_UPD = () => `<div class="check warn br-upd"><b>تحديث أخير للجسر (2.0) — بعده كل التحديثات تلقائية</b>
  <span>1) <a href="jaliyat-copilot.zip" download>نزّل الجسر الجديد</a>  2) استخرجه وانسخ الملفات فوق مجلد jaliyat-copilot القديم (استبدال)  3) افتح <code dir="ltr">edge://extensions</code> واضغط «إعادة تحميل» على الجسر، ثم حدّث هذه الصفحة.</span></div>`;
const _vCopilot13 = vCopilot;
vCopilot = function(){
  let h = _vCopilot13(); if (!hasBridge()) return h;
  h = h.replace(/<div class="check warn" style="font-size:13px"><b>تحديث الجسر متاح \(1\.1\)<\/b>[\s\S]*?<\/span><\/div>/, "");
  if (bridgeOld()) h = h.replace('<div class="cp-chips">', BR_UPD() + '<div class="cp-chips">');
  if (brV() >= 2) h = h.replace('<button type="button" class="btn btn-ghost" id="br-reprime"', `<button type="button" class="btn btn-ghost" id="br-new">${icon("i-plus")} محادثة جديدة مع Copilot</button><button type="button" class="btn btn-ghost" id="br-reprime"`);
  return h;
};
const _alerts13 = alerts;
alerts = function(){ const A = _alerts13(); if (bridgeOld()) A.unshift({ k:"warn", t:"تحديث أخير لجسر Copilot (2.0)", s:"بعده تتحدث الإعدادات تلقائياً", go:"copilot" }); return A; };
document.addEventListener("click", ev => { const t = ev.target.closest("button"); if (t?.id === "br-new") { const f = $("#br-frame"); if (f) f.contentWindow.postMessage({ type:"jaliyat-new" }, "https://m365.cloud.microsoft"); } });
const _boot9b13 = boot9; boot9 = function(){ _boot9b13(); bridgeHosts(); setTimeout(bridgeHosts, 1500); };
/* full-screen Copilot (desktop) */
const _vCopilot13b = vCopilot;
vCopilot = function(){ let h = _vCopilot13b(); if (!hasBridge()) return h;
  return h.replace('<span class="cp-badge">', `<button type="button" class="btn" id="cp-full" title="ملء الشاشة (Esc للخروج)">${document.body.classList.contains("cp-full") ? "⤡ تصغير" : "⤢ ملء الشاشة"}</button><span class="cp-badge">`); };
function cpFull(on){ document.body.classList.toggle("cp-full", on); LS.set("cpfull", on); const b = $("#cp-full"); if (b) b.textContent = on ? "⤡ تصغير" : "⤢ ملء الشاشة"; }
document.addEventListener("click", ev => { if (ev.target.closest("#cp-full")) cpFull(!document.body.classList.contains("cp-full")); });
document.addEventListener("keydown", ev => { if (ev.key === "Escape" && document.body.classList.contains("cp-full") && $("#drawer").hidden) cpFull(false); });
const _afterRender13 = afterRender;
afterRender = function(v){ _afterRender13(v); if (v === "copilot" && hasBridge()) { if (LS.get("cpfull", false)) cpFull(true); } else document.body.classList.remove("cp-full"); };
