/* ================= v93: جدول خطباء الجمعة (طلب يوسف) ================= */
/* جمعة واحدة أو شهر كامل: المسجد والمنطقة والجالية والخطيب وحالته، مع تصفية وبحث، وإبراز الفجوات
   (مسجد بلا خطيب، أو خطيب على مسجدين في الجمعة نفسها)، وتسجيل الخطيب أو تبديله بضغطة (نافذة سجل الخطب نفسها)،
   وإبلاغ الاحتياط بالواتساب، وتصدير PDF ونص واتساب للجدول. المصدر: جدول الخطباء (S.khatibs) وسجل الخطب (SR). */
TITLES.fsched = "جدول الجمعة";
const FS = { fri:null, month:false };
const fsFris = () => { const out = [], d = dOf(TODAY); while (d.getDay() !== 5) d.setDate(d.getDate() + 1); for (let i = 0; i < 6; i++) { out.push(isoOf(d)); d.setDate(d.getDate() + 7); } return out; };
const fsName = s => nkey(String(s || "").replace(/^(الشيخ|الأخ|د\.?)\s+/, "")).replace(/\s+/g, " ").trim();
/* الخطيب في جمعة معيّنة: المسجَّل في سجل الخطب إن وُجد، وإلا الأساسي (مخطَّط) */
function fsCell(fri, id, k){ const r = SR.rows.get(fri + "|" + id);
  if (r) return { name:r.who === "none" ? "" : (r.name || (r.who === "bak" ? k.bak : k.pri) || ""), st:r.who === "none" ? "none" : "ok", who:r.who };
  return { name:k.pri || "", st:k.pri ? "plan" : "gap", who:"pri" }; }
const FS_ST = { ok:["مؤكد (مسجّل)", "ok"], plan:["بانتظار التأكيد", "gold"], gap:["بلا خطيب", "bad"], none:["لم تُلقَ", "bad"], dup:["خطيب على مسجدين", "bad"] };
function fsRows(fri){ const f = S.f, q = nkey(f.fsq || "");
  const L = [...S.khatibs.entries()].map(([id, k]) => ({ id, k, c:fsCell(fri, id, k) }));
  /* خطيب واحد على أكثر من مسجد في الجمعة نفسها */
  const cnt = new Map(); L.forEach(x => { const n = fsName(x.c.name); if (n) cnt.set(n, (cnt.get(n) || 0) + 1); });
  L.forEach(x => { if (x.c.name && cnt.get(fsName(x.c.name)) > 1) x.c.st = "dup"; });
  return L.filter(({ k, c }) => (!f.fsgov || k.gov === f.fsgov) && (!f.fsarea || k.area === f.fsarea) && (!f.fscomm || k.comm === f.fscomm) && (!f.fsst || c.st === f.fsst)
      && (!q || nkey([k.mosque, k.area, k.gov, k.comm, c.name, k.bak].join(" ")).includes(q)))
    .sort((a, b) => (a.c.st === "ok") - (b.c.st === "ok") || String(a.k.gov || "").localeCompare(String(b.k.gov || ""), "ar") || String(a.k.mosque || "").localeCompare(String(b.k.mosque || ""), "ar")); }
function vFsched(){ if (!SR.loaded) { srLoad().then(() => { SR.loaded = true; if (S.view === "fsched") render(); }); }
  const F = fsFris(), fri = FS.fri && F.includes(FS.fri) ? FS.fri : F[0], f = S.f, all = [...S.khatibs.values()];
  const areas = [...new Set(all.filter(k => !f.fsgov || k.gov === f.fsgov).map(k => k.area).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ar"));
  const R = fsRows(fri), n = s => R.filter(x => x.c.st === s).length;
  const bar = `<div class="toolbar fs-bar"><div class="seg">${F.map(x => `<button type="button" class="${x === fri && !FS.month ? "on" : ""}" data-fsfri="${x}">${fmt(x)}</button>`).join("")}<button type="button" class="${FS.month ? "on" : ""}" data-fsmonth>الشهر</button></div>
    <div class="search"><svg><use href="#i-search"/></svg><input class="f" data-fk="fsq" placeholder="ابحث بالمسجد أو الخطيب أو الجالية…" value="${esc(f.fsq || "")}"></div>
    <select class="f" data-fk="fsgov">${opts(GOVS, f.fsgov, "كل المحافظات")}</select><select class="f" data-fk="fsarea">${opts(areas, f.fsarea, "كل المناطق")}</select>
    <select class="f" data-fk="fscomm">${opts(commNames, f.fscomm, "كل الجاليات")}</select>
    <button type="button" class="btn" data-fsprint>${icon("i-down")} PDF</button><button type="button" class="btn" data-fswa>${icon("i-wa")} واتساب</button></div>`;
  if (FS.month) return bar + fsMonth(F);
  const tiles = `<div class="wq-tiles fs-t">${["gap", "dup", "plan", "ok"].map(s => `<button type="button" class="wq-tile ${FS_ST[s][1] === "bad" ? "bad" : FS_ST[s][1] === "ok" ? "ok" : ""}${f.fsst === s ? " on" : ""}" data-fsst="${s}"><b>${n(s)}</b><span>${FS_ST[s][0]}</span></button>`).join("")}</div>`;
  return bar + tiles + `<div class="panel fs-p" id="fs-sheet"><div class="kt-title">جدول خطباء الجاليات · الجمعة ${fmt(fri)}</div>
    <div class="table-wrap"><table class="kt fs-tb"><thead><tr><th>م</th><th>المسجد</th><th>المنطقة</th><th>الجالية</th><th>الخطيب</th><th>الاحتياط</th><th>الحالة</th><th class="no-print"></th></tr></thead><tbody>
    ${R.map(({ id, k, c }, i) => `<tr class="fs-${c.st}"><td class="n">${i + 1}</td><td>${esc(k.mosque || "")}</td><td>${esc([k.area, k.gov].filter(Boolean).join("، "))}</td><td>${esc(k.comm || "")}</td>
      <td>${esc(c.name || "—")}</td><td>${esc(k.bak || "—")}</td><td><span class="chip ${FS_ST[c.st][1]}">${FS_ST[c.st][0]}</span></td>
      <td class="no-print fs-a">${S.canWrite && fri <= TODAY ? `<button type="button" class="btn btn-ghost" data-src="${fri}|${esc(id)}">تسجيل / تبديل</button>` : ""}${k.bak && k.bph ? `<button type="button" class="btn btn-ghost" data-fsbak="${esc(id)}" data-fri="${fri}" title="إبلاغ الاحتياط">${icon("i-wa")} الاحتياط</button>` : ""}${k.pph ? `<button type="button" class="btn btn-ghost" data-fspri="${esc(id)}" data-fri="${fri}" title="تذكير الخطيب">${icon("i-wa")}</button>` : ""}</td></tr>`).join("")}
    </tbody></table></div>${R.length ? "" : `<div class="empty">لا مساجد بهذه التصفية.</div>`}</div>`; }
/* الشهر: صف لكل مسجد وعمود لكل جمعة بحالة مختصرة */
function fsMonth(F){ const ids = fsRows(F[0]).map(x => x.id);
  return `<div class="panel fs-p" id="fs-sheet"><div class="kt-title">جدول خطباء الجاليات · ${fmt(F[0])} إلى ${fmt(F[F.length - 1])}</div><div class="table-wrap"><table class="kt fs-tb"><thead><tr><th>المسجد</th><th>الجالية</th>${F.map(x => `<th>${fmt(x)}</th>`).join("")}</tr></thead><tbody>
    ${ids.map(id => { const k = S.khatibs.get(id); return `<tr><td>${esc(k.mosque || "")}</td><td>${esc(k.comm || "")}</td>${F.map(x => { const c = fsRows(x).find(r => r.id === id)?.c || fsCell(x, id, k); return `<td class="fs-${c.st}">${esc(c.name || "—")}</td>`; }).join("")}</tr>`; }).join("")}
    </tbody></table></div></div>`; }
const fsWaText = fri => { const R = fsRows(fri); return `جدول خطباء الجاليات · الجمعة ${fmt(fri)}\n\n` + R.map((x, i) => `${i + 1}. ${x.k.mosque || ""} (${[x.k.area, x.k.gov].filter(Boolean).join("، ")}): ${x.c.name || "بلا خطيب"}`).join("\n"); };
document.addEventListener("click", ev => { const t = ev.target.closest("[data-fsfri],[data-fsmonth],[data-fsst],[data-fsprint],[data-fswa],[data-fsbak],[data-fspri]"); if (!t) return; const D = t.dataset;
  if (D.fsfri) { FS.fri = D.fsfri; FS.month = false; return render(); }
  if (D.fsmonth !== undefined) { FS.month = !FS.month; return render(); }
  if (D.fsst) { S.f.fsst = S.f.fsst === D.fsst ? "" : D.fsst; return render(); }
  if (D.fsprint !== undefined) { document.body.classList.add("fs-printing"); window.print(); setTimeout(() => document.body.classList.remove("fs-printing"), 500); return; }
  const fri = FS.fri && fsFris().includes(FS.fri) ? FS.fri : fsFris()[0];
  if (D.fswa !== undefined) { const s = fsWaText(fri); return navigator.clipboard?.writeText(s).then(() => toast("نُسخ الجدول، ألصقه في واتساب"), () => waOpen("", s)); }
  const k = S.khatibs.get(D.fsbak || D.fspri); if (!k) return;
  if (D.fsbak) return waOpen(k.bph, `السلام عليكم ورحمة الله وبركاته\nالشيخ الفاضل / ${k.bak}\n\nنرجو التكرم بإلقاء خطبة الجمعة ${fmt(D.fri)} في ${k.mosque || "المسجد"} بدل الخطيب الأساسي، وإبلاغنا بالتأكيد.\nجزاكم الله خيراً.`);
  return waOpen(k.pph, `السلام عليكم ورحمة الله وبركاته\nالشيخ الفاضل / ${k.pri}\n\nتذكير بخطبة الجمعة ${fmt(D.fri)} في ${k.mosque || "المسجد"}. نرجو إبلاغنا مبكراً إن تعذّر الحضور ليُكلَّف الاحتياط.\nجزاكم الله خيراً.`); });
const _render93 = render;
render = function(){ if (S.view !== "fsched") return _render93.apply(this, arguments);
  $("#title").textContent = TITLES.fsched; $("#add-act").hidden = true; $("#view").innerHTML = vFsched(); if (typeof afterRender === "function") afterRender("fsched"); };
/* زر الصفحة في القائمة تحت «خطباء الجاليات» */
const _afterRender93 = afterRender;
afterRender = function(v){ _afterRender93(v); const nav = $("#nav"); if (!nav || nav.querySelector('[data-nav="fsched"]')) return; const b = nav.querySelector('button[data-nav="khatibs"]');
  b?.insertAdjacentHTML("afterend", `<button data-nav="fsched"${v === "fsched" ? ' aria-current="page"' : ""}><svg><use href="#i-cal"/></svg><span>جدول الجمعة</span></button>`); };

/* الرئيسية: عدد يوم الجمعة في «الأيام السبعة القادمة» دروس فقط؛ تُضاف الخطب بجانبه رقمًا مستقلًا (كان السؤال: هل 119 تشمل الخطب؟ لا) */
const _vHome93 = vHome;
vHome = function(){ const h = _vHome93(), n = S.khatibs?.size || 0; if (!n) return h;
  return h.replace(/(<span class="h"><b>الجمعة<\/b>[\s\S]*?<span class="c num">\d+<\/span>)/, `$1<span class="s fs-hk" title="خطب الجمعة مستقلة عن الدروس">+ ${n} خطبة</span>`); };
