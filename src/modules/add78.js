/* ===== v78: «استعلام»، القاعدة المركزية للتعارضات. ترفع كتاباً (أو تلصق نصه) فيقرؤه الذكاء الاصطناعي، ثم يطابق كل درس فيه مع كل ما في «إنجاز»
   (الأنشطة والتصاريح) ومع كتب «وثيقة» الجارية، ويقول لكل درس: تعارض حقيقي، تنبيه، أو سليم. يحلّ محلّ «هل الوقت متاح؟»، والفحص السريع لموعد واحد باقٍ تحته. ===== */
TITLES.avail = "استعلام";
const INQ = { busy:false, res:[], st:"", name:"" };
const inqWomen = t => /نساء|نسائ|سيدات|الاخوات|الأخوات|واعظه|واعظة/.test(norm(t || ""));
const inqDaysOf = x => { const n = norm(x.days || ""), d = [];
  if (/يومي/.test(n)) return [0, 1, 2, 3, 4, 5, 6];
  DAYN.forEach((w, i) => { if (n.includes(w.replace(/^ال/, ""))) d.push(i); });
  return d.length ? d : x.date ? [dOf(x.date).getDay()] : []; };
const inqSlotOf = x => { const p = String(x.prayer || ""); if (/الفجر|العصر|المغرب|العشاء|الظهر|الجمعة|صباح/.test(p)) return slot(p);
  const f = /^\d{1,2}:\d{2}$/.test(x.from || "") ? x.from : "", t = /^\d{1,2}:\d{2}$/.test(x.to || "") ? x.to : ""; if (f) { const a = +f.slice(0, f.indexOf(":")) * 60 + +f.slice(-2), b = t ? +t.slice(0, t.indexOf(":")) * 60 + +t.slice(-2) : a + 60; return [a, b > a ? b : a + 60]; }
  return p ? slot(p) : null; };
const inqTok = s => norm(String(s || "").replace(/[()\[\]،,.\-–]/g, " ")).split(" ").map(w => w.replace(/^ال/, "")).filter(w => w && w !== "مسجد" && w !== "جامع");
const inqMosOf = x => { const T = inqTok(x.mosque); if (!T.length) return []; const all = new Set([...T, ...inqTok(x.area)]), n = nkey(String(x.mosque).replace(/^مسجد\s*/, ""));
  let C = S.mosques.filter(m => nkey(m.name) === n);
  if (!C.length) { const L = S.mosques.map(m => [m, inqTok(m.name)]).filter(([, t]) => t.length && t.every(w => all.has(w))), mx = Math.max(0, ...L.map(([, t]) => t.length)); C = L.filter(([, t]) => t.length === mx).map(([m]) => m); }
  if (!C.length) C = S.mosques.filter(m => { const k = nkey(m.name); return k.length > 5 && (k.includes(n) || n.includes(k)); });
  if (C.length > 1) { const f = C.filter(m => inqTok(m.area).some(w => all.has(w))); if (f.length) C = f; } return C; };
const inqOv = (a, b) => a.sl && b.sl && a.sl[0] < b.sl[1] && b.sl[0] < a.sl[1] && a.days.some(d => b.days.includes(d)) && !(a.start > b.end || b.start > a.end);
const inqPrep = (x, i) => { const sl = inqSlotOf(x), days = inqDaysOf(x), ms = inqMosOf(x); let start = x.start || x.date || TODAY; if (start < TODAY) start = TODAY;
  let end = x.end || addDays(start, 182), long = false; if (end > addDays(start, 184)) { end = addDays(start, 182); long = true; }
  const women = inqWomen([x.topic, x.sheikh].join(" "));
  return { i, x, sl, days, ms, start, end, long, names:lectNames(x.sheikh), aud:women ? "نساء" : "رجال", live:true, id:"__inq" + i }; };
const inqWhen = c => `${c.days.map(d => DAYS[d]).join(" و")} ${c.x.prayer || (c.x.from ? t12(c.x.from) + (c.x.to ? "، " + t12(c.x.to) : "") : "")}`.trim();
function inqCheck(items){
  const C = items.map(inqPrep), out = [];
  for (const c of C) { const R = { c, bad:[], warn:[], ok:[] }; out.push(R); const x = c.x;
    if (!c.ms.length) R.warn.push({ t:`المسجد «${x.mosque || "؟"}» غير موجود في «إنجاز» بهذا الاسم، لا أقدر أفحصه. راجع الاسم أو أضفه في «المساجد»` });
    else if (c.ms.length > 1) R.warn.push({ t:`يوجد ${c.ms.length} مساجد بهذا الاسم (${c.ms.map(m => m.area || m.gov).filter(Boolean).join("، ")})، فحصتُها كلها` });
    if (!c.days.length) R.warn.push({ t:"اليوم غير واضح في الكتاب، لم أفحص التعارض" });
    if (!c.sl) R.warn.push({ t:"الوقت غير واضح في الكتاب، لم أفحص التعارض" });
    if (c.long) R.warn.push({ t:"المدة في الكتاب أطول من 6 أشهر، والحد الأقصى 6 أشهر" });
    if (c.sl && c.sl[0] >= 1140 && /العشاء/.test(x.prayer || "")) R.warn.push({ t:"الدرس بعد صلاة العشاء، وهو ممنوع بحسب تعميم الوزارة" });
    if (c.sl && c.days.includes(5) && c.sl[0] < 840 && c.sl[1] > 690) R.warn.push({ t:"يتزامن مع صلاة وخطبة الجمعة" });
    if (!c.ms.length || !c.days.length || !c.sl) continue;
    const ids = new Set(c.ms.map(m => m.id));
    for (const e of S.E) { if (!e.live || !inqOv(c, e)) continue;
      const same = c.names.length && e.names.length && sameLect(c.names, e.names), here = ids.has(e.mosque);
      if (here && same) { R.ok.push({ t:`تجديد لنفس الدرس القائم (نشاط #${e.n}، ${e.comm || ""})`, open:"act:" + e.id }); continue; }
      if (here) { const a = audOf(e), b = c.aud; if (a !== "الجميع" && a !== b) continue; const p = monthWeek(e.rep); if (p && !(p === "weekly")) continue;
        R.bad.push({ t:`نفس المسجد والوقت: نشاط #${e.n} (${e.comm || "جالية؟"}${e.lect ? "، " + e.lect : ""}${e.doc ? "، موافقة " + e.doc : ""})`, open:"act:" + e.id }); }
      else if (same) R.warn.push({ t:`المحاضر نفسه عنده درس بنفس الوقت في ${e.mosName || "مسجد آخر"} (نشاط #${e.n})، ليس تعارضاً إن كان عنده بديل`, open:"act:" + e.id });
    }
    const names = c.ms.map(m => nkey(m.name));
    for (const w of S.wq || []) { if (w.dir !== "out" || !w.body || !w.created || w.created.replace(/\//g, "-") < addDays(TODAY, -75) || (w.no && docBy[w.no])) continue;
      const nb = nkey(w.body), nd = norm(w.body); let hit = false;
      for (const nm of names) { let k = -1; while ((k = nb.indexOf(nm, k + 1)) >= 0) { const raw = nd.replace(/\s/g, ""), seg = raw.slice(Math.max(0, k - 60), k + nm.length + 140);
        const dh = c.days.some(d => seg.includes(DAYN[d].replace(/^ال/, "").replace(/\s/g, ""))), th = /الفجر|العصر|المغرب|العشاء|الظهر|صباح/.test(seg) && (!x.prayer || seg.includes(norm(x.prayer.replace(/^بعد\s*صلاة\s*/, "")).replace(/\s/g, "")));
        if (dh && th) { hit = true; break; } } if (hit) break; }
      if (hit) R.warn.push({ t:`كتاب قيد المعالجة في وثيقة${w.no ? " رقم " + w.no : ""} («${(w.subj || "").slice(0, 50)}») يذكر المسجد نفسه واليوم والوقت، راجعه`, open:"wq:" + w.id }); }
  }
  for (let i = 0; i < C.length; i++) for (let j = i + 1; j < C.length; j++) { const a = C[i], b = C[j]; if (!inqOv(a, b)) continue;
    const sm = a.ms.some(m => b.ms.some(n => n.id === m.id)), sl = a.names.length && b.names.length && sameLect(a.names, b.names);
    if (sm && a.aud === b.aud) { out[i].bad.push({ t:`تعارض داخل الكتاب نفسه مع الصف ${j + 1}: نفس المسجد والوقت` }); out[j].bad.push({ t:`تعارض داخل الكتاب نفسه مع الصف ${i + 1}: نفس المسجد والوقت` }); }
    else if (sl && !sm) { out[i].bad.push({ t:`المحاضر نفسه في مسجدين بنفس الوقت (الصف ${j + 1})` }); out[j].bad.push({ t:`المحاضر نفسه في مسجدين بنفس الوقت (الصف ${i + 1})` }); } }
  return out;
}
function inqCard(R){ const c = R.c, x = c.x, k = R.bad.length ? "bad" : R.warn.length ? "warn" : "ok", ic = { bad:"✕", warn:"⚠", ok:"✓" }[k];
  const row = (z, cls) => `<li class="${cls}">${z.open ? `<button type="button" class="inq-lk" data-prio-open="${esc(z.open)}">${esc(z.t)}</button>` : esc(z.t)}</li>`;
  return `<div class="inq-c ${k}"><div class="inq-h"><span class="inq-ic">${ic}</span><div><b>${esc(x.sheikh || "—")}</b><span>${esc([x.mosque ? "مسجد " + x.mosque.replace(/^مسجد\s*/, "") : "", x.area, inqWhen(c)].filter(Boolean).join(" · "))}</span></div></div>
    <ul>${R.bad.map(z => row(z, "b")).join("")}${R.warn.map(z => row(z, "w")).join("")}${R.ok.map(z => row(z, "o")).join("")}${!R.bad.length && !R.warn.length && !R.ok.length ? `<li class="o">لا تعارض مع أي نشاط أو كتاب</li>` : ""}</ul></div>`; }
function inqPaint(){ const o = $("#inq-out"); if (!o) return; const b = INQ.res.reduce((n, R) => n + (R.bad.length ? 1 : 0), 0), w = INQ.res.reduce((n, R) => n + (!R.bad.length && R.warn.length ? 1 : 0), 0);
  o.innerHTML = (INQ.name ? `<div class="inq-nm">📄 <b>${esc(INQ.name)}</b></div>` : "") + (INQ.st ? `<div class="inq-st">${INQ.st}</div>` : "");
  if (INQ.res.length) o.innerHTML += `<div class="inq-sum ${b ? "bad" : w ? "warn" : "ok"}"><b>${b ? `${b} من ${INQ.res.length} فيها تعارض` : w ? `لا تعارض حقيقي، و${w} فيها تنبيه` : `سليم: لا تعارض في الـ${INQ.res.length}`}</b><span>${esc(INQ.name)}</span></div>` + INQ.res.map(inqCard).join(""); }
async function inqRun(bodies, name){ if (INQ.busy) return; INQ.busy = true; INQ.res = []; INQ.name = name || ""; const all = [];
  try { const t0 = Date.now(), msg = () => `<span class="spin"></span> يقرأ الذكاء الاصطناعي الكتاب${bodies.length > 1 ? ` (${bodies.length} ملفات معاً)` : ""}… ${Math.round((Date.now() - t0) / 1000)} ثانية`; INQ.st = msg(); inqPaint();
    const tick = setInterval(() => { INQ.st = msg(); inqPaint(); }, 1000);
    try { const R = await Promise.all(bodies.map(b => Promise.race([sb.functions.invoke("doc-read", { body:b }), new Promise((_, no) => setTimeout(() => no(new Error("تأخرت القراءة، أعد المحاولة")), 110000))])));
      for (const { data, error } of R) { if (error || data?.error) throw new Error(data?.error || error?.message || "تعذّرت القراءة"); all.push(...(data.items || []).filter(x => x && (x.sheikh || x.mosque))); } }
    finally { clearInterval(tick); }
    if (!all.length) { INQ.st = "لم أجد في الكتاب دروساً (شيخ أو مسجد). جرّب صورة أوضح أو ألصق النص."; return; }
    INQ.st = ""; INQ.res = inqCheck(all);
  } catch (e) { INQ.st = "تعذّر الاستعلام: " + esc(String(e?.message || e).slice(0, 160)); }
  finally { INQ.busy = false; inqPaint(); } }
const _vAvail78 = vAvail;
vAvail = function(){ const L = (S.wq || []).filter(w => w.dir === "out" && w.body).sort((a, b) => wqDate(b).localeCompare(wqDate(a))).slice(0, 40);
  return `<div class="inq"><div class="inq-top"><b>استعلام عن كتاب</b><span>ارفع الكتاب (PDF أو صورة، حتى عدة ملفات) أو اختر كتاباً من وثيقة أو ألصق نصه، فأفحص كل درس فيه مع الأنشطة والتصاريح وكتب وثيقة الجارية وأقول لك أين التعارض قبل الإرسال.</span>
    <div class="inq-row"><label class="btn btn-primary">📎 ارفع الكتاب<input type="file" id="inq-file" accept="application/pdf,image/*" multiple hidden></label>
      ${L.length ? `<select class="f" id="inq-wq"><option value="">أو اختر كتاباً من وثيقة…</option>${L.map(w => `<option value="${esc(w.id)}">${esc(w.no || "مسودة")} · ${esc((w.subj || "").slice(0, 60))}</option>`).join("")}</select>` : ""}</div>
    <textarea class="f" id="inq-text" rows="3" placeholder="أو ألصق نص الكتاب هنا"></textarea><button type="button" class="btn" id="inq-go">استعلام عن النص</button></div>
    <div id="inq-out" class="inq-out"></div></div><h3 class="inq-sub">فحص سريع لموعد واحد</h3>${_vAvail78()}`; };
const _afterRender78 = afterRender;
afterRender = function(v){ _afterRender78(v); if (v === "avail") inqPaint(); };
document.addEventListener("change", async ev => { const t = ev.target;
  if (t.id === "inq-file") { const all = [...t.files], fs = all.filter(f => f.size <= 10e6); if (!fs.length) { t.value = ""; return toast("الملف أكبر من 10 ميغا"); } if (fs.length < all.length) toast(`تجاوزت ${all.length - fs.length} ملف لأنه أكبر من 10 ميغا`); const B = []; for (const f of fs) { const g = await prSmall(f); B.push({ b64:await b64of(g), mime:g.type || "application/pdf" }); } t.value = ""; inqRun(B, fs.map(f => f.name).join("، ")); }
  if (t.id === "inq-wq" && t.value) { const w = S.wq.find(x => x.id === t.value); if (w) inqRun([{ text:`رقم الكتاب: ${w.no}\nالتاريخ: ${w.doc_date}\nالموضوع: ${w.subj}\nمن: ${w.signer}\n\n${w.body}` }], `${w.no || ""} ${w.subj || ""}`); } });
document.addEventListener("click", ev => { if (ev.target.id !== "inq-go") return; const v = ($("#inq-text")?.value || "").trim(); if (v.length < 20) return toast("ألصق نص الكتاب أولاً"); inqRun([{ text:v }], "نص ملصوق"); });
GUIDES.avail = { g:"الأنشطة والجدولة", d:"ارفع كتاباً وأعرف قبل الإرسال إن كان فيه تعارض مع أي نشاط أو تصريح أو كتاب في وثيقة.", s:[
  { sel:"#inq-file", t:"ارفع الكتاب", x:"PDF أو صورة، أو اختر كتاباً من وثيقة، أو ألصق نصه. يقرؤه الذكاء الاصطناعي ويفحص كل درس." },
  { sel:"#inq-out", t:"النتيجة", x:"لكل درس: ✕ تعارض حقيقي، ⚠ تنبيه (مثل ممنوع بعد العشاء أو كتاب جارٍ بنفس الموعد)، ✓ سليم. اضغط على السبب لفتح النشاط أو الكتاب." }] };
TOURS["g-avail"] = { title:"دليل: استعلام", steps:[{ t:"استعلام", x:GUIDES.avail.d + "<br><br>سنمرّ على أجزاء الصفحة واحداً واحداً. اضغط «التالي»." }, ...GUIDES.avail.s.map(z => ({ go:"avail", ...z }))] };
NEWF.splice(0, 0, ["v78-inq", "nav:avail", "استعلام: افحص الكتاب قبل الإرسال", "ارفع الكتاب أو ألصق نصه، فيفحص «إنجاز» كل درس فيه مع الأنشطة والتصاريح وكتب وثيقة ويخبرك بالتعارض قبل الإرسال. حلّ محلّ «هل الوقت متاح؟»."]);
