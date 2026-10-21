/* ================= v35: WhatsApp helpers (send to a coordinator) ================= */
function waGo(phone, text){ const n = waNum(phone);
  if (isTouchDev()) return window.open(`https://wa.me/${n}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  window.open(`https://web.whatsapp.com/send?phone=${n}&text=${encodeURIComponent(text)}`, "enjaz-whatsapp"); }

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
const WO_ST = { pending:["بانتظار وثيقة", "warn"], working:["جارٍ الحفظ", "warn"], drafted:["حُفظت مسودة في وثيقة ✓", "ok"], failed:["تعذّر، راجعه", "bad"], cancelled:["أُلغي", ""] };
async function woLoad(){ const { data } = await sb.from("watheqa_outbox").select("id,no,gov,to_whom,subj,status,result,created_by,created_at,done_at").order("created_at", { ascending:false }).limit(60); S.wqOut = data || []; if (S.view === "watheqa") render(); }
function woGate(src){ const L = letterData(src); if (!L) return ["لا توجد بيانات"]; const m = [];
  if (!L.coord) m.push("اسم المنسق"); if (L.acts.some(a => !a.mosque)) m.push("مسجد غير مسجل في النظام"); if (L.acts.some(a => !a.time)) m.push("وقت النشاط"); if (L.acts.some(a => !a.daily && !(a.days || []).length)) m.push("أيام النشاط"); if (L.acts.some(a => !(a.gov || mosBy[a.mosque]?.gov))) m.push("المحافظة"); return m; }
const _letterOpen36 = letterOpen;
letterOpen = function(src){ const req = src === "req" ? S.reqs?.find(r => r.id === S.form?.id) : null; S.ltSrc = { src, reqId:req?.id || null, files:req?.files || [] };
  _letterOpen36(src); if (!S.letters?.length || !S.canWrite) return;
  const miss = woGate(src);
  $(".drawer-f [data-close]")?.insertAdjacentHTML("beforebegin", miss.length ? `<button class="btn" type="button" disabled title="أكمل: ${esc(miss.join("، "))}">📤 إرسال إلى وثيقة، ينقص: ${esc(miss.join("، "))}</button>` : `<button class="btn btn-ok" type="button" data-ltq>📤 إرسال إلى وثيقة تلقائياً (${S.letters.length})</button>`); };
async function woQueue(btn){ if (!S.letters?.length) return; const miss = woGate(S.ltSrc?.src); if (miss.length) return toast("أكمل أولاً: " + miss.join("، "));
  btn.disabled = true; btn.textContent = "جارٍ الإرسال…";
  const attach = []; for (const p of S.ltSrc?.files || []) { const { data } = await sb.storage.from("requests").createSignedUrl(p, 7 * 864e5 / 1000); if (data?.signedUrl) attach.push({ name:p.split("/").pop(), url:data.signedUrl }); }
  const rows = S.letters.map(x => ({ src:S.ltSrc?.src === "req" ? "req" : S.ltSrc?.src, req_id:S.ltSrc?.reqId, gov:x.g, to_whom:x.to, subj:x.subj, note:x.note || null, html:x.html, attach }));
  const { error } = await sb.from("watheqa_outbox").insert(rows); if (error) { btn.disabled = false; return writeFail(error); }
  closeDrawer(); woLoad(); toast(`أُرسل ${rows.length} ${rows.length > 1 ? "كتب" : "كتاب"} إلى وثيقة، تُحفظ مسودة في السكرتارية خلال ساعتين، ويصلك إشعار`); }
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
