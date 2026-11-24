/* ================= v100 (JL-8 «نضيف»): سجل الصفحات، وملف الشخص الموحّد، ولوحة التفعيل، وتكليف خطيب الجمعة ================= */

/* 1) سجل فتح الصفحات (جدول page_views في 2026-11-25_jl8_adds.sql): صفحة واحدة لكل تنقّل، وتتوقف إن لم يُطبَّق الترحيل بعد */
const PV = { on:true, last:"", t:0 };
async function pvLog(v){ if (!PV.on || !S.me || !v || (v === PV.last && Date.now() - PV.t < 60000)) return; PV.last = v; PV.t = Date.now();
  const { error } = await sb.from("page_views").insert({ view:String(v).slice(0, 40) });
  if (error) { PV.on = false; console.info("page_views متوقف حتى تطبيق الترحيل:", error.message); } }
const _go100 = go;
go = function(v, opt){ const r = _go100.apply(this, arguments); pvLog(S.view); return r; };

/* 2) ملف الشخص الموحّد: «نشاطاته» (add92) يُكمَّل بتواصله وتصاريحه وخطبه في الصفحة نفسها */
const _personActs100 = personActs;
personActs = function(o){ _personActs100(o); const b = $("#drawer .drawer-b"); if (!b) return;
  const me = lectNames(o.name || ""), sh = o.role === "شيخ";
  const co = (S.coords || []).find(c => sameLect(lectNames(c.name || ""), me)), phone = o.phone || co?.phone || "";
  const acts = new Set(S.E.filter(e => sh ? sameLect(e.names || [], me) : e.comm === o.comm).map(e => e.id));
  const P = S.permits.filter(p => !p.revoked && (acts.has(p.act_id) || (sh && sameLect(lectNames(p.data?.sheikh || ""), me)))).sort((a, b) => String(b.until).localeCompare(String(a.until)));
  const K = [...S.khatibs.values()].filter(k => sameLect(lectNames(k.pri || ""), me) || sameLect(lectNames(k.bak || ""), me));
  const done = typeof SR !== "undefined" ? [...SR.rows.values()].filter(r => r.who !== "none" && sameLect(lectNames(r.name || ""), me)).length : 0;
  b.insertAdjacentHTML("beforeend", `<h4 class="pa-h">التواصل</h4><div class="pa-l">${phone ? `<div class="li"><bdi dir="ltr">${esc(phone)}</bdi> <button type="button" class="btn btn-ghost" data-pfwa="${esc(phone)}">${icon("i-wa")} واتساب</button></div>` : `<div class="empty">لا يوجد رقم مسجّل</div>`}</div>
    <h4 class="pa-h">التصاريح <span class="chip">${P.length}</span></h4><div class="pa-l">${P.length ? P.slice(0, 20).map(p => `<button type="button" class="li" data-permit="${esc(p.id)}"><span><bdi dir="ltr">${esc(p.no || "")}</bdi> · ${esc(p.data?.mosque || "")} · حتى ${fmt(p.until)}</span></button>`).join("") : `<div class="empty">لا تصاريح</div>`}</div>
    ${K.length || done ? `<h4 class="pa-h">خطب الجمعة <span class="chip">${K.length} مسجد</span></h4><div class="pa-l">${K.map(k => `<div class="li">${esc(k.mosque || "")} · ${sameLect(lectNames(k.pri || ""), me) ? "خطيب أساسي" : "احتياط"}</div>`).join("")}${done ? `<div class="li s">${done} خطبة مسجّلة في سجل الخطب</div>` : ""}</div>` : ""}`); };
document.addEventListener("click", ev => { const t = ev.target.closest("[data-pfwa]"); if (t) waOpen(t.dataset.pfwa, "السلام عليكم ورحمة الله وبركاته"); });

/* 4) لوحة التفعيل: تبويب «التفعيل» في بوابة المنسقين: من فعّل ومن لم يفعّل، وإرسال جماعي متتابع برابط البوابة */
const actMsg = a => `السلام عليكم ورحمة الله وبركاته\nالأخ الفاضل / ${a.name}\n\nحسابكم في بوابة إنجاز (${a.comm}) جاهز للتفعيل.\nادخلوا من الرابط، واختاروا «إنشاء حساب»، واكتبوا رقمكم المدني وهاتفكم واختاروا رمزًا سريًا:\n${PT_ONE()}`;
const _vPortal100 = vPortal;
vPortal = function(){ const A = (S.pacc || []), wait = A.filter(a => !a.ready), on = S.f.pvt === "act";
  let h = _vPortal100().replace(/(<div class="seg">)/, `$1<button type="button" class="${on ? "on" : ""}" data-pvt="act">التفعيل <span class="num">${wait.length}</span></button>`);
  if (!on) return h;
  const body = `<div class="panel act-p"><div class="panel-h"><h3>تفعيل حسابات البوابة</h3><span class="s">${A.length - wait.length} مفعّل من ${A.length} · ${wait.length} لم يفعّل</span>
    ${wait.length && S.canWrite ? `<button type="button" class="btn btn-primary" data-actall>${icon("i-wa")} إرسال رابط التفعيل للكل (${wait.length})</button>` : ""}</div>
    <div class="pv-list">${wait.map(a => `<div class="pv-r"><div class="pv-n"><b>${esc(a.name)}</b><span>${a.role === "شيخ" ? "شيخ/خطيب" : a.role === "نائب" ? "نائب منسق" : "منسق"} · ${esc(a.comm)}${a.phone ? ` · <bdi dir="ltr">${esc(a.phone)}</bdi>` : ""}</span></div>
      ${a.phone && S.canWrite ? `<div class="pv-b"><button type="button" class="btn btn-ghost" data-act1="${esc(a.id)}">${icon("i-wa")} إرسال</button></div>` : `<span class="chip warn">بلا هاتف</span>`}</div>`).join("") || `<div class="empty">كل الحسابات مفعّلة ✓</div>`}</div></div>`;
  return h.replace(/<div class="pv-list">[\s\S]*$|<div class="empty">[\s\S]*$/, "") + body; };
document.addEventListener("click", ev => { const t = ev.target.closest("[data-actall],[data-act1]"); if (!t) return; const A = (S.pacc || []).filter(a => !a.ready && a.phone);
  if (t.dataset.act1) { const a = A.find(x => x.id === t.dataset.act1); if (a) waOpen(a.phone, actMsg(a)); return; }
  let i = 0; const next = () => { const a = A[i++]; if (a) waGo(a.phone, actMsg(a), i < A.length ? next : null, a.name); }; next(); });

/* 5) تكليف خطيب الجمعة: وثيقة تُطبع وتُرسل (ليست تصريحًا رسميًا)، من صف المسجد في «جدول الجمعة» */
function khLetter(id, fri){ const k = S.khatibs.get(id); if (!k) return; const name = (typeof fsCell === "function" ? fsCell(fri, id, k).name : k.pri) || k.pri || "";
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تكليف خطيب</title><style>body{font-family:system-ui,"Noto Naskh Arabic",sans-serif;max-width:720px;margin:40px auto;line-height:2;color:#111;padding:0 24px}h1{text-align:center;font-size:24px;margin:0 0 4px}.s{text-align:center;color:#555;margin:0 0 28px}table{width:100%;border-collapse:collapse;margin:16px 0}td{border:1px solid #bbb;padding:8px 12px}td:first-child{width:32%;background:#f6f3ea;font-weight:700}.f{margin-top:56px;display:flex;justify-content:space-between}.n{font-size:13px;color:#666;margin-top:24px}@media print{body{margin:0 auto}}<\/style></head><body>
    <h1>تكليف خطيب جمعة</h1><p class="s">قسم الجاليات ورعاية المهتدين وطلبة البعوث</p>
    <p>الشيخ الفاضل / <b>${esc(name)}</b> حفظه الله</p><p>السلام عليكم ورحمة الله وبركاته، وبعد:</p>
    <p>نكلّفكم بإلقاء خطبة الجمعة بلغة الجالية في المسجد الموضّح أدناه، شاكرين تعاونكم.</p>
    <table><tr><td>المسجد</td><td>${esc(k.mosque || "")}</td></tr><tr><td>المنطقة</td><td>${esc([k.area, k.gov].filter(Boolean).join("، "))}</td></tr><tr><td>الجالية</td><td>${esc(k.comm || "")}</td></tr><tr><td>يوم الجمعة</td><td>${fmt(fri)}</td></tr>${k.bak ? `<tr><td>الخطيب الاحتياط</td><td>${esc(k.bak)}</td></tr>` : ""}</table>
    <p>نرجو إبلاغ القسم مبكرًا إن تعذّر الحضور ليُكلَّف الاحتياط.</p><div class="f"><span>رئيس القسم</span><span>التاريخ: ${fmt(TODAY)}</span></div>
    <p class="n">هذه وثيقة تكليف داخلية للتنظيم، وليست تصريحًا رسميًا.</p></body></html>`;
  const w = window.open("", "_blank"); if (!w) return toast("اسمح بالنوافذ المنبثقة لطباعة التكليف"); w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 300); }
const khMsg = (k, fri, name) => `السلام عليكم ورحمة الله وبركاته\nالشيخ الفاضل / ${name}\n\nنكلّفكم بإلقاء خطبة الجمعة ${fmt(fri)} في ${k.mosque || "المسجد"}${k.area ? " (" + k.area + ")" : ""}${k.comm ? " لجالية " + k.comm : ""}.\nنرجو التأكيد، وإبلاغنا مبكرًا إن تعذّر الحضور.\nجزاكم الله خيرًا.`;
document.addEventListener("click", ev => { const t = ev.target.closest("[data-khl],[data-khwa]"); if (!t) return; const id = t.dataset.khl || t.dataset.khwa, fri = t.dataset.fri, k = S.khatibs.get(id); if (!k) return;
  if (t.dataset.khl) return khLetter(id, fri); const name = fsCell(fri, id, k).name || k.pri; waOpen(k.pph, khMsg(k, fri, name)); });
/* أزرار التكليف تُضاف لكل صف بعد الرسم (المعرّف من زر الاحتياط/التذكير أو التسجيل في الصف نفسه) */
const _afterRender100 = afterRender;
afterRender = function(v){ _afterRender100(v); if (v !== "fsched") return;
  document.querySelectorAll(".fs-tb tbody tr[data-khid]").forEach(tr => { const a = tr.querySelector(".fs-a"); if (!a || a.querySelector("[data-khl]")) return;
    const id = tr.dataset.khid, fri = tr.dataset.fri, k = S.khatibs.get(id); if (!k || !fsCell(fri, id, k).name) return;
    a.insertAdjacentHTML("afterbegin", `<button type="button" class="btn btn-ghost" data-khl="${esc(id)}" data-fri="${fri}" title="تكليف خطيب للطباعة">${icon("i-doc")} تكليف</button>${k.pph ? `<button type="button" class="btn btn-ghost" data-khwa="${esc(id)}" data-fri="${fri}" title="إرسال التكليف">${icon("i-wa")} إرسال التكليف</button>` : ""}`); }); };
