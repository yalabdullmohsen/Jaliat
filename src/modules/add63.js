/* ================= v83: flexible permit schedule — time optional (prayer / exact hours / none), monthly rules, notes ================= */
const PREP = [["weekly", "كل أسبوع"], ["n1", "الأسبوع الأول من كل شهر"], ["n2", "الأسبوع الثاني من كل شهر"], ["n3", "الأسبوع الثالث من كل شهر"], ["n4", "الأسبوع الرابع من كل شهر"], ["last", "الأسبوع الأخير من كل شهر"], ["start", "بداية كل شهر (أول 7 أيام)"], ["once", "مرة واحدة (تاريخ الدرس فقط)"], ["free", "حسب الملاحظات"]];
const PORD = { n1:"أول", n2:"ثاني", n3:"ثالث", n4:"رابع", last:"آخر" };
const PNTH = { n1:1, n2:2, n3:3, n4:4, last:-1, start:0 };
const _permitForm83 = permitForm;
permitForm = function(preset, grant){ _permitForm83(preset, grant); if (S.form?.kind !== "permit") return;
  const s = $("#p-pray"); if (s && !s.querySelector('[value="none"]')) { s.insertAdjacentHTML("afterbegin", `<option value="none">بدون وقت محدد</option><option value="clock">وقت محدد بالساعة</option>`); if (preset?.time_mode) s.value = preset.time_mode; }
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
NEWF.splice(1, 0, ["v83-pflex", "nav:permits", "إصدار تصريح بمرونة", "الوقت صار اختياري: بعد صلاة معيّنة، أو بالساعة، أو بدون وقت. والتكرار: كل أسبوع، أو ثاني جمعة من كل شهر، أو بداية كل شهر، أو مرة واحدة. ومع خانة ملاحظات تظهر على التصريح.", true, "2026-10-26"]);
