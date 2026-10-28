/* ================= v10: intake inbox, Copilot vision, letters, WhatsApp, weekly sheet, attendance, alerts, voice, reports, backups ================= */
Object.assign(TITLES, { inbox:"طلبات المنسقين", weekly:"الجدول الأسبوعي", backups:"النسخ الاحتياطية" });
S.reqs = []; S.att = [];
const RQ_ST = ["جديد", "قيد المراجعة", "بانتظار الموافقة", "معتمد", "مرفوض"];
const RQ_C = { "جديد":"gold", "قيد المراجعة":"t1", "بانتظار الموافقة":"warn", "معتمد":"ok", "مرفوض":"bad" };
const cm1 = (y, m) => `${y}-${pad(m + 1)}`;
const addDays = (iso, n) => { const d = dOf(iso); d.setDate(d.getDate() + n); return isoOf(d); };
const addMonths = (iso, n) => { const d = dOf(iso); d.setMonth(d.getMonth() + n); return isoOf(d); };
const DEPT = "إدارة العلاقات الخارجية، قسم الجاليات ورعاية المهتدين وطلبة البعوث";

/* ---------- data ---------- */
async function loadReqs(){ const { data, error } = await sb.from("requests").select("*").order("created_at", { ascending:false }).limit(1000); if (!error) S.reqs = data || []; }
async function loadAtt(){ const { data, error } = await sb.from("attendance").select("*").order("day", { ascending:false }).limit(5000); if (!error) S.att = data || []; }
let x11Channel = null;
function live11(){
  if (x11Channel) sb.removeChannel(x11Channel);
  const up = (L, p) => p.eventType === "DELETE" ? L.filter(x => x.id !== p.old?.id) : [p.new, ...L.filter(x => x.id !== p.new.id)];
  x11Channel = sb.channel("x11")
    .on("postgres_changes", { event:"*", schema:"public", table:"requests" }, p => { S.reqs = up(S.reqs, p); if (p.eventType === "INSERT" && p.new.created_by !== S.me?.id) { toast(`طلب وارد جديد: ${p.new.data?.org || p.new.data?.comm || ""}`); devNotify("طلب وارد جديد", p.new.data?.org || p.new.data?.comm || "افتح طلبات المنسقين"); } bellRefresh(); if (["inbox", "home"].includes(S.view) && $("#drawer").hidden) render(); })
    .subscribe();
}

/* ---------- tolerant act normalizer (for requests) ---------- */
function tolAct(src, base = {}){
  const a = { type:"درس ديني", comm:"", mosque:"", mosRaw:"", gov:"", days:[], daily:false, time:"", lect:"", title:"", start:"", end:"", doc:"", notes:"", ...base };
  for (const [k, v] of Object.entries(src || {})) {
    if (v === null || v === undefined || v === "") continue;
    if (k === "days") { const raw = Array.isArray(v) ? v : String(v).split(/[،,و\s]+/); if (/يومي/.test(JSON.stringify(v))) { a.daily = true; a.days = [0,1,2,3,4,5,6]; } else a.days = [...new Set(raw.map(x => typeof x === "number" ? x : dayIdx(x)).filter(x => x >= 0))]; }
    else if (k === "mosque") { if (mosBy[v]) { a.mosque = v; continue; } const m = mosByName(v, src.gov || a.gov); a.mosRaw = String(v).replace(/^مسجد\s*/, ""); if (m) { a.mosque = m.id; if (!a.gov) a.gov = m.gov || ""; } }
    else if (k === "comm") a.comm = commByName(v) || String(v);
    else if (k === "type") a.type = TYPES.includes(v) ? v : /دور/.test(v) ? "دورة علمية" : /محاضر/.test(v) ? "محاضرة دينية" : "درس ديني";
    else if (["gov", "time", "lect", "title", "start", "end", "doc", "notes", "mosRaw"].includes(k)) a[k] = String(v);
    else if (k === "daily") a.daily = !!v;
  }
  return a;
}
const actLine = a => [a.type, a.mosque && mosBy[a.mosque] ? "مسجد " + mosBy[a.mosque].name : a.mosRaw ? "مسجد " + a.mosRaw + " (غير مسجل)" : "", a.gov, a.daily ? "يومياً" : (a.days || []).map(d => DAYS[d]).join("، "), a.time, a.lect].filter(Boolean).join(" · ");
/* find an existing activity that matches (duplicate / already added) */
function actMatch(a){
  if (!a.mosque) return null; const sl = slot(a.time);
  return S.E.find(e => e.mosque === a.mosque && (!a.comm || e.comm === a.comm) && !["ملغى"].includes(e.st) && (a.days || []).some(d => e.days.includes(d)) && (!sl || !e.sl || (sl[0] < e.sl[1] && e.sl[0] < sl[1])) && (!e.end || e.end >= TODAY)) || null;
}

/* ---------- Copilot send queue (one message at a time, waits for each reply) ---------- */
BR.q = []; BR.busy = false;
function brPost(m){ BR.q.push(m); brPump(); }
function brPump(){
  const f = $("#br-frame"); if (!f || !BR.ready || BR.busy || !BR.q.length) return;
  BR.busy = true; const m = BR.q.shift();
  if (m.intake) { INTAKE.waiting = true; INTAKE.sent = true; }
  f.contentWindow.postMessage(m, "https://m365.cloud.microsoft");
  clearTimeout(BR.bt); BR.bt = setTimeout(() => { BR.busy = false; brPump(); }, 240000);
  const st = $("#br-st"); if (st) st.textContent = m.file ? "جارٍ إرفاق الملف لـ Copilot…" : "أُرسل، Copilot يكتب الرد…";
}
brPrime = function(){
  if (BR.primed) return; BR.primed = true;
  if (brV() >= 1.1) brPost({ type:"jaliyat-ask", text:PRIME_MSG, file:{ name:`بيانات-نظام-الجاليات-${TODAY}.md`, content:sysMarkdown(), type:"text/markdown" } });
  else brPost({ type:"jaliyat-ask", text:`${PRIME_MSG.replace("مرفق ملف «بيانات نظام أنشطة الجاليات»", "هذه بيانات «نظام أنشطة الجاليات»")}\n\n${cpData("", 14000)}` });
  if (BR.pending) { const t = BR.pending; BR.pending = ""; brPost({ type:"jaliyat-ask", text:t }); }
  if (INTAKE.msg) { brPost(INTAKE.msg); INTAKE.msg = null; }
};
brSend = function(q, withData){
  q = String(q || "").trim(); if (!q) return toast("اكتب سؤالك أولاً");
  brPost({ type:"jaliyat-ask", text:withData && !BR.primed ? `${q}\n\n${cpData(q)}` : q });
  const qi = $("#br-q"); if (qi) qi.value = "";
  if (!BR.ready) { const st = $("#br-st"); if (st) st.textContent = "سيُرسل فور جاهزية Copilot…"; }
};
window.addEventListener("message", e => {
  if (!/^https:\/\/m365\.cloud\.microsoft$/.test(e.origin)) return;
  const t = e.data?.type;
  if (t === "jaliyat-reply") { BR.busy = false; clearTimeout(BR.bt); setTimeout(brPump, 600); if (INTAKE.waiting) intakeReply(String(e.data.text || "")); }
  if (t === "jaliyat-copilot-ready") setTimeout(brPump, 300);
  if (t === "jaliyat-copilot-status" && e.data.s === "uploading") { const st = $("#br-st"); if (st) st.textContent = "جارٍ رفع الملف إلى Copilot…"; }
});
const _afterRender11 = afterRender;
afterRender = function(v){ _afterRender11(v); if (v === "copilot") { BR.busy = false; BR.q = []; } };

/* ---------- Copilot knows the new tables + new commands ---------- */
const _sysMd11 = sysMarkdown;
sysMarkdown = function(){
  let out = _sysMd11();
  const T2 = (head, rows) => `| ${head.join(" | ")} |\n|${head.map(() => "---").join("|")}|\n` + rows.map(r => `| ${r.map(x => String(x ?? "").replace(/\|/g, "/").replace(/\s+/g, " ").trim() || "—").join(" | ")} |`).join("\n");
  if (S.reqs.length) out += `\n\n## طلبات المنسقين (${S.reqs.length})\n` + T2(["التاريخ", "الجهة", "الجالية", "المنسق", "الحالة", "عدد الأنشطة", "الأنشطة", "ملاحظات"], S.reqs.slice(0, 200).map(r => [fmt(r.data?.date || r.created_at?.slice(0, 10)), r.data?.org, r.data?.comm, r.data?.coord, r.status, (r.data?.acts || []).length, (r.data?.acts || []).map(actLine).join(" / "), r.data?.notes]));
  if (false) { const from = addMonths(TODAY, -3); out += `\n\n## سجل الحضور والمهتدين (آخر 3 أشهر)\n` + T2(["التاريخ", "النشاط", "الجالية", "المسجد", "الحضور", "المهتدون الجدد", "ملاحظة"], S.att.filter(x => x.day >= from).map(x => { const e = S.byId.get(x.act_id); return [fmt(x.day), e ? "#" + e.n : "—", e?.comm, e?.mosName, x.cnt, x.converts, x.note]; })); }
  return out;
};
PRIME_MSG = PRIME_MSG.replace("مثال:", `- {"op":"add_request","data":{"org":"الجهة الطالبة","comm":"الجالية","coord":"اسم المنسق أو الموقّع","phone":"","date":"تاريخ الطلب","subj":"موضوع الطلب","acts":[ نفس حقول add_act لكل نشاط مطلوب ],"notes":"","issues":"النواقص أو الملاحظات على الطلب"}}  ← للطلبات الواردة التي لم تصدر لها موافقة بعد
مثال:`);

const _describe11 = describe;
describe = function(a){
  if (a.op === "add_request") { const d = a.data || {}; return ["تسجيل طلب وارد", `${d.org || ""}، ${d.comm || ""}، ${(d.acts || []).length} نشاط${d.issues ? "، نواقص: " + d.issues : ""}`, "gold"]; }
  if (a.op === "log_attendance") return [`حضور النشاط #${a.n}`, `${fmt(a.day)}، الحضور ${a.cnt || 0}، مهتدون ${a.converts || 0}`, "ok"];
  const r = _describe11(a);
  if (a.op === "add_act") { try { const m = actMatch(tolAct(a.data)); if (m) r[1] += ` ⚠ مشابه للنشاط #${m.n}`; } catch (_) {} }
  return r;
};
const _runAction11 = runAction;
runAction = async function(a){
  if (a.op === "add_request") { const d = a.data || {}; const body = { org:d.org || "", comm:commByName(d.comm) || d.comm || "", coord:d.coord || "", phone:d.phone || "", date:d.date || TODAY, subj:d.subj || "", notes:d.notes || "", issues:d.issues || "", acts:(d.acts || []).map(x => tolAct(x, { comm:commByName(d.comm) || "" })), src:"copilot" };
    if (INTAKE.reqId) { const cur = S.reqs.find(r => r.id === INTAKE.reqId); const { error } = await sb.from("requests").update({ data:{ ...(cur?.data || {}), ...body }, updated_at:new Date().toISOString() }).eq("id", INTAKE.reqId); if (error) throw error; const id = INTAKE.reqId; INTAKE.reqId = null; await loadReqs(); setTimeout(() => toast("سُجّل الطلب، افتحه من «طلبات المنسقين»"), 50); return `سُجّل الطلب (${body.acts.length} نشاط) في طلبات المنسقين`; }
    const { error } = await sb.from("requests").insert({ data:body, status:"جديد" }); if (error) throw error; await loadReqs(); return "سُجّل الطلب في طلبات المنسقين"; }
  if (a.op === "log_attendance") { const e = S.E.find(x => x.n === +a.n); if (!e) throw new Error(`النشاط #${a.n} غير موجود`); await attSave(e.id, a.day || TODAY, a.cnt, a.converts, a.note); return `سُجّل حضور النشاط #${a.n}`; }
  if (a.op === "add_act" && !a.force) { const m = actMatch(tolAct(a.data)); if (m) throw new Error(`يوجد نشاط مشابه مسجل (#${m.n})، لم يُكرر`); }
  return _runAction11(a);
};

/* =============== 1) Intake: requests from photos / PDFs =============== */
const INTAKE = { files:[], waiting:false, reqId:null, msg:null, timer:null };
const isImg = f => /^image\//.test(f.type), isPdf = f => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
function intakeOpen(files){
  if (!S.canWrite) return toast("صلاحيتك عرض فقط");
  INTAKE.files = []; S.form = { kind:"intake" };
  const cp = hasBridge() && brV() >= 1.1;
  openDrawer("استقبال طلب من صور أو ملف", `
    <label class="iz" id="iz"><input type="file" id="iz-in" accept="image/*,application/pdf" multiple hidden>${icon("i-cam", 30)}<b>اسحب صور الطلب أو الكتاب هنا، أو اضغط للاختيار</b><span class="s">صور (حتى 6) أو ملف PDF، يمكنك أيضاً اللصق Ctrl+V</span></label>
    <div class="iz-files" id="iz-files"></div>
    <div class="iz-mode ${cp ? "ok" : ""}">${cp ? `${icon("i-spark", 18)}<span><b>التحليل بـ Microsoft 365 Copilot</b><br><span class="s">يقرأ الصورة بدقة عالية، يفرز البيانات، يقارنها بالنظام، ثم يعرض لك الأوامر للتنفيذ.</span></span>` : `${icon("i-cam", 18)}<span><b>القراءة على الجهاز</b><br><span class="s">لتحليل أدق بـ Copilot ثبّت/حدّث «جسر Copilot» إلى 1.1 من صفحة Copilot.</span></span>`}</div>
    <div class="fld"><label for="iz-note">ملاحظة مع الطلب (اختياري)</label><input class="f" id="iz-note" placeholder="مثال: وصل عبر الواتساب من منسق الجالية"></div>`,
    `<button class="btn btn-primary" id="iz-go" disabled>${icon("i-spark")} تحليل وإدخال تلقائي</button><button class="btn btn-ghost" data-close>إلغاء</button>`);
  if (files?.length) intakeAdd(files);
}
function intakeAdd(list){
  for (const f of list) { if (!(isImg(f) || isPdf(f))) continue; if (INTAKE.files.length >= 8) break; INTAKE.files.push(f); }
  const box = $("#iz-files"); if (!box) return;
  box.innerHTML = INTAKE.files.map((f, i) => `<div class="iz-f">${isImg(f) ? `<img src="${URL.createObjectURL(f)}" alt="">` : `<span class="pdf">PDF</span>`}<span class="s">${esc(f.name.slice(0, 26))}</span><button type="button" class="x" data-izrm="${i}" aria-label="حذف">×</button></div>`).join("");
  const b = $("#iz-go"); if (b) b.disabled = !INTAKE.files.length;
}
function compressImg(file, max = 2000, q = .88){
  return new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image();
    im.onload = () => { const sc = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement("canvas"); c.width = Math.round(im.width * sc); c.height = Math.round(im.height * sc); const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); c.toBlob(b => res({ blob:b, canvas:c }), "image/jpeg", q); };
    im.onerror = () => { URL.revokeObjectURL(u); rej(new Error("img")); }; im.src = u; });
}
function stitch(canvases){
  if (canvases.length === 1) return new Promise(r => canvases[0].toBlob(r, "image/jpeg", .9));
  const cols = canvases.length > 3 ? 2 : 1, W = cols === 1 ? 1500 : 1100;
  const sized = canvases.map(c => ({ c, h:Math.round(c.height * W / c.width) }));
  const rows = []; for (let i = 0; i < sized.length; i += cols) rows.push(sized.slice(i, i + cols));
  const H = rows.reduce((s, r) => s + Math.max(...r.map(x => x.h)) + 24, 0);
  const out = document.createElement("canvas"); out.width = W * cols + 24 * (cols - 1); out.height = H; const g = out.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, out.width, out.height);
  let y = 0; for (const r of rows) { r.forEach((x, j) => g.drawImage(x.c, j * (W + 24), y, W, x.h)); y += Math.max(...r.map(x => x.h)) + 24; }
  return new Promise(r => out.toBlob(r, "image/jpeg", .9));
}
const INTAKE_PROMPT = `مرفق صورة/ملف «طلب وارد» لقسم الجاليات. المطلوب بدقة عالية:
1) اقرأ كل ما في المرفق (عربي/إنجليزي/أوردو…): الجهة، الجالية، المسجد والمنطقة والمحافظة، الأيام، الأوقات، المحاضرين، التواريخ والمدة، رقم الكتاب أو الوثيقة، اسم المنسق أو الموقّع وهاتفه.
2) قارن بملف بيانات النظام: طابق أسماء المساجد والجاليات كما هي في الملف، وتحقق هل يوجد نشاط مسجل مشابه (نفس المسجد واليوم والوقت) أو تعارض مع نشاط آخر.
3) صنّف المرفق:
   أ) إن كان كتاب موافقة صادراً (فيه رقم وثيقة مثل 2609-1234 مع موافقة أو «لا مانع»): استخدم add_doc (إن لم تكن الوثيقة موجودة) ثم add_act لكل نشاط غير مسجل.
   ب) إن كان طلباً وارداً لم تصدر له موافقة: استخدم add_request واحداً يحوي كل الأنشطة المطلوبة. المدة لا تتجاوز 6 أشهر.
4) اكتب بإيجاز ما فهمته والنواقص (مسجد غير مسجل، وقت غير واضح، مدة ناقصة، اسم منسق مفقود…) ثم ضع كتلة jaliyat-actions في النهاية.`;
async function intakeGo(){
  const files = INTAKE.files.slice(); if (!files.length) return;
  const note = $("#iz-note")?.value.trim() || "";
  const b = $("#iz-go"); b.disabled = true; b.textContent = "جارٍ الرفع…";
  /* 1) keep originals in the request's record */
  const rid = uuid4(); const paths = [];
  const canvases = []; let pdf = null;
  try {
    for (const f of files) {
      if (isImg(f)) { const { blob, canvas } = await compressImg(f); canvases.push(canvas); const p = `${rid}/${paths.length + 1}.jpg`; const up = await sb.storage.from("requests").upload(p, blob, { contentType:"image/jpeg" }); if (!up.error) paths.push(p); }
      else { pdf = pdf || f; const p = `${rid}/${paths.length + 1}.pdf`; const up = await sb.storage.from("requests").upload(p, f, { contentType:"application/pdf" }); if (!up.error) paths.push(p); }
    }
    const { error } = await sb.from("requests").insert({ id:rid, data:{ date:TODAY, notes:note, acts:[], src:"intake" }, status:"جديد", files:paths });
    if (error) throw error;
  } catch (e) { b.disabled = false; b.textContent = "تحليل وإدخال تلقائي"; return writeFail(e); }
  await loadReqs();
  /* 2) Copilot vision when the bridge is ready, otherwise on-device reading */
  if (hasBridge() && brV() >= 1.1) {
    const file = pdf && !canvases.length ? { name:pdf.name, content:pdf, type:"application/pdf" } : { name:`طلب-${TODAY}.jpg`, content:await stitch(canvases.length ? canvases : []), type:"image/jpeg" };
    if (pdf && canvases.length) toast("أُرسلت الصور لـ Copilot؛ ملف PDF محفوظ في الطلب");
    INTAKE.reqId = rid; INTAKE.waiting = false; INTAKE.sent = false;
    const msg = { type:"jaliyat-ask", intake:true, text:INTAKE_PROMPT + (note ? `\nملاحظة الموظف: ${note}` : ""), file };
    closeDrawer();
    if (S.view === "copilot" && BR.primed) brPost(msg); else { INTAKE.msg = msg; go("copilot"); }
    clearTimeout(INTAKE.timer);
    INTAKE.timer = setTimeout(() => { if (INTAKE.reqId === rid && !INTAKE.sent) { INTAKE.waiting = false; INTAKE.reqId = null; INTAKE.msg = null; toast("Copilot لم يجهز، أكمل القراءة على الجهاز"); intakeLocal(rid, files); } }, 60000);
    toast("أُرسل الطلب لـ Copilot للتحليل…");
  } else { closeDrawer(); intakeLocal(rid, files); }
}
function intakeReply(text){
  INTAKE.waiting = false; clearTimeout(INTAKE.timer);
  const rid = INTAKE.reqId; if (!rid) return;
  const r = S.reqs.find(x => x.id === rid);
  sb.from("requests").update({ data:{ ...(r?.data || {}), ai:text.slice(0, 20000) } }).eq("id", rid).then(() => loadReqs());
  const acts = findActions(text);
  if (!acts.some(a => a.op === "add_request")) setTimeout(() => { if (INTAKE.reqId === rid && !acts.length) { INTAKE.reqId = null; toast("لم يُرجع Copilot أوامر، راجع الطلب يدوياً"); } }, 100);
  if (acts.length && !acts.some(a => a.op === "add_request")) { /* approval letter → mark the request done once applied */ const t = S.reqs.find(x => x.id === rid); if (t) sb.from("requests").update({ status:"معتمد" }).eq("id", rid); INTAKE.reqId = null; }
}
/* on-device reading (fallback), stronger preprocessing + PDF text */
function loadScript(src){ return new Promise((res, rej) => { if ([...document.scripts].some(s => s.src === src)) return res(); const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("load")); document.head.appendChild(s); }); }
async function pdfText(file){
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const doc = await pdfjsLib.getDocument({ data:await file.arrayBuffer() }).promise; let txt = ""; const pages = [];
  for (let i = 1; i <= Math.min(doc.numPages, 6); i++) { const pg = await doc.getPage(i); const tc = await pg.getTextContent(); txt += tc.items.map(x => x.str).join(" ") + "\n";
    if (tc.items.length < 10) { const vp = pg.getViewport({ scale:2 }); const c = document.createElement("canvas"); c.width = vp.width; c.height = vp.height; await pg.render({ canvasContext:c.getContext("2d"), viewport:vp }).promise; pages.push(c); } }
  return { txt, pages };
}
prepImage = function(file){ /* Otsu threshold + upscale small images */
  return new Promise((res, rej) => {
    const go2 = img => {
      const big = Math.max(img.width, img.height), sc = big > 2600 ? 2600 / big : big < 1400 ? 1400 / big : 1;
      const c = document.createElement("canvas"); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      const g = c.getContext("2d"); g.imageSmoothingQuality = "high"; g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      const d = g.getImageData(0, 0, c.width, c.height), p = d.data, hist = new Array(256).fill(0), Y = new Uint8ClampedArray(p.length / 4);
      for (let i = 0, j = 0; i < p.length; i += 4, j++) { Y[j] = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]; hist[Y[j]]++; }
      let sum = 0; for (let t = 0; t < 256; t++) sum += t * hist[t]; let sB = 0, wB = 0, best = 0, th = 150; const N = Y.length;
      for (let t = 0; t < 256; t++) { wB += hist[t]; if (!wB) continue; const wF = N - wB; if (!wF) break; sB += t * hist[t]; const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) ** 2; if (v > best) { best = v; th = t; } }
      for (let i = 0, j = 0; i < p.length; i += 4, j++) { const y = Y[j] > th + 12 ? 255 : Y[j] < th - 12 ? 0 : (Y[j] - th + 12) * 255 / 24; p[i] = p[i + 1] = p[i + 2] = y; }
      g.putImageData(d, 0, 0); res({ canvas:c, preview:c.toDataURL("image/jpeg", .6) });
    };
    if (file instanceof HTMLCanvasElement) return go2(file);
    const url = URL.createObjectURL(file), img = new Image(); img.onload = () => { URL.revokeObjectURL(url); go2(img); }; img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("img")); }; img.src = url;
  });
};
async function intakeLocal(rid, files){
  openDrawer("قراءة الطلب على الجهاز", `<div class="ocr-wait"><b id="ocr-st">جارٍ التجهيز…</b><div class="ocr-bar"><i id="ocr-p" style="width:3%"></i></div><span class="hint">القراءة تتم داخل جهازك. أول مرة تحتاج دقيقة لتحميل أداة القراءة العربية.</span></div>`, `<button class="btn btn-ghost" data-close>إخفاء</button>`);
  S.form = { kind:"ocr" };
  const set = (t, p) => { const a = $("#ocr-st"), b = $("#ocr-p"); if (a) a.textContent = t; if (b && p !== undefined) b.style.width = Math.max(3, Math.round(p * 100)) + "%"; };
  let text = "";
  try {
    const items = [];
    for (const f of files) { if (isPdf(f)) { set("جارٍ قراءة ملف PDF…", .05); const { txt, pages } = await pdfText(f); text += txt + "\n"; items.push(...pages); } else items.push(f); }
    for (let i = 0; i < items.length; i++) {
      const { canvas } = await prepImage(items[i]);
      const w = await getWorker(m => { if (m.status === "recognizing text") set(`جارٍ قراءة الصورة ${i + 1} من ${items.length}…`, (i + m.progress) / items.length); else if (/load|initializ/.test(m.status)) set("جارٍ تحميل أداة القراءة العربية…", .05); });
      const { data } = await w.recognize(canvas); text += (data.text || "") + "\n";
    }
  } catch (e) { set("تعذّرت القراءة: " + (e?.message === "load" ? "تأكد من الإنترنت" : "جرّب صورة أوضح")); return; }
  const res = parseActs(text);
  const acts = res.acts.map(a => tolAct(a));
  const coordM = text.match(/(?:المنسق|منسق الجالية|مقدم الطلب|الموقع)[:\s]*([؀-ۿ]+(?:\s+[؀-ۿ]+){1,3})/), phoneM = digits(text).match(/\b(?:\+?965)?\s*([569]\d{7})\b/);
  const r = S.reqs.find(x => x.id === rid);
  const data = { ...(r?.data || {}), acts, comm:acts[0]?.comm || "", coord:coordM?.[1] || "", phone:phoneM?.[1] || "", text:text.slice(0, 20000), src:"ocr" };
  await sb.from("requests").update({ data }).eq("id", rid); await loadReqs();
  closeDrawer(); reqForm(rid); toast(acts.length ? `تعرّفتُ على ${acts.length} نشاط، راجعها` : "لم أتعرّف على أنشطة واضحة، أكمل يدوياً");
}
ocrPick = function(){ intakeOpen(); };
ocrRun = function(file){ intakeOpen([file]); };

/* =============== 2) Inbox page + request form =============== */
function vInbox(){
  const tab = S.f.rqt || "open";
  const L = S.reqs.filter(r => tab === "all" ? true : tab === "open" ? !["معتمد", "مرفوض"].includes(r.status) : r.status === tab);
  const cnt = s => S.reqs.filter(r => r.status === s).length;
  return `<div class="iz iz-top" id="iz-drop" role="button" tabindex="0">${icon("i-cam", 26)}<span><b>استقبال طلب جديد</b><br><span class="s">اسحب صور الطلب أو ملف PDF هنا، أو اضغط، يُحلَّل ويُفرز ويُدخل تلقائياً</span></span></div>
  <div class="toolbar"><div class="seg">${[["open", "المفتوحة", S.reqs.filter(r => !["معتمد", "مرفوض"].includes(r.status)).length], ...RQ_ST.map(s => [s, s, cnt(s)]), ["all", "الكل", S.reqs.length]].map(([k, l, n]) => `<button type="button" class="${tab === k ? "on" : ""}" data-rqt="${esc(k)}">${esc(l)} <span class="num">${n}</span></button>`).join("")}</div></div>
  <div class="rq-grid">${L.map(r => { const d = r.data || {}; const acts = d.acts || []; const done = acts.filter(a => actMatch(a)).length;
    return `<button type="button" class="rq-card" data-rq="${r.id}"><div class="rq-h"><span class="chip ${RQ_C[r.status] || ""}">${esc(r.status)}</span><span class="s">${fmt(d.date || r.created_at?.slice(0, 10))}</span>${(r.files || []).length ? `<span class="s">${icon("i-cam", 14)} ${r.files.length}</span>` : ""}</div>
      <b>${esc(d.org || d.subj || "طلب بدون عنوان")}</b><span class="s">${esc([d.comm, d.coord].filter(Boolean).join(" · ") || "—")}</span>
      <span class="s">${acts.length} نشاط${done ? ` · ${done} مسجّل` : ""}${d.issues ? ` · <span class="warn-t">نواقص</span>` : ""}</span></button>`; }).join("") || `<div class="empty">لا توجد طلبات هنا</div>`}</div>`;
}
const sel = (id, opts, v, ph) => `<select class="f" id="${id}"><option value="">${ph || "—"}</option>${opts.map(o => `<option${o === v ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
async function reqForm(id){
  const r = S.reqs.find(x => x.id === id); if (!r) return;
  const d = r.data || {}; S.form = { kind:"req", id }; S.rqActs = (d.acts || []).map(a => ({ ...a }));
  const coords = S.coords.filter(c => c.comm && c.comm === d.comm);
  openDrawer("طلب منسق", `
    ${(r.files || []).length ? `<div class="rq-files" id="rq-files">${r.files.map(() => `<span class="rq-ph"></span>`).join("")}</div>` : ""}
    <div class="g2">${fld("rq-org", "الجهة الطالبة", `<input class="f" id="rq-org" value="${esc(d.org || "")}"${dis()}>`)}${fld("rq-comm", "الجالية", sel("rq-comm", commNames, d.comm))}</div>
    <div class="g2">${fld("rq-coord", "المنسق / الموقّع", `<input class="f" id="rq-coord" value="${esc(d.coord || "")}" list="rq-cl"><datalist id="rq-cl">${coords.map(c => `<option value="${esc(c.name)}">`).join("")}</datalist>`)}${fld("rq-phone", "الهاتف", `<input class="f num" id="rq-phone" dir="ltr" value="${esc(d.phone || coords.find(c => c.name === d.coord)?.phone || "")}">`)}</div>
    <div class="g2">${fld("rq-date", "تاريخ الطلب", `<input class="f" type="date" id="rq-date" value="${esc(d.date || "")}">`)}${fld("rq-st", "الحالة", sel("rq-st", RQ_ST, r.status))}</div>
    ${fld("rq-subj", "الموضوع", `<input class="f" id="rq-subj" value="${esc(d.subj || "")}">`)}
    <div class="rq-sec"><b>بعد صدور الموافقة</b><div class="g3">${fld("rq-doc", "رقم الوثيقة", `<input class="f num" id="rq-doc" dir="ltr" placeholder="2609-0000" value="${esc(d.doc || "")}" list="rq-dl"><datalist id="rq-dl">${S.docs.slice(-300).map(x => `<option value="${esc(x.no)}">`).join("")}</datalist>`)}${fld("rq-s", "من", `<input class="f" type="date" id="rq-s" value="${esc(d.start || "")}">`)}${fld("rq-e", "إلى", `<input class="f" type="date" id="rq-e" value="${esc(d.end || "")}">`, "لا تتجاوز 6 أشهر")}</div></div>
    <div class="rq-sec"><div class="rq-sh"><b>الأنشطة المطلوبة</b><button type="button" class="btn btn-ghost" data-rqadd>${icon("i-plus")} نشاط</button></div><div id="rq-acts"></div></div>
    ${d.issues ? `<div class="check warn"><b>نواقص لاحظها Copilot</b><span>${esc(d.issues)}</span></div>` : ""}
    ${fld("rq-notes", "ملاحظات", `<textarea class="f" id="rq-notes" rows="2">${esc(d.notes || "")}</textarea>`)}
    ${d.ai ? `<details class="ocr-src"><summary>${icon("i-spark", 14)} تحليل Copilot</summary><pre>${esc(d.ai)}</pre></details>` : d.text ? `<details class="ocr-src"><summary>النص المقروء</summary><pre>${esc(d.text)}</pre></details>` : ""}
    <div class="rq-tools"><button type="button" class="btn" data-letter="req">${icon("i-doc")} مسودة كتاب وثيقة</button><button type="button" class="btn" data-wa="req">${icon("i-wa")} واتساب للمنسق</button>${hasBridge() ? `<button type="button" class="btn cp-ask" data-rqcp>${icon("i-spark")} حلّل بـ Copilot</button>` : ""}<button type="button" class="btn btn-ghost bad-t" data-rqdel>حذف الطلب</button></div>`,
    `<button class="btn btn-primary" data-rqsave>حفظ</button><button class="btn btn-ok" data-rqapprove>${icon("i-plus")} اعتماد وإضافة الأنشطة للنظام</button><button class="btn btn-ghost" data-close>إغلاق</button>`);
  rqActsRender();
  if ((r.files || []).length) { const box = $("#rq-files"); const urls = await Promise.all(r.files.map(p => sb.storage.from("requests").createSignedUrl(p, 3600).then(x => x.data?.signedUrl).catch(() => null)));
    if (box && S.form?.id === id) box.innerHTML = r.files.map((p, i) => urls[i] ? (/\.pdf$/.test(p) ? `<a class="rq-pdf" href="${urls[i]}" target="_blank" rel="noopener">PDF ${i + 1}</a>` : `<a href="${urls[i]}" target="_blank" rel="noopener"><img src="${urls[i]}" alt="مرفق ${i + 1}"></a>`) : "").join(""); }
}
function rqActsRender(){
  const box = $("#rq-acts"); if (!box) return;
  box.innerHTML = S.rqActs.map((a, i) => { const m = actMatch(a); return `<div class="rq-act"><span>${esc(actLine(a) || "—")}${a.title ? `<br><span class="s">${esc(a.title)}</span>` : ""}</span>
    ${m ? `<span class="chip ok" title="مسجل في النظام">#${m.n} ✓</span>` : !a.mosque ? `<span class="chip warn">المسجد غير مسجل</span>` : ""}
    <button type="button" class="btn btn-ghost" data-rqedit="${i}">مراجعة وإضافة</button><button type="button" class="x" data-rqrm="${i}" aria-label="حذف">×</button></div>`; }).join("") || `<div class="empty">لا توجد أنشطة، أضف نشاطاً أو حلّل الطلب بـ Copilot</div>`;
}
function rqRead(){
  const v = id => $("#" + id)?.value.trim() || "";
  let start = v("rq-s"), end = v("rq-e"); if (start && end && end > addMonths(start, 6)) { end = addMonths(start, 6); toast("عُدّلت المدة إلى 6 أشهر"); }
  return { org:v("rq-org"), comm:v("rq-comm"), coord:v("rq-coord"), phone:v("rq-phone"), date:v("rq-date"), subj:v("rq-subj"), doc:v("rq-doc"), start, end, notes:v("rq-notes"), status:v("rq-st") || "جديد" };
}
async function rqSave(quiet){
  const r = S.reqs.find(x => x.id === S.form?.id); if (!r) return;
  const { status, ...f } = rqRead(); const data = { ...r.data, ...f, acts:S.rqActs };
  const { error } = await sb.from("requests").update({ data, status, updated_at:new Date().toISOString() }).eq("id", r.id); if (error) return writeFail(error);
  Object.assign(r, { data, status }); if (!quiet) { toast("حُفظ الطلب"); closeDrawer(); render(); } return r;
}
async function rqApprove(){
  const f = rqRead(); if (!f.comm) return toast("اختر الجالية أولاً");
  if (!f.doc) return toast("اكتب رقم الوثيقة (الموافقة) أولاً");
  if (!docBy[f.doc] && !(f.start && f.end)) return toast("الوثيقة غير مسجلة، حدّد تاريخ البداية والنهاية");
  const todo = S.rqActs.filter(a => !actMatch({ ...a, comm:f.comm })); const bad = todo.filter(a => !a.mosque || !(a.days || []).length);
  if (bad.length) return toast(`أكمل المسجد واليوم لـ ${bad.length} نشاط (مراجعة وإضافة)`);
  try {
    if (!docBy[f.doc]) await T.ref("docs", [...S.docs, { no:f.doc, date:f.date || f.start, subj:f.subj || `موافقة ${todo[0]?.type || "نشاط"}، ${f.comm}`, comm:f.comm, start:f.start, end:f.end, notes:f.coord ? "المنسق: " + f.coord : "" }]);
    let n = Math.max(0, ...[...S.acts.values()].map(a => a.n || 0));
    for (const a of todo) { n++; const { mosRaw, ...x } = a; await T.put("acts", null, { ...x, comm:f.comm, doc:f.doc, start:"", end:"", status:"مجدول", n }); }
    $("#rq-st").value = "معتمد"; await rqSave(true); closeDrawer(); toast(`اعتُمد الطلب وأُضيف ${todo.length} نشاط`); render();
  } catch (e) { writeFail(e); }
}

/* =============== 3) Watheqa letter draft (one letter per governorate) =============== */
function letterData(src){
  if (src === "req") { const f = rqRead(); return { comm:f.comm, coord:f.coord, org:f.org, start:f.start, end:f.end, acts:S.rqActs.map(a => ({ ...a, comm:f.comm })) }; }
  const e = S.byId.get(src); if (!e) return null;
  return { comm:e.comm, coord:"", org:"", start:e.start, end:e.end, acts:[{ ...S.acts.get(e.id), mosque:e.mosque, gov:e.gov }] };
}
function letterHTML(L, gov, acts){
  const types = [...new Set(acts.map(a => a.type))].join(" و");
  let dur = "لمدة 6 أشهر"; if (L.start) { const end = L.end && L.end <= addMonths(L.start, 6) ? L.end : addMonths(L.start, 6); dur = `من ${fmt(L.start)} م إلى ${fmt(end)} م`; }
  const th = "border:1px solid #1d4d3a;padding:7px 9px;background:#1d4d3a;color:#fff;font-weight:700;text-align:center", td = "border:1px solid #9bb5a8;padding:7px 9px;text-align:center", tdz = td + ";background:#f1f6f3";
  const rows = acts.map((a, i) => { const m = mosBy[a.mosque]; const z = i % 2 ? tdz : td; return `<tr><td style="${z}">${i + 1}</td><td style="${z}">${esc(m ? "مسجد " + m.name : a.mosRaw ? "مسجد " + a.mosRaw : "—")}</td><td style="${z}">${esc(m?.area || "")}</td><td style="${z}">${esc(a.daily ? "يومياً" : (a.days || []).map(d => DAYS[d]).join("، "))}</td><td style="${z}">${esc(a.time || "")}</td><td style="${z}">${esc(a.lect || "")}</td><td style="${z}">${esc(a.type || "")}</td></tr>`; }).join("");
  return `<div dir="rtl" style="font-family:'Traditional Arabic','Simplified Arabic',Arial;font-size:16pt;line-height:1.9;color:#111">
<p style="margin:0 0 10px">يرجى التكرم بالموافقة على إقامة ${esc(types)} للجالية ${esc((L.comm || "").replace(/^الجالية\s*/, ""))}${L.org ? ` بطلب من ${esc(L.org)}` : ""} في مساجد محافظة ${esc(gov)}، وذلك ${dur}، وفق البيانات الموضحة في الجدول التالي:</p>
<table dir="rtl" style="border-collapse:collapse;width:100%;font-size:13pt;margin:6px 0 14px"><thead><tr><th style="${th}">م</th><th style="${th}">المسجد</th><th style="${th}">المنطقة</th><th style="${th}">اليوم</th><th style="${th}">الوقت</th><th style="${th}">المحاضر</th><th style="${th}">النوع</th></tr></thead><tbody>${rows}</tbody></table>
<p style="text-align:center;font-weight:700;margin:16px 0 0">وتفضلوا بقبول فائق التقدير والاحترام</p></div>`;
}
function letterOpen(src){
  const L = letterData(src); if (!L) return;
  if (!L.acts.length) return toast("لا توجد أنشطة في الطلب");
  const byGov = {}; for (const a of L.acts) { const g = a.gov || mosBy[a.mosque]?.gov || "غير محددة"; (byGov[g] = byGov[g] || []).push(a); }
  const govs = Object.keys(byGov); const miss = [];
  if (!L.coord) miss.push("اسم المنسق (للملاحظات)"); if (!L.start) miss.push("تاريخ البداية، كُتبت «لمدة 6 أشهر»"); if (L.acts.some(a => !a.mosque)) miss.push("مسجد غير مسجل في النظام"); if (L.acts.some(a => !a.time)) miss.push("وقت غير محدد");
  S.letters = govs.map(g => ({ g, html:letterHTML(L, g, byGov[g]), subj:`طلب الموافقة على إقامة ${[...new Set(byGov[g].map(a => a.type))].join(" و")}، ${L.comm}، محافظة ${g}`, to:`مدير إدارة مساجد محافظة ${g}`, note:L.coord ? `المنسق: ${L.coord}` : "" }));
  const back = S.form;
  openDrawer(`مسودة كتاب وثيقة${govs.length > 1 ? ` (${govs.length} كتب، كتاب لكل محافظة)` : ""}`, `
    ${miss.length ? `<div class="check warn"><b>انتبه قبل الحفظ في وثيقة</b><span>${miss.map(esc).join(" · ")}</span></div>` : ""}
    ${S.letters.map((x, i) => `<div class="lt"><div class="lt-h"><b>${esc(x.to)}</b><span class="s">التأشيرة: لعمل اللازم</span></div>
      <div class="lt-m"><span><b>الموضوع:</b> ${esc(x.subj)}</span>${x.note ? `<span><b>الملاحظات:</b> ${esc(x.note)}</span>` : ""}</div>
      <div class="lt-b">${x.html}</div>
      <div class="br-acts"><button type="button" class="btn btn-primary" data-ltcopy="${i}">نسخ نص الكتاب</button><button type="button" class="btn" data-ltsubj="${i}">نسخ الموضوع</button><button type="button" class="btn btn-ghost" data-ltprint="${i}">طباعة</button></div></div>`).join("")}`,
    `<button class="btn btn-ghost" data-close>إغلاق</button>`);
  S.form = { kind:"letter", back };
}
async function copyRich(html, text){
  try { await navigator.clipboard.write([new ClipboardItem({ "text/html":new Blob([html], { type:"text/html" }), "text/plain":new Blob([text], { type:"text/plain" }) })]); return true; }
  catch (_) { try { await navigator.clipboard.writeText(text); return true; } catch (__) { return false; } }
}

/* =============== 4) WhatsApp =============== */
const waNum = p => { let d = digits(p).replace(/\D/g, ""); if (d.length === 8) d = "965" + d; return d; };
function waOpen(phone, text){ const n = waNum(phone); if (n.length < 10) return toast("لا يوجد رقم هاتف صحيح"); window.open(`https://wa.me/${n}?text=${encodeURIComponent(text)}`, "_blank", "noopener"); }
const SIGN = "\n\nقسم الجاليات ورعاية المهتدين وطلبة البعوث\nوزارة الشؤون الإسلامية";
function waAct(e, c){
  return `السلام عليكم ورحمة الله وبركاته\nالأخ الفاضل/ ${c?.name || ""} حفظه الله\n\nنود إفادتكم بتفاصيل ${e.type} للجالية ${e.comm}:\n• المسجد: ${e.mosName || "—"}${e.area ? "، " + e.area : ""}\n• اليوم: ${daysText(e)}\n• الوقت: ${e.time || "—"}\n• المحاضر: ${e.lect || "—"}\n• المدة: من ${fmt(e.start)} إلى ${fmt(e.end)}${e.doc ? `\n• رقم الموافقة: ${e.doc}` : ""}\n\nنرجو التأكيد والالتزام بالموعد، وجزاكم الله خيراً.${SIGN}`;
}
function waReq(){
  const f = rqRead(); const ok = f.status === "معتمد";
  return `السلام عليكم ورحمة الله وبركاته\nالأخ الفاضل/ ${f.coord || ""} حفظه الله\n\n${ok ? `يسرنا إفادتكم بالموافقة على طلبكم${f.doc ? ` (رقم الوثيقة ${f.doc})` : ""}` : "نفيدكم باستلام طلبكم وهو قيد الإجراء"} لإقامة الأنشطة التالية للجالية ${f.comm}:\n${S.rqActs.map((a, i) => `${i + 1}) ${actLine(a)}`).join("\n")}${ok && f.start ? `\nالمدة: من ${fmt(f.start)} إلى ${fmt(f.end)}` : ""}\n\nوجزاكم الله خيراً.${SIGN}`;
}
function waPick(list, mk){
  if (!list.length) return toast("لا يوجد منسق مسجل لهذه الجالية");
  if (list.length === 1) return waOpen(list[0].phone, mk(list[0]));
  const pop = document.createElement("div"); pop.className = "wa-pop"; pop.innerHTML = `<b>أرسل إلى</b>${list.map((c, i) => `<button type="button" data-wai="${i}">${esc(c.name)} <span class="s num">${esc(c.phone || "")}</span></button>`).join("")}`;
  document.body.appendChild(pop); const close = () => { pop.remove(); document.removeEventListener("mousedown", out, true); };
  const out = ev => { if (!pop.contains(ev.target)) close(); }; setTimeout(() => document.addEventListener("mousedown", out, true));
  pop.addEventListener("click", ev => { const b = ev.target.closest("[data-wai]"); if (!b) return; const c = list[+b.dataset.wai]; close(); waOpen(c.phone, mk(c)); });
}

/* =============== 5) Weekly schedule (print / WhatsApp text) =============== */
function weekStartSun(off){ const d = dOf(TODAY); d.setDate(d.getDate() - d.getDay() + 7 * (off || 0)); return d; }
function weekStart(off){ const d = dOf(TODAY); d.setDate(d.getDate() - ((d.getDay() + 1) % 7) + 7 * (off || 0)); return d; }
function weekRows(){
  const s = weekStartSun(S.f.wko), out = [];
  for (let i = 0; i < 7; i++) { const d = new Date(s); d.setDate(s.getDate() + i); const iso = isoOf(d);
    const L = S.E.filter(e => e.live && e.start <= iso && e.end >= iso && e.days.includes(d.getDay()) && (!S.f.wkc || e.comm === S.f.wkc) && (!S.f.wkg || e.gov === S.f.wkg)).sort((a, b) => (a.sl?.[0] || 0) - (b.sl?.[0] || 0) || (a.comm || "").localeCompare(b.comm || "", "ar"));
    out.push({ d, iso, L }); }
  return out;
}
function vWeekly(){
  const W = weekRows(), tot = W.reduce((s, x) => s + x.L.length, 0), s = W[0].d, e = W[6].d;
  return `<div class="toolbar"><div class="seg"><button type="button" data-wko="-1">‹ السابق</button><button type="button" data-wko="0" class="${!S.f.wko ? "on" : ""}">هذا الأسبوع</button><button type="button" data-wko="1">التالي ›</button></div>
    ${sel("wk-c", commNames, S.f.wkc, "كل الجاليات")}${sel("wk-g", GOVS, S.f.wkg, "كل المحافظات")}
    <span class="count">${tot} موعد</span><button class="btn" type="button" data-wktxt>${icon("i-wa")} نسخ للواتساب</button><button class="btn btn-primary" type="button" data-wkprint>${icon("i-down")} طباعة / PDF</button></div>
  <div class="panel print-area" id="wk-sheet"><div class="panel-b">
    <div class="sr-h"><div><b>وزارة الشؤون الإسلامية</b><span>${DEPT}</span></div><div style="text-align:end"><h2>الجدول الأسبوعي للأنشطة${S.f.wkc ? "، " + esc(S.f.wkc) : ""}${S.f.wkg ? "، محافظة " + esc(S.f.wkg) : ""}</h2><span>من الأحد ${fmt(isoOf(s))} إلى السبت ${fmt(isoOf(e))} م</span></div></div>
    ${W.map(x => `<div class="wk-day"><div class="wk-dh"><b>${DAYS[x.d.getDay()]}</b><span class="num">${fmt(x.iso)}</span><span class="chip">${x.L.length}</span></div>
      ${x.L.length ? `<div class="table-wrap"><table class="tbl sr-tbl"><thead><tr><th>#</th><th>الوقت</th><th>الجالية</th><th>المسجد</th><th>المنطقة</th><th>المحاضر</th><th>النوع</th></tr></thead><tbody>${x.L.map(a => `<tr data-open="act:${a.id}"><td class="num">${a.n}</td><td>${esc(a.time || "")}</td><td>${esc(a.comm || "")}</td><td>${esc(a.mosName)}</td><td>${esc(a.area)}</td><td>${esc(a.lect || "")}</td><td>${esc(a.type)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="empty s">لا توجد أنشطة</div>`}</div>`).join("")}
  </div></div>`;
}
function weekText(){
  const W = weekRows();
  return `📅 جدول أنشطة ${S.f.wkc || "الجاليات"}، من ${fmt(W[0].iso)} إلى ${fmt(W[6].iso)}\n` + W.filter(x => x.L.length).map(x => `\n*${DAYS[x.d.getDay()]} ${fmt(x.iso)}*\n` + x.L.map(a => `• ${a.time || ""}، ${a.mosName} (${a.area})، ${a.lect || ""}${S.f.wkc ? "" : "، " + a.comm}`).join("\n")).join("\n") + SIGN;
}
function printArea(sel2){ document.querySelectorAll(".print-area.on").forEach(x => x.classList.remove("on")); const el = $(sel2); if (!el) return; el.classList.add("on"); document.body.classList.add("print-any"); setTimeout(() => { window.print(); setTimeout(() => { document.body.classList.remove("print-any"); el.classList.remove("on"); }, 500); }, 50); }

/* =============== 6) Attendance & new Muslims =============== */
async function attSave(actId, day, cnt, conv, note){
  const row = { act_id:actId, day, cnt:Math.max(0, +cnt || 0), converts:Math.max(0, +conv || 0), note:note || "" };
  const { data, error } = await sb.from("attendance").upsert(row, { onConflict:"act_id,day" }).select(); if (error) throw error;
  const nr = (data && data[0]) || row; S.att = [nr, ...S.att.filter(x => !(x.act_id === actId && x.day === day))];
}
function lastRun(e){ const d = dOf(TODAY); for (let i = 0; i < 14; i++) { const iso = isoOf(d); if (e.days.includes(d.getDay()) && (!e.start || e.start <= iso) && (!e.end || e.end >= iso)) return iso; d.setDate(d.getDate() - 1); } return TODAY; }
function attBlock(e){
  const L = S.att.filter(x => x.act_id === e.id).sort((a, b) => a.day < b.day ? 1 : -1);
  const tot = L.reduce((s, x) => s + x.cnt, 0), cv = L.reduce((s, x) => s + x.converts, 0);
  return `<div class="att"><div class="rq-sh"><b>سجل الحضور</b><span class="s">${L.length} جلسة · متوسط ${L.length ? Math.round(tot / L.length) : 0} حاضر · ${cv} مهتدٍ</span></div>
    ${S.canWrite ? `<div class="att-f"><input class="f" type="date" id="att-d" value="${lastRun(e)}"><input class="f num" type="number" min="0" id="att-c" placeholder="الحضور"><input class="f num" type="number" min="0" id="att-v" placeholder="مهتدون جدد"><input class="f" id="att-n" placeholder="ملاحظة"><button type="button" class="btn btn-primary" data-attsave="${e.id}">تسجيل</button></div>` : ""}
    ${L.length ? `<div class="att-l">${L.slice(0, 8).map(x => `<span><b class="num">${fmt(x.day)}</b> · ${x.cnt} حاضر${x.converts ? ` · <span class="ok-t">${x.converts} مهتدٍ</span>` : ""}${x.note ? ` · ${esc(x.note)}` : ""}</span>`).join("")}</div>` : ""}</div>`;
}
function vAttend(){
  const ym = S.f.atm || TODAY.slice(0, 7); const [y, m] = ym.split("-").map(Number);
  const L = S.att.filter(x => x.day.startsWith(ym)); const by = {};
  for (const x of L) { const e = S.byId.get(x.act_id); const c = e?.comm || "غير معروف"; const o = by[c] = by[c] || { s:0, c:0, v:0, acts:new Set() }; o.s++; o.c += x.cnt; o.v += x.converts; o.acts.add(x.act_id); }
  const sum = L.reduce((s, x) => s + x.cnt, 0), conv = L.reduce((s, x) => s + x.converts, 0);
  const due = S.E.filter(e => RUN(e)).map(e => ({ e, d:lastRun(e) })).filter(x => x.d >= addDays(TODAY, -7) && x.d <= TODAY && !S.att.some(a => a.act_id === x.e.id && a.day === x.d));
  const mo = [-2, -1, 0, 1].map(k => { const d = new Date(y, m - 1 + k, 1); return cm1(d.getFullYear(), d.getMonth()); });
  return `<div class="toolbar"><div class="seg">${mo.map(x => `<button type="button" class="${x === ym ? "on" : ""}" data-atm="${x}">${x.split("-").reverse().join("/")}</button>`).join("")}</div><button class="btn" type="button" data-attxl>${icon("i-down")} إكسل</button></div>
  <div class="kpis"><div class="kpi"><span>جلسات مسجلة</span><b>${L.length}</b></div><div class="kpi"><span>إجمالي الحضور</span><b>${sum}</b></div><div class="kpi" style="--k:var(--ok)"><span>مهتدون جدد</span><b>${conv}</b></div><div class="kpi"><span>متوسط الحضور</span><b>${L.length ? Math.round(sum / L.length) : 0}</b></div></div>
  <div class="g2" style="margin-top:16px;align-items:start">
    <div class="panel"><div class="panel-h"><h3>حسب الجالية</h3></div><div class="table-wrap"><table class="tbl"><thead><tr><th>الجالية</th><th>أنشطة</th><th>جلسات</th><th>الحضور</th><th>المهتدون</th></tr></thead><tbody>${Object.entries(by).sort((a, b) => b[1].c - a[1].c).map(([c, o]) => `<tr><td>${esc(c)}</td><td class="num">${o.acts.size}</td><td class="num">${o.s}</td><td class="num">${o.c}</td><td class="num">${o.v}</td></tr>`).join("") || `<tr><td colspan="5" class="empty">لا توجد سجلات في هذا الشهر</td></tr>`}</tbody></table></div></div>
    <div class="panel"><div class="panel-h"><h3>بانتظار تسجيل الحضور (آخر 7 أيام)</h3><span class="chip warn">${due.length}</span></div><div class="list">${due.slice(0, 40).map(x => `<button class="li" data-open="act:${x.e.id}"><span><span class="t">#${x.e.n} · ${esc(x.e.mosName)}</span><br><span class="s">${esc([x.e.comm, fmt(x.d), x.e.time].join(" · "))}</span></span></button>`).join("") || `<div class="empty">كل الحضور مسجل ✓</div>`}</div></div>
  </div>`;
}
function attXlsx(){
  if (!window.XLSX) return toast("مكتبة إكسل لم تُحمّل");
  const rows = S.att.map(x => { const e = S.byId.get(x.act_id); return { "التاريخ":x.day, "النشاط":e?.n, "الجالية":e?.comm, "المسجد":e?.mosName, "المحافظة":e?.gov, "المحاضر":e?.lect, "الحضور":x.cnt, "المهتدون الجدد":x.converts, "ملاحظة":x.note }; });
  const wb = XLSX.utils.book_new(); wb.Workbook = { Views:[{ RTL:true }] }; XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "الحضور"); XLSX.writeFile(wb, `الحضور-والمهتدين-${TODAY}.xlsx`);
}

/* =============== 7) Alerts bell + device notifications =============== */
function alerts(){
  const A = [];
  const nReq = S.reqs.filter(r => r.status === "جديد").length; if (nReq) A.push({ k:"gold", t:`${nReq} طلب وارد جديد`, go:"inbox" });
  const exp = S.docs.filter(d => d.end && d.end >= TODAY && d.end <= addDays(TODAY, 14) && S.E.some(e => e.doc === d.no && e.live)); if (exp.length) A.push({ k:"warn", t:`${exp.length} موافقة تنتهي خلال 14 يوماً`, s:exp.slice(0, 4).map(d => d.no + " (" + fmt(d.end) + ")").join("، "), go:"docs" });
  const cf = S.E.filter(e => e.cf.length && RUN(e)).length; if (cf) A.push({ k:"bad", t:`${Math.round(cf / 2) || 1} تعارض في الأنشطة الجارية`, go:"acts", f:{ cf:1 } });
  if (typeof SR !== "undefined" && SR.loaded !== false) { const d = dOf(TODAY); d.setDate(d.getDate() - ((d.getDay() + 2) % 7)); const fri = isoOf(d); const miss = [...S.khatibs.keys()].filter(k => !SR.rows.has(fri + "|" + k)).length; if (fri < TODAY && miss && S.khatibs.size) A.push({ k:"t1", t:`${miss} خطبة غير مسجلة لجمعة ${fmt(fri)}`, go:"rewards" }); }
  const today = S.E.filter(e => e.live && e.start <= TODAY && e.end >= TODAY && e.days.includes(dOf(TODAY).getDay())).length; A.push({ k:"ok", t:`${today} نشاط اليوم`, go:"weekly" });
  return A;
}
function bellRefresh(){ const b = $("#bell"); if (!b) return; const n = alerts().filter(a => a.k && a.k !== "ok").length; b.querySelector(".bn").textContent = n || ""; b.querySelector(".bn").hidden = !n; }
function bellOpen(){
  const old = $("#bell-pop"); if (old) return old.remove();
  const A = alerts(); const p = document.createElement("div"); p.id = "bell-pop"; p.className = "bell-pop";
  p.innerHTML = `<div class="bell-h"><b>التنبيهات</b>${"Notification" in window && Notification.permission !== "granted" ? `<button type="button" class="btn btn-ghost" data-notif>تفعيل إشعارات الجهاز</button>` : ""}</div>${A.map(a => `<button type="button" class="bell-i ${a.k}" data-go="${a.go}"${a.f ? ` data-f="${esc(JSON.stringify(F0(a.f)))}"` : ""}><i></i><span><b>${esc(a.t)}</b>${a.s ? `<br><span class="s">${esc(a.s)}</span>` : ""}</span></button>`).join("")}`;
  document.body.appendChild(p);
  const out = ev => { if (!p.contains(ev.target) && !ev.target.closest("#bell")) { p.remove(); document.removeEventListener("mousedown", out, true); } }; setTimeout(() => document.addEventListener("mousedown", out, true));
  p.addEventListener("click", ev => { if (ev.target.closest("[data-go]")) p.remove(); });
}
async function devNotify(title, body){
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try { const reg = await navigator.serviceWorker?.getRegistration(); if (reg) reg.showNotification(title, { body, icon:"icon-v2-192.png", badge:"icon-v2-192.png", lang:"ar", dir:"rtl", tag:title }); else new Notification(title, { body, icon:"icon-v2-192.png" }); } catch (_) {}
}
function dailyDigest(){
  if (LS.get("digest-day", "") === TODAY) return; const A = alerts(); LS.set("digest-day", TODAY);
  devNotify("ملخص اليوم، نظام الجاليات", A.map(a => a.t).join(" · "));
}

/* =============== 8) Voice commands (Arabic speech → Copilot) =============== */
const SR_API = window.SpeechRecognition || window.webkitSpeechRecognition;
let VREC = null;
function voiceStart(target){
  if (!SR_API) return toast("المتصفح لا يدعم الإدخال الصوتي، استخدم Edge أو Chrome");
  if (VREC) { VREC.stop(); return; }
  const r = VREC = new SR_API(); r.lang = "ar-KW"; r.interimResults = true; r.continuous = false;
  const inp = $(target || "#br-q"); const btn = $("#br-mic"); btn?.classList.add("rec"); let fin = "";
  r.onresult = ev => { let t = ""; for (const x of ev.results) t += x[0].transcript; fin = t; if (inp) inp.value = t; };
  r.onerror = ev => { toast(ev.error === "not-allowed" ? "اسمح للمتصفح باستخدام المايكروفون" : "لم أسمع جيداً، حاول مرة أخرى"); };
  r.onend = () => { VREC = null; btn?.classList.remove("rec"); if (fin.trim() && (target || "#br-q") === "#br-q") brSend(fin, cpNeedsData(fin)); };
  r.start(); toast("تكلّم الآن…");
}

/* =============== 9) Monthly report (Word) =============== */
function reportHTML(ym){
  const [y, m] = ym.split("-").map(Number); const from = `${ym}-01`, to = isoOf(new Date(y, m, 0));
  const act = S.E.filter(e => e.live && e.start <= to && e.end >= from);
  const nw = S.E.filter(e => e.start >= from && e.start <= to);
  const docs = S.docs.filter(d => (d.date || d.start || "") >= from && (d.date || d.start || "") <= to);
  const att = S.att.filter(x => x.day >= from && x.day <= to);
  const reqs = S.reqs.filter(r => (r.created_at || "").slice(0, 10) >= from && (r.created_at || "").slice(0, 10) <= to);
  const serm = typeof SR !== "undefined" ? [...SR.rows.values()].filter(r => r.fri >= from && r.fri <= to) : [];
  const byC = {}; for (const e of act) { const o = byC[e.comm || "—"] = byC[e.comm || "—"] || { a:0, n:0, c:0, v:0 }; o.a++; } for (const e of nw) (byC[e.comm || "—"] = byC[e.comm || "—"] || { a:0, n:0, c:0, v:0 }).n++;
  for (const x of att) { const e = S.byId.get(x.act_id); const o = byC[e?.comm || "—"] = byC[e?.comm || "—"] || { a:0, n:0, c:0, v:0 }; o.c += x.cnt; o.v += x.converts; }
  const th = "border:1px solid #1d4d3a;background:#1d4d3a;color:#fff;padding:6px;text-align:center", td = "border:1px solid #9bb5a8;padding:6px;text-align:center";
  const tbl = (h, rows) => `<table style="border-collapse:collapse;width:100%;font-size:12pt;margin:6px 0 14px"><tr>${h.map(x => `<th style="${th}">${x}</th>`).join("")}</tr>${rows.map(r => `<tr>${r.map(x => `<td style="${td}">${esc(x)}</td>`).join("")}</tr>`).join("")}</table>`;
  const MN = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"][m - 1];
  const amt = serm.reduce((s, r) => s + (+r.amount || 0), 0);
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>تقرير ${MN} ${y}</title><style>body{font-family:'Simplified Arabic',Arial;direction:rtl}h1,h2{color:#1d4d3a}h2{font-size:15pt;border-bottom:2px solid #c9a227;padding-bottom:3px;margin-top:18px}</style></head><body dir="rtl">
<p style="text-align:center;margin:0">وزارة الشؤون الإسلامية<br>${DEPT}</p>
<h1 style="text-align:center;font-size:20pt">التقرير الشهري لأنشطة الجاليات، ${MN} ${y} م</h1>
<h2>ملخص الشهر</h2>${tbl(["الأنشطة الجارية", "أنشطة جديدة", "موافقات جديدة", "طلبات واردة", "خطب الجمعة المسجلة"], [[act.length, nw.length, docs.length, reqs.length, serm.filter(r => r.who !== "none").length]])}
<h2>الأنشطة حسب الجالية</h2>${tbl(["الجالية", "الأنشطة الجارية", "الجديدة هذا الشهر"], Object.entries(byC).sort((a, b) => b[1].a - a[1].a).map(([c, o]) => [c, o.a, o.n]))}
<h2>الأنشطة حسب المحافظة</h2>${tbl(["المحافظة", "عدد الأنشطة"], GOVS.map(g => [g, act.filter(e => e.gov === g).length]))}
${nw.length ? `<h2>الأنشطة الجديدة</h2>${tbl(["#", "النوع", "الجالية", "المسجد", "الأيام", "الوقت", "المحاضر"], nw.map(e => [e.n, e.type, e.comm, e.mosName, daysText(e), e.time, e.lect]))}` : ""}
${docs.length ? `<h2>الموافقات الصادرة</h2>${tbl(["رقم الوثيقة", "الموضوع", "الجالية", "من", "إلى"], docs.map(d => [d.no, d.subj, d.comm, fmt(d.start), fmt(d.end)]))}` : ""}
${serm.length ? `<h2>خطب الجمعة</h2>${tbl(["ألقاها الأساسي", "ألقاها الاحتياط", "بديل", "لم تُلقَ", "إجمالي المكافآت (د.ك)"], [[serm.filter(r => r.who === "pri").length, serm.filter(r => r.who === "bak").length, serm.filter(r => r.who === "other").length, serm.filter(r => r.who === "none").length, amt.toFixed(3)]])}` : ""}
<br><table style="width:100%;margin-top:30px;font-size:13pt"><tr><td style="text-align:center">إعداد</td><td style="text-align:center">رئيس القسم</td><td style="text-align:center">مدير الإدارة</td></tr><tr><td style="height:60px"></td><td></td><td></td></tr></table>
</body></html>`;
}
function reportDownload(ym){ ym = ym || TODAY.slice(0, 7); const b = new Blob(["﻿", reportHTML(ym)], { type:"application/msword" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `التقرير-الشهري-${ym}.doc`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast("نُزّل التقرير الشهري (Word)"); }

/* =============== 10) Backups (admin) =============== */
S.bk = null;
async function bkLoad(){ const { data, error } = await sb.from("backups").select("id,at").order("at", { ascending:false }).limit(60); S.bk = error ? [] : data || []; if (S.view === "backups") render(); }
function vBackups(){
  if (!S.bk) { bkLoad(); return `<div class="empty">جارٍ التحميل…</div>`; }
  return odCard() + `<div class="toolbar"><span class="count">نسخة احتياطية تلقائية كل ليلة الساعة 3:00 ص، وتُحفظ آخر 45 يوماً</span><button class="btn btn-primary" type="button" data-bknow>نسخة احتياطية الآن</button></div>
  <div class="panel"><div class="list">${S.bk.map(b => `<div class="li"><span><span class="t num">${new Date(b.at).toLocaleString("ar-KW", { dateStyle:"full", timeStyle:"short", hour12:true })}</span></span><button type="button" class="btn" data-bkxl="${b.id}">${icon("i-down")} تنزيل إكسل</button></div>`).join("") || `<div class="empty">لا توجد نسخ بعد</div>`}</div></div>`;
}
function bkBook(D){
  const wb = XLSX.utils.book_new(); wb.Workbook = { Views:[{ RTL:true }] };
  const flat = L => (L || []).map(r => { const o = { id:r.id }; const src = r.data && typeof r.data === "object" && !Array.isArray(r.data) ? r.data : r; for (const [k, v] of Object.entries(src)) o[k] = typeof v === "object" ? JSON.stringify(v) : v; return o; });
  for (const k of ["acts", "khatibs", "notes", "sermons", "requests", "attendance"]) if ((D[k] || []).length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(flat(D[k])), k);
  for (const r of D.refs || []) if (r.data?.list?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(r.data.list.map(x => typeof x === "object" ? x : { v:x })), String(r.id).slice(0, 30));
  return wb;
}
async function bkXlsx(id){
  const { data, error } = await sb.from("backups").select("*").eq("id", id).single(); if (error) return writeFail(error);
  XLSX.writeFile(bkBook(data.data), `نسخة-احتياطية-${data.at.slice(0, 10)}.xlsx`);
}

/* =============== 10b) OneDrive: نسخة النظام كاملة تلقائياً (يوماً / يومين / أسبوع) =============== */
// يرفع إلى OneDrive (حساب الوزارة للمدير الذي ربطه) مجلد «إنجاز»: آخر نسخة إكسل + JSON كامل + ملفات النظام نفسه.
// يعمل تلقائياً عند فتح النظام وكل ساعة ما دام مفتوحاً إذا حان الموعد. الإعداد مشترك في جدول settings (المفتاح onedrive).
const OD = { scope:["Files.ReadWrite"], dir:"إنجاز", busy:false, cfg:null, err:"" };
const OD_FREQ = { off:{ t:"متوقف", d:0 }, d1:{ t:"كل يوم", d:1 }, d2:{ t:"كل يومين", d:2 }, w1:{ t:"كل أسبوع", d:7 } };
async function odCfgLoad(){ const { data } = await sb.from("settings").select("*").eq("key", "onedrive").maybeSingle(); OD.cfg = data?.value || { freq:"off", last:null, by:"", files:0 }; return OD.cfg; }
async function odCfgSave(v){ OD.cfg = { ...(OD.cfg || {}), ...v }; const { error } = await sb.from("settings").upsert({ key:"onedrive", value:OD.cfg }); if (error) throw error; }
async function odPut(path, body, type){
  const tk = await msToken(false, OD.scope);
  const url = "https://graph.microsoft.com/v1.0/me/drive/root:/" + path.split("/").map(encodeURIComponent).join("/");
  const size = body.byteLength ?? body.size ?? new Blob([body]).size;
  if (size < 3.5e6) {
    const r = await fetch(url + ":/content", { method:"PUT", headers:{ Authorization:"Bearer " + tk, "Content-Type":type }, body });
    if (!r.ok) { const e = new Error((await r.text()).slice(0, 200)); e.status = r.status; throw e; } return;
  }
  const s = await fetch(url + ":/createUploadSession", { method:"POST", headers:{ Authorization:"Bearer " + tk, "Content-Type":"application/json" }, body:JSON.stringify({ item:{ "@microsoft.graph.conflictBehavior":"replace" } }) });
  if (!s.ok) throw new Error((await s.text()).slice(0, 200));
  const { uploadUrl } = await s.json(); const blob = new Blob([body]); const CH = 5 * 327680;
  for (let i = 0; i < size; i += CH) { const part = blob.slice(i, Math.min(i + CH, size)); const r = await fetch(uploadUrl, { method:"PUT", headers:{ "Content-Range":`bytes ${i}-${i + part.size - 1}/${size}` }, body:part }); if (!r.ok && r.status !== 202) throw new Error("upload " + r.status); }
}
async function odRun(manual){
  if (OD.busy) return; OD.busy = true; OD.err = ""; if (S.view === "backups") render();
  try {
    if (manual) await msToken(true, OD.scope);
    if (!window.XLSX) throw new Error("مكتبة إكسل لم تُحمّل");
    await sb.rpc("backup_now").then(() => {}, () => {});
    const { data, error } = await sb.from("backups").select("*").order("at", { ascending:false }).limit(1).single(); if (error) throw error;
    const day = TODAY, dir = OD.dir;
    const xl = XLSX.write(bkBook(data.data), { type:"array", bookType:"xlsx" }), XT = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const js = new TextEncoder().encode(JSON.stringify({ at:data.at, system:"إنجاز", data:data.data }));
    await odPut(`${dir}/النسخ/إنجاز-${day}.xlsx`, xl, XT);
    await odPut(`${dir}/النسخ/إنجاز-${day}.json`, js, "application/json");
    await odPut(`${dir}/آخر نسخة.xlsx`, xl, XT);
    let n = 3;
    for (const f of ["index.html", "auth.html", "manifest.webmanifest", "sw.js", "icon-v2-512.png", "jaliyat-copilot.zip"]) {
      try { const r = await fetch(f, { cache:"no-store" }); if (!r.ok) continue; await odPut(`${dir}/النظام/${f}`, await r.arrayBuffer(), r.headers.get("content-type") || "application/octet-stream"); n++; } catch (_) {}
    }
    await odPut(`${dir}/اقرأني.txt`, new TextEncoder().encode(`نظام «إنجاز»، نسخة تلقائية من ${location.href.split("#")[0]}\nآخر تحديث: ${new Date().toLocaleString("ar-KW", { hour12:true })}\nالنسخ: مجلد «النسخ» (إكسل وJSON لكل يوم)، وملفات النظام في «النظام».\n`), "text/plain; charset=utf-8");
    await odCfgSave({ last:new Date().toISOString(), by:S.me?.name || S.me?.username || "", files:n + 1, acct:MS.account?.username || "" });
    if (manual) toast("حُدّثت نسخة إنجاز في OneDrive");
  } catch (e) { OD.err = msErr(e)?.t || String(e?.message || e); if (manual) toast(OD.err); console.warn("onedrive", e); }
  finally { OD.busy = false; if (S.view === "backups") render(); }
}
async function odAuto(){
  if (!S.admin || !msReady()) return;
  try { const c = await odCfgLoad(); const f = OD_FREQ[c.freq]; if (!f || !f.d) return;
    if (c.last && Date.now() - new Date(c.last).getTime() < f.d * 864e5 - 36e5) return;
    await msInit(); if (!MS.account) return;
    await odRun(false);
  } catch (e) { console.warn("onedrive auto", e); }
}
function odCard(){
  const c = OD.cfg; if (!c) { odCfgLoad().then(() => S.view === "backups" && render()); return `<div class="panel"><div class="empty">جارٍ تحميل إعداد OneDrive…</div></div>`; }
  const last = c.last ? new Date(c.last).toLocaleString("ar-KW", { dateStyle:"full", timeStyle:"short", hour12:true }) : "لم تُرفع بعد";
  const f = OD_FREQ[c.freq] || OD_FREQ.off, next = c.last && f.d ? new Date(new Date(c.last).getTime() + f.d * 864e5).toLocaleDateString("ar-KW", { dateStyle:"full" }) : "—";
  return `<div class="panel" style="margin-bottom:14px"><h3 style="margin:0 0 6px">${icon("i-doc")} نسخة النظام في OneDrive</h3>
  <p class="s" style="margin:0 0 10px">يرفع النظام كاملاً إلى مجلد «${OD.dir}» في OneDrive: آخر نسخة إكسل، ونسخة JSON كاملة لكل يوم، وملفات النظام نفسه. يتحدّث تلقائياً حسب المدة عند فتح النظام من هذا المتصفح.</p>
  <div class="toolbar" style="flex-wrap:wrap;gap:8px">${Object.entries(OD_FREQ).map(([k, v]) => `<button type="button" class="btn ${c.freq === k ? "btn-primary" : ""}" data-odfreq="${k}">${v.t}</button>`).join("")}
  <button type="button" class="btn" data-odnow ${OD.busy ? "disabled" : ""}>${OD.busy ? "جارٍ الرفع…" : "رفع الآن"}</button></div>
  <div class="list" style="margin-top:8px"><div class="li"><span class="t">آخر رفع</span><span class="num">${esc(last)}${c.by ? " · " + esc(c.by) : ""}</span></div><div class="li"><span class="t">الرفع القادم</span><span class="num">${esc(next)}</span></div>${c.acct ? `<div class="li"><span class="t">الحساب</span><span class="num">${esc(c.acct)}</span></div>` : ""}</div>
  ${OD.err ? `<div class="empty" style="color:var(--danger,#b42318)">${esc(OD.err)}</div>` : ""}</div>`;
}

/* =============== wiring =============== */
const _actForm11 = actForm;
actForm = function(id, preset){
  _actForm11(id, preset);
  if (S.form?.kind !== "act") return;
  if (preset && S.rqBack) S.form.rq = S.rqBack;
  const e = id && S.byId.get(id); if (!e) return;
  const f = $(".drawer-f [data-close]");
  f?.insertAdjacentHTML("afterend", `<button class="btn btn-ghost" type="button" data-wa="act:${esc(id)}" title="واتساب للمنسق">${icon("i-wa")}</button><button class="btn btn-ghost" type="button" data-letter="${esc(id)}" title="مسودة كتاب وثيقة">${icon("i-doc")}</button>`);
};
const _vStats11 = vStats;
vStats = function(){ return `<div class="toolbar" style="margin-bottom:10px"><button class="btn" type="button" data-report>${icon("i-doc")} التقرير الشهري (Word)</button>${hasBridge() ? `<button class="btn cp-ask" type="button" data-reportcp>${icon("i-spark")} اطلب من Copilot كتابة التقرير</button>` : ""}</div>` + _vStats11(); };
const _vCopilot11 = vCopilot;
vCopilot = function(){
  let h = _vCopilot11(); if (!hasBridge()) return h;
  h = h.replace('<button class="btn btn-primary" id="br-go" type="button">', `<div class="br-row"><button class="btn mic" id="br-mic" type="button" title="أمر صوتي">${icon("i-mic")}</button><button class="btn" type="button" data-intake title="أرفق صورة طلب ليحللها">${icon("i-cam")}</button></div><button class="btn btn-primary" id="br-go" type="button">`);
  return h;
};
const _palAll11 = palAll;
palAll = function(){
  const A = _palAll11(); const add = (t, s, ic, run, kw) => A.unshift({ g:"إجراءات", t, s, ic, run, txt:t + " " + (kw || "") });
  add("التقرير الشهري (Word)", "تقرير رسمي للشهر الحالي", "i-doc", () => reportDownload(), "تقرير شهري ورد word");
  add("الجدول الأسبوعي للطباعة", "", "i-cal", () => go("weekly"), "اسبوع جدول طباعه pdf");
  if (hasBridge()) add("أمر صوتي لـ Copilot", "تكلّم بالعربي وينفذ", "i-mic", () => { go("copilot"); setTimeout(() => voiceStart(), 800); }, "صوت مايك تكلم");
  if (S.canWrite) add("استقبال طلب من صور", "يحلل ويفرز ويدخل تلقائياً", "i-cam", () => intakeOpen(), "طلب وارد صوره pdf");
  for (const r of S.reqs.slice(0, 200)) A.push({ g:"الطلبات", t:r.data?.org || r.data?.subj || "طلب", s:[r.status, r.data?.comm, r.data?.coord].filter(Boolean).join(" · "), ic:"i-inbox", run:() => reqForm(r.id), txt:[r.data?.org, r.data?.comm, r.data?.coord, r.data?.subj, r.status].join(" ") });
  return A;
};
const _boot9x = boot9;
boot9 = function(){
  _boot9x();
  const top = $("#ocr-top"); if (top && !$("#bell")) top.insertAdjacentHTML("afterend", `<button class="btn bell" id="bell" type="button" title="التنبيهات" aria-label="التنبيهات">${icon("i-bell")}<span class="bn" hidden></span></button>`);
  if (top) top.querySelector("span").textContent = "استقبال طلب";
  Promise.all([loadReqs(), loadAtt()]).then(() => { live11(); bellRefresh(); dailyDigest(); if ($("#drawer").hidden && ["inbox", "attend", "home"].includes(S.view)) render(); });
  setInterval(bellRefresh, 60000);
};
const _onRemote11 = onRemote; onRemote = function(t, p){ _onRemote11(t, p); bellRefresh(); };

document.addEventListener("click", async ev => {
  const t = ev.target.closest("button,[data-rq],#iz-drop"); if (!t) return;
  const D = t.dataset;
  if (t.id === "bell") return bellOpen();
  if (D.notif !== undefined) { const p = await Notification.requestPermission(); toast(p === "granted" ? "فُعّلت الإشعارات على هذا الجهاز" : "لم تُفعّل الإشعارات"); if (p === "granted") devNotify("تم التفعيل", "ستصلك تنبيهات نظام الجاليات على هذا الجهاز"); return; }
  if (t.id === "iz-drop" || D.intake !== undefined) return intakeOpen();
  if (t.id === "iz-go") return intakeGo();
  if (D.izrm !== undefined) { INTAKE.files.splice(+D.izrm, 1); return intakeAdd([]); }
  if (D.rqt) { S.f.rqt = D.rqt; return render(); }
  if (D.rq) return reqForm(D.rq);
  if (D.rqsave !== undefined) return rqSave();
  if (D.rqapprove !== undefined) return rqApprove();
  if (D.rqdel !== undefined) { if (!S.form?.id) return; if (t.dataset.sure !== "1") { t.dataset.sure = "1"; t.textContent = "اضغط مرة أخرى للتأكيد"; return; } const { error } = await sb.from("requests").delete().eq("id", S.form.id); if (error) return writeFail(error); S.reqs = S.reqs.filter(r => r.id !== S.form.id); closeDrawer(); render(); return toast("حُذف الطلب"); }
  if (D.rqadd !== undefined) { S.rqActs.push(tolAct({ comm:$("#rq-comm").value })); return rqActsRender(); }
  if (D.rqrm !== undefined) { S.rqActs.splice(+D.rqrm, 1); return rqActsRender(); }
  if (D.rqedit !== undefined) { const r = await rqSave(true); if (!r) return; const f = rqRead(); const a = { ...S.rqActs[+D.rqedit], comm:f.comm, doc:f.doc || "", start:docBy[f.doc] ? "" : f.start, end:docBy[f.doc] ? "" : f.end }; delete a.mosRaw; S.rqBack = r.id; closeDrawer(); actForm(undefined, a); S.rqBack = null; return; }
  if (D.rqcp !== undefined) { const r = await rqSave(true); if (!r) return; INTAKE.reqId = r.id; INTAKE.waiting = false; INTAKE.sent = false; const f = (r.files || [])[0]; let file = null;
    if (f) { const { data } = await sb.storage.from("requests").download(f); if (data) file = { name:f.split("/").pop(), content:data, type:data.type || (/\.pdf$/.test(f) ? "application/pdf" : "image/jpeg") }; }
    const msg = { type:"jaliyat-ask", intake:true, text:INTAKE_PROMPT + `\nبيانات الطلب الحالية في النظام: ${JSON.stringify({ ...r.data, ai:undefined, text:undefined })}`, file }; closeDrawer();
    if (S.view === "copilot" && BR.primed) brPost(msg); else { INTAKE.msg = msg; go("copilot"); } return; }
  if (D.letter) return letterOpen(D.letter);
  if (D.ltcopy !== undefined) { const x = S.letters[+D.ltcopy]; const tmp = document.createElement("div"); tmp.innerHTML = x.html; return toast(await copyRich(x.html, tmp.innerText) ? "نُسخ نص الكتاب بتنسيقه، الصقه في وثيقة" : "تعذّر النسخ"); }
  if (D.ltsubj !== undefined) { const ok = await cpCopy(S.letters[+D.ltsubj].subj); return toast(ok ? "نُسخ الموضوع" : "تعذّر النسخ"); }
  if (D.ltprint !== undefined) { const w = window.open("", "_blank"); if (!w) return; w.document.write(`<html dir="rtl"><head><meta charset="utf-8"><title>${esc(S.letters[+D.ltprint].subj)}</title></head><body style="padding:40px">${S.letters[+D.ltprint].html}</body></html>`); w.document.close(); w.print(); return; }
  if (D.wa) { if (D.wa === "req") { const f = rqRead(); const list = f.phone ? [{ name:f.coord, phone:f.phone }] : S.coords.filter(c => c.comm === f.comm && c.phone); return waPick(list, () => waReq()); }
    const e = S.byId.get(D.wa.slice(4)); if (!e) return; return waPick(S.coords.filter(c => c.comm === e.comm && c.phone), c => waAct(e, c)); }
  if (D.wko !== undefined) { S.f.wko = D.wko === "0" ? 0 : (S.f.wko || 0) + +D.wko; return render(); }
  if (D.wkprint !== undefined) return printArea("#wk-sheet");
  if (D.wktxt !== undefined) { const ok = await cpCopy(weekText()); return toast(ok ? "نُسخ الجدول، الصقه في الواتساب" : "تعذّر النسخ"); }
  if (D.attsave) { const day = $("#att-d").value, c = $("#att-c").value; if (!day || c === "") return toast("اكتب التاريخ وعدد الحضور"); try { await attSave(D.attsave, day, c, $("#att-v").value, $("#att-n").value.trim()); toast("سُجّل الحضور"); const e = S.byId.get(D.attsave); $(".att")?.replaceWith(Object.assign(document.createElement("div"), { innerHTML:attBlock(e) }).firstElementChild); } catch (e) { writeFail(e); } return; }
  if (D.atm) { S.f.atm = D.atm; return render(); }
  if (D.attxl !== undefined) return attXlsx();
  if (D.report !== undefined) return reportDownload();
  if (D.reportcp !== undefined) return askAbout(`اكتب «التقرير الشهري لأنشطة الجاليات» لشهر ${TODAY.slice(5, 7)}/${TODAY.slice(0, 4)} بصياغة رسمية لرفعها لمدير الإدارة: مقدمة، أبرز الإنجازات بالأرقام من ملف النظام (الأنشطة الجارية والجديدة حسب الجالية والمحافظة، الموافقات، طلبات المنسقين، خطب الجمعة)، التحديات (التعارضات والموافقات المنتهية والنواقص)، والتوصيات. استخدم جداول.`);
  if (D.bknow !== undefined) { const { error } = await sb.rpc("backup_now"); if (error) return writeFail(error); toast("أُخذت نسخة احتياطية"); return bkLoad(); }
  if (D.bkxl) return bkXlsx(+D.bkxl);
  if (D.odnow !== undefined) return odRun(true);
  if (D.odfreq) { try { await odCfgSave({ freq:D.odfreq }); toast("المدة: " + OD_FREQ[D.odfreq].t); if (D.odfreq !== "off" && !OD.cfg.last) return odRun(true); render(); } catch (e) { writeFail(e); } return; }
  if (t.id === "br-mic") return voiceStart();
});
document.addEventListener("change", ev => {
  const id = ev.target.id;
  if (id === "iz-in") return intakeAdd([...ev.target.files]);
  if (id === "wk-c") { S.f.wkc = ev.target.value; return render(); }
  if (id === "wk-g") { S.f.wkg = ev.target.value; return render(); }
  if (id === "rq-comm") { S.rqActs.forEach(a => a.comm = ev.target.value); return rqActsRender(); }
});
/* drag & drop anywhere + paste inside the intake drawer */
let dragN = 0;
document.addEventListener("dragenter", ev => { if (!S.ready || !S.canWrite || ![...(ev.dataTransfer?.types || [])].includes("Files")) return; dragN++; document.body.classList.add("dropping"); });
document.addEventListener("dragleave", () => { if (--dragN <= 0) { dragN = 0; document.body.classList.remove("dropping"); } });
document.addEventListener("dragover", ev => { if ([...(ev.dataTransfer?.types || [])].includes("Files")) ev.preventDefault(); });
document.addEventListener("drop", ev => { const fs = [...(ev.dataTransfer?.files || [])]; dragN = 0; document.body.classList.remove("dropping"); if (!fs.length || !S.canWrite) return; ev.preventDefault(); if (S.form?.kind === "intake") intakeAdd(fs); else intakeOpen(fs); });
document.addEventListener("paste", ev => { if (S.form?.kind !== "intake") return; const fs = [...(ev.clipboardData?.items || [])].filter(x => x.kind === "file").map(x => x.getAsFile()).filter(Boolean); if (fs.length) { ev.preventDefault(); ev.stopImmediatePropagation(); intakeAdd(fs); } }, true);
document.addEventListener("keydown", ev => { if (ev.target.closest?.("#iz-drop") && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); intakeOpen(); } });
