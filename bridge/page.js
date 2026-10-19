// Runs on the Jaliyat system: tells the page the bridge is installed and enables Copilot framing for this tab.
document.documentElement.dataset.copilotBridge = "1";
document.documentElement.dataset.copilotBridgeV = "1.1";
chrome.runtime.sendMessage({ type: "jaliyat-register" }, r => { document.documentElement.dataset.copilotBridge = r?.ok ? "ready" : "1"; });
