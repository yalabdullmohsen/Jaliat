/* ===== v58: removed from the system at Yousef's request: «القرارات»، «التوصيات»، «الزيارات الميدانية» (pages hidden, stored data kept untouched) ===== */
const GONE58 = ["decisions", "recs", "visits"];
loadRD = async function(){ S.recs = []; S.decs = []; S.dreads = []; };
loadVisits = async function(){ S.visits = []; };
for (let i = NEWF.length - 1; i >= 0; i--) if (GONE58.some(k => NEWF[i][1] === "nav:" + k)) NEWF.splice(i, 1);
const _go58 = go; go = function(v, ...a){ return _go58(GONE58.includes(v) ? "home" : v, ...a); };
const _prio58 = priorities; priorities = function(){ return _prio58().filter(p => !/قرار جديد من رئيس القسم|توصية/.test(p.t || "")); };
const _palAll58 = palAll; palAll = function(){ return _palAll58().filter(x => !/توصية|قرار|زيارة/.test((x.t || "") + " " + (x.txt || ""))); };
