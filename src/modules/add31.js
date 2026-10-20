/* ================= v31: التوصيات ← قرار رئيس القسم → «القرارات» معمّمة على الجميع مع إثبات الاطلاع ================= */
Object.assign(TITLES, { decisions:"القرارات", recs:"التوصيات" });
S.recs = []; S.decs = []; S.dreads = []; S.recTab = "open";
NKIND.unshift(["rec", "i-spark", "--gold", "توصية"], ["decision", "i-badge", "--primary", "قرار"]);
NK.push(["rec_new", "توصيات جديدة من الموظفين", true], ["rec_decided", "قرار رئيس القسم على توصيتي"], ["decision_new", "القرارات الجديدة"]);
const REC_K = [["ملاحظة", "ملاحظة على سير العمل أو إجراء معيّن"], ["مقترح تطوير", "فكرة لتحسين العمل أو النظام"], ["قرار تنظيمي", "تنظيم داخلي: دوام، توزيع، إجراءات"], ["قرار إداري", "قرار يحتاج اعتماد رئيس القسم"], ["رد على كتاب", "اقتراح الرد على كتاب وارد"], ["أخرى", "أي موضوع آخر"]];
const DEC_K = ["قرار إداري", "قرار تنظيمي", "تعميم", "توجيه", "أخرى"];
const REC_C = { "قيد الدراسة":"warn", "معتمدة":"ok", "معتمدة بتعديل":"ok", "مرفوضة":"bad" };
async function loadRD(){ const [a, b, c] = await Promise.all([sb.from("recommendations").select("*").order("created_at", { ascending:false }).limit(500), sb.from("decisions").select("*").order("issued_at", { ascending:false }).limit(500), sb.from("decision_reads").select("*").limit(5000)]);
  S.recs = a.data || []; S.decs = b.data || []; S.dreads = c.data || []; rdBadges(); if (["recs", "decisions", "home"].includes(S.view) && $("#drawer").hidden) render(); }
const dRead = (id, u = S.me.id) => S.dreads.find(r => r.decision_id === id && r.user_id === u);
const decUnread = () => S.decs.filter(d => !d.cancelled && d.issued_by !== S.me.id && !dRead(d.id));
const recOpen = () => S.recs.filter(r => r.status === "قيد الدراسة");
function rdBadges(){ for (const [k, n] of [["decisions", decUnread().length], ["recs", S.admin ? recOpen().length : 0]]) { const b = $(`#nav [data-nav="${k}"]`); if (!b) continue; let s = b.querySelector(".nb"); if (!s) { s = document.createElement("span"); s.className = "nb"; b.appendChild(s); } s.textContent = n || ""; s.hidden = !n; } }
const fmtD = iso => new Date(iso).toLocaleDateString("ar-KW-u-nu-latn", { day:"2-digit", month:"2-digit", year:"numeric" });
function decCard(d){ const rec = d.rec_id && S.recs.find(r => r.id === d.rec_id); const mine = d.issued_by === S.me.id, rd = dRead(d.id);
  const staff = S.profiles.filter(p => p.active && p.id !== d.issued_by), readN = staff.filter(p => dRead(d.id, p.id)).length;
  return `<div class="dc${d.cancelled ? " off" : ""}${!mine && !rd ? " new" : ""}"><div class="dc-h"><b class="num dc-no">ق-${d.no}</b><span class="chip">${esc(d.kind || "قرار إداري")}</span><span class="s">${fmtD(d.issued_at)} · ${esc(pname(d.issued_by))}</span>${d.cancelled ? `<span class="chip bad">ملغى</span>` : ""}${!mine && !rd ? `<span class="chip warn">جديد</span>` : ""}</div>
    <h3>${esc(d.title)}</h3>${d.body ? `<div class="dc-b">${esc(d.body).replace(/\n/g, "<br>")}</div>` : ""}
    ${d.rec_id ? `<span class="s">بناءً على التوصية ${rec ? `ت-${rec.no} من ${esc(pname(rec.author))}` : "المرفوعة"}</span>` : ""}
    <div class="dc-f">${S.admin ? `<button type="button" class="lnk" data-decreads="${d.id}">👁 اطّلع ${readN} من ${staff.length}</button>${!d.cancelled ? `<button type="button" class="lnk bad-t" data-deccancel="${d.id}">إلغاء القرار</button>` : ""}` : ""}
      ${!mine ? (rd ? `<span class="chip ok">✓ اطّلعت ${fmtD(rd.read_at)}</span>` : `<button type="button" class="btn btn-primary" data-decread="${d.id}">✓ اطّلعت على القرار</button>`) : ""}</div></div>`; }
function vDecisions(){ const L = S.decs.filter(d => !S.f.decq || norm(d.title + " " + d.body).includes(norm(S.f.decq)));
  return `<div class="toolbar"><div class="search"><svg><use href="#i-search"/></svg><input class="f" id="decq" data-fk="decq" placeholder="ابحث في القرارات…" value="${esc(S.f.decq || "")}"></div>${S.admin ? `<button class="btn btn-primary" type="button" data-decnew>${icon("i-plus")} إصدار قرار</button>` : ""}<button class="btn" type="button" data-go="recs">💡 رفع توصية</button></div>
    <div class="check"><b>القرارات المعمّمة</b><span>كل قرار يصدره رئيس القسم يصل لجميع الموظفين بإشعار، ويُسجَّل من اطّلع عليه ومتى.</span></div>
    <div class="dc-l">${L.map(decCard).join("") || `<div class="empty">لا توجد قرارات بعد</div>`}</div>`; }
function recCard(r){ return `<button type="button" class="tk rc" data-rec="${r.id}"><div class="rq-h"><b class="num rq-no">ت-${r.no}</b><span class="chip">${esc(r.kind || "مقترح تطوير")}</span><span class="chip ${REC_C[r.status]}">${esc(r.status)}</span>${r.decision_id ? `<span class="chip ok">صدر قرار</span>` : ""}</div><b>${esc(r.title)}</b>${r.body ? `<span class="s">${esc(r.body.slice(0, 140))}</span>` : ""}<span class="s">${esc(pname(r.author))} · ${fmtD(r.created_at)}${r.decided_at ? ` · بُتّ فيها ${fmtD(r.decided_at)}` : ""}</span></button>`; }
function vRecs(){ const open = S.recs.filter(r => r.status === "قيد الدراسة"), done = S.recs.filter(r => r.status !== "قيد الدراسة"); const L = S.recTab === "open" ? open : done;
  return `<div class="toolbar"><div class="seg"><button type="button" data-rectab="open" class="${S.recTab === "open" ? "on" : ""}">قيد الدراسة ${open.length}</button><button type="button" data-rectab="done" class="${S.recTab === "done" ? "on" : ""}">تم البتّ ${done.length}</button></div><button class="btn btn-primary" type="button" data-recnew>${icon("i-plus")} رفع توصية</button></div>
    <div class="check"><b>${S.admin ? "توصيات الموظفين" : "توصياتي"}</b><span>${S.admin ? "اعتمد التوصية فيصدر قرار يُعمَّم على الجميع، أو ارفضها مع ذكر السبب." : "ارفع توصيتك لرئيس القسم، ويصلك قراره بإشعار. التوصية المعتمدة تصدر قراراً في «القرارات»."}</span></div>
    <div class="tk-grid">${L.map(recCard).join("") || `<div class="empty">${S.recTab === "open" ? "لا توجد توصيات قيد الدراسة" : "لا توجد توصيات بُتّ فيها بعد"}</div>`}</div>`; }
function recForm(id, preset){ const r = id && S.recs.find(x => x.id === id); if (id && !r) return toast("التوصية غير متاحة لك"); S.form = { kind:"rec", id:id || null, link:preset?.link || r?.link || "" };
  if (!r) { S.form.rk = preset?.kind || "مقترح تطوير"; return openDrawer("رفع توصية لرئيس القسم", `<div class="fld"><label>نوع التوصية</label><div class="rk-g" id="rk-g">${REC_K.map(([k, d]) => `<button type="button" class="rkx${k === S.form.rk ? " on" : ""}" data-rk="${k}"><b>${k}</b><span>${d}</span></button>`).join("")}</div></div>
    <div id="rk-ref" ${S.form.rk === "رد على كتاب" ? "" : "hidden"}>${fld("rc-ref", "رقم الكتاب (اختياري)", `<input class="f" id="rc-ref" dir="ltr" placeholder="مثال: 2603-1887">`)}</div>${fld("rc-t", "التوصية", `<input class="f" id="rc-t" placeholder="اكتب توصيتك باختصار" value="${esc(preset?.title || "")}">`)}${fld("rc-b", "التفاصيل والمبررات", `<textarea class="f" id="rc-b" rows="5" placeholder="ما المقترح؟ ولماذا؟ وما أثره؟">${esc(preset?.body || "")}</textarea>`)}${S.form.link ? `<span class="hint">مرتبطة بـ ${esc(linkName(S.form.link))}</span>` : ""}`,
    `<button class="btn btn-primary" data-recsave>رفع التوصية</button><button class="btn btn-ghost" data-close>إلغاء</button>`); }
  const dec = r.decision_id && S.decs.find(d => d.id === r.decision_id);
  openDrawer(`التوصية ت-${r.no}`, `<div class="q-meta"><span>من <b>${esc(pname(r.author))}</b> · ${fmtTime(r.created_at)}</span><span class="chip ${REC_C[r.status]}">${esc(r.status)}</span></div>
    <span class="chip">${esc(r.kind || "مقترح تطوير")}${r.ref ? " · كتاب " + esc(r.ref) : ""}</span><h3 style="margin:6px 0">${esc(r.title)}</h3>${r.body ? `<div class="q-body">${esc(r.body).replace(/\n/g, "<br>")}</div>` : ""}
    ${r.link ? `<button type="button" class="btn" data-tklink="${esc(r.link)}">فتح ${esc(linkName(r.link))}</button>` : ""}
    ${r.status !== "قيد الدراسة" ? `<div class="q-ans"><b>قرار رئيس القسم — ${esc(pname(r.decided_by))}</b><span class="s">${r.decided_at ? fmtTime(r.decided_at) : ""}</span>${r.decision_note ? `<div>${esc(r.decision_note).replace(/\n/g, "<br>")}</div>` : ""}${dec ? `<button type="button" class="lnk" data-godec="${dec.id}">📜 القرار ق-${dec.no}</button>` : ""}</div>`
      : S.admin ? `<div class="rq-sec"><b>القرار</b>${fld("rc-dk", "نوع القرار", `<select class="f" id="rc-dk">${DEC_K.map(k => `<option${k === (DEC_K.includes(r.kind) ? r.kind : "قرار إداري") ? " selected" : ""}>${k}</option>`).join("")}</select>`)}${fld("rc-dt", "نص القرار (يُعمَّم على الجميع عند الاعتماد)", `<input class="f" id="rc-dt" value="${esc(r.title)}">`)}${fld("rc-db", "تفاصيل القرار", `<textarea class="f" id="rc-db" rows="4">${esc(r.body)}</textarea>`)}${fld("rc-n", "ملاحظة لصاحب التوصية", `<textarea class="f" id="rc-n" rows="2" placeholder="سبب الرفض أو التعديل…"></textarea>`)}</div>` : `<div class="empty s">بانتظار قرار رئيس القسم</div>`}`,
    `${S.admin && r.status === "قيد الدراسة" ? `<button class="btn btn-ok" data-recdecide="معتمدة">✓ اعتماد وإصدار قرار</button><button class="btn" data-recdecide="معتمدة بتعديل">اعتماد بتعديل</button><button class="btn btn-ghost bad-t" data-recdecide="مرفوضة">رفض</button>` : ""}<button class="btn btn-ghost" data-close>إغلاق</button>`);
}
async function recSave(){ const t = $("#rc-t").value.trim(), b = $("#rc-b").value.trim(); if (t.length < 2) return toast("اكتب التوصية");
  const row = { title:t, body:b, kind:S.form?.rk || "مقترح تطوير" }; const ref = $("#rc-ref")?.value.trim(); if (ref && row.kind === "رد على كتاب") row.ref = ref; if (S.form?.link) row.link = S.form.link;
  const { data, error } = await sb.from("recommendations").insert(row).select().single(); if (error) return writeFail(error);
  S.recs = [data, ...S.recs]; closeDrawer(); S.recTab = "open"; go("recs"); toast("رُفعت التوصية لرئيس القسم ووصله إشعار"); }
async function recDecide(st){ const r = S.recs.find(x => x.id === S.form?.id); if (!r) return; const note = $("#rc-n")?.value.trim() || "";
  if (st === "مرفوضة" && !note) { toast("اكتب سبب الرفض في الملاحظة"); return $("#rc-n")?.focus(); }
  let decId = null;
  if (st !== "مرفوضة") { const dt = $("#rc-dt").value.trim(), db = $("#rc-db").value.trim(); if (dt.length < 2) return toast("اكتب نص القرار");
    const { data, error } = await sb.from("decisions").insert({ title:dt, body:db, rec_id:r.id, kind:$("#rc-dk")?.value || "قرار إداري" }).select().single(); if (error) return writeFail(error); S.decs = [data, ...S.decs]; decId = data.id; }
  const { data, error } = await sb.from("recommendations").update({ status:st, decision_note:note || null, ...(decId ? { decision_id:decId } : {}) }).eq("id", r.id).select().single(); if (error) return writeFail(error);
  Object.assign(r, data); closeDrawer(); render(); rdBadges(); toast(st === "مرفوضة" ? "رُفضت التوصية ووصل السبب لصاحبها" : "صدر القرار وعُمِّم على جميع الموظفين ✓"); }
function decForm(){ S.form = { kind:"dec" }; openDrawer("إصدار قرار جديد", `${fld("dc-k", "النوع", `<select class="f" id="dc-k">${DEC_K.map(k => `<option>${k}</option>`).join("")}</select>`)}${fld("dc-t", "القرار", `<input class="f" id="dc-t" placeholder="مثال: اعتماد تذكير المنسقين قبل انتهاء الموافقة بـ 30 يوماً">`)}${fld("dc-b", "التفاصيل", `<textarea class="f" id="dc-b" rows="6"></textarea>`)}<span class="hint">يصل القرار لجميع الموظفين بإشعار، وتتابع من اطّلع عليه.</span>`,
  `<button class="btn btn-primary" data-decsave>إصدار وتعميم</button><button class="btn btn-ghost" data-close>إلغاء</button>`); }
async function decSave(){ const t = $("#dc-t").value.trim(), b = $("#dc-b").value.trim(); if (t.length < 2) return toast("اكتب القرار");
  const { data, error } = await sb.from("decisions").insert({ title:t, body:b, kind:$("#dc-k")?.value || "قرار إداري" }).select().single(); if (error) return writeFail(error); S.decs = [data, ...S.decs]; closeDrawer(); render(); toast(`صدر القرار ق-${data.no} وعُمِّم على الجميع ✓`); }
async function decMarkRead(id){ const { data, error } = await sb.from("decision_reads").insert({ decision_id:id }).select().single(); if (error && error.code !== "23505") return writeFail(error); if (data) S.dreads.push(data); rdBadges(); render(); }
function decReads(id){ const d = S.decs.find(x => x.id === id); const staff = S.profiles.filter(p => p.active && p.id !== d.issued_by);
  openDrawer(`من اطّلع على القرار ق-${d.no}`, `<div class="dc-r">${staff.map(p => { const r = dRead(id, p.id); return `<div><b>${esc(p.name || p.username)}</b>${r ? `<span class="chip ok">✓ ${fmtTime(r.read_at)}</span>` : `<span class="chip warn">لم يطّلع</span>`}</div>`; }).join("")}</div>`, `<button class="btn btn-ghost" data-close>إغلاق</button>`); }
document.addEventListener("click", async ev => { const t = ev.target.closest("button"); if (!t) return; const D = t.dataset;
  if (D.rk) { S.form.rk = D.rk; document.querySelectorAll("#rk-g .rkx").forEach(b => b.classList.toggle("on", b === t)); const r = $("#rk-ref"); if (r) r.hidden = D.rk !== "رد على كتاب"; return; }
  if (D.rectab) { S.recTab = D.rectab; return render(); }
  if (D.recnew !== undefined) return recForm(null);
  if (D.rec) return recForm(D.rec);
  if (D.recsave !== undefined) return recSave();
  if (D.recdecide) return recDecide(D.recdecide);
  if (D.decnew !== undefined) return decForm();
  if (D.decsave !== undefined) return decSave();
  if (D.decread) return decMarkRead(D.decread);
  if (D.decreads) return decReads(D.decreads);
  if (D.godec) { closeDrawer(); go("decisions"); return; }
  if (D.recfrom) { const [title, link] = D.recfrom.split("|"); return recForm(null, { title, link, kind:"ملاحظة" }); }
  if (D.deccancel) { if (D.sure !== "1") { D.sure = "1"; t.textContent = "اضغط مرة أخرى لإلغاء القرار"; return; } const { error } = await sb.from("decisions").update({ cancelled:true }).eq("id", D.deccancel); if (error) return writeFail(error); const d = S.decs.find(x => x.id === D.deccancel); if (d) d.cancelled = true; render(); toast("أُلغي القرار"); }
});
const _openLink31 = openLink;
openLink = function(h){ const s = String(h || "").replace(/^#/, ""); if (s.startsWith("rec:")) { if (S.view !== "recs") go("recs"); return recForm(s.slice(4)); } if (s.startsWith("dec:")) { go("decisions"); return; } return _openLink31(h); };
const _taskForm31 = taskForm;
taskForm = function(id, preset){ _taskForm31(id, preset); const t = id && S.tasks.find(x => x.id === id); if (!t) return; $(".drawer-f [data-close]")?.insertAdjacentHTML("beforebegin", `<button class="btn btn-ghost" type="button" data-recfrom="${esc("توصية بخصوص: " + t.title)}|#task:${t.id}">💡 رفع توصية</button>`); };
let rdCh = null;
const _boot9rd31 = boot9;
boot9 = function(){ _boot9rd31(); loadRD().catch(() => {}); if (rdCh) sb.removeChannel(rdCh);
  rdCh = sb.channel("rd").on("postgres_changes", { event:"*", schema:"public", table:"recommendations" }, p => { const r = p.new; if (!r?.id) return; const i = S.recs.findIndex(x => x.id === r.id); i >= 0 ? (S.recs[i] = r) : S.recs.unshift(r); rdBadges(); if (["recs", "home"].includes(S.view) && $("#drawer").hidden) render(); })
    .on("postgres_changes", { event:"*", schema:"public", table:"decisions" }, p => { const d = p.new; if (!d?.id) return; const i = S.decs.findIndex(x => x.id === d.id); i >= 0 ? (S.decs[i] = d) : S.decs.unshift(d); rdBadges(); if (["decisions", "home"].includes(S.view) && $("#drawer").hidden) render(); })
    .on("postgres_changes", { event:"INSERT", schema:"public", table:"decision_reads" }, p => { if (!S.dreads.some(r => r.decision_id === p.new.decision_id && r.user_id === p.new.user_id)) S.dreads.push(p.new); if (S.view === "decisions" && $("#drawer").hidden) render(); }).subscribe(); };
const _prio31 = priorities;
priorities = function(){ const P = _prio31(); const u = decUnread(); if (u.length) P.push({ w:97, k:"warn", t:`${u.length} قرار جديد من رئيس القسم لم تطّلع عليه`, s:u.slice(0, 2).map(d => d.title).join("، "), act:{ go:"decisions", l:"اطّلع على القرارات" } });
  if (S.admin) { const o = recOpen(); if (o.length) P.push({ w:94, k:"warn", t:`${o.length} توصية من الموظفين بانتظار قرارك`, s:o.slice(0, 2).map(r => `${pname(r.author)}: ${r.title}`).join("، "), act:{ go:"recs", l:"افتح التوصيات" } }); } return P.sort((a, b) => b.w - a.w); };
const _afterRender31 = afterRender;
afterRender = function(v){ _afterRender31(v); rdBadges(); };
const _palAll31 = palAll;
palAll = function(){ const A = _palAll31(); A.unshift({ g:"إجراءات", t:"رفع توصية لرئيس القسم", s:"", ic:"i-spark", run:() => recForm(null), txt:"توصية اقتراح رفع" }, { g:"إجراءات", t:"القرارات المعمّمة", s:"", ic:"i-badge", run:() => go("decisions"), txt:"قرار قرارات تعميم" }); return A; };
NEWF.splice(1, 0, ["v31-dec", "nav:decisions", "القرارات", "قسم جديد: كل قرار يصدره رئيس القسم يُعمَّم على الجميع بإشعار، وكل موظف يضغط «اطّلعت» ويرى الرئيس من اطّلع.", false, "2026-10-20"], ["v31-rec", "nav:recs", "التوصيات", "ارفع توصيتك لرئيس القسم؛ يعتمدها فيصدر قرار معمّم، أو يرفضها مع السبب — ويصلك الرد بإشعار.", false, "2026-10-20"]);
