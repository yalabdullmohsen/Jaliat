/* ===== v58: removed from the system at Yousef's request: «القرارات»، «التوصيات»، «الزيارات الميدانية» (pages hidden, stored data kept untouched) ===== */
const GONE58 = ["decisions", "recs", "visits"];
loadRD = async function(){ S.recs = []; S.decs = []; S.dreads = []; };
loadVisits = async function(){ S.visits = []; };
for (let i = NEWF.length - 1; i >= 0; i--) if (GONE58.some(k => NEWF[i][1] === "nav:" + k)) NEWF.splice(i, 1);
const _go58 = go; go = function(v, ...a){ return _go58(GONE58.includes(v) ? "home" : v, ...a); };
const _prio58 = priorities; priorities = function(){ return _prio58().filter(p => !/قرار جديد من رئيس القسم|توصية/.test(p.t || "")); };
const _palAll58 = palAll; palAll = function(){ return _palAll58().filter(x => !/توصية|قرار|زيارة/.test((x.t || "") + " " + (x.txt || ""))); };
/* «الأكثر استخداماً» removed from the sidebar at Yousef's request */
navFav = function(){ $("#nav-fav")?.remove(); };
/* sidebar always open: every group expanded, no folding (Yousef's request) */
ngApply = function(){ document.querySelectorAll("#nav .ng").forEach(g => { g.classList.remove("cl"); g.querySelector(".sep")?.setAttribute("aria-expanded", "true"); const d = g.querySelector(".ng-n"); if (d) d.hidden = true; }); };
try { if (!LS.get("mini58", false)) { $("#app")?.classList.remove("mini"); LS.set("mini", false); LS.set("mini58", true); } localStorage.removeItem("ng"); } catch (_) {}
/* the 9740 idle lock screen is cancelled (Yousef's request): never shown, and any saved lock is cleared */
lockApp = function(){ try { localStorage.removeItem("jl-lock"); } catch (_) {} $("#lk-box")?.remove(); };
try { localStorage.removeItem("jl-lock"); } catch (_) {}
