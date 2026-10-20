/* ================= v23: account requests approved by Yousef only + safer password change ================= */
const OWNERS_U = ["yousef", "fayez"];
const isOwner = () => OWNERS_U.includes(S.me?.username) && S.admin;
S.acctReqs = [];
const ARK = "enjaz-acct-req";
const arGet = () => { try { return JSON.parse(localStorage.getItem(ARK) || "null"); } catch (_) { return null; } };
const arSet = v => { try { v ? localStorage.setItem(ARK, JSON.stringify(v)) : localStorage.removeItem(ARK); } catch (_) {} };

/* ---------- login screen: «طلب إنشاء حساب» ---------- */
function lgFine(){ return $("#login .fine"); }
async function arStatusLine(){
  const r = arGet(), f = lgFine(); if (!f) return;
  f.innerHTML = `النظام خاص بموظفي القسم. <button type="button" class="lnk" data-arnew>طلب إنشاء حساب</button>`;
  if (!r) return;
  const { data } = await sb.rpc("account_request_status", { p_id:r.id, p_username:r.u }).catch(() => ({}));
  const m = { pending:["warn", "طلبك بانتظار موافقة مدير النظام"], approved:["ok", `تمت الموافقة على حسابك ✓ — ادخل باسم المستخدم «${r.u}» وكلمة المرور التي اخترتها`], rejected:["bad", "لم تتم الموافقة على طلب الحساب"] }[data];
  if (!m) return;
  f.insertAdjacentHTML("beforebegin", `<div class="ar-st ${m[0]}" id="ar-st">${esc(m[1])}${data !== "pending" ? ` <button type="button" class="lnk" data-arclear>إخفاء</button>` : ""}</div>`);
  if (data === "approved") { $("#lg-user").value = r.u; }
}
function arForm(){
  const card = $("#login .login-card"); if (!card) return; $("#ar-st")?.remove();
  $("#lg-form").hidden = true; lgFine().hidden = true;
  card.insertAdjacentHTML("beforeend", `<form class="lg-form" id="ar-form" novalidate>
    <h2 class="ar-h">طلب إنشاء حساب</h2><p class="ar-s">يصل طلبك لمدير النظام، ولا يُفعَّل الحساب إلا بعد موافقته.</p>
    <div class="fld"><label for="ar-name">الاسم الكامل</label><input class="f" id="ar-name" autocomplete="name"></div>
    <div class="fld"><label for="ar-title">المسمى الوظيفي</label><input class="f" id="ar-title"></div>
    <div class="fld"><label for="ar-phone">رقم الهاتف</label><input class="f" id="ar-phone" inputmode="tel" dir="ltr"></div>
    <div class="fld"><label for="ar-user">اسم المستخدم (بالإنجليزي)</label><input class="f" id="ar-user" dir="ltr" autocapitalize="none" spellcheck="false" autocomplete="username" placeholder="مثال: ahmad"></div>
    <div class="fld"><label for="ar-pass">كلمة المرور</label><input class="f" id="ar-pass" type="password" dir="ltr" autocomplete="new-password" placeholder="6 أحرف على الأقل"></div>
    <div class="fld"><label for="ar-pass2">أعد كلمة المرور</label><input class="f" id="ar-pass2" type="password" dir="ltr" autocomplete="new-password"></div>
    <p class="err" id="ar-err" hidden></p>
    <button class="btn btn-primary btn-lg" type="submit" id="ar-go">إرسال الطلب</button><button type="button" class="lnk" data-arback>رجوع لتسجيل الدخول</button></form>`);
  $("#ar-name").focus();
}
function arBack(){ $("#ar-form")?.remove(); $("#lg-form").hidden = false; lgFine().hidden = false; arStatusLine(); }
document.addEventListener("submit", async ev => {
  if (ev.target.id !== "ar-form") return; ev.preventDefault();
  const v = id => $("#" + id).value.trim(), err = m => { const e = $("#ar-err"); e.textContent = m; e.hidden = !m; };
  if (!v("ar-name") || !v("ar-user")) return err("اكتب الاسم واسم المستخدم");
  if ($("#ar-pass").value.length < 6) return err("كلمة المرور 6 أحرف على الأقل");
  if ($("#ar-pass").value !== $("#ar-pass2").value) return err("كلمتا المرور غير متطابقتين");
  const b = $("#ar-go"); b.disabled = true; b.textContent = "جارٍ الإرسال…";
  const { data, error } = await sb.rpc("request_account", { p_name:v("ar-name"), p_username:v("ar-user"), p_phone:v("ar-phone"), p_title:v("ar-title"), p_password:$("#ar-pass").value });
  b.disabled = false; b.textContent = "إرسال الطلب";
  if (error) return err(/fetch|network/i.test(error.message) ? "لا يوجد اتصال بالإنترنت" : error.message);
  arSet({ id:data.id, u:v("ar-user").toLowerCase() }); arBack();
});

/* ---------- owner: approve / reject ---------- */
async function loadAcctReqs(){ if (!isOwner()) return; const { data } = await sb.from("account_requests").select("id,name,username,phone,title,status,role,created_at,decided_at,decided_by").order("created_at", { ascending:false }).limit(200); S.acctReqs = data || []; }
const arPending = () => S.acctReqs.filter(r => r.status === "pending");
function arPanel(){ const L = arPending(); if (!isOwner() || !L.length) return "";
  return `<div class="panel ar-panel"><div class="panel-h"><h3>طلبات إنشاء حساب بانتظار موافقتك</h3><span class="chip gold">${L.length}</span></div><div class="panel-b wq-list">${L.map(r => `<button type="button" class="wq-i" data-arview="${r.id}"><span class="wa-av">${esc(r.name.trim().charAt(0))}</span><span class="wq-t"><b>${esc(r.name)}</b><span class="s" dir="ltr">${esc(r.username)}${r.phone ? " · " + esc(r.phone) : ""}</span></span><span class="wq-m"><span class="s">${esc(r.title || "")}</span><span class="s">${ago(r.created_at)}</span></span></button>`).join("")}</div></div>`; }
function arView(id){
  const r = S.acctReqs.find(x => x.id === id); if (!r) { go("users"); return toast("الطلب غير موجود أو تم البت فيه"); }
  if (!isOwner()) return toast("الموافقة على الحسابات ليوسف وفايز فقط");
  S.form = { kind:"acctreq", id };
  openDrawer("طلب إنشاء حساب", `<div class="q-meta"><b>${esc(r.name)}</b><span class="s">${esc(r.title || "")}</span><span class="s" dir="ltr">${esc(r.username)}${r.phone ? " · " + esc(r.phone) : ""}</span><span class="s">أُرسل ${ago(r.created_at)}</span></div>
    ${r.status !== "pending" ? `<div class="check ${r.status === "approved" ? "ok" : "warn"}"><b>${r.status === "approved" ? "تمت الموافقة" : "مرفوض"}</b>${r.decided_by ? `<span>بواسطة ${esc(pname(r.decided_by))}</span>` : ""}</div>` :
    `${fld("ar-role", "الصلاحية عند الموافقة", `<select class="f" id="ar-role"><option value="editor" selected>محرر — يضيف ويعدّل</option><option value="viewer">مشاهد — عرض فقط</option><option value="admin">مدير</option></select>`)}
    <span class="hint">كلمة المرور اختارها صاحب الطلب ومحفوظة مشفّرة — لا يطّلع عليها أحد.</span>`}`,
    r.status === "pending" ? `<button class="btn btn-ok" data-arok="${r.id}">موافق</button><button class="btn btn-ghost bad-t" data-arno="${r.id}">غير موافق</button><button class="btn btn-ghost" data-close>لاحقاً</button>` : `<button class="btn btn-ghost" data-close>إغلاق</button>`);
}
async function arDecide(id, ok, btn){
  btn.disabled = true;
  const { data, error } = await sb.functions.invoke("manage-users", { body:{ action:ok ? "approve_request" : "reject_request", id, role:$("#ar-role")?.value || "editor" } });
  btn.disabled = false;
  if (error || data?.error) { let m = data?.error; if (!m) { try { m = (await error.context.json()).error; } catch (_) { m = "تعذّر التنفيذ"; } } return toast(m); }
  const r = S.acctReqs.find(x => x.id === id); if (r) r.status = ok ? "approved" : "rejected";
  closeDrawer(); toast(ok ? "أُنشئ الحساب ✓ — يقدر صاحبه يدخل الآن" : "رُفض الطلب"); if (/مسبقاً/.test("")) {}; if (ok) loadProfiles?.(); render();
}
let arCh = null;
const _boot9a = boot9;
boot9 = function(){ _boot9a(); if (!isOwner()) return; loadAcctReqs().then(() => { if ($("#drawer").hidden && ["users", "home"].includes(S.view)) render(); });
  if (arCh) sb.removeChannel(arCh); arCh = sb.channel("acr").on("postgres_changes", { event:"*", schema:"public", table:"account_requests" }, () => loadAcctReqs().then(() => { if ($("#drawer").hidden && ["users", "home"].includes(S.view)) render(); })).subscribe(); };
const _vUsers23 = vUsers;
vUsers = function(){ return arPanel() + _vUsers23(); };
const _prio23 = priorities;
priorities = function(){ const P = _prio23(); const n = isOwner() ? arPending().length : 0; if (n) P.push({ w:97, k:"gold", t:`${n} طلب إنشاء حساب بانتظار موافقتك`, s:arPending().map(r => r.name).join("، "), act:{ go:"users", l:"مراجعة" } }); return P.sort((a, b) => b.w - a.w); };
const _openLink23 = openLink;
openLink = function(h){ const s = String(h || "").replace(/^#/, ""); if (s.startsWith("acctreq:")) { const id = s.slice(8); return loadAcctReqs().then(() => { if (S.view !== "users") go("users"); arView(id); }); } return _openLink23(h); };

/* ---------- password change: confirm the current password first ---------- */
passForm = function(){
  S.form = { kind:"pass2" };
  openDrawer("تغيير كلمة المرور", `${fld("pw-old", "كلمة المرور الحالية", `<input class="f" id="pw-old" type="password" dir="ltr" autocomplete="current-password">`)}
    ${fld("pw-new", "كلمة المرور الجديدة", `<input class="f" id="pw-new" type="password" dir="ltr" autocomplete="new-password" placeholder="6 أحرف على الأقل">`)}
    ${fld("pw-new2", "أعد كتابة الجديدة", `<input class="f" id="pw-new2" type="password" dir="ltr" autocomplete="new-password">`)}
    <label class="pw-show"><input type="checkbox" id="pw-show"> إظهار كلمات المرور</label><div class="pw-meter" id="pw-meter"><i></i></div><span class="hint" id="pw-hint">استخدم 8 أحرف أو أكثر مع أرقام.</span>`,
    `<button class="btn btn-primary" data-pwsave>تغيير كلمة المرور</button><button class="btn btn-ghost" data-close>إلغاء</button>`);
};
async function pwSave(btn){
  const o = $("#pw-old").value, a = $("#pw-new").value, b = $("#pw-new2").value;
  if (!o) return toast("اكتب كلمة المرور الحالية"); if (a.length < 6) return toast("الجديدة 6 أحرف على الأقل"); if (a !== b) return toast("الكلمتان الجديدتان غير متطابقتين"); if (a === o) return toast("الجديدة مثل الحالية");
  btn.disabled = true;
  const { error:e1 } = await sb.auth.signInWithPassword({ email:`${S.me.username}@${DOMAIN}`, password:o });
  if (e1) { btn.disabled = false; return toast("كلمة المرور الحالية غير صحيحة"); }
  const { error } = await sb.auth.updateUser({ password:a }); btn.disabled = false;
  if (error) return toast(/different|same/i.test(error.message) ? "اختر كلمة مرور مختلفة" : "تعذّر التغيير");
  closeDrawer(); toast("تغيّرت كلمة المرور ✓");
}
const _palAll23 = palAll;
palAll = function(){ const A = _palAll23(); A.unshift({ g:"إجراءات", t:"تغيير كلمة المرور", s:"", ic:"i-lock", run:passForm, txt:"تغيير كلمة المرور باسورد" }); return A; };

document.addEventListener("input", ev => { if (ev.target.id !== "pw-new") return; const v = ev.target.value; const s = (v.length >= 8) + /\d/.test(v) + /[a-zA-Z]/.test(v) + /[^a-zA-Z0-9]/.test(v) + (v.length >= 12);
  const m = $("#pw-meter i"); if (m) { m.style.width = (s * 20) + "%"; m.style.background = s < 2 ? "var(--bad)" : s < 4 ? "var(--warn)" : "var(--ok)"; } const h = $("#pw-hint"); if (h) h.textContent = s < 2 ? "ضعيفة" : s < 4 ? "متوسطة" : "قوية ✓"; });
document.addEventListener("change", ev => { if (ev.target.id === "pw-show") document.querySelectorAll("#pw-old,#pw-new,#pw-new2").forEach(i => i.type = ev.target.checked ? "text" : "password"); });
document.addEventListener("click", ev => { const t = ev.target.closest("button"); if (!t) return; const D = t.dataset;
  if (D.arnew !== undefined) return arForm(); if (D.arback !== undefined) return arBack(); if (D.arclear !== undefined) { arSet(null); return $("#ar-st")?.remove(); }
  if (D.arview) return arView(D.arview); if (D.arok) return arDecide(D.arok, true, t); if (D.arno) { if (D.sure !== "1") { D.sure = "1"; t.textContent = "اضغط مرة أخرى للتأكيد"; return; } return arDecide(D.arno, false, t); }
  if (D.pwsave !== undefined) return pwSave(t);
});
// show the request link / status whenever the login screen is shown
const _showLogin23 = showLogin;
showLogin = function(msg){ const r = _showLogin23(msg); arStatusLine(); return r; };
if (!$("#login")?.hidden) arStatusLine();
const mp = $("#mypass"); if (mp) mp.textContent = "تغيير كلمة المرور";
document.addEventListener("click", e => { if (e.target.closest("#mypass")) { e.stopImmediatePropagation(); e.preventDefault(); passForm(); } }, true);
