/* ===== v64: permit time by prayer period (بعد صلاة المغرب…) instead of clock hours ===== */
const PRAYERS = ["بعد صلاة الفجر", "بعد صلاة الظهر", "بعد صلاة العصر", "بعد صلاة المغرب", "بين المغرب والعشاء", "بعد صلاة العشاء", "بعد صلاة الجمعة"];
const PR_HM = { "بعد صلاة الفجر":["04:45", "05:45"], "بعد صلاة الظهر":["12:00", "13:00"], "بعد صلاة العصر":["15:15", "16:15"], "بعد صلاة المغرب":["17:30", "18:30"], "بين المغرب والعشاء":["17:30", "18:45"], "بعد صلاة العشاء":["19:00", "20:00"], "بعد صلاة الجمعة":["12:15", "13:15"] };
function prayerOf(t){ const s = String(t || ""); const p = PRAYERS.find(x => s.includes(x)) || PRAYERS.find(x => s.includes(x.replace("بعد صلاة ", ""))); if (p) return p;
  const m = s.match(/^(\d{1,2}):(\d{2})/); if (!m) return ""; const h = +m[1] + +m[2] / 60; return h < 7 ? "بعد صلاة الفجر" : h < 14 ? "بعد صلاة الظهر" : h < 17 ? "بعد صلاة العصر" : h < 18.6 ? "بعد صلاة المغرب" : "بعد صلاة العشاء"; }
const _permitForm64 = permitForm;
permitForm = function(preset, grant){ _permitForm64(preset, grant); if (S.form?.kind !== "permit") return;
  const act = preset?.act_id ? S.byId?.get(preset.act_id) : null, cur = prayerOf(preset?.prayer || act?.time || preset?.t_from) || "بعد صلاة المغرب";
  const fw = $("#p-from")?.closest(".fld"), tw = $("#p-to")?.closest(".fld");
  fw?.insertAdjacentHTML("beforebegin", `<div class="pr-pray-w">${fld("p-pray", "الوقت", `<select class="f" id="p-pray">${PRAYERS.map(p => `<option${p === cur ? " selected" : ""}>${p}</option>`).join("")}</select>`)}</div>`);
  if (fw) fw.hidden = true; if (tw) tw.hidden = true; prPraySync(); };
function prPraySync(){ const p = $("#p-pray")?.value, hm2 = PR_HM[p]; if (!hm2) return; const f = $("#p-from"), t = $("#p-to"); if (f) f.value = hm2[0]; if (t) t.value = hm2[1]; }
document.addEventListener("change", ev => { if (ev.target.id === "p-pray") prPraySync(); });
/* issue: the permit shows the prayer period, e.g. «بعد صلاة المغرب» */
const _permitIssue64 = permitIssue;
permitIssue = async function(){ const p = $("#p-pray")?.value; if (!p) return _permitIssue64(); prPraySync();
  const v = id => $("#" + id)?.value.trim() || "";
  if (!v("p-sheikh") || !v("p-mosque") || !v("p-date")) return toast("أكمل اسم الشيخ والمسجد والتاريخ");
  const dur = DUR.find(x => x[0] === v("p-dur")) || DUR[0]; const until = addDays(v("p-date"), dur[2] - 1);
  const data = { sheikh:v("p-sheikh"), mosque:v("p-mosque"), topic:v("p-topic"), lang:v("p-lang"), date:v("p-date"), t_from:v("p-from"), t_to:v("p-to"), time:p, prayer:p, dur:dur[1], head:v("p-head") };
  const { data:row, error } = await sb.from("permits").insert({ data, until, act_id:S.form?.act || "", ...(S.form?.grant ? { grant_id:S.form.grant } : {}) }).select().single(); if (error) return writeFail(error);
  S.permits = [row, ...S.permits]; if (row.grant_id) { const g = S.grants.find(x => x.id === row.grant_id); if (g) g.permit_id = row.id; } closeDrawer(); toast(`صدر التصريح ${row.no}`); permitView(row.id); };
/* the AI reading fills the prayer period too */
if (typeof prFill === "function") { const _prFill64 = prFill; prFill = function(i){ _prFill64(i); const x = PR.items[i]; const p = prayerOf(x?.prayer) || prayerOf(x?.from); const s = $("#p-pray"); if (s && p) { s.value = p; s.classList.add("pr-filled"); prPraySync(); } }; }
NEWF.splice(1, 0, ["v64-pray", "nav:permits", "وقت التصريح بالصلاة", "وقت التصريح صار فترة بعد الصلاة: بعد الفجر، الظهر، العصر، المغرب، العشاء، أو الجمعة، ويظهر هكذا في التصريح وصفحة التحقق.", false, "2026-10-21"]);
/* the signature & stamp on permits belong to the head of section: only he can change them (also enforced in the database) */
const isHead = () => S.me?.username === "fayez";
document.addEventListener("click", ev => { const t = ev.target.closest("[data-passets],[data-pasave]"); if (!t || isHead()) return; ev.preventDefault(); ev.stopImmediatePropagation(); toast("التوقيع والختم يغيّرهما رئيس القسم فقط"); }, true);
const _afterRender64 = afterRender; afterRender = function(v){ _afterRender64(v); if (v === "permits" && !isHead()) { const b = $("[data-passets]"); if (b) { b.disabled = true; b.title = "يغيّرهما رئيس القسم فقط"; b.textContent = "🔒 التوقيع والختم (رئيس القسم)"; } } };
