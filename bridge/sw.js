// Allow Microsoft 365 Copilot to be shown inside the Jaliyat system tab only (frame headers removed for that tab's sub-frames).
const HOSTS = ["cloud.microsoft", "microsoft.com", "microsoftonline.com", "office.com", "office.net", "sharepoint.com", "live.com"];
async function allowTab(tabId) {
  const id = 1000 + (tabId % 2000000);
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [id],
    addRules: [{
      id, priority: 1,
      action: { type: "modifyHeaders", responseHeaders: [
        { header: "x-frame-options", operation: "remove" },
        { header: "content-security-policy", operation: "remove" },
        { header: "content-security-policy-report-only", operation: "remove" }
      ] },
      condition: { tabIds: [tabId], resourceTypes: ["sub_frame"], requestDomains: HOSTS }
    }]
  });
}
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg?.type === "jaliyat-register" && sender.tab?.id >= 0) { allowTab(sender.tab.id).then(() => reply({ ok: true }), e => reply({ ok: false, e: String(e) })); return true; }
});
chrome.tabs.onRemoved.addListener(tabId => chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [1000 + (tabId % 2000000)] }).catch(() => {}));
