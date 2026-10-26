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
  const { data:row, error } = await sb.from("permits").insert({ data, until, act_id:S.form?.act || "", ...(S.form?.grant ? { grant_id:S.form.grant } : {}) }).select().single(); if (error) return writeFail(error);
  S.permits = [row, ...S.permits]; if (row.grant_id) { const g = S.grants.find(x => x.id === row.grant_id); if (g) g.permit_id = row.id; } closeDrawer(); toast(`صدر التصريح ${row.no}`); permitView(row.id); };
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
