/* ================= v26: every release becomes «جديد» automatically + «سجل التحديثات» ================= */
/* CHANGELOG is injected at build time from the release history: [id, iso date, title] */
Object.assign(TITLES, { changes:"سجل التحديثات" });
const CH_PLACE = [[/محادث|تراسل|رسائل/, "nav:chat"], [/وثيقة/, "nav:watheqa"], [/تصريح|تصاريح|باركود/, "nav:permits"], [/واتساب/, "nav:whatsapp"], [/مهام|مهمة|إنجاز سجل/, "nav:tasks"],
  [/سؤال|أسئلة/, "nav:questions"], [/قاعة|قاعات|حجز/, "nav:halls"], [/طلب وارد|الطلبات/, "nav:inbox"], [/إشعار/, "id:bell"], [/حساب|كلمة المرور/, "id:mypass"], [/خطب|خطيب/, "nav:khatibs"],
  [/نشاط|أنشطة|تعارض/, "nav:acts"], [/جالية|جاليات/, "nav:comms"], [/مساعد|copilot/i, "nav:copilot"], [/الرئيسية|أولويات/, "nav:home"]];
const placeOf = t => (CH_PLACE.find(([re]) => re.test(t)) || [, "nav:changes"])[1];
const chDate = iso => String(iso).slice(0, 10);
for (const [id, iso, title] of (typeof CHANGELOG !== "undefined" ? CHANGELOG : [])) {
  if (chDate(iso) < "2026-10-20") continue; // earlier releases are covered by the hand-written entries above
  if (NEWF.some(f => f[0] === "c-" + id)) continue;
  NEWF.push(["c-" + id, placeOf(title), title, `تحديث بتاريخ ${fmt(chDate(iso))}`, false, chDate(iso)]);
}
NEWF.forEach(f => { if (!f[5]) f[5] = "2026-10-20"; });
function vChanges(){
  const L = (typeof CHANGELOG !== "undefined" ? CHANGELOG : []).filter(c => !/^(Merge|wip)/i.test(c[2]));
  const days = []; for (const c of L) { const d = chDate(c[1]); let g = days.find(x => x.d === d); if (!g) days.push(g = { d, items:[] }); g.items.push(c); }
  return `<div class="panel"><div class="panel-h"><h3>كل تحديثات «إنجاز»</h3><span class="s">${L.length} تحديث</span></div><div class="panel-b cl">${days.map(g => `<div class="cl-d"><b>${g.d === TODAY ? "اليوم" : g.d === addDays(TODAY, -1) ? "أمس" : fmt(g.d)}</b>${g.items.map(c => { const k = "c-" + c[0], fresh = S.seen && !S.seen.has(k) && chDate(c[1]) >= addDays(TODAY, -21);
    return `<div class="cl-i"><i class="cl-dot"></i><span>${esc(c[2])}</span><time>${new Date(c[1]).toLocaleTimeString("ar-KW-u-nu-latn", { hour:"numeric", minute:"2-digit", hour12:true })}</time>${fresh ? `<span class="nf-b">جديد</span>` : ""}</div>`; }).join("")}</div>`).join("") || `<div class="empty">لا توجد تحديثات</div>`}</div></div>`;
}
const _render26 = render;
render = function(){ const r = _render26.apply(this, arguments); if (S.view === "changes" && S.seen) { const ks = (typeof CHANGELOG !== "undefined" ? CHANGELOG : []).map(c => "c-" + c[0]).filter(k => !S.seen.has(k)); if (ks.length) setTimeout(() => markSeen(ks), 1500); } return r; };
const _nfCard26 = nfCard;
nfCard = function(){ const h = _nfCard26(); return h ? h.replace('<button type="button" class="btn btn-ghost" data-nfall>', '<button type="button" class="btn btn-ghost" data-go="changes">كل التحديثات</button><button type="button" class="btn btn-ghost" data-nfall>') : h; };
const _palAll26 = palAll;
palAll = function(){ const A = _palAll26(); A.push({ g:"إجراءات", t:"سجل التحديثات", s:"كل ما أُضيف وعُدّل في النظام", ic:"i-log", run:() => go("changes"), txt:"تحديثات جديد ما الجديد سجل" }); return A; };
/* assistant knows the newest parts too */
const _answer26 = answer;
answer = function(q){ const t = norm(q); const R = (title, items, extra) => ({ title, items:items || [], extra:extra || "" });
  if (/رسائل|محادث|دردش/.test(t)) { const convs = [...new Set(S.chat.map(m => m.conv))].map(c => ({ c, n:chatUnread(c), last:S.chat.find(m => m.conv === c) })).filter(x => x.last);
    return R(`المحادثات (${chatUnreadAll()} غير مقروءة)`, convs.sort((a, b) => b.n - a.n).slice(0, 12).map(x => ({ t:`${chatName(peerOfConv(x.c))}${x.n ? `، ${x.n} جديدة` : ""}`, s:x.last.deleted ? "رسالة محذوفة" : x.last.body.slice(0, 80), open:`chat:${peerOfConv(x.c)}` }))); }
  if (/تحديث|جديد في|ما الجديد/.test(t)) return R("آخر تحديثات النظام", (typeof CHANGELOG !== "undefined" ? CHANGELOG : []).slice(0, 10).map(c => ({ t:c[2], s:fmt(String(c[1]).slice(0, 10)), go:"changes" })));
  return _answer26(q); };
