/* ================= v17: head of section delegates ONE specific permit to an employee ================= */
const gOpen = g => !g.permit_id && !g.revoked && g.expires >= TODAY;
const myGrants = () => S.grants.filter(g => g.grantee === S.me?.id && gOpen(g));
function grantsPanel(){
  const mine = myGrants(), open = S.admin ? S.grants.filter(gOpen) : [];
  const row = (g, act) => `<div class="wq-i"><span class="num wq-no">تفويض</span><span class="wq-t"><b>${esc(g.preset?.sheikh || "—")}</b><span class="s">${esc(g.preset?.mosque || "")}${g.preset?.date ? " · " + fmt(g.preset.date) : ""}${g.note ? " · " + esc(g.note) : ""}</span></span><span class="wq-m">${act}</span></div>`;
  let h = "";
  if (mine.length) h += `<div class="panel"><div class="panel-h"><h3>تفويضات بانتظارك (${mine.length})</h3><span class="s">صلاحية إصدار هذه التصاريح فقط</span></div><div class="panel-b wq-list">${mine.map(g => row(g, `<span class="s">من ${esc(pname(g.granted_by))} · حتى ${fmt(g.expires)}</span><button type="button" class="btn btn-primary" data-pguse="${g.id}">إصدار التصريح</button>`)).join("")}</div></div>`;
  const others = open.filter(g => g.grantee !== S.me?.id);
  if (others.length) h += `<div class="panel"><div class="panel-h"><h3>تفويضات لم تُنفَّذ بعد (${others.length})</h3></div><div class="panel-b wq-list">${others.map(g => row(g, `<span class="chip t2">${esc(pname(g.grantee))}</span><span class="s">حتى ${fmt(g.expires)}</span><button type="button" class="btn btn-ghost bad-t" data-pgrevoke="${g.id}">سحب التفويض</button>`)).join("")}</div></div>`;
  return h;
}
function grantForm(preset){
  if (!S.admin) return toast("التفويض لرئيس القسم فقط");
  const d = { sheikh:"", mosque:"", topic:"", lang:"", date:addDays(TODAY, 1), t_from:"19:30", t_to:"20:30", dur:"day", head:S.pAssets.head || "فايز رزقان الرشيدي", ...preset };
  const people = S.profiles.filter(p => p.active && p.id !== S.me?.id);
  S.form = { kind:"pgrant", src:preset?.source || "", act:preset?.act_id || "" };
  openDrawer("تفويض موظف بإصدار تصريح", `
    <div class="check"><b>الموظف يأخذ صلاحية إصدار هذا التصريح فقط</b><span>لا يستطيع تغيير اسم الشيخ أو المسجد، ولا إصدار أي تصريح آخر. تصله مهمة وإشعار، وتُغلق المهمة تلقائياً عند الإصدار.</span></div>
    ${fld("g-to", "الموظف المفوَّض", `<select class="f" id="g-to">${people.map(p => `<option value="${p.id}">${esc(p.name || p.username)}</option>`).join("")}</select>`)}
    ${fld("p-sheikh", "اسم الشيخ", `<input class="f" id="p-sheikh" value="${esc(d.sheikh)}">`)}
    ${fld("p-mosque", "المسجد والمنطقة", `<input class="f" id="p-mosque" value="${esc(d.mosque)}" list="p-mos"><datalist id="p-mos">${S.mosques.map(m => `<option value="${esc("مسجد " + m.name + (m.area ? " — " + m.area : ""))}">`).join("")}</datalist>`)}
    <div class="g2">${fld("p-topic", "عنوان الدرس (اختياري)", `<input class="f" id="p-topic" value="${esc(d.topic)}">`)}${fld("p-lang", "اللغة (اختياري)", `<input class="f" id="p-lang" value="${esc(d.lang)}">`)}</div>
    <div class="g3">${fld("p-date", "تاريخ الدرس", `<input class="f" type="date" id="p-date" value="${esc(d.date)}">`)}${fld("p-from", "من", `<input class="f" type="time" id="p-from" value="${esc(d.t_from)}">`)}${fld("p-to", "إلى", `<input class="f" type="time" id="p-to" value="${esc(d.t_to)}">`)}</div>
    <div class="g2">${fld("p-dur", "أقصى مدة للتصريح", `<select class="f" id="p-dur">${DUR.map(([k, l]) => `<option value="${k}"${k === d.dur ? " selected" : ""}>${l}</option>`).join("")}</select>`)}${fld("g-note", "توجيه للموظف (اختياري)", `<input class="f" id="g-note" placeholder="مثال: بناءً على كتاب وثيقة 2608-2957">`)}</div>`,
    `<button class="btn btn-primary" data-pgsave>تفويض وإرسال المهمة</button><button class="btn btn-ghost" data-close>إلغاء</button>`);
}
async function grantSave(){
  const v = id => $("#" + id)?.value.trim() || "";
  if (!v("g-to") || !v("p-sheikh") || !v("p-mosque") || !v("p-date")) return toast("اختر الموظف وأكمل اسم الشيخ والمسجد والتاريخ");
  const dur = DUR.find(x => x[0] === v("p-dur")) || DUR[0];
  const preset = { sheikh:v("p-sheikh"), mosque:v("p-mosque"), topic:v("p-topic"), lang:v("p-lang"), date:v("p-date"), t_from:v("p-from"), t_to:v("p-to"), dur:dur[0], until:addDays(v("p-date"), dur[2] - 1), head:S.pAssets.head || "فايز رزقان الرشيدي", act_id:S.form?.act || "" };
  const { data:g, error } = await sb.from("permit_grants").insert({ grantee:v("g-to"), preset, source:S.form?.src || "", note:v("g-note"), expires:addDays(v("p-date"), 3) }).select().single(); if (error) return writeFail(error);
  const { data:t, error:e2 } = await sb.from("tasks").insert({ title:`إصدار تصريح درس — ${preset.sheikh}`, details:`${preset.mosque}\nتاريخ الدرس: ${fmt(preset.date)}${g.note ? "\n" + g.note : ""}\nصلاحيتك على هذا التصريح فقط.`, assignee:g.grantee, due:preset.date, prio:"عالية", link:`#pgrant:${g.id}` }).select().single();
  if (!e2 && t) { await sb.from("permit_grants").update({ task_id:t.id }).eq("id", g.id); g.task_id = t.id; S.tasks = [t, ...S.tasks]; }
  S.grants = [g, ...S.grants.filter(x => x.id !== g.id)]; closeDrawer(); render(); toast(`فُوِّض ${pname(g.grantee)} بإصدار التصريح ووصله إشعار`);
}
function grantUse(id){ const g = S.grants.find(x => x.id === id); if (!g) return toast("التفويض غير موجود"); if (g.permit_id) { toast("صدر هذا التصريح مسبقاً"); return permitView(g.permit_id); } if (!gOpen(g)) return toast("انتهى هذا التفويض أو سُحب"); if (g.grantee !== S.me?.id && !S.admin) return toast("هذا التفويض لموظف آخر"); permitForm({}, g.grantee === S.me?.id ? g : null); }

const _openLink18 = openLink;
openLink = function(h){ const s = String(h || "").replace(/^#/, ""); if (s.startsWith("pgrant:")) { if (S.view !== "permits") go("permits"); return grantUse(s.slice(7)); } return _openLink18(h); };
const _prio18 = priorities;
priorities = function(){ const P = _prio18(); const n = myGrants().length; if (n) P.push({ w:92, k:"gold", t:`${n} تصريح فوّضك رئيس القسم بإصداره`, s:"صلاحيتك على هذه التصاريح فقط", act:{ go:"permits", l:"إصدار" } }); return P.sort((a, b) => b.w - a.w); };
const _palAll18 = palAll;
palAll = function(){ const A = _palAll18(); if (S.admin) A.unshift({ g:"إجراءات", t:"تفويض موظف بإصدار تصريح", s:"", ic:"i-badge", run:() => grantForm(), txt:"تفويض صلاحية تصريح موظف" }); for (const g of myGrants()) A.unshift({ g:"إجراءات", t:`إصدار تصريح مفوَّض: ${g.preset?.sheikh || ""}`, s:g.preset?.mosque || "", ic:"i-badge", run:() => { go("permits"); grantUse(g.id); }, txt:"تصريح تفويض " + (g.preset?.sheikh || "") }); return A; };
// add «تفويض» next to «تصريح» in the activity drawer, and in the Watheqa letter drawer
const _actForm18 = actForm;
actForm = function(id, preset){ _actForm18(id, preset); const b = $(".drawer-f [data-pfrom]"); if (b && S.admin) b.insertAdjacentHTML("afterend", `<button class="btn btn-ghost" type="button" data-pgfrom="1" data-pd='${esc(b.dataset.pd)}'>تفويض تصريح</button>`); };
const _wqForm18 = wqForm;
wqForm = function(id){ _wqForm18(id); const w = S.wq.find(x => x.id === id); if (!w || !S.admin) return;
  const lect = (w.body.match(/(?:الشيخ|فضيلة الشيخ|الداعية)\s*\/?\s*([^\n،,.(]{4,40})/) || [])[1] || "";
  const mos = (w.body.match(/(مسجد\s*\/?\s*[^\n،,.(]{3,40})/) || [])[1] || "";
  $(".drawer-f [data-close]")?.insertAdjacentHTML("beforebegin", `<button class="btn btn-ghost" type="button" data-pgfrom="1" data-pd='${esc(JSON.stringify({ sheikh:lect.trim(), mosque:mos.trim(), topic:w.subj || "", source:`#wq:${w.id}` }))}'>تفويض تصريح</button>`); };
// show «صدر بتفويض» on a delegated permit
const _permitView18 = permitView;
permitView = async function(id){ await _permitView18(id); const p = S.permits.find(x => x.id === id); if (!p?.grant_id) return; const g = S.grants.find(x => x.id === p.grant_id);
  $("#drawer .check")?.insertAdjacentHTML("afterend", `<div class="check"><b>صدر بتفويض</b><span>من ${esc(pname(g?.granted_by))} إلى ${esc(pname(p.issued_by))}</span></div>`); };
document.addEventListener("click", async ev => {
  const t = ev.target.closest("button"); if (!t) return; const D = t.dataset;
  if (D.pgnew !== undefined) return grantForm();
  if (D.pgfrom) { try { return grantForm(JSON.parse(D.pd)); } catch (_) { return grantForm(); } }
  if (D.pgsave !== undefined) return grantSave();
  if (D.pguse) return grantUse(D.pguse);
  if (D.pgrevoke) { if (D.sure !== "1") { D.sure = "1"; t.textContent = "اضغط للتأكيد"; return; } const g = S.grants.find(x => x.id === D.pgrevoke); const { error } = await sb.from("permit_grants").update({ revoked:true }).eq("id", D.pgrevoke); if (error) return writeFail(error); if (g) { g.revoked = true; if (g.task_id) await sb.from("tasks").update({ status:"ملغاة" }).eq("id", g.task_id); } toast("سُحب التفويض"); return render(); }
});
