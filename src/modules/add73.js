/* ===== v73: صفحة الأنشطة تُظهر حالة كل نشاط بوضوح: تمت الموافقة (ومتبقي إصدار تصريح / صدر / أُرسل) أو لم تتم الموافقة (يرجى إبلاغ المنسق) ===== */
function apPermit(e){ if (S.permits.some(p => p.act_id === e.id && !p.revoked)) return "issued"; const d = S.pdone?.get(e.id); return d ? (d.st === "sent" ? "sent" : "issued") : "need"; }
function apStage(e, c){ const a = apprOf(e, c); return a.k === "ok" ? "ap_" + apPermit(e) : a.k === "none" ? "ap_none" : "ap_no"; }
function apBadge(e, c){ const a = apprOf(e, c);
  if (a.k === "ok") { const p = apPermit(e); return `<span class="chip ok">✓ تمت الموافقة</span>${p === "need" ? `<span class="chip gold">متبقي: إصدار تصريح</span>` : `<span class="chip ok">✓ ${p === "sent" ? "أُرسل التصريح" : "صدر التصريح"}</span>`}`; }
  if (a.k === "none") return `<span class="chip">بلا رقم كتاب</span>`;
  return `<span class="chip bad">لم تتم الموافقة${a.partial ? " على هذا الموعد" : ""}</span><span class="s ap-n">${a.k === "no" && a.label ? esc(a.label) + "<br>" : ""}يرجى إبلاغ المنسق${a.label && a.k === "wait" ? " · " + esc(a.label) : ""}</span>`; }
const _filterActs73 = filterActs;
filterActs = function(L, f){ const m = String(f.st || "").startsWith("ap_") ? f.st : ""; if (!m) return _filterActs73(L, f); const c = apprCtx();
  const rest = _filterActs73(L, { ...f, st:"" }); return rest.filter(e => m === "ap_no" ? ["no", "wait"].includes(apprOf(e, c).k) : m === "ap_issued" ? ["ap_issued", "ap_sent"].includes(apStage(e, c)) : apStage(e, c) === m); };
const _actsTable73 = actsTable;
actsTable = function(list, showComm){ const h = _actsTable73(list, showComm); if (!list.length) return h; const c = apprCtx();
  return h.replace("<th></th></tr></thead>", `<th>الموافقة والتصريح</th><th></th></tr></thead>`).replace(/<tr data-open="act:([^"]+)">([\s\S]*?)<\/tr>/g, (m, id, inner) => { const e = S.byId?.get(id) || S.E.find(x => x.id === id); if (!e) return m;
    return `<tr data-open="act:${id}">${inner.replace(/<td>(?:(?!<td>)[\s\S])*<\/td>\s*$/, t => `<td class="ap-c">${apBadge(e, c)}</td>` + t)}</tr>`; }); };
const _vActs73 = vActs;
vActs = function(){ let h = _vActs73(); const c = apprCtx(), cnt = { ap_need:0, ap_no:0, ap_done:0 };
  for (const e of S.E) { if (["ملغى", "مكتمل"].includes(e.status)) continue; const a = apprOf(e, c).k; if (a === "none") continue; if (a === "ok") apPermit(e) === "need" ? cnt.ap_need++ : cnt.ap_done++; else cnt.ap_no++; }
  const cur = S.f.st || "", chip = (v, t, n, cls) => `<button type="button" class="ap-f ${cls}${cur === v ? " on" : ""}" data-apf="${v}">${t} <b>${n}</b></button>`;
  const bar = `<div class="ap-bar" role="group" aria-label="حالة الموافقة">${chip("ap_need", "تمت الموافقة · متبقي إصدار تصريح", cnt.ap_need, "gold")}${chip("ap_no", "لم تتم الموافقة · يرجى إبلاغ المنسق", cnt.ap_no, "bad")}${chip("ap_issued", "صدر التصريح", cnt.ap_done, "ok")}${cur.startsWith("ap_") ? `<button type="button" class="ap-f" data-apf="">إظهار الكل</button>` : ""}</div>`;
  return bar + h.replace(/(<select class="f" data-fk="st">[\s\S]*?)(<\/select>)/, `$1<option value="ap_need"${cur === "ap_need" ? " selected" : ""}>تمت الموافقة · متبقي تصريح</option><option value="ap_no"${cur === "ap_no" ? " selected" : ""}>لم تتم الموافقة</option><option value="ap_issued"${cur === "ap_issued" ? " selected" : ""}>صدر / أُرسل التصريح</option>$2`); };
document.addEventListener("click", ev => { const t = ev.target.closest("[data-apf]"); if (!t) return; S.f.st = t.dataset.apf; render(); });
NEWF.splice(0, 0, ["v73-appr", "nav:acts", "حالة الموافقة في الأنشطة", "كل نشاط يظهر معه الآن: «✓ تمت الموافقة · متبقي إصدار تصريح»، أو «لم تتم الموافقة، يرجى إبلاغ المنسق». وفوق الجدول أزرار تصفية بنقرة، وموافقات وثيقة التي وصلت تظهر في «تصاريح الدروس» دون اعتماد يدوي."]);

/* إصدار تصريح: أرقام منسق الجالية تظهر في النموذج نفسه للتواصل المباشر (تتبع الشيخ/اللغة أو النشاط المحدد) */
const _permitForm73 = permitForm;
function pfCoSync(){ const box = $("#pf-co"); if (!box) return; const sh = $("#p-sheikh")?.value.trim(), lg = $("#p-lang")?.value.trim(), mo = $("#p-mosque")?.value || "";
  const hit = S.E.find(e => (e.id === box.dataset.act)) || (sh && S.E.find(e => e.lect && e.lect.split(" / ").includes(sh) && mo.includes(String(e.mosName || "").replace(/^مسجد\s+/, "")))) || (sh && S.E.find(e => e.lect && e.lect.split(" / ").includes(sh)));
  const cm = hit?.comm || lg || ""; box.innerHTML = cm ? `<label>منسق الجالية: ${esc(cm)}</label>${coPhones(cm)}` : ""; }
permitForm = function(preset, grant){ _permitForm73(preset, grant); if (S.form?.kind !== "permit") return;
  const act = preset?.act_id ? S.byId?.get(preset.act_id) : null;
  $("#p-lang")?.closest(".g2")?.insertAdjacentHTML("afterend", `<div class="fld" id="pf-co" data-act="${esc(act?.id || "")}"></div>`); pfCoSync(); };
document.addEventListener("input", ev => { if (ev.target.closest?.("#p-sheikh,#p-lang,#p-mosque")) pfCoSync(); });
document.addEventListener("change", ev => { if (ev.target.closest?.("#p-sheikh,#p-lang,#p-mosque")) pfCoSync(); });
