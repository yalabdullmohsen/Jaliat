// Allow Microsoft 365 Copilot to be shown inside the Jaliyat system tab only (frame headers removed for that tab's sub-frames).
// v2.0: extra Microsoft hosts can be supplied by the system (only Microsoft domains are accepted).
const HOSTS = ["cloud.microsoft", "microsoft.com", "microsoftonline.com", "office.com", "office.net", "sharepoint.com", "live.com", "microsoft365.com", "office365.com", "msauth.net", "msftauth.net", "bing.com", "whatsapp.com"];
// v2.2: WhatsApp Web is shown inside «إنجاز» too (only when framed by the system).
const OK = /^([a-z0-9-]+\.)*(cloud\.microsoft|microsoft\.com|microsoftonline\.com|office\.com|office\.net|sharepoint\.com|live\.com|microsoft365\.com|office365\.com|msauth\.net|msftauth\.net|bing\.com|msecnd\.net|azureedge\.net)$/;
async function allowTab(tabId, extra) {
  const id = 1000 + (tabId % 2000000);
  const domains = [...new Set([...HOSTS, ...(extra || []).map(h => String(h).toLowerCase().trim()).filter(h => OK.test(h))])];
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [id],
    addRules: [{
      id, priority: 1,
      action: { type: "modifyHeaders", responseHeaders: [
        { header: "x-frame-options", operation: "remove" },
        { header: "content-security-policy", operation: "remove" },
        { header: "content-security-policy-report-only", operation: "remove" }
      ] },
      condition: { tabIds: [tabId], resourceTypes: ["sub_frame"], requestDomains: domains }
    }]
  });
}
// v2.1: also allow framing for any window (tab or installed app) whose page is the Jaliyat system itself.
async function allowSystem() {
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [1], addRules: [{ id: 1, priority: 1,
    action: { type: "modifyHeaders", responseHeaders: [{ header: "x-frame-options", operation: "remove" }, { header: "content-security-policy", operation: "remove" }, { header: "content-security-policy-report-only", operation: "remove" }] },
    condition: { initiatorDomains: ["yalabdullmohsen.github.io"], resourceTypes: ["sub_frame"], requestDomains: HOSTS } }] });
}
chrome.runtime.onInstalled.addListener(() => allowSystem().catch(() => {}));
chrome.runtime.onStartup.addListener(() => allowSystem().catch(() => {}));
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg?.type === "jaliyat-register") { allowSystem().catch(() => {}); if (!(sender.tab?.id >= 0)) { reply({ ok: true }); return; } allowTab(sender.tab.id, msg.hosts).then(() => reply({ ok: true }), e => reply({ ok: false, e: String(e) })); return true; }
});
chrome.tabs.onRemoved.addListener(tabId => chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [1000 + (tabId % 2000000)] }).catch(() => {}));
