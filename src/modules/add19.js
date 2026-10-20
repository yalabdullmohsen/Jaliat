/* ================= v18: the section's WhatsApp (official Cloud API) inside «إنجاز» ================= */
Object.assign(TITLES, { whatsapp:"واتساب القسم" });
S.waMsgs = []; S.waCfg = { on:false }; S.waAdmin = null;
const waKey = p => String(p || "").replace(/[^\d]/g, "").replace(/^00/, "").replace(/^(\d{8})$/, "965$1");
async function loadWa(){ S.waCfg = { on:false }; } /* Cloud API set aside: WhatsApp Web inside «إنجاز» replaces it، no server round-trip */
let waCh = null;
function liveWa(){}
const waThreads = () => { const m = new Map(); for (const x of S.waMsgs) { const k = waKey(x.phone); if (!m.has(k)) m.set(k, { phone:k, name:"", last:x, n:0, unread:0 }); const t = m.get(k); if (!t.name && x.name) t.name = x.name; t.n++; } return [...m.values()]; };
const waWho = k => { const c = S.coords.find(c => waKey(c.phone) === k); return c ? `${c.name}${c.comm ? "، " + c.comm : ""}` : ""; };
const waSeen = () => { try { return JSON.parse(localStorage.getItem("wa-seen") || "{}"); } catch (_) { return {}; } };
function waMarkSeen(k){ try { const s = waSeen(); s[k] = new Date().toISOString(); localStorage.setItem("wa-seen", JSON.stringify(s)); } catch (_) {} }
function waUnread(){ const s = waSeen(); return waThreads().filter(t => t.last.dir === "in" && (!s[t.phone] || s[t.phone] < t.last.created_at)).length; }
const waTime = iso => { const d = new Date(iso); return d.toLocaleString("ar-KW-u-nu-latn", { hour:"numeric", minute:"2-digit", day:"numeric", month:"numeric", hour12:true }); };
function waScroll(){ const b = $("#wa-thread"); if (b) b.scrollTop = b.scrollHeight; }

function vWhatsApp(){
  const T = waThreads(), sel = S.f.wa || T[0]?.phone || "", seen = waSeen();
  const setup = S.admin && !S.waCfg.on ? waSetupCard() : !S.waCfg.on ? `<div class="check"><b>واتساب القسم غير مربوط بعد</b><span>يربطه مدير النظام مرة واحدة من هذه الصفحة.</span></div>` : "";
  if (sel) waMarkSeen(sel);
  const msgs = S.waMsgs.filter(m => waKey(m.phone) === sel).slice().reverse();
  const reqIds = [...new Set(msgs.map(m => m.req_id).filter(Boolean))];
  const lastIn = msgs.filter(m => m.dir === "in").pop(); const open24 = lastIn && (Date.now() - new Date(lastIn.created_at)) < 24 * 3600e3;
  return `${setup}<div class="wa-wrap panel">
    <div class="wa-side"><div class="wa-sh"><b>المحادثات</b><button type="button" class="btn btn-ghost" data-wanew>${icon("i-plus")} رسالة جديدة</button></div>
      ${T.map(t => { const un = t.last.dir === "in" && (!seen[t.phone] || seen[t.phone] < t.last.created_at) && t.phone !== sel; return `<button type="button" class="wa-t${t.phone === sel ? " on" : ""}" data-wat="${t.phone}"><span class="wa-av">${esc((t.name || waWho(t.phone) || "؟").trim().charAt(0))}</span><span class="wa-tt"><b>${esc(t.name || waWho(t.phone) || "+" + t.phone)}</b><span class="s">${t.last.dir === "out" ? "أنت: " : ""}${esc(String(t.last.body || (t.last.media?.length ? "📎 مرفق" : "")).slice(0, 60))}</span></span><span class="wa-tm"><span class="s">${waTime(t.last.created_at)}</span>${un ? `<i class="wa-dot"></i>` : ""}</span></button>`; }).join("") || `<div class="empty">لا توجد محادثات بعد${S.waCfg.on ? "" : "، تظهر هنا بعد ربط الرقم"}</div>`}</div>
    <div class="wa-main">${sel ? `<div class="wa-mh"><div><b>${esc(T.find(t => t.phone === sel)?.name || waWho(sel) || "+" + sel)}</b><span class="s" dir="ltr">+${sel}</span></div><div class="br-acts">${reqIds.map(id => { const r = S.reqs.find(x => x.id === id); return r ? `<button type="button" class="btn btn-ghost" data-prio-open="req:${id}">الطلب ط-${r.no}</button>` : ""; }).join("")}</div></div>
      <div class="wa-thread" id="wa-thread">${msgs.map(m => `<div class="wa-b ${m.dir}">${m.body ? `<p>${esc(m.body).replace(/\n/g, "<br>")}</p>` : ""}${(m.media || []).map(f => f.path ? `<button type="button" class="chip" data-wamedia="${esc(f.path)}">📎 ${esc(f.name || "مرفق")}</button>` : f.url ? `<a class="chip" href="${esc(f.url)}" target="_blank" rel="noopener">📎 ${esc(f.filename || "ملف")}</a>` : "").join("")}<span class="wa-meta">${m.dir === "out" && m.sent_by ? esc(pname(m.sent_by)) + " · " : ""}${waTime(m.created_at)}${m.dir === "out" ? ` · ${({ sent:"أُرسلت", delivered:"وصلت", read:"قُرئت", failed:"فشل" })[m.status] || ""}` : ""}</span></div>`).join("")}</div>
      ${S.canWrite ? `<div class="wa-comp">${open24 || !S.waCfg.on ? "" : `<span class="hint">مرّ أكثر من 24 ساعة على آخر رسالة منه، واتساب يسمح فقط بقالب معتمد، أو افتح المحادثة في تطبيق واتساب.</span>`}<textarea class="f" id="wa-in" rows="2" placeholder="اكتب ردك…"></textarea><div class="br-acts"><button type="button" class="btn btn-primary" data-wasend="${sel}">إرسال من رقم القسم</button><button type="button" class="btn btn-ghost" data-waapp="${sel}">${icon("i-wa")} فتح في واتساب</button></div></div>` : ""}`
      : `<div class="empty">اختر محادثة</div>`}</div></div>`;
}
function waSetupCard(){
  const hook = `${SB_URL}/functions/v1/wa-webhook`, c = S.waAdmin || {};
  return `<div class="panel"><div class="panel-h"><h3>ربط واتساب القسم (مرة واحدة)</h3><span class="s">واتساب الرسمي من Meta، Cloud API</span></div><div class="panel-b wa-setup">
    <ol class="wa-steps"><li>من <b>Meta for Developers</b> أنشئ تطبيق (Business) وأضف منتج <b>WhatsApp</b> وأضف رقم القسم.</li>
      <li>في <b>WhatsApp ← Configuration ← Webhook</b> الصق:<div class="wa-cp"><span>Callback URL</span><code dir="ltr">${esc(hook)}</code><button type="button" class="btn btn-ghost" data-wacopy="${esc(hook)}">نسخ</button></div><div class="wa-cp"><span>Verify token</span><code dir="ltr">${esc(c.verify || "…")}</code><button type="button" class="btn btn-ghost" data-wacopy="${esc(c.verify || "")}">نسخ</button></div>ثم فعّل الاشتراك في <b>messages</b>.</li>
      <li>الصق القيم الأربع هنا واضغط «ربط»، تُحفظ في الخادم ولا يطّلع عليها أحد من مستخدمي النظام.</li></ol>
    <div class="g2">${fld("wa-pid", "Phone number ID", `<input class="f" id="wa-pid" dir="ltr" value="${esc(c.phone_id || "")}">`)}${fld("wa-waba", "WhatsApp Business Account ID", `<input class="f" id="wa-waba" dir="ltr" value="${esc(c.waba_id || "")}">`)}</div>
    <div class="g2">${fld("wa-tok", `Access token دائم ${c.has_token ? "✓ محفوظ" : ""}`, `<input class="f" id="wa-tok" dir="ltr" type="password" placeholder="${c.has_token ? "اتركه فارغاً للإبقاء" : "EAA…"}">`)}${fld("wa-sec", `App secret ${c.has_secret ? "✓ محفوظ" : ""}`, `<input class="f" id="wa-sec" dir="ltr" type="password" placeholder="${c.has_secret ? "اتركه فارغاً للإبقاء" : ""}">`)}</div>
    ${fld("wa-disp", "رقم القسم (للعرض)", `<input class="f" id="wa-disp" dir="ltr" placeholder="+965…" value="${esc(S.waCfg.display || "")}">`)}
    <div class="br-acts"><button type="button" class="btn btn-primary" data-wasave>ربط</button></div></div></div>`;
}
async function waSend(phone, text, extra){
  const { data, error } = await sb.functions.invoke("wa-send", { body:{ phone, text, ...(extra || {}) } });
  if (error) { let msg = "تعذّر الإرسال"; try { const j = await error.context.json(); msg = j.error || msg; } catch (_) {} throw new Error(msg); }
  return data;
}
// every «واتساب للمنسق» in the system now sends from the section's number when it is linked
const _waOpen19 = waOpen;
waOpen = function(phone, text){ if (!S.waCfg.on || !S.canWrite) return _waOpen19(phone, text); const k = waKey(phone); if (k.length < 10) return toast("لا يوجد رقم هاتف صحيح");
  S.form = { kind:"wa", phone:k };
  openDrawer("إرسال واتساب من رقم القسم", `<div class="q-meta"><b>${esc(waWho(k) || "+" + k)}</b><span class="s" dir="ltr">+${k}</span></div>${fld("wa-txt", "الرسالة", `<textarea class="f" id="wa-txt" rows="9">${esc(text || "")}</textarea>`)}`,
    `<button class="btn btn-primary" data-wasend2="${k}">إرسال</button><button class="btn btn-ghost" data-waapp="${k}">${icon("i-wa")} فتح في واتساب بدلاً من ذلك</button><button class="btn btn-ghost" data-close>إلغاء</button>`); };
const _boot9wa = boot9;
boot9 = function(){ _boot9wa(); loadWa().then(() => { liveWa(); waBadge(); if (S.view === "whatsapp" && $("#drawer").hidden) { render(); waScroll(); } }); if (false) sb.rpc("wa_config_get").then(r => { if (!r.error) { S.waAdmin = r.data; if (S.view === "whatsapp" && $("#drawer").hidden) render(); } }); };
function waBadge(){ const b = $('#nav [data-nav="whatsapp"]'); if (!b) return; let i = b.querySelector(".nb"); const n = waUnread(); if (!n) { i?.remove(); return; } if (!i) { i = document.createElement("i"); i.className = "nb"; b.appendChild(i); } i.textContent = n; }
const _afterRender19 = afterRender;
afterRender = function(){ _afterRender19(); waBadge(); if (S.view === "whatsapp") waScroll(); };
const _prio19 = priorities;
priorities = function(){ const P = _prio19(); const n = waUnread(); if (n) P.push({ w:88, k:"t1", t:`${n} محادثة واتساب بانتظار الرد`, s:"رسائل المنسقين على رقم القسم", act:{ go:"whatsapp", l:"واتساب" } }); return P.sort((a, b) => b.w - a.w); };
document.addEventListener("click", async ev => {
  const t = ev.target.closest("button"); if (!t) return; const D = t.dataset;
  if (D.wat) { S.f.wa = D.wat; render(); return waScroll(); }
  if (D.wacopy !== undefined) { const ok = await cpCopy(D.wacopy); return toast(ok ? "نُسخ" : "تعذّر النسخ"); }
  if (D.waapp) return _waOpen19(D.waapp, $("#wa-in")?.value || $("#wa-txt")?.value || "");
  if (D.wanew !== undefined) { const p = prompt("رقم الهاتف (مثال 9xxxxxxx):"); if (p) { S.f.wa = waKey(p); render(); } return; }
  if (D.wamedia) { const { data } = await sb.storage.from("requests").createSignedUrl(D.wamedia, 3600); if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener"); return; }
  if (D.wasend || D.wasend2) { const k = D.wasend || D.wasend2, box = $(D.wasend ? "#wa-in" : "#wa-txt"), txt = box?.value.trim(); if (!txt) return toast("اكتب الرسالة"); t.disabled = true;
    try { await waSend(k, txt); if (box) box.value = ""; toast("أُرسلت من رقم القسم"); if (D.wasend2) closeDrawer(); } catch (e) { toast(e.message); } finally { t.disabled = false; } return; }
  if (D.wasave !== undefined) { const v = id => $("#" + id)?.value.trim() || ""; if (!v("wa-pid") && !S.waAdmin?.phone_id) return toast("الصق Phone number ID");
    const { data, error } = await sb.rpc("wa_config_set", { p_token:v("wa-tok"), p_phone_id:v("wa-pid"), p_waba_id:v("wa-waba"), p_app_secret:v("wa-sec"), p_display:v("wa-disp") }); if (error) return writeFail(error);
    S.waAdmin = data; await loadWa(); render(); return toast(S.waCfg.on ? "رُبط واتساب القسم ✓" : "حُفظ، أكمل القيم الناقصة"); }
});

/* ---------- sidebar «واتساب القسم»: one tap opens the chats directly ---------- */
const isTouchDev = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
let waWin = null;
function openWaChats(){
  if (isTouchDev()) { location.href = "whatsapp://"; return; }
  if (waWin && !waWin.closed) { try { waWin.focus(); return; } catch (_) {} }
  waWin = window.open("https://web.whatsapp.com/", "enjaz-whatsapp");
}
document.addEventListener("click", ev => { const b = ev.target.closest('#nav [data-nav="whatsapp"], #tabbar [data-nav="whatsapp"]'); if (!b || S.waCfg.on || waEmbedOk() || !isTouchDev()) return; ev.preventDefault(); ev.stopImmediatePropagation(); $("#side")?.classList.remove("open"); openWaChats(); }, true);

/* ---------- v19: WhatsApp Web shown INSIDE «إنجاز» (bridge 2.2 removes the frame block for the system only) ---------- */
const waEmbedOk = () => hasBridge() && parseFloat(document.documentElement.dataset.copilotBridgeV || "0") >= 2.3;
function waEmbed(show){
  let box = $("#wa-embed");
  if (show && !box) { box = document.createElement("div"); box.id = "wa-embed"; box.innerHTML = `<iframe src="https://web.whatsapp.com/" title="واتساب القسم" allow="clipboard-read; clipboard-write; microphone; camera; autoplay; notifications"></iframe>`; $("#view").after(box); }
  if (box) box.hidden = !show;
  document.body.classList.toggle("wa-on", !!show);
}
const _vWhatsApp20 = vWhatsApp;
vWhatsApp = function(){
  if (S.waCfg.on) return _vWhatsApp20();
  if (waEmbedOk()) return "";
  if (isTouchDev()) return `<div class="wa-need panel"><div class="panel-b"><b>واتساب على الجوال والآيباد يفتح في تطبيق واتساب</b><span class="s">آبل لا تسمح بعرض واتساب داخل صفحة أخرى على الآيفون والآيباد.</span><div class="br-acts"><button type="button" class="btn btn-primary" data-waopen>فتح واتساب</button></div></div></div>`;
  const has = hasBridge();
  return `<div class="wa-need panel"><div class="panel-b"><b>${has ? "حدّث الجسر لنسخة 2.3 ليظهر واتساب هنا" : "ركّب «جسر إنجاز» مرة واحدة على هذا الجهاز ليظهر واتساب هنا"}</b>
    <ol class="wa-steps">
      <li><a href="jaliyat-copilot.zip" download class="btn btn-primary">⬇ نزّل الجسر</a> ثم افتح الملف من التنزيلات واضغط <b>«استخراج الكل»</b>${has ? " فوق مجلد <b>jaliyat-copilot</b> القديم" : ""}.</li>
      <li>انسخ هذا العنوان والصقه في شريط عنوان Edge: <button type="button" class="btn btn-ghost" data-cpy="edge://extensions">📋 edge://extensions</button></li>
      <li>فعّل <b>«وضع المطوّر»</b> (أسفل يسار الصفحة)، ثم اضغط ${has ? "<b>«إعادة تحميل»</b> على «جسر إنجاز»" : "<b>«تحميل غير المضغوط»</b> واختر مجلد <b>jaliyat-copilot</b> المستخرج"}.</li>
      <li>ارجع لـ «إنجاز» واضغط <b>F5</b>، ثم «واتساب القسم» وامسح الكود من جوال القسم (الإعدادات ← الأجهزة المرتبطة)، أول مرة فقط.</li>
    </ol>
    <div class="br-acts"><button type="button" class="btn btn-ghost" data-waopen>افتح واتساب ويب مؤقتاً</button></div></div></div>`;
};
const _afterRender20 = afterRender;
afterRender = function(){ _afterRender20(); waEmbed(S.view === "whatsapp" && !S.waCfg.on && waEmbedOk()); };
// preload in the background once the system is ready, so opening it later is instant
const _boot9w20 = boot9;
boot9 = function(){ _boot9w20(); setTimeout(() => { if (waEmbedOk() && !isTouchDev() && !$("#wa-embed")) { waEmbed(true); waEmbed(S.view === "whatsapp"); } }, 4000); };
document.addEventListener("click", ev => { const t = ev.target.closest("[data-waopen]"); if (t) openWaChats(); });
document.addEventListener("click", async ev => { const t = ev.target.closest("[data-cpy]"); if (!t) return; try { await navigator.clipboard.writeText(t.dataset.cpy); toast("نُسخ، الصقه في شريط العنوان واضغط Enter"); } catch (_) { toast(t.dataset.cpy); } });
