/* ================= v74: «بوابة التدقيق»: فحص تضارب البيانات + تأكيد قبل إرسال أي تذكير لمنسق غير محسوم ================= */
const nzG = x => String(x || "").replace(/[ً-ْـ]/g, "").replace(/[إأآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/\s+/g, " ").trim().replace(/(^|\s)ال/g, "$1");
const gActive = () => S.E.filter(e => !["ملغى", "مكتمل"].includes(e.status));
const isGroupName = c => (S.comms || []).some(x => x.group && nzG(x.group) === nzG(c)) && !(S.comms || []).find(x => x.name === c && x.group);
function auditRun(){ const R = [], since = addDays(TODAY, -45), act = gActive();
  /* 1) تذكير أُرسل لمنسق ليس صاحب الموافقة */
  for (const r of S.renewLog || []) { if ((r.kind || "renew") !== "renew" || String(r.sent_at || "").slice(0, 10) < since) continue;
    const acts = S.E.filter(e => e.doc === r.doc_no); if (!acts.length) continue; const comms = [...new Set(acts.map(e => e.comm).filter(Boolean))];
    const ok = comms.some(c => coFor(c, acts).some(k => k.phone === r.phone)); if (!ok) R.push({ sev:"bad", area:"تذكيرات", t:`تذكير الموافقة ${r.doc_no} أُرسل إلى ${r.coord || r.phone}`, d:`ليس من منسقي «${comms.join("، ")}»، تأكد وصحّح مع المنسق`, go:"renew" });
    else if (comms.some(c => isGroupName(c)) && new Set(coFor(comms[0], acts).map(k => k.comm)).size > 1) R.push({ sev:"warn", area:"تذكيرات", t:`الموافقة ${r.doc_no}: المنسق غير محسوم`, d:`الأنشطة باسم مجموعة تضم أكثر من جالية`, go:"renew" }); }
  /* 2) أنشطة باسم مجموعة لا جالية */
  const grp = {}; for (const e of act) if (e.comm && isGroupName(e.comm)) (grp[e.comm] = grp[e.comm] || []).push(e);
  for (const [c, L] of Object.entries(grp)) R.push({ sev:"warn", area:"الجاليات", t:`${L.length} نشاط مسجّل باسم المجموعة «${c}»`, d:"اربطها بالجالية الدقيقة حتى يُحسم المنسق", go:"fix" });
  /* 3) أنشطة ناقصة أو مخالفة */
  const nm = act.filter(e => !e.mosque).length; if (nm) R.push({ sev:"warn", area:"الأنشطة", t:`${nm} نشاط بلا مسجد`, d:"يمنع كشف التعارض وإصدار التصريح", go:"fix" });
  const exp = {}; for (const e of act) { const d = docBy[e.doc]; if (e.doc && d?.end && d.end < TODAY) (exp[e.doc] = exp[e.doc] || []).push(e); }
  for (const [no, L] of Object.entries(exp)) R.push({ sev:"bad", area:"الموافقات", t:`الموافقة ${no} منتهية وفيها ${L.length} نشاط جارٍ`, d:`انتهت ${fmt(docBy[no].end)}، جدّد أو أوقف الأنشطة`, go:"renew" });
  const nd = act.filter(e => e.doc && !docBy[e.doc]).length; if (nd) R.push({ sev:"warn", area:"الموافقات", t:`${nd} نشاط برقم موافقة غير موجود في الموافقات`, d:"تحقق من رقم الموافقة", go:"fix" });
  /* 4) منسقون وجاليات */
  const live = (S.coords || []).filter(c => c.status !== "سابق"), byPh = {}; for (const c of live) if (c.phone) (byPh[c.phone] = byPh[c.phone] || new Set()).add(c.name);
  for (const [p, s] of Object.entries(byPh)) if (s.size > 1) R.push({ sev:"warn", area:"المنسقون", t:`الرقم ${p} لأكثر من اسم: ${[...s].join("، ")}`, d:"قد يكون خطأ إدخال", go:"coords" });
  for (const c of live) { if (!c.comm) R.push({ sev:"warn", area:"المنسقون", t:`المنسق ${c.name} بلا جالية`, d:"اربطه بجاليته من صفحة المنسقين", go:"coords" }); else if (!commNames.includes(c.comm)) R.push({ sev:"warn", area:"المنسقون", t:`المنسق ${c.name}: الجالية «${c.comm}» غير مسجلة`, d:"", go:"coords" }); }
  const dup = {}; for (const n of commNames) (dup[nzG(n)] = dup[nzG(n)] || []).push(n); for (const L of Object.values(dup)) if (L.length > 1) R.push({ sev:"warn", area:"الجاليات", t:`جاليات متشابهة الاسم: ${L.join(" / ")}`, d:"قد تكون مكررة، قرّر الدمج", go:"coords" });
  return R; }
const gSend = (x, c) => { if (!c || new Set(x.coords.map(k => k.comm)).size < 2) return true; return confirm(`«${x.comm}» تضم ${new Set(x.coords.map(k => k.comm)).size} جاليات ولم يتحدد صاحب الموافقة ${x.d?.no || ""}.\nهل ${c.name} (${c.comm}) هو صاحبها فعلاً؟`); };
const _vFix74 = vFix;
vFix = function(){ const R = auditRun(), bad = R.filter(r => r.sev === "bad").length;
  return `<div class="fx"><div class="fx-head"><b>بوابة التدقيق</b><span>${R.length ? `${R.length} ملاحظة${bad ? ` منها ${bad} حرجة` : ""}، لا يُعدَّل شيء تلقائياً، قرّر أنت.` : "لا تضارب في البيانات ✓"}</span></div>
    <div class="fx-l">${R.map(r => `<button type="button" class="fx-i" data-go="${r.go}"><span class="fx-n">${r.sev === "bad" ? "!!" : "!"}</span><span class="fx-t"><b>${esc(r.t)}</b><span>${esc(r.area)}${r.d ? " · " + esc(r.d) : ""}</span></span></button>`).join("")}</div></div>` + _vFix74(); };
const _rnSend74 = renewSend; renewSend = function(no, i, copyOnly){ if (!copyOnly) { const x = renewList().find(y => y.d.no === no); if (x && !gSend(x, x.coords[+i])) return; } return _rnSend74(no, i, copyOnly); };
const _rtSend74 = rtSend; rtSend = function(spec, copyOnly, markOnly){ if (!copyOnly && !markOnly) { const [kind, key, i] = spec.split("|"), x = rtItems(kind).find(y => rtKey(kind, y) === key); if (x && !gSend(x, x.coords[+i])) return; } return _rtSend74(spec, copyOnly, markOnly); };

/* ================= التحديث المركزي: كل حفظ للقوائم يمر من T.ref، فإعادة تسمية جالية تنتشر تلقائياً إلى المنسقين والأنشطة والموافقات ================= */
S.renamed = S.renamed || {};
const _ref74 = T.ref.bind(T);
T.ref = async function(r, list){
  if (r === "coords") list = list.map(k => S.renamed[k.comm] ? { ...k, comm:S.renamed[k.comm] } : k); /* حفظ قديم متأخر لا يعيد الاسم القديم */
  const old = r === "comms" ? (S.comms || []).slice() : null;
  await _ref74(r, list);
  if (r === "comms") {
    const ren = {}; for (const n of list) { const o = old.find(x => x.no === n.no); if (o && o.name !== n.name) ren[o.name] = n.name; }
    if (Object.keys(ren).length) { Object.assign(S.renamed, ren); setTimeout(() => { for (const k of Object.keys(ren)) delete S.renamed[k]; }, 6e4);
      const nz = c => ren[c] || c, K = (S.coords || []).map(k => ren[k.comm] ? { ...k, comm:ren[k.comm] } : k), D = (S.docs || []).map(d => ren[d.comm] ? { ...d, comm:ren[d.comm] } : d);
      if (K.some((k, i) => k !== S.coords[i])) { await _ref74("coords", K); S.coords = K; }
      if (D.some((d, i) => d !== S.docs[i])) { try { await _ref74("docs", D); S.docs = D; } catch (e) { console.warn("docs cascade", e); } }
      let n = 0; for (const [id, a] of S.acts) if (ren[a.comm]) { await T.put("acts", id, { ...a, comm:ren[a.comm] }); n++; }
      toast(`حُدّث الاسم تلقائياً في المنسقين والأنشطة (${n} نشاط)`); }
  }
  try { derive(); } catch (e) { console.warn("derive", e); }
};

/* ================= إصدار تصريح جديد بنفس بيانات تصريح سابق (أو من ملفه المرفق) ================= */
function pNextDate(p){ const d = p.data || {}, wd = (d.days || [])[0], rep = d.rep || "weekly"; if (wd == null) return addDays(TODAY, 1);
  for (let i = 0; i < 70; i++) { const s = addDays(TODAY, i), dt = dOf(s); if (dt.getDay() !== wd) continue; const dm = dt.getDate(), last = dm + 7 > new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
    if (rep === "weekly" || rep === "once") return s; if (rep === "last" ? last : /^n\d$/.test(rep) ? Math.ceil(dm / 7) === +rep[1] : true) return s; }
  return addDays(TODAY, 1); }
function pReissue(no){ const p = S.permits.find(x => x.no === String(no).trim().toUpperCase()); if (!p) return toast("لم أجد تصريحاً بهذا الرقم، اكتبه كما في أعلى التصريح (JL-…)");
  const d = p.data || {}; permitForm({ act_id:p.act_id || "", sheikh:d.sheikh || "", mosque:d.mosque || "", topic:d.topic || "", lang:d.lang || "", note:d.note || "", rep:d.rep, nth:d.nth, days:d.days, t_from:d.t_from || undefined, t_to:d.t_to || undefined, head:d.head, time_mode:d.time_mode, prayer:d.prayer, date:pNextDate(p) }); }
const _vPermits74 = vPermits;
vPermits = function(){ const h = _vPermits74(); if (!canPermit()) return h;
  const card = `<div class="panel pr-re"><div class="panel-h"><h3>إصدار تصريح جديد بنفس بيانات تصريح سابق</h3></div>
    <div class="g2"><label class="fld"><span>أرفق التصريح القديم (PDF أو صورة)</span><input class="f" type="file" id="pr-re-f" accept="application/pdf,image/*"></label>
    <label class="fld"><span>رقم التصريح القديم</span><input class="f" id="pr-re-n" list="pr-re-l" placeholder="JL-20261030-001" dir="ltr" autocomplete="off"><datalist id="pr-re-l">${S.permits.slice(0, 150).map(p => `<option value="${esc(p.no)}">${esc((p.data?.sheikh || "") + " · " + (p.data?.mosque || ""))}</option>`).join("")}</datalist></label></div>
    <button type="button" class="btn btn-primary" data-prre>فتح تصريح جديد بنفس البيانات</button></div>`;
  return h.replace(/(<div class="pt-bar">)/, card + "$1"); };
document.addEventListener("change", ev => { if (ev.target.id !== "pr-re-f") return; const f = ev.target.files?.[0]; if (!f) return; const m = (f.name || "").toUpperCase().match(/JL-\d{8}-\d{3}/); if (m) { const n = $("#pr-re-n"); if (n) n.value = m[0]; toast("قُرئ رقم التصريح من اسم الملف"); } else toast("اكتب رقم التصريح من أعلى الملف (JL-…)"); });
document.addEventListener("click", ev => { const t = ev.target.closest("[data-prre]"); if (!t) return; pReissue($("#pr-re-n")?.value || ""); });
