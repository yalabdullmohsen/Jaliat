/* ================= v49: smart pack، approvals register themselves, renewals ask the coordinator, lessons & sermons confirmed on site,
   activities without approval, monthly management summary, coordinators evaluation ================= */
Object.assign(TITLES, { coordeval:"تقييم المنسقين" });
S.renewAns = new Map(); S.checkins = []; S.khLinks = [];
async function loadSmart(){ const [a, b, c] = await Promise.all([sb.from("renew_answers").select("*"), sb.from("permit_checkins").select("permit_id,day,imam,phone,held,attend,note,at").gte("day", addDays(TODAY, -120)).limit(5000), sb.from("khatib_links").select("*")]);
  S.renewAns = new Map((a.data || []).map(r => [r.doc_no, r])); S.checkins = b.data || []; S.khLinks = c.data || []; }
const _boot9s49 = boot9; boot9 = function(){ _boot9s49(); loadSmart().then(() => { if ($("#drawer").hidden && ["home", "renew", "rewards", "permits", "coordeval", "report"].includes(S.view)) render(); }); };

/* ---------- (1) an approval from Watheqa registers itself: approval + its activities, one tap ---------- */
function wqPlan(w){ const P = (() => { try { return parseActs(w.body || ""); } catch (_) { return { acts:[] }; } })();
  const comm = (typeof wqComm === "function" && wqComm(w)) || "";
  const start = wqDate(w) || TODAY, end = addMonths(start, 6);
  const acts = (P.acts || []).map(a => { try { return tolAct(a, { comm }); } catch (_) { return null; } }).filter(a => a && (a.mosque || a.mosRaw));
  return { no:w.no, comm, start, end, acts }; }
function wqApprove(id){ const w = S.wq.find(x => x.id === id); if (!w) return; const P = wqPlan(w); S.form = { kind:"wqap", id, plan:P };
  openDrawer(`اعتماد الموافقة ${w.no}`, `<div class="check ok"><b>${esc(w.subj || "")}</b><span>${esc(wqFrom(w) || "")} · ${fmt(wqDate(w))}</span></div>
    ${fld("ap-comm", "الجالية والمنسق", `<select class="f" id="ap-comm"><option value="">— اختر —</option>${S.comms.filter(c => !c.pending).map(c => `<option${c.name === P.comm ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</select>`)}
    <div class="g2">${fld("ap-s", "من", `<input class="f" type="date" id="ap-s" value="${P.start}">`)}${fld("ap-e", "إلى (6 أشهر كحد أقصى)", `<input class="f" type="date" id="ap-e" value="${P.end}">`)}</div>
    <div class="rq-sec"><b>الأنشطة التي قرأها النظام من الكتاب (${P.acts.length})</b>${P.acts.length ? P.acts.map((a, i) => `<label class="ap-a"><input type="checkbox" data-api="${i}" checked><span><b>${esc(a.type || "درس")}</b> · ${esc(mosBy[a.mosque]?.name || a.mosRaw || "")} · ${esc(daysText(a) || "")} ${esc(a.time || "")}${a.lect ? " · " + esc(a.lect) : ""}</span></label>`).join("") : `<span class="s">لم يتعرّف النظام على جدول في نص الكتاب، تُسجَّل الموافقة وتضيف الأنشطة لاحقاً من «إضافة نشاط».</span>`}</div>
    <span class="hint">بعد الاعتماد: تُسجَّل الموافقة في «الوثائق»، وتُضاف الأنشطة المختارة، ويُجهَّز إبلاغ المنسق.</span>`,
    `<button class="btn btn-primary" type="button" data-apgo>اعتماد وتسجيل</button><button class="btn btn-ghost" data-close>إلغاء</button>`); }
async function wqApproveGo(){ const F = S.form; if (F?.kind !== "wqap") return; const w = S.wq.find(x => x.id === F.id); const comm = $("#ap-comm").value; if (!comm) return toast("اختر الجالية");
  let s = $("#ap-s").value || TODAY, e = $("#ap-e").value || addMonths(s, 6); if (e > addMonths(s, 6)) e = addMonths(s, 6);
  const pick = [...document.querySelectorAll("[data-api]")].filter(x => x.checked).map(x => F.plan.acts[+x.dataset.api]);
  try { if (!docBy[w.no]) await T.ref("docs", [...S.docs, { no:w.no, date:wqDate(w) || s, subj:w.subj || "موافقة", comm, start:s, end:e, notes:"من نظام وثيقة، " + (wqFrom(w) || "") }]);
    let n = Math.max(0, ...[...S.acts.values()].map(a => a.n || 0));
    for (const a of pick) { n++; const { mosRaw, ...x } = a; await T.put("acts", null, { ...x, comm, doc:w.no, start:"", end:"", status:"مجدول", n, notes:[x.notes, mosRaw && !x.mosque ? "المسجد كما ورد: " + mosRaw : ""].filter(Boolean).join(" · ") }); }
    closeDrawer(); toast(`سُجّلت الموافقة ${w.no}${pick.length ? ` و${pick.length} نشاط` : ""} ✓`); setTimeout(() => wqForm(w.id), 400); } catch (er) { writeFail(er); } }
const _wqForm49 = wqForm;
wqForm = function(id){ _wqForm49(id); const b = $('.drawer-f [data-wqadd]'); if (b) { b.removeAttribute("data-wqadd"); b.dataset.wqap = id; b.textContent = "اعتماد الموافقة وتسجيل أنشطتها"; } };

/* ---------- (3) renewals: the coordinator answers from the portal, the letter is prepared in one tap ---------- */
const _renewMsg49 = renewMsg;
renewMsg = function(x, c){ const t = _renewMsg49(x, c), u = typeof portalURL === "function" ? portalURL(x.comm) : ""; return u ? `${t}\n\nللرد بضغطة واحدة (نستمر أو لا نستمر):\n${u}` : t; };
const _vRenew49 = vRenew;
vRenew = function(){ const h = _vRenew49(); const A = [...S.renewAns.values()].filter(r => { const d = docBy[r.doc_no]; return d && d.end >= addDays(TODAY, -30); }).sort((a, b) => b.at.localeCompare(a.at));
  if (!A.length) return h;
  const box = `<div class="panel ra-p"><div class="panel-h"><h3>ردود المنسقين على التجديد</h3><span class="chip">${A.length}</span></div><div class="list">${A.map(r => { const d = docBy[r.doc_no];
    return `<div class="li"><span class="t"><b>${esc(r.comm || d?.comm || "")}</b> · الموافقة ${esc(r.doc_no)} تنتهي ${fmt(d?.end)}${r.note ? `<br><span class="s">${esc(r.note)}</span>` : ""}</span><span class="chip ${r.answer === "نعم" ? "ok" : "bad"}">${r.answer === "نعم" ? "نستمر" : "لا نستمر"}</span>${r.answer === "نعم" && S.canWrite ? `<button type="button" class="btn btn-primary" data-letter="renew:${esc(r.doc_no)}">تجهيز كتاب التجديد</button>` : ""}</div>`; }).join("")}</div></div>`;
  return box + h; };

/* ---------- (5) lessons confirmed by the imam's scan ---------- */
const chkFor = id => S.checkins.filter(c => c.permit_id === id);
const _permitView49 = permitView;
permitView = async function(id){ await _permitView49(id); const L = chkFor(id).sort((a, b) => b.day.localeCompare(a.day)); const b = $(".drawer-b"); if (!b) return;
  b.insertAdjacentHTML("afterbegin", `<div class="rq-sec imr"><b>تقارير إمام المسجد (${L.length})</b>${L.length ? L.slice(0, 8).map(r => `<div class="imr-i"><span class="chip ${r.held === false ? "bad" : "ok"}">${r.held === false ? "لم يُقم" : "أُقيم"}</span><span><b>${fmt(r.day)}</b>${r.attend ? ` · الحضور ${r.attend}` : ""}<br><span class="s">${esc(r.imam || "")}${r.phone ? ` · <span class="num">${esc(r.phone)}</span>` : ""}</span>${r.note ? `<br>${esc(r.note)}` : ""}</span>${r.phone ? `<button type="button" class="btn btn-ghost" data-imwa="${esc(r.phone)}|${esc(r.imam || "")}">تواصل</button>` : ""}</div>`).join("") : `<span class="s">لم يصل تقرير بعد، إمام المسجد يمسح الباركود ويكتب تقريره (أُقيم الدرس أم لا، الحضور، الملاحظات).</span>`}</div>`); };
document.addEventListener("click", ev => { const t = ev.target.closest("[data-imwa]"); if (!t) return; const [ph, nm] = t.dataset.imwa.split("|"); waOpen(ph, `السلام عليكم ورحمة الله وبركاته\nالأخ الفاضل/ ${nm} حفظه الله\n\n`); });

/* ---------- (6) every khatib confirms his own sermon from a personal link ---------- */
const sermonURL = t => `${location.origin}${location.pathname.replace(/[^/]*$/, "")}sermon.html#${t}`;
async function khLinksMake(){ const rows = []; for (const [id, k] of S.khatibs) { for (const who of ["pri", "bak"]) { if (!(who === "pri" ? k.pri : k.bak)) continue; if (!S.khLinks.some(l => l.kh_id === String(id) && l.who === who)) rows.push({ kh_id:String(id), who }); } }
  if (rows.length) { const { error } = await sb.from("khatib_links").insert(rows); if (error) return writeFail(error); } await loadSmart(); khLinksOpen(); }
function khLinksOpen(){ const L = S.khLinks.filter(l => l.active).map(l => { const k = S.khatibs.get(l.kh_id) || S.khatibs.get(+l.kh_id) || {}; return { l, k, name:l.who === "pri" ? k.pri : k.bak, ph:l.who === "pri" ? k.pph : k.bph }; }).filter(x => x.name);
  openDrawer("روابط تأكيد خطبة الجمعة", `<div class="check"><b>كل خطيب يؤكد خطبته بنفسه يوم الجمعة</b><span>أرسل لكل خطيب رابطه مرة واحدة. يضغطه بعد الخطبة فتُسجَّل تلقائياً في «تسجيل الخطب»، ويُنبَّه القسم إذا سُجّل نفس الخطيب في مسجدين لنفس الجمعة.</span></div>
    ${S.canWrite ? `<button type="button" class="btn" data-khmake>${L.length ? "إضافة روابط للخطباء الجدد" : "إنشاء الروابط لكل الخطباء"}</button>` : ""}
    <div class="list">${L.map(x => `<div class="li"><span class="t"><b>${esc(x.name)}</b><br><span class="s">${esc(x.k.mosque || "")} · ${x.l.who === "pri" ? "أساسي" : "احتياط"}</span></span>${x.ph ? `<button type="button" class="btn" data-khwa="${esc(x.l.token)}">إرسال بالواتساب</button>` : `<button type="button" class="btn btn-ghost" data-cpy="${esc(sermonURL(x.l.token))}">نسخ الرابط</button>`}</div>`).join("") || `<div class="empty s">لا توجد روابط بعد</div>`}</div>`, `<button class="btn btn-ghost" data-close>إغلاق</button>`); }
function khWa(token){ const l = S.khLinks.find(x => x.token === token); if (!l) return; const k = S.khatibs.get(l.kh_id) || S.khatibs.get(+l.kh_id) || {}; const name = l.who === "pri" ? k.pri : k.bak, ph = l.who === "pri" ? k.pph : k.bph;
  waOpen(ph, `السلام عليكم ورحمة الله وبركاته\nالأخ الفاضل/ ${name} حفظه الله\nخطيب مسجد ${k.mosque || ""}\n\nهذا رابطك الخاص لتأكيد خطبة الجمعة بعد إلقائها (يوم الجمعة أو السبت):\n${sermonURL(token)}\n\nاحفظه عندك، وبه تُحسب مكافأتك الشهرية تلقائياً. جزاكم الله خيراً.\n\nقسم الجاليات ورعاية المهتدين وطلبة البعوث`); }
const _vRewards49 = vRewards;
vRewards = function(){ const h = _vRewards49(); if (SR.tab !== "grid") return h; const fromKh = [...SR.rows.values()].filter(r => r.src === "khatib" && fridays(...srMonth()).includes(r.fri)).length, dup = [...SR.rows.values()].filter(r => r.note && /مكرر|مسجد آخر/.test(r.note)).length;
  const bar = `<div class="kh-bar"><button type="button" class="btn" data-khlinks>روابط تأكيد الخطبة للخطباء</button><span class="s">${fromKh} خطبة أكّدها الخطباء بأنفسهم هذا الشهر</span>${dup ? `<span class="chip bad">${dup} تسجيل مكرر يحتاج مراجعة</span>` : ""}</div>`;
  const i = h.indexOf('<div class="kpis">'); return i < 0 ? bar + h : h.slice(0, i) + bar + h.slice(i); };

/* ---------- (7) activities running without a valid approval ---------- */
function actsNoDoc(){ return S.E.filter(e => !["ملغى", "مكتمل", "مؤجل", "منتهي"].includes(e.status) && (!e.doc || !docBy[e.doc] || (docBy[e.doc].end && docBy[e.doc].end < TODAY))); }
const _prio49 = priorities;
priorities = function(){ const P = _prio49(); const L = actsNoDoc(); if (L.length && S.canWrite) P.push({ w:93, k:"bad", t:`${L.length} نشاط جارٍ بلا موافقة سارية`, s:"انتهت موافقته أو لم تُسجَّل له موافقة، جدّد أو أوقف النشاط", act:{ open:"nodoc", l:"عرضها" } }); return P.sort((a, b) => b.w - a.w); };
function noDocOpen(){ const L = actsNoDoc(); openDrawer(`أنشطة بلا موافقة سارية (${L.length})`, `<div class="list">${L.map(e => { const d = docBy[e.doc]; return `<button type="button" class="li" data-prio-open="act:${e.id}"><span class="t"><b>${esc(e.comm || "")}</b> · ${esc(e.mosName || "")}<br><span class="s">${esc(e.type || "")} · ${esc(daysText(e))} · ${d ? `الموافقة ${esc(e.doc)} انتهت ${fmt(d.end)}` : e.doc ? `الموافقة ${esc(e.doc)} غير مسجلة` : "بلا رقم موافقة"}</span></span></button>`; }).join("") || `<div class="empty">لا يوجد ✓</div>`}</div>`, `<button class="btn btn-ghost" data-close>إغلاق</button>`); }

/* ---------- (8) monthly report: a management summary on top ---------- */
const _vReport49 = vReport;
vReport = function(){ const h = _vReport49(); const ym = S.repMonth || TODAY.slice(0, 7);
  const rh = (typeof RH !== "undefined" ? RH.rows : []).filter(r => r.month === ym), rew = rh.reduce((s, r) => s + +r.amount, 0);
  const wqM = S.wq.filter(w => wqDate(w).startsWith(ym)), sent = wqM.filter(w => wqDir(w) === "out").length, ok = wqM.filter(w => wqDir(w) === "in" && w.approval).length;
  const tasksDone = S.tasks.filter(t => t.status === "منجزة" && (t.done_at || "").startsWith(ym));
  const per = S.profiles.filter(p => p.active).map(p => [p, tasksDone.filter(t => t.assignee === p.id).length]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
  const docsNew = S.docs.filter(d => (d.date || d.start || "").startsWith(ym)).length, chk = S.checkins.filter(c => c.day.startsWith(ym)).length;
  const box = `<div class="panel ms"><div class="panel-h"><h3>ملخص الإدارة للشهر</h3></div><div class="ms-g">
    ${[["كتب أرسلناها في وثيقة", sent], ["موافقات وصلت", ok], ["موافقات سُجّلت", docsNew], ["دروس أكّدتها المساجد", chk], ["مكافآت الخطباء المعتمدة", rh.length ? kd(rew) + " د.ك" : "—"], ["مهام أُنجزت", tasksDone.length], ["أنشطة بلا موافقة سارية", actsNoDoc().length]].map(([a, b]) => `<div><span>${a}</span><b class="num">${b}</b></div>`).join("")}</div>
    ${per.length ? `<div class="ms-p"><b>إنجاز الموظفين</b>${per.map(([p, n]) => `<span>${esc(p.name || p.username)} <b class="num">${n}</b></span>`).join("")}</div>` : ""}</div>`;
  const i = h.indexOf('<div class="rp-bar">'); const j = i < 0 ? -1 : h.indexOf("</div>", i) + 6; return j > 5 ? h.slice(0, j) + box + h.slice(j) : box + h; };

/* ---------- (9) coordinators evaluation ---------- */
function coordScores(){ return S.comms.filter(c => !c.pending && c.coord).map(c => {
    const docs = S.docs.filter(d => d.comm === c.name), live = docs.filter(d => !d.end || d.end >= TODAY), lapsed = docs.filter(d => d.end && d.end < TODAY && d.end >= addDays(TODAY, -180) && !docs.some(x => x !== d && (x.start || x.date || "") >= addDays(d.end, -45)));
    const acts = S.E.filter(e => e.comm === c.name && !["ملغى", "مكتمل"].includes(e.status));
    const ans = docs.map(d => S.renewAns.get(d.no)).filter(Boolean), reqs = (S.reqs || []).filter(r => r.data?.comm === c.name);
    const permits = S.permits.filter(p => (p.data?.comm || "") === c.name), conf = permits.filter(p => chkFor(p.id).length).length;
    let score = 60 + Math.min(20, acts.length * 2) + Math.min(10, ans.length * 5) + (permits.length ? Math.round(10 * conf / permits.length) : 5) - lapsed.length * 15 - actsNoDoc().filter(e => e.comm === c.name).length * 5;
    score = Math.max(0, Math.min(100, score));
    return { c, live:live.length, lapsed:lapsed.length, acts:acts.length, ans:ans.length, reqs:reqs.length, score }; }).sort((a, b) => b.score - a.score); }
function vCoordEval(){ const L = coordScores(); const q = nkey(S.f.ceq || "");
  return `<div class="check"><b>تقييم المنسقين</b><span>مؤشر تقريبي من 100: نشاط الجالية، والرد على التجديد، وتأكيد الدروس من المساجد، ويُخصم للموافقات التي انتهت دون تجديد والأنشطة بلا موافقة.</span></div>
    <div class="toolbar"><div class="search"><svg><use href="#i-search"/></svg><input class="f" id="ceq" data-fk="ceq" placeholder="ابحث باسم المنسق أو الجالية…" value="${esc(S.f.ceq || "")}"></div></div>
    <div class="panel"><div class="table-wrap"><table class="stbl ce-t"><thead><tr><th>المنسق والجالية</th><th class="c">التقييم</th><th class="c">أنشطة جارية</th><th class="c">موافقات سارية</th><th class="c">انتهت دون تجديد</th><th class="c">ردود التجديد</th><th class="c">طلبات</th></tr></thead><tbody>
    ${L.filter(x => !q || nkey(x.c.name + " " + x.c.coord).includes(q)).map(x => `<tr><td class="nm"><b>${esc(x.c.coord)}</b><span class="s">${esc(x.c.name)}</span></td><td class="c"><span class="ce-s ${x.score >= 80 ? "ok" : x.score >= 60 ? "warn" : "bad"}">${x.score}</span></td><td class="c num">${x.acts}</td><td class="c num">${x.live}</td><td class="c num">${x.lapsed || "—"}</td><td class="c num">${x.ans || "—"}</td><td class="c num">${x.reqs || "—"}</td></tr>`).join("")}</tbody></table></div></div>`; }
document.addEventListener("click", ev => { const t = ev.target.closest("[data-wqap],[data-apgo],[data-khmake],[data-khlinks],[data-khwa],[data-prio-open='nodoc']"); if (!t) return; const D = t.dataset;
  if (D.wqap) { ev.stopPropagation(); return wqApprove(D.wqap); } if (D.apgo !== undefined) return wqApproveGo();
  if (D.khmake !== undefined) return khLinksMake(); if (D.khlinks !== undefined) return khLinksOpen(); if (D.khwa) return khWa(D.khwa);
  if (D.prioOpen === "nodoc") { ev.stopPropagation(); return noDocOpen(); } }, true);
NEWF.splice(1, 0, ["v49-smart", "nav:watheqa", "حزمة ذكية جديدة", "اعتماد موافقة وثيقة مع أنشطتها بضغطة، ورد المنسق على التجديد من البوابة، وتأكيد الدرس من المسجد بالباركود، وتأكيد الخطيب لخطبته برابط، وتنبيه الأنشطة بلا موافقة، وملخص الإدارة الشهري، وتقييم المنسقين.", false, "2026-10-20"]);
