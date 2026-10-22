/* ===== v75: «نشاط الموظفين» — what every employee did on a day (from the change log), hours, and «سجّل إنجازاً» ===== */
Object.assign(TITLES, { staffday:"نشاط الموظفين" });
S.sd = { day:null, rows:null };
const SD_T = { acts:"الأنشطة", khatibs:"خطب الجمعة (المساجد)", sermons:"سجل الخطب", refs:"الجاليات والمنسقين والوثائق", notes:"الملاحظات", tasks:"المهام", requests:"الطلبات الواردة", bookings:"حجوزات القاعات", permits:"التصاريح", docs:"الوثائق" };
const SD_A = { INSERT:"إضافة", UPDATE:"تعديل", DELETE:"حذف" };
const sdT = d => d ? new Date(d).toLocaleTimeString("ar-KW-u-nu-latn", { hour:"numeric", minute:"2-digit", hour12:true, timeZone:"Asia/Kuwait" }) : "—";
async function sdLoad(day){ S.sd.day = day; S.sd.rows = null; render(); const { data, error } = await sb.rpc("staff_activity", { p_day:day }); S.sd.rows = error ? [] : (data || []); if (S.view === "staffday") render(); }
function sdHours(r){ if (!r.first) return 0; return Math.max(0.1, (+new Date(r.last) - +new Date(r.first)) / 36e5); }
function sdSummary(r){ const B = r.by || {}, L = [];
  const g = {}; for (const [k, n] of Object.entries(B)) { const [t, a] = k.split(":"); (g[t] = g[t] || []).push(`${SD_A[a] || a} ${n}`); }
  for (const [t, v] of Object.entries(g)) L.push(`${SD_T[t] || t}: ${v.join("، ")}`);
  if (r.tasks_done) L.push(`أنجز ${r.tasks_done} مهمة`); if (r.questions) L.push(`${r.questions} سؤال/إجابة`); if (r.chats) L.push(`${r.chats} رسالة`);
  return L; }
function vStaffDay(){ if (!S.admin) return `<div class="empty">هذه الصفحة لرئيس القسم ومدير النظام</div>`;
  const day = S.sd.day || TODAY; if (S.sd.day !== day || !S.sd.rows) { if (!S.sd.rows || S.sd.day !== day) setTimeout(() => sdLoad(day)); return `<div class="empty">جارٍ التحميل…</div>`; }
  const R = S.sd.rows.filter(r => r.n || r.tasks_done || r.questions || r.chats), idle = S.sd.rows.filter(r => !(r.n || r.tasks_done || r.questions || r.chats));
  return `<div class="toolbar"><button type="button" class="btn" data-sdday="${addDays(day, -1)}">› اليوم السابق</button><input type="date" class="f" id="sd-d" value="${day}" style="max-width:170px"><button type="button" class="btn" data-sdday="${addDays(day, 1)}"${day >= TODAY ? " disabled" : ""}>اليوم التالي ‹</button><span class="count">${R.length} موظف عمل · ${idle.length} بلا نشاط مسجّل</span></div>
  <div class="sd-l">${R.map(r => { const h = sdHours(r), S2 = sdSummary(r);
    return `<div class="panel sd-i"><div class="sd-h"><div><b>${esc(r.name)}</b><span class="s">${r.role === "admin" ? "مدير" : "موظف"}</span></div>
      <div class="sd-k"><div><span>من</span><b class="num">${sdT(r.first)}</b></div><div><span>إلى</span><b class="num">${sdT(r.last)}</b></div><div><span>المدة</span><b class="num">${h ? (h < 1 ? Math.round(h * 60) + " د" : h.toFixed(1) + " س") : "—"}</b></div><div><span>تعديلات</span><b class="num">${r.n}</b></div></div></div>
      <ul class="sd-s">${S2.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      ${(r.items || []).length ? `<details class="sd-d"><summary>التفاصيل (${r.items.length})</summary><div>${r.items.map(i => `<div><span class="num">${sdT(i.at)}</span> ${esc(SD_A[i.act] || i.act)} · ${esc(SD_T[i.tbl] || i.tbl)} · ${esc(i.s || "")}</div>`).join("")}</div></details>` : ""}
      <div class="sd-f"><button type="button" class="btn btn-primary" data-sdach="${r.id}">⭐ سجّل إنجازاً له</button></div></div>`; }).join("") || `<div class="empty">لا يوجد نشاط مسجّل في هذا اليوم</div>`}</div>
  ${idle.length ? `<div class="panel" style="margin-top:12px"><div class="panel-h"><h3>بلا نشاط مسجّل</h3></div><div class="panel-b">${idle.map(r => `<div class="sd-idle"><b>${esc(r.name)}</b><span class="s">آخر دخول: ${r.last_login ? fmt(String(r.last_login).slice(0, 10)) + " " + sdT(r.last_login) : "لم يدخل بعد"}</span></div>`).join("")}</div></div>` : ""}`; }
function sdAch(id){ const r = (S.sd.rows || []).find(x => x.id === id); if (!r) return; const h = sdHours(r);
  const det = `عمل يوم ${fmt(S.sd.day)} من ${sdT(r.first)} إلى ${sdT(r.last)} (نحو ${h < 1 ? Math.round(h * 60) + " دقيقة" : h.toFixed(1) + " ساعة"}):\n` + sdSummary(r).map(x => "• " + x).join("\n");
  S.form = { kind:"sdach", id };
  openDrawer(`تسجيل إنجاز: ${esc(r.name)}`, `${fld("sa-t", "العنوان", `<input class="f" id="sa-t" placeholder="مثال: توزيع الموافقات القديمة على المنسقين">`)}${fld("sa-d", "التفاصيل", `<textarea class="f" id="sa-d" rows="7">${esc(det)}</textarea>`)}${fld("sa-n", "كلمة شكر (اختياري)", `<input class="f" id="sa-n" value="جهد مميز، شكراً لك">`)}<span class="hint">يُسجَّل في «سجل إنجاز الموظفين» باسمه، ويصله إشعار، ويراه رئيس القسم والموظفون.</span>`,
    `<button class="btn btn-primary" data-sdsave>تسجيل الإنجاز</button><button class="btn btn-ghost" data-close>إلغاء</button>`); }
async function sdSave(btn){ const F = S.form; const t = $("#sa-t").value.trim(); if (!t) return toast("اكتب عنوان الإنجاز"); btn.disabled = true;
  const { error } = await sb.from("tasks").insert({ title:t, details:$("#sa-d").value.trim(), assignee:F.id, assigner:S.me.id, due:S.sd.day, prio:"عالية", status:"منجزة", done_at:new Date().toISOString(), link:"", done_note:$("#sa-n").value.trim() || null });
  if (error) { btn.disabled = false; return writeFail(error); } closeDrawer(); toast("سُجّل الإنجاز ✓"); try { loadTasks?.(); } catch (_) {} }
document.addEventListener("click", ev => { const t = ev.target.closest("button"); if (!t) return; const D = t.dataset;
  if (D.sdday) return sdLoad(D.sdday); if (D.sdach) return sdAch(D.sdach); if (D.sdsave !== undefined) return sdSave(t); });
document.addEventListener("change", ev => { if (ev.target.id === "sd-d" && ev.target.value) sdLoad(ev.target.value); });
NEWF.splice(1, 0, ["v75-staff", "nav:staffday", "نشاط الموظفين اليومي", "ما عمله كل موظف في اليوم: من أي ساعة إلى أي ساعة، وكم تعديل وعلى ماذا، مع زر «سجّل إنجازاً له» في سجل الإنجاز.", true, "2026-10-22"]);
