/* ===== v66: the permit opens only on its days and within its prayer period; default validity 6 months ===== */
const PD_ALL = [6, 0, 1, 2, 3, 4, 5];
function daysOfText(t){ const s = String(t || ""); if (/يومي|كل يوم|طوال الأسبوع/.test(s)) return [...PD_ALL];
  const M = [["الأحد", 0], ["الاثنين", 1], ["الإثنين", 1], ["الثلاثاء", 2], ["الاربعاء", 3], ["الأربعاء", 3], ["الخميس", 4], ["الجمعة", 5], ["السبت", 6]];
  return [...new Set(M.filter(([n]) => s.includes(n.replace(/^ال/, ""))).map(x => x[1]))]; }
const pdText = d => !d?.length || d.length === 7 ? "يومياً" : "كل " + WEEK.filter(x => d.includes(x)).map(x => DAYS[x].replace(/^ال/, "")).join(" و");
const _permitForm66 = permitForm;
permitForm = function(preset, grant){ _permitForm66(preset, grant); if (S.form?.kind !== "permit") return;
  const act = preset?.act_id ? S.byId?.get(preset.act_id) : null;
  let days = preset?.days || (act ? (act.daily ? [...PD_ALL] : act.days || []) : []);
  if (!days.length) { const d = $("#p-date")?.value; if (d) days = [dOf(d).getDay()]; }
  $(".pr-pray-w")?.insertAdjacentHTML("afterend", `<div class="fld"><label>أيام الدرس <span class="s">(التصريح يفتح في هذه الأيام فقط)</span></label><div class="pd-days" id="pd-days">${PD_ALL.map(x => `<button type="button" class="pd-d${days.includes(x) ? " on" : ""}" data-pdd="${x}">${DAYS[x]}</button>`).join("")}</div></div>`);
  const dur = $("#p-dur"); if (dur && !preset?.dur && !grant) dur.value = "180"; };
const pdGet = () => [...document.querySelectorAll("#pd-days .pd-d.on")].map(b => +b.dataset.pdd);
document.addEventListener("click", ev => { const b = ev.target.closest("[data-pdd]"); if (!b) return; b.classList.toggle("on"); });
/* issue: store the days and show them with the prayer period («كل ثلاثاء وخميس، بعد صلاة المغرب») */
const _permitIssue66 = permitIssue;
permitIssue = async function(){ const p = $("#p-pray")?.value; if (!p) return _permitIssue66(); prPraySync();
  const v = id => $("#" + id)?.value.trim() || "", days = pdGet();
  if (!v("p-sheikh") || !v("p-mosque") || !v("p-date")) return toast("أكمل اسم الشيخ والمسجد والتاريخ"); if (!days.length) return toast("اختر يوم الدرس");
  if (p === "بعد صلاة الجمعة" && !days.every(x => x === 5)) return toast("«بعد صلاة الجمعة» يكون يوم الجمعة فقط");
  const dur = DUR.find(x => x[0] === v("p-dur")) || DUR.find(x => x[0] === "180"); const until = addDays(v("p-date"), dur[2] - 1);
  const data = { sheikh:v("p-sheikh"), mosque:v("p-mosque"), topic:v("p-topic"), lang:v("p-lang"), date:v("p-date"), t_from:v("p-from"), t_to:v("p-to"), prayer:p, days, time:`${pdText(days)}، ${p}`, dur:dur[1], head:v("p-head") };
  const { data:row, error } = await sb.from("permits").insert({ data, until, act_id:S.form?.act || "", ...(S.form?.grant ? { grant_id:S.form.grant } : {}) }).select().single(); if (error) return writeFail(error);
  S.permits = [row, ...S.permits]; if (row.grant_id) { const g = S.grants.find(x => x.id === row.grant_id); if (g) g.permit_id = row.id; } closeDrawer(); toast(`صدر التصريح ${row.no}`); permitView(row.id); };
/* AI reading fills the days and the validity from the letter */
if (typeof prFill === "function") { const _prFill66 = prFill; prFill = function(i){ _prFill66(i); const x = PR.items[i]; const d = daysOfText(x?.days);
  if (d.length) document.querySelectorAll("#pd-days .pd-d").forEach(b => b.classList.toggle("on", d.includes(+b.dataset.pdd)));
  if (!(x?.end || PR.meta?.end)) { const s = $("#p-dur"); if (s && !s.disabled) s.value = "180"; } }; }
NEWF.splice(1, 0, ["v66-pdays", "nav:permits", "التصريح يفتح في أيامه وأوقاته فقط", "تختار أيام الدرس (مثل الثلاثاء والخميس)، والتصريح يُظهر للإمام «ساري الآن» فقط في هذه الأيام وخلال وقت الصلاة المحدد. المدة الافتراضية 6 أشهر.", false, "2026-10-21"]);
