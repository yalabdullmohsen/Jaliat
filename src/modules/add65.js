/* v87 — تعديل التصريح الصادر: رئيس القسم ومدير النظام يعدّلون البيانات، ويبقى نفس الرقم ورمز التحقق والباركود */
const _pvEdit65 = permitView;
permitView = async function(id){ await _pvEdit65(id); const p = S.permits.find(x => x.id === id); if (!p || !S.admin || p.revoked) return;
  const f = $(".drawer-f"); if (!f || f.querySelector("[data-pedit]")) return;
  f.querySelector("[data-prevoke]")?.insertAdjacentHTML("beforebegin", `<button class="btn" type="button" data-pedit="${esc(p.id)}">تعديل التصريح</button>`) || f.querySelector("[data-close]")?.insertAdjacentHTML("beforebegin", `<button class="btn" type="button" data-pedit="${esc(p.id)}">تعديل التصريح</button>`); };
document.addEventListener("click", ev => { const t = ev.target.closest("[data-pedit]"); if (!t) return; if (!S.admin) return toast("تعديل التصريح لرئيس القسم أو مدير النظام");
  const p = S.permits.find(x => x.id === t.dataset.pedit); if (!p || p.revoked) return; const d = p.data || {}; closeDrawer();
  setTimeout(() => { const keep = { ...d, act_id:p.act_id || "" }; if (d.days?.length) keep.days = d.days; permitForm(keep); if (S.form?.kind !== "permit") return;
    S.form.edit = p.id; S.form.act = p.act_id || ""; const e = $("#p-date2"); if (e && p.until) e.value = p.until; if (d.rep && $("#p-rep")) $("#p-rep").value = d.rep;
    const dr = $("#p-dur"); if (dr && d.dur) { const k = DUR.find(x => x[1] === d.dur); if (k) dr.value = k[0]; }
    if (d.time_mode && $("#p-pray")) { $("#p-pray").value = d.time_mode; if (typeof pTimeSync === "function") pTimeSync(); }
    $("#p-act")?.closest(".p-auto")?.remove();
    const h = $(".drawer-h h3"); if (h) h.textContent = `تعديل التصريح ${p.no}`;
    const b = $("[data-pissue]"); if (b) b.textContent = "حفظ التعديل";
    $(".drawer-b")?.insertAdjacentHTML("afterbegin", `<span class="hint">يبقى نفس الرقم والباركود، ويظهر للإمام بالبيانات الجديدة عند المسح.</span>`); }, 60); });
NEWF.splice(1, 0, ["v87-pedit", "nav:permits", "تعديل التصريح", "افتح أي تصريح صادر واضغط «تعديل التصريح» لتغيير الشيخ أو المسجد أو الموعد أو المدة. يبقى نفس رقم التصريح والباركود، ويتحدّث للإمام عند المسح. لرئيس القسم ومدير النظام.", true, "2026-10-27"]);
