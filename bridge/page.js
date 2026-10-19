// Runs on the Jaliyat system: tells the page the bridge is installed and enables Copilot framing for this tab.
// v2.0: the system can send updated settings (extra Microsoft hosts) without reinstalling the bridge.
document.documentElement.dataset.copilotBridge = "1";
document.documentElement.dataset.copilotBridgeV = "2.2";
const register = hosts => chrome.runtime.sendMessage({ type: "jaliyat-register", hosts }, r => { document.documentElement.dataset.copilotBridge = r?.ok ? "ready" : "1"; });
register([]);
window.addEventListener("message", e => {
  if (e.source !== window || e.origin !== location.origin) return;
  if (e.data?.type === "jaliyat-bridge-hosts" && Array.isArray(e.data.hosts)) register(e.data.hosts.filter(h => typeof h === "string").slice(0, 30));
});
