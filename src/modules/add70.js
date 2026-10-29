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
function vSrCo(FL){
  const fri = lastFri(0), all = FL.filter(r => r.comm !== "__test__"), kh = [...S.khatibs.values()];
  const khOf = key => kh.find(k => srMk(k.mosque) === key) || kh.find(k => { const a = srMk(k.mosque); return a && key && (a.includes(key) || key.includes(a)); });
  const by = new Map(); all.forEach(r => { const c = r.comm || "—"; if (!by.has(c)) by.set(c, []); by.get(c).push(r); });
  commNames.forEach(c => { if (!by.has(c) && S.coords.some(k => k.comm === c && k.status !== "سابق")) by.set(c, []); });
  const seen = new Set(), seenAll = new Set(S.srecs.filter(r => r.comm !== "__test__").map(r => srMk(r.mosque)).filter(Boolean)), isS = r => (r.kind || "sermon") === "sermon";
  const secs = [...by.entries()].sort((a, b) => b[1].length - a[1].length).map(([c, rs]) => {
    const co = S.coords.filter(k => k.comm === c && k.status !== "سابق"), ms = new Map();
    rs.forEach(r => { const key = srMk(r.mosque); if (!key) return; if (!ms.has(key)) ms.set(key, { name:r.mosque, recs:[] }); ms.get(key).recs.push(r); seen.add(key); });
    const rows = [...ms.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name, "ar")).map(([key, m]) => { const k = khOf(key), ss = m.recs.filter(isS), ls = m.recs.length - ss.length, got = ss.some(r => r.fri === fri), last = m.recs.map(r => r.fri || String(r.created_at).slice(0, 10)).sort().pop();
      return `<div class="pv-r"><div class="pv-n"><b>${esc(m.name)}</b><span>${esc(k?.pri || m.recs[0].khatib || "—")} · ${ss.length} خطبة${ls ? ` · ${ls} درس` : ""} · آخرها ${fmt(last)}</span></div><span class="chip ${got ? "ok" : "warn"}">${got ? "وصلت هذه الجمعة" : "لم تصل هذه الجمعة"}</span></div>`; }).join("");
    return `<div class="panel"><div class="ft-h"><div><b>${esc(c)}</b><span class="s">${co.length ? co.map(k => esc(k.name || "—")).join("، ") : "لا منسق مسجَّل"} · ${rs.length} تسجيل</span></div></div><div class="pv-list">${rows || `<div class="empty">لم يصل منها تسجيل بعد</div>`}</div></div>`; }).join("");
  const rest = kh.filter(k => !seenAll.has(srMk(k.mosque)) && ![...seenAll].some(s => { const a = srMk(k.mosque); return a && (a.includes(s) || s.includes(a)); }));
  const got = kh.length - rest.length;
  return `<div class="check ${got < kh.length ? "warn" : "ok"}"><b>خطب مساجد الجمعة: وصل تسجيل لـ ${got} من ${kh.length} مسجد</b><span>التسجيلات تصل من بوابة إنجاز وتظهر هنا مباشرة، مرتبة لكل منسق ومساجده.</span></div>${secs}
  ${rest.length ? `<div class="panel"><div class="ft-h"><div><b>مساجد لم يصلها أي تسجيل بعد (${rest.length})</b><span class="s">من قائمة مساجد خطب الجمعة</span></div></div><div class="pv-list">${rest.map(k => `<div class="pv-r"><div class="pv-n"><b>${esc(k.mosque)}</b><span>${esc(k.pri || "—")}${k.area ? " · " + esc(k.area) : ""}</span></div></div>`).join("")}</div></div>` : ""}`; }

/* ---- بحث وفلاتر ---- */
function srFiltered(){ const f = S.f, q = nkey(f.srq || ""), cut = f.srpd === "w" ? addDays(TODAY, -7) : f.srpd === "m" ? addDays(TODAY, -30) : "";
  const cn = {}; S.coords.forEach(k => { (cn[k.comm] = cn[k.comm] || []).push(k.name || ""); });
  return S.srecs.filter(r => { if (r.comm === "__test__") return false;
    if (f.srk && (r.kind || "sermon") !== f.srk) return false;
    if (f.srcm && r.comm !== f.srcm) return false;
    if (f.srst) { const g = r.status === "done" ? "done" : r.status === "error" ? "error" : "pending"; if (g !== f.srst) return false; }
    if (cut && (r.fri || String(r.created_at).slice(0, 10)) < cut) return false;
    if (q && !nkey([r.khatib, r.comm, r.mosque, r.summary, r.translation, r.flags, r.proof?.by, (cn[r.comm] || []).join(" ")].filter(Boolean).join(" ")).includes(q)) return false;
    return true; }); }
const srActive = () => !!(S.f.srq || S.f.srk || S.f.srcm || S.f.srst || S.f.srpd);
function srBar(n){ const f = S.f, comms = [...new Set([...commNames, ...S.srecs.map(r => r.comm).filter(c => c && c !== "__test__")])];
  const sel = (id, v, o) => `<select class="f" id="${id}">${o.map(([k, l]) => `<option value="${esc(k)}"${k === (v || "") ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
  return `<div class="toolbar sr-fl"><input class="f" id="sr-q" type="search" placeholder="ابحث: خطيب، مسجد، جالية، منسق، أو كلمة من الملخص والترجمة" value="${esc(f.srq || "")}" autocomplete="off">
    ${sel("sr-k", f.srk, [["", "خطب ودروس"], ["sermon", "الخطب فقط"], ["lesson", "الدروس فقط"]])}${sel("sr-cm", f.srcm, [["", "كل الجاليات"], ...comms.map(c => [c, c])])}
    ${sel("sr-st", f.srst, [["", "كل الحالات"], ["done", "مترجمة"], ["pending", "بانتظار الترجمة"], ["error", "تعذّرت الترجمة"]])}${sel("sr-pd", f.srpd, [["", "كل الفترات"], ["w", "آخر 7 أيام"], ["m", "آخر 30 يوماً"]])}
    ${srActive() ? `<button type="button" class="btn" data-srclr>مسح الفلاتر</button><span class="s">${n} نتيجة</span>` : ""}</div>`; }
document.addEventListener("input", ev => { if (ev.target.id !== "sr-q") return; S.f.srq = ev.target.value; clearTimeout(window.__srqT); window.__srqT = setTimeout(() => { render(); const e = $("#sr-q"); if (e) { e.focus(); e.setSelectionRange(e.value.length, e.value.length); } }, 250); });
document.addEventListener("change", ev => { const m = { "sr-k":"srk", "sr-cm":"srcm", "sr-st":"srst", "sr-pd":"srpd" }[ev.target.id]; if (!m) return; S.f[m] = ev.target.value; render(); });
document.addEventListener("click", ev => { if (!ev.target.closest("[data-srclr]")) return; ["srq", "srk", "srcm", "srst", "srpd"].forEach(k => delete S.f[k]); render(); });

const _vSermRec70 = vSermRec;
vSermRec = function(){ if (!S.f.srtab) S.f.srtab = "co"; const t = S.f.srtab, FL = srFiltered();
  if (t === "co") { const tabs = [["co", "حسب المنسق"], ["rec", "التسجيلات"], ["kh", "سجل الخطباء"], ["les", "طلبات تسجيل الدروس"]];
    return `<div class="toolbar"><div class="seg">${tabs.map(([k, l]) => `<button type="button" class="${t === k ? "on" : ""}" data-srtab="${k}">${l}</button>`).join("")}</div></div>` + srBar(FL.length) + (srActive() && !FL.length ? `<div class="empty">لا توجد نتائج مطابقة</div>` : vSrCo(FL)); }
  let h; if (t === "rec" && srActive()) { const keep = S.srecs; S.srecs = FL; try { h = _vSermRec70(); } finally { S.srecs = keep; } } else h = _vSermRec70();
  h = h.replace('<div class="seg">', `<div class="seg"><button type="button" data-srtab="co">حسب المنسق</button>`).replace('<details class="sr-d"><summary>الترجمة', '<details class="sr-d" open><summary>الترجمة');
  return t === "rec" ? h.replace("</div></div>", "</div></div>" + srBar(FL.length)) : h; };

/* ---- كشف المساجد: عمود المنسق، من الأنشطة المسجّلة في كل مسجد (والمتوفر فقط، والباقي يُترك فارغاً) ---- */
const _vMosques70 = vMosques;
vMosques = function(){ let h = _vMosques70();
  const comms = {}; S.E.forEach(e => { if (e.mosque && e.comm) (comms[e.mosque] = comms[e.mosque] || new Set()).add(e.comm); });
  const who = c => { const L = S.coords.filter(k => k.comm === c && k.status !== "سابق" && k.name), M = L.filter(k => k.role === "منسق"); return (M.length ? M : L).map(k => k.name); };
  const cell = id => [...(comms[id] || [])].map(c => { const n = who(c); return n.length ? `${n.map(esc).join("، ")} <span class="s">(${esc(c)})</span>` : ""; }).filter(Boolean).join("<br>");
  h = h.replace("<th>الأنشطة</th>", "<th>الأنشطة</th><th>المنسق</th>");
  S.mosques.forEach(m => { const re = new RegExp(`(<tr data-open="mos:${String(esc(m.id)).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}">[\\s\\S]*?)</tr>`); h = h.replace(re, `$1<td>${cell(m.id)}</td></tr>`); });
  return h; };

/* ---- كشف المساجد: فلتر «نوع المسجد» (دروس فقط / خطب فقط / الاثنان) + عمود مكافآت الخطب لمساجد الخطباء فقط ---- */
const _vMosques70b = vMosques;
const mkM = m => nkey(String(m).replace(/^مسجد\s+/, ""));
/* ربط مساجد الخطباء (وهي نفسها مساجد مكافآت الخطب) بكشف المساجد: تطابق تام، ثم تطابق جزئي إن كان وحيداً */
let _mk = null;
function mosLink(){ if (_mk && _mk.n === S.khatibs.size && _mk.m === S.mosques.length) return _mk.v; const byKey = new Map(), ids = new Map(), lost = []; S.mosques.forEach(m => { const k = mkM(m.name); if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(m); });
  /* أسماء متكررة (مثل «الصحابة» في أبو حليفة والشرق): يُفضَّل المسجد الذي تطابق منطقته أو محافظته */
  const pick = (L, k) => !L ? null : L.length === 1 ? L[0] : L.find(m => k.area && (m.area || "").includes(k.area)) || L.find(m => k.area && k.area.includes(m.area || "\u0000")) || L.find(m => k.gov && m.gov === k.gov) || null;
  for (const [id, k] of S.khatibs) { const key = mkM(k.mosque || ""); let m = pick(byKey.get(key), k);
    if (!m && key.length >= 3) { const c = S.mosques.filter(x => { const a = mkM(x.name); return a.length >= 3 && (a.includes(key) || key.includes(a)); }); if (c.length === 1) m = c[0]; }
    if (m) { if (!ids.has(m.id)) ids.set(m.id, []); ids.get(m.id).push(String(id)); } else lost.push(k.mosque || String(id)); }
  _mk = { n:S.khatibs.size, m:S.mosques.length, v:{ ids, lost } }; return _mk.v; }
function mosKinds(){ const L = mosLink(), les = new Set(); S.E.forEach(e => { if (e.mosque && !/خطبة/.test(String(e.type || ""))) les.add(e.mosque); });
  return m => { const k = L.ids.get(m.id), l = les.has(m.id); return { ids:k || [], kind:k && l ? "both" : k ? "kh" : l ? "les" : "" }; }; }
vMosques = function(){ const keep = S.mosques, f = S.f.mkind || "", kd0 = mosKinds(), info = new Map(keep.map(m => [m.id, kd0(m)]));
  S.mosques = f ? keep.filter(m => info.get(m.id).kind === f) : keep; let h; try { h = _vMosques70b(); } finally { S.mosques = keep; }
  const sel = `<select class="f" data-fk="mkind">${[["", "كل المساجد"], ["les", "مساجد الدروس فقط"], ["kh", "مساجد الخطباء فقط"], ["both", "مساجد الدروس والخطباء"]].map(([k, l]) => `<option value="${k}"${k === f ? " selected" : ""}>${l}</option>`).join("")}</select>`;
  h = h.replace('<span class="count">', sel + '<span class="count">');
  const [y, mo] = srMonth(), F = new Set(fridays(y, mo)), rate = SR.rate || 0;
  const rew = ids => { let n = 0, sum = 0; for (const [, r] of SR.rows) if (ids.includes(String(r.kh_id)) && F.has(r.fri) && r.who !== "none") { n++; sum += +r.amount > 0 ? +r.amount : rate; } return n ? `${n} خطبة${rate || sum ? ` · ${kd(sum)} د.ك` : ""}` : "—"; };
  h = h.replace("<th>الأنشطة</th>", "<th>الأنشطة</th><th>مكافآت الخطب</th>");
  S.mosques.filter(m => !f || info.get(m.id).kind === f).forEach(m => { const re = new RegExp(`(<tr data-open="mos:${String(esc(m.id)).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}">[\\s\\S]*?)</tr>`), i = info.get(m.id); h = h.replace(re, `$1<td>${i.ids.length ? rew(i.ids) : ""}</td></tr>`); });
  const lost = mosLink().lost; if (lost.length) h = h.replace('<div class="toolbar">', `<div class="check warn"><b>${lost.length} من ${S.khatibs.size} مسجد خطباء غير مربوط بكشف المساجد</b><span>${lost.slice(0, 12).map(esc).join("، ")}${lost.length > 12 ? "…" : ""}، اسمه مختلف عن المسجّل في الكشف.</span></div><div class="toolbar">`);
  return h; };
