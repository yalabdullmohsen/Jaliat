/* ================= v101: استبدال خطيب الجمعة بضغطة (طلب يوسف «سهل عملية استبدال الخطيب بخطيب احتياط او بديل») ================= */
/* الجداول: khatib_swaps (البديل وسببه لكل مسجد وجمعة) وkhatib_reserve (احتياط كل جالية)، في 2026-11-25_khatib_swaps.sql.
   الاستبدال لا يكتب في سجل الخطب والمكافآت؛ يُسجَّل الإلقاء الفعلي بعد الجمعة كما هو. */
const KS = { swaps:new Map(), reserve:[], loaded:false, ok:true };
const KS_REASONS = ["مرض", "سفر", "اعتذار", "غيره"];
async function ksLoad(){ const [a, b] = await Promise.all([sb.from("khatib_swaps").select("*").gte("fri", addDays(TODAY, -120)), sb.from("khatib_reserve").select("*").order("comm")]);
  if (a.error || b.error) { KS.ok = false; console.info("الاستبدال يحتاج تطبيق الترحيل:", (a.error || b.error).message); }
  KS.swaps = new Map((a.data || []).map(r => [r.fri + "|" + r.kh_id, r])); KS.reserve = b.data || []; KS.loaded = true; }
/* الخطيب في الجمعة: الاستبدال يغلب المخطَّط، وسجل الإلقاء الفعلي يغلب الاثنين */
const _fsCell101 = fsCell;
fsCell = function(fri, id, k){ const c = _fsCell101(fri, id, k), sw = KS.swaps.get(fri + "|" + id);
  if (!sw || SR.rows.has(fri + "|" + id)) return c; return sw.sub_name ? { name:sw.sub_name, st:"swap", who:"other", sw } : { name:"", st:"gap", who:"none", sw }; };
FS_ST.swap = ["مُستبدَل", "gold"];
/* البدلاء المقترحون: احتياط المسجد، ثم احتياط الجالية، ثم خطباء الجالية نفسها، ثم الأقرب منطقة؛ بلا من عنده خطبة في الجمعة نفسها */
function ksCandidates(fri, id){ const k = S.khatibs.get(id), busy = new Set(), out = [], seen = new Set();
  for (const [oid, ok] of S.khatibs) { if (oid === id) continue; const n = fsCell(fri, oid, ok).name; if (n) busy.add(fsName(n)); }
  const cur = fsName(fsCell(fri, id, k).name || k.pri);
  /* من اعتذر أو استُبدل في الجمعة نفسها لا يُقترح بديلًا لمسجد آخر */
  for (const sw of KS.swaps.values()) if (sw.fri === fri && sw.orig_name) busy.add(fsName(sw.orig_name));
  const add = (name, phone, why, rank) => { const n = fsName(name); if (!n || n === cur || busy.has(n) || seen.has(n)) return; seen.add(n); out.push({ name, phone:phone || "", why, rank }); };
  if (k.bak) add(k.bak, k.bph, "احتياط هذا المسجد", 0);
  KS.reserve.filter(r => r.comm === k.comm).forEach(r => add(r.name, r.phone, "احتياط الجالية", 1));
  for (const [, o] of S.khatibs) if (o.comm === k.comm) { add(o.pri, o.pph, `يخطب بلغة الجالية في ${o.mosque || ""}`, 2); add(o.bak, o.bph, `احتياط بلغة الجالية في ${o.mosque || ""}`, 2); }
  for (const [, o] of S.khatibs) { const r = o.area && o.area === k.area ? 3 : o.gov && o.gov === k.gov ? 4 : 5; if (r < 5) { add(o.pri, o.pph, `قريب: ${o.area || o.gov}`, r); add(o.bak, o.bph, `قريب: ${o.area || o.gov}`, r); } }
  return out.sort((a, b) => a.rank - b.rank); }
function ksForm(fri, id){ if (!KS.ok) return toast("الاستبدال يحتاج تطبيق ترحيل khatib_swaps أولًا"); const k = S.khatibs.get(id); if (!k) return; const C = ksCandidates(fri, id), cur = fsCell(fri, id, k).name || k.pri || "—";
  S.form = { kind:"kswap", fri, id };
  openDrawer(`استبدال خطيب ${k.mosque || ""}`, `<div class="check"><b>الجمعة ${fmt(fri)} · الخطيب الحالي: ${esc(cur)}</b><span>${esc([k.comm, k.area, k.gov].filter(Boolean).join(" · "))}</span></div>
    ${fld("ks-r", "السبب", `<div class="seg ks-r">${KS_REASONS.map((r, i) => `<button type="button" class="${i === 2 ? "on" : ""}" data-ksr="${r}">${r}</button>`).join("")}</div>`)}
    <h4 class="pa-h">بدلاء مقترحون <span class="chip">${C.length}</span></h4><div class="pa-l ks-l">${C.slice(0, 12).map((c, i) => `<button type="button" class="li ks-c" data-ksc="${i}"><span><b>${esc(c.name)}</b>${c.phone ? ` · <bdi dir="ltr">${esc(c.phone)}</bdi>` : ""}<br><span class="s">${esc(c.why)}</span></span></button>`).join("") || `<div class="empty">لا بديل متاح في هذه الجمعة؛ أضف احتياطًا للجالية أو اكتب الاسم.</div>`}</div>
    ${fld("ks-n", "أو بديل آخر", `<div class="g2"><input class="f" id="ks-n" placeholder="اسم الخطيب"><input class="f" id="ks-p" placeholder="هاتفه" dir="ltr"></div>`)}
    <span class="hint">الضغط على بديل يستبدل فورًا. «بلا بديل الآن» يسجّل الاعتذار ويُبقي الجمعة في التنبيه العاجل.</span>`,
    `<button class="btn btn-primary" data-ksgo>استبدال بالاسم المكتوب</button><button class="btn" data-ksnone>بلا بديل الآن</button><button class="btn btn-ghost" data-close>إلغاء</button>`);
  S.form.cands = C; }
async function ksSave(sub, phone){ const f = S.form; if (f?.kind !== "kswap") return; const k = S.khatibs.get(f.id), reason = $(".ks-r .on")?.dataset.ksr || "اعتذار";
  const row = { fri:f.fri, kh_id:f.id, orig_name:k.pri || "", sub_name:sub || "", sub_phone:phone || "", reason };
  const { data, error } = await sb.from("khatib_swaps").upsert(row, { onConflict:"fri,kh_id" }).select().single(); if (error) return writeFail(error);
  KS.swaps.set(f.fri + "|" + f.id, data || row); closeDrawer(); render(); if (sub) ksAfter(f.fri, f.id, sub, phone, reason); else toast("سُجّل الاعتذار، والجمعة في التنبيه العاجل حتى يُكلَّف بديل"); }
/* بعد الاستبدال: رسالتان جاهزتان (البديل، منسق الجالية)، ووثيقة التكليف تُحدَّث تلقائيًا لأنها تقرأ الخطيب من fsCell */
function ksAfter(fri, id, sub, phone, reason){ const k = S.khatibs.get(id), co = coFor(k.comm)[0];
  const toSub = `السلام عليكم ورحمة الله وبركاته\nالشيخ الفاضل / ${sub}\n\nنكلّفكم بإلقاء خطبة الجمعة ${fmt(fri)} في ${k.mosque || "المسجد"}${k.area ? " (" + k.area + ")" : ""}${k.comm ? " لجالية " + k.comm : ""}، بدل الخطيب ${k.pri || ""}.\nنرجو التأكيد.\nجزاكم الله خيرًا.`;
  const toCo = co ? `السلام عليكم ورحمة الله وبركاته\nالأخ الفاضل / ${co.name}\n\nتغيير خطيب الجمعة ${fmt(fri)} في ${k.mosque || "المسجد"}: الخطيب ${sub} بدل ${k.pri || ""} (${reason}).` : "";
  openDrawer("تم الاستبدال", `<div class="check ok"><b>${esc(sub)} بدل ${esc(k.pri || "")} · الجمعة ${fmt(fri)}</b><span>السبب: ${esc(reason)}. تبقى الخطبة في سجل ${esc(k.pri || "الخطيب")} ملغاة بهذا السبب.</span></div>`,
    `${phone ? `<button class="btn btn-primary" data-kswa="sub">${icon("i-wa")} رسالة البديل</button>` : ""}${co?.phone ? `<button class="btn" data-kswa="co">${icon("i-wa")} رسالة المنسق</button>` : ""}<button class="btn" data-khl="${esc(id)}" data-fri="${fri}">${icon("i-doc")} وثيقة التكليف</button><button class="btn btn-ghost" data-close>إغلاق</button>`);
  S.form = { kind:"kswapdone", msgs:{ sub:[phone, toSub], co:[co?.phone, toCo] } }; }
document.addEventListener("click", ev => { const t = ev.target.closest("[data-ksopen],[data-ksr],[data-ksc],[data-ksgo],[data-ksnone],[data-kswa],[data-ksrdel],[data-ksradd]"); if (!t) return; const D = t.dataset;
  if (D.ksopen) { const [fri, id] = D.ksopen.split("|"); return ksForm(fri, id); }
  if (D.ksr) { document.querySelectorAll(".ks-r button").forEach(b => b.classList.toggle("on", b === t)); return; }
  if (D.ksc !== undefined) { const c = S.form?.cands?.[+D.ksc]; if (c) ksSave(c.name, c.phone); return; }
  if (D.ksgo !== undefined) { const n = $("#ks-n")?.value.trim(); if (!n) { $("#ks-n")?.focus(); return toast("اكتب اسم البديل أو اختر من المقترحين"); } return ksSave(n, $("#ks-p")?.value.trim()); }
  if (D.ksnone !== undefined) return ksSave("", "");
  if (D.kswa) { const m = S.form?.msgs?.[D.kswa]; if (m?.[0]) waOpen(m[0], m[1]); return; }
  if (D.ksrdel) return ksResDel(D.ksrdel); if (D.ksradd !== undefined) return ksResAdd(); });
/* زر «استبدال الخطيب» في كل صف من جدول الجمعة */
const _afterRender101 = afterRender;
afterRender = function(v){ _afterRender101(v); if (v !== "fsched" && v !== "khatibs") return; if (!KS.loaded) { ksLoad().then(() => { if (["fsched", "khatibs"].includes(S.view)) render(); }); return; }
  if (v !== "fsched" || !S.canWrite) return;
  document.querySelectorAll(".fs-tb tbody tr[data-khid]").forEach(tr => { const a = tr.querySelector(".fs-a"); if (!a || a.querySelector("[data-ksopen]")) return;
    const sw = KS.swaps.get(tr.dataset.fri + "|" + tr.dataset.khid);
    a.insertAdjacentHTML("afterbegin", `<button type="button" class="btn btn-ghost ks-b" data-ksopen="${tr.dataset.fri}|${esc(tr.dataset.khid)}">استبدال الخطيب</button>${sw ? `<span class="chip gold" title="${esc(sw.orig_name)}">${esc(sw.reason)}</span>` : ""}`); }); };

/* قائمة خطباء الاحتياط لكل جالية في تبويب «الخطباء» */
const _vKhatibs101 = vKhatibs;
vKhatibs = function(){ const h = _vKhatibs101(); if (!KS.loaded || !KS.ok) return h; const by = {}; KS.reserve.forEach(r => (by[r.comm] = by[r.comm] || []).push(r));
  return h + `<div class="panel ks-res"><div class="panel-h"><h3>خطباء الاحتياط لكل لغة</h3><span class="s">يُقترحون أولًا عند استبدال خطيب من الجالية نفسها</span></div>
    ${S.canWrite ? `<div class="g3 ks-add"><select class="f" id="ksr-c">${opts(commNames, "", "الجالية")}</select><input class="f" id="ksr-n" placeholder="اسم الخطيب"><input class="f" id="ksr-p" placeholder="هاتفه" dir="ltr"><button type="button" class="btn btn-primary" data-ksradd>إضافة</button></div>` : ""}
    <div class="pv-list">${Object.keys(by).sort((a, b) => a.localeCompare(b, "ar")).map(c => `<div class="pv-r"><div class="pv-n"><b>${esc(c)}</b><span>${by[c].map(r => `${esc(r.name)}${r.phone ? ` · <bdi dir="ltr">${esc(r.phone)}</bdi>` : ""}${S.canWrite ? ` <button type="button" class="btn btn-ghost ks-x" data-ksrdel="${esc(r.id)}" title="حذف من الاحتياط">✕</button>` : ""}`).join("، ")}</span></div></div>`).join("") || `<div class="empty">لا احتياط بعد. أضف لكل جالية خطيبًا أو أكثر.</div>`}</div></div>`; };
async function ksResAdd(){ const comm = $("#ksr-c")?.value, name = $("#ksr-n")?.value.trim(), phone = $("#ksr-p")?.value.trim() || "";
  if (!comm || !name) return toast(!comm ? "اختر الجالية" : "اكتب اسم الخطيب");
  const { data, error } = await sb.from("khatib_reserve").insert({ comm, name, phone }).select().single(); if (error) return writeFail(error); KS.reserve.push(data); render(); toast("أُضيف إلى الاحتياط"); }
async function ksResDel(id){ const { error } = await sb.from("khatib_reserve").delete().eq("id", id); if (error) return writeFail(error); KS.reserve = KS.reserve.filter(r => r.id !== id); render(); toast("حُذف من الاحتياط"); }

/* تنبيه عاجل: جمعة قادمة (خلال 7 أيام) فيها مسجد بلا خطيب بعد اعتذار */
const _prio101 = priorities;
priorities = function(){ const P = _prio101(); if (!S.canWrite) return P; const next = fsFris()[0]; if (!next || diffDays(TODAY, next) > 7) return P;
  const L = [...KS.swaps.values()].filter(s => s.fri === next && !s.sub_name && !SR.rows.has(s.fri + "|" + s.kh_id));
  if (L.length) P.push({ w:99, k:"bad", t:`عاجل: ${L.length} مسجد بلا خطيب في جمعة ${fmt(next)} بعد اعتذار`, s:L.map(s => S.khatibs.get(s.kh_id)?.mosque || "").filter(Boolean).join("، "), act:{ go:"fsched", l:"استبدال الآن" } });
  return P.sort((a, b) => b.w - a.w); };
const _boot9101 = boot9; boot9 = function(){ _boot9101(); ksLoad().then(() => { if ($("#drawer").hidden) render(); }); };
/* ملف الخطيب: خطبه الملغاة بالاستبدال وسببها تبقى في سجله */
const _personActs101 = personActs;
personActs = function(o){ _personActs101(o); const me = lectNames(o.name || ""), L = [...KS.swaps.values()].filter(s => sameLect(lectNames(s.orig_name || ""), me)).sort((a, b) => b.fri.localeCompare(a.fri));
  if (L.length) $("#drawer .drawer-b")?.insertAdjacentHTML("beforeend", `<h4 class="pa-h">خطب أُلغيت بالاستبدال <span class="chip">${L.length}</span></h4><div class="pa-l">${L.map(s => `<div class="li">${fmt(s.fri)} · ${esc(S.khatibs.get(s.kh_id)?.mosque || "")} · ${esc(s.reason)}${s.sub_name ? ` · البديل ${esc(s.sub_name)}` : " · بلا بديل"}</div>`).join("")}</div>`); };
