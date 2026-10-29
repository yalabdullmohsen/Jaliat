/* ================= v83: flexible permit schedule — time optional (prayer / exact hours / none), monthly rules, notes ================= */
const PREP = [["weekly", "كل أسبوع"], ["n1", "الأسبوع الأول من كل شهر"], ["n2", "الأسبوع الثاني من كل شهر"], ["n3", "الأسبوع الثالث من كل شهر"], ["n4", "الأسبوع الرابع من كل شهر"], ["last", "الأسبوع الأخير من كل شهر"], ["start", "بداية كل شهر (أول 7 أيام)"], ["once", "مرة واحدة (تاريخ الدرس فقط)"], ["free", "حسب الملاحظات"]];
const PORD = { n1:"أول", n2:"ثاني", n3:"ثالث", n4:"رابع", last:"آخر" };
const PNTH = { n1:1, n2:2, n3:3, n4:4, last:-1, start:0 };
const _permitForm83 = permitForm;
permitForm = function(preset, grant){ _permitForm83(preset, grant); if (S.form?.kind !== "permit") return;
  const s = $("#p-pray"); if (s && !s.querySelector('[value="none"]')) { s.insertAdjacentHTML("afterbegin", `<option value="none">بدون وقت محدد</option><option value="clock">وقت محدد بالساعة</option>`); if (preset?.time_mode) s.value = preset.time_mode; else if (!preset?.prayer && !(preset?.act_id && S.byId?.get(preset.act_id)?.time)) s.value = "none"; }
  const dw = $("#pd-days")?.closest(".fld"); const lab = dw?.querySelector("label .s"); if (lab) lab.textContent = "(اختياري — بدونها يصلح أي يوم)";
  dw?.insertAdjacentHTML("beforebegin", fld("p-rep", "التكرار (اختياري)", `<select class="f" id="p-rep">${PREP.map(([k, l]) => `<option value="${k}"${k === (preset?.rep || "weekly") ? " selected" : ""}>${l}</option>`).join("")}</select>`));
  const g = $("#p-date")?.closest(".g3,.g2"), rw = $("#p-rep")?.closest(".fld"), dw2 = $("#pd-days")?.closest(".fld");
  if (g && rw) { g.insertAdjacentHTML("afterend", `<div class="p-sched"></div>`); const box = g.nextElementSibling; box.append(rw); if (dw2) box.append(dw2); }
  pTimeSync(); };
function pTimeSync(){ const m = $("#p-pray")?.value, clock = m === "clock"; const fw = $("#p-from")?.closest(".fld"), tw = $("#p-to")?.closest(".fld"); if (fw) fw.hidden = !clock; if (tw) tw.hidden = !clock; }
document.addEventListener("change", ev => { if (ev.target.id === "p-pray") pTimeSync(); });
function pRepText(rep, days, date){ const dn = days.length && days.length < 7 ? days.map(x => DAYS[x].replace(/^ال/, "")).join(" و") : "";
  if (rep === "weekly") return days.length ? pdText(days) : ""; if (PORD[rep]) return dn ? `${PORD[rep]} ${dn} من كل شهر` : `${PREP.find(x => x[0] === rep)[1]}`;
  if (rep === "start") return dn ? `${dn} في بداية كل شهر` : "بداية كل شهر"; if (rep === "once") return `مرة واحدة ${fmt(date)}`; return ""; }
permitIssue = async function(){ const v = id => $("#" + id)?.value.trim() || "", days = typeof pdGet === "function" ? pdGet() : [];
  if (!v("p-sheikh") || !v("p-mosque") || !v("p-date")) return toast("أكمل اسم الشيخ والمسجد والتاريخ");
  const mode = v("p-pray"), rep = v("p-rep") || "weekly", prayer = PRAYERS.includes(mode) ? mode : "";
  if (prayer === "بعد صلاة الجمعة" && days.length && !days.every(x => x === 5)) return toast("«بعد صلاة الجمعة» يكون يوم الجمعة فقط");
  if (mode === "clock" && !v("p-from")) return toast("اكتب وقت البداية، أو اختر «بدون وقت محدد»");
  const tTxt = mode === "clock" ? `من ${t12(v("p-from"))}${v("p-to") ? " إلى " + t12(v("p-to")) : ""}` : prayer;
  const time = [pRepText(rep, days, v("p-date")), tTxt].filter(Boolean).join("، ") || (v("p-note") ? "حسب الملاحظات" : "");
  const dur = DUR.find(x => x[0] === v("p-dur")) || DUR.find(x => x[0] === "180") || DUR[0]; const until = rep === "once" ? v("p-date") : addDays(v("p-date"), dur[2] - 1);
  const data = { sheikh:v("p-sheikh"), mosque:v("p-mosque"), topic:v("p-topic"), lang:v("p-lang"), date:v("p-date"), t_from:mode === "clock" ? v("p-from") : "", t_to:mode === "clock" ? v("p-to") : "",
    time_mode:mode, prayer, days, rep, ...(rep in PNTH ? { nth:PNTH[rep] } : {}), ...(rep === "once" ? { once:true } : {}), time, dur:rep === "once" ? "يوم الدرس فقط" : dur[1], head:v("p-head"), note:v("p-note") };
  if (S.form?.edit) { if (!S.admin) return toast("تعديل التصريح لرئيس القسم أو مدير النظام"); const eid = S.form.edit; const { data:er, error:ee } = await sb.from("permits").update({ data, until }).eq("id", eid).select().single(); if (ee) return writeFail(ee);
    S.permits = S.permits.map(x => x.id === eid ? er : x); closeDrawer(); toast(`تعدّل التصريح ${er.no}، نفس الرقم والباركود`); render(); return permitView(er.id); }
  { const act = S.form?.act || "", live = x => !x.revoked && (!x.until || x.until >= TODAY), nk = t => String(t || "").replace(/\s+/g, " ").trim();
    const dup = S.permits.find(x => !x.revoked && (nk(x.data?.sheikh) === nk(data.sheikh) && nk(String(x.data?.mosque || "").split("،")[0]) === nk(String(data.mosque || "").split("،")[0]) && x.data?.date === data.date && nk(x.data?.time) === nk(data.time)));
    if (dup) { if (!window.PBULK) { toast(`يوجد تصريح مطابق تماماً (${dup.no})، ما يتكرر`); render(); } return null; } }
  const { data:row, error } = await sb.from("permits").insert({ data, until, act_id:S.form?.act || "", ...(S.form?.grant ? { grant_id:S.form.grant } : {}) }).select().single(); if (error) return writeFail(error);
  S.permits = [row, ...S.permits]; if (row.grant_id) { const g = S.grants.find(x => x.id === row.grant_id); if (g) g.permit_id = row.id; } if (window.PBULK) { window.PBULK.push(row); return row; } closeDrawer(); toast(`صدر التصريح ${row.no}`); render(); permitView(row.id); };
NEWF.splice(1, 0, ["v84-pflex", "nav:permits", "إصدار التصريح والتفويض بمرونة", "في «إصدار تصريح» و«تفويض موظف»: الوقت صار اختياري: بعد صلاة معيّنة، أو بالساعة، أو بدون وقت. والتكرار: كل أسبوع، أو ثاني جمعة من كل شهر، أو بداية كل شهر، أو مرة واحدة. ومع خانة ملاحظات تظهر على التصريح.", true, "2026-10-26"]);
/* the delegation form (head of section) gets the same flexible schedule; the employee's permit inherits it */
const _grantForm83 = grantForm;
grantForm = function(preset){ _grantForm83(preset); const fw = $("#p-from")?.closest(".fld"); if (!fw || $("#p-pray")) return;
  const act = preset?.act_id ? S.byId?.get(preset.act_id) : null, cur = prayerOf(preset?.prayer || act?.time || "") || "none";
  let days = preset?.days || (act ? (act.daily ? [...PD_ALL] : act.days || []) : []);
  const g = $("#p-date").closest(".g3,.g2");
  g.insertAdjacentHTML("afterend", `<div class="p-sched">
    ${fld("p-pray", "الوقت", `<select class="f" id="p-pray"><option value="none">بدون وقت محدد</option><option value="clock">وقت محدد بالساعة</option>${PRAYERS.map(p => `<option${p === cur ? " selected" : ""}>${p}</option>`).join("")}</select>`)}
    ${fld("p-rep", "التكرار (اختياري)", `<select class="f" id="p-rep">${PREP.map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select>`)}
    <div class="fld"><label>أيام الدرس <span class="s">(اختياري — بدونها يصلح أي يوم)</span></label><div class="pd-days" id="pd-days">${PD_ALL.map(x => `<button type="button" class="pd-d${days.includes(x) ? " on" : ""}" data-pdd="${x}">${DAYS[x]}</button>`).join("")}</div></div></div>`);
  if (cur === "none") $("#p-pray").value = "none"; pTimeSync(); };
grantSave = async function(){ const v = id => $("#" + id)?.value.trim() || "", days = pdGet();
  if (!v("g-to") || !v("p-sheikh") || !v("p-mosque") || !v("p-date")) return toast("اختر الموظف وأكمل اسم الشيخ والمسجد والتاريخ");
  const mode = v("p-pray") || "none", rep = v("p-rep") || "weekly", prayer = PRAYERS.includes(mode) ? mode : "";
  const dur = DUR.find(x => x[0] === v("p-dur")) || DUR[0];
  const preset = { sheikh:v("p-sheikh"), mosque:v("p-mosque"), topic:v("p-topic"), lang:v("p-lang"), date:v("p-date"), t_from:mode === "clock" ? v("p-from") : "", t_to:mode === "clock" ? v("p-to") : "",
    time_mode:mode, prayer, rep, days, dur:dur[0], until:addDays(v("p-date"), dur[2] - 1), head:S.pAssets.head || "فايز رزقان الرشيدي", act_id:S.form?.act || "", note:v("g-note") };
  const when = [pRepText(rep, days, preset.date), mode === "clock" && preset.t_from ? `من ${t12(preset.t_from)}${preset.t_to ? " إلى " + t12(preset.t_to) : ""}` : prayer].filter(Boolean).join("، ");
  const { data:g, error } = await sb.from("permit_grants").insert({ grantee:v("g-to"), preset, source:S.form?.src || "", note:v("g-note"), expires:addDays(v("p-date"), 3) }).select().single(); if (error) return writeFail(error);
  const { data:t, error:e2 } = await sb.from("tasks").insert({ title:`إصدار تصريح درس، ${preset.sheikh}`, details:`${preset.mosque}\nتاريخ الدرس: ${fmt(preset.date)}${when ? "\nالموعد: " + when : ""}${g.note ? "\nملاحظات: " + g.note : ""}\nصلاحيتك على هذا التصريح فقط.`, assignee:g.grantee, due:preset.date, prio:"عالية", link:`#pgrant:${g.id}` }).select().single();
  if (!e2 && t) { await sb.from("permit_grants").update({ task_id:t.id }).eq("id", g.id); g.task_id = t.id; S.tasks = [t, ...S.tasks]; }
  S.grants = [g, ...S.grants.filter(x => x.id !== g.id)]; closeDrawer(); render(); toast(`فُوِّض ${pname(g.grantee)} بإصدار التصريح ووصله إشعار`); };
/* auto-fill: pick the activity (or its approval) and every field is filled — the head only reviews and issues/sends */
const pActLabel = e => `#${e.n} · ${e.lect || "—"} · ${e.mosName || ""}${e.area ? "، " + e.area : ""} · ${daysText(e) || ""} ${e.time || ""}${e.doc ? " · موافقة " + e.doc : ""}`;
function pNextDate(days){ const t = dOf(TODAY); if (!days?.length) return TODAY; for (let i = 0; i < 8; i++) { const d = new Date(t); d.setDate(t.getDate() + i); if (days.includes(d.getDay())) return addDays(TODAY, i); } return TODAY; }
function pActBox(){ const L = S.E.filter(e => !["ملغى", "مكتمل"].includes(e.status)).sort((a, b) => (b.n || 0) - (a.n || 0));
  return `<div class="p-auto">${fld("p-act", "✨ اكتب رقم الكتاب أو اختر النشاط، وتتعبّأ البيانات تلقائياً", `<input class="f" id="p-act" list="p-acts" placeholder="اكتب رقم الكتاب (مثل 2610-6416) أو اسم الشيخ أو المسجد…"><datalist id="p-acts">${L.slice(0, 600).map(e => `<option value="${esc(pActLabel(e))}">`).join("")}</datalist>`)}<span class="hint">بعد التعبئة راجع البيانات وعدّل اللي تبيه، ثم ${S.form?.kind === "permit" ? "«إصدار التصريح»" : "«تفويض وإرسال المهمة»"}.</span></div>`; }
const pMos = (name, area, gov) => [name, area, gov ? (/^محافظة/.test(gov) ? gov : "محافظة " + gov) : ""].filter((x, i, a) => x && a.indexOf(x) === i).join("، ");
function pFill(e){ if (!e) return; const set = (id, v) => { const x = $("#" + id); if (x && v != null && !x.readOnly) x.value = v; };
  const doc = docBy[e.doc], comm = S.comms.find(c => c.name === e.comm);
  set("p-sheikh", (e.lect || "").split(" / ")[0]); set("p-mosque", e.mosName ? pMos(e.mosName, e.area, e.gov) : (e.mosRaw || ""));
  set("p-lang", e.lang || (comm?.lang && !/متعدد/.test(comm.lang) ? comm.lang : "")); set("p-topic", e.title && e.title !== e.type ? e.title : (e.type || ""));
  const days = e.daily ? [...PD_ALL] : (e.days || []); document.querySelectorAll("#pd-days .pd-d").forEach(b => b.classList.toggle("on", days.includes(+b.dataset.pdd)));
  const pr = prayerOf(e.time) || letterTime(e); const s = $("#p-pray"); if (s) { s.value = pr || "none"; pTimeSync(); }
  set("p-rep", e.rep || "weekly"); set("p-date", pNextDate(days));
  const start = doc?.start || null; if (start) { const t = dOf(start); let d0 = start; for (let i = 0; i < 8 && days.length; i++) { const x = new Date(t); x.setDate(t.getDate() + i); if (days.includes(x.getDay())) { d0 = addDays(start, i); break; } } set("p-date", d0); }
  pDurDoc(doc);
  const note = [e.doc ? `موافقة ${e.doc}${doc?.end ? " سارية حتى " + fmt(doc.end) : ""}` : "", e.notes && !/⚠/.test(e.notes) ? e.notes : ""].filter(Boolean).join(" · ");
  set($("#g-note") ? "g-note" : "p-note", note);
  if (S.form) S.form.act = e.id; toast("تعبّأت البيانات من النشاط، راجعها"); }
function pDurDoc(doc){ const sel = $("#p-dur"); if (!sel) return; const from = $("#p-date")?.value || TODAY;
  if (doc?.end && doc.end >= from) { const n = Math.round((dOf(doc.end) - dOf(from)) / 864e5) + 1, k = "doc" + doc.end; if (!DUR.find(x => x[0] === k)) DUR.push([k, `حتى نهاية الموافقة ${fmt(doc.end)}`, n]);
    if (!sel.querySelector(`[value="${k}"]`)) sel.insertAdjacentHTML("beforeend", `<option value="${k}">حتى نهاية الموافقة ${fmt(doc.end)}</option>`); sel.value = k; }
  else sel.value = "180"; }
const pNo = s => { const m = String(s || "").match(/(\d{4})\s*[-ـ–]+\s*(\d{4})/); if (!m) return ""; return +m[1] < +m[2] && m[2].startsWith("26") ? `${m[2]}-${m[1]}` : `${m[1]}-${m[2]}`; };
function pPick(L, title){ $("#p-act-pick")?.remove(); $("#p-act")?.closest(".fld")?.insertAdjacentHTML("afterend", `<div id="p-act-pick" class="p-pick"><span class="s">${esc(title)}</span>${L.map(x => `<button type="button" class="chip t1" data-pfill="${esc(x.k)}">${esc(x.l)}</button>`).join("")}</div>`); }
const PPLAN = new Map();
function pFillPlan(a, w){ if (!a) return; const m = mosBy[a.mosque]; const fake = { id:"", n:0, lect:a.lect, mosName:m ? "مسجد " + m.name : "", area:m?.area || "", gov:m?.gov || "", mosRaw:a.mosRaw, days:a.days || [], daily:a.daily, time:a.time, type:a.type, title:a.title, comm:a.comm, doc:docBy[w.no] ? w.no : "", notes:"" };
  pFill(fake); if (S.form) S.form.act = ""; const nt = $("#g-note") ? "g-note" : "p-note"; const x = $("#" + nt); if (x && !x.value) x.value = `كتاب ${w.no}`; }
function pFind(v){ const val = String(v || "").trim(); if (!val) return;
  const byLabel = S.E.find(e => pActLabel(e) === val); if (byLabel) { $("#p-act-pick")?.remove(); return pFill(byLabel); }
  const n = val.match(/^#?(\d{1,4})$/); if (n) { const e = S.E.find(x => x.n === +n[1]); if (e) { $("#p-act-pick")?.remove(); return pFill(e); } }
  const no = pNo(val); if (!no) return;
  const w = S.wq.find(x => x.no === no), rel = new Set([no, w && wqParent(w)?.no, ...(w ? wqKids(w).map(k => k.no) : [])].filter(Boolean));
  const L = S.E.filter(e => rel.has(e.doc) && !["ملغى", "مكتمل"].includes(e.status));
  if (L.length === 1) { $("#p-act-pick")?.remove(); return pFill(L[0]); }
  if (L.length > 1) { pFill(L[0]); return pPick(L.map(e => ({ k:"a:" + e.id, l:`${e.lect || "—"} · ${e.mosName || ""} · ${daysText(e) || ""} ${e.time || ""}` })), `الكتاب ${no} فيه ${L.length} أنشطة، عبّيت الأول — غيّره إذا تبي غيره:`); }
  const src = w ? [wqParent(w), w].filter(Boolean) : []; for (const x of src) { let P = null; try { P = wqPlan(x); } catch (_) {} if (P?.acts?.length) { PPLAN.set(x.no, { w:x, acts:P.acts });
      if (P.acts.length === 1) { $("#p-act-pick")?.remove(); return pFillPlan(P.acts[0], x); }
      pFillPlan(P.acts[0], x); return pPick(P.acts.map((a, i) => ({ k:`w:${x.no}:${i}`, l:`${a.lect || "—"} · ${mosBy[a.mosque]?.name || a.mosRaw || ""} · ${daysText(a) || ""} ${a.time || ""}` })), `من الكتاب ${x.no} عبّيت الأول — غيّره إذا تبي غيره:`); } }
  if (w) return pFillLetter(w);
  toast("رقم الكتاب غير موجود في إنجاز"); }
function pFillLetter(w){ const t = [wqParent(w), w].filter(Boolean).map(x => x.body || "").join("\n");
  const lect = (t.match(/(?:فضيلة\s*)?(?:الشيخ|الداعية|الدكتور)\s*\/?\s*([^\n،,.(]{4,40})/) || [])[1] || "", mos = (t.match(/(مسجد\s*\/?\s*[^\n،,.(]{3,40})/) || [])[1] || "";
  const set = (id, v) => { const x = $("#" + id); if (x && v && !x.readOnly && !x.value) x.value = v; };
  set("p-sheikh", lect.trim()); set("p-mosque", mos.trim()); set("p-topic", permitTopic(w.subj) === "درس ديني" ? "" : w.subj); set($("#g-note") ? "g-note" : "p-note", `كتاب ${w.no}`);
  if (S.form) S.form.act = ""; toast(lect || mos ? "تعبّأت البيانات من نص الكتاب، راجعها وكمّل الناقص" : "الكتاب ما فيه اسم شيخ ولا مسجد واضح، كمّل يدوياً"); }
document.addEventListener("input", ev => { if (ev.target.id !== "p-act") return; clearTimeout(pFind._t); const v = ev.target.value; pFind._t = setTimeout(() => pFind(v), 350); });
document.addEventListener("click", ev => { const b = ev.target.closest("[data-pfill]"); if (!b) return; const k = b.dataset.pfill;
  if (k.startsWith("a:")) pFill(S.E.find(e => e.id === k.slice(2))); else { const [, no, i] = k.split(":"); const P = PPLAN.get(no); if (P) pFillPlan(P.acts[+i], P.w); } $("#p-act-pick")?.remove(); });
const _permitForm84 = permitForm;
permitForm = function(preset, grant){ _permitForm84(preset, grant); if (S.form?.kind !== "permit" || grant || $("#p-act")) return;
  const at = $("#p-sheikh")?.closest(".fld"); at?.insertAdjacentHTML("beforebegin", pActBox());
  const e = preset?.act_id ? S.E.find(x => x.id === preset.act_id) : null; if (e) { $("#p-act").value = pActLabel(e); pFill(e); } };
const _grantForm84 = grantForm;
grantForm = function(preset){ _grantForm84(preset); if ($("#p-act")) return; const at = $("#p-sheikh")?.closest(".fld"); at?.insertAdjacentHTML("beforebegin", pActBox());
  const e = preset?.act_id ? S.E.find(x => x.id === preset.act_id) : null; if (e) { $("#p-act").value = pActLabel(e); pFill(e); } };
NEWF.splice(1, 0, ["v85-pauto", "nav:permits", "تعبئة التصريح تلقائياً", "في «إصدار تصريح» و«تفويض موظف»: اختر النشاط (بالشيخ أو المسجد أو رقم الموافقة) فتتعبّأ كل البيانات: الشيخ، المسجد، اللغة، الأيام، الوقت، أقرب موعد، مدة الموافقة، والملاحظات. أنت فقط تراجع وترسل.", true, "2026-10-26"]);

/* approvals → permits: the head sees every approved activity without a permit, and issues it himself or delegates it in one tap (all data prefilled) */
function permitNeeds(){ const since = addDays(TODAY, -45), has = new Set(S.permits.filter(p => !p.revoked).map(p => p.act_id).filter(Boolean)), gr = new Set((S.grants || []).filter(g => !g.permit_id).map(g => g.preset?.act_id).filter(Boolean));
  return S.E.filter(e => e.doc && docBy[e.doc] && (docBy[e.doc].date || docBy[e.doc].start || "") >= since && (!docBy[e.doc].end || docBy[e.doc].end >= TODAY) && !["ملغى", "مكتمل"].includes(e.status) && !has.has(e.id) && !S.pdone?.has(e.id))
    .map(e => ({ e, delegated:gr.has(e.id) })).sort((a, b) => (docBy[b.e.doc].date || "").localeCompare(docBy[a.e.doc].date || "")); }
const pNeedBtns = (e, delegated) => `<button type="button" class="btn btn-primary" data-pact="${esc(e.id)}">إصدار تصريح</button>${S.admin && !delegated ? `<button type="button" class="btn btn-ghost" data-gact="${esc(e.id)}">تفويض موظف</button>` : ""}<button type="button" class="btn btn-ghost" data-pdone="${esc(e.id)}" title="تؤكد أن التصريح صدر أو أُرسل فيختفي من القائمة">✓ تم الإصدار</button>`;
const _vPermits85 = vPermits;
vPermits = function(){ const h = _vPermits85(); if (!canPermit()) return h; const L = permitNeeds(); if (!L.length && !S.pdone?.size) return h;
  const all = S.f.pnall === "1", rows = all ? L : L.slice(0, 8), N = d => `<bdi dir="ltr" class="num">${esc(d)}</bdi>`;
  return `<div class="panel pn-need"><div class="panel-h"><h3>موافقات وصلت وتحتاج تصريح</h3><span class="chip gold">${L.length}</span><span class="s">البيانات تتعبّأ تلقائياً، راجع وأصدر التصريح مباشرة</span></div>
    <div class="pn-grid"><div class="pn-row pn-hd"><span>الشيخ / المحاضر</span><span>المسجد</span><span>الموعد</span><span>الكتاب</span><span></span></div>${rows.map(({ e, delegated }) => `<div class="pn-row">
      <span class="pn-c pn-who" data-l="الشيخ"><b>${esc(e.lect || "—")}</b></span>
      <span class="pn-c" data-l="المسجد"><b>${esc(e.mosName || "—")}</b>${e.area || e.gov ? `<span class="s">${esc([e.area, e.gov].filter(Boolean).join("، "))}</span>` : ""}</span>
      <span class="pn-c" data-l="الموعد"><b>${esc(daysText(e) || "—")}</b>${e.time ? `<span class="s">${esc(e.time)}</span>` : ""}</span>
      <span class="pn-c" data-l="الكتاب">${N(e.doc)}</span>
      <span class="pn-act">${delegated ? `<span class="chip">مفوَّض، بانتظار الموظف</span>` : ""}<span class="pn-b">${pNeedBtns(e, delegated)}</span></span></div>`).join("")}</div>
    ${L.length > 8 ? `<div class="pn-more"><button type="button" class="btn btn-ghost" data-pnall>${all ? "عرض أقل" : `عرض الكل (${L.length})`}</button></div>` : ""}${!L.length ? `<div class="empty">لا توجد تصاريح معلّقة ✓</div>` : ""}${S.pdone?.size ? `<div class="pn-more"><button type="button" class="btn btn-ghost" data-pndone>${S.f.pndone === "1" ? "إخفاء المؤكدة" : `المؤكدة (${S.pdone.size})`}</button></div>${S.f.pndone === "1" ? pDoneList() : ""}` : ""}</div>` + h; };
/* confirmation that a permit was issued / sent: hides the approval from the list above (settings key pdone:<act id>) */
const _loadPermits63 = loadPermits;
loadPermits = async function(){ await _loadPermits63(); const { data, error } = await sb.from("settings").select("key,value").like("key", "pdone:%"); if (!error) S.pdone = new Map((data || []).map(r => [r.key.slice(6), r.value])); };
function pDoneList(){ const L = [...(S.pdone || [])].sort((a, b) => (b[1].at || "").localeCompare(a[1].at || ""));
  return `<div class="pn-grid pn-dn">${L.map(([id, v]) => { const e = S.E.find(x => x.id === id); return `<div class="pn-dr"><span><b>${esc(e?.lect || "—")}</b> <span class="s">${esc(e?.mosName || "")}</span></span><span class="chip ${v.st === "sent" ? "ok" : "gold"}">${v.st === "sent" ? "أُرسل" : "صدر"}</span><span class="s">${esc(fmt((v.at || "").slice(0, 10)))}${v.by ? " · " + esc(v.by) : ""}</span><button type="button" class="btn btn-ghost" data-pundo="${esc(id)}">↺ إرجاع للقائمة</button></div>`; }).join("")}</div>`; }
function pDoneForm(id){ const e = S.E.find(x => x.id === id); if (!e) return;
  openDrawer("تأكيد التصريح", `<div class="card pad"><b>${esc(e.lect || "—")}</b><br><span class="s">${esc([e.mosName, daysText(e), e.time].filter(Boolean).join(" · "))}</span></div>
    <p class="hint" style="margin:12px 2px">اختر الحالة، وبعدها تختفي من القائمة. تقدر ترجعها من «المؤكدة».</p>
    <button type="button" class="btn btn-done tk-open" data-pdset="issued" data-pid="${esc(id)}">📄 تم إصدار التصريح</button>
    <button type="button" class="btn btn-primary tk-open" style="margin-top:10px" data-pdset="sent" data-pid="${esc(id)}">📤 تم إرسال التصريح</button>`,
    `<button class="btn btn-ghost" data-close>إغلاق</button>`); }
async function pDoneSet(id, st){ const v = { st, at:new Date().toISOString(), by:S.me?.name || S.me?.username || "" };
  const { error } = await sb.from("settings").upsert({ key:"pdone:" + id, value:v }); if (error) return writeFail(error);
  (S.pdone = S.pdone || new Map()).set(id, v); closeDrawer(); render(); toast(st === "sent" ? "تم تأكيد إرسال التصريح، واختفت من القائمة" : "تم تأكيد إصدار التصريح، واختفت من القائمة"); }
async function pDoneUndo(id){ const { error } = await sb.from("settings").delete().eq("key", "pdone:" + id); if (error) return writeFail(error); S.pdone?.delete(id); render(); toast("رجعت للقائمة"); }
document.addEventListener("click", ev => { const t = ev.target.closest("[data-pdone],[data-pndone],[data-pdset],[data-pundo]"); if (!t) return;
  if (t.dataset.pdone) return pDoneForm(t.dataset.pdone); if (t.dataset.pndone !== undefined) { S.f.pndone = S.f.pndone === "1" ? "" : "1"; return render(); }
  if (t.dataset.pdset) return pDoneSet(t.dataset.pid, t.dataset.pdset); if (t.dataset.pundo) return pDoneUndo(t.dataset.pundo); });
document.addEventListener("click", ev => { if (!ev.target.closest("[data-pnall]")) return; S.f.pnall = S.f.pnall === "1" ? "" : "1"; render(); });
const _prio85 = priorities;
priorities = function(){ const P = _prio85(); if (canPermit()) { const n = permitNeeds().length; if (n) P.push({ w:86, k:"gold", t:`${n} موافقة وصلت وتحتاج تصريح`, s:"البيانات جاهزة، راجع وأصدر التصريح مباشرة", act:{ go:"permits", l:"إصدار التصاريح" } }); } return P.sort((a, b) => b.w - a.w); };
const _wqForm85 = wqForm;
wqForm = function(id){ _wqForm85(id); const w = wqById(id); const b = $(".drawer-b"); if (!w || !b || !canPermit()) return;
  const nos = new Set([w.no, wqParent(w)?.no, ...wqKids(w).map(k => k.no)].filter(Boolean)); const L = S.E.filter(e => nos.has(e.doc) && !["ملغى", "مكتمل"].includes(e.status));
  if (!L.length || !(w.approval || w.act_ok || wqKids(w).some(k => wqRes(k) === "ok"))) return;
  b.insertAdjacentHTML("beforeend", `<div class="rq-sec"><b>التصاريح لهذه الموافقة</b>${L.map(e => { const p = S.permits.find(x => x.act_id === e.id && !x.revoked); return `<div class="li pn-i"><span class="pn-t"><b>${esc(e.lect || "—")}</b><span class="s">${esc(e.mosName || "")} · ${esc(daysText(e) || "")} ${esc(e.time || "")}</span></span>${p ? `<span class="chip ok">صدر ${esc(p.no || "")}</span>` : `<span class="pn-b">${pNeedBtns(e)}</span>`}</div>`; }).join("")}</div>`); };
document.addEventListener("click", ev => { const t = ev.target.closest("[data-pact],[data-gact]"); if (!t) return; const id = t.dataset.pact || t.dataset.gact; closeDrawer();
  setTimeout(() => t.dataset.pact ? permitForm({ act_id:id }) : grantForm({ act_id:id }), 60); });

/* lesson date: «من» and «إلى» — the end date decides the permit validity (the duration list fills it) */
function pRangeAdd(){ const d = $("#p-date"); if (!d || $("#p-date2")) return; const f = d.closest(".fld"); const lab = f?.querySelector("label"); if (lab) lab.textContent = "تاريخ الدرس: من";
  f.insertAdjacentHTML("afterend", fld("p-date2", "إلى", `<input class="f" type="date" id="p-date2">`)); pRangeSync(); }
function pRangeSync(){ const d = $("#p-date")?.value, sel = $("#p-dur"), e = $("#p-date2"); if (!d || !e) return; const k = DUR.find(x => x[0] === sel?.value) || DUR[DUR.length - 1]; e.value = addDays(d, k[2] - 1); }
document.addEventListener("change", ev => { if (ev.target.id === "p-dur" || ev.target.id === "p-date") pRangeSync(); });
const _permitForm86 = permitForm; permitForm = function(p, g){ _permitForm86(p, g); if (S.form?.kind === "permit") { pRangeAdd(); const u = g?.preset?.until || p?.until; if (u && $("#p-date2")) $("#p-date2").value = u; } };
const _grantForm86 = grantForm; grantForm = function(p){ _grantForm86(p); pRangeAdd(); };
const _pDurDoc86 = pDurDoc; pDurDoc = function(doc){ _pDurDoc86(doc); pRangeSync(); };
const _permitIssue86 = permitIssue;
permitIssue = async function(){ const e = $("#p-date2")?.value, d = $("#p-date")?.value; if (e && d) { if (e < d) return toast("تاريخ «إلى» قبل تاريخ «من»");
    const n = Math.round((dOf(e) - dOf(d)) / 864e5) + 1, k = "rng" + e; if (!DUR.find(x => x[0] === k)) DUR.push([k, n === 1 ? "يوم الدرس فقط" : `من ${fmt(d)} إلى ${fmt(e)}`, n]);
    const sel = $("#p-dur"); if (sel && !sel.querySelector(`[value="${k}"]`)) sel.insertAdjacentHTML("beforeend", `<option value="${k}">${n === 1 ? "يوم الدرس فقط" : "حتى " + fmt(e)}</option>`); if (sel) sel.value = k; if ($("#p-rep")?.value === "once" && n > 1) $("#p-rep").value = "weekly"; }
  return _permitIssue86(); };
const _grantSave86 = grantSave;
grantSave = async function(){ const e = $("#p-date2")?.value, d = $("#p-date")?.value; if (e && d) { if (e < d) return toast("تاريخ «إلى» قبل تاريخ «من»");
    const n = Math.round((dOf(e) - dOf(d)) / 864e5) + 1, k = "rng" + e; if (!DUR.find(x => x[0] === k)) DUR.push([k, `حتى ${fmt(e)}`, n]); const sel = $("#p-dur"); if (sel && !sel.querySelector(`[value="${k}"]`)) sel.insertAdjacentHTML("beforeend", `<option value="${k}">حتى ${fmt(e)}</option>`); if (sel) sel.value = k; }
  return _grantSave86(); };
/* permit → PDF file sent on WhatsApp (no link): the PDF is prepared when the permit opens, one tap shares it */
const PPDF = new Map(), PPNG = new Map();
async function permitPdf(id){ if (PPDF.has(id)) return PPDF.get(id); const src = $("#permit-paper"); if (!src) return null;
  const job = (async () => { await loadScript("https://cdn.jsdelivr.net/npm/html2canvas-pro@1.5.8/dist/html2canvas-pro.min.js"); await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
    /* نسخة خارج الشاشة بعرض ثابت (A4)، فلا يقصّها صندوق التمرير ولا ضيق النافذة، ويخرج التصريح كاملاً */
    await Promise.all(['700 40px Amiri', '600 16px "IBM Plex Sans Arabic"', '400 16px "IBM Plex Sans Arabic"'].map(f => document.fonts.load(f, "تصريح"))).catch(() => {}); const host = document.createElement("div"); host.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;background:#fff;z-index:-1"; const el = src.cloneNode(true); el.removeAttribute("id"); el.classList.remove("editing"); el.style.cssText = "width:794px;min-height:1123px;max-width:none;margin:0;box-sizing:border-box;zoom:1"; host.appendChild(el); document.body.appendChild(host);
    const cv = await html2canvas(el, { scale:3, width:794, windowWidth:794, backgroundColor:"#ffffff", useCORS:true, logging:false, onclone:d => { d.querySelectorAll(".permit [contenteditable]").forEach(x => x.removeAttribute("contenteditable")); const st = d.createElement("style"); st.textContent = ".permit,.permit *{letter-spacing:0!important;word-spacing:normal!important;font-feature-settings:normal!important;text-rendering:auto!important}"; d.head.appendChild(st); } }).finally(() => host.remove()); const { jsPDF } = window.jspdf; const pdf = new jsPDF({ unit:"mm", format:"a4", compress:true });
    const W = 210, H = 297, m = 8, r = Math.min((W - 2 * m) / cv.width, (H - 2 * m) / cv.height), w = cv.width * r, h = cv.height * r; pdf.addImage(cv.toDataURL("image/png"), "PNG", (W - w) / 2, m, w, h); PPNG.set(id, await new Promise(ok => cv.toBlob(ok, "image/png")));
    const p = S.permits.find(x => x.id === id), d = p?.data || {}, clean = t => String(t || "").replace(/[\\/:*?"<>|\u200e\u200f\u2066-\u2069]/g, " ").replace(/\s+/g, " ").trim(), mos = clean(String(d.mosque || "").split("،")[0]), shk = clean(d.sheikh),
      ttl = ["تصريح إلقاء درس", shk && "الشيخ " + shk.replace(/^الشيخ\s+/, ""), mos].filter(Boolean).join(" - ").slice(0, 120), u16 = "\xFE\xFF" + [...ttl].map(c => { const k = c.charCodeAt(0); return String.fromCharCode(k >> 8, k & 255); }).join("");
    /* اسم الملف لاتيني فقط: الآيفون/واتساب يكسرون ترميز الأسماء العربية (Ø§Ù…) عند المشاركة من المتصفح، والعنوان العربي في داخل الملف وفي الرسالة */
    const fname = `Tasreeh-${String(p?.no || id).replace(/^JL-/, "").replace(/[^A-Za-z0-9-]/g, "")}.pdf`;
    pdf.setProperties({ title:u16 }); return new File([pdf.output("blob")], fname, { type:"application/pdf" }); })();
  PPDF.set(id, job); job.catch(() => PPDF.delete(id)); return job; }
const _permitView87 = permitView;
permitView = async function(id){ await _permitView87(id); const b = $(`.drawer-f [data-pwa="${id}"]`); if (b) { b.innerHTML = `${icon("i-wa")} إرسال PDF واتساب`; b.classList.add("btn-ok"); } setTimeout(() => permitPdf(id).catch(() => {}), 300); };
/* بطاقة عائمة: ملف PDF قابل للسحب مباشرة إلى محادثة واتساب (Chrome يمرّر الملف للتطبيق عبر DownloadURL) */
function pdfChip(f, url){ document.getElementById("pdf-chip")?.remove(); const c = document.createElement("div"); c.id = "pdf-chip";
  c.innerHTML = `<div class="pc-f" draggable="true" title="اسحب إلى المحادثة">${icon("i-doc")}<b dir="ltr">${esc(f.name)}</b></div><span>اسحب الملف إلى محادثة واتساب، أو الصق (⌘V) صورة التصريح المنسوخة</span><button type="button" aria-label="إغلاق">×</button>`;
  const close = () => { c.remove(); URL.revokeObjectURL(url); };
  c.querySelector(".pc-f").addEventListener("dragstart", e => { e.dataTransfer.effectAllowed = "copy"; e.dataTransfer.setData("DownloadURL", `application/pdf:${f.name}:${url}`); try { e.dataTransfer.items.add(f); } catch (_) {} });
  c.querySelector("button").addEventListener("click", close); document.body.appendChild(c); setTimeout(close, 180000); }
document.addEventListener("click", async ev => { const b = ev.target.closest("[data-pwa]"); if (!b) return; ev.preventDefault(); ev.stopImmediatePropagation();
  const id = b.dataset.pwa, p = S.permits.find(x => x.id === id); if (!p) return; const old = b.innerHTML; b.disabled = true; b.textContent = "يجهّز PDF…";
  /* قائمة المشاركة في ماك وويندوز لا تعرض واتساب إلا إن وُجد له امتداد مشاركة، لذا تُستعمل على الجوال واللوحي فقط؛ وعلى الكمبيوتر يُنزَّل الملف ويُفتح تطبيق واتساب نفسه (whatsapp://) برسالة جاهزة */
  const touch = matchMedia("(pointer:coarse)").matches || /iPhone|iPad|Android/i.test(navigator.userAgent);
  /* على الكمبيوتر: نسخ التصريح كاملاً كصورة إلى الحافظة فوراً (Safari يشترط أن يبدأ النسخ داخل نفس الضغطة)، فيكفي لصقه في المحادثة */
  let copied = Promise.resolve(false);
  if (!touch && window.ClipboardItem && navigator.clipboard?.write) copied = navigator.clipboard.write([new ClipboardItem({ "image/png": permitPdf(id).then(() => PPNG.get(id)) })]).then(() => true, () => false);
  try { const f = await permitPdf(id); if (!f) throw new Error("no pdf"); const txt = `تصريح إلقاء درس رقم \u2066${p.no}\u2069\nالشيخ: ${p.data?.sheikh || ""}\nالمسجد: ${p.data?.mosque || ""}${p.data?.time ? "\nالموعد: " + p.data.time : ""}`;
    if (touch && navigator.canShare && navigator.canShare({ files:[f] })) { try { await navigator.share({ files:[f], title:"تصريح إلقاء درس", text:txt }); } catch (_) {} }
    else { const bu = URL.createObjectURL(f), a = document.createElement("a"); a.href = bu; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); pdfChip(f, bu);
      toast(await copied ? "نُسخ التصريح كاملاً: افتح المحادثة والصقه (⌘V أو Ctrl+V)، وملف PDF نزل أيضاً" : "نزل ملف PDF في التنزيلات، اسحبه إلى محادثة واتساب"); if (!touch) { const w = document.createElement("a"); w.href = "whatsapp://send?text=" + encodeURIComponent(txt); document.body.appendChild(w); w.click(); w.remove(); } } }
  catch (e) { toast("تعذّر تجهيز PDF، استخدم «طباعة / PDF»"); }
  finally { b.disabled = false; b.innerHTML = old; } }, true);
/* the head can always issue the permit himself, wherever «تفويض» appears */
const _grantsPanel88 = grantsPanel;
grantsPanel = function(){ let h = _grantsPanel88(); if (!S.admin) return h;
  for (const g of S.grants.filter(gOpen).filter(g => g.grantee !== S.me?.id)) h = h.replace(`<button type="button" class="btn btn-ghost bad-t" data-pgrevoke="${g.id}">`, `<button type="button" class="btn btn-primary" data-pgself="${g.id}">إصدار بنفسي</button><button type="button" class="btn btn-ghost bad-t" data-pgrevoke="${g.id}">`);
  return h; };
const _wqForm88 = wqForm;
wqForm = function(id){ _wqForm88(id); const b = $(".drawer-f [data-pgfrom]"); if (!b || !canPermit() || $(".drawer-f [data-pwqissue]")) return;
  b.insertAdjacentHTML("beforebegin", `<button class="btn btn-primary" type="button" data-pwqissue="${esc(id)}">إصدار تصريح</button>`); };
document.addEventListener("click", ev => { const t = ev.target.closest("[data-pgself],[data-pwqissue]"); if (!t) return;
  if (t.dataset.pgself) { const g = S.grants.find(x => x.id === t.dataset.pgself); if (!g) return; closeDrawer(); setTimeout(() => { permitForm({ ...(g.preset || {}) }); if (S.form) S.form.grant = g.id; const u = g.preset?.until; if (u && $("#p-date2")) $("#p-date2").value = u; }, 60); return; }
  const w = wqById(t.dataset.pwqissue); if (!w) return; closeDrawer(); setTimeout(() => { permitForm({}); const i = $("#p-act"); if (i) { i.value = w.no; pFind(w.no); } }, 60); });
