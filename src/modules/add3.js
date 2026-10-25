/* ================= v9.2: add activities from a photo (free, on-device OCR) ================= */
const OCR = { worker:null, loading:null };
function loadTesseract(){
  if (window.Tesseract) return Promise.resolve();
  if (OCR.loading) return OCR.loading;
  OCR.loading = new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js"; s.onload = res; s.onerror = () => { OCR.loading = null; rej(new Error("load")); }; document.head.appendChild(s); });
  return OCR.loading;
}
async function getWorker(progress){
  await loadTesseract();
  OCR.progress = progress;
  if (!OCR.worker) OCR.worker = await Tesseract.createWorker(["ara", "eng"], 1, { logger:m => OCR.progress && OCR.progress(m) });
  return OCR.worker;
}
function prepImage(file){
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      const sc = Math.min(1, 2200 / Math.max(img.width, img.height)), up = Math.max(img.width, img.height) < 1200 ? 1.6 : 1;
      const c = document.createElement("canvas"); c.width = Math.round(img.width * sc * up); c.height = Math.round(img.height * sc * up);
      const g = c.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(img, 0, 0, c.width, c.height);
      const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
      for (let i = 0; i < p.length; i += 4) { let y = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]; y = y > 185 ? 255 : y < 90 ? 0 : (y - 90) * 255 / 95; p[i] = p[i + 1] = p[i + 2] = y; }
      g.putImageData(d, 0, 0); URL.revokeObjectURL(url); res({ canvas:c, preview:c.toDataURL("image/jpeg", .6) });
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("img")); };
    img.src = url;
  });
}
const digits = s => String(s || "").replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
const DAYN = DAYS.map(norm);
function parseLine(t, ctx){
  const n = norm(t), k = nkey(t), out = {};
  const days = []; DAYN.forEach((d, i) => { const dd = d.replace(/^ال/, ""); if (n.includes(dd)) days.push(i); });
  if (/يومي/.test(n)) { out.daily = true; out.days = [0, 1, 2, 3, 4, 5, 6]; } else if (days.length) out.days = [...new Set(days)];
  const tm = /الفجر|الصبح/.test(n) ? "بعد صلاة الفجر" : /بين المغرب والعشاء/.test(n) ? "بين المغرب والعشاء" : /العشاء/.test(n) ? "بعد صلاة العشاء" : /المغرب/.test(n) ? "بعد صلاة المغرب" : /العصر/.test(n) ? "بعد صلاة العصر" : /صلاه الجمعه/.test(n) ? "بعد صلاة الجمعة" : /صباح/.test(n) ? "صباحاً" : "";
  if (tm) out.time = tm; else { const m = t.match(/(\d{1,2}[:.]\d{2})\s*(?:-|–|إلى|الى|حتى)\s*(\d{1,2}[:.]\d{2})\s*(ص|م|مساء|صباحا)?/); if (m) out.time = `من ${m[1].replace(".", ":")} إلى ${m[2].replace(".", ":")}${m[3] ? " " + (m[3][0] === "ص" ? "ص" : "م") : ""}`; }
  let best = null; for (const m of S.mosques) { const mk = nkey(m.name); if (mk.length >= 4 && k.includes(mk) && (!best || mk.length > nkey(best.name).length)) best = m; }
  if (best) { out.mosque = best.id; out.gov = best.gov || ""; }
  const g = GOVS.find(x => n.includes(norm(x))); if (g && !out.gov) out.gov = g;
  let lect = ctx.lects.find(l => l.k.length > 5 && k.includes(l.k));
  if (lect) out.lect = lect.name;
  else { const m = t.match(/(?:الشيخ|الشيح|مولانا|الداعية|المحاضر|الدكتور|د\.)[ \t]*[:：]?[ \t]*([؀-ۿ]+(?:[ \t]+[؀-ۿ]+){1,3})/); if (m) out.lect = m[1].trim(); }
  return out;
}
function parseActs(raw){
  const text = digits(raw); const n = norm(text);
  const ctx = { lects:[...new Set(S.E.flatMap(e => (e.lect || "").split(" / ")).filter(Boolean))].map(name => ({ name, k:nkey(name) })) };
  const base = {};
  const dm = text.match(/\b(\d{4})\s*[-–]\s*(\d{4})\b/); if (dm) base.doc = `${dm[1]}-${dm[2]}`;
  for (const d of S.docs) if (d.no && text.replace(/\s/g, "").includes(d.no.replace(/\s/g, ""))) { base.doc = d.no; break; }
  const dates = [];
  for (const m of text.matchAll(/\b(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{4})\b/g)) { const y = +m[3], mo = +m[2], d = +m[1]; if (y > 1990 && y < 2100 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) dates.push(`${y}-${pad(mo)}-${pad(d)}`); }
  for (const m of text.matchAll(/\b(\d{4})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\b/g)) { const y = +m[1], mo = +m[2], d = +m[3]; if (y > 1990 && y < 2100 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) dates.push(`${y}-${pad(mo)}-${pad(d)}`); }
  dates.sort(); if (!docBy[base.doc] && dates.length) { base.start = dates[0]; if (dates.length > 1) base.end = dates[dates.length - 1]; }
  base.type = /دور(ه|ات)\b|دوره|دورات/.test(n) ? "دورة علمية" : /محاضر(ه|ة|ات)/.test(n) && !/(^|\s)(درس|دروس)/.test(n.replace(/محاضر(ه|ة|ات)/g, "")) ? "محاضرة دينية" : /محاضر(ه|ة|ات)/.test(n) ? "محاضرة دينية" : "درس ديني";
  let comm = ""; let cl = 0; for (const c of commNames) { const ck = nkey(c).replace(/^ال/, ""); const parts = norm(c).split(/[–\-\s]+/).map(x => nkey(x).replace(/^ال/, "")).filter(x => x.length >= 4);
    if (ck.length >= 4 && nkey(text).includes(ck) && ck.length > cl) { comm = c; cl = ck.length; } else if (!comm && parts.length && parts.every(p => nkey(text).includes(p))) comm = c; }
  if (!comm && docBy[base.doc]?.comm) comm = docBy[base.doc].comm; if (comm) base.comm = comm;
  const whole = parseLine(text, ctx);
  const lines = text.split(/\n+/).map(x => x.trim()).filter(x => x.length > 3);
  const items = []; const seen = new Set();
  for (const l of lines) { const p = parseLine(l, ctx); if (p.mosque && !seen.has(p.mosque + (p.days || []).join() + (p.time || ""))) { seen.add(p.mosque + (p.days || []).join() + (p.time || "")); items.push(p); } }
  const merge = p => ({ ...base, days:whole.days || [], daily:!!whole.daily, time:whole.time || "", lect:items.length > 1 ? "" : whole.lect || "", gov:whole.gov || "", mosque:whole.mosque || "", ...Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== "")), status:"مجدول" });
  const acts = items.length > 1 ? items.map(merge) : [merge(items[0] || {})];
  return { acts, text };
}
function ocrPick(){
  if (!S.canWrite) return toast("صلاحيتك عرض فقط");
  const i = document.createElement("input"); i.type = "file"; i.accept = "image/*";
  i.onchange = () => i.files[0] && ocrRun(i.files[0]); i.click();
}
async function ocrRun(file){
  if (!S.canWrite) return toast("صلاحيتك عرض فقط");
  openDrawer("إضافة نشاط من صورة", `<div class="ocr-wait"><div id="ocr-prev" class="ocr-prev"></div><b id="ocr-st">جارٍ تجهيز الصورة…</b><div class="ocr-bar"><i id="ocr-p" style="width:3%"></i></div><span class="hint">القراءة تتم داخل جهازك مجاناً. أول مرة تحتاج دقيقة لتحميل أداة القراءة العربية، وبعدها تصبح أسرع.</span></div>`, `<button class="btn btn-ghost" data-close>إلغاء</button>`);
  S.form = { kind:"ocr" };
  try {
    const { canvas, preview } = await prepImage(file);
    if (S.form?.kind !== "ocr") return;
    $("#ocr-prev").innerHTML = `<img src="${preview}" alt="">`;
    const set = (t, p) => { const a = $("#ocr-st"), b = $("#ocr-p"); if (a) a.textContent = t; if (b && p !== undefined) b.style.width = Math.max(3, Math.round(p * 100)) + "%"; };
    set("جارٍ تحميل أداة القراءة…", .05);
    const w = await getWorker(m => { if (m.status === "recognizing text") set("جارٍ قراءة النص من الصورة…", .35 + m.progress * .65); else if (/load|initializ/.test(m.status)) set("جارٍ تحميل أداة القراءة العربية…", .05 + (m.progress || 0) * .3); });
    const { data } = await w.recognize(canvas);
    if (S.form?.kind !== "ocr") return;
    const res = parseActs(data.text || "");
    S.ocr = { ...res, preview };
    if (!(data.text || "").trim()) { $("#ocr-st").textContent = "لم أستطع قراءة نص من الصورة. جرّب صورة أوضح ومستقيمة."; return; }
    if (res.acts.length === 1) { closeDrawer(); actForm(undefined, res.acts[0]); ocrNote(); toast("عُبّئت البيانات من الصورة، راجعها ثم احفظ"); }
    else ocrReview();
  } catch (e) { console.error(e); const a = $("#ocr-st"); if (a) a.textContent = e?.message === "load" ? "تعذّر تحميل أداة القراءة. تأكد من الاتصال بالإنترنت ثم حاول مرة أخرى." : "تعذّرت قراءة الصورة. جرّب صورة أخرى."; }
}
function ocrNote(){
  const o = S.ocr; if (!o || !$(".drawer-b")) return;
  $(".drawer-b").insertAdjacentHTML("afterbegin", `<details class="ocr-src"><summary>${icon("i-cam", 15)} عُبّئ من صورة، اضغط لعرض الصورة والنص المقروء</summary><img src="${o.preview}" alt=""><pre>${esc(o.text.trim())}</pre></details>`);
  const miss = []; const v = readAct(); if (!v.comm) miss.push("الجالية"); if (!v.mosque) miss.push("المسجد"); if (!v.days.length) miss.push("اليوم"); if (!v.lect) miss.push("المحاضر");
  if (miss.length) $(".ocr-src").insertAdjacentHTML("afterend", `<div class="check warn"><b>أكمل يدوياً</b><span>لم يُتعرّف من الصورة على: ${miss.join("، ")}</span></div>`);
}
function ocrReview(){
  const o = S.ocr; S.form = { kind:"ocr" };
  const line = a => [a.comm, a.mosque ? "مسجد " + (mosBy[a.mosque]?.name || "") : "", a.daily ? "يومياً" : (a.days || []).map(d => DAYS[d]).join("، "), a.time, a.lect].filter(Boolean).join(" · ");
  openDrawer(`تعرّفتُ على ${o.acts.length} أنشطة في الصورة`, `
    <div class="ocr-prev sm"><img src="${o.preview}" alt=""></div>
    <div class="hint">حدّد الأنشطة المراد إضافتها. البيانات المشتركة: ${esc([o.acts[0].type, o.acts[0].doc ? "وثيقة " + o.acts[0].doc : "", o.acts[0].start ? fmt(o.acts[0].start) + " ← " + fmt(o.acts[0].end) : ""].filter(Boolean).join(" · "))}</div>
    <div class="list ocr-list">${o.acts.map((a, i) => `<label class="li"><input type="checkbox" data-oc="${i}" checked><span>${esc(line(a) || "—")}</span><button type="button" class="btn btn-ghost" data-oedit="${i}">مراجعة</button></label>`).join("")}</div>
    <details class="ocr-src"><summary>النص المقروء من الصورة</summary><pre>${esc(o.text.trim())}</pre></details>`,
    `<button class="btn btn-primary" id="ocr-addall">إضافة المحدد</button><button class="btn btn-ghost" data-close>إلغاء</button>`);
}
async function ocrAddAll(){
  const o = S.ocr; const sel = [...document.querySelectorAll("[data-oc]")].filter(x => x.checked).map(x => o.acts[+x.dataset.oc]);
  if (!sel.length) return toast("حدّد نشاطاً واحداً على الأقل");
  const bad = sel.filter(a => !a.comm); if (bad.length) return toast("الجالية غير معروفة، اضغط «مراجعة» واخترها");
  const b = $("#ocr-addall"); b.disabled = true;
  let n = Math.max(0, ...[...S.acts.values()].map(a => a.n || 0));
  try { for (const a of sel) { n++; const d = docBy[a.doc]; const body = { ...a, n }; if (d) { if (body.start === d.start) body.start = ""; if (body.end === d.end) body.end = ""; } await T.put("acts", null, body); }
    closeDrawer(); toast(`أُضيف ${sel.length} أنشطة من الصورة`); }
  catch (e) { b.disabled = false; writeFail(e); }
}
document.addEventListener("click", ev => {
  const t = ev.target.closest("button"); if (!t) return;
  if (t.id === "ocr-top" || t.dataset.ocr !== undefined) { ev.stopPropagation(); return ocrPick(); }
  if (t.id === "ocr-addall") return ocrAddAll();
  if (t.dataset.oedit !== undefined) { const a = S.ocr.acts[+t.dataset.oedit]; closeDrawer(); actForm(undefined, a); ocrNote(); }
}, true);
document.addEventListener("paste", ev => {
  if (!S.ready || !S.canWrite || PAL.open) return;
  const a = document.activeElement; if (a && /^(INPUT|TEXTAREA)$/.test(a.tagName)) return;
  const f = [...(ev.clipboardData?.items || [])].find(x => x.type.startsWith("image/"))?.getAsFile(); if (f) { ev.preventDefault(); ocrRun(f); }
});
/* "from photo" button inside the new-activity form */
const _actForm3 = actForm;
actForm = function(id, preset){ _actForm3(id, preset); if (!id && S.form?.kind === "act" && S.canWrite && !preset) $(".drawer-b")?.insertAdjacentHTML("afterbegin", `<button type="button" class="ocr-cta" data-ocr>${icon("i-cam", 20)}<span><b>عندك صورة الكتاب أو الإعلان؟</b><br><span class="s">صوّرها وأنا أعبّئ البيانات تلقائياً</span></span></button>`); };
