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
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [1, 2], addRules: [{ id: 1, priority: 1,
    action: { type: "modifyHeaders", responseHeaders: [{ header: "x-frame-options", operation: "remove" }, { header: "content-security-policy", operation: "remove" }, { header: "content-security-policy-report-only", operation: "remove" }] },
    condition: { initiatorDomains: ["injazkwt.com", "yalabdullmohsen.github.io"], resourceTypes: ["sub_frame"], requestDomains: HOSTS } },
    // v2.3: WhatsApp Web refuses to load when it sees it is requested as a frame — present the frame request as a normal page.
    { id: 2, priority: 2, action: { type: "modifyHeaders", requestHeaders: [{ header: "sec-fetch-dest", operation: "set", value: "document" }, { header: "sec-fetch-site", operation: "set", value: "none" }],
      responseHeaders: [{ header: "x-frame-options", operation: "remove" }, { header: "content-security-policy", operation: "remove" }, { header: "content-security-policy-report-only", operation: "remove" }, { header: "cross-origin-opener-policy", operation: "remove" }, { header: "cross-origin-embedder-policy", operation: "remove" }] },
      condition: { initiatorDomains: ["injazkwt.com", "yalabdullmohsen.github.io"], resourceTypes: ["sub_frame"], requestDomains: ["web.whatsapp.com"] } }] });
}
chrome.runtime.onInstalled.addListener(() => allowSystem().catch(() => {}));
chrome.runtime.onStartup.addListener(() => allowSystem().catch(() => {}));
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg?.type === "jaliyat-register") { allowSystem().catch(() => {}); if (!(sender.tab?.id >= 0)) { reply({ ok: true }); return; } allowTab(sender.tab.id, msg.hosts).then(() => reply({ ok: true }), e => reply({ ok: false, e: String(e) })); return true; }
});
chrome.tabs.onRemoved.addListener(tabId => chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [1000 + (tabId % 2000000)] }).catch(() => {}));

// ===== v2.5: تنفيذ كتب «إنجاز» داخل وثيقة بجلسة الموظف نفسه =====
const WQ = "https://watheqa.awqaf.gov.kw";
const RUNS = new Map(); // tabId -> { job, from, phase, timer }
const tell = (r, o) => { try { chrome.tabs.sendMessage(r.from, { type: "wq-status", id: r.job.id, ...o }); } catch (_) {} };
const finish = (tabId, o, close) => { const r = RUNS.get(tabId); if (!r) return; clearTimeout(r.timer); RUNS.delete(tabId); tell(r, o); if (close) setTimeout(() => chrome.tabs.remove(tabId).catch(() => {}), 1500); };
async function ping(tabId) { for (let i = 0; i < 60; i++) { try { const r = await chrome.tabs.sendMessage(tabId, { type: "wq-ping" }); if (r?.ok) return r; } catch (_) {} await new Promise(r => setTimeout(r, 500)); } return null; }
async function startRun(job, from) {
  const url = job.mode === "draft" ? `${WQ}/Documents/Compose?draftFor=${encodeURIComponent(job.draftFor || "")}` : `${WQ}/Documents/Compose`;
  if (job.mode === "draft" && !job.draftFor) return chrome.tabs.sendMessage(from, { type: "wq-status", id: job.id, state: "failed", error: "لم تُحدَّد جهة المسودة في الإعدادات" }).catch(() => {});
  const tab = await chrome.tabs.create({ url, active: true });
  const r = { job, from, phase: "load", timer: setTimeout(() => finish(tab.id, { state: "failed", error: "انتهت المهلة قبل اكتمال الكتاب" }, false), 240000) };
  RUNS.set(tab.id, r); tell(r, { state: "working", step: "فتح وثيقة" });
}
async function onLoaded(tabId, tab) {
  const r = RUNS.get(tabId); if (!r) return;
  if (/\/Account\/Login|\/Login/i.test(tab.url || "")) return finish(tabId, { state: "failed", error: "وثيقة تطلب تسجيل الدخول، سجّل دخولك فيها ثم أعد المحاولة" }, false);
  if (r.phase === "load") {
    r.phase = "fill"; const p = await ping(tabId);
    if (!p) return finish(tabId, { state: "failed", error: "لم تستجب صفحة وثيقة للإضافة" }, false);
    const res = await chrome.tabs.sendMessage(tabId, { type: "wq-fill", job: r.job }).catch(() => null);
    if (!res) { r.phase = "submitted"; clearTimeout(r.timer); r.timer = setTimeout(() => finish(tabId, { state: "failed", error: "لم تُقبل الصفحة الحفظ أو الإرسال، راجع النموذج في وثيقة" }, false), 60000); return; } // الصفحة انتقلت بعد الضغط
    if (!res.ok) return finish(tabId, { state: "failed", error: res.error }, false);
    if (res.dry) return finish(tabId, { state: "dry", step: "جاهز للحفظ (تجربة)", who: res.who }, false);
    r.phase = "submitted"; clearTimeout(r.timer);
    r.timer = setTimeout(() => finish(tabId, { state: "failed", error: "لم تُقبل الصفحة الحفظ أو الإرسال، راجع النموذج في وثيقة" }, false), 60000);
    return;
  }
  if (r.phase === "submitted" && !/\/Documents\/Compose/.test(tab.url || "")) {
    r.phase = "verify"; const p = await ping(tabId);
    const v = p ? await chrome.tabs.sendMessage(tabId, { type: "wq-verify", job: r.job }).catch(() => null) : null;
    if (v?.ok) finish(tabId, { state: r.job.mode === "send" ? "sent" : "drafted", ref: v.ref }, true);
    else finish(tabId, { state: "failed", error: v?.error || "لم أستطع التحقق من الحفظ في وثيقة" }, false);
  }
}
chrome.tabs.onUpdated.addListener((tabId, info, tab) => { if (info.status === "complete") onLoaded(tabId, tab).catch(() => {}); });
chrome.tabs.onRemoved.addListener(tabId => { const r = RUNS.get(tabId); if (r && r.phase !== "verify") finish(tabId, { state: "failed", error: "أُغلقت نافذة وثيقة قبل الاكتمال" }, false); });
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg?.type === "wq-run" && sender.tab?.id >= 0 && msg.job) { startRun(msg.job, sender.tab.id).then(() => reply({ ok: true }), e => reply({ ok: false, e: String(e) })); return true; }
  if (msg?.type === "wq-progress" && sender.tab?.id >= 0) { const r = RUNS.get(sender.tab.id); if (r) tell(r, { state: "working", step: msg.step, who: msg.who }); return; }
  if (msg?.type === "wq-fetch" && /^https:\/\/[a-z0-9-]+\.supabase\.co\//.test(msg.url || "")) {
    fetch(msg.url).then(async x => { const b = new Uint8Array(await x.arrayBuffer()); let s = ""; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); reply({ ok: x.ok, type: x.headers.get("content-type"), b64: btoa(s) }); }).catch(() => reply({ ok: false })); return true; }
});
