/* ================= v101 (JL-AI 4): اقتراح حل التعارض «✨» من بدائل متاحة في البيانات ================= */
/* البدائل تُحسب هنا من بيانات المنصة بقاعدة التعارض نفسها (clash): وقت آخر في المسجد نفسه، أو مسجد آخر في المنطقة نفسها بالوقت نفسه.
   المساعد يختار أنسبها ويصوغ رسالة للمنسق؛ لا يتغير النشاط إلا بتعديل الموظف. */
function aiAlts(e){ const raw = S.acts.get(e.id); if (!raw) return [];
  const free = d => { const x = effAct("__alt", { ...raw, ...d }); return !S.E.some(o => o.id !== e.id && clash(x, o)); };
  const out = [];
  for (const t of TIMES) { if (t === raw.time || (t.includes("الجمعة") && !(raw.days || []).every(d => d === 5))) continue; if (free({ time:t })) out.push({ kind:"time", label:`الوقت: ${t} في المسجد نفسه`, v:{ time:t } }); if (out.length >= 3) break; }
  const m = mosBy[raw.mosque];
  if (m) for (const o of S.mosques) { if (o.id === m.id || o.area !== m.area) continue; if (free({ mosque:o.id })) out.push({ kind:"mosque", label:`المسجد: ${o.name} (${o.area}) بالوقت نفسه`, v:{ mosque:o.id } }); if (out.length >= 6) break; }
  return out; }
const _actForm101 = actForm;
actForm = function(id, preset){ _actForm101(id, preset); const e = id && S.byId.get(id); if (!e || !e.cf?.length || S.form?.kind !== "act" || !S.canWrite) return;
  $("#drawer .drawer-b")?.insertAdjacentHTML("beforeend", `<div class="ai-row">${aiBtn(`data-aicf="${esc(id)}"`, "اقترح حلًّا للتعارض", "بديل متاح من بيانات المنصة يختاره المساعد الذكي")}<div class="ai-host"></div></div>`); };
document.addEventListener("click", async ev => { const t = ev.target.closest("[data-aicf],[data-aicfwa]"); if (!t) return;
  if (t.dataset.aicfwa !== undefined) { const h = t.closest(".ai-host"); const co = coFor(h?._e?.comm || "")[0]; if (!co?.phone) return toast("لا يوجد رقم للمنسق"); return waGo(co.phone, h._msg || ""); }
  const e = S.byId.get(t.dataset.aicf), host = t.parentElement.querySelector(".ai-host"); if (!e || !host) return;
  const alts = aiAlts(e);
  if (!alts.length) { host.innerHTML = `<div class="ai-out s">لا يوجد في البيانات وقت أو مسجد قريب خالٍ من التعارض لهذا النشاط؛ راجع المنسق مباشرة.</div>`; return; }
  aiBusy(t, true);
  const r = await aiCall("conflict_fix", { activity:{ n:e.n, title:e.title, type:e.type, comm:e.comm, lect:e.lect, mosque:e.mosName, area:e.area, days:daysText(e), time:e.time },
    conflicts_with:e.cf.map(c => ({ n:c.o.n, comm:c.o.comm, lect:c.o.lect, time:c.o.time })), alternatives:alts.map((a, i) => ({ i, option:a.label })) });
  aiBusy(t, false);
  if (!r.ok) { host.innerHTML = `<div class="ai-out s">${esc(r.msg || AI_QUIET)}</div><div class="ai-out">${alts.map(a => esc(a.label)).join("<br>")}</div>`; return; }
  const pick = alts[Math.max(0, Math.min(alts.length - 1, +r.out?.pick || 0))];
  host._e = e; host._msg = r.out?.msg || "";
  host.innerHTML = `<div class="ai-out"><b>المقترح: ${esc(pick.label)}</b>\n${esc(r.out?.why || "")}\n\n<b>رسالة للمنسق:</b>\n${esc(host._msg)}<div class="br-acts"><button type="button" class="btn" data-aicfwa>واتساب المنسق</button></div><span class="s">بدائل أخرى متاحة: ${alts.filter(a => a !== pick).map(a => esc(a.label)).join("، ") || "—"}</span>${aiNote}</div>`; });
