/* ================= v9.1: comments & private notes ================= */
TITLES.mine = "ملاحظاتي الخاصة";
S.cm = []; S.mine = [];
const CM_T = { act:"acts", kh:"khatibs", note:"notes", mos:"mosques", doc:"docs" };
function cmTarget(tbl, row){
  if (tbl === "acts") { const e = S.byId.get(row); return { l:e ? `النشاط رقم ${e.n}` : "نشاط محذوف", open:e ? `act:${row}` : "" }; }
  if (tbl === "khatibs") { const k = S.khatibs.get(row); return { l:k ? `خطيب ${k.mosque || ""}` : "خطيب محذوف", open:k ? `kh:${row}` : "" }; }
  if (tbl === "notes") { const n = S.notes.get(row); return { l:n ? `ملاحظة «${String(n.title || "").slice(0, 40)}»` : "ملاحظة محذوفة", open:n ? `note:${row}` : "" }; }
  if (tbl === "mosques") { const m = mosBy[row]; return { l:m ? `مسجد ${m.name}` : "مسجد", open:m ? `mos:${row}` : "" }; }
  if (tbl === "docs") return { l:`الوثيقة ${row}`, open:docBy[row] ? `doc:${row}` : "" };
  return { l:"", open:"" };
}
const cmFor = (tbl, row) => S.cm.filter(c => c.tbl === tbl && c.row_id === row).sort((a, b) => a.created_at < b.created_at ? -1 : 1);
const cmCount = (tbl, row) => S.cm.reduce((n, c) => n + (c.tbl === tbl && c.row_id === row ? 1 : 0), 0);
async function loadComments(){ const { data, error } = await sb.from("comments").select("*").order("created_at", { ascending:false }).limit(3000); if (!error) S.cm = data || []; }
async function loadMine(){ const { data, error } = await sb.from("my_notes").select("*").order("updated_at", { ascending:false }); if (!error) S.mine = data || []; }
let cmChannel = null;
function liveComments(){
  if (cmChannel) sb.removeChannel(cmChannel);
  cmChannel = sb.channel("cm").on("postgres_changes", { event:"*", schema:"public", table:"comments" }, p => {
    if (p.eventType === "DELETE") S.cm = S.cm.filter(c => c.id !== p.old?.id);
    else { S.cm = S.cm.filter(c => c.id !== p.new.id); S.cm.unshift(p.new);
      if (p.eventType === "INSERT" && p.new.user_id !== S.me?.id) { const tg = cmTarget(p.new.tbl, p.new.row_id); const me = (S.me?.name || "").trim();
        toast(me && p.new.body.includes(me) ? `${whoName(p.new.user_id)} ذكرك في تعليق على ${tg.l}` : `${whoName(p.new.user_id)} علّق على ${tg.l}`); } }
    refreshCmts(); if (["home", "acts", "comm"].includes(S.view) && $("#drawer").hidden) render();
  }).subscribe();
}
function cmItem(c){
  const mine = c.user_id === S.me?.id;
  return `<div class="cmt${c.private ? " pv" : ""}"><span class="av">${esc((whoName(c.user_id) || "؟").trim().charAt(0))}</span><div class="cb">
    <div class="ch"><b>${esc(whoName(c.user_id))}</b>${whoTitle(c.user_id) ? `<small>${esc(whoTitle(c.user_id))}</small>` : ""}${c.private ? `<span class="chip gold">${icon("i-lock", 12)} خاصة بك</span>` : ""}<span class="s num">${fmtTime(c.created_at)}${c.edited_at ? " · عُدّل" : ""}</span>
    ${mine || S.admin ? `<button type="button" class="cm-x" data-cmdel="${c.id}" title="حذف">×</button>` : ""}</div>
    <div class="ct">${esc(c.body)}</div></div></div>`;
}
function cmBlock(tbl, row){
  const L = cmFor(tbl, row);
  return `<div class="cmts" id="cmts" data-tbl="${esc(tbl)}" data-row="${esc(row)}">
    <div class="cmts-h">${icon("i-chat")}<b>التعليقات والملاحظات</b><span class="chip" id="cm-n">${L.length}</span></div>
    <div class="cmts-l" id="cmts-l">${L.map(cmItem).join("") || `<div class="s" style="padding:4px 2px">لا تعليقات بعد — اكتب أول تعليق.</div>`}</div>
    <div class="cmt-new"><textarea class="f" id="cm-in" rows="2" placeholder="اكتب تعليقاً للفريق أو ملاحظة لنفسك…  (Ctrl+Enter للإرسال)"></textarea>
      <div class="cmt-row"><label class="pv-t"><input type="checkbox" id="cm-priv"> ${icon("i-lock", 14)} ملاحظة خاصة — تظهر لي فقط</label><button type="button" class="btn btn-primary" id="cm-add">إضافة</button></div></div></div>`;
}
function refreshCmts(){
  const box = $("#cmts"); if (!box) return;
  const L = cmFor(box.dataset.tbl, box.dataset.row);
  $("#cmts-l").innerHTML = L.map(cmItem).join("") || `<div class="s" style="padding:4px 2px">لا تعليقات بعد — اكتب أول تعليق.</div>`;
  $("#cm-n").textContent = L.length;
}
function attachCmts(tbl, row){ if (!row || !$(".drawer-b") || $("#cmts")) return; $(".drawer-b").insertAdjacentHTML("beforeend", cmBlock(tbl, row)); }
async function addComment(){
  const box = $("#cmts"); const inp = $("#cm-in"); const body = inp.value.trim(); if (!box || !body) return;
  const b = $("#cm-add"); b.disabled = true;
  let data, error;
  try { ({ data, error } = await sb.from("comments").insert({ tbl:box.dataset.tbl, row_id:box.dataset.row, body, private:$("#cm-priv").checked, user_id:S.me.id }).select().single()); }
  catch (e) { error = e; } finally { b.disabled = false; }
  if (error) return writeFail(error);
  if (data && !S.cm.some(c => c.id === data.id)) S.cm.unshift(data);
  inp.value = ""; S.cmDirty = true; refreshCmts(); toast($("#cm-priv").checked ? "حُفظت ملاحظتك الخاصة" : "أُضيف التعليق");
  $("#cmts-l").lastElementChild?.scrollIntoView({ block:"nearest" });
}
async function delComment(id, btn){
  if (btn.dataset.sure !== "1") { btn.dataset.sure = "1"; btn.textContent = "تأكيد الحذف"; btn.classList.add("sure"); setTimeout(() => { if (btn.isConnected) { btn.dataset.sure = ""; btn.textContent = "×"; btn.classList.remove("sure"); } }, 3000); return; }
  const { error } = await sb.from("comments").delete().eq("id", id); if (error) return writeFail(error);
  S.cm = S.cm.filter(c => c.id !== +id); refreshCmts(); toast("حُذف التعليق");
}
/* attach to every record form */
const _actForm2 = actForm; actForm = function(id, preset){ _actForm2(id, preset); if (id && S.form?.kind === "act") attachCmts("acts", id); };
const _khForm2 = khForm; khForm = function(id){ _khForm2(id); if (id && S.form?.kind === "kh") attachCmts("khatibs", id); };
const _noteForm2 = noteForm; noteForm = function(id){ _noteForm2(id); if (id && S.form?.kind === "note") attachCmts("notes", id); };
const _listForm2 = listForm; listForm = function(kind, key){ _listForm2(kind, key); if ((kind === "mos" || kind === "doc") && key !== undefined && S.form?.i >= 0) attachCmts(kind === "mos" ? "mosques" : "docs", String(key)); };

/* ---------- private notebook ---------- */
const MCOL = { "":"var(--surface)", g:"var(--oks)", y:"var(--gold-soft)", b:"var(--t1s)", r:"var(--bads)", p:"var(--t2s)" };
function vMine(){
  const q = nkey(S.f.mq2 || "");
  const L = S.mine.filter(n => !q || nkey(n.title + " " + n.body).includes(q)).sort((a, b) => (b.pinned - a.pinned) || (a.updated_at < b.updated_at ? 1 : -1));
  const myCm = S.cm.filter(c => c.private && c.user_id === S.me?.id);
  return `<div class="panel"><div class="panel-b" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;font-size:14px;color:var(--muted)">${icon("i-lock", 18)}<span>هذه الصفحة لك وحدك: لا يراها أي مستخدم آخر ولا مدير النظام. اكتب فيها ما تريد، وتُحفظ تلقائياً أثناء الكتابة.</span></div></div>
  <div class="toolbar"><div class="search"><svg><use href="#i-search"/></svg><input id="mq2" class="f" placeholder="ابحث في ملاحظاتك…" value="${esc(S.f.mq2 || "")}" data-fk="mq2"></div>
    <button class="btn btn-primary" data-mine="new">${icon("i-plus")}ملاحظة خاصة جديدة</button><span class="count">${L.length} ملاحظة</span></div>
  <div class="cards mine">${L.map(n => `<button class="ccard" data-mine="${esc(n.id)}" style="background:${MCOL[n.color] || MCOL[""]}">
      <div class="row">${n.pinned ? `<span class="chip gold">مثبّتة</span>` : ""}<span class="s num" style="margin-inline-start:auto">${fmtTime(n.updated_at)}</span></div>
      <h3>${esc(n.title || "بدون عنوان")}</h3><span class="s" style="white-space:pre-line">${esc((n.body || "").slice(0, 260))}${(n.body || "").length > 260 ? "…" : ""}</span></button>`).join("") || `<div class="empty">لا توجد ملاحظات خاصة بعد. اضغط «ملاحظة خاصة جديدة».</div>`}</div>
  ${myCm.length ? `<div class="panel"><div class="panel-h"><h3>ملاحظاتك الخاصة على السجلات</h3><span class="chip">${myCm.length}</span></div><div class="list">
    ${myCm.slice(0, 50).map(c => { const tg = cmTarget(c.tbl, c.row_id); return `<button class="li"${tg.open ? ` data-open="${esc(tg.open)}"` : ""}><span class="chip gold">${esc(tg.l)}</span><span class="s" style="white-space:pre-line">${esc(c.body.slice(0, 200))}</span><span class="s num">${fmtTime(c.created_at)}</span></button>`; }).join("")}</div></div>` : ""}`;
}
function mineForm(id){
  const n = id ? S.mine.find(x => x.id === id) : { title:"", body:"", color:"", pinned:false };
  if (!n) return;
  S.form = { kind:"mine", id:id || null, color:n.color || "", pinned:!!n.pinned };
  openDrawer(id ? "ملاحظة خاصة" : "ملاحظة خاصة جديدة", `
    <div class="hint" style="display:flex;gap:6px;align-items:center">${icon("i-lock", 14)} تظهر لك وحدك، وتُحفظ تلقائياً</div>
    <input class="f" id="m-title" placeholder="العنوان" value="${esc(n.title)}" style="font-size:18px;font-weight:600">
    <textarea class="f" id="m-body" rows="14" placeholder="اكتب هنا…">${esc(n.body)}</textarea>
    <div class="fld"><span class="lbl">اللون</span><div class="days" id="m-col">${Object.keys(MCOL).map(k => `<button type="button" data-mcol="${k}" aria-pressed="${k === S.form.color}" style="background:${MCOL[k]};min-width:44px">${k ? "&nbsp;" : "بدون"}</button>`).join("")}</div></div>
    <div class="days"><button type="button" id="m-pin" aria-pressed="${S.form.pinned}">تثبيت في الأعلى</button></div>
    <span class="hint" id="m-st"></span>`,
    `<button class="btn btn-primary" data-msave>حفظ وإغلاق</button><button class="btn btn-ghost" data-close>إغلاق</button>${id ? `<span style="margin-inline-start:auto"><button class="btn btn-danger" id="m-del">حذف</button></span>` : ""}`);
  if (!id) $("#m-title").focus();
}
async function mineSave(close){
  const F = S.form; if (!F || F.kind !== "mine") return;
  const row = { title:$("#m-title").value.trim(), body:$("#m-body").value, color:F.color, pinned:F.pinned, updated_at:new Date().toISOString() };
  if (!F.id && !row.title && !row.body.trim()) { if (close) closeDrawer(); return; }
  const st = $("#m-st"); if (st) st.textContent = "جارٍ الحفظ…";
  let res;
  if (F.id) res = await sb.from("my_notes").update(row).eq("id", F.id).select().single();
  else res = await sb.from("my_notes").insert({ ...row, user_id:S.me.id }).select().single();
  if (res.error) { if (st) st.textContent = "تعذّر الحفظ"; return writeFail(res.error); }
  const d = res.data || { ...row, id:F.id }; if (!F.id) F.id = d.id;
  S.mine = [d, ...S.mine.filter(x => x.id !== d.id)];
  if (st) st.textContent = "حُفظ تلقائياً " + fmtTime(d.updated_at || row.updated_at).split(" ").slice(1).join(" ");
  if (close) { closeDrawer(); toast("حُفظت الملاحظة الخاصة"); if (S.view === "mine") render(); }
}
async function mineDelete(btn){
  if (btn.dataset.sure !== "1") { btn.dataset.sure = "1"; btn.textContent = "تأكيد الحذف"; return; }
  const id = S.form?.id; if (!id) return closeDrawer();
  const { error } = await sb.from("my_notes").delete().eq("id", id); if (error) return writeFail(error);
  S.mine = S.mine.filter(x => x.id !== id); closeDrawer(); toast("حُذفت الملاحظة"); if (S.view === "mine") render();
}
const _closeDrawer2 = closeDrawer;
closeDrawer = function(){ const F = S.form; if (F?.kind === "mine" && F.dirty) { F.dirty = false; mineSave(false).then(() => { if (S.view === "mine") render(); }); } _closeDrawer2(); if (S.cmDirty) { S.cmDirty = false; setTimeout(render, 0); } };

/* ---------- home panel: latest comments ---------- */
const _vHome2 = vHome;
vHome = function(){
  let h = _vHome2();
  const L = S.cm.slice(0, 6);
  const panel = `<div class="panel"><div class="panel-h"><h3>آخر التعليقات</h3><span class="chip">${S.cm.filter(c => !c.private).length}</span></div><div class="list">
    ${L.map(c => { const tg = cmTarget(c.tbl, c.row_id); return `<button class="li"${tg.open ? ` data-open="${esc(tg.open)}"` : ""}><span class="av-s">${esc(whoName(c.user_id).trim().charAt(0))}</span><span style="min-width:0"><span class="t">${esc(whoName(c.user_id))}</span> <span class="s">على ${esc(tg.l)}${c.private ? " · خاصة" : ""}</span><br><span class="s cm-1">${esc(c.body)}</span></span><span class="s num">${fmtTime(c.created_at).split(" ")[0]}</span></button>`; }).join("") || `<div class="empty">لا تعليقات بعد — افتح أي نشاط واكتب تعليقاً في أسفله</div>`}</div></div>`;
  const k = '<div class="panel"><div class="panel-h"><h3>المتصلون الآن</h3>';
  return h.includes(k) ? h.replace(k, panel + k) : h + panel;
};
/* comment count in the activities table */
const _actsTable2 = actsTable;
actsTable = function(list, showComm){
  const h = _actsTable2(list, showComm);
  return h.replace(/<tr data-open="act:([^"]+)">([\s\S]*?)<\/tr>/g, (m, id, inner) => { const n = cmCount("acts", id); if (!n) return m; return `<tr data-open="act:${id}">${inner.replace(/<\/td>$/, `<span class="cm-n" title="تعليقات">${icon("i-chat", 13)}${n}</span></td>`)}</tr>`; });
};
/* AI: team comments as extra context (private ones never leave) */
const _aiContext2 = aiContext;
aiContext = function(){
  const pub = S.cm.filter(c => !c.private).slice(0, 300);
  return _aiContext2() + (pub.length ? `\n\n## تعليقات الفريق — على | الكاتب | التاريخ | التعليق\n` + pub.map(c => [cmTarget(c.tbl, c.row_id).l, whoName(c.user_id), fmtTime(c.created_at), c.body.replace(/\s+/g, " ").slice(0, 300)].join(" | ")).join("\n") : "");
};
/* palette entries */
const _palAll2 = palAll;
palAll = function(){
  const A = _palAll2();
  A.splice(1, 0, { g:"إجراءات", t:"ملاحظة خاصة جديدة", s:"تظهر لك وحدك", ic:"i-lock", run:() => mineForm(), txt:"ملاحظه خاصه جديده مذكره شخصيه" });
  for (const n of S.mine) A.push({ g:"ملاحظاتي الخاصة", t:n.title || "بدون عنوان", s:(n.body || "").slice(0, 80), ic:"i-lock", run:() => mineForm(n.id), txt:n.title + " " + n.body });
  for (const c of S.cm.slice(0, 400)) { const tg = cmTarget(c.tbl, c.row_id); if (tg.open) A.push({ g:"التعليقات", t:c.body.slice(0, 70), s:`${whoName(c.user_id)} · ${tg.l}`, ic:"i-chat", run:() => { const [k, id] = tg.open.split(":"); k === "act" ? actForm(id) : k === "kh" ? khForm(id) : k === "note" ? noteForm(id) : listForm(k, id); }, txt:c.body + " " + whoName(c.user_id) }); }
  return A;
};

/* ---------- events ---------- */
document.addEventListener("click", ev => {
  const t = ev.target.closest("button"); if (!t) return;
  if (t.id === "cm-add") return addComment();
  if (t.dataset.cmdel) return delComment(t.dataset.cmdel, t);
  if (t.dataset.mine) return mineForm(t.dataset.mine === "new" ? null : t.dataset.mine);
  if (t.dataset.mcol !== undefined && S.form?.kind === "mine") { S.form.color = t.dataset.mcol; S.form.dirty = true; document.querySelectorAll("#m-col button").forEach(b => b.setAttribute("aria-pressed", b === t)); return mineSave(false); }
  if (t.id === "m-pin" && S.form?.kind === "mine") { S.form.pinned = !S.form.pinned; t.setAttribute("aria-pressed", S.form.pinned); return mineSave(false); }
  if (t.dataset.msave !== undefined) { if (S.form) S.form.dirty = false; return mineSave(true); }
  if (t.id === "m-del") return mineDelete(t);
});
document.addEventListener("input", ev => {
  if (S.form?.kind === "mine" && (ev.target.id === "m-title" || ev.target.id === "m-body")) { S.form.dirty = true; clearTimeout(mineSave.t); mineSave.t = setTimeout(() => { if (S.form?.kind === "mine") { S.form.dirty = false; mineSave(false); } }, 800); }
});
document.addEventListener("keydown", ev => { if (ev.target.id === "cm-in" && ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); addComment(); } });
const _boot9b = boot9;
boot9 = function(){ _boot9b(); Promise.all([loadComments(), loadMine()]).then(() => { liveComments(); if ($("#drawer").hidden && S.view !== "ai") render(); }); };
