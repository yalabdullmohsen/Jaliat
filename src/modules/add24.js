/* ================= v24: «جديد» badges + a short «ما الجديد» explanation — disappear for good once seen ================= */
const NEWF = [ // key, where (nav view | element id), title, explanation, adminOnly
  ["v20-home", "nav:home", "الرئيسية أذكى", "أولويات اليوم مرتبة حسب الأهمية، وشريط أرقام يربط كل أقسام النظام — اضغط أي رقم يوديك لقسمه."],
  ["v20-tasks", "nav:tasks", "المهام والإنجاز", "رئيس القسم يسند المهام، وتشوف حالتها: اطّلع، استلم، قيد التنفيذ، أُنجزت — وتنحفظ في سجل إنجازك."],
  ["v20-questions", "nav:questions", "الأسئلة", "وجّه سؤالاً لأي زميل أو لرئيس القسم، ويوصله إشعار ويجاوبك من نفس المكان."],
  ["v20-wa", "nav:whatsapp", "واتساب القسم", "افتح محادثات واتساب القسم من داخل «إنجاز» مباشرة."],
  ["v20-watheqa", "nav:watheqa", "وثيقة داخل إنجاز", "كتب الجاليات من نظام وثيقة تُسحب تلقائياً كل ساعتين وقت الدوام، مع كشف الموافقات («لا مانع») وتسجيلها بضغطة."],
  ["v20-permits", "nav:permits", "تصاريح الدروس بالباركود", "تصريح إلقاء درس رسمي بباركود يمسحه الإمام للتحقق. يصدره رئيس القسم، أو موظف يفوّضه بتصريح محدد."],
  ["v20-halls", "nav:halls", "حجز القاعات", "حجز مسرح ثنيان الغانم وقاعات المسجد الكبير مع منع التعارض تلقائياً."],
  ["v20-inbox", "nav:inbox", "الطلبات الواردة", "كل طلب يأخذ رقماً (ط-١٢) مع تأكيد استلام للمنسق، ويظهر معه ما يرتبط به من كتب ومهام."],
  ["v20-copilot", "nav:copilot", "مساعد إنجاز", "اسأل بالعربي: أنشطة اليوم، التعارضات، الموافقات، التصاريح… ويجاوبك فوراً من بيانات النظام."],
  ["v20-bell", "id:bell", "مركز الإشعارات", "إشعاراتك مرتبة باليوم، بلون وأيقونة لكل نوع، مع فلتر «غير المقروءة»."],
  ["v20-refresh", "id:refresh-btn", "زر التحديث", "يجيب آخر نسخة من النظام ويحدّث الصفحة بضغطة."],
  ["v20-pass", "id:mypass", "تغيير كلمة المرور", "غيّر كلمة مرورك بنفسك — يطلب الحالية أولاً لحمايتك."],
  ["v20-users", "nav:users", "طلبات إنشاء الحساب", "الموظف الجديد يطلب حساباً من صفحة الدخول، ولا يُفعَّل إلا بموافقة يوسف أو فايز.", true]];
S.seen = null;
const nfFresh = f => !f[5] || f[5] >= addDays(TODAY, -21);
const nfVisible = () => NEWF.filter(f => nfFresh(f) && (!f[4] || S.admin) && (f[1].startsWith("nav:") ? $(`#nav [data-nav="${f[1].slice(4)}"]`) : true));
const nfUnseen = () => S.seen ? nfVisible().filter(f => !S.seen.has(f[0])) : [];
async function loadSeen(){ const { data } = await sb.from("seen_features").select("keys").maybeSingle(); S.seen = new Set(data?.keys || []); nfPaint(); if (S.view === "home" && $("#drawer").hidden) render(); }
let nfT = null;
function markSeen(keys){ if (!S.seen) return; keys.forEach(k => S.seen.add(k)); nfPaint(); clearTimeout(nfT);
  nfT = setTimeout(() => sb.from("seen_features").upsert({ user_id:S.me.id, keys:[...S.seen], updated_at:new Date().toISOString() }).then(() => {}), 300); }
function nfPaint(){
  const U = nfUnseen(), places = new Set(U.map(f => f[1]));
  document.querySelectorAll(".nf-host > .nf-b").forEach(b => { if (!places.has(b.dataset.place)) { b.parentElement.classList.remove("nf-host"); b.remove(); } });
  for (const pl of places) {
    const el = pl.startsWith("nav:") ? $(`#nav [data-nav="${pl.slice(4)}"]`) : $("#" + pl.slice(3)); if (!el || el.querySelector(":scope > .nf-b")) continue;
    el.classList.add("nf-host"); el.insertAdjacentHTML("beforeend", `<span class="nf-b" data-place="${pl}">جديد</span>`);
  }
}
function nfCard(){ const L = nfUnseen(); if (!L.length) return "";
  return `<div class="panel nf-card"><div class="panel-h"><h3>✨ ما الجديد في «إنجاز»</h3><span class="s">تحديثات ${L.length}</span><button type="button" class="btn btn-ghost" data-nfall>تم، إخفاء</button></div>
    <div class="panel-b nf-list">${L.map(f => `<button type="button" class="nf-i" ${f[1].startsWith("nav:") ? `data-nfgo="${f[1].slice(4)}"` : ""} data-nfk="${f[0]}"><span class="nf-b">جديد</span><span class="nf-t"><b>${esc(f[2])}</b><span>${esc(f[3])}</span></span></button>`).join("")}</div></div>`; }
function nfTip(f, el){
  document.querySelector(".nf-tip")?.remove(); const r = el.getBoundingClientRect();
  const t = document.createElement("div"); t.className = "nf-tip"; t.innerHTML = `<b>${esc(f[2])}</b><span>${esc(f[3])}</span><button type="button" class="btn btn-primary" data-nftipok>فهمت</button>`;
  document.body.appendChild(t); const w = t.offsetWidth, mob = innerWidth < 700;
  t.style.top = (mob ? Math.max(70, innerHeight / 2 - 80) : Math.min(innerHeight - t.offsetHeight - 12, r.bottom + 8)) + "px";
  t.style.left = (mob ? (innerWidth - w) / 2 : Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2))) + "px";
  setTimeout(() => document.addEventListener("mousedown", function out(e){ if (!t.contains(e.target)) { t.remove(); document.removeEventListener("mousedown", out, true); } }, true));
}
// clicking a «جديد» item: show what changed once, then the badge is gone for good
document.addEventListener("click", ev => {
  const host = ev.target.closest(".nf-host"); if (!host || !S.seen) return;
  const all = nfUnseen().filter(x => (x[1] === "nav:" + host.dataset.nav) || (x[1] === "id:" + host.id)); if (!all.length) return;
  const f = all.length === 1 ? all[0] : [all[0][0], all[0][1], all.length + " تحديثات هنا", all.map(x => "• " + x[2]).join("\n")];
  markSeen(all.map(x => x[0])); setTimeout(() => nfTip(f, host.dataset.nav && innerWidth >= 700 ? ($("#view .panel, #view .toolbar") || host) : host), host.dataset.nav ? 250 : 50);
}, true);
document.addEventListener("click", ev => { const t = ev.target.closest("button"); if (!t) return; const D = t.dataset;
  if (D.nfall !== undefined) { markSeen(nfVisible().map(f => f[0])); return render(); }
  if (D.nfk) { markSeen([D.nfk]); if (D.nfgo) return go(D.nfgo); render(); const f = NEWF.find(x => x[0] === D.nfk); const el = f && $("#" + f[1].slice(3)); if (el) nfTip(f, el); return; }
  if (D.nftipok !== undefined) t.closest(".nf-tip")?.remove();
});
const _vHome24 = vHome;
vHome = function(){ return nfCard() + _vHome24(); };
const _afterRender24 = afterRender;
afterRender = function(){ _afterRender24(); nfPaint(); };
const _boot9nf24 = boot9;
boot9 = function(){ _boot9nf24(); loadSeen().catch(() => {}); };
