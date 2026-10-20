/* ===== v55: final cleanup — pages that duplicated others or were never used are retired ===== */
// ملاحظاتي الخاصة ← الملاحظات · التوصيات ← القرارات · الأسئلة ← المحادثات · الزيارات الميدانية ← تقارير الإمام بالباركود · سجل التحديثات ← شارة «جديد»
const RETIRED = { mine:"notes", recs:"decisions", questions:"chat", visits:"permits", changes:"home" };
const _go55 = go;
go = function(v, opt){ return _go55(RETIRED[v] || v, opt); };
function navTrim(){ Object.keys(RETIRED).forEach(k => document.querySelectorAll(`#nav [data-nav="${k}"], .tabbar [data-nav="${k}"]`).forEach(b => b.remove()));
  document.querySelectorAll('#nav [data-vsnew], .drawer-f [data-vsnew]').forEach(b => b.remove());
  // القرارات (التعاميم) belong with communication; a group holding a single page is flattened away
  const dec = document.querySelector('#nav [data-nav="decisions"]'), comm = document.querySelector('#nav [data-nav="whatsapp"]')?.closest(".ng-b");
  if (dec && comm && dec.closest(".ng-b") !== comm) comm.insertBefore(dec, comm.firstChild);
  document.querySelectorAll("#nav .ng").forEach(g => { if (!g.querySelector(".ng-b [data-nav]")) g.remove(); }); }
const _afterRender55 = afterRender;
afterRender = function(v){ _afterRender55(v); navTrim(); };
const _prio55 = priorities;
priorities = function(){ return _prio55().filter(p => !(p.act?.go && RETIRED[p.act.go])); };
const _palAll55 = palAll;
palAll = function(){ return _palAll55().filter(x => !/(ملاحظاتي الخاصة|التوصيات|الأسئلة|الزيارات الميدانية|سجل التحديثات)/.test(x.t || "")); };
for (let i = NEWF.length - 1; i >= 0; i--) { const t = String(NEWF[i][1] || ""); if (Object.keys(RETIRED).some(k => t === "nav:" + k)) NEWF.splice(i, 1); }
const _actForm55 = actForm;
actForm = function(id, preset){ _actForm55(id, preset); document.querySelectorAll('.drawer-f [data-vsnew]').forEach(b => b.remove()); document.querySelectorAll('#drawer .lk-p').forEach(p => { if (/الزيارات الميدانية/.test(p.textContent)) p.remove(); }); };
navTrim();
if (NEWF.length > 6) NEWF.length = 6; // only the latest features carry the «جديد» badge
