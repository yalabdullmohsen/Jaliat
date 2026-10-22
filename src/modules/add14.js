/* ================= v13: personal notifications (push), request receipt, tasks & achievements, bridge card ================= */
Object.assign(TITLES, { tasks:"المهام والإنجاز" });
S.ntf = []; S.tasks = []; S.prefs = { off:[] }; S.push = { on:false, sup:"serviceWorker" in navigator && "PushManager" in window };
const NK = [
  ["request_new", "طلب وارد جديد"], ["request_status", "تغيّر حالة طلب استلمته"], ["request_ack", "تذكير بتأكيد استلام الطلب"], ["request_waiting", "طلبات متأخرة بدون إجراء", true],
  ["task_new", "مهمة جديدة مسندة لي"], ["task_seen", "اطّلاع الموظف على المهمة", true], ["task_progress", "استلام المهمة وبدء تنفيذها", true], ["task_due", "تذكير بمواعيد المهام والمتأخر منها"], ["task_done", "إنجاز المهام التي أسندتها", true],
  ["mention", "ذكري في تعليق"], ["comment", "تعليق على ما عدّلته"], ["act_changed", "تعديل أو حذف نشاط عدّلته"], ["note_new", "ملاحظات الفريق الجديدة"],
  ["booking_new", "حجوزات القاعات الجديدة"], ["booking_changed", "تعديل على حجوزاتي"], ["booking_today", "تذكير بحجوزات اليوم والمبدئية"],
  ["doc_expiring", "موافقات تقترب من الانتهاء (14/7/3/1 يوم)"], ["sermon_missing", "خطب جمعة غير مسجلة", true]];
const ago = iso => { const s = (Date.now() - new Date(iso)) / 1000; return s < 60 ? "الآن" : s < 3600 ? `قبل ${Math.round(s / 60)} د` : s < 86400 ? `قبل ${Math.round(s / 3600)} س` : fmtTime(iso); };

/* ---------- deep links (#req:id, #act:id, #task:id, #bk:id, #doc:no, #view) ---------- */
function openLink(h){
  h = String(h || "").replace(/^#/, ""); if (!h) return;
  const [k, ...r] = h.split(":"); const id = r.join(":");
  if (!id) { if (TITLES[k]) go(k); return; }
  if (k === "req") { if (S.view !== "inbox") go("inbox"); return reqForm(id); }
  if (k === "act") return S.byId.get(id) ? actForm(id) : toast("النشاط غير موجود");
  if (k === "kh") return khForm(id);
  if (k === "note") return noteForm(id);
  if (k === "doc") return docBy[id] ? listForm("doc", id) : go("docs");
  if (k === "bk") { if (S.view !== "halls") go("halls"); return bkForm(id); }
  if (k === "task") { if (S.view !== "tasks") go("tasks"); return taskForm(id); }
}
window.addEventListener("hashchange", () => { const h = location.hash.slice(1); if (h.includes(":")) openLink(h); });
navigator.serviceWorker?.addEventListener("message", e => { if (e.data?.type === "open") openLink(e.data.link); });

/* ---------- notifications data ---------- */
async function loadNtf(){ const { data, error } = await sb.from("notifications").select("*").eq("user_id", S.me.id).order("created_at", { ascending:false }).limit(80); if (!error) S.ntf = data || []; }
async function loadPrefs(){ const { data } = await sb.from("notif_prefs").select("*").eq("user_id", S.me.id).maybeSingle(); S.prefs = data || { off:[] }; }
let ntfCh = null;
function liveNtf(){
  if (ntfCh) sb.removeChannel(ntfCh);
  ntfCh = sb.channel("ntf-" + S.me.id).on("postgres_changes", { event:"INSERT", schema:"public", table:"notifications", filter:`user_id=eq.${S.me.id}` }, p => {
    S.ntf = [p.new, ...S.ntf.filter(x => x.id !== p.new.id)].slice(0, 80); bellRefresh();
    if (!document.hidden) toast(p.new.title); else if (!S.push.on) localNote(p.new);
    const pop = $("#bell-pop"); if (pop) { pop.remove(); bellOpen(); }
  }).on("postgres_changes", { event:"UPDATE", schema:"public", table:"notifications", filter:`user_id=eq.${S.me.id}` }, p => { S.ntf = S.ntf.map(x => x.id === p.new.id ? p.new : x); bellRefresh(); }).subscribe();
}
async function localNote(n){ if (!("Notification" in window) || Notification.permission !== "granted") return; try { const reg = await navigator.serviceWorker?.getRegistration(); reg?.showNotification(n.title, { body:n.body, icon:"icon-v2-192.png", badge:"icon-v2-192.png", dir:"rtl", lang:"ar", tag:"n" + n.id, data:{ link:n.link } }); } catch (_) {} }
async function ntfRead(ids){ ids = ids.filter(Boolean); if (!ids.length) return; const now = new Date().toISOString(); S.ntf.forEach(x => { if (ids.includes(x.id)) x.read_at = now; }); bellRefresh(); await sb.from("notifications").update({ read_at:now }).in("id", ids); }
const unread = () => S.ntf.filter(x => !x.read_at).length;

/* ---------- push subscription ---------- */
const b64u = s => { const p = "=".repeat((4 - s.length % 4) % 4); const r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(r, c => c.charCodeAt(0)); };
async function pushSync(ask){
  if (!S.push.sup) return false;
  try {
    if (Notification.permission === "default" && ask) await Notification.requestPermission();
    if (Notification.permission !== "granted") { S.push.on = false; return false; }
    const reg = await navigator.serviceWorker.ready; let sub = await reg.pushManager.getSubscription();
    if (!sub) { const { data:key } = await sb.rpc("vapid_public"); if (!key) return false; sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey:b64u(key) }); }
    const j = sub.toJSON(); const { error } = await sb.from("push_subs").upsert({ endpoint:j.endpoint, user_id:S.me.id, p256dh:j.keys.p256dh, auth:j.keys.auth, ua:navigator.userAgent.slice(0, 200) }, { onConflict:"endpoint" });
    S.push.on = !error; return S.push.on;
  } catch (e) { console.warn("push", e); S.push.on = false; return false; }
}
devNotify = function(){}; dailyDigest = function(){}; /* the server sends these now, per person */

/* ---------- bell: personal notifications + live summary ---------- */
bellRefresh = function(){ const b = $("#bell"); if (!b) return; const n = unread(); const bn = b.querySelector(".bn"); bn.textContent = n > 99 ? "99+" : n || ""; bn.hidden = !n; b.classList.toggle("off", !S.push.on && S.push.sup); };
bellOpen = function(){
  const old = $("#bell-pop"); if (old) return old.remove();
  const tab = S.bellTab || "mine"; const A = alerts();
  const p = document.createElement("div"); p.id = "bell-pop"; p.className = "bell-pop wide";
  p.innerHTML = `<div class="bell-h"><div class="seg"><button type="button" class="${tab === "mine" ? "on" : ""}" data-btab="mine">إشعاراتي${unread() ? ` <span class="num">${unread()}</span>` : ""}</button><button type="button" class="${tab === "now" ? "on" : ""}" data-btab="now">ملخص الآن</button></div><button type="button" class="btn btn-ghost" data-nset title="إعدادات الإشعارات">⚙</button></div>
    ${!S.push.on && S.push.sup ? `<button type="button" class="bell-on" data-pushon>${icon("i-bell")} <span><b>فعّل الإشعارات على هذا الجهاز</b><br><span class="s">لتصلك التنبيهات حتى والنظام مغلق</span></span></button>` : ""}
    <div class="bell-l">${tab === "mine" ? (S.ntf.length ? S.ntf.slice(0, 40).map(n => `<button type="button" class="bell-i ${n.read_at ? "" : "new"}" data-nlink="${esc(n.link || "")}" data-nid="${n.id}"><i></i><span><b>${esc(n.title)}</b>${n.body ? `<br><span class="s">${esc(n.body)}</span>` : ""}<br><span class="s num">${ago(n.created_at)}</span></span></button>`).join("") : `<div class="empty s">لا توجد إشعارات بعد</div>`)
      : A.map(a => `<button type="button" class="bell-i ${a.k}" data-go="${a.go}"${a.f ? ` data-f="${esc(JSON.stringify(F0(a.f)))}"` : ""}><i></i><span><b>${esc(a.t)}</b>${a.s ? `<br><span class="s">${esc(a.s)}</span>` : ""}</span></button>`).join("")}</div>
    ${tab === "mine" && unread() ? `<button type="button" class="btn btn-ghost" data-nall>تحديد الكل كمقروء</button>` : ""}`;
  document.body.appendChild(p);
  const out = ev => { if (!p.contains(ev.target) && !ev.target.closest("#bell")) { p.remove(); document.removeEventListener("mousedown", out, true); } }; setTimeout(() => document.addEventListener("mousedown", out, true));
};
function nSettings(){
  $("#bell-pop")?.remove(); S.form = { kind:"nset" };
  const off = new Set(S.prefs.off || []);
  openDrawer("إعدادات الإشعارات", `
    <div class="check ${S.push.on ? "ok" : "warn"}"><b>${S.push.on ? "الإشعارات مفعّلة على هذا الجهاز ✓" : "الإشعارات غير مفعّلة على هذا الجهاز"}</b><span>${S.push.sup ? (S.push.on ? "تصلك التنبيهات حتى والنظام مغلق. فعّلها أيضاً على جوالك وأي جهاز آخر تستخدمه." : Notification.permission === "denied" ? "المتصفح يمنع الإشعارات: اضغط على القفل بجانب الرابط ← الإشعارات ← سماح، ثم حدّث الصفحة." : "اضغط «تفعيل» واختر «سماح».") : "هذا المتصفح لا يدعم الإشعارات. على الآيفون: ثبّت النظام على الشاشة الرئيسية (مشاركة ← إضافة للشاشة الرئيسية) ثم افتحه منها."}</span>
      <span class="br-acts">${!S.push.on && S.push.sup ? `<button type="button" class="btn btn-primary" data-pushon>تفعيل على هذا الجهاز</button>` : ""}<button type="button" class="btn" data-ntest>إرسال إشعار تجربة</button></span></div>
    <div class="fld"><label>اختر ما يصلك</label><div class="nk">${NK.filter(k => !k[2] || S.admin).map(([k, l]) => `<label><input type="checkbox" data-nk="${k}"${off.has(k) ? "" : " checked"}> ${esc(l)}</label>`).join("")}</div></div>
    <span class="hint">كل شخص يصله ما يخصه فقط: طلباته، مهامه، تعليقات عليه، وحجوزاته. ملخص الصباح يصل الساعة 8:00 ص.</span>`,
    `<button class="btn btn-primary" data-nsave>حفظ</button><button class="btn btn-ghost" data-close>إغلاق</button>`);
}
async function nSave(){
  const off = [...document.querySelectorAll("[data-nk]")].filter(x => !x.checked).map(x => x.dataset.nk);
  const { error } = await sb.from("notif_prefs").upsert({ user_id:S.me.id, off }, { onConflict:"user_id" }); if (error) return writeFail(error);
  S.prefs.off = off; closeDrawer(); toast("حُفظت إعدادات الإشعارات");
}

/* =============== request receipt confirmation =============== */
const rqNo = r => r?.no ? `ط-${r.no}` : "";
function receiptText(r){ const f = rqRead();
  return `السلام عليكم ورحمة الله وبركاته\n${f.coord ? `الأخ الفاضل/ ${f.coord} حفظه الله\n` : ""}\nنفيدكم باستلام طلبكم${f.subj ? ` بخصوص «${f.subj}»` : ""}${f.org ? ` المقدم من ${f.org}` : ""}، وقد سُجّل برقم *${rqNo(r)}* بتاريخ ${fmt(TODAY)}.\n${S.rqActs.length ? `عدد الأنشطة المطلوبة: ${S.rqActs.length}\n` : ""}سيتم دراسة الطلب والرد عليكم في أقرب وقت، ونرجو ذكر رقم الطلب عند المراجعة.${SIGN}`; }
async function rqAck(via){
  const r = await rqSave(true); if (!r) return;
  if (via === "wa") { const f = rqRead(); const list = f.phone ? [{ name:f.coord, phone:f.phone }] : S.coords.filter(c => c.comm === f.comm && c.phone); if (!list.length) { const ok = await cpCopy(receiptText(r)); toast(ok ? "لا يوجد رقم، نُسخ نص التأكيد" : "لا يوجد رقم هاتف"); } else waPick(list, () => receiptText(r)); }
  const ack = { at:new Date().toISOString(), by:S.me.id, via };
  const data = { ...r.data, ack }; const st = r.status === "جديد" ? "قيد المراجعة" : r.status;
  const { error } = await sb.from("requests").update({ data, status:st }).eq("id", r.id); if (error) return writeFail(error);
  Object.assign(r, { data, status:st }); toast(`أُكّد استلام الطلب ${rqNo(r)}`); reqForm(r.id);
}
const _reqForm14 = reqForm;
reqForm = async function(id){
  await _reqForm14(id); const r = S.reqs.find(x => x.id === id); if (!r || S.form?.id !== id) return;
  const ack = r.data?.ack; const h = $(".drawer-h h3"); if (h) h.textContent = `طلب وارد ${rqNo(r)}`;
  $(".drawer-b")?.insertAdjacentHTML("afterbegin", ack ? `<div class="check ok"><b>✓ تم تأكيد استلام الطلب للمنسق</b><span>${fmtTime(ack.at)}، بواسطة ${esc(whoName(ack.by))}${ack.via === "wa" ? " عبر واتساب" : ""}</span></div>`
    : `<div class="check warn rq-ack"><b>لم يُؤكد استلام الطلب للمنسق بعد</b><span>أرسل له رسالة تأكيد برقم الطلب ${rqNo(r)}</span><span class="br-acts"><button type="button" class="btn btn-primary" data-rqack="wa">${icon("i-wa")} تأكيد الاستلام عبر واتساب</button><button type="button" class="btn" data-rqack="other">أُكّد بطريقة أخرى</button></span></div>`);
};
const _vInbox14 = vInbox;
vInbox = function(){ let h = _vInbox14();
  for (const r of S.reqs) h = h.replace(`data-rq="${r.id}"><div class="rq-h">`, `data-rq="${r.id}"><div class="rq-h"><b class="num rq-no">${rqNo(r)}</b>${r.data?.ack ? `<span class="chip ok">✓ استلام</span>` : `<span class="chip warn">بانتظار تأكيد الاستلام</span>`}`);
  return h; };

/* =============== tasks & achievements =============== */
const TK_ST = ["جديدة", "تم الاستلام", "قيد التنفيذ", "منجزة", "ملغاة"], TK_OPEN = ["جديدة", "تم الاستلام", "قيد التنفيذ"], TK_C = { "جديدة":"gold", "تم الاستلام":"t2", "قيد التنفيذ":"t1", "منجزة":"ok", "ملغاة":"" }, PRIO = ["عالية", "متوسطة", "منخفضة"];
async function loadTasks(){ const { data, error } = await sb.from("tasks").select("*").order("created_at", { ascending:false }).limit(2000); if (!error) S.tasks = data || []; }
let tkCh = null;
function liveTasks(){ if (tkCh) sb.removeChannel(tkCh); tkCh = sb.channel("tk").on("postgres_changes", { event:"*", schema:"public", table:"tasks" }, p => { S.tasks = p.eventType === "DELETE" ? S.tasks.filter(x => x.id !== p.old?.id) : [p.new, ...S.tasks.filter(x => x.id !== p.new.id)]; navBadge(); if (S.view === "tasks" && $("#drawer").hidden) render(); }).subscribe(); }
const late = t => t.due && t.due < TODAY && TK_OPEN.includes(t.status);
const onTime = t => t.status === "منجزة" && (!t.due || (t.done_at || "").slice(0, 10) <= t.due);
const pname = id => whoName(id) || "—";
function navBadge(){ const b = document.querySelector('#nav [data-nav="tasks"]'); if (!b) return; const n = S.tasks.filter(t => t.assignee === S.me?.id && TK_OPEN.includes(t.status)).length; let s = b.querySelector(".nb"); if (!s) { s = document.createElement("span"); s.className = "nb"; b.appendChild(s); } s.textContent = n || ""; s.hidden = !n; }
function taskCard(t, mgr){
  return `<button type="button" class="tk ${t.seen_at ? "" : "unseen"} ${late(t) ? "late" : ""} ${t.status === "منجزة" ? "done" : ""}" data-task="${t.id}"><div class="rq-h"><b class="num rq-no">م-${t.no}</b><span class="chip ${TK_C[t.status]}">${esc(t.status)}</span>${t.prio === "عالية" ? `<span class="chip bad">عالية</span>` : ""}${late(t) ? `<span class="chip bad">متأخرة</span>` : ""}</div>
    <b>${esc(t.title)}</b>${t.details ? `<span class="s">${esc(t.details.slice(0, 120))}</span>` : ""}
    ${tkTrack(t, true)}<span class="s">${mgr ? `${icon("i-users", 13)} ${esc(pname(t.assignee))} · ` : `من ${esc(pname(t.assigner))} · `}${t.due ? `الموعد ${fmt(t.due)}` : "بدون موعد"}${t.done_at ? ` · أُنجزت ${fmt(t.done_at.slice(0, 10))}` : ""}</span></button>`;
}
function vTasks(){
  const me = S.me.id, tab = S.f.tkt || (S.admin ? "team" : "mine");
  const mine = S.tasks.filter(t => t.assignee === me), open = mine.filter(t => TK_OPEN.includes(t.status)), done = mine.filter(t => t.status === "منجزة").sort((a, b) => (b.done_at || "").localeCompare(a.done_at || ""));
  const seg = `<div class="seg">${S.me ? `<button type="button" data-tkt="team" class="${tab === "team" ? "on" : ""}">مهام الفريق</button><button type="button" data-tkt="ach" class="${tab === "ach" ? "on" : ""}">سجل إنجاز الموظفين</button>` : ""}<button type="button" data-tkt="mine" class="${tab === "mine" ? "on" : ""}">مهامي <span class="num">${open.length}</span></button><button type="button" data-tkt="mydone" class="${tab === "mydone" ? "on" : ""}">إنجازاتي <span class="num">${done.length}</span></button></div>`;
  const bar = `<div class="toolbar">${seg}${S.admin ? `<button class="btn btn-primary" type="button" data-tknew>${icon("i-plus")} إسناد مهمة</button>` : ""}</div>`;
  if (tab === "mine") return bar + `<div class="kpis"><div class="kpi"><span>مهام مفتوحة</span><b>${open.length}</b></div><div class="kpi" style="--k:var(--bad)"><span>متأخرة</span><b>${open.filter(late).length}</b></div><div class="kpi" style="--k:var(--ok)"><span>منجزة هذا الشهر</span><b>${done.filter(t => (t.done_at || "").slice(0, 7) === TODAY.slice(0, 7)).length}</b></div><div class="kpi"><span>نسبة الإنجاز في الموعد</span><b>${done.length ? Math.round(done.filter(onTime).length * 100 / done.length) : 0}%</b></div></div>
    <div class="tk-grid">${open.sort((a, b) => (a.due || "9").localeCompare(b.due || "9")).map(t => taskCard(t)).join("") || `<div class="empty">لا توجد مهام مفتوحة عليك ✓</div>`}</div>`;
  if (tab === "mydone") return bar + achList(done, false);
  const team = S.profiles.filter(p => p.active);
  if (tab === "team") { const L = S.tasks.filter(t => !["منجزة", "ملغاة"].includes(t.status));
    return bar + `<div class="tk-cols">${team.map(p => { const T = L.filter(t => t.assignee === p.id); return `<div class="panel tk-col"><div class="panel-h"><h3>${esc(p.name || p.username)}</h3><span class="chip">${T.length}</span>${T.some(late) ? `<span class="chip bad">${T.filter(late).length} متأخرة</span>` : ""}<button type="button" class="btn btn-ghost" data-tknew="${p.id}" title="إسناد مهمة">${icon("i-plus")}</button></div><div class="tk-list">${T.map(t => taskCard(t, false)).join("") || `<div class="empty s">لا توجد مهام مفتوحة</div>`}</div></div>`; }).join("")}</div>`; }
  /* achievements for the head of section */
  const ym = S.f.tkm || ""; const rows = team.map(p => { const T = S.tasks.filter(t => t.assignee === p.id && (!ym || (t.created_at || "").startsWith(ym) || (t.done_at || "").startsWith(ym))); const D = T.filter(t => t.status === "منجزة");
    return { p, all:T.length, done:D.length, ontime:D.filter(onTime).length, open:T.filter(t => TK_OPEN.includes(t.status)).length, late:T.filter(late).length }; });
  const months = [...new Set(S.tasks.map(t => (t.created_at || "").slice(0, 7)).filter(Boolean))].sort().reverse().slice(0, 12);
  return bar + `<div class="toolbar">${sel("tk-m", months, ym, "كل الفترات")}<button class="btn" type="button" data-tkxl>${icon("i-down")} إكسل</button></div>
    <div class="panel"><div class="table-wrap"><table class="tbl"><thead><tr><th>الموظف</th><th>المسندة</th><th>المنجزة</th><th>في الموعد</th><th>مفتوحة</th><th>متأخرة</th><th>نسبة الإنجاز</th></tr></thead><tbody>${rows.map(r => `<tr data-tkp="${r.p.id}" style="cursor:pointer"><td><b>${esc(r.p.name || r.p.username)}</b></td><td class="num">${r.all}</td><td class="num">${r.done}</td><td class="num">${r.ontime}</td><td class="num">${r.open}</td><td class="num">${r.late ? `<span class="bad-t">${r.late}</span>` : 0}</td><td><div class="pbar"><i style="width:${r.all ? Math.round(r.done * 100 / r.all) : 0}%"></i><span class="num">${r.all ? Math.round(r.done * 100 / r.all) : 0}%</span></div></td></tr>`).join("")}</tbody></table></div></div>
    ${S.f.tkp ? `<h3 style="margin:18px 0 8px">إنجازات ${esc(pname(S.f.tkp))}</h3>` + achList(S.tasks.filter(t => t.assignee === S.f.tkp && t.status === "منجزة" && (!ym || (t.done_at || "").startsWith(ym))), true) : `<p class="hint">اضغط على اسم الموظف لعرض سجل إنجازه.</p>`}`;
}
function achList(L, mgr){
  L = [...L].sort((a, b) => (b.done_at || "").localeCompare(a.done_at || ""));
  return `<div class="panel"><div class="list">${L.map(t => `<button class="li" data-task="${t.id}"><span><span class="t">${onTime(t) ? "✅" : "☑️"} ${esc(t.title)}</span><br><span class="s">${esc([`أُنجزت ${fmt((t.done_at || "").slice(0, 10))}`, t.due ? `الموعد ${fmt(t.due)}` : "", onTime(t) ? "في الموعد" : "بعد الموعد", mgr ? "" : `من ${pname(t.assigner)}`, t.done_note].filter(Boolean).join(" · "))}</span></span><span class="num rq-no">م-${t.no}</span></button>`).join("") || `<div class="empty">لا توجد إنجازات بعد</div>`}</div></div>`;
}
function taskForm(id, preset){
  const t = id ? S.tasks.find(x => x.id === id) : null; if (id && !t) return toast("المهمة غير متاحة لك");
  const mgr = S.admin, mine = t && t.assignee === S.me.id; S.form = { kind:"task", id:id || null, link:preset?.link || "" };
  const people = S.profiles.filter(p => p.active);
  const ro = mgr ? "" : " disabled";
  openDrawer(t ? `المهمة م-${t.no}` : "إسناد مهمة جديدة", `
    ${fld("tk-title", "المهمة", `<input class="f" id="tk-title" value="${esc(t?.title || preset?.title || "")}" placeholder="مثال: مراجعة موافقات الجالية الفلبينية"${ro}>`)}
    ${fld("tk-det", "التفاصيل", `<textarea class="f" id="tk-det" rows="3"${ro}>${esc(t?.details || preset?.details || "")}</textarea>`)}
    <div class="g3">${fld("tk-who", "المكلّف", `<select class="f" id="tk-who"${ro}>${people.map(p => `<option value="${p.id}"${(t?.assignee || preset?.assignee) === p.id ? " selected" : ""}>${esc(p.name || p.username)}</option>`).join("")}</select>`)}${fld("tk-due", "الموعد النهائي", `<input class="f" type="date" id="tk-due" value="${esc(t?.due || preset?.due || "")}"${ro}>`)}${fld("tk-prio", "الأولوية", sel("tk-prio", PRIO, t?.prio || "متوسطة").replace('<option value="">—</option>', ""))}</div>
    ${t?.link ? `<button type="button" class="btn" data-tklink="${esc(t.link)}">فتح ${esc(linkName(t.link))}</button>` : preset?.link ? `<span class="hint">مرتبطة بـ ${esc(linkName(preset.link))}</span>` : ""}
    ${t ? `<div class="rq-sec"><b>متابعة التنفيذ</b>${tkTrack(t, false)}
      ${mgr ? fld("tk-st", "الحالة", `<select class="f" id="tk-st">${TK_ST.map(s => `<option${s === t.status ? " selected" : ""}>${s}</option>`).join("")}</select>`) : `<input type="hidden" id="tk-st" value="${esc(t.status)}">`}
      ${fld("tk-note", "ملاحظة الإنجاز", `<textarea class="f" id="tk-note" rows="2" placeholder="ماذا تم؟"${mine || mgr ? "" : " disabled"}>${esc(t.done_note || "")}</textarea>`)}
      <span class="hint">أسندها ${esc(pname(t.assigner))}، ${fmtTime(t.created_at)}</span></div>` : ""}`,
    `${t && mine && t.status === "جديدة" ? `<button class="btn btn-primary" data-tkstep="تم الاستلام">📥 استلمت المهمة</button>` : ""}${t && mine && ["جديدة", "تم الاستلام"].includes(t.status) ? `<button class="btn" data-tkstep="قيد التنفيذ">⏳ بدأت التنفيذ</button>` : ""}${t && mine && t.status !== "منجزة" && t.status !== "ملغاة" ? `<button class="btn btn-ok" data-tkdone>✅ تم الإنجاز</button>` : ""}${mgr || (mine && t?.status === "منجزة") ? `<button class="btn ${t ? "" : "btn-primary"}" data-tksave>${t ? "حفظ" : "إسناد المهمة"}</button>` : ""}${t && mgr ? `<button class="btn btn-ghost bad-t" data-tkdel>حذف</button>` : ""}<button class="btn btn-ghost" data-close>إغلاق</button>`);
  if (t && mine && !t.seen_at) { t.seen_at = new Date().toISOString(); sb.from("tasks").update({ seen_at:t.seen_at }).eq("id", t.id).then(() => {}); }
}
async function taskSave(done){
  const id = S.form?.id; const v = k => $("#" + k)?.value.trim() || "";
  if (!id) { if (!v("tk-title")) return toast("اكتب المهمة"); const row = { title:v("tk-title"), details:v("tk-det"), assignee:v("tk-who"), due:v("tk-due") || null, prio:v("tk-prio") || "متوسطة" };
    if (S.form?.link) row.link = S.form.link;
    const { data, error } = await sb.from("tasks").insert(row).select(); if (error) return writeFail(error); S.tasks = [...(data || []), ...S.tasks]; closeDrawer(); render(); return toast(`أُسندت المهمة إلى ${pname(row.assignee)} ووصله إشعار`); }
  const t = S.tasks.find(x => x.id === id); const up = { status:typeof done === "string" ? done : done ? "منجزة" : v("tk-st") || t.status, done_note:$("#tk-note")?.value.trim() || "" };
  if (S.admin) Object.assign(up, { title:v("tk-title"), details:v("tk-det"), assignee:v("tk-who"), due:v("tk-due") || null, prio:v("tk-prio") || t.prio });
  const { data, error } = await sb.from("tasks").update(up).eq("id", id).select(); if (error) return writeFail(error);
  if (data?.[0]) Object.assign(t, data[0]); closeDrawer(); render(); navBadge(); toast(up.status === "منجزة" && t.assignee === S.me.id ? "أحسنت! أُضيفت لسجل إنجازك ✓" : up.status === "تم الاستلام" ? "تم، وصل لرئيس القسم أنك استلمت المهمة" : up.status === "قيد التنفيذ" ? "تم، وصل لرئيس القسم أنك بدأت التنفيذ" : "حُفظت المهمة");
}
function tkXlsx(){ if (!window.XLSX) return toast("مكتبة إكسل لم تُحمّل");
  const rows = S.tasks.map(t => ({ "الرقم":"م-" + t.no, "المهمة":t.title, "المكلّف":pname(t.assignee), "أسندها":pname(t.assigner), "الأولوية":t.prio, "الحالة":t.status, "الموعد":t.due || "", "تاريخ الإسناد":(t.created_at || "").slice(0, 10), "تاريخ الإنجاز":(t.done_at || "").slice(0, 10), "في الموعد":t.status === "منجزة" ? (onTime(t) ? "نعم" : "لا") : "", "ملاحظة الإنجاز":t.done_note || "" }));
  const wb = XLSX.utils.book_new(); wb.Workbook = { Views:[{ RTL:true }] }; XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "المهام"); XLSX.writeFile(wb, `المهام-والإنجاز-${TODAY}.xlsx`); }

/* Copilot can assign tasks (head of section) */
PRIME_MSG = PRIME_MSG.replace("مثال:", `- {"op":"add_task","to":"اسم الموظف","title":"","details":"","due":"YYYY-MM-DD","prio":"عالية|متوسطة|منخفضة"}  ← إسناد مهمة لموظف (لرئيس القسم/المدير فقط)
مثال:`);
const _describe14 = describe; describe = function(a){ if (a.op === "add_task") return ["إسناد مهمة", `${a.to || ""}، ${a.title || ""}${a.due ? "، " + fmt(a.due) : ""}`, "gold"]; return _describe14(a); };
const _runAction14 = runAction;
runAction = async function(a){ if (a.op !== "add_task") return _runAction14(a);
  if (!S.admin) throw new Error("إسناد المهام لرئيس القسم فقط"); const k = nkey(a.to || ""); const p = S.profiles.find(x => nkey(x.name || "") === k || nkey(x.username || "") === k) || S.profiles.find(x => k && (nkey(x.name || "").includes(k) || k.includes(nkey(x.name || "x"))));
  if (!p) throw new Error(`الموظف «${a.to}» غير موجود`); const { data, error } = await sb.from("tasks").insert({ title:a.title || "مهمة", details:a.details || "", assignee:p.id, due:a.due || null, prio:PRIO.includes(a.prio) ? a.prio : "متوسطة" }).select(); if (error) throw error; S.tasks = [...(data || []), ...S.tasks]; return `أُسندت المهمة إلى ${p.name || p.username}`; };
const _sysMd14 = sysMarkdown; sysMarkdown = function(){ let out = _sysMd14(); out += `\n\n## الموظفون (لإسناد المهام)\n${S.profiles.filter(p => p.active).map(p => `- ${p.name || p.username} (${p.role === "admin" ? "مدير" : p.role === "editor" ? "محرر" : "مشاهد"})`).join("\n")}`;
  const T = S.tasks.filter(t => TK_OPEN.includes(t.status)); if (T.length) out += `\n\n## المهام المفتوحة (${T.length})\n| الرقم | المهمة | المكلّف | الموعد | الحالة |\n|---|---|---|---|---|\n` + T.map(t => `| م-${t.no} | ${t.title.replace(/\|/g, "/")} | ${pname(t.assignee)} | ${t.due ? fmt(t.due) : "—"} | ${t.status}${late(t) ? " (متأخرة)" : ""} |`).join("\n"); return out; };
const _alerts14 = alerts; alerts = function(){ const A = _alerts14(); const mine = S.tasks.filter(t => t.assignee === S.me?.id && TK_OPEN.includes(t.status)); if (mine.length) A.unshift({ k:mine.some(late) ? "bad" : "gold", t:`${mine.length} مهمة مفتوحة عليك${mine.some(late) ? ` (${mine.filter(late).length} متأخرة)` : ""}`, go:"tasks" }); return A; };
const _palAll14 = palAll; palAll = function(){ const A = _palAll14(); if (S.admin) A.unshift({ g:"إجراءات", t:"إسناد مهمة لموظف", s:"", ic:"i-plus", run:() => taskForm(), txt:"مهمه اسناد تكليف موظف" }); A.unshift({ g:"إجراءات", t:"مهامي وإنجازاتي", s:"", ic:"i-list", run:() => go("tasks"), txt:"مهامي انجازاتي مهام" });
  for (const t of S.tasks.slice(0, 150)) A.push({ g:"المهام", t:`م-${t.no} ${t.title}`, s:[t.status, pname(t.assignee)].join(" · "), ic:"i-list", run:() => { go("tasks"); taskForm(t.id); }, txt:[t.title, t.details, pname(t.assignee), t.no].join(" ") }); return A; };

/* =============== Copilot bridge card: only for devices that don't have it =============== */
const isEdge = /Edg\//.test(navigator.userAgent), extUrl = isEdge ? "edge://extensions" : "chrome://extensions";
const _vCopilot14 = vCopilot;
vCopilot = function(){
  if (hasBridge()) { LS.set("bridge-ok", 1); return _vCopilot14(); }
  const had = LS.get("bridge-ok", 0), app = matchMedia("(display-mode: standalone)").matches;
  if (had) return `<div class="cp"><div class="panel cp-install"><div class="panel-b" style="display:grid;gap:12px">
    <span class="cp-badge">${icon("i-spark", 16)} Microsoft 365 Copilot</span>
    <h3 style="font-size:19px">الجسر مثبّت على هذا الجهاز لكنه لا يعمل في هذه النافذة</h3>
    <ul class="cp-steps"><li>${app ? "أنت تستخدم نافذة النظام المثبّت، افتح النظام في متصفح Edge مباشرة:" : "تأكد أن «جسر Copilot» مفعّل (المفتاح أخضر) في صفحة الملحقات:"}</li></ul>
    <div class="br-acts">${app ? `<a class="btn btn-primary" href="${location.origin + location.pathname}#copilot" target="_blank" rel="noopener">فتح في المتصفح</a>` : ""}<button type="button" class="btn" data-copyext>نسخ رابط صفحة الملحقات</button><button type="button" class="btn btn-ghost" onclick="location.reload()">تحديث الصفحة</button></div></div></div></div>`;
  return `<div class="cp"><div class="panel cp-install"><div class="panel-b" style="display:grid;gap:14px">
    <span class="cp-badge">${icon("i-spark", 16)} Microsoft 365 Copilot داخل النظام</span>
    ${app ? `<div class="check warn"><b>إذا ثبّت الجسر الآن: اضغط Ctrl + F5 لتحديث هذه النافذة</b><span>وإن بقيت هذه الرسالة، افتح النظام في متصفح Edge مباشرة <a class="btn btn-primary" href="${location.origin + location.pathname}#copilot" target="_blank" rel="noopener">فتح في المتصفح</a></span></div>` : `<div class="check"><b>ثبّت الجسر الآن؟</b><span>اضغط <button type="button" class="btn btn-ghost" onclick="location.reload()">تحديث الصفحة</button> ليظهر Copilot.</span></div>`}
    <h3 style="font-size:20px">ثبّت «جسر Copilot» مرة واحدة على هذا الجهاز (دقيقة واحدة)</h3>
    <ol class="cp-steps big">
      <li><a class="btn btn-primary" href="jaliyat-copilot.zip" download>${icon("i-down")} تنزيل الجسر</a> ثم اضغط عليه بالزر الأيمن ← <b>استخراج الكل</b> ← <b>استخراج</b>.</li>
      <li><button type="button" class="btn" data-copyext>نسخ رابط صفحة الملحقات</button> ثم الصقه في شريط العنوان واضغط Enter.</li>
      <li>فعّل <b>وضع المطوّر</b> (أسفل يمين الصفحة).</li>
      <li>اضغط <b>«تحميل ملحق لم يتم فك حزمته»</b> واختر مجلد <b dir="ltr">jaliyat-copilot</b> المستخرج.</li>
      <li>ارجع هنا واضغط <button type="button" class="btn btn-ghost" onclick="location.reload()">تحديث الصفحة</button>، يظهر Copilot داخل النظام بحساب الوزارة.</li></ol>
    <span class="hint">بعد التثبيت تختفي هذه الخطوات، وكل التحديثات القادمة تصل تلقائياً. يعمل على Microsoft Edge أو Google Chrome على الكمبيوتر.</span>
  </div></div><details class="cp-alt"><summary>بدون تثبيت: تسجيل الدخول بمايكروسوفت والبحث في ملفاتك</summary>${vCopilotMS()}</details></div>`;
};

/* =============== wiring =============== */
const _boot9n = boot9;
boot9 = function(){ _boot9n();
  Promise.all([loadNtf(), loadPrefs(), loadTasks(), pushSync(false)]).then(() => { liveNtf(); liveTasks(); bellRefresh(); navBadge(); if ($("#drawer").hidden && S.view === "tasks") render(); const h = location.hash.slice(1); if (h.includes(":")) setTimeout(() => openLink(h), 300); });
};
document.addEventListener("click", async ev => {
  const t = ev.target.closest("button,[data-task],[data-tkp]"); if (!t) return; const D = t.dataset;
  if (D.btab) { S.bellTab = D.btab; $("#bell-pop")?.remove(); return bellOpen(); }
  if (D.nlink !== undefined) { ntfRead([+D.nid]); $("#bell-pop")?.remove(); return openLink(D.nlink); }
  if (D.nall !== undefined) { ntfRead(S.ntf.filter(x => !x.read_at).map(x => x.id)); $("#bell-pop")?.remove(); return bellOpen(); }
  if (D.nset !== undefined) return nSettings();
  if (D.nsave !== undefined) return nSave();
  if (D.pushon !== undefined) { const ok = await pushSync(true); toast(ok ? "فُعّلت الإشعارات على هذا الجهاز ✓" : Notification.permission === "denied" ? "المتصفح يمنع الإشعارات، اسمح بها من القفل بجانب الرابط" : "تعذّر التفعيل"); bellRefresh(); if (S.form?.kind === "nset") nSettings(); else { $("#bell-pop")?.remove(); } return; }
  if (D.ntest !== undefined) { const { error } = await sb.rpc("notify_me_test"); return toast(error ? "تعذّر الإرسال" : "أُرسل إشعار التجربة، يصلك خلال ثوانٍ"); }
  if (D.rqack) return rqAck(D.rqack);
  if (D.tkt) { S.f.tkt = D.tkt; return render(); }
  if (D.tkp) { S.f.tkp = S.f.tkp === D.tkp ? "" : D.tkp; return render(); }
  if (D.tknew !== undefined) return taskForm(null, D.tknew ? { assignee:D.tknew } : null);
  if (D.task) return taskForm(D.task);
  if (D.tksave !== undefined) return taskSave(false);
  if (D.tkdone !== undefined) return taskSave(true);
  if (D.tkstep) return taskSave(D.tkstep);
  if (D.tklink) { closeDrawer(); return openLink(D.tklink); }
  if (D.tkcf !== undefined) return cfBulk();
  if (D.cfgo !== undefined) return cfCreate();
  if (D.tkfrom) { const [kind, id] = D.tkfrom.split("|"); return taskFrom(kind, id); }
  if (D.tkdel !== undefined) { if (D.sure !== "1") { D.sure = "1"; t.textContent = "اضغط مرة أخرى للتأكيد"; return; } const { error } = await sb.from("tasks").delete().eq("id", S.form.id); if (error) return writeFail(error); S.tasks = S.tasks.filter(x => x.id !== S.form.id); closeDrawer(); render(); return toast("حُذفت المهمة"); }
  if (D.tkxl !== undefined) return tkXlsx();
  if (D.copyext !== undefined) { const ok = await cpCopy(extUrl); return toast(ok ? `نُسخ ${extUrl}، الصقه في شريط العنوان` : extUrl); }
});
document.addEventListener("change", ev => { if (ev.target.id === "tk-m") { S.f.tkm = ev.target.value; render(); } });

/* ---------- progress track: assigned → seen → received → in progress → done ---------- */
function tkTrack(t, mini){
  const steps = [["أُسندت", t.created_at], ["اطّلع", t.seen_at], ["استلم", t.ack_at], ["بدأ التنفيذ", t.started_at], ["أُنجزت", t.done_at]];
  if (mini) return `<span class="tk-dots">${steps.map(([l, at]) => `<i class="${at ? "on" : ""}" title="${l}${at ? " " + fmtTime(at) : ""}"></i>`).join("")}<span class="s">${t.done_at ? "أُنجزت" : t.started_at ? "قيد التنفيذ" : t.ack_at ? "تم الاستلام" : t.seen_at ? "👁 اطّلع ولم يستلم" : "لم يطّلع بعد"}</span></span>`;
  return `<ol class="tk-track">${steps.map(([l, at]) => `<li class="${at ? "on" : ""}"><b>${l}</b><span class="s">${at ? fmtTime(at) : "—"}</span></li>`).join("")}</ol>`;
}
function linkName(l){ const [k, id] = String(l).replace(/^#/, "").split(":"); if (k === "act") { const e = S.byId.get(id); return e ? `النشاط #${e.n}` : "النشاط"; } if (k === "req") { const r = S.reqs.find(x => x.id === id); return r ? `الطلب ${rqNo(r)}` : "الطلب"; } if (k === "doc") return `الوثيقة ${id}`; if (k === "bk") return "الحجز"; return "المرتبط"; }

/* ---------- create tasks from problems (conflicts, approvals, requests) ---------- */
function taskFrom(kind, id){
  if (!S.admin) return toast("إسناد المهام لرئيس القسم");
  if (kind === "cf") { const e = S.byId.get(id); if (!e) return; const others = e.cf.map(c => `#${c.o.n} (${c.k === "lect" ? "نفس المحاضر" : "نفس المسجد"}، ${c.o.mosName}، ${daysText(c.o)} ${c.o.time || ""})`).join("، ");
    return taskForm(null, { title:`حل تعارض النشاط #${e.n} مع ${e.cf.map(c => "#" + c.o.n).join("، ")}`, details:`النشاط #${e.n}: ${e.comm}، ${e.mosName}، ${daysText(e)} ${e.time || ""}، ${e.lect || ""}\nيتعارض مع: ${others}\nالمطلوب: التنسيق مع المنسق وتعديل الوقت أو المكان أو المحاضر.`, due:addDays(TODAY, 3), link:`#act:${id}` }); }
  if (kind === "doc") { const d = docBy[id]; if (!d) return; return taskForm(null, { title:`تجديد الموافقة ${d.no}، ${d.comm || ""}`, details:`الموافقة تنتهي ${fmt(d.end)} وعليها ${S.E.filter(e => e.doc === d.no && e.live).length} نشاط.\nالمطلوب: إعداد كتاب التجديد في وثيقة ومتابعته.`, due:d.end && d.end > TODAY ? addDays(d.end, -3) : addDays(TODAY, 2), link:`#doc:${d.no}` }); }
  if (kind === "req") { const r = S.reqs.find(x => x.id === id); if (!r) return; return taskForm(null, { title:`متابعة الطلب ${rqNo(r)}، ${r.data?.org || r.data?.comm || ""}`, details:`المطلوب: مراجعة الطلب، إعداد كتاب وثيقة، وإبلاغ المنسق ${r.data?.coord || ""}.`, due:addDays(TODAY, 2), link:`#req:${id}` }); }
}
function cfPairs(){ const seen = new Set(), out = []; for (const e of S.E) for (const c of e.cf) { const k = [e.n, c.o.n].sort((a, b) => a - b).join("-"); if (seen.has(k) || !RUN(e)) continue; seen.add(k); out.push({ a:e, b:c.o, k:c.k, key:k }); } return out; }
const cfTasked = key => S.tasks.some(t => TK_OPEN.includes(t.status) && new RegExp(`#${key.split("-")[0]}\\b`).test(t.title) && new RegExp(`#${key.split("-")[1]}\\b`).test(t.title));
function cfBulk(){
  const P = cfPairs(); S.form = { kind:"cfbulk" };
  const people = S.profiles.filter(p => p.active);
  openDrawer(`إسناد مهام حل التعارضات (${P.length})`, `
    <div class="g2">${fld("cf-who", "إسناد إلى", `<select class="f" id="cf-who">${people.map(p => `<option value="${p.id}">${esc(p.name || p.username)}</option>`).join("")}</select>`)}${fld("cf-due", "الموعد", `<input class="f" type="date" id="cf-due" value="${addDays(TODAY, 3)}">`)}</div>
    <div class="list ocr-list">${P.map((x, i) => { const done = cfTasked(x.key); return `<label class="li"><input type="checkbox" data-cfi="${i}"${done ? "" : " checked"}><span><b>#${x.a.n} ↔ #${x.b.n}</b>، ${x.k === "lect" ? "نفس المحاضر" : "نفس المسجد"}<br><span class="s">${esc([x.a.mosName, daysText(x.a), x.a.time].join(" · "))} / ${esc([x.b.mosName, daysText(x.b), x.b.time].join(" · "))}</span></span>${done ? `<span class="chip ok">عليه مهمة</span>` : ""}</label>`; }).join("") || `<div class="empty">لا توجد تعارضات جارية ✓</div>`}</div>`,
    `<button class="btn btn-primary" data-cfgo>إسناد المحدد</button><button class="btn btn-ghost" data-close>إلغاء</button>`);
  S.cfP = P;
}
async function cfCreate(){
  const sel2 = [...document.querySelectorAll("[data-cfi]")].filter(x => x.checked).map(x => S.cfP[+x.dataset.cfi]); if (!sel2.length) return toast("حدّد تعارضاً واحداً على الأقل");
  const who = $("#cf-who").value, due = $("#cf-due").value || null;
  const rows = sel2.map(x => ({ title:`حل تعارض النشاط #${x.a.n} مع #${x.b.n}`, details:`${x.k === "lect" ? "نفس المحاضر" : "نفس المسجد"} في نفس الوقت.\n#${x.a.n}: ${x.a.comm}، ${x.a.mosName}، ${daysText(x.a)} ${x.a.time || ""}، ${x.a.lect || ""}\n#${x.b.n}: ${x.b.comm}، ${x.b.mosName}، ${daysText(x.b)} ${x.b.time || ""}، ${x.b.lect || ""}\nالمطلوب: التنسيق وتعديل أحدهما.`, assignee:who, due, prio:"عالية", link:`#act:${x.a.id}` }));
  const { data, error } = await sb.from("tasks").insert(rows).select(); if (error) return writeFail(error);
  S.tasks = [...(data || []), ...S.tasks]; closeDrawer(); render(); toast(`أُسندت ${rows.length} مهمة إلى ${pname(who)} ووصله إشعار`);
}
/* buttons on activity / approval / request forms */
const _actForm14 = actForm;
actForm = function(id, preset){ _actForm14(id, preset); const e = id && S.byId.get(id); if (!e || !S.admin || S.form?.kind !== "act") return;
  if (e.cf.length) $(".drawer-b")?.insertAdjacentHTML("afterbegin", `<div class="check bad"><b>هذا النشاط عليه ${e.cf.length} تعارض</b><span class="br-acts"><button type="button" class="btn btn-primary" data-tkfrom="cf|${esc(id)}">إسناد مهمة لحل التعارض</button></span></div>`); };
const _listForm14 = listForm;
listForm = function(kind, key){ _listForm14(kind, key); if (kind === "doc" && S.admin && docBy[key]) $(".drawer-f [data-close]")?.insertAdjacentHTML("afterend", `<button class="btn btn-ghost" type="button" data-tkfrom="doc|${esc(key)}">إسناد مهمة تجديد</button>`); };
const _reqForm14b = reqForm;
reqForm = async function(id){ await _reqForm14b(id); if (S.admin && S.form?.id === id) $(".rq-tools")?.insertAdjacentHTML("afterbegin", `<button type="button" class="btn" data-tkfrom="req|${esc(id)}">إسناد مهمة متابعة</button>`); };
const _vTasks14 = vTasks;
vTasks = function(){ let h = _vTasks14(); if (S.admin) { const n = cfPairs().filter(x => !cfTasked(x.key)).length; h = h.replace(`${icon("i-plus")} إسناد مهمة</button>`, `${icon("i-plus")} إسناد مهمة</button><button class="btn" type="button" data-tkcf>⚠ إسناد التعارضات${n ? ` <span class="chip bad">${n}</span>` : ""}</button>`); } return h; };
/* the head of section can route anything to the concerned employee */
const linkedTask = l => S.tasks.find(t => t.link === l && TK_OPEN.includes(t.status));
const _taskFrom2 = taskFrom;
taskFrom = function(kind, id){
  if (!S.admin) return toast("إسناد المهام لرئيس القسم");
  if (kind === "act") { const e = S.byId.get(id); if (!e) return; return taskForm(null, { title:`متابعة النشاط #${e.n}، ${e.comm || ""}`, details:`${e.type}، ${e.mosName}، ${daysText(e)} ${e.time || ""}، ${e.lect || ""}\nالمطلوب: `, due:addDays(TODAY, 3), link:`#act:${id}` }); }
  if (kind === "bk") { const b = S.bks.find(x => x.id === id); if (!b) return; return taskForm(null, { title:`تجهيز ${hallName(b.hall)}، ${fmt(b.day)}`, details:`${b.data?.title || ""}، من ${t12(b.t_from)} إلى ${t12(b.t_to)}${(b.data?.equip || []).length ? "\nالتجهيزات: " + b.data.equip.join("، ") : ""}`, due:addDays(b.day, -1) < TODAY ? TODAY : addDays(b.day, -1), link:`#bk:${id}` }); }
  if (kind === "note") { const n = S.notes.get(id); if (!n) return; return taskForm(null, { title:n.title || "متابعة ملاحظة", details:n.body || "", due:addDays(TODAY, 3), link:`#note:${id}` }); }
  return _taskFrom2(kind, id);
};
const assignedChip = l => { const t = linkedTask(l); return t ? `<span class="chip t1">مسندة إلى ${esc(pname(t.assignee))}</span>` : ""; };
const _actForm14c = actForm;
actForm = function(id, preset){ _actForm14c(id, preset); if (!id || !S.admin || S.form?.kind !== "act") return; const t = linkedTask(`#act:${id}`);
  $(".drawer-f [data-close]")?.insertAdjacentHTML("afterend", t ? `<button class="btn btn-ghost" type="button" data-task="${t.id}">مسندة إلى ${esc(pname(t.assignee))}</button>` : `<button class="btn btn-ghost" type="button" data-tkfrom="act|${esc(id)}">${icon("i-users")} إسناد</button>`); };
const _bkForm14 = bkForm;
bkForm = function(id, preset){ _bkForm14(id, preset); if (!id || !S.admin) return; const t = linkedTask(`#bk:${id}`); $(".rq-tools")?.insertAdjacentHTML("afterbegin", t ? `<button type="button" class="btn" data-task="${t.id}">مسندة إلى ${esc(pname(t.assignee))}</button>` : `<button type="button" class="btn" data-tkfrom="bk|${esc(id)}">إسناد مهمة تجهيز</button>`); };
const _noteForm14 = noteForm;
noteForm = function(id){ _noteForm14(id); if (!id || !S.admin) return; $(".drawer-f [data-close]")?.insertAdjacentHTML("afterend", `<button class="btn btn-ghost" type="button" data-tkfrom="note|${esc(id)}">${icon("i-users")} إسناد كمهمة</button>`); };
const _vInbox14b = vInbox;
vInbox = function(){ let h = _vInbox14b(); for (const r of S.reqs) { const c = assignedChip(`#req:${r.id}`); if (c) h = h.replace(`data-rq="${r.id}"><div class="rq-h">`, `data-rq="${r.id}"><div class="rq-h">${c}`); } return h; };
const _reqForm14c = reqForm;
reqForm = async function(id){ await _reqForm14c(id); const t = linkedTask(`#req:${id}`); if (t && S.form?.id === id) { const b = document.querySelector(`[data-tkfrom="req|${id}"]`); if (b) b.outerHTML = `<button type="button" class="btn" data-task="${t.id}">مسندة إلى ${esc(pname(t.assignee))}</button>`; } };

/* ---------- load Copilot only after the bridge confirms it has allowed framing for this window ---------- */
const _vCopilot14b = vCopilot;
vCopilot = function(){ let h = _vCopilot14b(); if (!hasBridge()) return h;
  return h.replace('<iframe id="br-frame" class="cp-frame" src="', '<iframe id="br-frame" class="cp-frame" data-src="').replace('<button type="button" class="btn btn-ghost" id="br-reprime"', '<button type="button" class="btn btn-ghost" id="br-retry">↻ إعادة تحميل Copilot</button><button type="button" class="btn btn-ghost" id="br-reprime"'); };
async function brArm(){
  const f = $("#br-frame"); if (!f || !f.dataset.src) return;
  const st = $("#br-st"); if (st) st.textContent = "جارٍ تجهيز الجسر…";
  const de = document.documentElement; de.dataset.copilotBridge = "1";
  for (let i = 0; i < 20 && de.dataset.copilotBridge !== "ready"; i++) { window.postMessage({ type:"jaliyat-bridge-hosts", hosts:BRIDGE_HOSTS }, location.origin); await new Promise(r => setTimeout(r, 300)); }
  if (de.dataset.copilotBridge !== "ready") { de.dataset.copilotBridge = "1"; if (st) st.innerHTML = `الجسر لم يستجب، افتح <code dir="ltr">edge://extensions</code> واضغط «Reload» على الجسر ثم <button type="button" class="btn btn-ghost" id="br-retry">أعد المحاولة</button>`; return; }
  if ($("#br-frame") === f) { f.src = f.dataset.src; if (st) st.textContent = "جارٍ تحميل Copilot…"; }
}
const _afterRender14 = afterRender;
afterRender = function(v){ _afterRender14(v); if (v === "copilot" && hasBridge()) brArm(); };
document.addEventListener("click", ev => { if (ev.target.closest("#br-retry")) { BR.ready = false; BR.primed = false; BR.busy = false; const f = $("#br-frame"); if (f) { f.removeAttribute("src"); f.dataset.src = f.dataset.src || "https://m365.cloud.microsoft/chat/?auth=2"; } brArm(); } });
/* the installed app can open before Edge has loaded its extensions: re-check, then reload once automatically */
function brWatch(){
  if (hasBridge() || !LS.get("bridge-ok", 0)) return;
  let n = 0; const t = setInterval(() => {
    if (hasBridge()) { clearInterval(t); if (S.view === "copilot" && $("#drawer").hidden) render(); return; }
    if (++n >= 8) { clearInterval(t); let done = false; try { done = sessionStorage.getItem("br-reload") === "1"; sessionStorage.setItem("br-reload", "1"); } catch (_) {} if (!done && S.view === "copilot") location.reload(); }
  }, 500);
}
const _afterRender14c = afterRender;
afterRender = function(v){ _afterRender14c(v); if (v === "copilot") brWatch(); };

/* installed-app window where Edge did not inject the bridge script: bridge 2.1+ still allows framing for the whole
   browser profile, so show Copilot directly (typing happens inside Copilot itself). */
const _vCopilot14d = vCopilot;
vCopilot = function(){
  if (hasBridge() || !(LS.get("bridge-ok", 0) || matchMedia("(display-mode: standalone)").matches)) return _vCopilot14d();
  return `<div class="cp cp-embed cp-lite">
    <div class="cp-side">
      <span class="cp-badge">${icon("i-spark", 16)} Microsoft 365 Copilot</span>
      <div class="check warn" style="font-size:13px"><b>وضع التطبيق المثبّت</b><span>Copilot ظاهر هنا، اكتب له مباشرة في الإطار. الإرسال التلقائي وملف بيانات النظام يعملان في المتصفح.</span></div>
      <button type="button" class="btn btn-primary" data-cpfile>${icon("i-down")} تنزيل ملف بيانات النظام لإرفاقه</button>
      <span class="hint">نزّل الملف ثم أرفقه في Copilot بزر «+» ليعرف كل بيانات النظام.</span>
      <a class="btn" href="${location.origin + location.pathname}#copilot" target="_blank" rel="noopener">فتح في المتصفح (كل المزايا)</a>
      <button type="button" class="btn btn-ghost" onclick="location.reload()">↻ تحديث</button>
      <span class="hint">إذا ظهر «refused to connect»: ثبّت جسر Copilot 2.1 أو أحدث في Edge نفسه.</span>
    </div>
    <iframe class="cp-frame" src="https://m365.cloud.microsoft/chat/?auth=2" allow="clipboard-read; clipboard-write; microphone" title="Microsoft 365 Copilot"></iframe>
  </div>`;
};
document.addEventListener("click", ev => { if (ev.target.closest("[data-cpfile]")) { const b = new Blob([sysMarkdown()], { type:"text/markdown" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `بيانات-نظام-إنجاز-${TODAY}.md`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast("نُزّل ملف البيانات، أرفقه في Copilot"); } });

/* ================= Copilot on phones / tablets / any device without the bridge ================= */
const isMobileDev = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform));
const _vCopilot14m = vCopilot;
vCopilot = function(){
  if (hasBridge() || !isMobileDev()) { const h = _vCopilot14m(); return hasBridge() ? h : h.replace('<details class="cp-alt">', `${mobCopilot()}<details class="cp-alt">`); }
  return `<div class="cp">${mobCopilot()}<details class="cp-alt"><summary>تسجيل الدخول بمايكروسوفت والبحث في ملفاتك</summary>${vCopilotMS()}</details></div>`;
};
function mobCopilot(){
  return `<div class="panel cp-mob"><div class="panel-b" style="display:grid;gap:12px">
    <span class="cp-badge">${icon("i-spark", 16)} Microsoft 365 Copilot، ${isMobileDev() ? "على الجوال" : "بدون جسر"}</span>
    <div class="cp-mstep"><b>1</b><span>اكتب سؤالك أو أمرك</span></div>
    <textarea class="f" id="mob-q" rows="3" placeholder="مثال: كم نشاط للجالية البنغالية؟ أو: احجز القاعة الكبرى الخميس 7 م"></textarea>
    <div class="cp-chips">${CP_PROMPTS.slice(0, 6).map((p, i) => `<button type="button" data-mobp="${i}">${esc(p[0])}</button>`).join("")}</div>
    <div class="cp-mstep"><b>2</b><span>أرسله لـ Copilot مع بيانات النظام</span></div>
    <button type="button" class="btn btn-primary btn-lg" data-mobgo>${icon("i-spark")} إرسال إلى Copilot</button>
    <span class="hint">${navigator.canShare ? "تظهر قائمة المشاركة: اختر تطبيق «Microsoft 365 Copilot» أو «Copilot». الملف والسؤال يُرسلان معاً." : "يُنسخ السؤال مع بيانات النظام ويفتح Copilot، الصق (لصق) واضغط إرسال."}</span>
    <div class="cp-mstep"><b>3</b><span>إذا طلبت تعديلاً: انسخ رد Copilot والصقه هنا لينفّذه النظام</span></div>
    <textarea class="f" id="mob-r" rows="3" placeholder="الصق رد Copilot هنا…"></textarea>
    <button type="button" class="btn" data-mobrun>تنفيذ الأوامر من الرد</button>
    <div id="cpx"></div>
  </div></div>`;
}
function mobPrompt(q){ return `${PRIME_MSG.replace("لا تلخص الملف الآن، ورد فقط بعبارة: «تم استلام بيانات النظام ✓، اسألني ما تشاء».", "")}\n\nسؤالي/أمري: ${q}\n\nملاحظة: إذا كان طلبي تعديلاً على النظام فضع كتلة jaliyat-actions في نهاية ردك لأنسخها إلى النظام.`; }
async function mobSend(){
  const q = ($("#mob-q")?.value || "").trim(); if (!q) return toast("اكتب سؤالك أولاً");
  const text = mobPrompt(q), md = sysMarkdown();
  const file = new File([md], `بيانات-نظام-إنجاز-${TODAY}.txt`, { type:"text/plain" });
  if (navigator.canShare && navigator.canShare({ files:[file] })) {
    try { await cpCopy(text); await navigator.share({ files:[file], text, title:"إنجاز → Copilot" }); return toast("اختر Copilot، والسؤال منسوخ أيضاً إن احتجته"); } catch (e) { if (e?.name === "AbortError") return; }
  }
  const ok = await cpCopy(`${text}\n\n${cpData(q, 12000)}`);
  toast(ok ? "نُسخ السؤال مع البيانات، الصقه في Copilot" : "تعذّر النسخ");
  window.open("https://m365.cloud.microsoft/chat/", "_blank", "noopener");
}
function mobRun(){
  const acts = findActions(String($("#mob-r")?.value || "")); if (!acts.length) return toast("لم أجد أوامر في الرد، تأكد أنك نسخت الرد كاملاً");
  CPX.list = acts.map(a => ({ a })); cpxRender(); $("#cpx")?.scrollIntoView({ behavior:"smooth", block:"center" });
}
document.addEventListener("click", ev => { const t = ev.target.closest("button"); if (!t) return;
  if (t.dataset.mobgo !== undefined) return mobSend();
  if (t.dataset.mobrun !== undefined) return mobRun();
  if (t.dataset.mobp !== undefined) { const p = CP_PROMPTS[+t.dataset.mobp]; const q = $("#mob-q"); if (q) q.value = p[2]; }
});
