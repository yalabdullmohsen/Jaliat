/* ================= v9.5: Microsoft 365 Copilot INSIDE the system (Microsoft sign-in) ================= */
const MS = {
  clientId:"217623bd-10f8-4c6d-8bcf-98d9c01f6842", tenant:"9cf4a75d-773e-479d-8dce-6ba02350810d",
  base:["User.Read", "Files.Read"],
  scopes:["Sites.Read.All", "Mail.Read", "People.Read.All", "OnlineMeetingTranscript.Read.All", "Chat.Read", "ChannelMessage.Read.All", "ExternalItem.Read.All", "Files.Read", "Files.ReadWrite"],
  app:null, account:null, conv:null, chat:[], busy:false, files:[], web:false, err:"", consentUrl:"",
};
const msReady = () => !/^__/.test(MS.clientId);
function loadMsal(){
  if (window.msal) return Promise.resolve();
  return new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/@azure/msal-browser@3.27.0/lib/msal-browser.min.js"; s.onload = res; s.onerror = () => rej(new Error("msal")); document.head.appendChild(s); });
}
async function msInit(){
  if (MS.app) return MS.app;
  await loadMsal();
  MS.app = new msal.PublicClientApplication({ auth:{ clientId:MS.clientId, authority:`https://login.microsoftonline.com/${MS.tenant}`, redirectUri:new URL("auth.html", location.href).href, navigateToLoginRequestUrl:false },
    cache:{ cacheLocation:"localStorage" } });
  await MS.app.initialize();
  MS.account = MS.app.getActiveAccount() || MS.app.getAllAccounts()[0] || null;
  MS.consentUrl = `https://login.microsoftonline.com/${MS.tenant}/v2.0/adminconsent?client_id=${MS.clientId}&scope=${encodeURIComponent(MS.scopes.map(x => "https://graph.microsoft.com/" + x).join(" "))}&redirect_uri=${encodeURIComponent(new URL("auth.html", location.href).href)}`;
  return MS.app;
}
async function msToken(interactive, scopes){
  scopes = scopes || MS.base;
  await msInit();
  if (MS.account) { try { return (await MS.app.acquireTokenSilent({ scopes, account:MS.account })).accessToken; } catch (e) { if (!interactive) throw e; } }
  else if (!interactive) throw new Error("signin");
  const r = await MS.app.acquireTokenPopup({ scopes, prompt:MS.account ? undefined : "select_account", loginHint:MS.account?.username });
  MS.account = r.account; MS.app.setActiveAccount(r.account); return r.accessToken;
}
async function graph(path, body, method = "POST", scopes){
  const tk = await msToken(false, scopes);
  const r = await fetch("https://graph.microsoft.com" + path, { method, headers:{ Authorization:"Bearer " + tk, "Content-Type":"application/json" }, body:body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let d = {}; try { d = JSON.parse(t); } catch (_) {}
  if (!r.ok) { const e = new Error(d?.error?.message || t.slice(0, 200) || String(r.status)); e.status = r.status; e.code = d?.error?.code; throw e; }
  return d;
}
function msErr(e){
  const m = String(e?.errorMessage || e?.message || e || "");
  if (/AADSTS65001|AADSTS90094|AADSTS90008|consent|admin/i.test(m) || e?.errorCode === "consent_required") return { t:"تحتاج صلاحيات Copilot موافقة مدير تقنية المعلومات في الوزارة مرة واحدة. أرسل له رابط الموافقة أدناه، وإلى أن يوافق استخدم «فتح في Copilot».", consent:true };
  if (/AADSTS50105|AADSTS50020|not assigned|blocked|AADSTS53/i.test(m)) return { t:"سياسة الوزارة تمنع هذا التطبيق حالياً. يحتاج موافقة تقنية المعلومات (الرابط أدناه).", consent:true };
  if (/license|copilot/i.test(m) || e?.status === 403) return { t:"حسابك لا يملك ترخيص Microsoft 365 Copilot لهذه الخدمة، أو أن الوزارة لم تفعّلها." };
  if (/popup_window_error|empty_window|popup/i.test(m)) return { t:"المتصفح منع نافذة الدخول. اسمح بالنوافذ المنبثقة لهذا الموقع ثم حاول مجدداً." };
  if (/user_cancelled|cancel/i.test(m)) return { t:"أُغلقت نافذة الدخول قبل الإكمال." };
  if (/fetch|network/i.test(m)) return { t:"لا يوجد اتصال بالإنترنت." };
  return { t:"تعذّر الاتصال بـ Copilot: " + m.slice(0, 180) };
}
function msMsg(m, i){
  if (m.role === "user") return `<div class="msg u"><span class="av">${esc((S.me?.name || "أ").trim().charAt(0))}</span><div class="bub">${esc(m.text).replace(/\n/g, "<br>")}</div></div>`;
  const refs = (m.refs || []).slice(0, 8);
  return `<div class="msg a"><span class="av">${icon("i-spark", 20)}</span><div class="bub">${m.err ? `<span class="err">${esc(m.text)}</span>` : md(String(m.text).replace(/<\/?(Event|File|Person|Email|Chat|Message)[^>]*>/g, ""))}
    ${refs.length ? `<div class="cp-refs">${refs.map(r => `<a href="${esc(r.url)}" target="_blank" rel="noopener">${icon("i-doc", 13)} ${esc(r.title || "مصدر")}</a>`).join("")}</div>` : ""}
    ${m.err ? "" : `<div class="tools"><button type="button" data-mscopy="${i}">نسخ</button></div>`}</div></div>`;
}
function vCopilotMS(){
  const signed = !!MS.account;
  if (!msReady() || !signed) return `<div class="cp cp-simple"><div class="cp-box"><span class="cp-badge">${icon("i-spark", 16)} Microsoft 365 Copilot</span>
      <h3>Copilot داخل نظام الجاليات</h3>
      <p class="s" style="max-width:620px;margin:0;color:var(--muted)">سجّل دخولك بحساب الوزارة مرة واحدة، وبعدها Copilot يجاوبك هنا داخل النظام: يبحث في ملفاتك وبريدك واجتماعاتك، ويعرف بيانات النظام.</p>
      <button class="btn btn-primary btn-lg ms-btn" id="ms-in" type="button"${msReady() ? "" : " disabled"}><svg width="20" height="20" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg> تسجيل الدخول بحساب Microsoft 365</button>
      ${MS.err ? `<div class="check warn" style="text-align:right;width:100%">${esc(MS.err)}${MS.errConsent ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button type="button" class="btn" id="ms-consent-copy">نسخ رابط موافقة المدير</button></div>` : ""}</div>` : ""}
    </div></div>`;
  return `<div class="ai cp">
    <div class="cp-bar"><span class="cp-badge">${icon("i-spark", 16)} Microsoft 365 Copilot</span><span class="s">متصل: <b dir="ltr">${esc(MS.account.username)}</b></span><button type="button" class="btn btn-ghost" id="ms-out">خروج من مايكروسوفت</button></div>
    <div class="ai-log" id="ms-log">${MS.chat.length ? MS.chat.map(msMsg).join("") : `<div class="ai-hero"><span class="orb">${icon("i-spark", 34)}</span><h3>اسأل Copilot عن ملفاتك وبريدك وبيانات النظام</h3><div class="ai-chips">${CP_PROMPTS.slice(0, 8).map((p, i) => `<button type="button" data-msp="${i}"><b>${esc(p[0])}</b><span>${esc(p[1])}</span></button>`).join("")}</div></div>`}</div>
    <div id="cpx"></div>
    <div style="display:grid;gap:8px">
      <div class="cp-opts"><label><input type="checkbox" id="ms-web"${MS.web ? " checked" : ""}> البحث في الإنترنت أيضاً</label>
        <button type="button" class="btn btn-ghost" id="ms-file">${icon("i-doc")}ملفاتي في OneDrive</button>${MS.files.map((f, i) => `<span class="chip">${esc(f.name)} <button type="button" class="cm-x" data-msf="${i}">×</button></span>`).join("")}</div>
      <div id="ms-pick"></div>
      <form class="ai-box" id="ms-form"><textarea id="ms-in-q" rows="1" placeholder="اسأل Copilot…  (Enter للإرسال)"></textarea><button class="btn btn-primary" type="submit" id="ms-send">إرسال</button>${MS.chat.length ? `<button class="btn btn-ghost" type="button" id="ms-new">جديدة</button>` : ""}</form>
    </div></div>`;
}
async function msSignIn(){
  const b = $("#ms-in"); if (b) { b.disabled = true; b.lastChild.textContent = " جارٍ فتح نافذة الدخول…"; }
  try { MS.err = ""; MS.errConsent = false; await msToken(true); await msCheckCopilot(); toast("تم تسجيل الدخول بحساب Microsoft 365"); }
  catch (e) { console.error(e); const x = msErr(e); MS.err = x.t; MS.errConsent = !!x.consent; }
  if (S.view === "copilot") render();
}
async function msSend(q){
  q = String(q || "").trim(); if (!q || MS.busy) return;
  const log = $("#ms-log"); if (!log) return;
  if (!MS.chat.length) log.innerHTML = "";
  MS.chat.push({ role:"user", text:q });
  log.insertAdjacentHTML("beforeend", msMsg(MS.chat[MS.chat.length - 1]) + `<div class="msg a" id="ms-wait"><span class="av">${icon("i-spark", 20)}</span><div class="bub"><span class="typing"><i></i><i></i><i></i></span> <span class="s">Copilot يبحث في ملفاتك وبريدك وبيانات النظام…</span></div></div>`);
  const inp = $("#ms-in-q"); if (inp) { inp.value = ""; inp.style.height = "auto"; }
  msScroll();
  MS.busy = true; if ($("#ms-send")) $("#ms-send").disabled = true;
  let res;
  try {
    if (!MS.copilotOk) { try { await msToken(true, MS.scopes); MS.copilotOk = true; } catch (e) { if (msErr(e).consent) throw { needsAdmin:true }; throw e; } }
    if (!MS.conv) MS.conv = (await graph("/beta/copilot/conversations", {}, "POST", MS.scopes)).id;
    const body = { message:{ text:q }, locationHint:{ timeZone:"Asia/Kuwait" }, contextualResources:{ webContext:{ isWebEnabled:!!MS.web } } };
    if (MS.files.length) body.contextualResources.files = MS.files.map(f => ({ uri:f.url }));
    { const txt = cpCtx(q, MS.chat.filter(m => m.role === "user").length === 1); const parts = []; for (let i = 0; i < txt.length; i += 3800) parts.push({ text:txt.slice(i, i + 3800) }); body.additionalContext = parts.slice(0, 6); }
    let d;
    try { d = await graph(`/beta/copilot/conversations/${MS.conv}/chat`, body, "POST", MS.scopes); }
    catch (e) { if (e.status === 400 && body.additionalContext) { body.additionalContext = body.additionalContext.slice(0, 2); d = await graph(`/beta/copilot/conversations/${MS.conv}/chat`, body, "POST", MS.scopes); } else throw e; }
    const msgs = (d.messages || []).filter(m => m.text); const last = msgs[msgs.length - 1];
    const refs = (last?.attributions || []).map(a => ({ url:a.seeMoreWebUrl || "", title:a.providerDisplayName || "" })).filter(r => r.url);
    res = { role:"assistant", text:last?.text || "—", refs }; const acts = findActions(res.text); if (acts.length) { CPX.list = acts.map(a => ({ a })); setTimeout(cpxRender, 0); }
  } catch (e) {
    if (e?.needsAdmin || msErr(e).consent) res = msFallbackRes(q);
    else { console.error(e); if (e.status === 404) MS.conv = null; res = { role:"assistant", err:true, text:msErr(e).t }; } }
  MS.busy = false; if ($("#ms-send")) $("#ms-send").disabled = false;
  MS.chat.push(res); $("#ms-wait")?.remove();
  $("#ms-log")?.insertAdjacentHTML("beforeend", msMsg(res, MS.chat.length - 1));
  if (!$("#ms-new")) $("#ms-send")?.insertAdjacentHTML("afterend", `<button class="btn btn-ghost" type="button" id="ms-new">جديدة</button>`);
  msScroll();
}
async function msPick(){
  const box = $("#ms-pick"); if (!box) return;
  box.innerHTML = `<div class="panel"><div class="panel-b" style="display:grid;gap:10px"><div class="search"><svg><use href="#i-search"/></svg><input class="f" id="ms-fq" placeholder="ابحث باسم الملف ثم Enter…"></div><div class="list" id="ms-fl"></div></div></div>`;
  $("#ms-fq").focus(); msFiles("");
}
async function msFiles(q){
  const fl = $("#ms-fl"); if (!fl) return; fl.innerHTML = `<div class="s" style="padding:8px">جارٍ البحث…</div>`;
  try {
    let items;
    let d;
    if (q) d = await graph(`/v1.0/me/drive/root/search(q='${encodeURIComponent(q.replace(/'/g, "''"))}')?$top=25`, null, "GET");
    else d = await graph("/v1.0/me/drive/recent?$top=25", null, "GET");
    items = (d.value || []).map(x => x.remoteItem ? { ...x.remoteItem, name:x.name || x.remoteItem.name } : x);
    MS.found = items.filter(x => x?.webUrl && !x.folder);
    fl.innerHTML = MS.found.map((x, i) => `<div class="li"><span class="ic">${icon("i-doc")}</span><span style="min-width:0"><a class="t" href="${esc(x.webUrl)}" target="_blank" rel="noopener">${esc(x.name)}</a><br><span class="s">${esc(fmtTime(x.lastModifiedDateTime || x.fileSystemInfo?.lastModifiedDateTime || ""))}</span></span><button type="button" class="btn btn-ghost" data-msadd="${i}">إرفاق للسؤال</button></div>`).join("") || `<div class="s" style="padding:8px">لا نتائج</div>`;
  } catch (e) { fl.innerHTML = `<div class="err" style="padding:8px">${esc(msErr(e).t)}</div>`; }
}
document.addEventListener("click", ev => {
  const t = ev.target.closest("button"); if (!t) return;
  if (t.id === "ms-in") return msSignIn();
  if (t.id === "cp-legacy") { const q = prompt("اكتب سؤالك:"); if (q) cpAsk(q, cpNeedsData(q)); return; }
  if (t.id === "ms-consent-copy") { cpCopy(`السلام عليكم، أرجو الموافقة على ربط نظام أنشطة الجاليات مع Microsoft 365 Copilot عبر الرابط التالي (موافقة مدير مرة واحدة):\n${MS.consentUrl}`).then(ok => toast(ok ? "نُسخ رابط الموافقة، أرسله لتقنية المعلومات" : MS.consentUrl)); return; }
  if (t.id === "ms-out") { (async () => { try { await msInit(); if (MS.account) await MS.app.clearCache({ account:MS.account }); } catch (_) {} MS.account = null; MS.conv = null; MS.chat = []; render(); })(); return; }
  if (t.id === "ms-new") { MS.chat = []; MS.conv = null; return render(); }
  if (t.id === "ms-file") return msPick();
  if (t.dataset.msadd !== undefined) { const x = MS.found?.[+t.dataset.msadd]; if (x && !MS.files.some(f => f.url === x.webUrl)) MS.files.push({ name:x.name, url:x.webUrl }); return render(); }
  if (t.dataset.msf !== undefined) { MS.files.splice(+t.dataset.msf, 1); return render(); }
  if (t.dataset.msp !== undefined) return msSend(CP_PROMPTS[+t.dataset.msp][2]);
  if (t.dataset.mscopy !== undefined) { const m = MS.chat[+t.dataset.mscopy]; if (m) cpCopy(m.text).then(() => toast("نُسخ")); return; }
});
document.addEventListener("change", ev => { if (ev.target.id === "ms-web") MS.web = ev.target.checked; });
document.addEventListener("submit", ev => { if (ev.target.id === "ms-form") { ev.preventDefault(); msSend($("#ms-in-q").value); } });
document.addEventListener("keydown", ev => {
  if (ev.target.id === "ms-in-q" && ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); $("#ms-form").requestSubmit(); }
  if (ev.target.id === "ms-fq" && ev.key === "Enter") { ev.preventDefault(); msFiles(ev.target.value.trim()); }
});
const _afterRender6 = afterRender;
afterRender = function(v){ _afterRender6(v); if (v !== "copilot") return;
  if (msReady() && !MS.app) msInit().then(async () => { if (MS.account) { await msCheckCopilot(); if (S.view === "copilot") render(); } }).catch(() => {});
  const inp = $("#ms-in-q"); if (inp) { inp.addEventListener("input", () => { inp.style.height = "auto"; inp.style.height = Math.min(200, inp.scrollHeight) + "px"; }); if (matchMedia("(min-width:901px)").matches) inp.focus(); }
  if (MS.chat.length) msScroll(); };

function msAdminBox(q){
  const box = $("#ms-pick"); if (!box) return;
  box.innerHTML = `<div class="check warn" style="display:grid;gap:10px"><b>الرد داخل النظام بانتظار موافقة تقنية المعلومات (مرة واحدة)</b>
    <span>دخولك بحساب Microsoft 365 وملفاتك تعمل الآن داخل النظام. أما إجابات Copilot نفسها فتشترط مايكروسوفت أن يوافق مدير الوزارة عليها مرة واحدة. حتى ذلك الحين أرسل سؤالك لـ Copilot بضغطة:</span>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn btn-primary" id="ms-fallback">${icon("i-spark")} أرسل السؤال إلى Copilot</button><button type="button" class="btn" id="ms-consent-copy">نسخ رابط موافقة المدير</button></div></div>`;
}
document.addEventListener("click", ev => { const t = ev.target.closest("button"); if (!t) return;
  if (t.id === "ms-fallback") { let q = MS.pendingQ || $("#ms-in-q")?.value || ""; if (MS.files.length) q += "\n\nاستخدم هذه الملفات:\n" + MS.files.map(f => f.url).join("\n"); cpAsk(q, cpNeedsData(q)); }
});
/* check once whether IT has approved Copilot, silently */
async function msCheckCopilot(){ try { await msToken(false, MS.scopes); MS.copilotOk = true; } catch (e) { MS.copilotOk = false; } }
