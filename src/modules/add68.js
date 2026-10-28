/* v98 — إرسال الكتب إلى وثيقة من «إنجاز» بجلسة كل موظف: الإضافة تعبّئ وتحفظ مسودة (أو ترسل لمن يحدده الإعداد) وتُبلغ بحالة حقيقية */
const WQ = { busy:null, cfg:null, t:0 };
const WO_ST2 = { pending:["في الانتظار", "warn"], working:["جارٍ التنفيذ", "warn"], drafted:["حُفظت مسودة في وثيقة ✓", "ok"], sent:["أُرسل فعلاً ✓", "ok"], failed:["تعذّر", "bad"], cancelled:["أُلغي", ""] };
Object.assign(WO_ST, WO_ST2);
const wqBridge = () => { const d = document.documentElement.dataset; return d.copilotBridge === "ready" && parseFloat(d.copilotBridgeV || "0") >= 2.5 ? "ok" : d.copilotBridge ? "old" : "none"; };
async function wqCfgLoad(){ if (WQ.cfg) return WQ.cfg; try { const { data } = await sb.from("settings").select("value").eq("key", "wq_cfg").maybeSingle(); WQ.cfg = data?.value || { draftFor:"", direct:[] }; } catch (_) { WQ.cfg = { draftFor:"", direct:[] }; } return WQ.cfg; }
woLoad = async function(){ const { data } = await sb.from("watheqa_outbox").select("id,no,gov,to_whom,subj,status,result,created_by,created_at,done_at,src,mode,step,wq_ref,claimed_at").order("created_at", { ascending:false }).limit(60); S.wqOut = data || []; S.wqOutR = null; if (S.view === "watheqa") render(); wqTick(); };
woQueue = async function(btn){ if (!S.letters?.length) return; const miss = woGate(S.ltSrc?.src); if (miss.length) return toast("أكمل أولاً: " + miss.join("، "));
  const cfg = await wqCfgLoad(), mode = (cfg.direct || []).includes(S.me?.id) ? "send" : "draft";
  if (mode === "send" && !confirm(`سيُرسل ${S.letters.length > 1 ? "الكتب" : "الكتاب"} فعلياً من حسابك في وثيقة إلى الجهة بلا مراجعة. متابعة؟`)) return;
  btn.disabled = true; btn.textContent = "جارٍ الإرسال…";
  const attach = []; for (const p of S.ltSrc?.files || []) { const { data } = await sb.storage.from("requests").createSignedUrl(p, 7 * 864e5 / 1000); if (data?.signedUrl) attach.push({ name:p.split("/").pop(), url:data.signedUrl }); }
  const rows = S.letters.map(x => ({ src:S.ltSrc?.src === "req" ? "req" : S.ltSrc?.src, req_id:S.ltSrc?.reqId, gov:x.g, to_whom:x.to, subj:x.subj, note:x.note || null, html:x.html, attach, mode }));
  const { error } = await sb.from("watheqa_outbox").insert(rows); if (error) { btn.disabled = false; return writeFail(error); }
  closeDrawer(); woLoad(); const b = wqBridge();
  toast(b === "ok" ? `بدأ تنفيذ ${rows.length > 1 ? rows.length + " كتب" : "الكتاب"} في وثيقة، وتظهر حالته الحقيقية في صفحة «وثيقة»` : `أُضيف ${rows.length > 1 ? rows.length + " كتب" : "الكتاب"} للانتظار، ويبدأ تنفيذه حين تُثبَّت إضافة الجسر (الإصدار 2.5) على متصفحك`); };
function wqStale(o){ return o.status === "working" && o.claimed_at && Date.now() - new Date(o.claimed_at) > 10 * 60000; }
function woPanel(){ if (!S.wqOut) { woLoad(); woSyncLoad(); return ""; }
  const me = S.me?.id, br = wqBridge();
  const P = S.wqOut.filter(o => (o.status === "pending" || o.status === "working") && !wqStale(o)), D = S.wqOut.filter(o => o.status === "drafted" || o.status === "sent"), X = S.wqOut.filter(o => o.status === "failed" || o.status === "cancelled" || wqStale(o));
  const row = o => { const stale = wqStale(o), st = stale ? ["لم يكتمل", "bad"] : WO_ST[o.status] || [o.status, ""], mine = o.created_by === me;
    const sub = [esc(o.to_whom), esc(pname(o.created_by)), fmtTime(o.created_at), o.mode === "send" ? "إرسال مباشر" : "مسودة"].join(" · ");
    const state = o.status === "working" && !stale ? esc(o.step || "جارٍ التنفيذ") : o.status === "pending" ? (mine ? (br === "ok" ? "سيبدأ خلال ثوانٍ" : "بانتظار تثبيت الجسر 2.5 على متصفحك") : "ينتظر متصفح " + esc(pname(o.created_by))) : o.status === "failed" ? esc(o.result || "") : o.wq_ref ? esc(o.wq_ref) : "";
    const act = o.status === "pending" ? `<button type="button" class="btn btn-ghost bad-t" data-wocancel="${o.id}">إلغاء</button>` : (o.status === "failed" || stale) && (mine || S.admin) ? `<button type="button" class="btn btn-ghost" data-woretry="${o.id}">إعادة المحاولة</button>` : "";
    return `<div class="wo-i"><span class="num">ك-${o.no}</span><div><b>${esc(o.subj)}</b><span class="s">${sub}</span>${state ? `<span class="s ${o.status === "failed" || stale ? "bad-t" : ""}">${state}</span>` : ""}</div><span class="chip ${st[1]}">${st[0]}</span>${act}</div>`; };
  const bn = br === "ok" ? `<span class="s ok-t">✓ إضافة الجسر جاهزة في هذا المتصفح، تعمل بجلسة وثيقة الخاصة بك.</span>` : br === "old" ? `<span class="s bad-t">⚠ إضافة الجسر قديمة، حدّثها إلى الإصدار 2.5 (أعد تحميل مجلد الإضافة من chrome://extensions ثم اضغط تحديث).</span>` : `<span class="s bad-t">⚠ إضافة الجسر غير مثبتة في هذا المتصفح، ثبّتها (الإصدار 2.5) لتُنفَّذ كتبك في وثيقة تلقائياً.</span>`;
  return `<div class="panel wo wo-p"><div class="panel-b"><b>⏳ الكتب قيد التنفيذ في وثيقة · ${P.length}</b><span class="s">يُنفَّذ كل كتاب في متصفح صاحبه وبحسابه في وثيقة: المسودات تُحفظ في السكرتارية، والإرسال المباشر لمن حدّده النظام فقط. لا تظهر «حُفظ» أو «أُرسل» إلا بعد التحقق من وجود الكتاب في وثيقة.</span>${bn}<div class="wo-l">${P.length ? P.map(row).join("") : `<span class="s">لا يوجد شيء بالانتظار.</span>`}</div></div></div>
    <div class="panel wo"><div class="panel-b"><b>✅ المحفوظ والمُرسل في وثيقة · ${D.length}</b><span class="s">مسودات بانتظار مراجعة المدير وإرساله، وكتب أُرسلت مباشرة، وكل واحد منها تم التحقق منه.</span><div class="wo-l">${D.length ? D.slice(0, 20).map(row).join("") : `<span class="s">لا يوجد شيء بعد.</span>`}</div></div></div>
    ${X.length ? `<details class="panel wo" ${X.some(o => o.status === "failed" || wqStale(o)) ? "open" : ""}><summary class="panel-b"><b>ملغاة أو متعذّرة (${X.length})</b></summary><div class="panel-b"><div class="wo-l">${X.slice(0, 20).map(row).join("")}</div></div></details>` : ""}`; }
/* المنفّذ: يلتقط كتب هذا المستخدم فقط، واحداً بعد واحد */
async function wqTick(){ if (WQ.busy || !S.me?.id || wqBridge() !== "ok" || Date.now() - WQ.t < 4000) return; WQ.t = Date.now();
  const cfg = await wqCfgLoad(); const { data } = await sb.from("watheqa_outbox").select("*").eq("created_by", S.me.id).eq("status", "pending").order("created_at").limit(1); const o = data?.[0]; if (!o) return;
  const { data:ok } = await sb.rpc("wq_claim", { p_id:o.id }); if (!ok) return;
  WQ.busy = o.id; clearTimeout(WQ.to); WQ.to = setTimeout(() => { if (WQ.busy === o.id) { WQ.busy = null; woLoad(); } }, 6 * 60000);
  window.postMessage({ type:"jaliyat-wq-run", job:{ id:o.id, mode:o.mode === "send" ? "send" : "draft", draftFor:cfg.draftFor, to:o.to_whom, subj:o.subj, note:o.note || "", html:o.html || "", attach:o.attach || [], dry:!!window.wqDry } }, location.origin); woLoad(); }
window.addEventListener("message", async e => { if (e.source !== window || e.origin !== location.origin || e.data?.type !== "jaliyat-wq-status") return; const m = e.data; if (m.id !== WQ.busy) return;
  const done = ["drafted", "sent", "failed", "dry"].includes(m.state);
  if (m.state === "dry") { await sb.rpc("wq_report", { p_id:m.id, p_status:"failed", p_step:"تجربة", p_result:"تجربة بلا حفظ، اكتملت التعبئة" }); }
  else await sb.rpc("wq_report", { p_id:m.id, p_status:m.state === "working" ? "working" : m.state, p_step:m.step || null, p_result:m.error || null, p_ref:m.ref || null });
  if (done) { WQ.busy = null; clearTimeout(WQ.to); toast(m.state === "sent" ? "أُرسل الكتاب فعلاً في وثيقة ✓" : m.state === "drafted" ? "حُفظت المسودة في وثيقة ✓" : m.state === "dry" ? "التعبئة اكتملت (تجربة)" : "تعذّر تنفيذ كتاب: " + (m.error || "")); setTimeout(wqTick, 1500); }
  woLoad(); });
setInterval(() => { try { wqTick(); } catch (_) {} }, 15000);
document.addEventListener("click", async ev => { const t = ev.target.closest("button[data-woretry]"); if (!t) return; t.disabled = true;
  const { error } = await sb.from("watheqa_outbox").update({ status:"pending", step:null, result:null }).eq("id", t.dataset.woretry); if (error) { t.disabled = false; return writeFail(error); } woLoad(); toast("أُعيد للانتظار"); });
NEWF.splice(1, 0, ["v98-wq", "nav:watheqa", "الكتب تُنفَّذ في وثيقة بنفسها مع حالة حقيقية", "كل كتاب يُرسل من «إنجاز» يُنفَّذ في متصفحك وبحسابك في وثيقة: يُحفظ مسودة (أو يُرسل مباشرة لمن حدّده النظام)، ولا تظهر «حُفظ» أو «أُرسل» إلا بعد التحقق منه. يلزم تحديث إضافة الجسر إلى 2.5.", false, "2026-10-28"]);
