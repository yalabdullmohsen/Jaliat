/* ===== v53: request journey · delay indicator · reports analytics · sermon recordings ===== */
Object.assign(TITLES, { sermrec:"تسجيلات الخطب" });

/* ---------- journey map inside the request drawer ---------- */
const JR_DESC = { in:"استلم القسم الطلب", study:"مراجعة البيانات والمسجد والوقت", letter:"كتاب رسمي لإدارة المساجد في وثيقة", approval:"صدور موافقة إدارة المساجد", permit:"تصريح الدرس والباركود", start:"أول درس بتأكيد الإمام" };
function jrHTML(j){ if (!j?.stages) return ""; const S = j.stages, cur = j.cur || 0, dd = n => { n = Math.max(1, Math.round(+n || 0)); return n === 1 ? "يوم" : n === 2 ? "يومان" : n <= 10 ? n + " أيام" : n + " يوماً"; };
  return `<div class="jr2"><div class="jr2-h"><b>رحلة الطلب</b><span>${j.rejected ? `<span class="chip bad">لم يُعتمد</span>` : j.eta ? `الاكتمال المتوقع ${fmt(j.eta)}${j.est ? " (تقديري)" : ""}` : `<span class="chip ok">اكتملت</span>`}</span></div>
    <div class="jr2-r">${S.map((s, i) => { const c = i === cur && !j.rejected && i < S.length - 1, dn = !!s.at && !c;
      const ln = !!S[i + 1]?.at && i + 1 <= cur; return `<div class="jr2-s${dn ? " done" : ""}${c ? " cur" : ""}${ln ? " ln" : ""}" title="${esc(JR_DESC[s.k] || "")}"><i>${dn ? "✓" : i + 1}</i><b>${esc(s.t)}</b><span>${s.at ? fmt(String(s.at).slice(0, 10)) : i > cur ? "عادةً " + dd(s.typ) : ""}</span></div>`; }).join("")}</div></div>`; }
const _reqForm53 = reqForm;
reqForm = async function(id){ await _reqForm53(id); const { data } = await sb.rpc("req_journey", { p_id:id }); if (!data || S.form?.id !== id) return;
  const host = $("#rq-org")?.closest(".g2"); if (host) host.insertAdjacentHTML("beforebegin", jrHTML(data)); };

/* ---------- delay indicator on incoming requests ---------- */
const OPEN_ST = s => !["معتمد", "مرفوض", "مكتمل"].includes(s);
const rqAge = r => Math.floor((Date.now() - new Date(r.created_at)) / 864e5);
const _vInbox53 = vInbox;
vInbox = function(){ let h = _vInbox53();
  for (const r of S.reqs) { if (!OPEN_ST(r.status) || !r.created_at) continue; const d = rqAge(r);
    h = h.replace(`data-rq="${r.id}"><div class="rq-h">`, `data-rq="${r.id}"><div class="rq-h"><span class="chip ${d > 10 ? "bad" : d > 5 ? "warn" : ""}" title="منذ وصول الطلب">${d === 0 ? "اليوم" : d === 1 ? "منذ يوم" : d === 2 ? "منذ يومين" : d <= 10 ? `منذ ${d} أيام` : `منذ ${d} يوماً`}</span>`); }
  return h; };
const _prio53 = priorities;
priorities = function(){ const P = _prio53(); const L = S.reqs.filter(r => OPEN_ST(r.status) && r.created_at && rqAge(r) > 5);
  if (L.length && S.canWrite) P.push({ w:91, k:"bad", t:`${L.length} طلب وارد تجاوز 5 أيام دون إنجاز`, s:L.slice(0, 2).map(r => (r.data?.comm || r.data?.org || "طلب") + " منذ " + rqAge(r) + " يوم").join(" · "), act:{ go:"inbox", l:"الطلبات" } });
  return P.sort((a, b) => b.w - a.w); };

/* ---------- analytics of coordinators' monthly reports ---------- */
function crAnalytics(){
  const R = S.creps || []; if (!R.length) return `<div class="empty">التحليل يظهر بعد وصول تقارير المنسقين الشهرية من البوابة.</div>`;
  const months = [...new Set(R.map(r => r.period).filter(Boolean))].sort().slice(-6), last = months[months.length - 1];
  const by = {}; R.forEach(r => { if (!months.includes(r.period)) return; const k = r.comm; by[k] = by[k] || {}; const d = r.data || {}, m = by[k][r.period] = by[k][r.period] || { a:0, c:0, l:0 }; m.a = Math.max(m.a, +d.attend || 0); m.c = Math.max(m.c, +d.converts || 0); m.l = Math.max(m.l, +d.lessons || 0); });
  const sum = (f, p) => Object.values(by).reduce((s, x) => s + (x[p]?.[f] || 0), 0);
  const mName = p => { const [y, m] = p.split("-"); return new Date(+y, +m - 1, 1).toLocaleDateString("ar-KW-u-nu-latn", { month:"short" }); };
  const rows = Object.keys(by).map(c => { const x = by[c], vals = months.map(p => x[p]?.a || 0), prev = vals.slice(0, -1).filter(v => v), avg = prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : 0, now = x[last]?.a || 0;
    const trend = !x[last] ? "none" : avg && now < avg * .7 ? "down" : avg && now > avg * 1.2 ? "up" : "flat"; return { c, x, vals, trend, conv:months.reduce((s, p) => s + (x[p]?.c || 0), 0) }; })
    .sort((a, b) => ({ down:0, none:1, flat:2, up:3 }[a.trend] - { down:0, none:1, flat:2, up:3 }[b.trend]) || a.c.localeCompare(b.c, "ar"));
  const mx = Math.max(1, ...rows.flatMap(r => r.vals)), down = rows.filter(r => r.trend === "down").length, miss = rows.filter(r => r.trend === "none").length;
  return `<div class="wq-tiles pv-t"><div class="wq-tile ok"><b>${sum("a", last).toLocaleString("en")}</b><span>متوسط الحضور</span><small>${mName(last)}، كل الجاليات</small></div><div class="wq-tile"><b>${sum("c", last)}</b><span>مهتدون جدد</span><small>${mName(last)}</small></div><div class="wq-tile"><b>${sum("l", last)}</b><span>درس أُقيم</span><small>${mName(last)}</small></div><div class="wq-tile${down ? " bad" : ""}"><b>${down}</b><span>جالية نشاطها نازل</span><small>${miss} لم ترسل تقرير ${mName(last)}</small></div></div>
  <div class="pv-list ana">${rows.map(r => `<div class="pv-r"><div class="pv-n"><b>${esc(r.c)}</b><span>${r.conv ? r.conv + " مهتدٍ خلال الفترة" : "لا مهتدين مسجّلين"}</span></div>
    <div class="ana-b">${months.map((p, i) => `<i title="${mName(p)}: ${r.vals[i]}" style="height:${Math.max(3, Math.round(r.vals[i] / mx * 34))}px"${p === last ? ' class="l"' : ""}></i>`).join("")}</div>
    <span class="chip ${r.trend === "down" ? "bad" : r.trend === "up" ? "ok" : ""}">${r.trend === "down" ? "نازل" : r.trend === "up" ? "صاعد" : r.trend === "none" ? "لم يصل تقرير" : "مستقر"}</span></div>`).join("")}</div>
  <p class="s" style="margin:8px 4px">الأعمدة: متوسط الحضور في آخر ${months.length} أشهر (${months.map(mName).join("، ")}). «نازل» إذا قلّ حضور الشهر الأخير عن 70% من متوسط ما قبله.</p>`; }

/* ---------- sermon recordings (from the coordinators' portal) ---------- */
S.srecs = []; S.ftopics = [];
async function srecLoad(){ sb.from("friday_topics").select("*").order("fri", { ascending:false }).limit(30).then(({ data }) => { S.ftopics = data || []; if (S.view === "sermrec" && $("#drawer").hidden) render(); }); const { data } = await sb.from("sermon_recs").select("*").neq("comm", "__test__").order("created_at", { ascending:false }).limit(300); S.srecs = data || []; }
const _boot9s53 = boot9; boot9 = function(){ _boot9s53(); srecLoad().then(() => { if ($("#drawer").hidden && ["sermrec", "home"].includes(S.view)) render(); }); };
const SREC_ST = { new:["بانتظار التفريغ", ""], working:["جارٍ التفريغ والترجمة", "warn"], done:["مترجمة", "ok"], error:["تعذّرت الترجمة", "bad"], waiting_key:["الترجمة غير مفعّلة", "warn"] };
function vSermRec(){ const f = S.f.srf || "all", L = S.srecs.filter(r => f === "all" || (f === "new" ? !r.reviewed_at : f === "flag" ? r.flags && !/لا ملاحظات/.test(r.flags) : f === "off" ? r.adherence && r.adherence !== "ملتزم" : true));
  const wk = S.srecs.some(r => r.status === "waiting_key");
  return `${wk ? `<div class="check"><b>الترجمة التلقائية تحتاج تفعيلاً</b><span>التسجيلات تصل وتُسمع الآن. للترجمة المجانية: مفتاح Gemini مجاني من aistudio.google.com يُضاف باسم GEMINI_API_KEY في Supabase (Edge Functions ثم Secrets)، ثم «إعادة الترجمة».</span></div>` : ""}
  ${ftCard()}
  <div class="toolbar"><div class="seg">${[["all", "الكل", S.srecs.length], ["off", "خرج عن الموضوع", S.srecs.filter(r => r.adherence && r.adherence !== "ملتزم").length], ["new", "لم يُطّلع عليها", S.srecs.filter(r => !r.reviewed_at).length], ["flag", "فيها ملاحظات", S.srecs.filter(r => r.flags && !/لا ملاحظات/.test(r.flags)).length]].map(([k, l, n]) => `<button type="button" class="${f === k ? "on" : ""}" data-srf="${k}">${l} <span class="num">${n}</span></button>`).join("")}</div></div>
  <div class="sr-l">${L.map(r => { const st = r.status === "working" && r.seg ? [`جارٍ الترجمة: الجزء ${r.seg + 1}${r.segs ? " من " + r.segs : ""}`, "warn"] : SREC_ST[r.status] || SREC_ST.new, fl = r.flags && !/لا ملاحظات/.test(r.flags);
    return `<div class="panel sr-i"><div class="sr-h"><div><b>${esc(r.khatib || "خطيب")}</b><span class="s">${esc(r.comm)}${r.mosque ? " · " + esc(r.mosque) : ""} · ${r.fri ? fmt(r.fri) : fmt(String(r.created_at).slice(0, 10))}${r.lang ? " · " + esc(r.lang) : ""}${r.secs ? " · " + Math.round(r.secs / 60) + " دقيقة" : ""}</span></div>
      <div class="sr-c"><span class="chip ${st[1]}">${st[0]}</span>${r.reviewed_at ? `<span class="chip ok">اطُّلع عليها</span>` : ""}</div></div>
      <div class="sr-a" id="sra-${r.id}"><button type="button" class="btn" data-srplay="${r.id}">${icon("i-mic")} استماع</button></div>
      ${r.adherence ? `<div class="sr-adh ${r.adherence === "ملتزم" ? "ok" : r.adherence === "خرج جزئياً" ? "warn" : "bad"}"><div><b>${esc(r.adherence)}</b>${r.adherence_score != null ? `<span>${r.adherence_score}% التزام بموضوع الخطبة</span>` : ""}</div>${r.adherence_note ? `<p>${esc(r.adherence_note)}</p>` : ""}</div>` : r.adherence_note ? `<span class="s bad-t">${esc(r.adherence_note)}</span>` : ""}
      ${fl ? `<div class="check"><b>ملاحظات تستحق الانتباه</b><span>${esc(r.flags)}</span></div>` : ""}
      ${r.summary ? `<div class="sr-s"><b>الملخص</b><p>${esc(r.summary)}</p></div>` : ""}
      ${r.translation ? `<details class="sr-d"><summary>الترجمة العربية الكاملة</summary><p>${esc(r.translation).replace(/\n/g, "<br>")}</p></details>` : ""}
      ${r.transcript ? `<details class="sr-d"><summary>النص الأصلي</summary><p dir="auto">${esc(r.transcript).replace(/\n/g, "<br>")}</p></details>` : ""}
      ${r.err ? `<span class="s bad-t">${esc(r.err)}</span>` : ""}
      ${S.canWrite ? `<div class="sr-f">${!r.reviewed_at ? `<input class="f" id="srn-${r.id}" placeholder="ملاحظة القسم (اختياري)"><button type="button" class="btn btn-primary" data-srok="${r.id}">اطّلعت</button>` : r.review_note ? `<span class="s">ملاحظة القسم: ${esc(r.review_note)}</span>` : ""}${["error", "waiting_key"].includes(r.status) ? `<button type="button" class="btn" data-srretry="${r.id}">إعادة الترجمة</button>` : ""}${r.translation && r.fri && S.ftopics.some(t => t.fri === r.fri) ? `<button type="button" class="btn" data-srcmp="${r.id}">${r.adherence ? "إعادة المقارنة" : "مقارنة بموضوع الخطبة"}</button>` : ""}</div>` : ""}${r.translation ? `<div class="sr-f"><button type="button" class="btn" data-srcopy="${r.id}">نسخ الترجمة</button>${r.transcript ? `<button type="button" class="btn btn-ghost" data-srcopyo="${r.id}">نسخ النص الأصلي</button>` : ""}</div>` : ""}</div>`; }).join("") || `<div class="empty">لا توجد تسجيلات. يرسلها المنسق من البوابة: المراسلات ثم «خطبة الجمعة».</div>`}</div>`; }
document.addEventListener("click", async ev => { const t = ev.target.closest("[data-srf],[data-srplay],[data-srok],[data-srretry],[data-srcopy],[data-srcopyo],[data-srcmp],[data-ftsave],[data-ftfri]"); if (!t) return; const D = t.dataset;
  if (D.srcopy || D.srcopyo) { const r = S.srecs.find(x => x.id === (D.srcopy || D.srcopyo)); const txt = D.srcopy ? `خطبة الجمعة ${r.fri ? fmt(r.fri) : ""}، ${r.comm}، الخطيب: ${r.khatib || ""}\n\n${r.translation}` : r.transcript; try { await navigator.clipboard.writeText(txt); toast("نُسخ"); } catch (_) { toast("تعذّر النسخ"); } return; }
  if (D.srcmp) { const { error } = await sb.rpc("staff_sermon_compare", { p_id:D.srcmp }); if (error) return writeFail(error); toast("جارٍ المقارنة بموضوع الخطبة…"); setTimeout(async () => { await srecLoad(); render(); }, 25000); return; }
  if (D.ftfri) { S.f.ftfri = D.ftfri; return render(); }
  if (D.ftsave !== undefined) { const fri = S.f.ftfri || lastFri(), title = $("#ft-t")?.value.trim(), pts = $("#ft-p")?.value.trim(); if (!title) return toast("اكتب عنوان الخطبة");
    const { data, error } = await sb.rpc("staff_topic_save", { p_fri:fri, p_title:title, p_points:pts }); if (error) return writeFail(error); toast(data?.compared ? `حُفظ الموضوع، وتجري مقارنة ${data.compared} خطبة` : "حُفظ موضوع الخطبة"); await srecLoad(); render(); if (data?.compared) setTimeout(async () => { await srecLoad(); render(); }, 30000); return; }
  if (D.srf) { S.f.srf = D.srf; return render(); }
  if (D.srplay) { const r = S.srecs.find(x => x.id === D.srplay); const { data } = await sb.storage.from("requests").createSignedUrl(r.path, 3600); if (!data?.signedUrl) return toast("تعذّر تحميل التسجيل");
    $("#sra-" + r.id).innerHTML = `<audio controls autoplay src="${data.signedUrl}" style="width:100%"></audio>`; return; }
  if (D.srok) { const id = D.srok, note = $("#srn-" + id)?.value.trim() || null; const { error } = await sb.from("sermon_recs").update({ reviewed_by:S.me?.id, reviewed_at:new Date().toISOString(), review_note:note }).eq("id", id); if (error) return writeFail(error); await srecLoad(); render(); return toast("سُجّل الاطلاع"); }
  if (D.srretry) { const { error } = await sb.rpc("staff_sermon_retry", { p_id:D.srretry }); if (error) return writeFail(error); toast("أُعيد إرسالها للترجمة"); setTimeout(async () => { await srecLoad(); render(); }, 4000); } });
const _prio53s = priorities;
priorities = function(){ const P = _prio53s(); const n = S.srecs.filter(r => !r.reviewed_at).length;
  if (n) P.push({ w:60, k:"gold", t:`${n} تسجيل خطبة لم يُطّلع عليه`, s:"من بوابة المنسقين، مع الترجمة العربية", act:{ go:"sermrec", l:"استماع" } }); return P.sort((a, b) => b.w - a.w); };

NEWF.splice(1, 0, ["v53-journey", "nav:inbox", "رحلة الطلب وتسجيلات الخطب", "داخل كل طلب: خريطة رحلته وأين وصل ومتى يكتمل عادةً، ومدة انتظار كل طلب على بطاقته. وصفحة «تسجيلات الخطب» لسماع خطب الجاليات مع ترجمتها، و«التحليل» في بوابة المنسقين لتقاريرهم الشهرية.", false, "2026-10-20"]);

/* the week's official sermon topic: sermons are compared against it automatically */
function lastFri(off = 0){ const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 2) % 7) - 7 * off); return isoOf(d); }
function ftCard(){ const fris = [lastFri(0), lastFri(1), lastFri(2)], cur = S.f.ftfri || fris[0], t = S.ftopics.find(x => x.fri === cur);
  return `<div class="panel ft"><div class="ft-h"><div><b>موضوع خطبة الجمعة المعتمد</b><span class="s">تُقارَن كل خطبة تصل بهذا الموضوع تلقائياً، ويظهر هل التزم الخطيب أو خرج عنه.</span></div>
    <div class="seg">${fris.map(f => `<button type="button" class="${f === cur ? "on" : ""}" data-ftfri="${f}">${fmt(f)}${S.ftopics.some(x => x.fri === f) ? " ✓" : ""}</button>`).join("")}</div></div>
    ${S.canWrite ? `<div class="ft-f"><input class="f" id="ft-t" placeholder="عنوان الخطبة الموحدة" value="${esc(t?.title || "")}"><textarea class="f" id="ft-p" rows="3" placeholder="الصق نص الخطبة المعتمدة أو أهم نقاطها (كلما كان أدق كانت المقارنة أدق)">${esc(t?.points || "")}</textarea><button type="button" class="btn btn-primary" data-ftsave>${t ? "تحديث الموضوع" : "حفظ الموضوع"}</button></div>` : t ? `<p><b>${esc(t.title)}</b></p>` : `<span class="s">لم يُسجَّل موضوع لهذه الجمعة.</span>`}</div>`; }
