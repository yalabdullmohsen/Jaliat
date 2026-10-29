/* ================= v16: Watheqa data inside «إنجاز» + lesson permits with verifiable barcode ================= */
Object.assign(TITLES, { watheqa:"وثيقة", permits:"تصاريح الدروس" });
const WQ_VIEW = id => `https://watheqa.awqaf.gov.kw/Documents/View?id=${encodeURIComponent(id)}`;
S.wq = []; S.wqSync = null; S.permits = []; S.pAssets = {}; S.grants = [];
async function loadWq(){ const { data, error } = await sb.from("watheqa_docs").select("*").order("id", { ascending:false }).limit(3000); if (!error) S.wq = data || []; const s = await sb.from("settings").select("value").eq("key", "watheqa_sync").maybeSingle(); S.wqSync = s.data?.value || null; }
async function loadPermits(){ const { data, error } = await sb.from("permits").select("*").order("issued_at", { ascending:false }).limit(2000); if (!error) S.permits = data || []; const a = await sb.from("settings").select("value").eq("key", "permit_assets").maybeSingle(); S.pAssets = a.data?.value || {}; const g = await sb.from("permit_grants").select("*").order("created_at", { ascending:false }).limit(500); if (!g.error) S.grants = g.data || []; }
let wqCh = null;
function liveWq(){ if (wqCh) sb.removeChannel(wqCh); wqCh = sb.channel("wq").on("postgres_changes", { event:"*", schema:"public", table:"watheqa_docs" }, p => { if (p.new?.id) S.wq = [p.new, ...S.wq.filter(x => x.id !== p.new.id)]; if (S.view === "watheqa" && $("#drawer").hidden) render(); })
  .on("postgres_changes", { event:"*", schema:"public", table:"permits" }, p => { S.permits = p.eventType === "DELETE" ? S.permits.filter(x => x.id !== p.old?.id) : [p.new, ...S.permits.filter(x => x.id !== p.new.id)]; if (S.view === "permits" && $("#drawer").hidden) render(); })
  .on("postgres_changes", { event:"*", schema:"public", table:"permit_grants" }, p => { if (p.new?.id) S.grants = [p.new, ...S.grants.filter(x => x.id !== p.new.id)]; if (["permits", "tasks", "home"].includes(S.view) && $("#drawer").hidden) render(); }).subscribe(); }
const wqDate = w => { const m = (w.doc_date || "").match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : (w.created || "").replace(/\//g, "-").slice(0, 10); };
/* تاريخ الموافقة = تاريخ صدورها من الجهة (كتاب الرد «لا مانع»)، لا تاريخ إرسال طلبنا */
const wqApDate = w => { if (w.approval) return wqDate(w); const r = S.wq.filter(x => x.approval && (x.refs || []).includes(w.no)).sort((a, b) => wqDate(a).localeCompare(wqDate(b)))[0]; return r ? wqDate(r) : wqDate(w); };
/* v79: match a Watheqa letter to its community by the community/language name only (spelling-tolerant), never by a coordinator's first name */
const wqSkel = s => norm(s).replace(/^(وال|بال|لل|ال)/, "").replace(/[ايوهء]/g, "");
const WQ_GEN = new Set(["هند", "جل", "لغ", "نطق", "سلم", "متعدد", "لغت", "جمع", "جمعت", "خير", "خرت", "مركز", "مجمع", "مجمعت"]);
function wqCommAll(w){ const txt = norm((w.subj || "") + " " + (w.body || "")), words = new Set(txt.split(/[^\u0621-\u064Aa-z]+/i).filter(x => x.length > 2).map(wqSkel));
  const keys = c => { const cc = S.comms.find(x => x.name === c) || {}; return [String(c).split(" - ")[0], cc.lang, cc.group].filter(Boolean).flatMap(s => norm(s).split(/[\s–-]+/)).filter(x => x.length > 3).map(wqSkel).filter(k => k.length >= 3 && !WQ_GEN.has(k)); };
  const M = commNames.filter(c => { const k = keys(c); return k.length && k.some(x => words.has(x)); });
  const named = c => S.coords.some(co => co.comm === c && co.name && norm(co.name).length > 6 && txt.includes(norm(co.name)));
  const N = commNames.filter(named);
  return { M, N }; }
const wqComm = w => { const { M, N } = wqCommAll(w); if (N.length === 1) return N[0];
  const real = M.filter(c => !S.comms.find(x => x.name === c)?.pending), pend = M.filter(c => S.comms.find(x => x.name === c)?.pending);
  if (real.length === 1 && !pend.length) return real[0]; if (pend.length === 1) return pend[0]; return real[0] || pend[0] || ""; };

/* ---------- Watheqa page ---------- */
/* ---------- Watheqa page (v39): clear, community letters first, request ↔ reply in one card ---------- */
const WQ_JAL = /جالي|درس|دروس|محاضر|دورة|دورات|خطب|خطبة|تجديد|حلق|مهتد|تراويح|القيام|إفطار|افطار|صائم|جولات تعريفية/;
function wqDir(w){ const b = String(w.body || "").slice(0, 320);
  if (/العلاقات الخارجية/.test(w.to_whom || "") || /مدير\s+[إا]دارة\s+العلاقات\s+الخارجية|كتابكم/.test(b)) return "in";
  if (/(تهدي|يهدي)\S*\s+(?:[إا]دارة|مكتب مدير [إا]دارة|مدير [إا]دارة)\s+العلاقات الخارجية/.test(b)) return "out";
  if (/(تهدي|يهدي|يطيب)\S*/.test(b)) return "in";
  if (/(نرجو|يرجى)\s+التكرم\s+بالموافقة\s+و\S*يعاز/.test(b)) return "out";
  return "in"; }
const wqWho = w => [w.sender, w.status].find(x => x && !/^\d{4}\//.test(x) && !/^(جديد|قيد|مكتمل)/.test(x)) || "";
const wqIsJal = w => WQ_JAL.test((w.subj || "") + " " + (w.body || "").slice(0, 400));
const wqKeyNo = n => String(n || "").split("-").sort().join("-");
const wqClean = s => String(s || "").replace(/السيد[ةه]?\s+الفاضل[ةه]?|السادة\s+الأفاضل|المحترم[ةه]?|المحترمين|\/|#\d+/g, " ").replace(/\s+/g, " ").trim();
const wqFrom = w => (String(w.body || "").match(/(?:تهدي|يهدي)\S*\s+((?:إدارة|ادارة|مكتب)\s+[^،,.]{3,45}?)\s+(?:أطيب|اطيب|خالص)/) || [])[1] || wqClean(wqWho(w));
const wqCommName = w => { const m = String(w.subj || "").match(/للجالي[ةه]\s+(\S+)(?:\s+(\S+ي[ةه]))?/); return m ? [m[1], m[2]].filter(Boolean).join(" ").replace(/[()]/g, "") : ""; };
const WQ_REJ = /(عدم الموافق|نعتذر|يتعذر|تعذّر|تعذر|لا يمكن|عدم إمكان|عدم امكان|لا نوافق|غير موافق|رفض)/;
const wqRes = w => w.approval ? "ok" : WQ_REJ.test(w.body || "") ? "no" : "";
function wqIndex(){ const by = new Map(); S.wq.forEach(w => w.no && by.set(wqKeyNo(w.no), w)); const reply = new Map();
  for (const w of S.wq) if (wqDir(w) === "in") for (const r of [...(w.refs || []), ...((w.body || "").match(/\d{4}-\d{4}/g) || [])]) { const o = by.get(wqKeyNo(r)); if (o && o !== w && wqDir(o) === "out" && !reply.has(o.id)) reply.set(o.id, w); }
  return reply; }
function wqState(w, reply){ if (wqDir(w) === "out") { const r = reply.get(w.id); if (r) return wqRes(r) === "ok" ? ["تمت الموافقة", "ok", r] : wqRes(r) === "no" ? ["لم تتم الموافقة", "bad", r] : ["وصل الرد", "t1", r];
    const d = Math.round((dOf(TODAY) - dOf(wqDate(w))) / 864e5); return [d > 0 ? `بانتظار الرد · ${d} يوم` : "بانتظار الرد", d > 14 ? "warn" : "", null]; }
  const r = wqRes(w); return r === "ok" ? ["موافقة", "ok", null] : r === "no" ? ["اعتذار", "bad", null] : [w.action_state === "لم يُتخذ إجراء" ? "بانتظار إجراء" : "", w.action_state === "لم يُتخذ إجراء" ? "warn" : "", null]; }
S.wqt = new Map();
async function wqtLoad(){ const { data } = await sb.from("wq_track").select("*").limit(5000); S.wqt = new Map((data || []).map(r => [r.wq_id, r])); }
const WQ_TRK = "2026-10-01";
function wqStage(w, reply){ const tr = S.wqt.get(w.id); if (tr) return tr.state; if (wqDate(w) < WQ_TRK) return "";
  if (wqDir(w) === "out") { const r = reply.get(w.id); if (!r) return "follow"; return !wqIsJal(w) || S.wqn?.has(r.id) || S.wqn?.has(w.id) || (typeof wqNeeds === "function" && !wqNeeds(r)) ? "done" : "follow"; }
  return typeof wqNeeds === "function" && wqNeeds(w) ? "follow" : S.wqn?.has(w.id) ? "done" : ""; }
const WQ_STG = { follow:["قيد المتابعة", "warn"], done:["منجز ✓", "ok"] };
/* search: a letter is found by its number, subject, sides, text، and by the community and coordinator it concerns */
const _wqK = new WeakMap();
function wqWho2(w){ const d = docBy[w.no] || (w.refs || []).map(r => docBy[r]).find(Boolean), out = [];
  const cm = wqCommName(w), lang = cm.replace(/^ال/, ""), comm = d?.comm || (typeof wqComm === "function" ? wqComm(w) : "");
  if (comm) out.push(comm); if (cm) out.push(cm);
  for (const c of S.coords) { if ((comm && c.comm === comm) || (lang.length > 3 && norm((c.lang || "") + " " + (c.comm || "")).includes(norm(lang)))) out.push(c.name, c.comm || ""); }
  return out; }
function wqKey(w){ let k = _wqK.get(w); if (!k) { k = nkey([w.no, w.subj, w.sender, w.to_whom, w.body, ...wqWho2(w)].join(" ")); _wqK.set(w, k); } return k; }
function vWatheqa(){
  const reply = wqIndex(), q = nkey(S.f.wqq || ""), tab = S.f.wqt || "all", jal = S.f.wqall !== "1";
  const base = S.wq.filter(w => !jal || wqIsJal(w));
  const ST = new Map(base.map(w => [w.id, wqStage(w, reply)]));
  const C = { sent:base.filter(w => wqDir(w) === "out" && wqDate(w) >= WQ_TRK), follow:base.filter(w => ST.get(w.id) === "follow"), done:base.filter(w => ST.get(w.id) === "done"), in:base.filter(w => wqDir(w) === "in"), wait:base.filter(w => wqDir(w) === "out" && !reply.has(w.id) && ST.get(w.id) === "follow") };
  let L = tab === "all" ? base : C[tab] || base; if (q) L = L.filter(w => wqKey(w).includes(q));
  L = [...L].sort((a, b) => wqDate(b).localeCompare(wqDate(a)));
  const sy = S.wqSync || {}, last = sy.last || sy.last_try, login = sy.state === "login";
  const tiles = [["sent", "الكتب المرسلة", "منذ بداية أكتوبر", C.sent.length, ""], ["follow", "قيد المتابعة", `${C.wait.length} بانتظار الرد · والباقي وصل ردها وتحتاج إبلاغ المنسق`, C.follow.length, "warn"], ["done", "المنجزة", "وصل الرد وأُبلغ المنسق", C.done.length, "ok"], ["in", "الواردة", "كتب وصلتنا من الإدارات", C.in.length, "t1"]];
  const groups = []; for (const w of L.slice(0, 300)) { const m = wqDate(w).slice(0, 7); if (!groups.length || groups[groups.length - 1][0] !== m) groups.push([m, []]); groups[groups.length - 1][1].push(w); }
  const card = w => { if (!ST.has(w.id)) ST.set(w.id, wqStage(w, reply)); const d = wqDir(w), [st, sc, r] = wqState(w, reply), cm = wqCommName(w), who = d === "out" ? wqClean(w.to_whom).replace(/^مدير\s+/, "") : wqFrom(w);
    return `<button type="button" class="wq-i wq2 ${d}" data-wq="${esc(w.id)}"><span class="wq-d"><i>${d === "out" ? "↖" : "↙"}</i><b>${d === "out" ? "صادر" : "وارد"}</b></span>
      <span class="wq-t"><b>${esc(w.subj || "—")}</b><span class="s">${d === "out" ? "إلى" : "من"}: ${esc(who || "—")}</span>${r ? `<span class="wq-r">↳ الرد ${esc(r.no || "")} · ${fmt(wqDate(r))}</span>` : ""}</span>
      <span class="wq-m">${cm ? `<span class="chip">${esc(cm)}</span>` : ""}${ST.get(w.id) ? `<span class="chip ${WQ_STG[ST.get(w.id)][1]}">${WQ_STG[ST.get(w.id)][0]}</span>` : ""}${st ? `<span class="chip ${sc} wn-c">${st}</span>` : ""}${d === "in" && typeof wqNeeds === "function" ? (S.wqn?.has(w.id) ? `<span class="chip ok">أُبلغ المنسق ✓</span>` : wqNeeds(w) ? `<span class="chip gold wnq" role="button" tabindex="0" data-wnq="${esc(w.id)}" title="افتح واتساب برسالة جاهزة">📲 أبلغ المنسق</span><span class="chip ok wnq" role="button" tabindex="0" data-wnmk="${esc(w.id)}" title="علّم أنك أبلغته">✓ تم</span>` : "") : ""}<span class="s num">${esc(w.no || "")} · ${fmt(wqDate(w))}</span></span></button>`; };
  return `<div class="wq-head panel"><div class="panel-b"><div><b>وثيقة، ${jal ? "كتب الجاليات" : "كل الكتب"}</b><span class="s">${login ? "⚠ جلسة وثيقة منتهية، سجّل دخولك في وثيقة لتستمر المزامنة" : `آخر مزامنة: ${last ? esc(fmtTime(last)) : "لم تتم بعد"}`} · ${base.length} كتاب</span></div>
      <div class="br-acts"><button type="button" class="btn btn-ghost" data-wqall>${jal ? "عرض كل الكتب (الإدارية أيضاً)" : "كتب الجاليات فقط"}</button><button type="button" class="btn" data-ext="${WATHEQA}">فتح وثيقة</button></div></div></div>
    <div class="wq-tiles">${tiles.map(([k, t, s, n, c]) => `<button type="button" class="wq-tile ${c}${tab === k ? " on" : ""}" data-wqt="${tab === k ? "all" : k}"><b class="num">${n}</b><span>${t}</span><small>${s}</small></button>`).join("")}</div>
    <div class="toolbar"><div class="search"><svg><use href="#i-search"/></svg><input class="f" id="wqq" data-fk="wqq" placeholder="ابحث برقم الكتاب أو الجالية أو اسم المنسق أو المسجد…" value="${esc(S.f.wqq || "")}"></div>
      ${tab !== "all" ? `<button type="button" class="btn btn-ghost" data-wqt="all">عرض الكل (${base.length})</button>` : ""}</div>
    <div class="wq-list">${groups.map(([m, G]) => `<div class="wq-mh">${m ? monLabel(m) : "بدون تاريخ"} <span class="num">${G.length}</span></div>${G.map(card).join("")}`).join("") || `<div class="empty">لا توجد كتب في هذا التصنيف</div>`}</div>`;
}
document.addEventListener("click", ev => { const t = ev.target.closest("[data-wqall]"); if (t) { S.f.wqall = S.f.wqall === "1" ? "" : "1"; S.f.wqt = "all"; render(); } });
function wqForm(id){
  const w = S.wq.find(x => x.id === id); if (!w) return; S.form = { kind:"wq", id };
  const inSys = docBy[w.no] ? w.no : (w.refs || []).find(r => docBy[r]);
  const acts = S.E.filter(e => e.doc && (e.doc === w.no || (w.refs || []).includes(e.doc)));
  openDrawer(`كتاب وثيقة \u2066${w.no || ""}\u2069`, `
    <div class="q-meta"><b>${esc(w.subj)}</b><span class="s">${esc(fmt(wqDate(w)))} · ${esc(w.sender || "")}${w.status ? " · " + esc(w.status) : ""}</span><span class="s">${esc(w.to_whom || "")}</span></div>
    ${w.approval ? `<div class="check ok"><b>هذا الكتاب يتضمّن موافقة («لا مانع»)</b><span>${inSys ? `مسجّلة في النظام برقم ${esc(inSys)}` : "غير مسجّلة في النظام بعد"}</span></div>` : ""}
    <div class="q-body">${esc(w.body || "لا يوجد نص").replace(/\n/g, "<br>")}</div>
    ${w.signer ? `<span class="s">التوقيع: ${esc(w.signer)}</span>` : ""}
    ${(w.refs || []).length ? `<span class="s">كتب مشار إليها: ${w.refs.map(r => docBy[r] ? `<button type="button" class="chip t1" data-wqdoc="${esc(r)}">${esc(r)} ✓</button>` : `<span class="chip">${esc(r)}</span>`).join(" ")}</span>` : ""}
    ${acts.length ? `<div class="rq-sec"><b>أنشطة مرتبطة (${acts.length})</b>${acts.map(e => `<button type="button" class="as-i" data-prio-open="act:${e.id}"><span>#${e.n} · ${esc(e.comm || "")} · ${esc(e.mosName || "")}</span></button>`).join("")}</div>` : ""}`,
    `<button class="btn btn-primary" type="button" data-ext="${WQ_VIEW(w.id)}">فتح في وثيقة</button>${w.approval && !inSys && S.canWrite ? `<button class="btn btn-ok" type="button" data-wqadd="${esc(w.id)}">تسجيل الموافقة في النظام</button>` : ""}${S.admin ? `<button class="btn btn-ghost" type="button" data-wqtask="${esc(w.id)}">إسناد متابعة</button>` : ""}<button class="btn btn-ghost" data-close>إغلاق</button>`);
}
async function wqAdd(id){
  const w = S.wq.find(x => x.id === id); if (!w) return; const no = w.no; if (!no) return toast("لا يوجد رقم للكتاب");
  if (docBy[no]) return toast("الوثيقة مسجلة مسبقاً");
  const start = wqApDate(w) || TODAY, end = addMonths(start, 6);
  try { await T.ref("docs", [...S.docs, { no, date:start, subj:w.subj || "موافقة", comm:wqComm(w), start, end, notes:"من نظام وثيقة، " + (w.signer || "") }]); toast(`سُجّلت الموافقة ${no}، من ${fmt(start)} إلى ${fmt(end)}`); closeDrawer(); setTimeout(() => listForm("doc", no), 700); } catch (e) { writeFail(e); }
}

/* ---------- lesson permits with a verifiable barcode (issued by admins only) ---------- */
const VERIFY = id => `${location.origin}${location.pathname.replace(/[^/]*$/, "")}verify.html#${id}`;
function loadQR(){ return window.qrcode ? Promise.resolve() : loadScript("https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"); }
const pStatus = p => p.revoked ? ["ملغى", "bad"] : p.until < TODAY ? ["منتهي", ""] : ["ساري", "ok"];
function vPermits(){
  const q = nkey(S.f.pq || ""); const L = S.permits.filter(p => !q || nkey([p.no, p.data?.sheikh, p.data?.mosque, p.data?.topic].join(" ")).includes(q));
  return `<div class="toolbar"><div class="search"><svg><use href="#i-search"/></svg><input class="f" id="pq" data-fk="pq" placeholder="ابحث برقم التصريح أو اسم الشيخ أو المسجد…" value="${esc(S.f.pq || "")}"></div>
    ${S.admin ? `<button class="btn btn-primary" type="button" data-pnew>${icon("i-plus")} إصدار تصريح</button><button class="btn" type="button" data-pgnew>تفويض موظف بتصريح</button><button class="btn btn-ghost" type="button" data-passets>التوقيع والختم</button>` : ""}<span class="count">${S.permits.filter(p => pStatus(p)[0] === "ساري").length} ساري · ${S.permits.length} إجمالي</span></div>
    ${grantsPanel()}${!S.admin && !myGrants().length ? `<div class="check"><b>إصدار التصاريح لرئيس القسم ومدير النظام</b><span>أو لمن يفوّضه رئيس القسم بتصريح محدد، ويظهر لك هنا عند التفويض.</span></div>` : ""}
    <div class="wq-list">${L.map(p => { const [st, c] = pStatus(p); return `<button type="button" class="wq-i" data-permit="${p.id}"><span class="num wq-no">${esc(p.no)}</span><span class="wq-t"><b>${esc(p.data?.sheikh || "—")}</b><span class="s">${esc(p.data?.mosque || "")} · ${esc(p.data?.date ? fmt(p.data.date) : "")} · ${esc(p.data?.time || "")}</span></span><span class="wq-m"><span class="chip ${c}">${st}</span><span class="s">حتى ${fmt(p.until)}</span></span></button>`; }).join("") || `<div class="empty">لا توجد تصاريح بعد</div>`}</div>`;
}
const DUR = [["day", "يوم الدرس فقط", 1], ["3", "3 أيام", 3], ["7", "أسبوع", 7], ["30", "شهر", 30], ["90", "3 أشهر", 90], ["180", "6 أشهر", 180]];
function permitForm(preset, grant){
  if (!S.admin && !grant) return toast("إصدار التصاريح لرئيس القسم أو بتفويض منه");
  if (grant) preset = { ...grant.preset, ...preset };
  const d = { sheikh:"", mosque:"", topic:"", lang:"", date:addDays(TODAY, 1), t_from:"19:30", t_to:"20:30", dur:"day", head:S.pAssets.head || "فايز رزقان الرشيدي", ...preset };
  S.form = { kind:"permit", act:preset?.act_id || "", grant:grant?.id || "" }; const lock = grant ? " readonly" : "";
  openDrawer("إصدار تصريح إلقاء درس", `${grant ? `<div class="check ok"><b>تفويض من ${esc(pname(grant.granted_by))}</b><span>صلاحيتك على هذا التصريح فقط: الشيخ والمسجد محددان من رئيس القسم${grant.note ? "، " + esc(grant.note) : ""}</span></div>` : ""}
    ${fld("p-sheikh", "اسم الشيخ", `<input class="f" id="p-sheikh" value="${esc(d.sheikh)}" list="p-lects"${lock}><datalist id="p-lects">${[...new Set(S.E.flatMap(e => (e.lect || "").split(" / ")).filter(Boolean))].slice(0, 400).map(l => `<option value="${esc(l)}">`).join("")}</datalist>`)}
    ${fld("p-mosque", "المسجد والمنطقة والمحافظة", `<input class="f" id="p-mosque" value="${esc(d.mosque)}" list="p-mos"${lock}><datalist id="p-mos">${S.mosques.map(m => `<option value="${esc(pMos("مسجد " + m.name, m.area, m.gov))}">`).join("")}</datalist>`)}
    <div class="g2">${fld("p-topic", "عنوان الدرس (اختياري)", `<input class="f" id="p-topic" value="${esc(d.topic)}">`)}${fld("p-lang", "اللغة (اختياري)", `<input class="f" id="p-lang" value="${esc(d.lang)}">`)}</div>
    <div class="g3">${fld("p-date", "تاريخ الدرس", `<input class="f" type="date" id="p-date" value="${esc(d.date)}">`)}${fld("p-from", "من", `<input class="f" type="time" id="p-from" value="${esc(d.t_from)}">`)}${fld("p-to", "إلى", `<input class="f" type="time" id="p-to" value="${esc(d.t_to)}">`)}</div>
    <div class="g2">${fld("p-dur", "مدة التصريح", `<select class="f" id="p-dur">${DUR.map(([k, l]) => `<option value="${k}"${k === d.dur ? " selected" : ""}>${l}</option>`).join("")}</select>`)}${fld("p-head", "المعتمِد", `<input class="f" id="p-head" value="${esc(d.head)}"${lock}>`)}</div>
    ${fld("p-note", "ملاحظات (اختياري)", `<input class="f" id="p-note" value="${esc(d.note || grant?.note || "")}" placeholder="مثال: ثاني جمعة من كل شهر، أو كل ثلاثاء بعد المغرب">`)}
    <span class="hint">يُولَّد رقم التصريح ورمز التحقق تلقائياً. الباركود يفتح صفحة تحقق رسمية تبيّن للإمام صلاحية التصريح الآن.</span>`,
    `<button class="btn btn-primary" data-pissue>إصدار التصريح</button><button class="btn btn-ghost" data-close>إلغاء</button>`);
}
async function permitIssue(){
  const v = id => $("#" + id)?.value.trim() || "";
  if (!v("p-sheikh") || !v("p-mosque") || !v("p-date")) return toast("أكمل اسم الشيخ والمسجد والتاريخ");
  const dur = DUR.find(x => x[0] === v("p-dur")) || DUR[0]; const until = addDays(v("p-date"), dur[2] - 1);
  const data = { sheikh:v("p-sheikh"), mosque:v("p-mosque"), topic:v("p-topic"), lang:v("p-lang"), date:v("p-date"), t_from:v("p-from"), t_to:v("p-to"), time:`من ${t12(v("p-from"))} إلى ${t12(v("p-to"))}`, dur:dur[1], head:v("p-head"), note:v("p-note") };
  const { data:row, error } = await sb.from("permits").insert({ data, until, act_id:S.form?.act || "", ...(S.form?.grant ? { grant_id:S.form.grant } : {}) }).select().single(); if (error) return writeFail(error);
  S.permits = [row, ...S.permits]; if (row.grant_id) { const g = S.grants.find(x => x.id === row.grant_id); if (g) g.permit_id = row.id; } closeDrawer(); toast(`صدر التصريح ${row.no}`); permitView(row.id);
}
/* عنوان الدرس: يُستبعد ما ليس عنواناً (موضوع الكتاب أو نوع النشاط) ويُكتب «أمور عامة» عند غياب العنوان */
const permitTopic = t => { t = String(t || "").replace(/\s+/g, " ").trim(); return !t || /^(طلب|موافقة|كتاب)(\s|$|[\(:\-–])/.test(t) || /(تجديد|إقامة|اقامة|إيقاف|تعديل)\s+(دروس|أنشطة|انشطة|نشاط)/.test(t) || /^(درس|دروس|محاضرة|دورة|نشاط)$/.test(t) ? "أمور عامة" : t; };
/* التصريح ورقة A4 بعرض ثابت (794px) كما تُطبع وتُرسل PDF؛ على الشاشة تُصغَّر لتناسب العرض دون تغيير التنسيق */
function fitPermit(){ const el = $("#permit-paper"); if (!el || el.closest("#permit-print")) return; const b = el.closest(".drawer-b") || el.parentElement, cs = getComputedStyle(b), w = b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 24; el.style.zoom = w > 0 ? Math.min(1, w / 794).toFixed(3) : 1; }
window.addEventListener("resize", () => { try { fitPermit(); } catch (_) {} });
async function permitView(id){
  const p = S.permits.find(x => x.id === id); if (!p) return; await loadQR().catch(() => {});
  const d = p.data || {}, [st, c] = pStatus(p), url = VERIFY(`${p.id}.${p.code}`);
  let qr = ""; try { const q = qrcode(0, "M"); q.addData(url); q.make(); const n = q.getModuleCount(), z = 4; let d = ""; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + z} ${r + z}h1v1h-1z`; qr = `<svg class="pm-qrsvg" viewBox="0 0 ${n + 2 * z} ${n + 2 * z}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="باركود التحقق"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`; } catch (_) {}
  const H = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn", { day:"numeric", month:"long", year:"numeric" });
  S.form = { kind:"permitv", id };
  openDrawer(`التصريح \u2066${p.no}\u2069`, `<div class="check ${c === "ok" ? "ok" : "warn"}"><b>${st}</b><span>حتى ${fmt(p.until)} · رمز التحقق ${p.code.slice(0, 4)}-${p.code.slice(4)}</span></div>
    <div class="permit-wrap"><div class="permit print-area" id="permit-paper">
      <div class="pm-h"><img class="pm-logo" src="brand/kw-logo.png" alt="شعار دولة الكويت" crossorigin="anonymous"><div class="pm-org"><span class="pm-st gold">دولة الكويت</span><b class="gold">وزارة الشؤون الإسلامية</b><span>إدارة العلاقات الخارجية</span><strong>قسم الجاليات ورعاية المهتدين وطلبة البعوث</strong></div><img class="pm-logo2" src="brand/kw-new.png" alt="شعار الكويت الجديدة" crossorigin="anonymous"></div>
      <div class="pm-rule"></div>
      <div class="pm-meta"><div><span>رقم التصريح</span><b dir="ltr">${esc(p.no)}</b></div><div><span>تاريخ الإصدار</span><b>${fmt(p.issued_at.slice(0, 10))}</b></div><div><span>الموافق</span><b>${esc(H.format(new Date(p.issued_at)))}</b></div></div>
      <div class="pm-ttl"><h2 class="pm-title gold">تصريح إلقاء درس</h2><div class="pm-sub">يُبرِز لإمام المسجد عند إقامة الدرس</div></div>
      <p class="pm-lead">تُصرِّح إدارة العلاقات الخارجية (قسم الجاليات ورعاية المهتدين وطلبة البعوث) لفضيلة الشيخ / <strong data-pf="sheikh">${esc(d.sheikh)}</strong> بإلقاء درس في <strong data-pf="mosque">${esc(d.mosque)}</strong>، وفق البيانات الموضحة أدناه.</p>
      <table class="pm-t"><tr><th>اسم الشيخ</th><td data-pf="sheikh">${esc(d.sheikh)}</td></tr><tr><th>المسجد</th><td data-pf="mosque">${esc(d.mosque)}</td></tr><tr><th>عنوان الدرس</th><td data-pf="topic">${esc(permitTopic(d.topic))}</td></tr>${d.lang ? `<tr><th>لغة الدرس</th><td data-pf="lang">${esc(d.lang)}</td></tr>` : ""}<tr><th>التاريخ</th><td data-pd="date">${DAYS[dOf(d.date).getDay()]} ${fmt(d.date)}، ${esc(H.format(dOf(d.date)))}</td></tr><tr><th>الوقت</th><td data-pf="time">${esc(d.time || "")}</td></tr>${d.note ? `<tr><th>ملاحظات</th><td data-pf="note">${esc(d.note)}</td></tr>` : ""}</table>
      <div class="pm-valid"><div><span>مدة التصريح</span><b>${esc(d.dur || "")}</b></div><div><span>ينتهي العمل به</span><b data-pd="until">${fmt(p.until)}، 11:59 م</b></div></div>
      <p class="pm-note">يُعدّ هذا التصريح رسمياً ونافذاً خلال مدته فقط ويُلغى تلقائياً بانتهائها. على إمام المسجد مسح الباركود للتحقق الفوري من صحته وصلاحيته عبر نظام «إنجاز».</p>
      <div class="pm-bottom"><div class="pm-appr"><span>اعتماد رئيس قسم الجاليات ورعاية المهتدين وطلبة البعوث</span><b data-pf="head">${esc(d.head || "")}</b>
        <div class="pm-sig"><div><i>${S.pAssets.sig ? `<img src="${S.pAssets.sig}" alt="">` : "موضع التوقيع"}</i></div><div><i class="r">${S.pAssets.stamp ? `<img src="${S.pAssets.stamp}" alt="">` : "موضع الختم"}</i></div></div></div>
        <div class="pm-qr">${qr}<span>امسح للتحقق</span><b dir="ltr">${p.code.slice(0, 4)}-${p.code.slice(4)}</b></div></div>
      <div class="pm-bar"></div>
    </div></div>`,
    `<button class="btn btn-primary" data-pprint>طباعة / PDF</button><button class="btn" data-pwa="${p.id}">${icon("i-wa")} إرسال</button>${S.admin && !p.revoked ? `<button class="btn btn-ghost bad-t" data-prevoke="${p.id}">إلغاء التصريح</button>` : ""}<button class="btn btn-ghost" data-close>إغلاق</button>`);
  fitPermit();
}
function assetsForm(){
  if (!S.admin) return; S.form = { kind:"passets" };
  openDrawer("التوقيع والختم على التصاريح", `${fld("pa-head", "اسم المعتمِد الافتراضي", `<input class="f" id="pa-head" value="${esc(S.pAssets.head || "فايز رزقان الرشيدي")}">`)}
    <div class="g2">${fld("pa-sig", "صورة التوقيع", `<input class="f" type="file" id="pa-sig" accept="image/*">`)}${fld("pa-stamp", "صورة الختم", `<input class="f" type="file" id="pa-stamp" accept="image/*">`)}</div>
    <div class="pm-sig">${S.pAssets.sig ? `<div><i><img src="${S.pAssets.sig}" alt=""></i>التوقيع الحالي</div>` : ""}${S.pAssets.stamp ? `<div><i class="r"><img src="${S.pAssets.stamp}" alt=""></i>الختم الحالي</div>` : ""}</div>
    <span class="hint">يُفضّل صورة PNG بخلفية شفافة. تظهر على كل التصاريح الجديدة والقديمة عند الطباعة.</span>`,
    `<button class="btn btn-primary" data-pasave>حفظ</button><button class="btn btn-ghost" data-close>إغلاق</button>`);
}
const readImg = f => new Promise(res => { if (!f) return res(null); compressImg(f, 600, .92).then(({ canvas }) => res(canvas.toDataURL("image/png"))).catch(() => res(null)); });
async function assetsSave(){
  const sig = await readImg($("#pa-sig").files[0]), stamp = await readImg($("#pa-stamp").files[0]);
  const v = { ...S.pAssets, head:$("#pa-head").value.trim() }; if (sig) v.sig = sig; if (stamp) v.stamp = stamp;
  const { error } = await sb.from("settings").upsert({ key:"permit_assets", value:v }); if (error) return writeFail(error);
  S.pAssets = v; closeDrawer(); toast("حُفظ التوقيع والختم");
}

/* ---------- wiring ---------- */
const _actForm17 = actForm;
actForm = function(id, preset){ _actForm17(id, preset); const e = id && S.byId.get(id); if (!e || !S.admin || S.form?.kind !== "act") return;
  const nextD = (() => { for (let i = 0; i < 14; i++) { const iso = addDays(TODAY, i); if (e.days.includes(dOf(iso).getDay())) return iso; } return addDays(TODAY, 1); })();
  const sl = e.sl || [1140, 1200], hhmm = m => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
  $(".drawer-f [data-close]")?.insertAdjacentHTML("afterend", `<button class="btn btn-ghost" type="button" data-pfrom="${esc(id)}" data-pd="${esc(JSON.stringify({ sheikh:(e.lect || "").split(" / ")[0], mosque:`${e.mosName}${e.area ? "، " + e.area : ""}`, topic:e.title || "", date:nextD, t_from:hhmm(sl[0]), t_to:hhmm(sl[1]), act_id:id }))}">تصريح</button>`); };
const _openLink17 = openLink;
openLink = function(h){ const s = String(h || "").replace(/^#/, ""); if (s.startsWith("permit:")) { if (S.view !== "permits") go("permits"); return permitView(s.slice(7)); } if (s.startsWith("wq:")) { if (S.view !== "watheqa") go("watheqa"); return wqForm(s.slice(3)); } return _openLink17(h); };
const _answer17 = answer;
answer = function(q){ const m = String(q).match(/\d{4}\s*-\s*\d{4}/); if (m) { const no = m[0].replace(/\s/g, ""); const L = S.wq.filter(w => w.no === no || (w.refs || []).includes(no)); const d = docBy[no];
    if (L.length || d) return { title:`الكتاب ${no}`, items:[...(d ? [{ t:`مسجّل في النظام: ${d.subj || ""}`, s:`${d.comm || ""} · من ${fmt(d.start)} إلى ${fmt(d.end)} · ${S.E.filter(e => e.doc === no).length} نشاط`, open:`doc:${no}` }] : []), ...L.map(w => ({ t:`وثيقة: ${w.subj}`, s:`${fmt(wqDate(w))} · ${w.sender || ""}${w.approval ? " · لا مانع ✓" : ""}`, open:`wq:${w.id}` }))], extra:"" }; }
  if (/وثيقه|وثيقة|كتب|كتاب/.test(norm(q)) && /موافق|مانع|جديد/.test(norm(q))) { const L = S.wq.filter(w => w.approval && !docBy[w.no] && !(w.refs || []).some(r => docBy[r])); return { title:`موافقات في وثيقة غير مسجلة بالنظام (${L.length})`, items:L.map(w => ({ t:`${w.no}، ${w.subj}`, s:fmt(wqDate(w)), open:`wq:${w.id}` })), extra:"افتح أي كتاب واضغط «تسجيل الموافقة في النظام»." }; }
  return _answer17(q); };
SUGG.splice(4, 0, ["موافقات وثيقة الجديدة", "i-doc", "موافقات وثيقة جديدة"]);
const _sysMd17 = sysMarkdown;
sysMarkdown = function(){ const L = S.wq.slice().sort((a, b) => wqDate(b).localeCompare(wqDate(a))).slice(0, 150);
  return _sysMd17() + (L.length ? `\n\n## كتب نظام وثيقة (آخر ${L.length})\n| رقم الكتاب | التاريخ | الموضوع | المرسل | الحالة | لا مانع | مسجّل في النظام |\n|---|---|---|---|---|---|---|\n` + L.map(w => `| ${w.no} | ${fmt(wqDate(w))} | ${(w.subj || "").replace(/\|/g, "/")} | ${w.sender || ""} | ${w.status || ""} | ${w.approval ? "نعم" : ""} | ${docBy[w.no] ? "نعم" : ""} |`).join("\n") : ""); };
const _prio17 = priorities;
priorities = function(){ const P = _prio17(); const n = S.wq.filter(w => w.approval && !docBy[w.no] && !(w.refs || []).some(r => docBy[r])).length; if (n) P.push({ w:78, k:"gold", t:`${n} موافقة في وثيقة غير مسجّلة في النظام`, s:"سجّلها بضغطة لتظهر الأنشطة ومواعيد انتهائها", act:{ go:"watheqa", l:"وثيقة" } }); return P.sort((a, b) => b.w - a.w); };
const _palAll17 = palAll;
palAll = function(){ const A = _palAll17(); if (S.admin) A.unshift({ g:"إجراءات", t:"إصدار تصريح درس (باركود)", s:"", ic:"i-badge", run:() => permitForm(), txt:"تصريح باركود درس شيخ" });
  for (const w of S.wq.slice(0, 400)) A.push({ g:"وثيقة", t:`${w.no} ${w.subj}`, s:[fmt(wqDate(w)), w.sender].filter(Boolean).join(" · "), ic:"i-doc", run:() => { go("watheqa"); wqForm(w.id); }, txt:wqWho2(w).join(" ") + " " + [w.no, w.subj, w.sender].join(" ") });
  for (const p of S.permits.slice(0, 200)) A.push({ g:"التصاريح", t:`${p.no} ${p.data?.sheikh || ""}`, s:p.data?.mosque || "", ic:"i-badge", run:() => { go("permits"); permitView(p.id); }, txt:[p.no, p.data?.sheikh, p.data?.mosque].join(" ") });
  return A; };
const _boot9w = boot9;
boot9 = function(){ _boot9w(); Promise.all([loadWq(), loadPermits(), wqtLoad()]).then(() => { liveWq(); if ($("#drawer").hidden && ["watheqa", "permits", "home"].includes(S.view)) render(); }); };
document.addEventListener("click", async ev => {
  const t = ev.target.closest("button"); if (!t) return; const D = t.dataset;
  if (D.wqt) { S.f.wqt = D.wqt; return render(); }
  if (D.wq) return wqForm(D.wq);
  if (D.wqadd) return wqAdd(D.wqadd);
  if (D.wqdoc) { closeDrawer(); return listForm("doc", D.wqdoc); }
  if (D.wqtask) { const w = S.wq.find(x => x.id === D.wqtask); if (w) taskForm(null, { title:`متابعة كتاب وثيقة ${w.no}`, details:`${w.subj}\n${w.sender || ""}`, due:addDays(TODAY, 2), link:`#wq:${w.id}` }); return; }
  if (D.wqhelp !== undefined) return toast("تُسحب كتب وثيقة (البريد الوارد ونصوص الكتب) إلى «إنجاز» وتظهر هنا مباشرة لكل الموظفين");
  if (D.pnew !== undefined) return permitForm();
  if (D.pfrom) { try { return permitForm(JSON.parse(D.pd)); } catch (_) { return permitForm(); } }
  if (D.pissue !== undefined) return permitIssue();
  if (D.permit) return permitView(D.permit);
  if (D.passets !== undefined) return assetsForm();
  if (D.pasave !== undefined) return assetsSave();
  if (D.pprint !== undefined) { let pp = $("#permit-print"); if (!pp) { pp = document.createElement("div"); pp.id = "permit-print"; pp.className = "print-area"; document.body.appendChild(pp); } pp.innerHTML = $("#permit-paper").outerHTML.replace('id="permit-paper"', ""); return printArea("#permit-print"); }
  if (D.pwa) { const p = S.permits.find(x => x.id === D.pwa); if (!p) return; const txt = `تصريح إلقاء درس رقم ${p.no}\nالشيخ: ${p.data?.sheikh}\nالمسجد: ${p.data?.mosque}\nالتاريخ: ${fmt(p.data?.date)} ${p.data?.time || ""}\nللتحقق: ${VERIFY(`${p.id}.${p.code}`)}${SIGN}`; if (navigator.share) { try { await navigator.share({ text:txt }); return; } catch (_) { return; } } const ok = await cpCopy(txt); return toast(ok ? "نُسخ نص التصريح ورابط التحقق" : "تعذّر النسخ"); }
  if (D.prevoke) { if (D.sure !== "1") { D.sure = "1"; t.textContent = "اضغط مرة أخرى للتأكيد"; return; } const { error } = await sb.from("permits").update({ revoked:true }).eq("id", D.prevoke); if (error) return writeFail(error); const p = S.permits.find(x => x.id === D.prevoke); if (p) p.revoked = true; toast("أُلغي التصريح، يظهر للإمام «ملغى» عند المسح"); return permitView(D.prevoke); }
});

/* ---------- auto-update: an open or installed app picks up every new release by itself ---------- */
if ("serviceWorker" in navigator) {
  const hadCtrl = !!navigator.serviceWorker.controller; let reloading = false;
  const apply = () => { if (reloading) return; reloading = true; location.reload(); };
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (!hadCtrl) return;
    if ($("#drawer")?.hidden !== false) return apply();
    toast("وصل تحديث جديد لإنجاز، سيُطبَّق عند إغلاق النافذة"); const t = setInterval(() => { if ($("#drawer").hidden) { clearInterval(t); apply(); } }, 1500); });
  const up = () => navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => {});
  document.addEventListener("visibilitychange", () => { if (!document.hidden) up(); });
  window.addEventListener("focus", up); setInterval(up, 5 * 60 * 1000); setTimeout(up, 3000);
  /* فحص مباشر لرقم الإصدار كل دقيقة (يتجاوز كاش المتصفح) وإعادة تحميل تلقائية بدون ضغط تحديث */
  let curV = null, seen = false; const ver = () => fetch("/sw.js?v=" + Date.now(), { cache:"no-store" }).then(r => r.text()).then(t => (t.match(/jaliyat-v(\d+)/) || [])[1]).catch(() => null);
  const chk = async () => { if (seen) return; const v = await ver(); if (!v) return; if (curV === null) { curV = v; return; } if (v === curV) return; seen = true; up();
    const go = async () => { try { for (const k of await caches.keys()) await caches.delete(k); } catch (_) {} apply(); };
    if ($("#drawer")?.hidden !== false) setTimeout(go, 800); else { toast("وصل تحديث جديد، يُطبَّق عند إغلاق النافذة"); const t = setInterval(() => { if ($("#drawer").hidden) { clearInterval(t); go(); } }, 1500); } };
  chk(); setInterval(chk, 60 * 1000); document.addEventListener("visibilitychange", () => { if (!document.hidden) chk(); }); window.addEventListener("focus", chk);
}
