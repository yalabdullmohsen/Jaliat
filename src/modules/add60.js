/* ================= v78: «إرفاق» — أي ملف (صورة، PDF، إكسل، وورد، نص) يقرؤه Copilot ويضعه في مكانه، ويتعلّم من تصحيحات الموظفين ================= */
const ATT_ACCEPT = "image/*,application/pdf,.pdf,.xlsx,.xls,.csv,.docx,.txt,.md";
const attKind = f => /^image\//.test(f.type) ? "img" : (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) ? "pdf"
  : /\.(xlsx|xls|csv)$/i.test(f.name) ? "sheet" : /\.docx$/i.test(f.name) ? "word" : (/^text\//.test(f.type) || /\.(txt|md)$/i.test(f.name)) ? "text" : "";
const ATT_LBL = { img:"صورة", pdf:"PDF", sheet:"إكسل", word:"وورد", text:"نص" };

/* أيقونة مشبك الإرفاق + زر أعلى الشاشة */
function attIcon(){ const sp = document.querySelector("svg symbol")?.parentElement; if (sp && !document.getElementById("i-clip")) sp.insertAdjacentHTML("beforeend", `<symbol id="i-clip" viewBox="0 0 24 24"><path d="M20.5 11.5l-8.2 8.2a5.3 5.3 0 0 1-7.5-7.5l8.6-8.6a3.5 3.5 0 0 1 5 5l-8.6 8.6a1.8 1.8 0 0 1-2.5-2.5l7.9-7.9" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></symbol>`);
  const b = document.getElementById("ocr-top"); if (!b) return; b.title = "إرفاق ملف أو صورة، يقرؤه Copilot ويضعه في مكانه"; b.setAttribute("aria-label", "إرفاق");
  b.innerHTML = `<svg><use href="#i-clip"/></svg><span>إرفاق</span>`; }
attIcon();
const _boot960 = boot9; boot9 = function(){ _boot960(); attIcon(); };

/* ===== ما تعلّمه Copilot: قواعد مشتركة لكل الموظفين ===== */
const LRN = { list:null };
async function lrnLoad(){ if (LRN.list) return LRN.list; const { data } = await sb.from("settings").select("value").eq("key", "ai_lessons").maybeSingle(); LRN.list = data?.value?.list || []; return LRN.list; }
async function lrnAdd(items){ await lrnLoad(); let n = 0;
  for (const it of items) { const t = (it.t || "").trim(); if (t.length < 3 || LRN.list.some(x => x.t === t)) continue; LRN.list.unshift({ t, from:it.from || "", to:it.to || "", by:S.me?.name || "", at:new Date().toISOString() }); n++; }
  if (!n) return 0; LRN.list = LRN.list.slice(0, 120);
  const { error } = await sb.from("settings").upsert({ key:"ai_lessons", value:{ list:LRN.list } }); if (error) { writeFail(error); return 0; } return n; }
async function lrnDel(i){ await lrnLoad(); LRN.list.splice(i, 1); await sb.from("settings").upsert({ key:"ai_lessons", value:{ list:LRN.list } }); }
const lrnText = () => (LRN.list || []).slice(0, 60).map(x => "- " + x.t).join("\n");
/* القراءة على الجهاز تستفيد أيضاً: «كذا» يعني «كذا» يُستبدل قبل الفرز */
const _parseActs60 = parseActs;
parseActs = function(text){ let t = String(text || ""); for (const x of LRN.list || []) if (x.from && x.to && x.from.length > 3) t = t.split(x.from).join(x.to); return _parseActs60(t); };
/* تعلّم تلقائي: كل تصحيح يدوي لطلب قرأه Copilot أو الجهاز يصير قاعدة */
const _rqSave60 = rqSave;
rqSave = async function(quiet){ const r = S.reqs.find(x => x.id === S.form?.id); const before = r ? JSON.parse(JSON.stringify(r.data || {})) : null;
  const res = await _rqSave60(quiet);
  try { if (res && before && ["copilot", "ocr", "intake", "attach", "paste"].includes(before.src)) { const L = [], F = { coord:"المنسق", org:"الجهة" }, A = { mosque:"المسجد", lect:"المحاضر" };
      const known = new Set((S.E || []).flatMap(e => [e.mosque, e.comm, e.lect]).filter(Boolean).map(x => String(x).trim()));
      const pair = (a, b, lbl) => { a = String(a || "").trim(); b = String(b || "").trim(); if (a && b && a !== b && a.length > 2 && a.length < 60 && b.length < 60 && !known.has(a) && !a.includes(b) && !b.includes(a)) L.push({ t:`${lbl}: «${a}» المقصود به «${b}»`, from:a, to:b }); };
      for (const k in F) pair(before[k], res.data[k], F[k]);
      (before.acts || []).forEach((o, i) => { const nw = (res.data.acts || [])[i]; if (nw) for (const k in A) pair(o[k], nw[k], A[k]); });
      const n = await lrnAdd(L); if (n) setTimeout(() => toast(`تعلّم Copilot ${n} تصحيح، سيطبّقه في المرات القادمة ✓`), 600); } } catch (e) { console.warn("learn", e); }
  return res; };

/* ===== نافذة الإرفاق ===== */
const _intakeOpen60 = intakeOpen;
intakeOpen = function(files){ _intakeOpen60(files); if (S.form?.kind !== "intake") return;
  const h = $("#drawer .drawer-h h3"); if (h) h.textContent = "إرفاق ملف أو صورة";
  const inp = $("#iz-in"); if (inp) inp.accept = ATT_ACCEPT;
  const z = $("#iz"); if (z) { z.querySelector("svg")?.outerHTML && (z.querySelector("svg").outerHTML = `<svg width="30" height="30"><use href="#i-clip"/></svg>`); const b = z.querySelector("b"), s = z.querySelector(".s"); if (b) b.textContent = "اسحب أي ملف هنا، أو اضغط للاختيار"; if (s) s.textContent = "صورة، PDF، إكسل، وورد أو نص، يقرؤه Copilot ويضع كل معلومة في مكانها"; }
  const md = $(".iz-mode"); if (md && !(hasBridge() && brV() >= 1.1)) md.innerHTML = `<svg width="18" height="18"><use href="#i-clip"/></svg><span><b>Copilot غير متصل على هذا الجهاز</b><br><span class="s">سيقرأ النظام الملف بنفسه الآن. ولقراءة أدق بـ Copilot ركّب «جسر إنجاز» مرة واحدة.</span> <button type="button" class="btn btn-ghost" data-go="whatsapp" data-close>خطوات التركيب</button></span>`;
  const tab = document.querySelector('#iz-tabs [data-izmode="file"]'); if (tab) tab.textContent = "📎 إرفاق ملف";
  $("#iz-go") && ($("#iz-go").lastChild.textContent = " اقرأ وضع كل شيء في مكانه");
  const note = $("#iz-note")?.closest(".fld"); note?.insertAdjacentHTML("afterend", `<details class="lrn" id="lrn"><summary>📚 ما تعلّمه Copilot <span class="chip" id="lrn-n">…</span></summary>
    <span class="s">كل تصحيح تعمله في طلب قرأه Copilot يُحفظ هنا تلقائياً ويطبّقه في المرات القادمة. ويمكنك تعليمه قاعدة بنفسك:</span>
    <div class="lrn-add"><input class="f" id="lrn-in" placeholder="مثال: «مسجد الرحمن» في الجهراء اسمه في النظام «عبدالرحمن عوض»"><button type="button" class="btn" data-lrnadd>علّمه</button></div><div class="lrn-l" id="lrn-l"></div></details>`);
  lrnLoad().then(lrnPaint);
  if (files?.length) intakeAdd(files);
};
function lrnPaint(){ const n = $("#lrn-n"), l = $("#lrn-l"); if (n) n.textContent = (LRN.list || []).length;
  if (l) l.innerHTML = (LRN.list || []).slice(0, 30).map((x, i) => `<div class="lrn-i"><span>${esc(x.t)}</span>${S.admin ? `<button type="button" class="x" data-lrndel="${i}" aria-label="حذف">×</button>` : ""}</div>`).join("") || `<div class="s">لم يتعلّم شيئاً بعد</div>`; }

intakeAdd = function(list){
  for (const f of list) { if (!attKind(f)) { toast(`«${f.name}» نوع غير مدعوم`); continue; } if (INTAKE.files.length >= 8) break; INTAKE.files.push(f); }
  const box = $("#iz-files"); if (!box) return;
  box.innerHTML = INTAKE.files.map((f, i) => { const k = attKind(f); return `<div class="iz-f">${k === "img" ? `<img src="${URL.createObjectURL(f)}" alt="">` : `<span class="pdf att-${k}">${ATT_LBL[k]}</span>`}<span class="s">${esc(f.name.slice(0, 26))}</span><button type="button" class="x" data-izrm="${i}" aria-label="حذف">×</button></div>`; }).join("");
  const b = $("#iz-go"); if (b) b.disabled = !INTAKE.files.length;
};

/* استخراج النص من الإكسل والوورد والنصوص */
async function attText(f){ const k = attKind(f);
  if (k === "text" || (k === "sheet" && /\.csv$/i.test(f.name))) return await f.text();
  if (k === "sheet") { if (!window.XLSX) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
    const wb = XLSX.read(await f.arrayBuffer(), { type:"array" }); return wb.SheetNames.slice(0, 6).map(n => `## ورقة: ${n}\n` + XLSX.utils.sheet_to_csv(wb.Sheets[n], { blankrows:false }).split("\n").slice(0, 500).join("\n")).join("\n\n"); }
  if (k === "word") { if (!window.mammoth) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js");
    return (await mammoth.extractRawText({ arrayBuffer:await f.arrayBuffer() })).value; }
  return ""; }

const ATT_PROMPT = `مرفق ملف أرسله موظف في قسم الجاليات (قد يكون: صورة كتاب، طلب وارد، جدول إكسل، مستند وورد، قائمة خطباء أو منسقين، كشف حضور، أو أي بيانات أخرى). المطلوب بدقة عالية:
1) اقرأ كل ما فيه (عربي/إنجليزي/أوردو…) وحدّد نوعه بجملة واحدة.
2) قارن كل معلومة ببيانات النظام: طابق أسماء المساجد والجاليات والخطباء كما هي في ملف النظام، ولا تكرر شيئاً مسجلاً (نفس المسجد واليوم والوقت).
3) ضع كل معلومة في مكانها الصحيح بالأوامر المتاحة:
   - كتاب موافقة صادر (رقم وثيقة مثل 2609-1234): add_doc ثم add_act لكل نشاط غير مسجل.
   - طلب وارد بلا موافقة: add_request واحد يحوي كل الأنشطة (المدة لا تتجاوز 6 أشهر).
   - جدول/قائمة أنشطة: add_act لكل نشاط جديد، وupdate_act لما تغيّر في نشاط مسجل.
   - خطباء الجمعة وأرقامهم: update_khatib. توزيع خطب جمعة: set_sermon. حضور: log_attendance.
   - أي معلومة مهمة لا مكان لها: add_note.
4) اكتب بإيجاز ما فهمته وما ستضعه وأين، والنواقص، ثم ضع كتلة jaliyat-actions في النهاية.`;
const attPrompt = (note, extra) => ATT_PROMPT
  + (LRN.list?.length ? `\n\nقواعد تعلّمتها من تصحيحات الموظفين (طبّقها دائماً):\n${lrnText()}` : "")
  + (note ? `\nملاحظة الموظف: ${note}` : "")
  + (extra ? `\n\nمحتوى الملفات المرفقة (نص مستخرج):\n${extra.slice(0, 14000)}` : "");

/* الإرسال: يحفظ الأصل دائماً، ثم Copilot إن كان الجسر جاهزاً، وإلا القراءة على الجهاز */
async function attGo(){
  const files = INTAKE.files.slice(); if (!files.length) return;
  const note = $("#iz-note")?.value.trim() || ""; const b = $("#iz-go"); b.disabled = true; b.textContent = "جارٍ القراءة…";
  const rid = uuid4(); const paths = [], canvases = []; let pdf = null, extra = "";
  try {
    await lrnLoad();
    for (const f of files) { const k = attKind(f), ext = (f.name.match(/\.[a-z0-9]+$/i)?.[0] || "").toLowerCase();
      if (k === "img") { const { blob, canvas } = await compressImg(f); canvases.push(canvas); const p = `${rid}/${paths.length + 1}.jpg`; const up = await sb.storage.from("requests").upload(p, blob, { contentType:"image/jpeg" }); if (!up.error) paths.push(p); continue; }
      if (k === "pdf") pdf = pdf || f;
      else { const t = await attText(f); if (t.trim()) extra += `\n### ${f.name}\n${t}\n`; }
      const p = `${rid}/${paths.length + 1}${ext || ".bin"}`; const up = await sb.storage.from("requests").upload(p, f, { contentType:f.type || "application/octet-stream" }); if (!up.error) paths.push(p); }
    const { error } = await sb.from("requests").insert({ id:rid, data:{ date:TODAY, notes:note, acts:[], src:"attach", text:extra.slice(0, 20000) }, status:"جديد", files:paths });
    if (error) throw error;
  } catch (e) { b.disabled = false; b.textContent = "اقرأ وضع كل شيء في مكانه"; return writeFail(e); }
  await loadReqs();
  if (hasBridge() && brV() >= 1.1) {
    const file = canvases.length ? { name:`مرفق-${TODAY}.jpg`, content:await stitch(canvases), type:"image/jpeg" }
      : pdf ? { name:pdf.name, content:pdf, type:"application/pdf" }
      : { name:`مرفق-${TODAY}.md`, content:extra || note || "-", type:"text/markdown" };
    INTAKE.reqId = rid; INTAKE.waiting = false; INTAKE.sent = false;
    const msg = { type:"jaliyat-ask", intake:true, text:attPrompt(note, (canvases.length || pdf) ? extra : ""), file };
    closeDrawer(); if (S.view === "copilot" && BR.primed) brPost(msg); else { INTAKE.msg = msg; go("copilot"); }
    clearTimeout(INTAKE.timer);
    INTAKE.timer = setTimeout(() => { if (INTAKE.reqId === rid && !INTAKE.sent) { INTAKE.reqId = null; INTAKE.msg = null; toast("Copilot لم يجهز، أكملتُ القراءة على الجهاز"); attLocal(rid, files, extra); } }, 60000);
    toast("أُرسل المرفق لـ Copilot ليقرأه ويضعه في مكانه…");
  } else { closeDrawer(); attLocal(rid, files, extra); }
}
async function attLocal(rid, files, extra){
  const vis = files.filter(f => ["img", "pdf"].includes(attKind(f)));
  if (vis.length) return intakeLocal(rid, vis);
  const res = parseActs(extra); const acts = res.acts.map(a => tolAct(a));
  const phoneM = digits(extra).match(/\b(?:\+?965)?\s*([569]\d{7})\b/); const r = S.reqs.find(x => x.id === rid);
  await sb.from("requests").update({ data:{ ...(r?.data || {}), acts, comm:acts[0]?.comm || "", phone:phoneM?.[1] || "", src:"attach" } }).eq("id", rid); await loadReqs();
  if (S.view !== "inbox") go("inbox"); reqForm(rid); toast(acts.length ? `قرأتُ ${acts.length} نشاط من الملف، راجعها واعتمد` : "حُفظ الملف في الطلب، لم أجد أنشطة واضحة");
}
const _intakeGo60 = intakeGo;
intakeGo = function(){ return S.form?.mode === "paste" ? _intakeGo60() : attGo(); };

document.addEventListener("click", async ev => { const t = ev.target.closest("button"); if (!t) return;
  if (t.dataset.lrnadd !== undefined) { const i = $("#lrn-in"); const v = i?.value.trim(); if (!v) return; const m = v.match(/«([^»]+)»[^«]*«([^»]+)»/);
    const n = await lrnAdd([{ t:v, from:m?.[1] || "", to:m?.[2] || "" }]); if (n) { i.value = ""; lrnPaint(); toast("تعلّمها Copilot ✓"); } return; }
  if (t.dataset.lrndel !== undefined) { await lrnDel(+t.dataset.lrndel); lrnPaint(); } });
NEWF.splice(1, 0, ["v78-attach", "id:ocr-top", "إرفاق أي ملف ويقرؤه Copilot", "زر «إرفاق» أعلى الشاشة (مكان الكاميرا): أرفق صورة أو PDF أو إكسل أو وورد أو نص، فيقرؤه Copilot ويضع كل معلومة في مكانها (نشاط، طلب، وثيقة، خطيب، حضور، ملاحظة). ويتعلّم من كل تصحيح تعمله.", true, "2026-10-25"]);
