/* v97 — مسار التجديد المترابط: الموافقة المنتهية ← تذكير المنسق ← طلب المنسق الوارد ← كتاب وثيقة، في كل مكان (التذكيرات، الوثائق، طلبات المنسقين) */
const RQC = { "جديد":"gold", "قيد المراجعة":"warn", "معتمد":"ok", "مرفوض":"bad" };
const rnReq = no => S.reqs.filter(r => r.status !== "مرفوض" && ((r.data?.renew_of || "") === no || (r.data?.kind === "تجديد" && String(r.data?.subj || "").includes(no)))).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
const rnOut = no => (S.wqOutR || []).filter(o => o.src === "renew:" + no && o.status !== "cancelled").sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
async function rnLoad(){ if (S.wqOutR || S.wqOutRBusy) return; S.wqOutRBusy = true; try { const { data } = await sb.from("watheqa_outbox").select("id,no,status,src,created_at").order("created_at", { ascending:false }).limit(150); S.wqOutR = data || []; } catch (_) { S.wqOutR = []; } S.wqOutRBusy = false; if (["renew", "docs", "inbox"].includes(S.view) && $("#drawer")?.hidden !== false) render(); }
const rnLeft = d => d?.end ? diffDays(TODAY, d.end) : null;
function rnStrip(no){ const rq = rnReq(no), ou = rnOut(no), rm = S.renewLog.find(r => r.doc_no === no && (r.kind || "renew") !== "cancelled"), d = S.docs.find(x => x.no === no), l = rnLeft(d);
  const step = (ok, t, s, attr) => `<${attr ? "button type=\"button\" " + attr : "span"} class="rn-st ${ok === true ? "ok" : ok === false ? "no" : "mid"}"><b>${t}</b><small>${s}</small></${attr ? "button" : "span"}>`;
  const dr = ou ? (ou.status === "drafted" ? ["حُفظت مسودة ✓", true] : ou.status === "failed" ? ["تعذّر", false] : ["بانتظار الحفظ", null]) : ["لم يُرسل", false];
  return `<div class="rn-path">${step(!!rm, "١ تذكير المنسق", rm ? "أُرسل " + ago(rm.sent_at) : "لم يُرسل")}${rq ? step(true, "٢ طلب المنسق", `وصل · ${esc(rq.status)}`, `data-rq="${esc(rq.id)}"`) : step(false, "٢ طلب المنسق", "لم يصل بعد")}${step(dr[1], "٣ كتاب وثيقة", dr[0])}</div>`; }
/* بطاقات التذكير: مسار التجديد تحت العنوان */
const _rtCard97 = rtCard;
rtCard = function(kind, x){ const h = _rtCard97(kind, x); if (kind === "update" || !x.d) return h; if (!S.wqOutR) rnLoad(); return h.replace(/(<div class="rt-t">.*?<\/div>)/s, `$1${rnStrip(x.d.no)}`); };
/* صفحة الوثائق: عمود «التجديد» للموافقات القريبة من الانتهاء أو المنتهية */
const _vDocs97 = vDocs;
vDocs = function(){ let h = _vDocs97(); if (!S.wqOutR) rnLoad(); const live = d => d.end && diffDays(TODAY, d.end) <= WARN_DAYS && diffDays(TODAY, d.end) >= -90;
  h = h.replace(/(<th>الأن[^<]*<\/th>)(<\/tr>)/, "$1<th>التجديد</th>$2");
  return h.replace(/<tr data-open="doc:([^"]*)">(.*?)<\/tr>/gs, (m, no, body) => { no = no.replace(/&quot;/g, '"'); const d = S.docs.find(x => x.no === no); let c = "";
    if (d && live(d)) { const rq = rnReq(no), ou = rnOut(no); c = rq ? `<span class="chip ${RQC[rq.status] || "ok"}">وصل طلب تجديد</span>` : `<span class="chip warn">لا طلب تجديد</span>`; if (ou?.status === "drafted") c += ` <span class="chip ok">مسودة وثيقة</span>`; }
    return `<tr data-open="doc:${no}">${body}<td>${c}</td></tr>`; }); };
/* طلبات المنسقين: بطاقة طلب التجديد تُظهر وضع الموافقة (كم بقي أو منذ متى انتهت) */
const _after97 = afterRender;
afterRender = function(v){ _after97(v); if (v !== "inbox") return; document.querySelectorAll(".rq-card[data-rq]").forEach(b => { if (b.querySelector(".rn-ref")) return; const r = S.reqs.find(x => x.id === b.dataset.rq), no = r?.data?.renew_of || (String(r?.data?.subj || "").match(/\d{4}-\d{4}/) || [])[0]; if (!no) return; const d = S.docs.find(x => x.no === no); if (!d?.end) return;
    const l = diffDays(TODAY, d.end), t = l < 0 ? `انتهت منذ ${arDays(-l)}` : l === 0 ? "تنتهي اليوم" : `تنتهي بعد ${arDays(l)}`, c = l < 0 ? "bad" : l <= 14 ? "warn" : "ok";
    b.insertAdjacentHTML("beforeend", `<span class="rn-ref"><span class="chip ${c}">موافقة ${esc(no)} ${t}</span></span>`); }); };
/* الرئيسية: موافقات قريبة بلا طلب تجديد */
const _prio97 = priorities;
priorities = function(){ const P = _prio97(); const L = S.docs.filter(d => d.end && diffDays(TODAY, d.end) >= 0 && diffDays(TODAY, d.end) <= 14 && !rnReq(d.no)); if (S.admin && L.length) P.push({ w:78, k:"warn", t:`${L.length} موافقة تنتهي خلال 14 يوماً ولم يصل لها طلب تجديد`, s:L.slice(0, 3).map(d => `${d.no} (${esc(d.comm || "")})`).join("، "), act:{ go:"renew", l:"تذكير المنسق" } }); return P.sort((a, b) => b.w - a.w); };
NEWF.splice(1, 0, ["v97-rnpath", "nav:renew", "مسار التجديد المترابط", "كل موافقة قاربت الانتهاء تظهر بمسار واضح: تذكير المنسق ← طلبه الوارد ← كتاب وثيقة. ويظهر نفس الوضع في صفحة الوثائق وفي طلبات المنسقين وفي الرئيسية.", true, "2026-10-28"]);
