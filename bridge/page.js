// Runs on the Jaliyat system: tells the page the bridge is installed and enables Copilot framing for this tab.
// v2.0: the system can send updated settings (extra Microsoft hosts) without reinstalling the bridge.
document.documentElement.dataset.copilotBridge = "1";
document.documentElement.dataset.copilotBridgeV = "2.3";
const register = hosts => chrome.runtime.sendMessage({ type: "jaliyat-register", hosts }, r => { document.documentElement.dataset.copilotBridge = r?.ok ? "ready" : "1"; });
register([]);
window.addEventListener("message", e => {
  if (e.source !== window || e.origin !== location.origin) return;
  if (e.data?.type === "jaliyat-bridge-hosts" && Array.isArray(e.data.hosts)) register(e.data.hosts.filter(h => typeof h === "string").slice(0, 30));
});
// v2.5: جسر بين «إنجاز» وإضافة وثيقة (كتب بلا حسابات: تعمل بجلسة الموظف في وثيقة)
document.documentElement.dataset.copilotBridgeV = "2.5";
window.addEventListener("message", e => {
  if (e.source !== window || e.origin !== location.origin) return;
  if (e.data?.type === "jaliyat-wq-run" && e.data.job && typeof e.data.job === "object") {
    const j = e.data.job, job = { id: String(j.id), mode: j.mode === "send" ? "send" : "draft", draftFor: String(j.draftFor || ""), to: String(j.to || ""), subj: String(j.subj || ""), note: String(j.note || ""), html: String(j.html || ""), visa: String(j.visa || "لعمل اللازم"), dry: !!j.dry,
      attach: (Array.isArray(j.attach) ? j.attach : []).filter(a => a && /^https:\/\/[a-z0-9-]+\.supabase\.co\//.test(a.url || "")).slice(0, 10).map(a => ({ name: String(a.name || "attachment.pdf"), url: a.url })) };
    chrome.runtime.sendMessage({ type: "wq-run", job });
  }
});
chrome.runtime.onMessage.addListener(m => { if (m?.type === "wq-status") window.postMessage({ type: "jaliyat-wq-status", ...m }, location.origin); });
