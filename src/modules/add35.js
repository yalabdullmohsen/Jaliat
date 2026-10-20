/* ================= v35: decisions / circulars → coordinators on WhatsApp (one tap each + log) ================= */
S.waSent = S.waSent || {};
const waTargets = () => { const all = S.coords.filter(c => c.phone && waNum(c.phone).length >= 10 && c.status !== "موقوف");
  return S.waInc === "all" ? all : all.filter(c => (c.role || "منسق") === "منسق"); };
function waDecText(d, c){
  const hi = c ? `الأخ الفاضل/ ${c.name} حفظه الله${c.lang ? `\n${c.role || "منسق"} جالية ${c.lang}` : ""}` : "الإخوة الأفاضل منسقو الجاليات حفظهم الله";
  return `السلام عليكم ورحمة الله وبركاته\n${hi}\n\nنحيطكم علماً بـ${d.kind === "تعميم" ? "التعميم" : d.kind === "توجيه" ? "التوجيه" : "القرار"} الصادر عن القسم برقم ق-${d.no}:\n\n*${d.title}*${d.body ? `\n${d.body}` : ""}\n\nنرجو الاطلاع والعمل بموجبه، وجزاكم الله خيراً.${SIGN}`; }
async function waSentLoad(id){ const { data } = await sb.from("wa_sends").select("phone,sent_at").eq("ref", id); S.waSent[id] = new Map((data || []).map(r => [waNum(r.phone), r.sent_at])); }
function decWaBody(d){ const L = waTargets(), sent = S.waSent[d.id] || new Map(), q = norm(S.waQ || "");
  const V = L.filter(c => !q || norm([c.name, c.comm, c.lang].join(" ")).includes(q)), n = L.filter(c => sent.has(waNum(c.phone))).length;
  return `<div class="ws-top"><div class="seg"><button type="button" data-wainc="co" class="${S.waInc !== "all" ? "on" : ""}">المنسقون</button><button type="button" data-wainc="all" class="${S.waInc === "all" ? "on" : ""}">المنسقون ونوابهم</button></div><span class="chip ${n === L.length ? "ok" : ""}">أُرسل ${n} من ${L.length}</span></div>
    <div class="ws-bar"><i style="width:${L.length ? n / L.length * 100 : 0}%"></i></div>
    <div class="ws-acts"><button type="button" class="btn btn-primary" data-wanext>📲 إرسال للتالي</button><button type="button" class="btn" data-wagrp>📋 نسخ نص للمجموعة</button></div>
    <span class="hint">كل ضغطة تفتح محادثة المنسق في واتساب والرسالة جاهزة، اضغط «إرسال» هناك ثم ارجع واضغط «إرسال للتالي».</span>
    <div class="search"><svg><use href="#i-search"/></svg><input class="f" id="ws-q" placeholder="ابحث باسم المنسق أو الجالية…" value="${esc(S.waQ || "")}"></div>
    <div class="ws-l">${V.map(c => { const k = waNum(c.phone), at = sent.get(k); return `<div class="ws-i${at ? " done" : ""}"><div><b>${esc(c.name)}</b><span class="s">${esc(c.comm || c.lang || "")}${c.role && c.role !== "منسق" ? " · " + esc(c.role) : ""}</span></div>${at ? `<span class="chip ok">✓ ${fmtTime(at)}</span>` : ""}<button type="button" class="btn ${at ? "btn-ghost" : ""}" data-wasend="${k}">${at ? "إعادة" : "إرسال"}</button></div>`; }).join("") || `<div class="empty s">لا يوجد منسقون بأرقام صحيحة</div>`}</div>`; }
async function decWa(id){ const d = S.decs.find(x => x.id === id); if (!d) return; S.form = { kind:"decwa", id }; S.waQ = "";
  openDrawer(`إرسال ق-${d.no} للمنسقين بالواتساب`, `<details class="ws-pv"><summary>نص الرسالة</summary><div class="q-body">${esc(waDecText(d, { name:"(اسم المنسق)", lang:"(الجالية)" })).replace(/\n/g, "<br>")}</div></details><div id="ws-box"><div class="empty s">جارٍ التحميل…</div></div>`, `<button class="btn btn-ghost" data-close>إغلاق</button>`);
  await waSentLoad(id); decWaPaint(); }
function decWaPaint(){ const d = S.decs.find(x => x.id === S.form?.id), box = $("#ws-box"); if (!d || !box) return; const f = document.activeElement?.id === "ws-q"; box.innerHTML = decWaBody(d); if (f) { const i = $("#ws-q"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
function waGo(phone, text){ const n = waNum(phone);
  if (isTouchDev()) return window.open(`https://wa.me/${n}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  window.open(`https://web.whatsapp.com/send?phone=${n}&text=${encodeURIComponent(text)}`, "enjaz-whatsapp"); }
async function decWaSend(k){ const d = S.decs.find(x => x.id === S.form?.id), c = waTargets().find(x => waNum(x.phone) === k) || S.coords.find(x => waNum(x.phone) === k); if (!d || !c) return;
  waGo(c.phone, waDecText(d, c), () => decWaNextFor(d.id), c.name);
  const { error } = await sb.from("wa_sends").insert({ kind:"decision", ref:d.id, phone:k, name:c.name, comm:c.comm || null }); if (error) return writeFail(error);
  (S.waSent[d.id] = S.waSent[d.id] || new Map()).set(k, new Date().toISOString()); decWaPaint(); }
/* decision card: admin button + count */
const _decCard35 = decCard;
decCard = function(d){ const h = _decCard35(d); if (!S.admin || d.cancelled) return h; return h.replace('<div class="dc-f">', `<div class="dc-f"><button type="button" class="lnk" data-decwa="${d.id}">📲 إرسال للمنسقين بالواتساب</button>`); };
/* new decision: optional "send to coordinators" right after issuing */
const _decForm35 = decForm;
decForm = function(){ _decForm35(); const h = $("#dc-b")?.closest(".fld"); if (h) h.insertAdjacentHTML("afterend", `<label class="ws-chk"><input type="checkbox" id="dc-wa" checked> إرسال للمنسقين بالواتساب بعد الإصدار</label>`); };
const _decSave35 = decSave;
decSave = async function(){ const wa = $("#dc-wa")?.checked, top = S.decs[0]; await _decSave35(); if (wa && S.decs[0] && S.decs[0] !== top) decWa(S.decs[0].id); };
document.addEventListener("click", async ev => { const t = ev.target.closest("button"); if (!t) return; const D = t.dataset;
  if (D.decwa) return decWa(D.decwa);
  if (D.wainc) { S.waInc = D.wainc; return decWaPaint(); }
  if (D.wasend) return decWaSend(D.wasend);
  if (D.wanext !== undefined) { const sent = S.waSent[S.form?.id] || new Map(), c = waTargets().find(x => !sent.has(waNum(x.phone))); if (!c) return toast("أُرسل القرار لجميع المنسقين ✓"); return decWaSend(waNum(c.phone)); }
  if (D.wagrp !== undefined) { const d = S.decs.find(x => x.id === S.form?.id); if (!d) return; try { await navigator.clipboard.writeText(waDecText(d, null)); toast("نُسخ النص — الصقه في مجموعة المنسقين"); } catch (_) { toast("تعذّر النسخ"); } }
});
document.addEventListener("input", ev => { if (ev.target.id === "ws-q") { S.waQ = ev.target.value; decWaPaint(); } });
NEWF.splice(1, 0, ["v35-wa", "nav:decisions", "القرارات تصل المنسقين بالواتساب", "عند إصدار قرار أو تعميم: «إرسال للمنسقين بالواتساب» — كل ضغطة تفتح محادثة منسق والرسالة جاهزة، ويُسجَّل من وصله.", false, "2026-10-20"]);

/* ================= v35b: Microsoft account (OneDrive backups) belongs to each «إنجاز» user, never shared ================= */
// MSAL keeps signed-in Microsoft accounts per browser; pick only the one this user linked himself.
const msKey = () => "ms-acct:" + (S.me?.id || "");
function msPick(){ if (!MS.app || !S.me?.id) return; const all = MS.app.getAllAccounts(); let want = LS.get(msKey(), "");
  if (!want && OD.cfg?.acct) { const a = all.find(x => x.username === OD.cfg.acct); if (a) { want = a.homeAccountId; LS.set(msKey(), want); } }
  MS.account = (want && all.find(a => a.homeAccountId === want)) || null; try { MS.app.setActiveAccount(MS.account); } catch (_) {} }
const _msInit35 = msInit;
msInit = async function(){ const a = await _msInit35(); msPick(); return a; };
const _msToken35 = msToken;
msToken = async function(interactive, scopes){ await msInit(); const t = await _msToken35(interactive, scopes); if (MS.account) LS.set(msKey(), MS.account.homeAccountId); return t; };
// OneDrive backup settings: one per user (his own OneDrive, his own schedule)
const odKey = () => "onedrive:" + (S.me?.id || "");
odCfgLoad = async function(){ const { data } = await sb.from("settings").select("*").eq("key", odKey()).maybeSingle(); if (data?.value) return OD.cfg = data.value;
  // one-time move: the old shared setting stays with whoever set it up, nobody else inherits it
  const { data:old } = await sb.from("settings").select("*").eq("key", "onedrive").maybeSingle(), me = [S.me?.name, S.me?.username].filter(Boolean);
  if (old?.value?.by && me.includes(old.value.by)) { OD.cfg = old.value; await msInit(); const a = MS.app?.getAllAccounts().find(x => x.username === old.value.acct); if (a) { LS.set(msKey(), a.homeAccountId); msPick(); } try { await odCfgSave({}); } catch (_) {} return OD.cfg; }
  return OD.cfg = { freq:"off", last:null, by:"", files:0 }; };
odCfgSave = async function(v){ OD.cfg = { ...(OD.cfg || {}), ...v }; const { error } = await sb.from("settings").upsert({ key:odKey(), value:OD.cfg }); if (error) throw error; };

/* ================= v36: letters submitted from «إنجاز» go to Watheqa automatically (outbox → scheduled task saves the draft) ================= */
S.wqOut = null;
// coordinator name for the letter notes: from the request, else from the community's coordinator (one community per coordinator)
const _letterData36 = letterData;
letterData = function(src){ const L = _letterData36(src); if (L && !L.coord) { const c = S.comms.find(x => x.name === L.comm); L.coord = c?.coord || S.coords.find(x => x.comm === L.comm && (x.role || "منسق") === "منسق")?.name || ""; } return L; };
const WO_ST = { pending:["بانتظار وثيقة", "warn"], working:["جارٍ الحفظ", "warn"], drafted:["حُفظت مسودة في وثيقة ✓", "ok"], failed:["تعذّر — راجعه", "bad"], cancelled:["أُلغي", ""] };
async function woLoad(){ const { data } = await sb.from("watheqa_outbox").select("id,no,gov,to_whom,subj,status,result,created_by,created_at,done_at").order("created_at", { ascending:false }).limit(60); S.wqOut = data || []; if (S.view === "watheqa") render(); }
function woGate(src){ const L = letterData(src); if (!L) return ["لا توجد بيانات"]; const m = [];
  if (!L.coord) m.push("اسم المنسق"); if (L.acts.some(a => !a.mosque)) m.push("مسجد غير مسجل في النظام"); if (L.acts.some(a => !a.time)) m.push("وقت النشاط"); if (L.acts.some(a => !a.daily && !(a.days || []).length)) m.push("أيام النشاط"); if (L.acts.some(a => !(a.gov || mosBy[a.mosque]?.gov))) m.push("المحافظة"); return m; }
const _letterOpen36 = letterOpen;
letterOpen = function(src){ const req = src === "req" ? S.reqs?.find(r => r.id === S.form?.id) : null; S.ltSrc = { src, reqId:req?.id || null, files:req?.files || [] };
  _letterOpen36(src); if (!S.letters?.length || !S.canWrite) return;
  const miss = woGate(src);
  $(".drawer-f [data-close]")?.insertAdjacentHTML("beforebegin", miss.length ? `<button class="btn" type="button" disabled title="أكمل: ${esc(miss.join("، "))}">📤 إرسال إلى وثيقة — ينقص: ${esc(miss.join("، "))}</button>` : `<button class="btn btn-ok" type="button" data-ltq>📤 إرسال إلى وثيقة تلقائياً (${S.letters.length})</button>`); };
async function woQueue(btn){ if (!S.letters?.length) return; const miss = woGate(S.ltSrc?.src); if (miss.length) return toast("أكمل أولاً: " + miss.join("، "));
  btn.disabled = true; btn.textContent = "جارٍ الإرسال…";
  const attach = []; for (const p of S.ltSrc?.files || []) { const { data } = await sb.storage.from("requests").createSignedUrl(p, 7 * 864e5 / 1000); if (data?.signedUrl) attach.push({ name:p.split("/").pop(), url:data.signedUrl }); }
  const rows = S.letters.map(x => ({ src:S.ltSrc?.src === "req" ? "req" : S.ltSrc?.src, req_id:S.ltSrc?.reqId, gov:x.g, to_whom:x.to, subj:x.subj, note:x.note || null, html:x.html, attach }));
  const { error } = await sb.from("watheqa_outbox").insert(rows); if (error) { btn.disabled = false; return writeFail(error); }
  closeDrawer(); woLoad(); toast(`أُرسل ${rows.length} ${rows.length > 1 ? "كتب" : "كتاب"} إلى وثيقة — تُحفظ مسودة في السكرتارية خلال ساعتين، ويصلك إشعار`); }
function woPanel(){ if (!S.wqOut) { woLoad(); return ""; } if (!S.wqOut.length) return "";
  return `<div class="panel wo"><div class="panel-b"><b>📤 الكتب المرسلة من «إنجاز» إلى وثيقة</b><span class="s">تُحفظ مسودة في السكرتارية تلقائياً (أيام الدوام، كل ساعتين)، ثم يراجعها المدير ويرسلها.</span>
    <div class="wo-l">${S.wqOut.slice(0, 20).map(o => { const st = WO_ST[o.status] || [o.status, ""]; return `<div class="wo-i"><span class="num">ك-${o.no}</span><div><b>${esc(o.subj)}</b><span class="s">${esc(o.to_whom)} · ${esc(pname(o.created_by))} · ${fmtTime(o.created_at)}${o.result ? " · " + esc(o.result) : ""}</span></div><span class="chip ${st[1]}">${st[0]}</span>${o.status === "pending" ? `<button type="button" class="lnk bad-t" data-wocancel="${o.id}">إلغاء</button>` : ""}</div>`; }).join("")}</div></div></div>`; }
const _vWatheqa36 = vWatheqa;
vWatheqa = function(){ const h = _vWatheqa36(); const i = h.indexOf('<div class="toolbar">'); return i < 0 ? woPanel() + h : h.slice(0, i) + woPanel() + h.slice(i); };
document.addEventListener("click", async ev => { const t = ev.target.closest("button"); if (!t) return;
  if (t.dataset.ltq !== undefined) return woQueue(t);
  if (t.dataset.wocancel) { const { error } = await sb.from("watheqa_outbox").update({ status:"cancelled" }).eq("id", t.dataset.wocancel).eq("status", "pending"); if (error) return writeFail(error); woLoad(); toast("أُلغي الكتاب"); }
});
NEWF.splice(1, 0, ["v36-wo", "nav:watheqa", "إرسال الكتب إلى وثيقة من «إنجاز»", "في «مسودة كتاب وثيقة» زر «إرسال إلى وثيقة تلقائياً»: يُحفظ الكتاب مسودة في السكرتارية (كتاب لكل محافظة) بعد التدقيق، وتتابع حالته في صفحة «وثيقة».", false, "2026-10-20"]);
