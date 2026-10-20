/* ===== v54: khatib record · weekly topic in languages · lesson sampling · lessons map · certificates · sermons monthly report ===== */
Object.assign(TITLES, { lmap:"خريطة الدروس" });
S.rreqs = []; S.awards = [];
async function rrLoad(){ const [a, b] = await Promise.all([sb.from("rec_requests").select("*").order("created_at", { ascending:false }).limit(200), sb.from("awards").select("*").order("created_at", { ascending:false }).limit(200)]); S.rreqs = a.data || []; S.awards = b.data || []; }
const _boot9s54 = boot9; boot9 = function(){ _boot9s54(); rrLoad().then(() => { if ($("#drawer").hidden && ["sermrec", "coordeval"].includes(S.view)) render(); }); };
const SERM = () => S.srecs.filter(r => (r.kind || "sermon") === "sermon"), LESS = () => S.srecs.filter(r => r.kind === "lesson");
const ym0 = () => TODAY.slice(0, 7);

/* ---------- (1) khatib record ---------- */
function khRecord(){ const by = {};
  SERM().forEach(r => { const k = (r.khatib || "—") + "|" + r.comm; const x = by[k] = by[k] || { name:r.khatib || "—", comm:r.comm, n:0, sc:[], off:0, offRecent:0, last:"" }; x.n++; if (r.adherence_score != null) x.sc.push(r.adherence_score);
    if (r.adherence && r.adherence !== "ملتزم") { x.off++; if ((r.fri || r.created_at.slice(0, 10)) >= addDays(TODAY, -60)) x.offRecent++; } x.last = [x.last, r.fri || r.created_at.slice(0, 10)].sort().pop(); });
  return Object.values(by).map(x => ({ ...x, avg:x.sc.length ? Math.round(x.sc.reduce((a, b) => a + b, 0) / x.sc.length) : null })).sort((a, b) => b.offRecent - a.offRecent || (a.avg ?? 101) - (b.avg ?? 101)); }
const khWarned = () => khRecord().filter(x => x.offRecent >= 2);
function vKhRecord(){ const L = khRecord();
  return L.length ? `<div class="pv-list">${L.map(x => `<div class="pv-r"><div class="pv-n"><b>${esc(x.name)}</b><span>${esc(x.comm)} · ${x.n} خطبة · آخرها ${fmt(x.last)}</span></div>
    <span class="chip ${x.avg == null ? "" : x.avg >= 75 ? "ok" : x.avg >= 50 ? "warn" : "bad"}">${x.avg == null ? "بلا مقارنة" : x.avg + "% التزام"}</span>${x.offRecent >= 2 ? `<span class="chip bad">خرج ${x.offRecent} مرات خلال شهرين</span>` : x.off ? `<span class="chip warn">خرج ${x.off}</span>` : ""}
    ${S.canWrite && x.avg != null && x.avg >= 85 && x.n >= 2 ? `<div class="pv-b"><button type="button" class="btn btn-ghost" data-awmk="khatib|${esc(x.comm)}|${esc(x.name)}|التزامه بموضوع خطبة الجمعة بنسبة ${x.avg}%">شهادة شكر</button></div>` : ""}</div>`).join("")}</div>
    <p class="s" style="margin:8px 4px">يظهر تنبيه في صفحة المكافآت لكل خطيب خرج عن الموضوع مرتين أو أكثر خلال شهرين، قبل صرف مكافأته.</p>` : `<div class="empty">يظهر سجل كل خطيب بعد وصول خطبه ومقارنتها بالموضوع المعتمد.</div>`; }
const _vRewards54 = vRewards;
vRewards = function(){ const h = _vRewards54(), W = khWarned(); if (!W.length) return h;
  return `<div class="check"><b>تنبيه قبل صرف المكافآت: ${W.length} خطيب خرج عن موضوع الخطبة أكثر من مرة</b><span>${W.map(x => `${esc(x.name)} (${esc(x.comm)}، ${x.offRecent} مرات)`).join("، ")}</span><button type="button" class="btn" data-go="sermrec" data-srtab-go="kh">عرض سجل الخطباء</button></div>` + h; };

/* sermons page: tabs (recordings · khatib record · lesson requests) */
const _vSermRec54 = vSermRec;
vSermRec = function(){ const t = S.f.srtab || "rec", open = S.rreqs.filter(r => r.status === "open").length;
  const tabs = `<div class="toolbar"><div class="seg">${[["rec", "التسجيلات", S.srecs.length], ["kh", "سجل الخطباء", khRecord().length], ["les", "طلبات تسجيل الدروس", open]].map(([k, l, n]) => `<button type="button" class="${t === k ? "on" : ""}" data-srtab="${k}">${l} <span class="num">${n}</span></button>`).join("")}</div></div>`;
  if (t === "kh") return tabs + vKhRecord();
  if (t === "les") return tabs + vLessonReqs();
  return tabs + _vSermRec54(); };

/* ---------- (4) lesson recording requests ---------- */
function vLessonReqs(){ const comms = commNames.filter(c => S.portal.some(x => x.comm === c && x.active)), c0 = S.f.lrc || "";
  const acts = c0 ? S.E.filter(e => e.comm === c0 && !["ملغى", "مكتمل"].includes(e.status)) : [];
  return `${S.canWrite ? `<div class="panel ft"><div class="ft-h"><div><b>طلب تسجيل درس من منسق</b><span class="s">يصل المنسق تنبيه في البوابة، فيسجّل الدرس مباشرة من المسجد، ويصلكم مترجماً مع الملخص والملاحظات.</span></div></div>
    <div class="ft-f"><div class="g2"><select class="f" id="lr-c"><option value="">اختر الجالية</option>${comms.map(c => `<option${c === c0 ? " selected" : ""}>${esc(c)}</option>`).join("")}</select>
    <select class="f" id="lr-a"><option value="">${c0 ? "اختر الدرس" : "اختر الجالية أولاً"}</option>${acts.map(e => `<option value="${esc(e.id)}">${esc((e.type || "درس") + " · " + (e.mosName || "") + " · " + daysText(e) + " " + (e.time || ""))}</option>`).join("")}</select></div>
    <div class="g2"><input class="f" type="date" id="lr-d" value="${addDays(TODAY, 7)}"><button type="button" class="btn btn-primary" data-lrsend>إرسال الطلب للمنسق</button></div></div></div>` : ""}
  <div class="pv-list">${S.rreqs.map(r => { const rec = S.srecs.find(x => x.id === r.rec_id);
    return `<div class="pv-r"><div class="pv-n"><b>${esc(r.comm)}</b><span>${esc(r.label)}${r.due ? " · قبل " + fmt(r.due) : ""}</span></div>${r.status === "open" ? `<span class="chip warn">بانتظار التسجيل</span>` : `<span class="chip ok">وصل التسجيل</span>${rec ? `<div class="pv-b"><button type="button" class="btn btn-ghost" data-srtab="rec">عرضه</button></div>` : ""}`}</div>`; }).join("") || `<div class="empty">لا توجد طلبات تسجيل دروس.</div>`}</div>`; }

/* ---------- (2)(3) the week's topic: upcoming Friday + translations status ---------- */
function nextFri(){ const d = new Date(); d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7)); return isoOf(d); }
const _ftCard54 = ftCard;
ftCard = function(){ const nf = nextFri(); if (!S.f.ftfri) S.f.ftfri = nf;
  let h = _ftCard54(); const t = S.ftopics.find(x => x.fri === (S.f.ftfri || nf));
  if (nf !== lastFri(0)) h = h.replace(`<div class="seg">`, `<div class="seg"><button type="button" class="${S.f.ftfri === nf ? "on" : ""}" data-ftfri="${nf}">القادمة ${fmt(nf)}${S.ftopics.some(x => x.fri === nf) ? " ✓" : ""}</button>`);
  const n = t ? Object.keys(t.translations || {}).length : 0;
  const st = t ? `<div class="ft-tr"><span class="chip ${t.tr_status === "done" ? "ok" : "warn"}">${t.tr_status === "done" ? `مترجم إلى ${n} لغة` : `جارٍ الترجمة (${n} من 11)`}</span><span class="s">يصل الموضوع مترجماً لكل منسق في البوابة، مع تنبيه صباح الخميس.</span></div>` : "";
  return h.replace(/<\/div>$/, st + "</div>"); };

/* ---------- (5) lessons map ---------- */
const AREA_XY = { "الشرق":[29.381,47.986],"القبلة":[29.372,47.972],"المرقاب":[29.366,47.981],"الصالحية":[29.372,47.991],"الشويخ الإدارية":[29.345,47.960],"الشويخ الصناعية":[29.329,47.942],"شويخ الصناعية":[29.329,47.942],"الشعب":[29.356,48.033],"الدسمة":[29.360,48.010],"الروضة":[29.330,48.000],"العديلية":[29.322,47.985],"الخالدية":[29.326,47.968],"كيفان":[29.338,47.957],"الفيحاء":[29.345,47.980],"القادسية":[29.350,48.000],"اليرموك":[29.312,47.970],"الصليبيخات":[29.335,47.880],"الدوحة":[29.337,47.835],"غرناطة":[29.317,47.870],
  "حولي":[29.333,48.028],"السالمية":[29.334,48.077],"الجابرية":[29.315,48.025],"الرميثية":[29.313,48.075],"مشرف":[29.282,48.068],"النقرة الجنوبي":[29.328,48.038],"بيان":[29.293,48.048],"سلوى":[29.293,48.085],
  "الفروانية":[29.277,47.958],"خيطان":[29.282,47.975],"أبرق خيطان":[29.296,47.987],"جليب الشيوخ":[29.268,47.930],"الجليب":[29.268,47.930],"العارضية":[29.297,47.905],"العارضية الحرفية":[29.290,47.915],"الأندلس":[29.297,47.888],"الرقعي":[29.315,47.935],"العمرية":[29.296,47.960],"الفردوس":[29.296,47.870],"الري":[29.305,47.950],"صبحان":[29.233,48.008],
  "الجهراء القديمة":[29.338,47.675],"الجهراء الصناعية":[29.334,47.700],"العيون":[29.330,47.686],"القصر":[29.343,47.660],"امغرة":[29.358,47.640],"الصليبية":[29.288,47.818],"الصليبية الزراعية":[29.276,47.798],"المطلاع السكنية":[29.470,47.700],"كبد":[29.190,47.745],"معسكرات المباركية":[29.320,47.650],
  "الأحمدي":[29.077,48.083],"الفحيحيل":[29.083,48.130],"الفحاحيل":[29.083,48.130],"المنقف":[29.098,48.130],"أبو حليفة":[29.122,48.125],"أبو حليفه":[29.122,48.125],"الرقة":[29.145,48.110],"العقيلة":[29.170,48.100],"الصباحية":[29.115,48.105],"الفنطاس":[29.172,48.120],"المهبولة":[29.150,48.130],"صباح الأحمد":[28.810,48.060],"ميناء عبد الله":[29.000,48.150],
  "القصور":[29.215,48.065],"أبو فطيرة":[29.200,48.040] };
const GOV_XY = { "العاصمة":[29.36,47.98],"حولي":[29.32,48.04],"الفروانية":[29.28,47.94],"الجهراء":[29.34,47.68],"الأحمدي":[29.10,48.11],"مبارك الكبير":[29.21,48.06] };
const GOV_C = { "العاصمة":"#0F5440","حولي":"#2D6A9F","الفروانية":"#8C6416","الجهراء":"#7A3E9D","الأحمدي":"#A63F33","مبارك الكبير":"#2E8A68" };
function areaXY(m){ let a = String(m.area || "").replace(/\s*\(.*?\)\s*/g, "").replace(/\s+ق\s*\d+.*$/, "").replace(/\s+\d+.*$/, "").trim(); const p = AREA_XY[a] || AREA_XY[a.replace(/^ال/, "")] || GOV_XY[m.gov]; if (!p) return null;
  let h = 0; for (const ch of String(m.id || m.name)) h = (h * 31 + ch.charCodeAt(0)) | 0; return [p[0] + ((h % 100) / 100 - .5) * .012, p[1] + (((h >> 7) % 100) / 100 - .5) * .012]; }
let LMAP = null;
function vLmap(){ const comms = [...new Set(S.E.map(e => e.comm).filter(Boolean))].sort();
  return `<div class="toolbar"><select class="f" id="lm-c" style="max-width:320px"><option value="">كل الجاليات</option>${comms.map(c => `<option${S.f.lmc === c ? " selected" : ""}>${esc(c)}</option>`).join("")}</select><span class="s">مواقع تقريبية حسب المنطقة · ${Object.entries(GOV_C).map(([g, c]) => `<i class="lm-dot" style="background:${c}"></i>${g}`).join(" ")}</span></div><div id="lmap" class="lmap"></div><div id="lm-s" class="s" style="margin:8px 4px"></div>`; }
function lmapDraw(){ const el = $("#lmap"); if (!el || !window.L) return; if (LMAP) { LMAP.remove(); LMAP = null; }
  LMAP = L.map(el, { zoomControl:true, attributionControl:true }).setView([29.25, 47.95], 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom:18, attribution:"© OpenStreetMap" }).addTo(LMAP);
  const live = S.E.filter(e => !["ملغى", "مكتمل"].includes(e.status) && (!S.f.lmc || e.comm === S.f.lmc)), by = {};
  live.forEach(e => { const m = e.mos || mosBy?.[e.mosque]; if (!m) return; (by[m.id || m.name] = by[m.id || m.name] || { m, L:[] }).L.push(e); });
  let n = 0, miss = 0;
  Object.values(by).forEach(({ m, L:ls }) => { const p = areaXY(m); if (!p) { miss++; return; } n++;
    L.circleMarker(p, { radius:Math.min(16, 6 + ls.length * 1.5), color:"#fff", weight:1.5, fillColor:GOV_C[m.gov] || "#0F5440", fillOpacity:.85 }).addTo(LMAP)
      .bindPopup(`<div dir="rtl" style="font-family:inherit;min-width:200px"><b>${esc(m.name)}</b><br><span style="color:#666">${esc(m.area || "")}، ${esc(m.gov || "")}</span><hr style="border:0;border-top:1px solid #eee;margin:6px 0">${ls.slice(0, 8).map(e => `<div style="margin:3px 0"><b>${esc(e.comm || "")}</b> · ${esc(e.type || "درس")}<br><span style="color:#666">${esc(daysText(e))} ${esc(e.time || "")}${e.lect ? " · " + esc(e.lect) : ""}</span></div>`).join("")}${ls.length > 8 ? `<div style="color:#666">و${ls.length - 8} أخرى</div>` : ""}</div>`); });
  const s = $("#lm-s"); if (s) s.textContent = `${live.length} نشاط جارٍ في ${n} مسجد${miss ? `، و${miss} مسجد بلا منطقة معروفة` : ""}.`; }
function lmapLoad(){ if (window.L) return lmapDraw();
  if (!document.querySelector("#lf-css")) { const l = document.createElement("link"); l.id = "lf-css"; l.rel = "stylesheet"; l.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; document.head.appendChild(l); }
  const sc = document.createElement("script"); sc.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"; sc.onload = lmapDraw; document.head.appendChild(sc); }
const _afterRender54 = afterRender;
afterRender = function(){ _afterRender54(); if (S.view === "lmap") setTimeout(lmapLoad, 30); else if (LMAP) { LMAP.remove(); LMAP = null; } };

/* ---------- (6) certificates of appreciation ---------- */
function certHTML(a){ const mName = new Date(a.month + "-01T00:00").toLocaleDateString("ar-KW-u-nu-latn", { month:"long", year:"numeric" });
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>شهادة شكر</title><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet"><sty`+`le>@page{size:A4 landscape;margin:0}body{margin:0;font-family:"IBM Plex Sans Arabic",Tahoma,sans-serif;background:#F6F5F0}
  .c{width:297mm;height:210mm;box-sizing:border-box;padding:18mm;display:grid;place-items:center}.f{width:100%;height:100%;box-sizing:border-box;border:2px solid #A47E35;outline:8px solid #0F5440;outline-offset:6px;background:#fff;display:grid;align-content:center;justify-items:center;gap:14px;text-align:center;padding:20mm}
  .o{color:#5F6B65;font-size:15px;line-height:1.9}.t{font-size:44px;font-weight:700;color:#0F5440;margin:6px 0}.p{font-size:30px;font-weight:700;color:#14201B}.r{font-size:18px;color:#14201B;max-width:190mm;line-height:2}.m{color:#A47E35;font-weight:600}.s{margin-top:18px;color:#5F6B65;font-size:15px}</sty`+`le></head>
  <body><div class="c"><div class="f"><div class="o">وزارة الشؤون الإسلامية<br>إدارة العلاقات الخارجية · قسم الجاليات ورعاية المهتدين وطلبة البعوث</div><div class="t">شهادة شكر وتقدير</div><div class="o">يتقدّم قسم الجاليات بخالص الشكر والتقدير إلى</div><div class="p">${esc(a.person)}</div><div class="o">${a.kind === "khatib" ? "خطيب" : "منسق"} ${esc(a.comm)}</div><div class="r">${esc(a.reason || "")}</div><div class="m">${mName}</div><div class="s">قسم الجاليات ورعاية المهتدين وطلبة البعوث</div></div></div><scr`+`ipt>onload=()=>setTimeout(()=>print(),400)</scr`+`ipt></body></html>`; }
function certOpen(a){ const w = window.open("", "_blank"); if (!w) return toast("اسمح بالنوافذ المنبثقة"); w.document.write(certHTML(a)); w.document.close(); }
const _vCoordEval54 = vCoordEval;
vCoordEval = function(){ const h = _vCoordEval54(), top = coordScores().slice(0, 3), m = ym0(), done = S.awards.filter(a => a.month === m);
  return `<div class="panel ft"><div class="ft-h"><div><b>شهادات الشكر لهذا الشهر</b><span class="s">تصدر للمنسق المتميز وتصله في البوابة، ويمكن طباعتها.</span></div></div>
    <div class="pv-list">${top.map(x => { const d = done.find(a => a.kind === "coord" && a.comm === x.c.name); return `<div class="pv-r"><div class="pv-n"><b>${esc(x.c.coord)}</b><span>${esc(x.c.name)} · تقييم ${x.score}</span></div>${d ? `<span class="chip ok">صدرت</span><div class="pv-b"><button type="button" class="btn btn-ghost" data-awprint="${d.id}">طباعة</button></div>` : S.canWrite ? `<div class="pv-b"><button type="button" class="btn btn-ghost" data-awmk="coord|${esc(x.c.name)}|${esc(x.c.coord)}|تميّزه في متابعة أنشطة الجالية وتجديد موافقاتها وتقاريرها بتقييم ${x.score} من 100">إصدار شهادة</button></div>` : ""}</div>`; }).join("")}</div>
    ${done.filter(a => a.kind === "khatib").map(a => `<div class="pv-r"><div class="pv-n"><b>${esc(a.person)}</b><span>خطيب ${esc(a.comm)}</span></div><span class="chip ok">صدرت</span><div class="pv-b"><button type="button" class="btn btn-ghost" data-awprint="${a.id}">طباعة</button></div></div>`).join("")}</div>` + h; };

/* ---------- (7) monthly sermons report ---------- */
function sermMonth(ym){ const L = SERM().filter(r => (r.fri || r.created_at.slice(0, 10)).startsWith(ym)), sc = L.filter(r => r.adherence_score != null).map(r => r.adherence_score);
  return { L, n:L.length, comms:new Set(L.map(r => r.comm)).size, avg:sc.length ? Math.round(sc.reduce((a, b) => a + b, 0) / sc.length) : null, off:L.filter(r => r.adherence && r.adherence !== "ملتزم"), flags:L.filter(r => r.flags && !/لا ملاحظات/.test(r.flags)) }; }
const _vReport54 = vReport;
vReport = function(){ const h = _vReport54(), ym = S.repMonth || ym0(), x = sermMonth(ym); if (!x.n) return h;
  return h.replace(/(<div class="rp">)/, `<div class="panel ms"><div class="panel-h"><h3>تقرير الخطب للشهر</h3></div><div class="wq-tiles pv-t"><div class="wq-tile ok"><b>${x.n}</b><span>خطبة مسجّلة</span><small>${x.comms} جالية</small></div><div class="wq-tile"><b>${x.avg ?? "—"}${x.avg != null ? "%" : ""}</b><span>متوسط الالتزام بالموضوع</span></div><div class="wq-tile${x.off.length ? " bad" : ""}"><b>${x.off.length}</b><span>خرجت عن الموضوع</span></div><div class="wq-tile${x.flags.length ? " warn" : ""}"><b>${x.flags.length}</b><span>فيها ملاحظات</span></div></div>
    ${x.off.length ? `<div class="pv-list">${x.off.map(r => `<div class="pv-r"><div class="pv-n"><b>${esc(r.khatib || "")} · ${esc(r.comm)}</b><span>${fmt(r.fri)} · ${esc(r.adherence)}${r.adherence_score != null ? " " + r.adherence_score + "%" : ""}</span>${r.adherence_note ? `<span class="s">${esc(r.adherence_note)}</span>` : ""}</div></div>`).join("")}</div>` : ""}</div>$1`); };

/* ---------- events ---------- */
document.addEventListener("click", async ev => { const t = ev.target.closest("[data-srtab],[data-srtab-go],[data-lrsend],[data-awmk],[data-awprint]"); if (!t) return; const D = t.dataset;
  if (D.srtab) { S.f.srtab = D.srtab; return render(); }
  if (D.lrsend !== undefined) { const c = $("#lr-c")?.value, sel = $("#lr-a"), a = sel?.value; if (!c || !a) return toast("اختر الجالية والدرس");
    const { error } = await sb.from("rec_requests").insert({ comm:c, act_id:a, label:sel.options[sel.selectedIndex].text, due:$("#lr-d")?.value || null, created_by:S.me?.id }); if (error) return writeFail(error); await rrLoad(); render(); return toast("وصل الطلب للمنسق"); }
  if (D.awmk) { const [kind, comm, person, reason] = D.awmk.split("|"); const { data, error } = await sb.from("awards").insert({ month:ym0(), kind, comm, person, reason, created_by:S.me?.id }).select().single(); if (error) return writeFail(error); await rrLoad(); render(); toast("صدرت الشهادة ووصلت للمنسق في البوابة"); return certOpen(data); }
  if (D.awprint) { const a = S.awards.find(x => x.id === D.awprint); if (a) certOpen(a); } });
document.addEventListener("click", ev => { const t = ev.target.closest("[data-srtab-go]"); if (t) S.f.srtab = t.dataset.srtabGo; }, true);
document.addEventListener("change", ev => { if (ev.target.id === "lr-c") { S.f.lrc = ev.target.value; render(); } if (ev.target.id === "lm-c") { S.f.lmc = ev.target.value; lmapDraw(); } });
const _prio54 = priorities;
priorities = function(){ const P = _prio54(), W = khWarned(); if (W.length) P.push({ w:72, k:"bad", t:`${W.length} خطيب خرج عن موضوع الخطبة أكثر من مرة`, s:W.slice(0, 2).map(x => x.name).join(" · "), act:{ go:"sermrec", l:"السجل" } }); return P.sort((a, b) => b.w - a.w); };

NEWF.splice(1, 0, ["v54-sermons", "nav:sermrec", "الخطب: سجل الخطباء، الموضوع بلغات الجاليات، تسجيل الدروس، الخريطة، الشهادات", "سجل التزام كل خطيب مع تنبيه في المكافآت، وموضوع الجمعة يُترجم ويصل للمنسقين، وطلب تسجيل درس من أي منسق، وخريطة الدروس، وشهادات الشكر، وتقرير الخطب في التقرير الشهري.", false, "2026-10-20"]);
