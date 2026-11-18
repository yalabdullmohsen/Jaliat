/* ================= v85: تحديد عدة تصاريح (مثلاً كل تصاريح منسق واحد) وإرسالها ملفات PDF منفصلة بضغطة واحدة ================= */
S.psel = S.psel || new Set();
const psComm = p => (p.act_id && S.byId?.get(p.act_id)?.comm) || p.data?.comm || "";
const psCommOf = p => psComm(p) || "بلا جالية";
function psBar(){ const n = S.psel.size;
  const cs = [...new Set(S.permits.filter(p => !p.revoked).map(psCommOf))].sort((a, b) => a.localeCompare(b, "ar"));
  return `<div class="panel ps-bar"><div class="panel-h"><h3>إرسال عدة تصاريح دفعة واحدة</h3><span class="s">حدّد التصاريح من القائمة، أو اختر منسقاً لتحديد كل تصاريحه السارية، ثم اضغط إرسال: كل تصريح يصل ملف PDF مستقلاً.</span></div>
    <div class="ps-ctl"><select class="f" id="ps-comm"><option value="">تحديد حسب الجالية / المنسق…</option>${cs.map(c => `<option>${esc(c)}</option>`).join("")}</select>
    <button type="button" class="btn btn-ghost" data-psclr${n ? "" : " disabled"}>مسح التحديد</button>
    <button type="button" class="btn btn-primary" data-pssend${n ? "" : " disabled"}>${icon("i-wa")} إرسال المحدد PDF <b id="ps-n">(${n})</b></button></div></div>`; }
const _vPermits85s = vPermits;
vPermits = function(){ const h = _vPermits85s(); if (!canPermit() || !/class="wq-i" data-permit=/.test(h)) return h;
  const ids = new Set(S.permits.map(p => p.id));
  const rows = h.replace(/<button type="button" class="wq-i" data-permit="([^"]+)">[\s\S]*?<\/button>/g, (m, id) => ids.has(id) ? `<div class="ps-row"><label class="ps-c"><input type="checkbox" data-psel="${esc(id)}"${S.psel.has(id) ? " checked" : ""} aria-label="تحديد التصريح"></label>${m}</div>` : m);
  return rows.replace(/<div class="wq-list">/, psBar() + '<div class="wq-list">'); };
function psCount(){ const n = S.psel.size, b = document.querySelector("[data-pssend]"), c = document.querySelector("[data-psclr]"), t = $("#ps-n"); if (t) t.textContent = `(${n})`; if (b) b.disabled = !n; if (c) c.disabled = !n; }
document.addEventListener("change", ev => { const t = ev.target;
  if (t.matches?.("[data-psel]")) { t.checked ? S.psel.add(t.dataset.psel) : S.psel.delete(t.dataset.psel); return psCount(); }
  if (t.id === "ps-comm" && t.value) { for (const p of S.permits) if (!p.revoked && p.until >= TODAY && psCommOf(p) === t.value) S.psel.add(p.id);
    document.querySelectorAll("[data-psel]").forEach(x => { x.checked = S.psel.has(x.dataset.psel); }); psCount(); toast(`حُدّد ${S.psel.size} تصريح`); t.value = ""; } });
document.addEventListener("click", async ev => {
  if (ev.target.closest("[data-psclr]")) { ev.preventDefault(); S.psel.clear(); document.querySelectorAll("[data-psel]").forEach(x => { x.checked = false; }); return psCount(); }
  const b = ev.target.closest("[data-pssend]"); if (!b) return; ev.preventDefault(); if (!canPermit() || !S.psel.size) return;
  const list = S.permits.filter(p => S.psel.has(p.id)), done = [], fail = [];
  b.disabled = true;
  try { for (let i = 0; i < list.length; i++) { const p = list[i]; toast(`يجهّز ملف PDF ${i + 1} من ${list.length}…`);
      try { await permitView(p.id); await new Promise(r => setTimeout(r, 40)); const f = await permitPdf(p.id); if (f) done.push(p); else fail.push(p); } catch (_) { fail.push(p); } } }
  finally { closeDrawer(); b.disabled = false; }
  const cm = [...new Set(done.map(psCommOf))]; pBulkSummary({ no:cm.length === 1 ? cm[0] : `${done.length} تصريح` }, done, fail.length);
  const hb = $(".drawer-b .check b"); if (hb) hb.textContent = `جُهّز ${done.length} ملف PDF للإرسال${fail.length ? ` · تعذّر ${fail.length}` : ""}`; }, true);
