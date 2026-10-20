/* ================= v11: hall bookings ================= */
TITLES.halls = "حجز القاعات";
const HALLS = [
  { id:"thunayan", venue:"مركز ثنيان الغانم", name:"المسرح", c:"t1" },
  { id:"gm-women", venue:"المسجد الكبير", name:"مسرح النساء", c:"t2" },
  { id:"gm-hall", venue:"المسجد الكبير", name:"القاعة الكبرى", c:"gold" },
  { id:"gm-admin", venue:"المسجد الكبير", name:"مسرح الإدارة", c:"t3" }];
const hallBy = Object.fromEntries(HALLS.map(h => [h.id, h]));
const hallName = id => { const h = hallBy[id]; return h ? `${h.name}، ${h.venue}` : id; };
const BK_TYPES = ["محاضرة", "دورة", "ندوة", "حفل", "اجتماع", "مسابقة", "أخرى"];
const BK_EQ = ["نظام صوت", "بروجكتر وشاشة", "ترجمة فورية", "ضيافة", "تصوير", "منصة"];
S.bks = [];
const hm = t => { const [h, m] = String(t || "0:0").slice(0, 5).split(":").map(Number); return h * 60 + (m || 0); };
const t12 = t => { if (!t) return ""; let [h, m] = String(t).slice(0, 5).split(":").map(Number); const ap = h < 12 ? "ص" : "م"; h = h % 12 || 12; return `${h}:${pad(m || 0)} ${ap}`; };
const bkSpan = b => `${t12(b.t_from)}، ${t12(b.t_to)}`;
async function loadBks(){ const { data, error } = await sb.from("bookings").select("*").gte("day", addDays(TODAY, -120)).order("day").order("t_from"); if (!error) S.bks = data || []; }
let bkChannel = null;
function liveBks(){
  if (bkChannel) sb.removeChannel(bkChannel);
  bkChannel = sb.channel("bk").on("postgres_changes", { event:"*", schema:"public", table:"bookings" }, p => {
    S.bks = p.eventType === "DELETE" ? S.bks.filter(x => x.id !== p.old?.id) : [...S.bks.filter(x => x.id !== p.new.id), p.new].sort((a, b) => (a.day + a.t_from).localeCompare(b.day + b.t_from));
    if (p.eventType === "INSERT" && p.new.created_by !== S.me?.id) toast(`حجز جديد: ${hallName(p.new.hall)} ${fmt(p.new.day)}`);
    bellRefresh(); if (S.view === "halls" && $("#drawer").hidden) render();
  }).subscribe();
}
const bkLive = () => S.bks.filter(b => b.status !== "ملغى");
function bkClash(hall, day, from, to, skipId){ return bkLive().filter(b => b.id !== skipId && b.hall === hall && b.day === day && hm(from) < hm(b.t_to) && hm(b.t_from) < hm(to)); }
function bkFree(hall, day, len){ /* free windows 8:00–22:00 for a hall on a day */
  const busy = bkLive().filter(b => b.hall === hall && b.day === day).map(b => [hm(b.t_from), hm(b.t_to)]).sort((a, b) => a[0] - b[0]);
  const out = []; let cur = 8 * 60; for (const [a, z] of busy) { if (a - cur >= (len || 60)) out.push([cur, a]); cur = Math.max(cur, z); } if (22 * 60 - cur >= (len || 60)) out.push([cur, 22 * 60]);
  const f = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; return out.map(([a, z]) => [f(a), f(z)]);
}

/* ---------- page ---------- */
function vHalls(){
  const s = weekStart(S.f.hwo), days = [...Array(7)].map((_, i) => { const d = new Date(s); d.setDate(s.getDate() + i); return isoOf(d); });
  const nowM = new Date().getHours() * 60 + new Date().getMinutes();
  const card = h => { const today = bkLive().filter(b => b.hall === h.id && b.day === TODAY); const cur = today.find(b => hm(b.t_from) <= nowM && nowM < hm(b.t_to)); const next = today.find(b => hm(b.t_from) > nowM); const wk = bkLive().filter(b => b.hall === h.id && b.day >= days[0] && b.day <= days[6]).length;
    return `<button type="button" class="hall-c ${h.c}" data-bknew="${h.id}"><span class="s">${esc(h.venue)}</span><b>${esc(h.name)}</b>
      <span class="hall-st ${cur ? "busy" : ""}">${cur ? `محجوز الآن حتى ${t12(cur.t_to)}` : next ? `متاح، الحجز القادم ${t12(next.t_from)}` : "متاح اليوم"}</span><span class="s">${wk} حجز هذا الأسبوع</span></button>`; };
  const venues = [...new Set(HALLS.map(h => h.venue))];
  const up = bkLive().filter(b => b.day >= TODAY && b.day <= addDays(TODAY, 30));
  return `<div class="hall-cards">${HALLS.map(card).join("")}</div>
  <div class="toolbar"><div class="seg"><button type="button" data-hwo="-1">‹ السابق</button><button type="button" data-hwo="0" class="${!S.f.hwo ? "on" : ""}">هذا الأسبوع</button><button type="button" data-hwo="1">التالي ›</button></div>
    <span class="count">من ${fmt(days[0])} إلى ${fmt(days[6])}</span>
    ${S.canWrite ? `<button class="btn btn-primary" type="button" data-bknew="">${icon("i-plus")} حجز جديد</button>` : ""}<button class="btn" type="button" data-bkprint>${icon("i-down")} طباعة</button></div>
  <div class="panel print-area" id="bk-sheet"><div class="panel-b">
    <div class="sr-h only-print"><div><b>وزارة الأوقاف والشؤون الإسلامية</b><span>${DEPT}</span></div><div style="text-align:end"><h2>جدول حجز القاعات</h2><span>من ${fmt(days[0])} إلى ${fmt(days[6])} م</span></div></div>
    <div class="table-wrap"><table class="bk-grid"><thead><tr><th>القاعة</th>${days.map(d => `<th class="${d === TODAY ? "today" : ""}">${DAYS[dOf(d).getDay()]}<br><span class="num">${fmt(d).slice(0, 5)}</span></th>`).join("")}</tr></thead>
    <tbody>${venues.map(v => `<tr class="bk-v"><td colspan="8">${esc(v)}</td></tr>` + HALLS.filter(h => h.venue === v).map(h => `<tr><th class="${h.c}">${esc(h.name)}</th>${days.map(d => { const L = bkLive().filter(b => b.hall === h.id && b.day === d);
      return `<td class="${d === TODAY ? "today" : ""}${d < TODAY ? " past" : ""}">${L.map(b => `<button type="button" class="bk-chip ${h.c}${b.status === "مبدئي" ? " tent" : ""}" data-bk="${b.id}"><b class="num">${bkSpan(b)}</b><span>${esc(b.data?.title || b.data?.comm || "حجز")}</span></button>`).join("")}${S.canWrite && d >= TODAY ? `<button type="button" class="bk-add" data-bknew="${h.id}" data-bkday="${d}" aria-label="حجز">+</button>` : ""}</td>`; }).join("")}</tr>`).join("")).join("")}</tbody></table></div>
  </div></div>
  <div class="panel" style="margin-top:16px"><div class="panel-h"><h3>الحجوزات القادمة (30 يوماً)</h3><span class="chip">${up.length}</span></div><div class="list">${up.map(b => `<button class="li" data-bk="${b.id}"><span><span class="t">${esc(b.data?.title || "حجز")}، ${esc(hallName(b.hall))}</span><br><span class="s">${esc([DAYS[dOf(b.day).getDay()] + " " + fmt(b.day), bkSpan(b), b.data?.comm, b.data?.coord].filter(Boolean).join(" · "))}</span></span>${b.status === "مبدئي" ? `<span class="chip warn">مبدئي</span>` : `<span class="chip ok">مؤكد</span>`}</button>`).join("") || `<div class="empty">لا توجد حجوزات قادمة</div>`}</div></div>`;
}

/* ---------- form ---------- */
function bkForm(id, preset){
  const b = id ? S.bks.find(x => x.id === id) : null; const d = { ...(b?.data || {}), ...(preset?.data || {}) };
  const v = { hall:b?.hall || preset?.hall || HALLS[0].id, day:b?.day || preset?.day || TODAY, t_from:(b?.t_from || preset?.t_from || "18:00").slice(0, 5), t_to:(b?.t_to || preset?.t_to || "20:00").slice(0, 5), status:b?.status || "مؤكد" };
  S.form = { kind:"bk", id:id || null };
  const ro = S.canWrite ? "" : " disabled";
  const opt = `${[...new Set(HALLS.map(h => h.venue))].map(vn => `<optgroup label="${esc(vn)}">${HALLS.filter(h => h.venue === vn).map(h => `<option value="${h.id}"${h.id === v.hall ? " selected" : ""}>${esc(h.name)}</option>`).join("")}</optgroup>`).join("")}`;
  openDrawer(id ? "تفاصيل الحجز" : "حجز قاعة", `
    <div class="g2">${fld("bk-hall", "القاعة", `<select class="f" id="bk-hall"${ro}>${opt}</select>`)}${fld("bk-day", "التاريخ", `<input class="f" type="date" id="bk-day" value="${v.day}"${ro}>`)}</div>
    <div class="g3">${fld("bk-from", "من الساعة", `<input class="f" type="time" id="bk-from" value="${v.t_from}" step="900"${ro}>`)}${fld("bk-to", "إلى الساعة", `<input class="f" type="time" id="bk-to" value="${v.t_to}" step="900"${ro}>`)}${fld("bk-st", "الحالة", sel("bk-st", ["مؤكد", "مبدئي", "ملغى"], v.status).replace("<option value=\"\">—</option>", ""))}</div>
    <div id="bk-av"></div>
    ${fld("bk-title", "عنوان الفعالية", `<input class="f" id="bk-title" value="${esc(d.title || "")}" placeholder="مثال: محاضرة للجالية الفلبينية"${ro}>`)}
    <div class="g2">${fld("bk-type", "نوع الفعالية", sel("bk-type", BK_TYPES, d.type))}${fld("bk-comm", "الجالية", sel("bk-comm", commNames, d.comm))}</div>
    <div class="g2">${fld("bk-org", "الجهة المنظمة", `<input class="f" id="bk-org" value="${esc(d.org || "")}"${ro}>`)}${fld("bk-cnt", "العدد المتوقع", `<input class="f num" type="number" min="0" id="bk-cnt" value="${esc(d.count || "")}"${ro}>`)}</div>
    <div class="g2">${fld("bk-coord", "المسؤول / المنسق", `<input class="f" id="bk-coord" value="${esc(d.coord || "")}" list="bk-cl"${ro}><datalist id="bk-cl">${S.coords.map(c => `<option value="${esc(c.name)}">${esc(c.comm || "")}</option>`).join("")}</datalist>`)}${fld("bk-phone", "الهاتف", `<input class="f num" dir="ltr" id="bk-phone" value="${esc(d.phone || "")}"${ro}>`)}</div>
    <div class="fld"><label>التجهيزات المطلوبة</label><div class="bk-eq">${BK_EQ.map(e => `<label><input type="checkbox" value="${esc(e)}"${(d.equip || []).includes(e) ? " checked" : ""}${ro}> ${esc(e)}</label>`).join("")}</div></div>
    ${!id ? fld("bk-rep", "تكرار أسبوعي", `<select class="f" id="bk-rep">${[1, 2, 3, 4, 6, 8, 12].map(n => `<option value="${n}">${n === 1 ? "مرة واحدة" : `${n} أسابيع (نفس اليوم والوقت)`}</option>`).join("")}</select>`) : ""}
    ${fld("bk-notes", "ملاحظات", `<textarea class="f" id="bk-notes" rows="2"${ro}>${esc(d.notes || "")}</textarea>`)}
    ${id && b?.created_by ? `<span class="hint">أُنشئ بواسطة ${esc(whoName(b.created_by))}، ${fmtTime(b.created_at)}</span>` : ""}
    ${id ? `<div class="rq-tools"><button type="button" class="btn" data-bkwa>${icon("i-wa")} واتساب تأكيد الحجز</button>${S.canWrite ? `<button type="button" class="btn" data-bkdup>نسخ كحجز جديد</button><button type="button" class="btn btn-ghost bad-t" data-bkdel>حذف</button>` : ""}</div>` : ""}`,
    S.canWrite ? `<button class="btn btn-primary" data-bksave>${id ? "حفظ" : "تأكيد الحجز"}</button><button class="btn btn-ghost" data-close>إلغاء</button>` : `<button class="btn btn-ghost" data-close>إغلاق</button>`);
  bkAvail();
}
function bkRead(){
  const v = id => $("#" + id)?.value.trim() || "";
  return { hall:v("bk-hall"), day:v("bk-day"), t_from:v("bk-from"), t_to:v("bk-to"), status:v("bk-st") || "مؤكد",
    data:{ title:v("bk-title"), type:v("bk-type"), comm:v("bk-comm"), org:v("bk-org"), count:v("bk-cnt"), coord:v("bk-coord"), phone:v("bk-phone"), notes:v("bk-notes"), equip:[...document.querySelectorAll(".bk-eq input:checked")].map(x => x.value) } };
}
function bkAvail(){
  const box = $("#bk-av"); if (!box) return; const f = bkRead();
  if (!f.day || !f.t_from || !f.t_to) return box.innerHTML = "";
  if (hm(f.t_to) <= hm(f.t_from)) return box.innerHTML = `<div class="check bad"><b>الوقت غير صحيح</b><span>وقت النهاية يجب أن يكون بعد وقت البداية</span></div>`;
  const c = bkClash(f.hall, f.day, f.t_from, f.t_to, S.form?.id);
  const len = hm(f.t_to) - hm(f.t_from);
  if (!c.length) return box.innerHTML = `<div class="check ok"><b>القاعة متاحة ✓</b><span>${esc(hallName(f.hall))}، ${DAYS[dOf(f.day).getDay()]} ${fmt(f.day)}، ${t12(f.t_from)} إلى ${t12(f.t_to)}</span></div>`;
  const free = bkFree(f.hall, f.day, len);
  const other = HALLS.filter(h => h.id !== f.hall && !bkClash(h.id, f.day, f.t_from, f.t_to).length);
  box.innerHTML = `<div class="check bad"><b>القاعة محجوزة في هذا الوقت</b><span>${c.map(b => `${esc(b.data?.title || "حجز")} (${bkSpan(b)})`).join("، ")}</span>
    ${free.length ? `<span>أوقات متاحة في نفس اليوم: ${free.map(([a, z]) => `<button type="button" class="chip ok" data-bkslot="${a}|${z}">${t12(a)}، ${t12(z)}</button>`).join(" ")}</span>` : ""}
    ${other.length ? `<span>قاعات متاحة في نفس الوقت: ${other.map(h => `<button type="button" class="chip" data-bkhall="${h.id}">${esc(h.name)}، ${esc(h.venue)}</button>`).join(" ")}</span>` : ""}</div>`;
}
async function bkSave(){
  const f = bkRead(); if (!f.day || !f.t_from || !f.t_to) return toast("حدّد التاريخ والوقت"); if (hm(f.t_to) <= hm(f.t_from)) return toast("وقت النهاية قبل البداية");
  if (!f.data.title && !f.data.comm) return toast("اكتب عنوان الفعالية أو اختر الجالية");
  const id = S.form?.id;
  if (id) { if (f.status !== "ملغى" && bkClash(f.hall, f.day, f.t_from, f.t_to, id).length) return toast("القاعة محجوزة في هذا الوقت");
    const { error } = await sb.from("bookings").update({ ...f, updated_at:new Date().toISOString() }).eq("id", id); if (error) return bkErr(error);
    const o = S.bks.find(x => x.id === id); if (o) Object.assign(o, f); closeDrawer(); render(); return toast("حُفظ الحجز"); }
  const rep = +($("#bk-rep")?.value || 1); const rows = [], skipped = [];
  for (let i = 0; i < rep; i++) { const day = addDays(f.day, 7 * i); if (f.status !== "ملغى" && (bkClash(f.hall, day, f.t_from, f.t_to).length)) { skipped.push(day); continue; } rows.push({ ...f, day }); }
  if (!rows.length) return toast("القاعة محجوزة في هذا الوقت");
  const { data, error } = await sb.from("bookings").insert(rows).select(); if (error) return bkErr(error);
  S.bks = [...S.bks, ...(data || rows)].sort((a, b) => (a.day + a.t_from).localeCompare(b.day + b.t_from));
  closeDrawer(); render(); toast(rows.length > 1 ? `تم ${rows.length} حجوزات${skipped.length ? `، تُخطّي ${skipped.length} لوجود تعارض (${skipped.map(fmt).join("، ")})` : ""}` : "تم الحجز ✓");
}
function bkErr(e){ if (e?.code === "23P01" || /overlap/.test(e?.message || "")) { toast("القاعة محجوزة في هذا الوقت، حدّث الصفحة"); loadBks().then(() => { render(); bkAvail(); }); } else writeFail(e); }
function bkWaText(b){ const d = b.data || {};
  return `السلام عليكم ورحمة الله وبركاته\n${d.coord ? `الأخ الفاضل/ ${d.coord} حفظه الله\n` : ""}\nنفيدكم بتأكيد حجز ${hallName(b.hall)}${d.title ? ` لـ«${d.title}»` : ""}:\n• اليوم: ${DAYS[dOf(b.day).getDay()]} ${fmt(b.day)}\n• الوقت: من ${t12(b.t_from)} إلى ${t12(b.t_to)}${d.count ? `\n• العدد المتوقع: ${d.count}` : ""}${(d.equip || []).length ? `\n• التجهيزات: ${d.equip.join("، ")}` : ""}\n\nنرجو الالتزام بالموعد وترك المكان كما كان، وجزاكم الله خيراً.${SIGN}`; }

/* ---------- Copilot, palette, alerts, data file ---------- */
const hallByText = t => { const k = nkey(t || ""); return HALLS.find(h => k && (nkey(h.name + h.venue).includes(k) || k.includes(nkey(h.name)))) || (/ثنيان|الغانم/.test(t) ? HALLS[0] : null); };
PRIME_MSG = PRIME_MSG.replace("مثال:", `- {"op":"add_booking","hall":"مسرح ثنيان الغانم | مسرح النساء | القاعة الكبرى | مسرح الإدارة","day":"YYYY-MM-DD","from":"18:00","to":"20:00","title":"","comm":"","coord":"","phone":"","count":0,"status":"مؤكد|مبدئي"}  ← حجز قاعة (ثنيان الغانم: مسرح واحد؛ المسجد الكبير: مسرح النساء والقاعة الكبرى ومسرح الإدارة). تحقق من جدول الحجوزات في الملف قبل الحجز.
مثال:`);
const _describe12 = describe;
describe = function(a){ if (a.op === "add_booking") { const h = hallByText(a.hall); const c = h && bkClash(h.id, a.day, a.from, a.to).length; return ["حجز قاعة", `${h ? hallName(h.id) : a.hall + " (غير معروفة)"}، ${fmt(a.day)}، ${t12(a.from)} إلى ${t12(a.to)}، ${a.title || a.comm || ""}${c ? " ⚠ محجوزة" : ""}`, c ? "bad" : "ok"]; } return _describe12(a); };
const _runAction12 = runAction;
runAction = async function(a){
  if (a.op !== "add_booking") return _runAction12(a);
  const h = hallByText(a.hall); if (!h) throw new Error(`القاعة «${a.hall}» غير معروفة`);
  if (!a.day || !a.from || !a.to || hm(a.to) <= hm(a.from)) throw new Error("التاريخ أو الوقت غير صحيح");
  const c = bkClash(h.id, a.day, a.from, a.to); if (c.length) throw new Error(`${h.name} محجوزة (${c.map(bkSpan).join("، ")})`);
  const row = { hall:h.id, day:a.day, t_from:a.from, t_to:a.to, status:a.status === "مبدئي" ? "مبدئي" : "مؤكد", data:{ title:a.title || "", comm:commByName(a.comm) || a.comm || "", coord:a.coord || "", phone:a.phone || "", count:String(a.count || ""), src:"Copilot" } };
  const { data, error } = await sb.from("bookings").insert(row).select(); if (error) { if (error.code === "23P01") throw new Error("القاعة محجوزة"); throw error; }
  S.bks.push((data && data[0]) || row); return `تم حجز ${hallName(h.id)} ${fmt(a.day)}`;
};
const _sysMd12 = sysMarkdown;
sysMarkdown = function(){
  const L = bkLive().filter(b => b.day >= addDays(TODAY, -30) && b.day <= addDays(TODAY, 90));
  return _sysMd12() + `\n\n## حجز القاعات (ثنيان الغانم: المسرح، المسجد الكبير: مسرح النساء، القاعة الكبرى، مسرح الإدارة)، من 30 يوماً مضت إلى 90 يوماً قادمة (${L.length})\n| التاريخ | اليوم | القاعة | من | إلى | الفعالية | الجالية | المسؤول | الحالة |\n|---|---|---|---|---|---|---|---|---|\n` + L.map(b => `| ${fmt(b.day)} | ${DAYS[dOf(b.day).getDay()]} | ${hallName(b.hall)} | ${t12(b.t_from)} | ${t12(b.t_to)} | ${(b.data?.title || "—").replace(/\|/g, "/")} | ${b.data?.comm || "—"} | ${b.data?.coord || "—"} | ${b.status} |`).join("\n");
};
const _alerts12 = alerts;
alerts = function(){ const A = _alerts12(); const t = bkLive().filter(b => b.day === TODAY); const tent = bkLive().filter(b => b.status === "مبدئي" && b.day >= TODAY && b.day <= addDays(TODAY, 7));
  if (tent.length) A.splice(1, 0, { k:"warn", t:`${tent.length} حجز قاعة مبدئي يحتاج تأكيد هذا الأسبوع`, go:"halls" });
  A.push({ k:"ok", t:`${t.length} حجز قاعة اليوم`, s:t.map(b => `${HALLS.find(h => h.id === b.hall)?.name} ${t12(b.t_from)}`).join("، "), go:"halls" }); return A; };
const _palAll12 = palAll;
palAll = function(){ const A = _palAll12(); if (S.canWrite) A.unshift({ g:"إجراءات", t:"حجز قاعة", s:"ثنيان الغانم · المسجد الكبير", ic:"i-hall", run:() => bkForm(), txt:"حجز قاعه مسرح ثنيان الغانم المسجد الكبير النساء الاداره" });
  for (const b of bkLive().filter(x => x.day >= TODAY).slice(0, 100)) A.push({ g:"حجوزات القاعات", t:`${b.data?.title || "حجز"}، ${HALLS.find(h => h.id === b.hall)?.name}`, s:`${fmt(b.day)} · ${bkSpan(b)}`, ic:"i-hall", run:() => bkForm(b.id), txt:[b.data?.title, b.data?.comm, b.data?.coord, hallName(b.hall)].join(" ") });
  return A; };
const _boot9h = boot9; boot9 = function(){ _boot9h(); loadBks().then(() => { liveBks(); bellRefresh(); if (S.view === "halls" && $("#drawer").hidden) render(); }); };

document.addEventListener("click", async ev => {
  const t = ev.target.closest("button"); if (!t) return; const D = t.dataset;
  if (D.bknew !== undefined) { if (!S.canWrite) return toast("صلاحيتك عرض فقط"); return bkForm(null, { hall:D.bknew || undefined, day:D.bkday }); }
  if (D.bk) return bkForm(D.bk);
  if (D.bksave !== undefined) return bkSave();
  if (D.hwo !== undefined) { S.f.hwo = D.hwo === "0" ? 0 : (S.f.hwo || 0) + +D.hwo; return render(); }
  if (D.bkprint !== undefined) return printArea("#bk-sheet");
  if (D.bkslot) { const [a, z] = D.bkslot.split("|"); const len = hm($("#bk-to").value) - hm($("#bk-from").value); $("#bk-from").value = a; const e = Math.min(hm(z), hm(a) + len); $("#bk-to").value = `${pad(Math.floor(e / 60))}:${pad(e % 60)}`; return bkAvail(); }
  if (D.bkhall) { $("#bk-hall").value = D.bkhall; return bkAvail(); }
  if (D.bkwa !== undefined) { const b = S.bks.find(x => x.id === S.form?.id); if (!b) return; const ph = b.data?.phone || S.coords.find(c => c.name === b.data?.coord)?.phone; if (!ph) { const ok = await cpCopy(bkWaText(b)); return toast(ok ? "لا يوجد رقم، نُسخت الرسالة" : "لا يوجد رقم هاتف"); } return waOpen(ph, bkWaText(b)); }
  if (D.bkdup !== undefined) { const b = S.bks.find(x => x.id === S.form?.id); if (b) bkForm(null, { hall:b.hall, day:addDays(b.day, 7), t_from:b.t_from, t_to:b.t_to, data:b.data }); return; }
  if (D.bkdel !== undefined) { if (D.sure !== "1") { D.sure = "1"; t.textContent = "اضغط مرة أخرى للتأكيد"; return; } const id = S.form?.id; const { error } = await sb.from("bookings").delete().eq("id", id); if (error) return writeFail(error); S.bks = S.bks.filter(x => x.id !== id); closeDrawer(); render(); return toast("حُذف الحجز"); }
});
document.addEventListener("input", ev => { if (/^bk-(hall|day|from|to|st)$/.test(ev.target.id)) bkAvail(); });
document.addEventListener("change", ev => { if (/^bk-(hall|day|from|to|st)$/.test(ev.target.id)) bkAvail(); if (ev.target.id === "bk-coord") { const c = S.coords.find(x => x.name === ev.target.value); if (c) { if (c.phone && !$("#bk-phone").value) $("#bk-phone").value = c.phone; if (c.comm && !$("#bk-comm").value) $("#bk-comm").value = c.comm; } } });
