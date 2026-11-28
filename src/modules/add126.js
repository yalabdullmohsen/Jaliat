/* ================= v126: «تصاريح جاهزة للإرسال»
   كل كتاب موافقة في بطاقة واحدة: تصاريحه كلها معاً، ومنسقه المؤكَّد (الاسم والرقم محفوظان في التصريح نفسه data.coord،
   مأخوذان من ملاحظة الكتاب في وثيقة ومطابقان لسجل المنسقين). إرسال الكل PDF بضغطة، ثم «✓ تم الإبلاغ» يضعها المستخدم بنفسه.
   تظهر في صفحة وثيقة وصفحة التصاريح، والمنسق في «المطلوب منك الآن» وعلامة الإبلاغ يُؤخذان من نفس المصدر ================= */
const prBook = p => p.data?.book?.no || (String(p.data?.note || "").match(/\d{4}-\d{4}(?:-\d{2})?/) || [])[0] || "";
const prDocOf = b => S.wq.find(x => x.no === b) || S.wq.find(x => x.no === b.split("-").slice(0, 2).join("-")) || null;
function prSentOf(w){ if (!w) return null; const ids = [w.id, wqParent(w)?.id, ...wqKids(w).map(k => k.id)].filter(Boolean); return ids.map(i => S.wqn.get(i)).find(Boolean) || null; }
function prCoord(ps){ const c = ps.map(p => p.data?.coord).find(x => x && x.phone); if (c) return { ...c, ok:true };
  const cm = ps.map(p => p.data?.comm).find(Boolean) || ""; const L = typeof coFor === "function" ? coFor(cm) : []; const g = L.sort((a, b) => (a.role === "منسق" ? 0 : 1) - (b.role === "منسق" ? 0 : 1))[0];
  return g ? { name:g.name, phone:g.phone, comm:g.comm, ok:false } : null; }
function prGroups(){ const since = addDays(TODAY, -10), G = new Map();
  for (const p of S.permits || []) { if (p.revoked || String(p.issued_at || "").slice(0, 10) < since) continue; const b = prBook(p); if (!b) continue; if (!G.has(b)) G.set(b, []); G.get(b).push(p); }
  const out = []; for (const [b, ps] of G) { const w = prDocOf(b); ps.sort((a, z) => String(a.no).localeCompare(String(z.no)));
    out.push({ b, w, ps, c:prCoord(ps), sent:prSentOf(w), last:ps.map(p => p.issued_at).sort().pop() || "" }); }
  return out.sort((a, z) => (!!a.sent - !!z.sent) || String(z.last).localeCompare(String(a.last))); }

function prCard(g){ const c = g.c, subj = g.w?.subj || g.ps[0]?.data?.topic || "";
  const co = c ? `<div class="prs-co${c.ok ? "" : " warn"}"><span class="prs-lb">يُرسل إلى</span><b>${esc(c.name)}</b><small>${esc(c.comm || "")}</small><bdi dir="ltr" class="prs-ph">${esc(c.phone)}</bdi>
      <span class="prs-cb"><button type="button" class="btn btn-ghost" data-cpph="${esc(c.phone)}">نسخ الرقم</button><a class="btn" href="whatsapp://send?phone=${waNum(c.phone)}">${icon("i-wa")} محادثته</a></span>
      <span class="prs-v">${c.ok ? `✓ مؤكَّد من ${esc(c.src || "ملاحظة الكتاب في وثيقة")}` : "" + ei("warn") + "غير مؤكَّد: مأخوذ من جالية التصريح، تأكد قبل الإرسال"}</span></div>`
    : `<div class="prs-co warn"><b>لا يوجد منسق محدد لهذا الكتاب</b><span class="prs-v">${ei("warn")}لا ترسل قبل التأكد من المنسق</span></div>`;
  const list = `<ol class="prs-l">${g.ps.map(p => `<li><button type="button" class="prs-i" data-permit="${esc(p.id)}"><bdi dir="ltr" class="num">${esc(p.no)}</bdi><b>${esc(p.data?.sheikh || "—")}</b><span class="s">${esc(p.data?.mosque || "")} · ${esc(p.data?.time || "")}</span></button></li>`).join("")}</ol>`;
  const foot = g.sent ? `<div class="prs-f"><span class="prs-done">✓ أُبلغ ${esc(g.sent.coord || "")} · ${fmtTime(g.sent.sent_at)}</span><button class="btn btn-ghost" type="button" data-prsend="${esc(g.b)}">إعادة الإرسال</button><button class="btn btn-ghost" type="button" data-prundo="${esc(g.sent.wq_id)}">↺ تراجع: لم أرسلها</button></div>`
    : `<div class="prs-f"><button class="btn btn-ok" type="button" data-prsend="${esc(g.b)}">${icon("i-wa")} إرسال الكل PDF (${g.ps.length})</button>${g.w ? `<button class="btn" type="button" data-prdone="${esc(g.b)}">✓ تم الإبلاغ</button>` : ""}</div>`;
  return `<div class="prs-c${g.sent ? " sent" : ""}"><div class="prs-top"><button type="button" class="chip t1 num" ${g.w ? `data-wq="${esc(g.w.id)}"` : ""}><bdi dir="ltr">${esc(g.b)}</bdi></button><b>${esc(subj)}</b><span class="chip">${g.ps.length} تصريح</span></div>${co}${list}${foot}</div>`; }

function prsBox(){ if (!S.canWrite) return ""; const G = prGroups(), todo = G.filter(g => !g.sent), done = G.filter(g => g.sent);
  if (!G.length) return "";
  return `<div class="prs" id="prs"><div class="prs-h"><b>تصاريح جاهزة للإرسال</b><span class="chip warn">${todo.length} كتاب · ${todo.reduce((n, g) => n + g.ps.length, 0)} تصريح</span></div>
    <span class="s">كل كتاب في بطاقة مع منسقه. اضغط «إرسال الكل PDF»، وأرسل الملفات في واتساب لنفس الرقم المكتوب بالبطاقة، ثم اضغط «✓ تم الإبلاغ».</span>
    ${todo.map(prCard).join("") || `<div class="check ok"><b>كل التصاريح أُبلغ بها المنسقون ✓</b></div>`}
    ${done.length ? `<details class="prs-old"><summary>أُبلغ بها (${done.length})</summary>${done.map(prCard).join("")}</details>` : ""}</div>`; }

async function prSend(b){ const ps = (prGroups().find(g => g.b === b) || {}).ps || []; if (!ps.length) return; closeDrawer();
  for (let i = 0; i < ps.length; i++) { toast(`يجهّز ملف PDF ${i + 1} من ${ps.length}…`); try { await permitView(ps[i].id); await permitPdf(ps[i].id); } catch (_) {} }
  closeDrawer(); const g = prGroups().find(x => x.b === b); pBulkSummary({ no:b }, ps, 0);
  if (g?.c) $(".drawer-b")?.insertAdjacentHTML("afterbegin", `<div class="prs-co"><span class="prs-lb">أرسلها إلى</span><b>${esc(g.c.name)}</b><bdi dir="ltr" class="prs-ph">${esc(g.c.phone)}</bdi></div>`); }
async function prDone(b){ const g = prGroups().find(x => x.b === b); if (!g?.w) return; if (!g.c) return toast("حدّد المنسق أولاً");
  const { data, error } = await sb.from("wq_notify").insert({ wq_id:g.w.id, outcome:"موافقة", coord:g.c.name, phone:waNum(g.c.phone), comm:g.c.comm || null }).select().single(); if (error) return writeFail(error);
  S.wqn.set(g.w.id, data); toast(`عُلِّم: أُبلغ ${g.c.name} ✓`); render(); }
document.addEventListener("click", ev => { const s = ev.target.closest("[data-prsend]"); if (s) { ev.preventDefault(); return prSend(s.dataset.prsend); }
  const d = ev.target.closest("[data-prdone]"); if (d) { ev.preventDefault(); return prDone(d.dataset.prdone); } });

/* البطاقة أعلى صفحة وثيقة وصفحة التصاريح */
const prsInto = h => { const box = prsBox(); if (!box) return h; const i = h.indexOf('<div class="toolbar">'); return i < 0 ? box + h : h.slice(0, i) + box + h.slice(i); };
const _vWatheqa126 = vWatheqa; vWatheqa = function(){ return prsInto(_vWatheqa126()); };
const _vPermits126 = vPermits; vPermits = function(){ return canPermit() || S.canWrite ? prsInto(_vPermits126()) : _vPermits126(); };

/* «المطلوب منك الآن» وعلامة الإبلاغ: المنسق المؤكَّد في التصريح أولاً، لا تخمين الجالية من نص الكتاب */
const _wqTodo126 = wqTodo; wqTodo = function(){ return _wqTodo126().map(t => { const c = prCoord(wqPermitsOf(t.w, wqActsOf(t.w))); return c?.ok ? { ...t, comm:`${c.name} (${c.phone})` } : t; }); };
const _wqMarkSent126 = wqMarkSent; wqMarkSent = async function(id){ const w = wqById(id); const c = w && prCoord(wqPermitsOf(w, wqActsOf(w)));
  if (!c?.ok) return _wqMarkSent126(id);
  const { data, error } = await sb.from("wq_notify").insert({ wq_id:w.id, outcome:"موافقة", coord:c.name, phone:waNum(c.phone), comm:c.comm || null }).select().single(); if (error) return writeFail(error);
  S.wqn.set(w.id, data); toast(`عُلِّم: أُبلغ ${c.name} ✓`); wqForm(w.id); };

/* تراجع عن «تم الإبلاغ» من البطاقة نفسها (ضُغطت بالغلط) */
document.addEventListener("click", async ev => { const u = ev.target.closest("[data-prundo]"); if (!u) return; ev.preventDefault(); ev.stopPropagation();
  const { error } = await sb.from("wq_notify").delete().eq("wq_id", u.dataset.prundo); if (error) return writeFail(error);
  S.wqn.delete(u.dataset.prundo); toast("رجعت البطاقة لقائمة «جاهزة للإرسال»"); render(); }, true);
