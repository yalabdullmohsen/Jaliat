/* ===== v73: صفحة الأنشطة تُظهر حالة كل نشاط بوضوح: تمت الموافقة (ومتبقي إصدار تصريح / صدر / أُرسل) أو لم تتم الموافقة (يرجى إبلاغ المنسق) ===== */
function apPermit(e){ if (S.permits.some(p => p.act_id === e.id && !p.revoked)) return "issued"; const d = S.pdone?.get(e.id); return d ? (d.st === "sent" ? "sent" : "issued") : "need"; }
function apStage(e, c){ const a = apprOf(e, c); return a.k === "ok" ? "ap_" + apPermit(e) : a.k === "none" ? "ap_none" : "ap_no"; }
function apBadge(e, c){ const a = apprOf(e, c);
  if (a.k === "ok") { const p = apPermit(e); return `<span class="chip ok">✓ تمت الموافقة</span>${p === "need" ? `<span class="chip gold">متبقي: إصدار تصريح</span>` : `<span class="chip ok">✓ ${p === "sent" ? "أُرسل التصريح" : "صدر التصريح"}</span>`}`; }
  if (a.k === "none") return `<span class="chip">بلا رقم كتاب</span>`;
  return `<span class="chip bad">لم تتم الموافقة${a.partial ? " على هذا الموعد" : ""}</span><span class="s ap-n">${a.k === "no" && a.label ? esc(a.label) + "<br>" : ""}يرجى إبلاغ المنسق${a.label && a.k === "wait" ? " · " + esc(a.label) : ""}</span>`; }
const _filterActs73 = filterActs;
filterActs = function(L, f){ const m = String(f.st || "").startsWith("ap_") ? f.st : ""; if (!m) return _filterActs73(L, f); const c = apprCtx();
  const rest = _filterActs73(L, { ...f, st:"" }); return rest.filter(e => m === "ap_no" ? ["no", "wait"].includes(apprOf(e, c).k) : m === "ap_issued" ? ["ap_issued", "ap_sent"].includes(apStage(e, c)) : apStage(e, c) === m); };
const _actsTable73 = actsTable;
actsTable = function(list, showComm){ const h = _actsTable73(list, showComm); if (!list.length) return h; const c = apprCtx();
  return h.replace("<th></th></tr></thead>", `<th>الموافقة والتصريح</th><th></th></tr></thead>`).replace(/<tr data-open="act:([^"]+)">([\s\S]*?)<\/tr>/g, (m, id, inner) => { const e = S.byId?.get(id) || S.E.find(x => x.id === id); if (!e) return m;
    return `<tr data-open="act:${id}">${inner.replace(/<td>(?:(?!<td>)[\s\S])*<\/td>\s*$/, t => `<td class="ap-c">${apBadge(e, c)}</td>` + t)}</tr>`; }); };
const _vActs73 = vActs;
vActs = function(){ let h = _vActs73(); const c = apprCtx(), cnt = { ap_need:0, ap_no:0, ap_done:0 };
  for (const e of S.E) { if (["ملغى", "مكتمل"].includes(e.status)) continue; const a = apprOf(e, c).k; if (a === "none") continue; if (a === "ok") apPermit(e) === "need" ? cnt.ap_need++ : cnt.ap_done++; else cnt.ap_no++; }
  const cur = S.f.st || "", chip = (v, t, n, cls) => `<button type="button" class="ap-f ${cls}${cur === v ? " on" : ""}" data-apf="${v}">${t} <b>${n}</b></button>`;
  const bar = `<div class="ap-bar" role="group" aria-label="حالة الموافقة">${chip("ap_need", "تمت الموافقة · متبقي إصدار تصريح", cnt.ap_need, "gold")}${chip("ap_no", "لم تتم الموافقة · يرجى إبلاغ المنسق", cnt.ap_no, "bad")}${chip("ap_issued", "صدر التصريح", cnt.ap_done, "ok")}${cur.startsWith("ap_") ? `<button type="button" class="ap-f" data-apf="">إظهار الكل</button>` : ""}</div>`;
  return bar + h.replace(/(<select class="f" data-fk="st">[\s\S]*?)(<\/select>)/, `$1<option value="ap_need"${cur === "ap_need" ? " selected" : ""}>تمت الموافقة · متبقي تصريح</option><option value="ap_no"${cur === "ap_no" ? " selected" : ""}>لم تتم الموافقة</option><option value="ap_issued"${cur === "ap_issued" ? " selected" : ""}>صدر / أُرسل التصريح</option>$2`); };
document.addEventListener("click", ev => { const t = ev.target.closest("[data-apf]"); if (!t) return; S.f.st = t.dataset.apf; render(); });
NEWF.splice(0, 0, ["v73-appr", "nav:acts", "حالة الموافقة في الأنشطة", "كل نشاط يظهر معه الآن: «✓ تمت الموافقة · متبقي إصدار تصريح»، أو «لم تتم الموافقة، يرجى إبلاغ المنسق». وفوق الجدول أزرار تصفية بنقرة، وموافقات وثيقة التي وصلت تظهر في «تصاريح الدروس» دون اعتماد يدوي."]);

/* إصدار تصريح: أرقام منسق الجالية تظهر في النموذج نفسه للتواصل المباشر (تتبع الشيخ/اللغة أو النشاط المحدد) */
const _permitForm73 = permitForm;
function pfCoSync(){ const box = $("#pf-co"); if (!box) return; const sh = $("#p-sheikh")?.value.trim(), lg = $("#p-lang")?.value.trim(), mo = $("#p-mosque")?.value || "";
  const hit = S.E.find(e => (e.id === box.dataset.act)) || (sh && S.E.find(e => e.lect && e.lect.split(" / ").includes(sh) && mo.includes(String(e.mosName || "").replace(/^مسجد\s+/, "")))) || (sh && S.E.find(e => e.lect && e.lect.split(" / ").includes(sh)));
  const cm = hit?.comm || lg || ""; box.innerHTML = cm ? `<label>منسق الجالية: ${esc(cm)}</label>${coPhones(cm)}` : ""; }
permitForm = function(preset, grant){ _permitForm73(preset, grant); if (S.form?.kind !== "permit") return;
  const act = preset?.act_id ? S.byId?.get(preset.act_id) : null;
  $("#p-lang")?.closest(".g2")?.insertAdjacentHTML("afterend", `<div class="fld" id="pf-co" data-act="${esc(act?.id || "")}"></div>`); pfCoSync(); };
document.addEventListener("input", ev => { if (ev.target.closest?.("#p-sheikh,#p-lang,#p-mosque")) pfCoSync(); });
document.addEventListener("change", ev => { if (ev.target.closest?.("#p-sheikh,#p-lang,#p-mosque")) pfCoSync(); });

/* المهمة المرتبطة بتفويض إصدار تصريح: رقم منسق الجالية ظاهر بجانب زر «إصدار التصريح الآن» */
const _linkBtn73 = linkBtn;
function grantComm(id){ const g = (S.grants || []).find(x => x.id === id), p = g?.preset || {}, sh = String(p.sheikh || "").trim();
  return S.byId?.get(p.act_id)?.comm || (sh && S.E.find(e => e.lect && e.lect.split(" / ").includes(sh))?.comm) || p.lang || ""; }
linkBtn = function(l){ const [k, id] = String(l).replace(/^#/, "").split(":"), b = _linkBtn73(l); if (k !== "pgrant") return b;
  const cm = grantComm(id); return b + `<div class="fld pf-co-t"><label>${cm ? "منسق الجالية: " + esc(cm) : "منسق الجالية"}</label>${cm ? coPhones(cm) : `<div class="pn-co none">لا يوجد رقم منسق لهذه الجالية</div>`}</div>`; };

/* تفويض انتهى أو سُحب أو صدر تصريحه: مهمته تختفي من مهام الفريق ومن مهام الموظف (وتُلغى في القاعدة عند المدير). المنجزة تبقى في سجل الإنجاز */
const tkDead = t => { if (!t || !TK_OPEN.includes(t.status)) return false; const m = /^#?pgrant:(.+)$/.exec(t.link || ""); if (!m) return false; const g = (S.grants || []).find(x => x.id === m[1]); return !!g && !gOpen(g); };
function tkPrune(){ const dead = (S.tasks || []).filter(tkDead); if (!dead.length) return;
  S.tasks = S.tasks.filter(t => !dead.includes(t));
  if (S.admin) dead.forEach(async t => { const r = await sb.from("tasks").update({ status:"ملغاة" }).eq("id", t.id); if (r?.error) console.warn("tkPrune", r.error.message); }); }
const _loadTasks73 = loadTasks;
loadTasks = async function(){ await _loadTasks73(); tkPrune(); };
const _vTasks73 = vTasks;
vTasks = function(){ tkPrune(); return _vTasks73(); };

/* إصدار التصريح: البيانات تكتمل تلقائياً من كتاب النشاط في وثيقة (الطلب والرد والموافقة)، وتُسجَّل في التصريح */
function pBook(actId){ const e = S.byId?.get(actId); if (!e?.doc) return null; const c = apprCtx(), a = apprOf(e, c); if (a.k !== "ok") return null;
  const w = c.by.get(wqKeyNo(e.doc)), r = w && (wqDir(w) === "in" ? w : c.reply.get(w.id)), d = docBy[e.doc];
  return { no:r?.no || d?.no || e.doc, req:e.doc, date:a.date || "", to:a.end || "" }; }
const pBookD = () => S.form?.book ? { book:S.form.book } : {};
const _permitForm73b = permitForm;
permitForm = function(preset, grant){ _permitForm73b(preset, grant); if (S.form?.kind !== "permit") return;
  const e = S.byId?.get(preset?.act_id || S.form.act); if (!e) return;
  const bk = pBook(e.id); S.form.book = bk;
  const set = (id, v) => { const el = $("#" + id); if (el && v && !el.readOnly && !el.value) { el.value = v; el.classList.add("pr-filled"); } };
  set("p-sheikh", sane(e.lect) ? e.lect : ""); set("p-mosque", e.mosName ? pMos("مسجد " + String(e.mosName).replace(/^مسجد\s+/, ""), e.area, e.gov) : ""); set("p-lang", commBase(e.comm || ""));
  if (!$("#p-date")?.value || $("#p-date").value < TODAY) { const ds = e.daily ? [0, 1, 2, 3, 4, 5, 6] : (e.days || []); for (let i = 0; i < 14 && ds.length; i++) { const t = addDays(TODAY, i); if (ds.includes(dOf(t).getDay())) { $("#p-date").value = t; break; } } }
  const from = $("#p-date")?.value || TODAY;
  if (bk?.to && bk.to > from) { const days = Math.round((dOf(bk.to) - dOf(from)) / 864e5) + 1, s = $("#p-dur"); if (s && !s.disabled) { const i = DUR.findIndex(z => z[0] === "bk"); if (i >= 0) DUR.splice(i, 1); DUR.push(["bk", `حتى نهاية كتاب الموافقة (${fmt(bk.to)})`, days]); s.insertAdjacentHTML("beforeend", `<option value="bk">${esc(DUR.at(-1)[1])}</option>`); s.value = "bk"; } }
  const chk = [["الشيخ", sane($("#p-sheikh")?.value) ? $("#p-sheikh").value : ""], ["المسجد", $("#p-mosque")?.value], ["اللغة", $("#p-lang")?.value], ["تاريخ الدرس", $("#p-date")?.value], ["وقت الدرس", e.time || $("#p-from")?.value], ["كتاب الموافقة", bk ? `${bk.no}${bk.to ? " · سارٍ حتى " + fmt(bk.to) : ""}` : ""]];
  $(".drawer-b")?.insertAdjacentHTML("afterbegin", `<div class="panel pf-chk"><div class="panel-h"><h3>اكتمال بيانات التصريح</h3></div><div class="panel-b">${chk.map(([k, v]) => `<div class="li"><span class="chip ${v ? "ok" : "bad"}">${v ? "✓" : "ناقص"}</span><span><b>${esc(k)}</b> ${v ? esc(v) : ""}</span></div>`).join("")}${bk ? "" : `<div class="s">لم أجد كتاب موافقة لهذا النشاط في وثيقة. أرفق الكتاب من الأعلى أو اختره، فتُقرأ بياناته وتُضاف للتصريح.</div>`}</div></div>`); };

/* حارس نهائي: لا يصدر تصريح باسم شيخ أو مسجد هو في الحقيقة رأس جدول (المسجد، المنطقة، اليوم، التوقيت…) */
const sane = v => !!String(v || "").trim() && !String(v).trim().split(/\s+/).some(x => HDR_W.test(x) && x !== "مسجد" && x !== "جامع");
const _permitIssue73 = permitIssue;
permitIssue = async function(){ const sh = $("#p-sheikh")?.value, mo = $("#p-mosque")?.value;
  if (!sane(sh)) return toast("اسم الشيخ يبدو رأس جدول وليس اسماً، صحّحه قبل الإصدار");
  if (/المنطق[ةه]\s+اليوم|اليوم\s+التوقيت/.test(String(mo || ""))) return toast("اسم المسجد غير صحيح، صحّحه قبل الإصدار");
  return _permitIssue73(); };

/* صفحة المنسقون: أزرار ظاهرة للإضافة والتعديل بدل البحث عنها — «إضافة جالية»، وعلى كل جالية «+ منسق» و«تعديل» */
function ccCards(){ if (S.view !== "coords" || !canCC()) return;
  const tb = $("#view .toolbar"); if (tb && !$("#view [data-cmnew]")) tb.insertAdjacentHTML("afterbegin", `<button class="btn btn-primary" data-cmnew>${icon("i-plus")}إضافة جالية</button>`);
  document.querySelectorAll("#view .cocard").forEach(card => { if (card.querySelector("[data-coadd]")) return; const h = card.querySelector(".coh"), name = h?.querySelector("h3")?.textContent.trim(); if (!name || !commNames.includes(name)) return;
    h.insertAdjacentHTML("beforeend", `<button type="button" class="btn btn-ghost cc-b" data-coadd="${esc(name)}">+ منسق</button><button type="button" class="btn btn-ghost cc-b" data-cmedit="${esc(name)}">تعديل</button>`); }); }
const _afterRender73c = afterRender; afterRender = function(v){ _afterRender73c(v); try { ccCards(); } catch (_) {} };
function cmEditForm(name){ const c = S.comms.find(x => x.name === name); if (!c) return toast("الجالية غير موجودة"); const groups = [...new Set(S.comms.map(x => x.group).filter(Boolean))].sort();
  S.form = { kind:"cmedit", name };
  openDrawer("تعديل الجالية", `<div class="check"><b>${esc(name)}</b><span>الاسم ثابت لأن الأنشطة والكتب مرتبطة به. يُعدَّل هنا اللغة والمجموعة فقط، وللمنسقين اضغط على اسمه في البطاقة.</span></div>
    ${fld("ce-g", "المجموعة", `<select class="f" id="ce-g">${groups.map(g => `<option${g === c.group ? " selected" : ""}>${esc(g)}</option>`).join("")}<option value="__new">مجموعة جديدة…</option></select>`)}
    <div id="ce-gn-w" hidden>${fld("ce-gn", "اسم المجموعة الجديدة", `<input class="f" id="ce-gn">`)}</div>
    ${fld("ce-l", "اللغة", `<input class="f" id="ce-l" value="${esc(c.lang || "")}">`)}`,
    `<button class="btn btn-primary" data-cesave>حفظ</button><button class="btn btn-ghost" data-close>إلغاء</button>`); }
async function cmEditSave(btn){ const c = S.comms.find(x => x.name === S.form?.name); if (!c) return; const g0 = $("#ce-g").value, grp = g0 === "__new" ? $("#ce-gn").value.trim() : g0, lang = $("#ce-l").value.trim();
  if (!grp || !lang) return toast("اكتب المجموعة واللغة"); btn.disabled = true;
  const C = S.comms.map(x => x.name === c.name ? { ...x, group:grp, lang } : x), K = S.coords.map(x => x.comm === c.name ? { ...x, lang } : x);
  try { await T.ref("comms", C); await T.ref("coords", K); S.comms = C; S.coords = K; closeDrawer(); toast("حُفظ تعديل الجالية ✓"); render(); } catch (e) { btn.disabled = false; writeFail(e); } }
document.addEventListener("change", ev => { if (ev.target.id === "ce-g") { const w = $("#ce-gn-w"); if (w) w.hidden = ev.target.value !== "__new"; } });
document.addEventListener("click", ev => { const t = ev.target.closest("button"); if (!t) return;
  if (t.dataset.cmedit) return cmEditForm(t.dataset.cmedit); if (t.dataset.cesave !== undefined) return cmEditSave(t);
  if (t.dataset.coadd) { const nm = t.dataset.coadd, c = S.comms.find(x => x.name === nm), has = S.coords.some(x => x.comm === nm && x.role === "منسق"); listForm("co");
    const set = (id, v) => { const e = $("#" + id); if (e && v) e.value = v; }; set("l-comm", nm); set("l-lang", c?.lang); set("l-role", has ? "نائب منسق" : "منسق"); set("l-status", "نشط"); $("#l-name")?.focus(); } });

/* منسقون بلا جالية (مثل النيبالية): لا تظهر في قائمة الجاليات فلا يمكن اختيارها. زر «إنشاء جالية لهم» يسجّل الجالية ويربط المنسق بها بدل تكراره */
const unCo = () => S.coords.map((c, i) => ({ ...c, i })).filter(c => !c.comm || !commNames.includes(c.comm));
const _ccCards73d = ccCards;
ccCards = function(){ _ccCards73d(); if (S.view !== "coords" || !canCC()) return;
  document.querySelectorAll("#view .cocard").forEach(card => { const h = card.querySelector(".coh"); if (!h || h.querySelector("[data-cmlink]") || h.querySelector("h3")?.textContent.trim() !== "جالية غير محددة") return;
    h.insertAdjacentHTML("beforeend", `<button type="button" class="btn btn-primary cc-b" data-cmlink>إنشاء جالية لهم</button>`); }); };
document.addEventListener("click", ev => { const t = ev.target.closest("button"); if (!t) return;
  if (t.dataset.cmlink !== undefined) { const u = unCo(), m = u.find(x => x.role === "منسق") || u[0]; if (!m) return; cmForm(); S.form.link = u.map(x => x.i);
    const clean = String(m.name || "").split(/\s*[-–]\s*/)[0].trim(); $("#cm-l").value = m.lang || ""; $("#cm-c").value = clean; $("#cm-p").value = m.phone || "";
    const b = $(".drawer-f [data-cmsave]"); if (b) { b.removeAttribute("data-cmsave"); b.dataset.cmlsave = ""; } }
  if (t.dataset.cmlsave !== undefined) { ev.stopImmediatePropagation(); const g0 = $("#cm-g").value, grp = g0 === "__new" ? $("#cm-gn").value.trim() : g0, lang = $("#cm-l").value.trim(), co = $("#cm-c").value.trim(), ph = $("#cm-p").value.replace(/\D/g, "");
    if (!grp || !lang || !co) return toast("اكتب المجموعة واللغة واسم المنسق"); const name = `${lang} - ${co}`; if (S.comms.some(c => c.name === name)) return toast("هذه الجالية موجودة"); t.disabled = true;
    const idx = new Set(S.form.link || []), C = [...S.comms, { no:Math.max(0, ...S.comms.map(c => +c.no || 0)) + 1, lang, name, coord:co, group:grp }], K = S.coords.map((c, i) => idx.has(i) ? { ...c, comm:name, lang: c.lang || lang, ...(c.role === "منسق" ? { name:co, ...(ph ? { phone:ph } : {}) } : {}) } : c);
    Promise.all([T.ref("comms", C), T.ref("coords", K)]).then(() => { S.comms = C; S.coords = K; derive?.(); closeDrawer(); toast("أُنشئت الجالية وربط المنسق بها ✓"); render(); }).catch(e => { t.disabled = false; writeFail(e); }); } }, true);
