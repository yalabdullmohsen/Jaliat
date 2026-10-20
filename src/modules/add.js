"use strict";
/* ================= v9: smart layer ================= */
const LS = {
  get(k, d){ try { const v = localStorage.getItem("jal9:" + k); return v === null ? d : JSON.parse(v); } catch(e) { return d; } },
  set(k, v){ try { localStorage.setItem("jal9:" + k, JSON.stringify(v)); } catch(e) {} },
  del(k){ try { localStorage.removeItem("jal9:" + k); } catch(e) {} },
};
const F0 = o => ({ q:"", type:"", comm:"", gov:"", day:"", st:"", ...o });
const bySlot = (a, b) => (a.sl?.[0] ?? 9999) - (b.sl?.[0] ?? 9999);
const icon = (id, s = 16) => `<svg width="${s}" height="${s}"><use href="#${id}"/></svg>`;

/* ---------- theme & sidebar ---------- */
const isDark = () => { const t = document.documentElement.dataset.theme; return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; };
function applyTheme(t){
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  const b = $("#theme span"); if (b) b.textContent = isDark() ? "الوضع النهاري" : "الوضع الليلي";
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = isDark() ? "#08120E" : "#0B3A2B";
}
function toggleTheme(){ const t = isDark() ? "light" : "dark"; LS.set("theme", t); applyTheme(t); }
function toggleMini(){ const on = !$("#app").classList.contains("mini"); $("#app").classList.toggle("mini", on); LS.set("mini", on); }
applyTheme(LS.get("theme", ""));
if (LS.get("mini", false)) $("#app").classList.add("mini");

/* ---------- automatic housekeeping ---------- */
setInterval(() => { const t = isoOf(new Date()); if (t !== TODAY) { TODAY = t; schedule(); } }, 60000);
let hiddenAt = 0;
document.addEventListener("visibilitychange", async () => {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  const away = hiddenAt ? Date.now() - hiddenAt : 0; hiddenAt = 0;
  if (S.ready && away > 120000) { try { await loadAll(); live(); schedule(); loadAudit(); loadProfiles(); joinPresence(); } catch(e) { console.error(e); } }
});
const TBL_AR = { acts:"نشاطاً", khatibs:"بيانات خطيب", notes:"ملاحظة", refs:"سجلاً" };
function onRemote(t, p){
  if (!S.ready || p.eventType === "DELETE") return;
  const row = p.new || {}; const by = row.updated_by;
  if (!by || by === S.me?.id) return;
  let what = TBL_AR[t] || "";
  if (t === "acts" && row.data?.n) what = `النشاط رقم ${row.data.n}`;
  if (t === "khatibs" && row.data?.mosque) what = `خطيب ${row.data.mosque}`;
  if (t === "notes" && row.data?.title) what = `ملاحظة «${String(row.data.title).slice(0, 40)}»`;
  if (t === "refs") what = "سجل " + ({ mosques:"المساجد", docs:"الوثائق", comms:"الجاليات", coords:"المنسقين" }[row.id] || "");
  toast(`${whoName(by)} ${p.eventType === "INSERT" ? "أضاف" : "عدّل"} ${what}`);
}

/* ---------- smart insights ---------- */
function smartInsights(){
  const E = S.E, out = [];
  const run = E.filter(e => e.st === "جارٍ" || e.st === "ينتهي قريباً");
  const in7 = d => d && d >= TODAY && diffDays(TODAY, d) <= 7;
  const cf = conflicts();
  if (cf.length) out.push({ lv:"bad", ic:"!", t:`تعارض في المحاضر أو المسجد (${cf.length} نشاط)`, s:"افتح أي نشاط منها وستجد مواعيد بديلة خالية من التعارض", go:"acts", f:F0({ st:"cf" }) });
  const miss = E.filter(e => e.issues.some(i => i.t.startsWith("ناقص"))).length;
  if (miss) out.push({ lv:"bad", ic:"✎", t:`أنشطة بياناتها ناقصة (${miss})`, s:"أكملها لتظهر في التقويم والإحصاءات بدقة", go:"acts", f:F0({ st:"miss" }) });
  const ending = E.filter(e => e.live && in7(e.end) && e.status !== "مكتمل");
  if (ending.length) out.push({ lv:"warn", ic:"⏳", t:`أنشطة تنتهي خلال 7 أيام (${ending.length})`, s:"جدّد الموافقة أو اجعل الحالة «مكتمل»", go:"acts", f:F0({ st:"ينتهي قريباً" }) });
  const docsSoon = S.docs.filter(d => d.end && d.end >= TODAY && diffDays(TODAY, d.end) <= 14);
  if (docsSoon.length) { const linked = E.filter(e => docsSoon.some(d => d.no === e.doc)).length; out.push({ lv:"warn", ic:"▤", t:`وثائق تنتهي خلال أسبوعين (${docsSoon.length})`, s:linked ? `الأنشطة المرتبطة بها: ${linked}` : "", go:"docs" }); }
  const starting = E.filter(e => e.live && e.start > TODAY && in7(e.start));
  if (starting.length) out.push({ lv:"info", ic:"▶", t:`أنشطة تبدأ خلال أسبوع (${starting.length})`, s:[...new Set(starting.map(e => e.comm).filter(Boolean))].slice(0, 4).join("، "), go:"acts", f:F0({ st:"قادم" }) });
  const runComms = new Set(run.map(e => e.comm)); const idle = commNames.filter(c => !runComms.has(c));
  if (idle.length && run.length) out.push({ lv:"gold", ic:"◎", t:`جاليات بلا نشاط جارٍ (${idle.length})`, s:idle.slice(0, 4).join("، ") + (idle.length > 4 ? "…" : ""), go:"comms" });
  if (run.length) {
    const byDay = WEEK.map(d => [d, run.filter(e => e.days.includes(d)).length]);
    const min = byDay.reduce((a, b) => b[1] < a[1] ? b : a), max = byDay.reduce((a, b) => b[1] > a[1] ? b : a);
    out.push({ lv:"ok", ic:"✦", t:`أنسب يوم لجدولة نشاط جديد: ${DAYS[min[0]]}`, s:`أنشطته الجارية ${min[1]} فقط، والأكثر ازدحاماً ${DAYS[max[0]]} (${max[1]})`, go:"cal" });
    const lc = {}; run.forEach(e => (e.lect || "").split(" / ").filter(Boolean).forEach(l => lc[l] = (lc[l] || 0) + 1));
    const busy = Object.entries(lc).filter(([, n]) => n >= 4).sort((a, b) => b[1] - a[1]);
    if (busy.length) out.push({ lv:"info", ic:"♪", t:`أكثر المحاضرين أنشطة: ${busy[0][0]} (${busy[0][1]})`, s:busy.length > 1 ? `و${busy.length - 1} آخرون لديهم 4 أنشطة جارية أو أكثر` : "", go:"acts", f:F0({ q:busy[0][0] }) });
  }
  const nob = [...S.khatibs.values()].filter(k => !k.bak).length;
  if (nob) out.push({ lv:"gold", ic:"◆", t:`مساجد جمعة بلا خطيب احتياط (${nob})`, s:"", go:"khatibs" });
  const hi = [...S.notes.values()].filter(n => n.prio === "عالية" && n.status !== "مغلقة").length;
  if (hi) out.push({ lv:"warn", ic:"★", t:`ملاحظات عالية الأولوية مفتوحة (${hi})`, s:"", go:"notes" });
  if (!out.length) out.push({ lv:"ok", ic:"✓", t:"كل شيء على ما يرام", s:"لا تعارضات ولا نواقص ولا موافقات قريبة الانتهاء" });
  return out;
}
const goAttrs = x => x.go ? ` data-go="${x.go}"${x.f ? ` data-f="${esc(JSON.stringify(x.f))}"` : ""}` : "";

/* ---------- home ---------- */
function weekDays(){ const b = dOf(TODAY); return Array.from({ length:7 }, (_, i) => new Date(b.getFullYear(), b.getMonth(), b.getDate() + i)); }
function vHome(){
  const E = S.E, now = dOf(TODAY);
  const running = E.filter(e => e.st === "جارٍ" || e.st === "ينتهي قريباً").length;
  const soon = E.filter(e => e.st === "ينتهي قريباً").length;
  const upc = E.filter(e => e.st === "قادم").length;
  const cf = conflicts().length;
  const today = E.filter(e => onDay(e, now)).sort(bySlot);
  const expDocs = S.docs.filter(d => d.end && d.end >= TODAY && diffDays(TODAY, d.end) <= WARN_DAYS).sort((a, b) => a.end < b.end ? -1 : 1);
  const t = TYPES.map(x => [x, E.filter(e => e.type === x).length]);
  const wk = weekDays().map(d => { const L = E.filter(e => onDay(e, d)); return { d, n:L.length, t:TYPES.map(x => L.filter(e => e.type === x).length) }; });
  const ins = smartInsights();
  const kpi = (lbl, n, k, go, f, sub) => `<button class="kpi"${k ? ` style="--k:var(--${k})"` : ""} data-go="${go}"${f ? ` data-f="${esc(JSON.stringify(f))}"` : ""}><span>${lbl}</span><b>${n}</b>${sub ? `<small>${sub}</small>` : ""}</button>`;
  return `<div class="home">
  <div class="kpis k6">
    ${kpi("كل الأنشطة", E.length, "", "acts", F0({}))}
    ${kpi("الجارية الآن", running, "ok", "acts", F0({ st:"run" }))}
    ${kpi("أنشطة اليوم", today.length, "t1", "cal", null, esc(DAYS[now.getDay()]))}
    ${kpi(`تنتهي خلال ${WARN_DAYS} يوماً`, soon, "warn", "acts", F0({ st:"ينتهي قريباً" }))}
    ${kpi("القادمة", upc, "gold", "acts", F0({ st:"قادم" }))}
    ${kpi("تعارضات", cf, "bad", "acts", F0({ st:"cf" }))}
  </div>
  <div class="panel"><div class="panel-h"><h3>الأيام السبعة القادمة</h3><span class="legend">${TYPES.map(x => `<span><i class="dot ${TK[x]}"></i>${esc(x)}</span>`).join("")}</span></div>
    <div class="panel-b"><div class="week">${wk.map(w => { const s = isoOf(w.d); return `<button class="wd${s === TODAY ? " today" : ""}" data-wday="${s}">
      <span class="h"><b>${esc(DAYS[w.d.getDay()])}</b><span class="num">${w.d.getDate()}/${w.d.getMonth() + 1}</span></span>
      <span class="c num">${w.n}</span><span class="stack">${w.t.map((n, i) => n ? `<i style="width:${n / Math.max(1, w.n) * 100}%;background:var(--t${i + 1})"></i>` : "").join("")}</span></button>`; }).join("")}</div></div></div>
  <div class="home-grid">
    <div class="home-col">
      <div class="panel"><div class="panel-h"><h3>أنشطة اليوم</h3><span class="chip">${today.length}</span><button class="btn btn-ghost" data-go="cal">التقويم</button></div>
        <div class="list">${today.length ? today.slice(0, 14).map(actRow).join("") : `<div class="empty">لا توجد أنشطة اليوم</div>`}</div>
        ${today.length > 14 ? `<div class="panel-b"><button class="btn btn-ghost" data-go="cal">عرض الكل (${today.length})</button></div>` : ""}</div>
    </div>
    <div class="home-col">
      <div class="panel"><div class="panel-h"><h3>رؤى ذكية</h3><span class="spark">تُحدَّث تلقائياً</span></div>
        <div class="list ins">${ins.map(x => `<button class="li"${goAttrs(x)}><span class="ic ${x.lv}">${esc(x.ic)}</span><span><span class="t">${esc(x.t)}</span>${x.s ? `<br><span class="s">${esc(x.s)}</span>` : ""}</span><span class="go">‹</span></button>`).join("")}</div></div>
      <div class="panel"><div class="panel-h"><h3>حسب النوع</h3></div><div class="panel-b bars">
        ${t.map(([x, n]) => `<div class="bar"><span>${typeChip(x)}</span><span class="track"><i style="width:${E.length ? n / E.length * 100 : 0}%;background:var(--${TK[x]})"></i></span><span class="v">${n}</span></div>`).join("")}
      </div></div>
    </div>
    <div class="home-col">
      <div class="panel"><div class="panel-h"><h3>المتصلون الآن</h3><span class="chip ok">${S.online.length}</span></div><div class="panel-b" style="display:grid;gap:8px">${onlineHTML() || `<span class="s">—</span>`}</div></div>
      <div class="panel"><div class="panel-h"><h3>آخر التعديلات</h3><button class="btn btn-ghost" data-go="audit">السجل الكامل</button></div><div class="list">
        ${S.audit.slice(0, 6).map(x => `<div class="li"><span class="chip ${({ INSERT:"ok", UPDATE:"gold", DELETE:"bad" })[x.action]}">${({ INSERT:"إضافة", UPDATE:"تعديل", DELETE:"حذف" })[x.action] || ""}</span><span><span class="t">${esc(whoName(x.user_id))}</span><br><span class="s">${esc(x.summary || "")}</span></span><span class="s num">${fmtTime(x.at)}</span></div>`).join("") || `<div class="empty">لا تعديلات بعد</div>`}
      </div></div>
      ${expDocs.length ? `<div class="panel"><div class="panel-h"><h3>وثائق تنتهي قريباً</h3></div><div class="list">${expDocs.slice(0, 5).map(d => `<button class="li" data-open="doc:${esc(d.no)}"><span class="n">${esc(d.no)}</span><span class="s">${esc(d.subj)}</span><span class="chip warn">${diffDays(TODAY, d.end)} يوم</span></button>`).join("")}</div></div>` : ""}
    </div>
  </div></div>`;
}

/* ---------- sortable activities table + filtered export ---------- */
S.sort = LS.get("sort", { k:"n", asc:true });
const SORTS = { n:e => e.n || 0, type:e => e.type || "", comm:e => e.comm || "", mos:e => e.mosName || "", day:e => (e.daily ? -1 : WEEK.indexOf(e.days[0] ?? 9)) * 2000 + (e.sl?.[0] ?? 1999),
  lect:e => e.lect || "", start:e => e.start || "9999", st:e => e.st || "" };
function sortList(list){
  const s = S.sort; const f = SORTS[s?.k]; if (!f) return list;
  const emp = v => v === "" || v === "9999";
  return [...list].sort((a, b) => { const x = f(a), y = f(b); if (emp(x) !== emp(y)) return emp(x) ? 1 : -1; const r = typeof x === "number" ? x - y : String(x).localeCompare(String(y), "ar"); return s.asc ? r : -r; });
}
const thS = (k, l) => `<th data-sort="${k}" class="${S.sort.k === k ? "on" + (S.sort.asc ? " asc" : "") : ""}">${l}</th>`;
function actsTable(list, showComm = true){
  if (!list.length) return `<div class="empty">لا توجد أنشطة مطابقة</div>`;
  list = sortList(list);
  return `<div class="table-wrap"><table class="cardify"><thead><tr>${thS("n", "#")}${thS("type", "النوع")}${showComm ? thS("comm", "الجالية") : ""}${thS("mos", "المسجد")}${thS("day", "اليوم والوقت")}${thS("lect", "المحاضر")}${thS("start", "الفترة")}${thS("st", "الحالة / آخر تعديل")}<th></th></tr></thead><tbody>
  ${list.map(e => { const mt = S.meta.get("acts:" + e.id); return `<tr data-open="act:${esc(e.id)}"><td class="n">${e.n}</td><td>${typeChip(e.type)}</td>${showComm ? `<td class="wide">${esc(e.comm || "—")}</td>` : ""}
    <td class="wide">${esc(e.mosName || "—")}<span class="s">${esc([e.area, e.gov].filter(Boolean).join(" · "))}</span></td>
    <td class="wide">${esc(daysText(e))} · ${esc(e.time || "—")}</td><td class="wide">${esc(e.lect || "—")}</td>
    <td class="num hide-m" style="white-space:nowrap;font-size:13px">${fmt(e.start)}<span class="s">${fmt(e.end)}</span></td><td>${stChip(e.st)}${mt?.by ? `<span class="s">${esc(whoName(mt.by))}</span>` : ""}</td>
    <td>${hasBad(e) ? `<span class="flag" title="${esc(e.issues.filter(i => i.lv === "bad").map(i => i.t).join(" | "))}">!</span>` : ""}</td></tr>`; }).join("")}
  </tbody></table></div>`;
}
function vActs(){
  const f = S.f; const list = filterActs(S.E, f);
  const any = ["q", "type", "comm", "gov", "day", "st"].some(k => f[k]);
  return `<div class="toolbar">
    <div class="search"><svg><use href="#i-search"/></svg><input id="q" class="f" placeholder="ابحث: مسجد، محاضر، جالية، رقم وثيقة…  ( / )" value="${esc(f.q || "")}" data-fk="q"></div>
    <select class="f" data-fk="type">${opts(TYPES, f.type, "كل الأنواع")}</select>
    <select class="f" data-fk="comm">${opts(commNames, f.comm, "كل الجاليات")}</select>
    <select class="f" data-fk="gov">${opts(GOVS, f.gov, "كل المحافظات")}</select>
    <select class="f" data-fk="day">${opts(WEEK.map(d => [String(d), DAYS[d]]), f.day, "كل الأيام")}</select>
    <select class="f" data-fk="st">${opts([["run", "الجارية"], ["ينتهي قريباً", "تنتهي قريباً"], ["قادم", "القادمة"], ["منتهٍ", "المنتهية"], ["cf", "فيها تعارض"], ["miss", "بياناتها ناقصة"]], f.st, "كل الحالات")}</select>
    ${any ? `<button class="btn btn-ghost" data-go="acts" data-f="${esc(JSON.stringify(F0({})))}">مسح الفلاتر</button>` : ""}
    <button class="btn btn-ghost" data-xf>${icon("i-down")}تصدير النتائج</button>
    <span class="count">${list.length} من ${S.E.length}</span>
  </div>
  <div class="panel">${actsTable(list)}</div>`;
}
function actsSheetRows(list){ return list.map(e => ({ "م":e.n, "رقم الوثيقة":e.doc, "النوع":e.type, "الجالية":e.comm, "المحافظة":e.gov, "المسجد":e.mosName, "المنطقة":e.area, "اليوم":daysText(e), "الوقت":e.time, "المحاضر":e.lect, "العنوان":e.title, "من":fmt(e.start), "إلى":fmt(e.end), "الحالة":e.st, "التنبيه":e.issues.map(i => i.t).join(" | "), "ملاحظات":e.notes })); }
function exportFiltered(){
  if (!window.XLSX) { toast("مكتبة إكسل لم تُحمّل بعد"); return; }
  const list = sortList(filterActs(S.E, S.f)); if (!list.length) return toast("لا توجد نتائج للتصدير");
  const wb = XLSX.utils.book_new(); wb.Workbook = { Views:[{ RTL:true }] };
  const ws = XLSX.utils.json_to_sheet(actsSheetRows(list)); ws["!cols"] = Object.keys(actsSheetRows(list.slice(0, 1))[0]).map(() => ({ wch:20 }));
  XLSX.utils.book_append_sheet(wb, ws, "النتائج");
  const data = XLSX.write(wb, { type:"array", bookType:"xlsx" });
  const url = URL.createObjectURL(new Blob([data], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a"); a.href = url; a.download = `نتائج-الأنشطة-${TODAY}.xlsx`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast(`صُدّر ${list.length} نشاطاً`);
}

/* ---------- smart activity form ---------- */
const _actForm = actForm;
actForm = function(id, preset){
  _actForm(id);
  if (!S.form || S.form.kind !== "act") return;
  const chk = $("#f-check");
  $("#f-time").closest(".two").after(chk);
  chk.insertAdjacentHTML("afterend", `<div id="f-alt"></div>`);
  $("#f-lect").closest(".fld").insertAdjacentHTML("afterend", `<div id="f-smart"></div>`);
  $(".drawer-b").insertAdjacentHTML("afterbegin", `<div id="f-draft"></div>`);
  if (id && S.canWrite) $(".drawer-f [data-close]")?.insertAdjacentHTML("afterend", `<button class="btn btn-ghost" data-dup>نسخ كنشاط جديد</button>`);
  if (preset) fillAct(preset);
  else if (!id) { const dr = LS.get("draft", null); if (dr && dr.v && Date.now() - dr.at < 7 * 864e5 && (dr.v.comm || dr.v.lect || dr.v.mosque || dr.v.doc)) $("#f-draft").innerHTML = `<div class="smart"><b>مسودة غير محفوظة</b><span>من ${esc(fmtTime(new Date(dr.at).toISOString()))}</span><button class="btn" type="button" data-draft="1">استعادة</button><button class="btn" type="button" data-draft="0">تجاهل</button></div>`; }
  liveCheck();
};
function smartBox(html){ const b = $("#f-smart"); if (b) b.innerHTML = html ? `<div class="smart">${html}</div>` : ""; }
function fillAct(v){
  if (!S.form) return;
  if (v.type) { S.form.type = v.type; document.querySelectorAll("#f-type button").forEach(b => b.setAttribute("aria-pressed", b.dataset.type === v.type)); }
  if (v.doc !== undefined) $("#f-doc").value = v.doc || "";
  if (v.comm !== undefined) $("#f-comm").value = v.comm || "";
  if (v.gov !== undefined) { $("#f-gov").value = v.gov || ""; $("#f-mos").innerHTML = mosOpts(v.gov || "", v.mosque || ""); }
  if (v.mosque !== undefined) { $("#f-mos").value = v.mosque || ""; $("#newmos").hidden = true; }
  if (v.days) {
    S.form.daily = !!v.daily; S.form.days = new Set(v.daily ? [] : v.days);
    $("#f-days [data-daily]").setAttribute("aria-pressed", S.form.daily);
    document.querySelectorAll("#f-days [data-d]").forEach(b => b.setAttribute("aria-pressed", !S.form.daily && S.form.days.has(+b.dataset.d)));
  }
  if (v.time !== undefined) { const known = !v.time || TIMES.includes(v.time); $("#f-time").value = known ? (v.time || "") : "__o"; $("#f-time2").value = known ? "" : v.time; $("#f-time2").closest(".fld").hidden = known; }
  for (const k of ["lect", "title", "start", "end", "notes", "status"]) if (v[k] !== undefined && $("#f-" + k)) $("#f-" + k).value = v[k] || "";
  docHint(); liveCheck();
}
function lectSmart(){
  if (!S.form || S.form.kind !== "act") return;
  const val = $("#f-lect").value.trim(); const names = lectNames(val);
  if (!names.length) { if ($("#f-smart [data-fill]")) smartBox(""); return; }
  const hist = S.E.filter(e => e.id !== S.form.id && e.names.length && sameLect(names, e.names)).sort((a, b) => (b.start || "") < (a.start || "") ? -1 : 1);
  if (!hist.length) { if ($("#f-smart [data-fill]")) smartBox(""); return; }
  const h = hist[0]; S.form.hist = h;
  smartBox(`<b>اقتراح ذكي</b><span>لهذا المحاضر ${hist.length} نشاط سابق، آخرها: ${esc(h.comm || "—")} · ${esc(h.mosName || "—")} · ${esc(daysText(h))} ${esc(h.time || "")}</span><button class="btn" type="button" data-fill>تعبئة من آخر نشاط</button>`);
}
function docSmart(){
  if (!S.form || S.form.kind !== "act" || S.form.id) return;
  const d = docBy[$("#f-doc").value.trim()]; if (!d) return;
  if (!$("#f-comm").value && d.comm && commNames.includes(d.comm)) $("#f-comm").value = d.comm;
  const s = norm(d.subj || ""); const ty = /دور/.test(s) ? "دورة علمية" : /محاضر/.test(s) ? "محاضرة دينية" : /درس|دروس/.test(s) ? "درس ديني" : "";
  if (ty && ty !== S.form.type) fillAct({ type:ty });
}
function saveDraft(){ if (S.form?.kind === "act" && !S.form.id && S.canWrite) { try { LS.set("draft", { at:Date.now(), v:{ ...readAct(), type:S.form.type } }); } catch(e) {} } }
const _liveCheck = liveCheck;
liveCheck = function(){ _liveCheck(); altSuggest(); };
function altSuggest(){
  const box = $("#f-alt"); if (!box || !S.form || S.form.kind !== "act") return;
  let draft; try { draft = readAct(); } catch(e) { return; }
  const clashes = d => { const e = effAct("__draft", { ...draft, ...d, n:0 }); return S.E.some(o => o.id !== S.form.id && clash(e, o)); };
  if (!clashes({})) { box.innerHTML = ""; S.form.alts = []; return; }
  const out = [];
  const friOnly = !draft.daily && draft.days.length === 1 && draft.days[0] === 5;
  for (const t of TIMES) { if (t === draft.time || (t.includes("الجمعة") && !friOnly)) continue; if (!clashes({ time:t })) out.push({ l:t, v:{ time:t } }); if (out.length >= 3) break; }
  if (!draft.daily && draft.days.length === 1) for (const d of WEEK) { if (d === draft.days[0] || (d !== 5 && (draft.time || "").includes("الجمعة"))) continue; if (!clashes({ days:[d] })) out.push({ l:`${DAYS[d]}${draft.time ? " · " + draft.time : ""}`, v:{ days:[d] } }); if (out.length >= 7) break; }
  S.form.alts = out;
  box.innerHTML = out.length ? `<div class="sugg"><span class="lbl">مواعيد بديلة خالية من التعارض — اضغط للتطبيق</span>${out.map((o, i) => `<button type="button" data-alt="${i}">${esc(o.l)}</button>`).join("")}</div>` : "";
}
const _saveAct = saveAct;
saveAct = async function(){ const wasNew = !S.form?.id; await _saveAct(); if (wasNew && !S.form) LS.del("draft"); };

/* ---------- command palette (Ctrl/⌘ + K) ---------- */
const PAL = { open:false, items:[], sel:0, el:null };
function palAll(){
  const A = [];
  const act = (t, s, ic, run, kw = "") => A.push({ g:"إجراءات", t, s, ic, run, txt:t + " " + kw });
  if (S.canWrite) act("إضافة نشاط جديد", "اختصار: N", "i-plus", () => actForm(), "اضافه جديد نشاط درس دوره محاضره");
  if (S.canWrite) act("إضافة نشاط من صورة", "صوّر الكتاب أو الإعلان وتُعبّأ البيانات تلقائياً", "i-cam", () => ocrPick(), "صوره كاميرا تصوير مسح");
  if (S.canWrite) act("ملاحظة جديدة", "", "i-note", () => noteForm());
  if (S.canWrite) act("إضافة خطيب جمعة", "", "i-mic", () => khForm());
  act("تصدير كل البيانات إلى إكسل", "", "i-down", exportXlsx, "excel اكسل تنزيل");
  act(isDark() ? "الوضع النهاري" : "الوضع الليلي", "", "i-moon", toggleTheme, "ثيم داكن فاتح");
  act("طباعة الصفحة الحالية", "", "i-doc", () => window.print(), "print");
  act("تغيير كلمة المرور", "", "i-users", passForm);
  for (const [k, v] of Object.entries(TITLES)) if (k !== "comm" && (k !== "users" || S.admin)) A.push({ g:"الصفحات", t:v, s:"", ic:"i-home", run:() => go(k), txt:v });
  for (const e of S.E) A.push({ g:"الأنشطة", t:`#${e.n} · ${e.mosName || "مسجد غير محدد"}`, s:[e.comm, e.lect, daysText(e) + " " + (e.time || ""), e.st].filter(Boolean).join(" · "), ic:"i-list", run:() => actForm(e.id), txt:[e.n, e.mosName, e.area, e.gov, e.comm, e.lect, e.doc, e.title, e.time, e.type, e.st].join(" "), n:e.n });
  for (const [id, k] of S.khatibs) A.push({ g:"خطباء الجمعة", t:k.mosque || "—", s:[k.pri, k.bak, k.label || k.comm, k.area].filter(Boolean).join(" · "), ic:"i-mic", run:() => khForm(id), txt:[k.mosque, k.pri, k.bak, k.pph, k.bph, k.comm, k.label, k.area, k.gov].join(" ") });
  for (const c of S.comms) A.push({ g:"الجاليات", t:c.name, s:"", ic:"i-people", run:() => { S.comm = c.name; go("comm"); }, txt:c.name });
  for (const m of S.mosques) A.push({ g:"المساجد", t:"مسجد " + m.name, s:[m.area, m.gov].filter(Boolean).join(" · "), ic:"i-dome", run:() => listForm("mos", m.id), txt:"مسجد " + m.name + " " + m.area + " " + m.gov });
  for (const d of S.docs) A.push({ g:"الوثائق", t:d.no, s:d.subj || "", ic:"i-doc", run:() => listForm("doc", d.no), txt:d.no + " " + d.subj + " " + (d.comm || "") });
  for (const [id, n] of S.notes) A.push({ g:"الملاحظات", t:n.title || "—", s:[n.status, n.prio, fmt(n.date)].filter(Boolean).join(" · "), ic:"i-note", run:() => noteForm(id), txt:n.title + " " + n.body + " " + (n.comm || "") });
  S.coords.forEach((c, i) => A.push({ g:"المنسقون", t:c.name, s:[c.role, c.comm, c.phone].filter(Boolean).join(" · "), ic:"i-badge", run:() => listForm("co", i), txt:[c.name, c.role, c.comm, c.lang, c.phone].join(" ") }));
  return A;
}
const lnorm = s => norm(s).toLowerCase();
function subseq(n, t){ /* letters of t in order inside one word-span of n, allowing a couple of extra letters */
  for (let s0 = n.indexOf(t[0]); s0 >= 0; s0 = n.indexOf(t[0], s0 + 1)) { let j = 1, k = s0 + 1; while (j < t.length && k < n.length && k - s0 <= t.length + 2) { if (n[k] === t[j]) j++; k++; } if (j === t.length) return 0.5; }
  return 0;
}
function palSearch(q){
  const nq = lnorm(q).replace(/^#/, ""); const toks = nq.split(" ").filter(Boolean);
  const all = palAll();
  if (!toks.length) return all.filter(x => x.g === "إجراءات" || x.g === "الصفحات");
  const scored = [];
  for (const x of all) {
    const n = lnorm(x.txt); let sc = 0, ok = true;
    for (const t of toks) { const i = n.indexOf(t); if (i >= 0) { sc += i === 0 ? 4 : n[i - 1] === " " ? 3 : 1; continue; } const f = t.length >= 3 && subseq(n, t); if (!f) { ok = false; break; } sc += f; }
    if (!ok) continue;
    if (x.n !== undefined && String(x.n) === nq) sc += 50;
    if (lnorm(x.t).startsWith(toks[0])) sc += 3;
    if (x.g === "الصفحات" || x.g === "إجراءات") sc += 2;
    scored.push([sc, x]);
  }
  scored.sort((a, b) => b[0] - a[0]);
  const per = {}, out = [];
  for (const [, x] of scored) { per[x.g] = (per[x.g] || 0) + 1; if (per[x.g] <= 7) out.push(x); if (out.length >= 45) break; }
  const order = ["إجراءات", "الصفحات", "الأنشطة", "خطباء الجمعة", "الجاليات", "المساجد", "الوثائق", "الملاحظات", "المنسقون"];
  out.sort((a, b) => order.indexOf(a.g) - order.indexOf(b.g));
  return out;
}
function openPal(){
  if (!S.me || PAL.open) return;
  PAL.open = true;
  const w = document.createElement("div"); w.className = "pal-scrim"; w.id = "pal";
  w.innerHTML = `<div class="pal" role="dialog" aria-modal="true" aria-label="البحث الذكي"><div class="pal-in">${icon("i-search", 20)}<input id="pal-q" placeholder="ابحث في كل شيء أو اكتب سؤالاً للمساعد…" autocomplete="off" spellcheck="false"><span class="kbd">Esc</span></div><div class="pal-l" id="pal-l" role="listbox"></div>
    <div class="pal-f"><span><span class="kbd">↑</span> <span class="kbd">↓</span> للتنقل</span><span><span class="kbd">Enter</span> للفتح</span><span><span class="kbd">Ctrl</span>+<span class="kbd">K</span> للفتح من أي مكان</span><span><span class="kbd">N</span> نشاط جديد</span></div></div>`;
  document.body.appendChild(w); PAL.el = w;
  w.addEventListener("mousedown", ev => { if (ev.target === w) closePal(); });
  const inp = $("#pal-q");
  inp.addEventListener("input", () => palRender(inp.value));
  palRender(""); inp.focus();
}
function closePal(){ if (!PAL.open) return; PAL.open = false; PAL.el?.remove(); PAL.el = null; }
function palRender(q){
  PAL.items = palSearch(q); PAL.sel = 0;
  let g = ""; const L = $("#pal-l");
  L.innerHTML = PAL.items.map((x, i) => { const head = x.g !== g ? `<div class="pal-g">${esc(g = x.g)}</div>` : "";
    return head + `<button class="pal-i" role="option" data-pi="${i}" aria-selected="${i === 0}"><span class="ic">${icon(x.ic)}</span><span style="min-width:0"><span class="t">${esc(x.t)}</span>${x.s ? `<span class="s">${esc(x.s)}</span>` : ""}</span>${i === 0 ? `<span class="kbd">Enter</span>` : ""}</button>`; }).join("") || `<div class="empty">لا نتائج</div>`;
}
function palMove(d){
  const n = PAL.items.length; if (!n) return;
  PAL.sel = (PAL.sel + d + n) % n;
  document.querySelectorAll("#pal-l .pal-i").forEach(b => b.setAttribute("aria-selected", +b.dataset.pi === PAL.sel));
  document.querySelector(`#pal-l [data-pi="${PAL.sel}"]`)?.scrollIntoView({ block:"nearest" });
}
function palRun(i){ const x = PAL.items[i]; if (!x) return; closePal(); if (!$("#drawer").hidden && !/^(i-list|i-mic|i-note|i-dome|i-doc|i-badge|i-plus|i-users)$/.test(x.ic)) closeDrawer(); x.run(); }
document.addEventListener("click", ev => { const b = ev.target.closest("[data-pi]"); if (b && PAL.open) { ev.stopPropagation(); palRun(+b.dataset.pi); } }, true);
document.addEventListener("mousemove", ev => { const b = ev.target.closest?.("[data-pi]"); if (b && PAL.open && +b.dataset.pi !== PAL.sel) { PAL.sel = +b.dataset.pi; document.querySelectorAll("#pal-l .pal-i").forEach(x => x.setAttribute("aria-selected", x === b)); } });

/* ---------- keyboard ---------- */
document.addEventListener("keydown", ev => {
  const k = (ev.key || "").toLowerCase();
  if ((ev.metaKey || ev.ctrlKey) && (k === "k" || ev.code === "KeyK")) { ev.preventDefault(); PAL.open ? closePal() : openPal(); return; }
  if (PAL.open) {
    if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); closePal(); }
    else if (ev.key === "ArrowDown") { ev.preventDefault(); palMove(1); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); palMove(-1); }
    else if (ev.key === "Enter" && !ev.isComposing) { ev.preventDefault(); palRun(PAL.sel); }
    return;
  }
  const a = document.activeElement; const typing = a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable);
  if (typing || ev.metaKey || ev.ctrlKey || ev.altKey || !S.me || $("#app").hidden) return;
  if (ev.key === "/") { ev.preventDefault(); const s = $("#view .search input"); s ? s.focus() : openPal(); }
  else if ((k === "n" || ev.code === "KeyN") && S.canWrite && $("#drawer").hidden) { ev.preventDefault(); actForm(); }
}, true);

/* ---------- assistant ---------- */
S.chat = [];
S.ai = { status:null, busy:false };
const saveChat = () => { try { sessionStorage.setItem("jal9:chat", JSON.stringify(S.chat.slice(-30))); } catch(e) {} };
const AI_PROMPTS = [
  ["ملخص اليوم", "ما الذي يحتاج متابعة اليوم؟", "لخّص أنشطة اليوم، وما يحتاج متابعة عاجلة (تعارضات، نواقص، موافقات تنتهي قريباً)، في نقاط مختصرة."],
  ["حل التعارضات", "تحليل التعارضات واقتراح بدائل", "ما التعارضات الموجودة حالياً؟ اعرضها في جدول، واقترح لكل تعارض حلاً عملياً (يوم أو وقت أو مسجد بديل) دون إحداث تعارض جديد."],
  ["تقرير شهري", "تقرير جاهز للرفع لرئيس القسم", "اكتب تقريراً شهرياً موجزاً عن أنشطة القسم لهذا الشهر: الأرقام حسب النوع والجالية والمحافظة، وأبرز الملاحظات، والتوصيات."],
  ["اقتراح موعد", "أنسب يوم ووقت ومسجد", "أريد إضافة درس ديني جديد لإحدى الجاليات. اسألني عن الجالية إن لزم، ثم اقترح أنسب 3 مواعيد (يوم ووقت ومسجد) بدون تعارض مع الأنشطة الحالية، مع السبب."],
  ["الموافقات المنتهية", "الوثائق التي تنتهي قريباً", "ما الوثائق والموافقات التي تنتهي خلال 30 يوماً؟ وما الأنشطة المرتبطة بكل وثيقة؟ رتّبها حسب الأقرب انتهاءً."],
  ["كتاب رسمي", "طلب تجديد موافقة", "اكتب كتاباً رسمياً موجهاً للجهة المختصة لطلب تجديد موافقة الأنشطة التي تنتهي قريباً، بصيغة رسمية مختصرة مع ترك فراغات للرقم والتاريخ والتوقيع."],
  ["خطباء الجمعة", "مساجد بلا احتياط", "ما مساجد خطبة الجمعة التي ليس لها خطيب احتياط؟ وما الجاليات الأكثر حاجة لخطباء؟"],
  ["مقارنة الجاليات", "أي الجاليات أنشط وأيها أقل؟", "قارن بين الجاليات من حيث عدد الأنشطة الجارية وأنواعها، وحدد الجاليات التي تحتاج دعماً بأنشطة إضافية."],
];
function aiContext(){
  const L = [], cl = x => String(x ?? "").replace(/\s+/g, " ").trim();
  const td = dOf(TODAY);
  L.push(`اليوم: ${DAYS[td.getDay()]} ${fmt(TODAY)} م — ${hijri(td)}. أسبوع العمل يبدأ السبت.`);
  L.push(`الأنواع: ${TYPES.join("، ")}. الحالات المحسوبة تلقائياً: جارٍ، ينتهي قريباً (خلال ${WARN_DAYS} يوماً)، قادم، منتهٍ، بلا تاريخ، مكتمل، مؤجل، ملغى.`);
  L.push(`\n## الأنشطة (${S.E.length}) — الرقم | النوع | الجالية | المسجد — المنطقة — المحافظة | الأيام | الوقت | المحاضر | من | إلى | الحالة | الوثيقة | العنوان | يتعارض مع | ملاحظات`);
  for (const e of S.E) L.push([`#${e.n}`, e.type, e.comm, [e.mosName, e.area, e.gov].filter(Boolean).join(" — "), daysText(e), e.time, e.lect, fmt(e.start), fmt(e.end), e.st, e.doc, e.title, e.cf.map(c => "#" + c.o.n).join("،"), cl(e.notes).slice(0, 160)].map(cl).join(" | "));
  L.push(`\n## خطباء الجمعة (${S.khatibs.size}) — المسجد | المنطقة | المحافظة | الجالية | الخطيب الأساسي | هاتفه | الخطيب الاحتياط | هاتفه | ملاحظات`);
  for (const k of [...S.khatibs.values()].sort((a, b) => (a.n || 0) - (b.n || 0))) L.push([k.mosque, k.area, k.gov, k.label || k.comm, k.pri, k.pph, k.bak, k.bph, k.note].map(cl).join(" | "));
  L.push(`\n## الوثائق والموافقات (${S.docs.length}) — الرقم | الموضوع | الجالية | من | إلى | ملاحظات`);
  for (const d of S.docs) L.push([d.no, d.subj, d.comm, fmt(d.start), fmt(d.end), d.notes].map(cl).join(" | "));
  L.push(`\n## المنسقون — الاسم | الصفة | الجالية | اللغة | الهاتف | الحالة`);
  for (const c of S.coords) L.push([c.name, c.role, c.comm, c.lang, c.phone, c.status].map(cl).join(" | "));
  L.push(`\n## الجاليات (${S.comms.length}): ${commNames.join("، ")}`);
  L.push(`\n## المساجد المسجلة (${S.mosques.length}) — المسجد | المنطقة | المحافظة`);
  for (const m of S.mosques) L.push(["مسجد " + m.name, m.area, m.gov].map(cl).join(" | "));
  L.push(`\n## الملاحظات — التاريخ | العنوان | الأولوية | الحالة | الجالية | التفاصيل`);
  for (const n of S.notes.values()) L.push([fmt(n.date), n.title, n.prio, n.status, n.comm, cl(n.body).slice(0, 300)].map(cl).join(" | "));
  L.push(`\n## المستخدمون: ${S.profiles.map(p => [p.name, p.title].filter(Boolean).join(" — ")).join("، ")}. المتصلون الآن: ${S.online.map(whoName).join("، ") || "—"}`);
  return L.join("\n");
}
function mdInline(s){
  return s.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,،]|$)/g, "$1<i>$2</i>")
    .replace(/#(\d{1,4})\b/g, (m, n) => { const e = S.E.find(x => String(x.n) === n); return e ? `<a href="#" dir="ltr" data-open="act:${esc(e.id)}">#${n}</a>` : m; });
}
function md(src){
  const lines = esc(src).split("\n"); const out = []; let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (/^\s*\|.*\|\s*$/.test(l)) {
      const rows = []; while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { rows.push(lines[i]); i++; }
      const cells = r => r.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
      const body = rows.filter(r => !/^\s*\|?\s*:?-{2,}/.test(r));
      if (body.length) out.push(`<div class="table-wrap"><table><thead><tr>${cells(body[0]).map(c => `<th>${mdInline(c)}</th>`).join("")}</tr></thead><tbody>${body.slice(1).map(r => `<tr>${cells(r).map(c => `<td>${mdInline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    let m;
    if ((m = l.match(/^(#{1,4})\s+(.*)$/))) { out.push(`<h${Math.min(4, m[1].length + 1)}>${mdInline(m[2])}</h${Math.min(4, m[1].length + 1)}>`); i++; continue; }
    if (/^\s*([-*•]|\d+[.)])\s+/.test(l)) {
      const ordered = /^\s*\d+[.)]\s+/.test(l); const items = [];
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*([-*•]|\d+[.)])\s+/, "")); i++; }
      out.push(`<${ordered ? "ol" : "ul"}>${items.map(x => `<li>${mdInline(x)}</li>`).join("")}</${ordered ? "ol" : "ul"}>`); continue;
    }
    if (/^\s*(-{3,}|_{3,})\s*$/.test(l)) { out.push("<hr>"); i++; continue; }
    if (!l.trim()) { i++; continue; }
    const para = []; while (i < lines.length && lines[i].trim() && !/^\s*(\||#{1,4}\s|[-*•]\s|\d+[.)]\s)/.test(lines[i])) { para.push(lines[i]); i++; }
    if (para.length) out.push(`<p>${mdInline(para.join("<br>"))}</p>`); else i++;
  }
  return out.join("");
}
/* old Claude-API assistant page removed (v29) — «مساعد إنجاز» and Copilot replace it */
function afterRender(v){}

/* ---------- clicks ---------- */
document.addEventListener("click", ev => {
  const t = ev.target.closest("button,th,a,[data-open]"); if (!t) return;
  const ds = t.dataset;
  if (t.tagName === "A" && ds.open) { ev.preventDefault(); return; }
  if (t.tagName === "TH" && ds.sort) { S.sort = S.sort.k === ds.sort ? { k:ds.sort, asc:!S.sort.asc } : { k:ds.sort, asc:true }; LS.set("sort", S.sort); render(); return; }
  if (ds.wday) { const d = dOf(ds.wday); S.cal = { y:d.getFullYear(), m:d.getMonth(), sel:ds.wday }; return go("cal"); }
  if (t.id === "finder") return openPal();
  if (t.id === "theme") return toggleTheme();
  if (t.id === "collapse") return toggleMini();
  if (ds.xf !== undefined) return exportFiltered();
  if (ds.dup !== undefined && S.form?.kind === "act") { const v = readAct(); const ty = S.form.type; closeDrawer(); actForm(undefined, { ...v, type:ty, status:"مجدول" }); toast("نسخة جديدة — عدّل ما يلزم ثم احفظ"); return; }
  if (ds.draft !== undefined) { const dr = LS.get("draft", null); $("#f-draft").innerHTML = ""; if (ds.draft === "1" && dr) fillAct(dr.v); else LS.del("draft"); return; }
  if (ds.fill !== undefined && S.form?.hist) { const h = S.form.hist; const v = { comm:h.comm, gov:h.gov, mosque:h.mosque, time:h.time, type:h.type }; if (!S.form.daily && !S.form.days.size && h.days?.length) Object.assign(v, { days:h.days, daily:h.daily }); fillAct(v); smartBox(""); toast("عُبّئت البيانات من آخر نشاط للمحاضر"); return; }
  if (ds.alt !== undefined && S.form?.alts) { const o = S.form.alts[+ds.alt]; if (o) { fillAct(o.v); toast("طُبّق الموعد البديل"); } return; }
});
document.addEventListener("input", ev => {
  if (!S.form || S.form.kind !== "act" || !$("#drawer").contains(ev.target)) return;
  if (ev.target.id === "f-lect") { clearTimeout(lectSmart.t); lectSmart.t = setTimeout(lectSmart, 250); }
  clearTimeout(saveDraft.t); saveDraft.t = setTimeout(saveDraft, 500);
});
document.addEventListener("change", ev => {
  if (!S.form || S.form.kind !== "act" || !$("#drawer").contains(ev.target)) return;
  if (ev.target.id === "f-doc") docSmart();
  saveDraft();
});

/* ---------- after login ---------- */
function boot9(){ S.ready = true; const o = $("#ocr-top"); if (o) o.hidden = !S.canWrite; }
