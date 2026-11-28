/* ================= v102 (JL-AI 5): «✨ اسأل عن البيانات» — المساعد يختار استعلامًا معرّفًا مسبقًا، والجواب يُحسب هنا ================= */
/* لا SQL حر ولا وصول للقاعدة من المساعد: يرى أسماء الاستعلامات ومعاملاتها فقط، والحساب على بيانات الصفحة التي سمحت بها الصلاحيات. */
const qaKey = s => (typeof sNorm === "function" ? sNorm(s) : norm(s).toLowerCase()).replace(/^(مسجد|جاليه|الجاليه|الشيخ)\s+/, "");
const qaFind = (L, v) => { if (!v) return null; const k = qaKey(v); return L.find(x => qaKey(x) === k) || L.find(x => qaKey(x).includes(k)) || L.find(x => k.includes(qaKey(x))) || null; };
const qaActs = p => { let L = S.E || []; const comm = qaFind(commNames, p.comm), mos = p.mosque ? S.mosques.find(m => m.name === qaFind(S.mosques.map(x => x.name), p.mosque)) : null, gov = qaFind(GOVS, p.gov), type = qaFind(TYPES, p.type);
  if (p.comm && comm) L = L.filter(e => e.comm === comm); if (mos) L = L.filter(e => e.mosque === mos.id); if (gov) L = L.filter(e => e.gov === gov); if (type) L = L.filter(e => e.type === type);
  if (p.lect) { const k = qaKey(p.lect); L = L.filter(e => (e.names || []).some(n => qaKey(n).includes(k))); }
  if (p.status !== "all") L = L.filter(RUN);
  return { L, f:F0({ comm:comm || "", gov:gov || "", type:type || "", q:mos ? mos.name : p.lect || "", st:p.status === "all" ? "" : "run" }), scope:[comm, mos && "مسجد " + mos.name, gov, type, p.lect].filter(Boolean).join(" · ") }; };
const QA = [
  { id:"acts_count", d:"عدد الأنشطة (الجارية افتراضيًا، أو all للكل) مع تصفية اختيارية بالجالية أو المسجد أو المحافظة أو النوع أو المحاضر",
    run:p => { const r = qaActs(p); return { t:`${r.L.length} نشاط${p.status === "all" ? "" : " جارٍ"}${r.scope ? " · " + r.scope : ""}`, go:"acts", f:r.f }; } },
  { id:"expiring_approvals", d:"الموافقات التي تنتهي خلال الشهر القادم ولها أنشطة",
    run:() => { const L = S.docs.filter(d => d.end && d.end >= TODAY && diffDays(TODAY, d.end) <= 30); return { t:`${L.length} موافقة تنتهي خلال 30 يومًا`, s:L.slice(0, 6).map(d => `${d.no} (${d.comm || "—"}) ${fmt(d.end)}`).join("، "), go:"docs" }; } },
  { id:"conflicts", d:"الأنشطة المتعارضة حاليًا",
    run:() => { const L = S.E.filter(e => e.live && e.cf.length); return { t:`${L.length} نشاط في تعارض`, go:"acts", f:F0({ st:"cf" }) }; } },
  { id:"top_mosques", d:"أكثر المساجد نشاطًا", run:() => { const m = new Map(); S.E.filter(RUN).forEach(e => e.mosque && m.set(e.mosque, (m.get(e.mosque) || 0) + 1));
    const L = [...m].sort((a, b) => b[1] - a[1]).slice(0, 5); return { t:"أكثر المساجد نشاطًا", s:L.map(([id, n]) => `${mosBy[id]?.name || id} (${n})`).join("، "), go:"stats", f:{ stab:"mos" } }; } },
  { id:"top_lecturers", d:"أكثر المحاضرين نشاطًا", run:() => { const m = new Map(); S.E.filter(RUN).forEach(e => (e.names || []).forEach(n => m.set(n, (m.get(n) || 0) + 1)));
    const L = [...m].sort((a, b) => b[1] - a[1]).slice(0, 5); return { t:"أكثر المحاضرين نشاطًا", s:L.map(([n, c]) => `${n} (${c})`).join("، "), go:"stats", f:{ stab:"acts" } }; } },
  { id:"comm_overview", d:"ملخص جالية: أنشطتها الجارية ومنسقها وموافقاتها السارية (يتطلب comm)",
    run:p => { const c = qaFind(commNames, p.comm); if (!c) return { t:"لم أجد الجالية المقصودة" }; const L = S.E.filter(e => e.comm === c && RUN(e)), co = S.coords.filter(x => x.comm === c && x.status !== "سابق").map(x => x.name), dc = S.docs.filter(d => d.comm === c && d.end >= TODAY);
      return { t:`${c}: ${L.length} نشاط جارٍ، ${dc.length} موافقة سارية`, s:co.length ? "المنسق: " + co.join("، ") : "بلا منسق مسجّل", go:"comm", comm:c }; } },
  { id:"permits_month", d:"عدد التصاريح الصادرة في شهر (month بصيغة YYYY-MM، الافتراضي الشهر الحالي)",
    run:p => { const m = /^\d{4}-\d{2}$/.test(p.month || "") ? p.month : monthNow(); const L = (S.permits || []).filter(x => !x.revoked && (x.issued_at || "").startsWith(m)); return { t:`${L.length} تصريح صدر في ${monLabel(m)}`, go:"permits" }; } },
  { id:"open_requests", d:"الطلبات الواردة المفتوحة", run:() => { const L = (S.reqs || []).filter(r => !["معتمد", "مرفوض", "مكتمل"].includes(r.status)); return { t:`${L.length} طلب مفتوح`, go:"inbox" }; } },
];
function qaBox(){ return `<div class="panel ai-card"><div class="panel-b"><div class="ai-h"><b>${ei("spark")}اسأل عن البيانات</b></div>
  <div class="ai-qa"><input class="f" id="ai-q" placeholder="مثال: كم نشاط جارٍ للجالية الفلبينية في حولي؟"><button type="button" class="btn btn-primary ai-btn" data-aiqa>اسأل</button></div><div class="ai-host" id="ai-qa-out"></div>
  <span class="ai-note">يختار المساعد سؤالًا من قائمة محددة، والرقم يُحسب من بيانات المنصة مباشرة.</span></div></div>`; }
const _vStats102 = vStats;
vStats = function(){ return (S.canWrite || S.me ? qaBox() : "") + _vStats102(); };
async function qaAsk(btn){ const q = ($("#ai-q")?.value || "").trim(), host = $("#ai-qa-out"); if (!q || !host) return;
  aiBusy(btn, true); const r = await aiCall("data_qa", { q, intents:QA.map(x => ({ id:x.id, d:x.d })) }); aiBusy(btn, false);
  if (!r.ok) { host.innerHTML = `<div class="ai-out s">${esc(r.msg || AI_QUIET)}</div>`; return; }
  const it = QA.find(x => x.id === r.out?.intent);
  if (!it) { host.innerHTML = `<div class="ai-out s">لم أفهم السؤال ضمن ما أستطيع حسابه.${r.out?.note ? " " + esc(r.out.note) : ""}<br>أستطيع: ${QA.map(x => esc(x.d.split("(")[0].trim())).join("، ")}.</div>`; return; }
  const a = it.run(r.out?.params || {}); S.qaLast = a;
  host.innerHTML = `<div class="ai-out"><b>${esc(a.t)}</b>${a.s ? `\n${esc(a.s)}` : ""}${a.go ? `<div class="br-acts"><button type="button" class="btn" data-aiqago>افتح القائمة</button></div>` : ""}</div>`; }
document.addEventListener("click", ev => { const t = ev.target.closest("[data-aiqa],[data-aiqago]"); if (!t) return;
  if (t.dataset.aiqa !== undefined) return qaAsk(t);
  const a = S.qaLast; if (!a) return; if (a.comm) { S.comm = a.comm; return go("comm"); } if (a.f) Object.assign(S.f, a.f); go(a.go); });
document.addEventListener("keydown", ev => { if (ev.key === "Enter" && ev.target?.id === "ai-q" && !ev.isComposing) { ev.preventDefault(); qaAsk($("[data-aiqa]")); } });
