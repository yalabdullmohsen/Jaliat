/* ===== v70: تسجيلات الخطب والدروس: تبويب «حسب المنسق» (منسق ← مساجده، مربوط بمساجد الخطباء)، مزامنة فورية، الترجمة ظاهرة، وإلغاء «موضوع الجمعة المعتمد» ===== */
ftCard = function(){ return ""; };
let srecCh = null;
function srecLive(){ try { if (srecCh) sb.removeChannel(srecCh);
  srecCh = sb.channel("srecs").on("postgres_changes", { event:"*", schema:"public", table:"sermon_recs" }, p => { const n = p.new;
    if (p.eventType === "DELETE") S.srecs = S.srecs.filter(x => x.id !== p.old?.id);
    else if (n?.id && n.comm !== "__test__") { const o = S.srecs.find(x => x.id === n.id); S.srecs = [{ ...(o || {}), ...n }, ...S.srecs.filter(x => x.id !== n.id)].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))); }
    if (S.view === "sermrec" && $("#drawer").hidden) render(); }).subscribe(); } catch (_) {} }
const _boot70 = boot9; boot9 = function(){ _boot70(); srecLive(); };
/* احتياط إن لم يُفعَّل البث الفوري على الجدول: تحديث كل دقيقة والصفحة مفتوحة */
setInterval(() => { if (S.view === "sermrec" && !document.hidden && $("#drawer")?.hidden) srecLoad().then(() => { if (S.view === "sermrec" && $("#drawer").hidden) render(); }).catch(() => {}); }, 60000);

const srMk = s => nkey(String(s || "").replace(/^مسجد\s*/, ""));
function vSrCo(){
  const fri = lastFri(0), all = S.srecs.filter(r => r.comm !== "__test__"), kh = [...S.khatibs.values()];
  const khOf = key => kh.find(k => srMk(k.mosque) === key) || kh.find(k => { const a = srMk(k.mosque); return a && key && (a.includes(key) || key.includes(a)); });
  const by = new Map(); all.forEach(r => { const c = r.comm || "—"; if (!by.has(c)) by.set(c, []); by.get(c).push(r); });
  commNames.forEach(c => { if (!by.has(c) && S.coords.some(k => k.comm === c && k.status !== "سابق")) by.set(c, []); });
  const seen = new Set(), isS = r => (r.kind || "sermon") === "sermon";
  const secs = [...by.entries()].sort((a, b) => b[1].length - a[1].length).map(([c, rs]) => {
    const co = S.coords.filter(k => k.comm === c && k.status !== "سابق"), ms = new Map();
    rs.forEach(r => { const key = srMk(r.mosque); if (!key) return; if (!ms.has(key)) ms.set(key, { name:r.mosque, recs:[] }); ms.get(key).recs.push(r); seen.add(key); });
    const rows = [...ms.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name, "ar")).map(([key, m]) => { const k = khOf(key), ss = m.recs.filter(isS), ls = m.recs.length - ss.length, got = ss.some(r => r.fri === fri), last = m.recs.map(r => r.fri || String(r.created_at).slice(0, 10)).sort().pop();
      return `<div class="pv-r"><div class="pv-n"><b>${esc(m.name)}</b><span>${esc(k?.pri || m.recs[0].khatib || "—")} · ${ss.length} خطبة${ls ? ` · ${ls} درس` : ""} · آخرها ${fmt(last)}</span></div><span class="chip ${got ? "ok" : "warn"}">${got ? "وصلت هذه الجمعة" : "لم تصل هذه الجمعة"}</span></div>`; }).join("");
    return `<div class="panel"><div class="ft-h"><div><b>${esc(c)}</b><span class="s">${co.length ? co.map(k => esc(k.name || "—")).join("، ") : "لا منسق مسجَّل"} · ${rs.length} تسجيل</span></div></div><div class="pv-list">${rows || `<div class="empty">لم يصل منها تسجيل بعد</div>`}</div></div>`; }).join("");
  const rest = kh.filter(k => !seen.has(srMk(k.mosque)) && ![...seen].some(s => { const a = srMk(k.mosque); return a && (a.includes(s) || s.includes(a)); }));
  const got = kh.length - rest.length;
  return `<div class="check ${got < kh.length ? "warn" : "ok"}"><b>خطب مساجد الجمعة: وصل تسجيل لـ ${got} من ${kh.length} مسجد</b><span>التسجيلات تصل من بوابة إنجاز وتظهر هنا مباشرة، مرتبة لكل منسق ومساجده.</span></div>${secs}
  ${rest.length ? `<div class="panel"><div class="ft-h"><div><b>مساجد لم يصلها أي تسجيل بعد (${rest.length})</b><span class="s">من قائمة مساجد خطب الجمعة</span></div></div><div class="pv-list">${rest.map(k => `<div class="pv-r"><div class="pv-n"><b>${esc(k.mosque)}</b><span>${esc(k.pri || "—")}${k.area ? " · " + esc(k.area) : ""}</span></div></div>`).join("")}</div></div>` : ""}`; }

const _vSermRec70 = vSermRec;
vSermRec = function(){ if (!S.f.srtab) S.f.srtab = "co"; const t = S.f.srtab;
  if (t === "co") { const tabs = [["co", "حسب المنسق"], ["rec", "التسجيلات"], ["kh", "سجل الخطباء"], ["les", "طلبات تسجيل الدروس"]];
    return `<div class="toolbar"><div class="seg">${tabs.map(([k, l]) => `<button type="button" class="${t === k ? "on" : ""}" data-srtab="${k}">${l}</button>`).join("")}</div></div>` + vSrCo(); }
  const h = _vSermRec70(); return h.replace('<div class="seg">', `<div class="seg"><button type="button" data-srtab="co">حسب المنسق</button>`).replace('<details class="sr-d"><summary>الترجمة', '<details class="sr-d" open><summary>الترجمة'); };
