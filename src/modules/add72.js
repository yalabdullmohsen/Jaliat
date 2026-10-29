/* ===== v72: Copilot الرسمي (Microsoft Graph) داخل إنجاز في كل الصفحات =====
   - الوضع الافتراضي: محادثة Copilot عبر Graph بلا جسر (الوزارة وافقت على الربط الرسمي). الجسر يبقى خياراً.
   - كل سؤال يحمل تلقائياً: ما على الشاشة الآن + بيانات النظام المتعلقة بالسؤال + (أول رسالة) تعليمات تنفيذ الأوامر.
   - زر Copilot عائم في كل صفحة يفتح لوحة جانبية بنفس المحادثة. */
const cpMode = () => LS.get("cp-mode", "ms");
const cpTxt = el => el ? String(el.innerText || "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim() : "";
function pageCtx(){
  const v = S.view === "copilot" ? "" : cpTxt($("#view")).slice(0, 5000), dr = $("#drawer"), d = dr && !dr.hidden ? cpTxt(dr).slice(0, 3000) : "";
  if (!v && !d) return "";
  return `## الشاشة المفتوحة الآن في إنجاز: ${TITLES[S.view] || S.view}\n${v}${d ? `\n\n## النافذة المفتوحة فوقها\n${d}` : ""}`;
}
function cpCtx(q, first){
  const who = `المستخدم: ${S.me?.name || ""}${S.admin ? " (مدير النظام)" : ""}، اليوم ${TODAY} (توقيت الكويت).`;
  const ins = first ? String(PRIME_MSG || "").replace(/لا تلخص الملف الآن[^\n]*/g, "").trim() + "\n\n" : "";
  return `${ins}${who}\n\n${pageCtx()}\n\n## بيانات النظام المتعلقة بالسؤال\n${cpData(q, 12000)}`.slice(0, 22800);
}
function msScroll(){ const l = $("#ms-log"); if (l && l.closest("#cppanel")) l.scrollTop = l.scrollHeight; else window.scrollTo(0, document.body.scrollHeight); }

/* صفحة Copilot: الوضع الرسمي أولاً، والجسر لمن يختاره */
const _vCopilot72 = vCopilot;
vCopilot = function(){
  if (cpMode() === "bridge") return _vCopilot72().replace('<div class="cp', `<div class="cp-mode"><span>تستخدم الجسر.</span><button type="button" class="btn btn-ghost" data-cpmode="ms">العودة إلى Copilot الرسمي (بلا إضافة)</button></div><div class="cp`);
  return `${vCopilotMS()}<div class="cp-mode"><span class="s">Copilot الرسمي عبر حساب الوزارة، ويستلم بيانات الشاشة والنظام تلقائياً مع كل سؤال.</span><button type="button" class="btn btn-ghost" data-cpmode="bridge">استخدام الجسر بدلاً منه</button></div>`;
};
document.addEventListener("click", ev => { const t = ev.target.closest("[data-cpmode]"); if (!t) return; LS.set("cp-mode", t.dataset.cpmode); render(); });

/* زر عائم + لوحة جانبية في كل الصفحات */
function cpPanelHtml(){ return `<div class="cpp-h"><b>${icon("i-spark", 16)} Copilot</b><span class="s">يرى الصفحة المفتوحة وبيانات النظام</span><button type="button" class="btn btn-ghost" data-cppfull>صفحة كاملة</button><button type="button" class="cm-x" data-cppx aria-label="إغلاق">×</button></div><div class="cpp-b">${vCopilotMS()}</div>`; }
function cpPanelFill(focus){ const p = $("#cppanel"); if (!p || p.hidden) return; const had = focus || p.contains(document.activeElement), q = $("#ms-in-q")?.value || ""; p.innerHTML = cpPanelHtml(); const i = $("#ms-in-q"); if (i) { i.value = q; if (had) i.focus(); } cpxRender(); msScroll(); }
async function cpPanelOpen(on){
  let p = $("#cppanel"); if (!p) { document.body.insertAdjacentHTML("beforeend", `<aside id="cppanel" class="cpp" hidden aria-label="Copilot"></aside>`); p = $("#cppanel"); }
  p.hidden = !on; document.documentElement.classList.toggle("cpp-on", on); if (!on) { p.innerHTML = ""; return; }
  cpPanelFill(true);
  if (msReady() && !MS.app) { try { await msInit(); if (MS.account) await msCheckCopilot(); } catch (_) {} cpPanelFill(); }
}
function cpFab(){
  if (!S.me) return; let b = $("#cpfab");
  if (!b) { document.body.insertAdjacentHTML("beforeend", `<button type="button" id="cpfab" class="cpfab" title="اسأل Copilot عن هذه الصفحة" aria-label="Copilot">${icon("i-spark", 22)}<span>Copilot</span></button>`); b = $("#cpfab"); }
  const onPage = S.view === "copilot"; b.hidden = onPage; if (onPage && !$("#cppanel")?.hidden) cpPanelOpen(false);
}
const _afterRender72 = afterRender;
afterRender = function(v){ _afterRender72(v); cpFab(); if (v !== "copilot") cpPanelFill(); };
const _msSignIn72 = msSignIn;
msSignIn = async function(){ await _msSignIn72(); cpPanelFill(); };
document.addEventListener("click", ev => {
  if (ev.target.closest("#cpfab")) return cpPanelOpen($("#cppanel")?.hidden !== false);
  if (ev.target.closest("[data-cppx]")) return cpPanelOpen(false);
  if (ev.target.closest("[data-cppfull]")) { cpPanelOpen(false); go("copilot"); render(); }
});
document.addEventListener("keydown", ev => { if (ev.key === "Escape" && $("#cppanel") && !$("#cppanel").hidden && !ev.target.closest?.("#drawer")) cpPanelOpen(false); });
NEWF.splice(0, 0, ["v72-copilot", "nav:copilot", "Copilot داخل إنجاز في كل صفحة", "زر «Copilot» أسفل الشاشة في كل صفحة: اسأله عن الصفحة المفتوحة مباشرة، فهو يستلم ما على الشاشة وبيانات النظام تلقائياً مع كل سؤال، بحساب الوزارة وبلا إضافة."]);

/* بدون موافقة مدير تقنية المعلومات: لا نتوقف ولا نطلب منه شيئاً. السؤال يُجهَّز كاملاً (سؤالك + الشاشة + بيانات النظام) ويُنسخ، وزر واحد يفتح Copilot للصقه. مع الجسر يُرسَل تلقائياً. */
function msFallbackRes(q){
  const full = `${cpCtx(q, true)}\n\nسؤالي/أمري: ${q}\n\nإذا كان طلبي تعديلاً على النظام فضع كتلة jaliyat-actions في نهاية ردك.`;
  cpCopy(full).catch(() => {});
  if (hasBridge()) { setTimeout(() => cpAsk(q, true), 0); return { role:"assistant", text:"أُرسل سؤالك مع بيانات الصفحة والنظام إلى Copilot عبر الجسر، والرد يظهر في صفحة Copilot." }; }
  return { role:"assistant", text:"جهّزت سؤالك مع الصفحة المفتوحة وبيانات النظام ونسختها. اضغط «فتح Copilot» ثم الصق (Ctrl+V) واضغط إرسال. وإن طلب تعديلاً انسخ رده كاملاً والصقه في خانة السؤال هنا وأرسل، فتظهر أوامره للتنفيذ.", refs:[{ url:"https://m365.cloud.microsoft/chat/", title:"فتح Copilot" }], full };
}
const _msMsg72 = msMsg;
msMsg = function(m, i){ let h = _msMsg72(m, i); if (m.full) h = h.replace(/<\/div><\/div>$/, `<div class="tools"><button type="button" data-mscf="${i}">نسخ السؤال مع البيانات</button></div></div></div>`); return h; };
document.addEventListener("click", ev => { const t = ev.target.closest("[data-mscf]"); if (!t) return; const m = MS.chat[+t.dataset.mscf]; if (m?.full) cpCopy(m.full).then(ok => toast(ok ? "نُسخ السؤال مع البيانات" : "تعذّر النسخ")); });

const _msSend72 = msSend;
msSend = async function(q){ const a = String(q || "").includes('"op"') ? findActions(String(q)) : []; if (a.length) { const i = $("#ms-in-q"); if (i) i.value = ""; CPX.list = a.map(x => ({ a:x })); cpxRender(); return toast(`وصلت ${a.length} أوامر من رد Copilot، راجعها ثم اضغط «تنفيذ»`); } return _msSend72(q); };
