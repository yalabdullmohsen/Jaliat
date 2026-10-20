/* ================= v9.8: Friday sermon rewards (record each sermon, monthly reward sheets) ================= */
TITLES.rewards = "مكافآت الخطباء";
const SR = { rows:new Map(), rate:0, y:null, m:null, tab:"grid", q:"", gov:"", loaded:false, pop:null };
const WHO = { pri:["أساسي", "ok", "✓"], bak:["احتياط", "gold", "✓"], other:["بديل", "t1", "✓"], none:["لم تُلقَ", "bad", "✗"] };
const kd = n => (Math.round((+n || 0) * 1000) / 1000).toLocaleString("en", { minimumFractionDigits:3, maximumFractionDigits:3 });
const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
function srMonth(){ if (SR.y === null) { const t = dOf(TODAY); SR.y = t.getFullYear(); SR.m = t.getMonth(); } return [SR.y, SR.m]; }
function fridays(y, m){ const out = []; const d = new Date(y, m, 1); while (d.getMonth() === m) { if (d.getDay() === 5) out.push(isoOf(d)); d.setDate(d.getDate() + 1); } return out; }
async function srLoad(){
  const [a, b] = await Promise.all([sb.from("sermons").select("*").limit(20000), sb.from("settings").select("*").eq("key", "sermon_rate").maybeSingle()]);
  if (!a.error) { SR.rows.clear(); (a.data || []).forEach(r => SR.rows.set(r.fri + "|" + r.kh_id, r)); }
  if (!b.error && b.data) SR.rate = +b.data.value?.kd || 0;
  SR.loaded = true;
}
let srCh = null;
function srLive(){
  if (srCh) sb.removeChannel(srCh);
  srCh = sb.channel("sermons").on("postgres_changes", { event:"*", schema:"public", table:"sermons" }, p => {
    if (p.eventType === "DELETE") { for (const [k, r] of SR.rows) if (r.id === p.old?.id) SR.rows.delete(k); }
    else SR.rows.set(p.new.fri + "|" + p.new.kh_id, p.new);
    if (S.view === "rewards" && $("#drawer").hidden && !SR.pop) render();
  }).subscribe();
}
const khList = () => [...S.khatibs.entries()].sort((a, b) => (a[1].n || 0) - (b[1].n || 0));
function srFilter(L){ const q = nkey(SR.q); return L.filter(([, k]) => (!SR.gov || k.gov === SR.gov) && (!q || nkey([k.mosque, k.pri, k.bak, k.area, k.comm, k.label].join(" ")).includes(q))); }
function srPerson(k, who, row){ if (who === "pri") return { name:k.pri || "", pid:k.pid || "", ph:k.pph || "" }; if (who === "bak") return { name:k.bak || "", pid:k.bid || "", ph:k.bph || "" }; if (who === "other") return { name:row?.name || "", pid:row?.pid || "", ph:"" }; return { name:"", pid:"", ph:"" }; }
function srSheet(){
  const [y, m] = srMonth(); const F = new Set(fridays(y, m));
  const P = new Map();
  for (const r of SR.rows.values()) {
    if (!F.has(r.fri) || r.who === "none") continue;
    const k = S.khatibs.get(r.kh_id) || {};
    const per = r.who === "other" ? { name:r.name, pid:r.pid, ph:"" } : srPerson(k, r.who, r);
    const key = (per.pid || nkey(per.name || r.name)) || r.kh_id + r.who;
    const it = P.get(key) || { name:per.name || r.name, pid:per.pid || r.pid, ph:per.ph, mos:new Set(), n:0, sum:0, fr:[] };
    it.n++; it.sum += +r.amount > 0 ? +r.amount : SR.rate; it.mos.add(k.mosque || ""); it.fr.push(r.fri);
    P.set(key, it);
  }
  return [...P.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, "ar"));
}
function vRewards(){
  if (!SR.loaded) { srLoad().then(() => { srLive(); if (S.view === "rewards") render(); }); return `<div class="loading">جارٍ تحميل سجل الخطب…</div>`; }
  const [y, m] = srMonth(); const FR = fridays(y, m); const L = srFilter(khList());
  const done = L.reduce((n, [id]) => n + FR.filter(f => SR.rows.has(f + "|" + id)).length, 0), total = L.length * FR.length;
  const sheet = srSheet(); const sum = sheet.reduce((s, p) => s + p.sum, 0), cnt = sheet.reduce((s, p) => s + p.n, 0);
  const head = `<div class="toolbar sr-bar">
    <div class="seg" style="flex:none"><button type="button" data-srtab="grid" aria-pressed="${SR.tab === "grid"}">تسجيل الخطب</button><button type="button" data-srtab="sheet" aria-pressed="${SR.tab === "sheet"}">كشف المكافآت</button></div>
    <button class="btn btn-ghost" data-srm="1">‹ السابق</button><h3 class="sr-month">${MONTHS[m]} ${y}</h3><button class="btn btn-ghost" data-srm="-1">التالي ›</button><button class="btn btn-ghost" data-srm="0">الشهر الحالي</button>
    <span class="sr-rate">قيمة الخطبة: <b class="num">${SR.rate ? kd(SR.rate) + " د.ك" : "غير محددة"}</b>${S.admin ? ` <button class="btn btn-ghost" data-srrate>تعديل</button>` : ""}</span></div>`;
  const kpis = `<div class="kpis">${[["خطب الشهر", FR.length + " جمعة"], ["المسجّل", `${done} / ${total}`], ["خطب مستحقة", cnt], ["إجمالي المكافآت", SR.rate ? kd(sum) + " د.ك" : "—"]].map(([a, b], i) => `<div class="kpi"${i === 3 ? ' style="--k:var(--gold)"' : ""}><span>${a}</span><b class="num" style="font-size:26px">${b}</b></div>`).join("")}</div>`;
  const warn = !SR.rate ? `<div class="check warn"><b>حدّد قيمة مكافأة الخطبة</b><span>${S.admin ? "اضغط «تعديل» بجانب «قيمة الخطبة» لإدخال المبلغ بالدينار الكويتي." : "يحدّدها مدير النظام."} إلى ذلك الحين يظهر عدد الخطب فقط.</span></div>` : "";
  if (SR.tab === "sheet") return head + kpis + warn + srSheetHTML(sheet, y, m, sum, cnt);
  return head + kpis + warn + `<div class="toolbar"><div class="search"><svg><use href="#i-search"/></svg><input id="srq" class="f" placeholder="ابحث بالمسجد أو الخطيب…" value="${esc(SR.q)}"></div>
    <select class="f" id="srgov">${opts(GOVS, SR.gov, "كل المحافظات")}</select>
    ${S.canWrite ? `<button class="btn btn-primary" data-srauto>${icon("i-spark")} تعبئة تلقائية: الأساسي لكل الجُمع الفارغة</button>` : ""}
    <span class="legend">${Object.entries(WHO).map(([k, [l, c]]) => `<span><i class="dot" style="background:var(--${c === "t1" ? "t1" : c})"></i>${l}</span>`).join("")}</span></div>
  <div class="panel"><div class="table-wrap"><table class="sr-grid"><thead><tr><th>م</th><th>المسجد</th><th>الخطيب الأساسي</th><th>الاحتياط</th>${FR.map(f => `<th class="c">الجمعة<br><span class="num">${fmt(f).slice(0, 5)}</span></th>`).join("")}<th class="c">المستحق</th></tr></thead><tbody>
  ${L.map(([id, k], i) => { let n = 0; const cells = FR.map(f => { const r = SR.rows.get(f + "|" + id); if (r && r.who !== "none") n++;
      const w = r ? WHO[r.who] : null; return `<td class="c"><button type="button" class="sr-cell ${w ? w[1] : ""}" data-src="${f}|${esc(id)}" title="${r ? esc(w[0] + (r.name ? "، " + r.name : "")) : "غير مسجل"}"${S.canWrite ? "" : " disabled"}>${w ? w[2] + " " + w[0] : "—"}</button></td>`; }).join("");
    return `<tr><td class="n">${i + 1}</td><td class="nm">${esc(k.mosque)}<span class="s">${esc([k.area, k.gov].filter(Boolean).join(" · "))}</span></td><td>${esc(k.pri || "—")}</td><td>${esc(k.bak || "—")}</td>${cells}<td class="c num"><b>${n}</b>${SR.rate && n ? `<span class="s">${kd(n * SR.rate)}</span>` : ""}</td></tr>`; }).join("")}
  </tbody></table></div></div>`;
}
function srSheetHTML(sheet, y, m, sum, cnt){
  return `<div class="toolbar"><button class="btn btn-primary" data-srprint>${icon("i-doc")} طباعة الكشف</button><button class="btn btn-ghost" data-srxls>${icon("i-down")} تصدير إكسل</button><span class="count">${sheet.length} خطيب · ${cnt} خطبة</span></div>
  <div class="panel sr-sheet" id="sr-sheet"><div class="sr-h"><div><b>وزارة الأوقاف والشؤون الإسلامية</b><span>إدارة العلاقات الخارجية، قسم الجاليات ورعاية المهتدين وطلبة البعوث</span></div>
    <h2>كشف مكافآت خطباء الجاليات عن شهر ${MONTHS[m]} ${y}</h2><span class="s">قيمة الخطبة الواحدة: ${SR.rate ? kd(SR.rate) + " د.ك" : "غير محددة"}</span></div>
    <div class="table-wrap"><table class="stbl sr-tbl"><thead><tr><th>م</th><th>اسم الخطيب</th><th>الرقم المدني</th><th>الهاتف</th><th>المسجد</th><th class="c">عدد الخطب</th><th>تواريخ الخطب</th><th class="c">المبلغ (د.ك)</th></tr></thead><tbody>
    ${sheet.map((p, i) => `<tr><td class="n">${i + 1}</td><td class="nm">${esc(p.name || "—")}</td><td class="num">${esc(p.pid || "")}</td><td class="num">${esc(p.ph || "")}</td><td class="s2">${esc([...p.mos].filter(Boolean).join("، "))}</td><td class="c num"><b>${p.n}</b></td><td class="s2 num">${p.fr.sort().map(f => fmt(f).slice(0, 5)).join("، ")}</td><td class="c num"><b>${SR.rate ? kd(p.sum) : "—"}</b></td></tr>`).join("") || `<tr><td colspan="8" class="empty">لا توجد خطب مسجلة لهذا الشهر، سجّلها من تبويب «تسجيل الخطب»</td></tr>`}
    </tbody><tfoot><tr><td></td><td class="nm">الإجمالي</td><td></td><td></td><td></td><td class="c num">${cnt}</td><td></td><td class="c num">${SR.rate ? kd(sum) : "—"}</td></tr></tfoot></table></div>
    <div class="sr-sign"><div><span>إعداد</span><i></i></div><div><span>رئيس القسم</span><i></i></div><div><span>مدير الإدارة</span><i></i></div></div></div>`;
}
async function srSet(key, who, other){
  const [fri, kh] = key.split("|"); const k = S.khatibs.get(kh) || {};
  if (!who) { const r = SR.rows.get(key); if (!r) return; const { error } = await sb.from("sermons").delete().eq("id", r.id); if (error) return writeFail(error); SR.rows.delete(key); return render(); }
  const per = who === "other" ? { name:other?.name || "", pid:other?.pid || "" } : srPerson(k, who);
  const row = { fri, kh_id:kh, who, name:per.name, pid:per.pid, amount:who === "none" ? 0 : SR.rate, note:"" };
  const { data, error } = await sb.from("sermons").upsert(row, { onConflict:"fri,kh_id" }).select().single();
  if (error) return writeFail(error);
  SR.rows.set(key, data || row); render();
}
function srPop(btn){
  srPopClose();
  const key = btn.dataset.src; const r = SR.rows.get(key); const k = S.khatibs.get(key.split("|")[1]) || {};
  const p = document.createElement("div"); p.className = "sr-pop"; SR.pop = p;
  p.innerHTML = `<b>${esc(k.mosque || "")}، ${fmt(key.split("|")[0])}</b>
    <button type="button" data-srw="pri" class="ok">✓ ألقاها الأساسي: ${esc(k.pri || "—")}</button>
    <button type="button" data-srw="bak" class="gold">✓ ألقاها الاحتياط: ${esc(k.bak || "—")}</button>
    <div class="sr-other"><input class="f" id="sr-oname" placeholder="خطيب بديل: الاسم" value="${esc(r?.who === "other" ? r.name : "")}"><input class="f" id="sr-opid" placeholder="الرقم المدني" inputmode="numeric" value="${esc(r?.who === "other" ? r.pid : "")}"><button type="button" data-srw="other" class="t1">حفظ البديل</button></div>
    <button type="button" data-srw="none" class="bad">✗ لم تُلقَ خطبة</button>
    ${r ? `<button type="button" data-srw="" class="clr">مسح التسجيل</button>` : ""}`;
  document.body.appendChild(p);
  const b = btn.getBoundingClientRect(); const w = 300;
  p.style.top = Math.min(window.innerHeight - p.offsetHeight - 10, b.bottom + 6) + "px";
  p.style.left = Math.max(10, Math.min(window.innerWidth - w - 10, b.left + b.width / 2 - w / 2)) + "px";
  p.dataset.key = key;
}
function srPopClose(){ SR.pop?.remove(); SR.pop = null; }
async function srAuto(){
  const [y, m] = srMonth(); const FR = fridays(y, m).filter(f => f <= TODAY);
  const rows = []; for (const [id, k] of srFilter(khList())) for (const f of FR) if (!SR.rows.has(f + "|" + id) && k.pri) rows.push({ fri:f, kh_id:id, who:"pri", name:k.pri || "", pid:k.pid || "", amount:SR.rate, note:"" });
  if (!rows.length) return toast("لا توجد جُمع فارغة حتى اليوم في هذا الشهر");
  for (let i = 0; i < rows.length; i += 200) { const { data, error } = await sb.from("sermons").upsert(rows.slice(i, i + 200), { onConflict:"fri,kh_id" }).select(); if (error) return writeFail(error); (data || []).forEach(r => SR.rows.set(r.fri + "|" + r.kh_id, r)); }
  toast(`سُجّلت ${rows.length} خطبة للخطيب الأساسي، عدّل الاستثناءات`); render();
}
function srRate(){
  S.form = { kind:"srrate" };
  openDrawer("قيمة مكافأة الخطبة", `${fld("sr-rate", "قيمة الخطبة الواحدة (دينار كويتي)", `<input class="f" id="sr-rate" type="number" step="0.001" min="0" dir="ltr" value="${SR.rate || ""}">`, "تُطبّق على الخطب الجديدة وعلى الخطب المسجلة بدون قيمة.")}
    <label class="pv-t"><input type="checkbox" id="sr-apply"> طبّقها أيضاً على كل خطب الشهر المعروض</label>`,
    `<button class="btn btn-primary" data-srratesave>حفظ</button><button class="btn btn-ghost" data-close>إلغاء</button>`);
}
async function srRateSave(){
  const v = +$("#sr-rate").value; if (!(v >= 0)) return toast("أدخل قيمة صحيحة");
  const { error } = await sb.from("settings").upsert({ key:"sermon_rate", value:{ kd:v } }); if (error) return writeFail(error);
  SR.rate = v;
  if ($("#sr-apply").checked) { const [y, m] = srMonth(); const F = fridays(y, m); const upd = [...SR.rows.values()].filter(r => F.includes(r.fri) && r.who !== "none").map(r => ({ ...r, amount:v }));
    for (let i = 0; i < upd.length; i += 200) { const { error:e2 } = await sb.from("sermons").upsert(upd.slice(i, i + 200).map(({ id, updated_at, updated_by, ...x }) => x), { onConflict:"fri,kh_id" }); if (e2) return writeFail(e2); }
    upd.forEach(r => SR.rows.set(r.fri + "|" + r.kh_id, r)); }
  closeDrawer(); toast("حُفظت قيمة الخطبة"); render();
}
function srXls(){
  if (!window.XLSX) return toast("مكتبة إكسل لم تُحمّل بعد");
  const [y, m] = srMonth(); const sheet = srSheet();
  const rows = sheet.map((p, i) => ({ "م":i + 1, "اسم الخطيب":p.name, "الرقم المدني":p.pid, "الهاتف":p.ph, "المسجد":[...p.mos].join("، "), "عدد الخطب":p.n, "تواريخ الخطب":p.fr.sort().map(fmt).join("، "), "المبلغ (د.ك)":SR.rate ? +p.sum.toFixed(3) : "" }));
  rows.push({ "م":"", "اسم الخطيب":"الإجمالي", "عدد الخطب":sheet.reduce((s, p) => s + p.n, 0), "المبلغ (د.ك)":SR.rate ? +sheet.reduce((s, p) => s + p.sum, 0).toFixed(3) : "" });
  const wb = XLSX.utils.book_new(); wb.Workbook = { Views:[{ RTL:true }] };
  const ws = XLSX.utils.aoa_to_sheet([["وزارة الأوقاف والشؤون الإسلامية، إدارة العلاقات الخارجية، قسم الجاليات ورعاية المهتدين وطلبة البعوث"], [`كشف مكافآت خطباء الجاليات عن شهر ${MONTHS[m]} ${y}`], [`قيمة الخطبة: ${SR.rate ? kd(SR.rate) + " د.ك" : "غير محددة"}`], []]);
  XLSX.utils.sheet_add_json(ws, rows, { origin:"A5" }); ws["!cols"] = [6, 28, 16, 12, 30, 10, 36, 14].map(w => ({ wch:w }));
  XLSX.utils.book_append_sheet(wb, ws, "الكشف");
  const data = XLSX.write(wb, { type:"array", bookType:"xlsx" }); const url = URL.createObjectURL(new Blob([data], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a"); a.href = url; a.download = `كشف-مكافآت-الخطباء-${y}-${pad(m + 1)}.xlsx`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
}
document.addEventListener("click", ev => {
  if (SR.pop && !ev.target.closest(".sr-pop") && !ev.target.closest("[data-src]")) srPopClose();
  const t = ev.target.closest("button"); if (!t) return;
  if (t.dataset.srtab) { SR.tab = t.dataset.srtab; return render(); }
  if (t.dataset.srm !== undefined) { const [y, m] = srMonth(); if (t.dataset.srm === "0") { SR.y = null; srMonth(); } else { const d = new Date(y, m - +t.dataset.srm, 1); SR.y = d.getFullYear(); SR.m = d.getMonth(); } return render(); }
  if (t.dataset.src) { if (S.canWrite) srPop(t); return; }
  if (t.dataset.srw !== undefined && SR.pop) { const key = SR.pop.dataset.key; const w = t.dataset.srw; const other = w === "other" ? { name:$("#sr-oname").value.trim(), pid:$("#sr-opid").value.trim() } : null; if (w === "other" && !other.name) return toast("اكتب اسم الخطيب البديل"); srPopClose(); return srSet(key, w, other); }
  if (t.dataset.srauto !== undefined) return srAuto();
  if (t.dataset.srrate !== undefined) return srRate();
  if (t.dataset.srratesave !== undefined) return srRateSave();
  if (t.dataset.srxls !== undefined) return srXls();
  if (t.dataset.srprint !== undefined) { document.body.classList.add("print-sheet"); setTimeout(() => { window.print(); setTimeout(() => document.body.classList.remove("print-sheet"), 500); }, 50); return; }
});
document.addEventListener("input", ev => { if (ev.target.id === "srq") { SR.q = ev.target.value; S.focus = "srq"; clearTimeout(SR.t); SR.t = setTimeout(render, 200); } });
document.addEventListener("change", ev => { if (ev.target.id === "srgov") { SR.gov = ev.target.value; render(); } });
document.addEventListener("keydown", ev => { if (ev.key === "Escape" && SR.pop) srPopClose(); });
const _palAll9 = palAll;
palAll = function(){ const A = _palAll9(); A.splice(2, 0, { g:"إجراءات", t:"كشف مكافآت الخطباء", s:"تسجيل خطب الجمعة والكشف الشهري", ic:"i-mic", run:() => go("rewards"), txt:"مكافات مكافآت خطباء خطبة جمعة كشف رواتب" }); return A; };
const _boot9s = boot9; boot9 = function(){ _boot9s(); srLoad().then(srLive).catch(() => {}); };
