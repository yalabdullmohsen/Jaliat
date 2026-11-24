/* ================= v96 (JL-5): إحصائيات واضحة التعريف + ربط المسجد والمحاضر والنشاط + تنبيهات من البيانات ================= */
/* 1) تعريف واحد لكل رقم، يظهر تحته وفي التلميح، أينما ظهر (الرئيسية والإحصائيات وشريط الربط) */
const KDEF = {
  "كل الأنشطة": "كل نشاط مسجّل، بما فيه المنتهي والملغى",
  "الجارية الآن": "اليوم بين بداية النشاط ونهايته، وليس ملغى ولا مؤجلًا",
  "تعارضات": "نشاطان في المسجد نفسه والوقت نفسه والفئة نفسها",
  "ناقصة البيانات": "نشاط ساري ينقصه مسجد أو وقت أو محاضر أو جالية أو موافقة",
  "المساجد المستخدمة": "مساجد فيها نشاط واحد على الأقل",
  "الجاليات النشطة": "جاليات لها نشاط واحد على الأقل",
  "المحاضرون": "أسماء المحاضرين المختلفة في كل الأنشطة",
  "مساجد خطبة الجمعة": "مساجد لها خطيب جمعة مسجّل",
  "طلبات مفتوحة": "طلبات واردة ليست معتمدة ولا مرفوضة",
  "مهام قيد العمل": "مهام لم تُنجز ولم تُلغَ",
  "موافقات وثيقة غير مسجلة": "كتب «لا مانع» في وثيقة لم تُضف إلى قائمة الموافقات",
  "تصاريح سارية": "تصاريح لم تنتهِ ولم تُلغَ",
};
function kdefApply(root){ root.querySelectorAll(".kpi, .ls-i").forEach(k => { if (k.dataset.kdef) return; const l = k.querySelector("span")?.textContent.trim();
  const d = KDEF[l] || (/^تنتهي خلال/.test(l || "") ? "أنشطة سارية تنتهي قبل هذا الموعد" : ""); if (!d) return;
  k.dataset.kdef = "1"; k.title = d; k.setAttribute("aria-description", d); if (k.classList.contains("kpi")) k.insertAdjacentHTML("beforeend", `<small class="kdef">${esc(d)}</small>`); }); }
const _afterRender96 = afterRender;
afterRender = function(v){ _afterRender96(v); const r = $("#view"); if (r) kdefApply(r); };

/* 2) نظرة عامة: كل رقم يفتح قائمته، ومقارنة بالشهر السابق، وتوزيعات قابلة للنقر، والأكثر نشاطًا */
const mPrev = () => { const d = new Date(TODAY + "T12:00:00"); d.setMonth(d.getMonth() - 1); return isoOf(d).slice(0, 7); };
const langOfComm = c => S.comms.find(x => x.name === c)?.lang || "";
const goBtn = (go, f, inner, cls = "", title = "") => `<button type="button" class="${cls}" data-go="${go}"${f ? ` data-f="${esc(JSON.stringify(f))}"` : ""}${title ? ` title="${esc(title)}"` : ""}>${inner}</button>`;
const kpiB = (l, n, go, f, c, sub) => goBtn(go, f, `<span>${esc(l)}</span><b class="num">${n}</b>${sub ? `<small>${esc(sub)}</small>` : ""}`, "kpi", KDEF[l]).replace('class="kpi"', `class="kpi"${c ? ` style="--k:var(--${c})"` : ""}`);
function distPanel(title, rows, go, fOf, def){ const mx = Math.max(1, ...rows.map(r => r[1]));
  return `<div class="panel"><div class="panel-h"><h3>${esc(title)}</h3>${def ? `<span class="s">${esc(def)}</span>` : ""}</div><div class="panel-b"><div class="bars st96">${rows.map(([k, n]) =>
    goBtn(go, fOf(k), `<span>${esc(k || "غير محدد")}</span><span class="track"><i style="width:${n / mx * 100}%"></i></span><b class="num">${n}</b>`, "bar")).join("") || `<div class="empty">—</div>`}</div></div></div>`; }
function monthCmp(){ const m = monthNow(), p = mPrev(), E = S.E, R = S.reqs || [], P = S.permits || [];
  const rows = [["أنشطة بدأت", E.filter(e => (e.start || "").startsWith(m)).length, E.filter(e => (e.start || "").startsWith(p)).length, "acts", { q:"" }],
    ["تصاريح صدرت", P.filter(x => !x.revoked && (x.issued_at || "").startsWith(m)).length, P.filter(x => !x.revoked && (x.issued_at || "").startsWith(p)).length, "permits", null],
    ["موافقات جديدة", S.docs.filter(d => (d.date || d.start || "").startsWith(m)).length, S.docs.filter(d => (d.date || d.start || "").startsWith(p)).length, "docs", null],
    ["طلبات واردة", R.filter(r => (r.created_at || "").startsWith(m)).length, R.filter(r => (r.created_at || "").startsWith(p)).length, "inbox", null],
    ["كتب وثيقة", (S.wq || []).filter(w => wqDate(w).startsWith(m)).length, (S.wq || []).filter(w => wqDate(w).startsWith(p)).length, "watheqa", null]];
  return `<div class="panel"><div class="panel-h"><h3>هذا الشهر مقارنة بالشهر السابق</h3><span class="s">${esc(monLabel(m))} ← ${esc(monLabel(p))}</span></div><div class="mc96">${rows.map(([l, a, b, go, f]) => {
    const d = a - b, c = d > 0 ? "ok" : d < 0 ? "bad" : "";
    return goBtn(go, f, `<span>${esc(l)}</span><b class="num">${a}</b><small class="${c}">${d > 0 ? "▲ " + d : d < 0 ? "▼ " + -d : "بلا تغيير"} <span class="s">(السابق ${b})</span></small>`, "mc96-i"); }).join("")}</div></div>`; }
const _vStatsAll96 = vStatsAll;
vStatsAll = function(){ const h = _vStatsAll96(), E = S.E;
  const run = E.filter(RUN).length, cf = E.filter(e => e.cf.length).length, miss = E.filter(e => e.live && e.issues?.some(i => i.t.startsWith("ناقص"))).length;
  const mos = new Set(E.map(e => e.mosque).filter(Boolean)).size, lects = new Set(E.flatMap(e => e.names)).size, activeC = new Set(E.map(e => e.comm).filter(Boolean)).size;
  const kp = `<div class="kpis k6">${kpiB("كل الأنشطة", E.length, "acts", F0({}))}${kpiB("الجارية الآن", run, "acts", F0({ st:"run" }), "ok", pct(run, E.length) + "%")}
    ${kpiB("تعارضات", cf, "acts", F0({ st:"cf" }), "bad")}${kpiB("ناقصة البيانات", miss, "acts", F0({ st:"miss" }), "warn")}
    ${kpiB("المساجد المستخدمة", mos, "stats", { stab:"mos", small:"" }, "gold", `من ${S.mosques.length} مسجدًا`)}${kpiB("الجاليات النشطة", activeC, "stats", { stab:"comms" }, "t3", `من ${commNames.length} جالية`)}
    ${kpiB("المحاضرون", lects, "stats", { stab:"acts" }, "t1")}</div>`;
  const cnt = (L, k) => { const m = new Map(); L.forEach(e => { const v = k(e); if (v !== undefined) m.set(v, (m.get(v) || 0) + 1); }); return [...m].sort((a, b) => b[1] - a[1]); };
  const live = E.filter(RUN);
  const byMos = cnt(live.filter(e => e.mosque), e => e.mosque).slice(0, 10), byLect = cnt(live.flatMap(e => e.names.map(n => ({ n }))), x => x.n).slice(0, 10);
  const grid = `<div class="sgrid">
    ${distPanel("حسب الجالية (الجارية)", cnt(live, e => e.comm || "").slice(0, 12), "acts", k => F0({ comm:k, st:"run" }))}
    ${distPanel("حسب المحافظة (الجارية)", cnt(live, e => e.gov || ""), "acts", k => F0({ gov:k, st:"run" }))}
    ${distPanel("حسب النوع (الجارية)", cnt(live, e => e.type || ""), "acts", k => F0({ type:k, st:"run" }))}
    ${distPanel("حسب اللغة (الجارية)", cnt(live, e => langOfComm(e.comm)), "stats", () => ({ stab:"comms" }), "اللغة من الجالية")}
    <div class="panel"><div class="panel-h"><h3>أكثر المساجد نشاطًا (الجارية)</h3></div><div class="list">${byMos.map(([id, n], i) => `<button type="button" class="li" data-open="mos:${esc(id)}"><span class="rk num">${i + 1}</span><span><span class="t">مسجد ${esc(mosBy[id]?.name || id)}</span><br><span class="s">${esc([mosBy[id]?.area, mosBy[id]?.gov].filter(Boolean).join("، "))}</span></span><span class="pill">${n} نشاط</span></button>`).join("") || `<div class="empty">—</div>`}</div></div>
    <div class="panel"><div class="panel-h"><h3>أكثر المحاضرين نشاطًا (الجارية)</h3></div><div class="list">${byLect.map(([l, n], i) => `<button type="button" class="li" data-lect="${esc(l)}"><span class="rk num">${i + 1}</span><span class="t">${esc(l)}</span><span class="pill">${n} نشاط</span></button>`).join("") || `<div class="empty">—</div>`}</div></div>
  </div>`;
  const tail = h.indexOf('<div class="panel"><div class="panel-h"><h3>الأنشطة الجارية خلال أيام الأسبوع');
  return kp + monthCmp() + grid + (tail >= 0 ? h.slice(tail) : ""); };

/* 3) الربط: المسجد ← أنشطته وجالياته وخطباؤه وتصاريحه وتعارضاته؛ المحاضر ← أنشطته وتصاريحه؛ النشاط ← مسجده ومحاضره وجاليته وتعارضاته */
const actLk = e => lkRow("i-cal", `${e.title || e.type || "نشاط"} · ${e.comm || "بلا جالية"}`, [e.lect, e.time, e.st].filter(Boolean).join(" · "), `act:${e.id}`, e.cf.length ? `<span class="chip bad">تعارض</span>` : "");
const _listForm96 = listForm;
listForm = function(kind, key){ _listForm96(kind, key); if (kind !== "mos" || key === undefined) return; const m = mosBy[key]; if (!m) return;
  const L = S.E.filter(e => e.mosque === key), nm = nkey(m.name);
  const kh = [...S.khatibs.entries()].filter(([, k]) => nkey(k.mosque || "").includes(nm));
  const pm = (S.permits || []).filter(p => pStatus(p)[0] === "ساري" && (L.some(e => e.id === p.act_id) || nkey(p.data?.mosque || "").includes(nm)));
  const cf = L.filter(e => e.cf.length);
  const html = lkPanel("أنشطة هذا المسجد", L.sort((a, b) => (RUN(b) - RUN(a))).slice(0, 15).map(actLk))
    + lkPanel("الجاليات فيه", [...new Set(L.map(e => e.comm).filter(Boolean))].map(c => `<button type="button" class="lk-i" data-comm="${esc(c)}"><svg><use href="#i-users"/></svg><span class="lk-t"><b>${esc(c)}</b></span></button>`))
    + lkPanel("خطباء الجمعة", kh.map(([id, k]) => lkRow("i-mic", k.pri || "خطيب", [k.comm, k.bak ? "الاحتياط: " + k.bak : ""].filter(Boolean).join(" · "), `kh:${id}`)))
    + lkPanel("تصاريح سارية", pm.slice(0, 8).map(pmRow)) + (cf.length ? lkPanel("أنشطة متعارضة", cf.map(actLk)) : "");
  $("#drawer .drawer-b")?.insertAdjacentHTML("beforeend", html); };
function lectForm(name){ const k = nkey(name), L = S.E.filter(e => e.names.some(n => nkey(n) === k));
  const pm = (S.permits || []).filter(p => nkey(p.data?.sheikh || "") === k).sort((a, b) => String(b.issued_at || "").localeCompare(String(a.issued_at || "")));
  S.form = { kind:"lect" };
  openDrawer(`المحاضر: ${name}`, `<div class="kpis">${kpiB("كل الأنشطة", L.length, "acts", F0({ q:name }))}${kpiB("الجارية الآن", L.filter(RUN).length, "acts", F0({ q:name, st:"run" }), "ok")}</div>
    ${lkPanel("أنشطته", L.sort((a, b) => RUN(b) - RUN(a)).slice(0, 20).map(actLk))}
    ${lkPanel("المساجد", [...new Set(L.map(e => e.mosque).filter(Boolean))].map(id => lkRow("i-dome", "مسجد " + (mosBy[id]?.name || id), mosBy[id]?.area || "", `mos:${id}`)))}
    ${lkPanel("الجاليات", [...new Set(L.map(e => e.comm).filter(Boolean))].map(c => `<button type="button" class="lk-i" data-comm="${esc(c)}"><svg><use href="#i-users"/></svg><span class="lk-t"><b>${esc(c)}</b></span></button>`))}
    ${lkPanel("تصاريحه", pm.slice(0, 10).map(pmRow))}`, `<button class="btn btn-ghost" data-close>إغلاق</button>`); }
const _actForm96 = actForm;
actForm = function(id, preset){ _actForm96(id, preset); const e = id && S.byId.get(id); if (!e || S.form?.kind !== "act") return;
  const rows = [e.mosque && mosBy[e.mosque] ? lkRow("i-dome", "مسجد " + mosBy[e.mosque].name, [mosBy[e.mosque].area, mosBy[e.mosque].gov].filter(Boolean).join("، "), `mos:${e.mosque}`) : "",
    ...e.names.map(n => `<button type="button" class="lk-i" data-lect="${esc(n)}"><svg><use href="#i-people"/></svg><span class="lk-t"><b>المحاضر: ${esc(n)}</b></span></button>`),
    e.comm ? `<button type="button" class="lk-i" data-comm="${esc(e.comm)}"><svg><use href="#i-users"/></svg><span class="lk-t"><b>الجالية: ${esc(e.comm)}</b></span></button>` : "",
    ...e.cf.map(c => lkRow("i-cal", `يتعارض مع نشاط ${c.o.n}`, [c.o.comm, c.o.lect, c.o.time].filter(Boolean).join(" · "), `act:${c.o.id}`, `<span class="chip bad">تعارض</span>`))];
  const html = lkPanel("انتقل إلى", rows); if (html) $("#drawer .drawer-b")?.insertAdjacentHTML("beforeend", html); };
document.addEventListener("click", ev => { const t = ev.target.closest("[data-lect]"); if (!t) return; ev.stopPropagation(); lectForm(t.dataset.lect); }, true);

/* 4) تنبيهات من البيانات داخل «ملخص الآن» في الجرس (لا إشعارات إضافية) */
const _alerts96 = alerts;
alerts = function(){ const A = _alerts96(); if (!S.canWrite) return A; const E = S.E;
  const exp = S.docs.filter(d => d.end && d.end >= TODAY && diffDays(TODAY, d.end) <= 14 && E.some(e => e.doc === d.no && e.live));
  if (exp.length) A.push({ k:"warn", t:`${exp.length} موافقة تنتهي خلال 14 يومًا ولها أنشطة سارية`, s:exp.slice(0, 3).map(d => d.no).join("، "), go:"docs" });
  const P = S.permits || [], noPerm = E.filter(e => RUN(e) && !P.some(p => p.act_id === e.id && pStatus(p)[0] === "ساري"));
  if (noPerm.length && P.length) A.push({ k:"gold", t:`${noPerm.length} نشاط جارٍ بلا تصريح ساري`, s:"أصدر التصاريح من صفحة الأنشطة", go:"acts", f:{ st:"run" } });
  const byM = new Map(); E.filter(e => e.live && e.cf.length && e.mosque).forEach(e => byM.set(e.mosque, (byM.get(e.mosque) || 0) + 1));
  const rep = [...byM].filter(([, n]) => n >= 3);
  if (rep.length) A.push({ k:"bad", t:`${rep.length} ${rep.length === 1 ? "مسجد بتعارض متكرر" : "مساجد بتعارض متكرر"}`, s:rep.slice(0, 3).map(([id, n]) => `${mosBy[id]?.name || id} (${n})`).join("، "), go:"acts", f:{ st:"cf" } });
  return A; };
