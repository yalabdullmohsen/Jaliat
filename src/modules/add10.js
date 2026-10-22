/* ================= v9.9: Copilot can change the system (add / edit / delete via action blocks) ================= */
const ACT_SPEC = `
## صلاحياتك على النظام (مهم)
يمكنك تعديل النظام نفسه. عندما أطلب منك إضافة أو تعديل أو حذف أي شيء، اشرح باختصار ما ستفعله ثم ضع في نهاية ردك كتلة كود واحدة لغتها jaliyat-actions تحتوي مصفوفة JSON بالأوامر، وسينفذها النظام فوراً بصلاحياتي. لا تضع الكتلة إلا عند طلب تغيير فعلي.
الأوامر المتاحة (الأيام بأسمائها العربية، التواريخ YYYY-MM-DD، المسجد والجالية بالاسم كما في الملف):
- {"op":"add_act","data":{"type":"درس ديني|دورة علمية|محاضرة دينية","comm":"الجالية","mosque":"اسم المسجد بدون كلمة مسجد","gov":"المحافظة","days":["الاثنين"],"time":"بعد صلاة المغرب","lect":"المحاضر","title":"","doc":"رقم الوثيقة","start":"","end":"","notes":""}}
- {"op":"update_act","n":رقم_النشاط,"set":{ أي حقل من حقول add_act أو "status":"مجدول|مكتمل|مؤجل|ملغى" }}
- {"op":"delete_act","n":رقم_النشاط}
- {"op":"add_doc","data":{"no":"2609-0000","subj":"","comm":"","date":"","start":"","end":"","notes":""}}
- {"op":"update_doc","no":"رقم الوثيقة","set":{...}}
- {"op":"update_khatib","mosque":"اسم مسجد الجمعة","set":{"pri":"","pph":"","bak":"","bph":"","note":""}}
- {"op":"add_note","data":{"title":"","body":"","prio":"عالية|متوسطة|منخفضة","comm":""}}
- {"op":"set_sermon","fri":"YYYY-MM-DD","mosque":"اسم مسجد الجمعة","who":"pri|bak|none"}
مثال:
\`\`\`jaliyat-actions
[{"op":"update_act","n":125,"set":{"time":"بعد صلاة العشاء"}}]
\`\`\``;
const _PRIME = PRIME_MSG;
PRIME_MSG = _PRIME.replace("لا تلخص الملف الآن", ACT_SPEC + "\n\nلا تلخص الملف الآن");
const CPX = { list:[], auto:LS.get("cpauto", false) };
function findActions(txt){
  const out = [];
  for (let i = txt.indexOf("["); i >= 0; i = txt.indexOf("[", i + 1)) {
    if (!/^\[\s*\{/.test(txt.slice(i, i + 20))) continue;
    let d = 0, inStr = false, esc2 = false;
    for (let j = i; j < txt.length; j++) { const c = txt[j];
      if (inStr) { if (esc2) esc2 = false; else if (c === "\\") esc2 = true; else if (c === '"') inStr = false; continue; }
      if (c === '"') inStr = true; else if (c === "[") d++; else if (c === "]") { d--; if (!d) { try { const a = JSON.parse(txt.slice(i, j + 1)); if (Array.isArray(a) && a.every(x => x && x.op)) out.push(...a); } catch (_) {} i = j; break; } } }
  }
  return out;
}
const dayIdx = v => { const n = norm(v).replace(/^ال/, ""); const i = DAYS.findIndex(d => norm(d).replace(/^ال/, "") === n); return i; };
function mosByName(name, gov){ if (!name) return null; const k = nkey(String(name).replace(/^مسجد\s*/, "")); return S.mosques.find(m => nkey(m.name) === k && (!gov || m.gov === gov)) || S.mosques.find(m => nkey(m.name) === k) || S.mosques.find(m => nkey(m.name).includes(k) || k.includes(nkey(m.name))); }
function commByName(c){ if (!c) return ""; const k = nkey(c); return commNames.find(x => nkey(x) === k) || commNames.find(x => nkey(x).includes(k) || k.includes(nkey(x))) || ""; }
function khByMosque(name){ const k = nkey(String(name || "").replace(/^مسجد\s*/, "")); return [...S.khatibs.entries()].find(([, x]) => nkey(x.mosque) === k) || [...S.khatibs.entries()].find(([, x]) => nkey(x.mosque).includes(k) || k.includes(nkey(x.mosque))); }
function normActFields(src, base){
  const v = { ...base };
  for (const [k, val] of Object.entries(src || {})) {
    if (k === "days") { const arr = (Array.isArray(val) ? val : [val]).map(x => typeof x === "number" ? x : dayIdx(x)).filter(x => x >= 0); if (/يومي/.test(JSON.stringify(val))) { v.daily = true; v.days = [0,1,2,3,4,5,6]; } else { v.daily = false; v.days = arr; } }
    else if (k === "mosque") { const m = mosByName(val, src.gov || v.gov); if (!m) throw new Error(`المسجد «${val}» غير موجود في النظام`); v.mosque = m.id; if (!v.gov) v.gov = m.gov; }
    else if (k === "comm") { const c = commByName(val); if (!c) throw new Error(`الجالية «${val}» غير موجودة`); v.comm = c; }
    else if (k === "type") { if (!TYPES.includes(val)) throw new Error(`نوع غير صحيح: ${val}`); v.type = val; }
    else if (["gov", "time", "lect", "title", "doc", "start", "end", "notes", "status"].includes(k)) v[k] = String(val ?? "");
  }
  return v;
}
function describe(a){
  try {
    if (a.op === "add_act") { const d = a.data || {}; return ["إضافة نشاط", `${d.type || ""}، ${d.comm || ""}، مسجد ${d.mosque || ""}، ${(d.days || []).join("، ")} ${d.time || ""}، ${d.lect || ""}`, "ok"]; }
    if (a.op === "update_act") return [`تعديل النشاط #${a.n}`, Object.entries(a.set || {}).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join("، ") : v}`).join(" · "), "gold"];
    if (a.op === "delete_act") { const e = S.E.find(x => x.n === +a.n); return [`حذف النشاط #${a.n}`, e ? `${e.comm}، ${e.mosName}، ${daysText(e)} ${e.time}` : "غير موجود", "bad"]; }
    if (a.op === "add_doc") return ["إضافة وثيقة", `${a.data?.no}، ${a.data?.subj || ""}`, "ok"];
    if (a.op === "update_doc") return [`تعديل الوثيقة ${a.no}`, Object.entries(a.set || {}).map(([k, v]) => `${k}: ${v}`).join(" · "), "gold"];
    if (a.op === "update_khatib") return [`تعديل خطباء مسجد ${a.mosque}`, Object.entries(a.set || {}).map(([k, v]) => `${k}: ${v}`).join(" · "), "gold"];
    if (a.op === "add_note") return ["إضافة ملاحظة", a.data?.title || "", "ok"];
    if (a.op === "set_sermon") return [`تسجيل خطبة ${a.fri}`, `${a.mosque}، ${({ pri:"الأساسي", bak:"الاحتياط", none:"لم تُلقَ" })[a.who] || a.who}`, "t1"];
  } catch (_) {}
  return [a.op, "", ""];
}
async function runAction(a){
  if (!S.canWrite) throw new Error("صلاحيتك عرض فقط");
  if (a.op === "add_act") { const v = normActFields(a.data, { type:"درس ديني", days:[], daily:false, status:"مجدول", time:"", lect:"", title:"", doc:"", start:"", end:"", notes:"", gov:"" }); if (!v.comm) throw new Error("الجالية مطلوبة"); const n = Math.max(0, ...[...S.acts.values()].map(x => x.n || 0)) + 1; await T.put("acts", null, { ...v, n }); return `أُضيف النشاط #${n}`; }
  if (a.op === "update_act") { const e = S.E.find(x => x.n === +a.n); if (!e) throw new Error(`النشاط #${a.n} غير موجود`); const v = normActFields(a.set, S.acts.get(e.id)); await T.put("acts", e.id, v); return `عُدّل النشاط #${a.n}`; }
  if (a.op === "delete_act") { if (!S.canWrite) throw new Error("صلاحيتك عرض فقط"); const e = S.E.find(x => x.n === +a.n); if (!e) throw new Error(`النشاط #${a.n} غير موجود`); await T.del("acts", e.id); return `حُذف النشاط #${a.n}`; }
  if (a.op === "add_doc") { const d = a.data || {}; if (!d.no) throw new Error("رقم الوثيقة مطلوب"); if (docBy[d.no]) throw new Error(`الوثيقة ${d.no} موجودة`); await T.ref("docs", [...S.docs, { no:d.no, subj:d.subj || "", comm:commByName(d.comm) || d.comm || "", date:d.date || "", start:d.start || "", end:d.end || "", notes:d.notes || "" }]); return `أُضيفت الوثيقة ${d.no}`; }
  if (a.op === "update_doc") { const L = [...S.docs]; const i = L.findIndex(x => x.no === a.no); if (i < 0) throw new Error(`الوثيقة ${a.no} غير موجودة`); L[i] = { ...L[i], ...Object.fromEntries(Object.entries(a.set || {}).map(([k, v]) => [k, String(v ?? "")])) }; await T.ref("docs", L); return `عُدّلت الوثيقة ${a.no}`; }
  if (a.op === "update_khatib") { const hit = khByMosque(a.mosque); if (!hit) throw new Error(`مسجد الجمعة «${a.mosque}» غير موجود`); const ok = ["pri", "pph", "pid", "bak", "bph", "bid", "note", "area", "gov"]; const set = Object.fromEntries(Object.entries(a.set || {}).filter(([k]) => ok.includes(k)).map(([k, v]) => [k, String(v ?? "")])); await T.put("khatibs", hit[0], { ...hit[1], ...set }); return `عُدّل خطباء ${hit[1].mosque}`; }
  if (a.op === "add_note") { const d = a.data || {}; await T.put("notes", null, { title:d.title || "ملاحظة من Copilot", body:d.body || "", prio:d.prio || "متوسطة", status:"مفتوحة", date:TODAY, comm:commByName(d.comm), src:"Microsoft 365 Copilot" }); return "أُضيفت الملاحظة"; }
  if (a.op === "set_sermon") { const hit = khByMosque(a.mosque); if (!hit) throw new Error(`مسجد «${a.mosque}» غير موجود`); if (dOf(a.fri)?.getDay() !== 5) throw new Error(`${a.fri} ليس يوم جمعة`); await srSet(a.fri + "|" + hit[0], a.who); return `سُجّلت خطبة ${hit[1].mosque} ${fmt(a.fri)}`; }
  throw new Error("أمر غير معروف: " + a.op);
}
function cpxRender(){
  const box = $("#cpx"); if (!box) return;
  if (!CPX.list.length) { box.innerHTML = ""; return; }
  box.innerHTML = `<div class="cpx"><b>${icon("i-spark")} Copilot يطلب ${CPX.list.length} تغيير${CPX.list.length > 1 ? "ات" : ""} على النظام</b>
    ${CPX.list.map((x, i) => { const [t, s, c] = describe(x.a); return `<div class="cpx-i ${x.st || ""}"><span class="chip ${c}">${esc(t)}</span><span class="s">${esc(s)}</span>${x.msg ? `<span class="${x.st === "err" ? "err" : "ok-t"}">${esc(x.msg)}</span>` : ""}${!x.st ? `<button type="button" class="btn" data-cpxrun="${i}">تنفيذ</button>` : ""}</div>`; }).join("")}
    <div class="br-acts">${CPX.list.some(x => !x.st) ? `<button type="button" class="btn btn-primary" data-cpxall>تنفيذ الكل</button><button type="button" class="btn" data-cpxno>تجاهل</button>` : `<button type="button" class="btn" data-cpxno>إغلاق</button>`}</div>
    <label class="pv-t"><input type="checkbox" id="cpx-auto"${CPX.auto ? " checked" : ""}> نفّذ أوامر Copilot تلقائياً (ما عدا الحذف)</label></div>`;
}
async function cpxRun(i){
  const x = CPX.list[i]; if (!x || x.st) return;
  try { x.msg = await runAction(x.a); x.st = "done"; } catch (e) { x.msg = e?.message || "تعذّر التنفيذ"; x.st = "err"; if (e?.code) writeFail(e); }
  cpxRender();
}
async function cpxAll(skipDelete){ for (let i = 0; i < CPX.list.length; i++) if (!CPX.list[i].st && !(skipDelete && CPX.list[i].a.op === "delete_act")) await cpxRun(i); const n = CPX.list.filter(x => x.st === "done").length; if (n) toast(`نُفّذ ${n} تغيير بأمر Copilot`); }
window.addEventListener("message", e => {
  if (!/^https:\/\/m365\.cloud\.microsoft$/.test(e.origin) || e.data?.type !== "jaliyat-reply") return;
  const acts = findActions(String(e.data.text || "")); if (!acts.length) return;
  CPX.list = acts.map(a => ({ a })); cpxRender();
  if (CPX.auto) cpxAll(true);
});
const _vCopilot10 = vCopilot;
vCopilot = function(){ const h = _vCopilot10(); if (!hasBridge()) return h; return h.replace('<div id="br-last"', '<div id="cpx"></div><div id="br-last"'); };
const _afterRender10 = afterRender;
afterRender = function(v){ _afterRender10(v); if (v === "copilot") cpxRender(); };
document.addEventListener("click", ev => { const t = ev.target.closest("button"); if (!t) return;
  if (t.dataset.cpxrun !== undefined) return cpxRun(+t.dataset.cpxrun);
  if (t.dataset.cpxall !== undefined) return cpxAll(false);
  if (t.dataset.cpxno !== undefined) { CPX.list = []; return cpxRender(); }
});
document.addEventListener("change", ev => { if (ev.target.id === "cpx-auto") { CPX.auto = ev.target.checked; LS.set("cpauto", CPX.auto); } });
