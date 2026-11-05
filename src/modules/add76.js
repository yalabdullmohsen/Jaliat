/* ===== v76: قاعدة التعارض الجديدة. التعارض الحقيقي فقط: نفس المسجد ونفس الوقت ونفس الفئة ونفس أسبوع الشهر.
   المحاضر نفسه في مسجد آخر ليس تعارضاً (المنسق قد يرسل بديلاً)، بل ملاحظة خفيفة. ===== */
const AUD = ["رجال", "نساء", "الجميع"];
const audOf = a => { if (AUD.includes(a?.aud)) return a.aud;
  const t = [a?.title, docBy[a?.doc]?.subj].filter(Boolean).join(" ");
  if (/رجال/.test(t) && /نساء|نسائ|سيدات/.test(t)) return "الجميع";
  return /نساء|نسائ|سيدات/.test(t) ? "نساء" : "رجال"; };
const monthWeek = r => r && r !== "weekly" ? r : "";
clash = function(a, b){
  if (!a.live || !b.live || !a.sl || !b.sl) return null;
  if (a.start > b.end || b.start > a.end) return null;
  if (!a.days.some(d => b.days.includes(d))) return null;
  if (!(a.sl[0] < b.sl[1] && b.sl[0] < a.sl[1])) return null;
  if (!a.mosque || a.mosque !== b.mosque) return null;
  const x = audOf(a), y = audOf(b); if (x !== "الجميع" && y !== "الجميع" && x !== y) return null;
  const p = monthWeek(a.rep), q = monthWeek(b.rep);
  if (p && q && p !== q && !(["n4", "last"].includes(p) && ["n4", "last"].includes(q))) return null;
  return "mos";
};
const sameLectElsewhere = (e, o) => o.id !== e.id && e.live && o.live && e.sl && o.sl && e.mosque !== o.mosque && e.names.length === 1 && o.names.length === 1
  && sameLect(e.names, o.names) && !(e.start > o.end || o.start > e.end) && e.days.some(d => o.days.includes(d)) && e.sl[0] < o.sl[1] && o.sl[0] < e.sl[1];
const _issuesAud = issues;
issues = function(e){ const out = _issuesAud(e);
  for (const c of e.cf) { const r = monthWeek(e.rep) || monthWeek(c.o.rep); const lab = r && PREP.find(x => x[0] === r)?.[1]; if (lab) { const i = out.find(z => z.t.endsWith(`(رقم ${c.o.n})`)); if (i) i.t += `، في «${lab}» فقط`; } }
  for (const o of S.E || []) if (sameLectElsewhere(e, o)) out.push({ lv:"warn", t:`المحاضر نفسه في ${o.mosName || "مسجد آخر"} بالوقت نفسه (رقم ${o.n})، ليس تعارضاً إن كان عنده بديل` });
  return out; };
const _deriveAud = derive;
derive = function(){ _deriveAud(); for (const e of S.E) e.issues = issues(e); };
const _actFormAud = actForm;
actForm = function(id){ const r = _actFormAud.apply(this, arguments); if (S.form?.kind !== "act") return r;
  const a = id ? (S.acts.get(id) || {}) : {};
  $("#f-lect")?.closest(".fld")?.insertAdjacentHTML("afterend", fld("f-aud", "الفئة", `<select class="f" id="f-aud"${dis()}>${opts(AUD, audOf(a))}</select>`));
  $("#f-aud")?.addEventListener("change", liveCheck); return r; };
const _readActAud = readAct;
readAct = function(){ const v = _readActAud.apply(this, arguments); const s = $("#f-aud")?.value; if (v && s) v.aud = s === "رجال" ? "" : s; return v; };
NEWF.splice(0, 0, ["v76-cf", "nav:acts", "التعارضات صارت أدق", "التعارض الآن فقط إذا كان نفس المسجد ونفس الوقت ونفس الفئة (رجال أو نساء). والمحاضر في مسجد آخر يظهر كملاحظة لأن المنسق قد يرسل بديلاً. وأضفنا خانة «الفئة» في النشاط."]);
