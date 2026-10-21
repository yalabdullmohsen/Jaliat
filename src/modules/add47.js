/* ===== v57: Watheqa letters sorted by who wrote them: our requests to the mosque administrations vs their replies (approval / refusal) ===== */
/* the database classifies every letter by its signer (trigger wq_classify): dir = out | in | internal, kind = طلب | صادر | موافقة | رفض | رد | وارد | داخلي */
const _wqDir57 = wqDir;
wqDir = function(w){ return w.dir === "out" ? "out" : w.dir ? "in" : _wqDir57(w); };
const WQK = { "طلب":["طلب منّا", "out"], "صادر":["صادر منّا", "out"], "موافقة":["موافقة", "ok"], "رفض":["رفض", "bad"], "رد":["رد", "t1"], "وارد":["وارد", "t1"], "داخلي":["داخلي", ""] };
const WQK_TABS = [["", "الكل", null], ["req", "طلباتنا لإدارات المساجد", ["طلب"]], ["ok", "موافقات وصلتنا", ["موافقة"]], ["no", "رفض", ["رفض"]], ["rep", "ردود أخرى", ["رد"]]];
const wqWhoTo = w => wqClean(w.to_whom).replace(/^مدير\s+/, "").replace(/^[إا]دار[ةه]\s+/, "");
function wqDayHTML(base){
  const T = base.filter(w => wqDate(w) === TODAY), out = T.filter(w => w.kind === "طلب"), rep = T.filter(w => ["موافقة", "رفض", "رد"].includes(w.kind));
  const ok = rep.filter(w => w.kind === "موافقة").length, no = rep.filter(w => w.kind === "رفض").length;
  const row = w => `<button type="button" class="wqk-r" data-wq="${esc(w.id)}"><span class="chip ${WQK[w.kind]?.[1] || ""}">${WQK[w.kind]?.[0] || ""}</span><b>${esc(w.subj || "")}</b><span class="s">${w.dir === "out" ? "إلى " + esc(wqWhoTo(w)) : "من " + esc(wqFrom(w))} · <bdi dir="ltr">${esc(w.no || "")}</bdi></span></button>`;
  return `<div class="wqk-day"><div class="wqk-h"><b>اليوم في وثيقة</b><span>أرسلنا ${out.length} طلب لإدارات المساجد · وصلنا ${ok} موافقة و${no} رفض${rep.length - ok - no ? ` و${rep.length - ok - no} رد آخر` : ""}</span></div>
    ${out.length + rep.length ? `<div class="wqk-l">${[...rep, ...out].map(row).join("")}</div>` : `<span class="s">لا جديد اليوم.</span>`}</div>`; }
const _vWatheqa57 = vWatheqa;
vWatheqa = function(){ const all = S.wq, base = S.f.wqall === "1" ? all : all.filter(wqIsJal), k = WQK_TABS.find(t => t[0] === (S.f.wqk || "")) || WQK_TABS[0];
  const cnt = t => t[2] ? base.filter(w => t[2].includes(w.kind)).length : base.length;
  if (k[2]) S.wq = all.filter(w => k[2].includes(w.kind));
  let h; try { h = _vWatheqa57(); } finally { S.wq = all; }
  const by = new Map(all.map(w => [String(w.id), w]));
  h = h.replace(/data-wq="([^"]+)"><span class="wq-d"><i>([^<]*)<\/i><b>(صادر|وارد)<\/b>/g, (m, id, i, b) => { const w = by.get(id), q = w && WQK[w.kind]; return q ? `data-wq="${id}"><span class="wq-d k-${q[1]}"><i>${i}</i><b>${q[0]}</b>` : m; });
  const pane = `<div class="wqk panel"><div class="panel-b">${wqDayHTML(base)}
    <div class="seg wqk-seg">${WQK_TABS.map(t => `<button type="button" class="${t === k ? "on" : ""}" data-wqk="${t[0]}">${t[1]} <span class="num">${cnt(t)}</span></button>`).join("")}</div></div></div>`;
  const i = h.indexOf('<div class="wq-tiles">'); return i < 0 ? pane + h : h.slice(0, i) + pane + h.slice(i); };
document.addEventListener("click", ev => { const t = ev.target.closest("[data-wqk]"); if (!t) return; S.f.wqk = t.dataset.wqk; S.f.wqt = "all"; render(); });

NEWF.splice(1, 0, ["v57-wqk", "nav:watheqa", "وثيقة: طلباتنا وردودهم منفصلة", "يفرّق النظام تلقائياً بين الطلبات التي أرسلناها لإدارات المساجد، والموافقات والرفض الواصلة منهم، مع ملخص «اليوم في وثيقة».", false, "2026-10-21"]);
