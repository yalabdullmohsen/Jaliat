/* ================= v42: «لوحتي»، every employee sees what is required of him, what remains and what he finished ================= */
const monthNow = () => TODAY.slice(0, 7);
function myWork(){ const me = S.me?.id; if (!me) return null;
  const T = S.tasks.filter(t => t.assignee === me), open = T.filter(t => TK_OPEN.includes(t.status));
  const lateT = open.filter(t => t.due && t.due < TODAY), today = open.filter(t => t.due === TODAY), newT = open.filter(t => !t.seen_at || t.status === "جديدة");
  const waitMgr = open.filter(t => t.waiting === "mgr"), later = open.filter(t => !lateT.includes(t) && !today.includes(t));
  const doneM = T.filter(t => t.status === "منجزة" && (t.done_at || "").startsWith(monthNow()));
  const wqF = S.canWrite && typeof wqPendList === "function" ? wqPendList() : [];
  const now = [...lateT.map(t => ({ k:"bad", t:`متأخرة: ${t.title}`, s:`م-${t.no} · كان موعدها ${fmt(t.due)}`, a:`data-task="${t.id}"` })),
    ...today.map(t => ({ k:"warn", t:t.title, s:`م-${t.no} · موعدها اليوم`, a:`data-task="${t.id}"` })),
    ...newT.filter(t => !lateT.includes(t) && !today.includes(t)).map(t => ({ k:"gold", t:`جديدة: ${t.title}`, s:`م-${t.no} · من ${pname(t.assigner)}`, a:`data-task="${t.id}"` })),
    ...(wqF.length ? [{ k:"warn", t:`${wqF.length} رد من وثيقة ينتظر إبلاغ المنسق`, s:"موافقة أو اعتذار", a:`data-go="watheqa"` }] : [])];
  const rest = [...later.filter(t => !newT.includes(t)).map(t => ({ t:t.title, s:`م-${t.no} · ${t.status}${t.due ? " · الموعد " + fmt(t.due) : ""}`, a:`data-task="${t.id}"` })),
    ...waitMgr.map(t => ({ t:`بانتظار رئيس القسم: ${t.title}`, s:`م-${t.no}`, a:`data-task="${t.id}"` }))];
  const done = doneM.sort((a, b) => (b.done_at || "").localeCompare(a.done_at || "")).map(t => ({ t:t.title, s:`م-${t.no} · ${fmt(t.done_at.slice(0, 10))}`, a:`data-task="${t.id}"` }));
  return { now, rest, done, openN:open.length, doneN:doneM.length, totalM:T.filter(t => (t.created_at || "").startsWith(monthNow())).length }; }
function myWorkCard(){ const W = myWork(); if (!W) return "";
  const col = (cls, title, sub, L, empty) => `<div class="mw-c ${cls}"><div class="mw-h"><b>${title}</b><span class="num">${L.length}</span></div><small>${sub}</small>
    <div class="mw-l">${L.slice(0, 6).map(x => `<button type="button" class="mw-i ${x.k || ""}" ${x.a}><b>${esc(x.t)}</b><span>${esc(x.s)}</span></button>`).join("") || `<div class="mw-e">${empty}</div>`}${L.length > 6 ? `<button type="button" class="lnk" data-go="tasks">+ ${L.length - 6} أخرى</button>` : ""}</div></div>`;
  const pct = W.doneN + W.openN ? Math.round(W.doneN / (W.doneN + W.openN) * 100) : 100;
  return `<section class="mw panel"><div class="mw-top"><div><h2>لوحتي، ${esc((S.me.name || S.me.username || "").split(" ")[0])}</h2><span class="s">ما المطلوب منك الآن، وما المتبقي، وما أنجزته هذا الشهر</span></div>
    <div class="mw-p"><div class="mw-ring" style="--p:${pct}"><b class="num">${pct}%</b></div><span>إنجاز الشهر</span></div></div>
    <div class="mw-g">${col("now", "المطلوب منك الآن", "متأخر، أو اليوم، أو جديد", W.now, "لا يوجد شيء عاجل ✓")}${col("rest", "المتبقي", "مهام مفتوحة مواعيدها لاحقاً", W.rest, "لا توجد مهام متبقية")}${col("done", "أنجزته هذا الشهر", "تُحسب في سجل إنجازك", W.done, "لم تُنجز مهام هذا الشهر بعد")}</div></section>`; }

/* bridge for every employee on a computer: one card until it is installed */
function bridgeCard(){ if (isTouchDev() || waEmbedOk()) return ""; try { if (+localStorage.getItem("br-later") > Date.now()) return ""; } catch (_) {}
  return `<div class="check warn br-all"><b>ركّب «جسر إنجاز 2.3» على هذا الجهاز، مرة واحدة</b><span>يشغّل Copilot وواتساب القسم داخل «إنجاز»، وتُرسل كل الرسائل من داخل النظام.</span><div class="br-acts"><button type="button" class="btn btn-primary" data-go="whatsapp">خطوات التركيب (دقيقتان)</button><button type="button" class="btn btn-ghost" data-brlater>لاحقاً</button></div></div>`; }
const _vHome42 = vHome;
vHome = function(){ return bridgeCard() + myWorkCard() + _vHome42(); };
document.addEventListener("click", ev => { const t = ev.target.closest("button"); if (!t) return;
  if (t.dataset.brlater !== undefined) { try { localStorage.setItem("br-later", Date.now() + 3 * 864e5); } catch (_) {} return render(); }
});
NEWF.splice(1, 0, ["v42-mw", "nav:home", "لوحتي", "في أول الرئيسية: المطلوب منك الآن، والمتبقي، وما أنجزته هذا الشهر مع نسبة إنجازك، كل بند يفتح بضغطة.", false, "2026-10-20"]);

/* ================= v43: «رجوع»، back to the previous page (works in the installed app window too) ================= */
S.backStack = [];
const _go43 = go;
go = function(v, ...a){ const from = S.view; if (!S._goingBack && from && from !== v) { S.backStack.push(from); if (S.backStack.length > 30) S.backStack.shift(); } S._goingBack = false; const r = _go43(v, ...a); backBtn(); return r; };
function goBack(){ if (!$("#drawer").hidden) return closeDrawer(); const v = S.backStack.pop(); if (!v) return; S._goingBack = true; go(v); }
function backBtn(){ let b = $("#back-btn"); if (!b) { const t = $("#title"); if (!t) return; t.insertAdjacentHTML("beforebegin", `<button class="back-btn" id="back-btn" type="button" aria-label="رجوع" title="رجوع (Alt+←)"><svg width="18" height="18" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>رجوع</span></button>`); b = $("#back-btn"); }
  b.hidden = !S.backStack.length || S.view === "home"; }
document.addEventListener("click", ev => { if (ev.target.closest("#back-btn")) goBack(); });
document.addEventListener("keydown", ev => { if (ev.altKey && ev.key === "ArrowLeft") { ev.preventDefault(); goBack(); } });
document.addEventListener("mouseup", ev => { if (ev.button === 3) { ev.preventDefault(); goBack(); } });
const _afterRender43 = afterRender;
afterRender = function(v){ _afterRender43(v); backBtn(); };

/* ================= v46: phones & installed apps pick up a new release on their own ================= */
(function(){ let mine = null, busy = false;
  async function ver(){ try { const t = await (await fetch("sw.js?t=" + Date.now(), { cache:"no-store" })).text(); return (t.match(/jaliyat-v\d+/) || [])[0] || null; } catch (_) { return null; } }
  async function check(){ if (busy || document.hidden) return; busy = true; const v = await ver(); busy = false; if (!v) return; if (!mine) { mine = v; return; } if (v === mine) return;
    const idle = $("#drawer")?.hidden !== false && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName) && !S.waPop;
    try { const r = await navigator.serviceWorker?.getRegistration(); await r?.update(); } catch (_) {}
    if (idle) return location.reload();
    if (!$("#upd-bar")) document.body.insertAdjacentHTML("beforeend", `<button type="button" id="upd-bar" class="upd-bar" onclick="location.reload()">⟳ يوجد تحديث جديد لـ«إنجاز»، اضغط للتحديث</button>`); }
  const badge = v => { if (!v) return; let e = $("#app-ver"); if (!e) { const a = $("#sugg-btn") || $("#side .side-foot"); if (!a) return; a.insertAdjacentHTML("afterend", `<div id="app-ver" class="app-ver"></div>`); e = $("#app-ver"); } e.textContent = `الإصدار ${v.replace("jaliyat-v", "")} · محدَّث ✓`; };
  ver().then(v => { mine = v; badge(v); });
  const _ar46 = afterRender; afterRender = function(x){ _ar46(x); badge(mine); };
  document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
  addEventListener("focus", check); setInterval(check, 5 * 60e3);
})();

/* ================= v47: notifications on EVERY device، a clear card until this device receives them ================= */
const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
function pushCard(){ try { if (+localStorage.getItem("push-later") > Date.now()) return ""; } catch (_) {}
  if (S.push.on) return "";
  if (isIOS() && !isStandalone()) return `<div class="check pc"><b>لتصلك إشعارات «إنجاز» على الآيفون</b><span>اضغط زر المشاركة <b>⬆</b> في Safari ثم <b>«إضافة إلى الشاشة الرئيسية»</b>، وافتح «إنجاز» من أيقونته وفعّل الإشعارات، مرة واحدة.</span><div class="br-acts"><button type="button" class="btn btn-ghost" data-pushlater>لاحقاً</button></div></div>`;
  if (!S.push.sup) return "";
  if ("Notification" in window && Notification.permission === "denied") return `<div class="check pc"><b>الإشعارات موقوفة على هذا الجهاز</b><span>فعّلها من إعدادات المتصفح أو الجهاز لموقع «إنجاز»، ثم حدّث الصفحة.</span></div>`;
  return `<div class="check pc"><b>فعّل الإشعارات على هذا الجهاز</b><span>تصلك المهام والقرارات وموافقات وثيقة فوراً، حتى و«إنجاز» مغلق.</span><div class="br-acts"><button type="button" class="btn btn-primary" data-pushon>تفعيل الإشعارات</button><button type="button" class="btn btn-ghost" data-pushlater>لاحقاً</button></div></div>`; }
const _vHome47 = vHome;
vHome = function(){ return pushCard() + _vHome47(); };
document.addEventListener("click", async ev => { const t = ev.target.closest("[data-pushlater]"); if (t) { try { localStorage.setItem("push-later", Date.now() + 7 * 864e5); } catch (_) {} return render(); }
  if (ev.target.closest(".pc [data-pushon]")) { setTimeout(() => S.view === "home" && render(), 1500); } });

/* ================= v48: sidebar «الأكثر استخداماً»، the pages each employee opens most, one tap away ================= */
const NAVF_SKIP = new Set(["home", "copilot"]);
const _go48 = go;
go = function(v, ...a){ if (v && !NAVF_SKIP.has(v)) { try { const f = JSON.parse(localStorage.getItem("navf") || "{}"); f[v] = (f[v] || 0) + 1; localStorage.setItem("navf", JSON.stringify(f)); } catch (_) {} } return _go48(v, ...a); };
function navFav(){ const nav = $("#nav"); if (!nav) return; let f = {}; try { f = JSON.parse(localStorage.getItem("navf") || "{}"); } catch (_) {}
  const top = Object.entries(f).filter(([k, n]) => n >= 2 && nav.querySelector(`.ng button[data-nav="${k}"]`)).sort((a, b) => b[1] - a[1]).slice(0, 4).map(x => x[0]);
  const sig = top.join(","); let box = $("#nav-fav"); if (box && box.dataset.sig === sig) return markFav(); box?.remove(); if (!top.length) return;
  const html = top.map(k => { const b = nav.querySelector(`.ng button[data-nav="${k}"]`).cloneNode(true); b.querySelector(".nb")?.remove(); b.classList.add("fav"); return b.outerHTML; }).join("");
  const after = nav.querySelector('button[data-nav="copilot"]') || nav.querySelector('button[data-nav="home"]');
  after?.insertAdjacentHTML("afterend", `<div id="nav-fav" data-sig="${sig}"><div class="fav-h">الأكثر استخداماً</div>${html}</div>`); markFav(); }
function markFav(){ document.querySelectorAll("#nav-fav button[data-nav]").forEach(b => b.setAttribute("aria-current", b.dataset.nav === S.view ? "page" : "false")); }
const _afterRender48 = afterRender;
afterRender = function(v){ _afterRender48(v); navFav(); };
