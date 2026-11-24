/* ================= v90 (JL-AUDIT «نضيف 1»): القائمة حسب الدور ================= */
/* كل دور يرى افتراضيًا الصفحات التي يحتاجها فعلًا (5 إلى 7) ثم «الدليل»، والباقي خلف «المزيد».
   لا تُحذف أي صفحة ولا يتغيّر مسارها: البحث في القائمة يعرض الكل، والصفحة المفتوحة من خارج الأساسية تفتح «المزيد» تلقائيًا. */
const NAV_CORE = {
  admin:  ["home", "inbox", "acts", "permits", "cal", "tasks", "users"],
  editor: ["home", "inbox", "acts", "permits", "cal", "tasks", "watheqa"],
  viewer: ["home", "acts", "cal", "permits", "stats"]
};
const navRole = () => S.admin ? "admin" : S.canWrite ? "editor" : "viewer";
const navMoreKey = "navMore90";
function navLean(){
  const nav = $("#nav"); if (!nav || !S.me) return;
  /* مساحة الأقسام الأخرى لها قائمة قصيرة خاصة بها */
  if (document.body.classList.contains("dp-only")) { nav.classList.remove("lean"); return; }
  const role = navRole();
  if (nav.dataset.lean !== role) {
    let core = $("#nl-core");
    if (!core) {
      core = document.createElement("div"); core.id = "nl-core"; core.className = "nl-core";
      const more = document.createElement("button"); more.type = "button"; more.id = "nl-more"; more.className = "nl-more";
      more.innerHTML = `<svg><use href="#i-chev"/></svg><span>المزيد</span>`;
      const q = nav.querySelector(".nav-q");
      if (q) q.after(core); else nav.prepend(core);
      core.after(more);
    }
    /* أعِد أي زر نُقل سابقًا إلى مكانه قبل إعادة البناء لدور آخر */
    core.querySelectorAll("button[data-nav]").forEach(b => { const home = b.dataset.nlHome && nav.querySelector(`[data-nl-slot="${b.dataset.nav}"]`); if (home) home.replaceWith(b); });
    const keys = [...NAV_CORE[role], "guide"];
    for (const k of keys) {
      const b = nav.querySelector(`button[data-nav="${k}"]:not(.dp-n)`);
      if (!b || b.closest(".admin-only[hidden]") || (b.hidden && k !== "users")) continue;
      if (k === "users" && !S.admin) continue;
      /* علامة مكان الزر الأصلي كي يعود إليه إن تغيّر الدور */
      const slot = document.createElement("i"); slot.hidden = true; slot.dataset.nlSlot = k; b.before(slot);
      b.dataset.nlHome = "1"; b.hidden = false; core.append(b);
    }
    nav.dataset.lean = role; nav.classList.add("lean");
  }
  navMoreSync();
}
/* «المزيد» مفتوح إن اختاره المستخدم، أو كانت الصفحة الحالية خارج الأساسية */
function navMoreSync(){
  const nav = $("#nav"), more = $("#nl-more"); if (!nav || !more) return;
  let open = false; try { open = localStorage.getItem(navMoreKey) === "1"; } catch (_) {}
  const cur = nav.querySelector('button[data-nav][aria-current="page"]');
  if (cur && !cur.closest("#nl-core")) open = true;
  nav.classList.toggle("more", open);
  more.setAttribute("aria-expanded", String(open));
  more.querySelector("span").textContent = open ? "أقل" : "المزيد";
}
document.addEventListener("click", ev => {
  if (!ev.target.closest("#nl-more")) return;
  const open = !$("#nav")?.classList.contains("more");
  try { localStorage.setItem(navMoreKey, open ? "1" : "0"); } catch (_) {}
  navMoreSync();
});
const _afterRender90 = afterRender;
afterRender = function(v){ _afterRender90(v); navLean(); };
/* جولة تشير إلى زر خلف «المزيد»: يُفتح أولًا كي يظهر العنصر المشار إليه */
const _tourShow90 = tourShow;
tourShow = async function(){
  const s = TOURS[TR.k]?.steps[TR.i];
  if (s?.sel?.startsWith("#nav")) { const el = document.querySelector(s.sel); if (el && !el.closest("#nl-core")) $("#nav")?.classList.add("more"); }
  return _tourShow90.apply(this, arguments);
};
