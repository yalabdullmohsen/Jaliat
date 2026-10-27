/* v91 — «تذكيرات المنسقين»: ثلاثة أنواع واضحة (تجديد قريب · انتهت · تحديث بيانات)، رسالة واتساب مرتبة بلا تكرار أسماء وبلا رابط، وإرسال بضغطة */
Object.assign(TITLES, { renew:"تذكيرات المنسقين" });
S.rtTab = S.rtTab || "soon";
const RT_KINDS = {
  soon:{ label:"تذكير تجديد", tab:"تنتهي قريباً", d:"موافقات قاربت على الانتهاء: نذكّر المنسق يجدّدها قبل ما تنتهي.", btn:"إرسال تذكير التجديد", cls:"k-soon" },
  expired:{ label:"إشعار انتهاء", tab:"انتهت", d:"موافقات انتهت وأنشطتها لسا مسجلة عليها: نبلّغ المنسق ونطلب التجديد.", btn:"إرسال إشعار الانتهاء", cls:"k-exp" },
  update:{ label:"تحديث بيانات", tab:"تحديث البيانات", d:"نطلب من منسق كل جالية يراجع بيانات أنشطته (المحاضرين، المساجد، الأوقات) ويبلّغنا بأي تغيير.", btn:"إرسال طلب التحديث", cls:"k-upd" } };
const RT_DB = { soon:"renew", expired:"expired", update:"update" };
const rtKey = (kind, x) => kind === "update" ? "upd:" + x.comm : x.d.no;
const rtSent = (kind, key) => S.renewLog.find(r => r.doc_no === key && (r.kind || "renew") === RT_DB[kind] && (kind !== "update" || (Date.now() - new Date(r.sent_at)) < 30 * 864e5));
function rtBuild(d){ const acts = S.E.filter(e => e.doc === d.no && !["ملغى", "مكتمل"].includes(e.status)), comm = d.comm || acts[0]?.comm || "";
  return { d, acts, comm, coords:S.coords.filter(c => c.comm === comm && c.status !== "سابق" && c.phone), left:diffDays(TODAY, d.end) }; }
function rtItems(kind){
  if (kind === "soon") { const lim = addDays(TODAY, +S.renewDays); return S.docs.filter(d => d.end && d.end >= TODAY && d.end <= lim).map(rtBuild).filter(x => x.acts.length || x.coords.length).sort((a, b) => a.d.end.localeCompare(b.d.end)); }
  if (kind === "expired") return S.docs.filter(d => d.end && d.end < TODAY && d.end >= addDays(TODAY, -90)).map(rtBuild).filter(x => x.acts.length).sort((a, b) => b.d.end.localeCompare(a.d.end));
  const by = new Map(); for (const e of S.E) { if (["ملغى", "مكتمل"].includes(e.status) || !e.comm) continue; (by.get(e.comm) || by.set(e.comm, []).get(e.comm)).push(e); }
  return [...by.entries()].map(([comm, acts]) => ({ comm, acts, coords:S.coords.filter(c => c.comm === comm && c.status !== "سابق" && c.phone) }))
    .sort((a, b) => (rtSent("update", rtKey("update", a)) ? 1 : 0) - (rtSent("update", rtKey("update", b)) ? 1 : 0) || b.acts.length - a.acts.length); }
/* الأنشطة مجمّعة حسب المحاضر: كل اسم مرة واحدة فقط */
function rtActLines(acts){ const by = new Map(); for (const e of acts) { const k = (e.lect || "").replace(/\s+/g, " ").trim() || "محاضر غير محدد"; const w = `${[e.mosName, e.area].filter(Boolean).join("، ") || "مسجد غير محدد"} — ${[daysText(e), e.time].filter(Boolean).join(" ")}`.trim(); const L = by.get(k) || by.set(k, []).get(k); if (!L.includes(w)) L.push(w); }
  const out = []; let n = 0; for (const [lect, L] of by) { if (++n > 25) { out.push(`… و${by.size - 25} محاضرين آخرين`); break; } out.push(`▪️ ${lect}\n${L.map(w => `   - ${w}`).join("\n")}`); } return out.join("\n"); }
function rtMsg(kind, x, c){
  const head = `السلام عليكم ورحمة الله وبركاته\n\n${c ? `الأخ الفاضل / ${c.name}\n` : ""}منسق الجالية ${x.comm}\n\n`, lines = rtActLines(x.acts), tail = `\n\nوجزاكم الله خيراً${SIGN}`;
  if (kind === "update") return `${head}*تذكير بتحديث بيانات الأنشطة*\nنأمل مراجعة بيانات أنشطة الجالية المسجلة لدينا، وإفادتنا هنا على الواتساب بأي تغيير في المحاضرين أو المساجد أو الأوقات، أو أي نشاط توقّف أو أُضيف. وإن لم يكن هناك تغيير فيكفي الرد بـ «لا تغيير».\n\nالأنشطة المسجلة:\n${lines}${tail}`;
  const no = x.d.no, ask = "مع بيان أي تعديل على المساجد أو المحاضرين أو الأوقات";
  if (kind === "expired") return `${head}*إشعار بانتهاء الموافقة*\nموافقة الأنشطة الدينية رقم (${no}) انتهت بتاريخ ${fmt(x.d.end)} (منذ ${arDays(-x.left)})، ولم تُسجَّل موافقة جديدة بدلاً منها حتى الآن.\n\n${x.acts.length ? `الأنشطة المرتبطة بها:\n${lines}\n\n` : ""}نأمل إرسال طلب التجديد هنا على الواتساب في أقرب وقت ${ask}، حتى لا تتوقف الأنشطة.${tail}`;
  const when = x.left === 0 ? `تنتهي اليوم ${fmt(x.d.end)}` : `تنتهي بتاريخ ${fmt(x.d.end)} (بعد ${arDays(x.left)})`;
  return `${head}*تذكير بتجديد الموافقة*\nموافقة الأنشطة الدينية رقم (${no}) ${when}.\n\n${x.acts.length ? `الأنشطة المشمولة بها:\n${lines}\n\n` : ""}للاستمرار في إقامة الأنشطة دون انقطاع، نأمل إرسال طلب التجديد هنا على الواتساب قبل تاريخ الانتهاء ${ask}.${tail}`; }
function rtCard(kind, x){ const K = RT_KINDS[kind], key = rtKey(kind, x), s = rtSent(kind, key);
  const left = kind === "soon" ? `<span class="rt-left ${x.left <= 7 ? "bad" : x.left <= 14 ? "warn" : "ok"}">${x.left === 0 ? "تنتهي اليوم" : "بعد " + arDays(x.left)}</span>` : kind === "expired" ? `<span class="rt-left bad">منذ ${arDays(-x.left)}</span>` : "";
  const sub = kind === "update" ? `${x.acts.length} نشاط مسجّل` : `موافقة <bdi dir="ltr">${esc(x.d.no)}</bdi> · ${kind === "expired" ? "انتهت" : "تنتهي"} ${fmt(x.d.end)} · ${x.acts.length} نشاط`;
  return `<div class="rt-c${s ? " sent" : ""}"><div class="rt-top"><span class="rt-badge ${K.cls}">${K.label}</span>${left}${s ? `<span class="rt-ok">✓ أُرسل ${ago(s.sent_at)}، ${esc(pname(s.sent_by) || "")}</span>` : ""}</div>
    <div class="rt-t"><b>${esc(x.comm || "—")}</b><span>${sub}</span></div>
    ${x.coords.length ? `<div class="rt-co">${x.coords.map((c, i) => `<div class="rt-p"><span class="rt-av">${esc((c.name || "؟").trim().charAt(0))}</span><div class="rt-pn"><b>${esc(c.name)}</b><span>${esc(c.role || "منسق")} · <bdi dir="ltr">${esc(c.phone)}</bdi></span></div>
        <button type="button" class="btn ${s ? "" : "btn-primary"} rt-send" data-rtsend="${kind}|${esc(key)}|${i}">${icon("i-wa")} ${s ? "إعادة الإرسال" : K.btn}</button><button type="button" class="btn btn-ghost" data-rtcopy="${kind}|${esc(key)}|${i}">نسخ</button></div>`).join("")}</div>`
      : `<div class="rn-none">لا يوجد رقم منسق لهذه الجالية، <button type="button" class="lnk" data-go="coords">أضف المنسق</button></div>`}
    <div class="rt-more"><details class="rn-pre"><summary>معاينة الرسالة</summary><pre>${esc(rtMsg(kind, x, x.coords[0]))}</pre></details>${kind !== "update" ? `<button type="button" class="btn btn-ghost" data-letter="renew:${esc(x.d.no)}">${icon("i-doc")} كتاب التجديد</button>` : ""}</div></div>`; }
vRenew = function(){ const tab = RT_KINDS[S.rtTab] ? S.rtTab : "soon", K = RT_KINDS[tab], all = { soon:rtItems("soon"), expired:rtItems("expired"), update:rtItems("update") }, L = [...all[tab]].sort((a, b) => (rtSent(tab, rtKey(tab, a)) ? 1 : 0) - (rtSent(tab, rtKey(tab, b)) ? 1 : 0));
  const todo = L.filter(x => !rtSent(tab, rtKey(tab, x))).length;
  return `<div class="rt"><div class="rt-tabs">${Object.entries(RT_KINDS).map(([k, v]) => { const n = all[k].filter(x => !rtSent(k, rtKey(k, x))).length; return `<button type="button" class="rt-tab ${v.cls}${k === tab ? " on" : ""}" data-rttab="${k}"><b>${n}</b><span>${v.tab}</span><small>${n ? "لم يُرسل لها" : "الكل أُرسل ✓"}</small></button>`; }).join("")}</div>
    <div class="rt-info"><div><span class="rt-badge ${K.cls}">${K.label}</span><p>${K.d}</p></div>${tab === "soon" ? `<div class="rn-seg">${[[14, "١٤ يوم"], [30, "٣٠ يوم"], [60, "٦٠ يوم"]].map(([n, l]) => `<button type="button" class="${+S.renewDays === n ? "on" : ""}" data-rtdays="${n}">${l}</button>`).join("")}</div>` : ""}</div>
    <div class="rt-sum"><span><b>${L.length}</b> ${tab === "update" ? "جالية" : "موافقة"}</span><span><b>${todo}</b> باقي عليها إرسال</span></div>
    ${L.map(x => rtCard(tab, x)).join("") || `<div class="rn-empty"><b>${tab === "soon" ? `لا توجد موافقات تنتهي خلال ${S.renewDays} يوماً` : tab === "expired" ? "لا توجد موافقات منتهية تحتاج متابعة" : "لا توجد أنشطة مسجلة"} ✓</b></div>`}</div>`; };
async function rtSend(spec, copyOnly){ const [kind, key, i] = spec.split("|"), x = rtItems(kind).find(y => rtKey(kind, y) === key); if (!x) return; const c = x.coords[+i], msg = rtMsg(kind, x, c);
  if (copyOnly) { const ok = await cpCopy(msg); return toast(ok ? "نُسخت الرسالة" : "تعذّر النسخ"); }
  waOpen(c?.phone || "", msg);
  const { data } = await sb.from("renew_reminders").insert({ doc_no:key, doc_end:x.d?.end || null, phone:c?.phone || "", coord:c?.name || "", sent_by:S.me.id, kind:RT_DB[kind] }).select().single();
  if (data) { S.renewLog = [data, ...S.renewLog]; if (S.view === "renew" && $("#drawer").hidden) render(); } }
document.addEventListener("click", ev => { const t = ev.target.closest("button"); if (!t || S.view !== "renew") return; const D = t.dataset;
  if (D.rttab) { S.rtTab = D.rttab; return render(); } if (D.rtdays) { S.renewDays = +D.rtdays; return render(); }
  if (D.rtsend) return rtSend(D.rtsend); if (D.rtcopy) return rtSend(D.rtcopy, true); });
NEWF.splice(1, 0, ["v91-rt", "nav:renew", "تذكيرات المنسقين: ثلاثة أنواع واضحة", "صفحة التذكير صارت ثلاثة أقسام: «تنتهي قريباً» (تذكير تجديد)، «انتهت» (إشعار انتهاء)، «تحديث البيانات». كل بطاقة عليها نوعها، والرسالة مرتبة بلا تكرار أسماء وبلا رابط، تُرسل بالواتساب فقط.", true, "2026-10-27"]);

/* v91 — التفويض بضغطة: أول ما يفتح الموظف النظام وعنده تفويض يطلع له نموذج التصريح معبّأ مباشرة، يراجع ويضغط إصدار */
(() => { const seen = (id) => { try { return sessionStorage.getItem("pg-auto-" + id); } catch (_) { return "1"; } }, mark = (id) => { try { sessionStorage.setItem("pg-auto-" + id, "1"); } catch (_) {} };
  setInterval(() => { try { if (S.admin || !S.me?.id || !$("#drawer")?.hidden || document.hidden || typeof myGrants !== "function") return; const g = myGrants().find(x => !x.permit_id && !seen(x.id)); if (!g) return; mark(g.id); toast("فوّضك رئيس القسم بإصدار تصريح، البيانات جاهزة"); grantUse(g.id); } catch (_) {} }, 4000); })();
