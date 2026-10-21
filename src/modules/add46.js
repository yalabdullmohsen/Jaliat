/* ===== v56: «إكمال البيانات» made clear · open the original letter · smart coordinator suggestion · sidebar close on mobile ===== */

/* ---------- sidebar: on phones the arrow at the top closes the menu (it used to shrink it and get stuck) ---------- */
document.addEventListener("click", ev => { const side = $("#side"); if (!side?.classList.contains("open")) return;
  if (ev.target.closest("#collapse") || ev.target.closest("#side [data-nav]")) { if (ev.target.closest("#collapse")) { ev.preventDefault(); ev.stopImmediatePropagation(); } side.classList.remove("open"); } }, true);
document.addEventListener("keydown", ev => { if (ev.key === "Escape") $("#side")?.classList.remove("open"); });

/* ---------- smart suggestion: which coordinator does this letter belong to? ---------- */
const nk = s => String(s || "").replace(/[إأآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[^؀-ۿ0-9a-z ]/gi, " ").replace(/\s+/g, " ").trim();
const wqByNo = no => S.wq.find(w => w.no === no);
function suggestCo(x){ const w = x.kind === "doc" ? wqByNo(x.key) : null;
  const text = nk([w?.subj, w?.body, x.sub, ...x.acts.map(e => [e.lect, e.mosName, e.notes].join(" "))].join(" ")), digits = String(w?.body || "").replace(/\D/g, " ");
  const hits = (x.g.split || []).map(c => { const co = S.coords.filter(k => k.comm === c); let s = 0;
    const full = nk(shortCo(c)); if (full.split(" ").length >= 2 && text.includes(full)) s += 3;
    co.forEach(k => { const p = String(k.phone || "").replace(/\D/g, "").slice(-8); if (p.length === 8 && digits.includes(p)) s += 3; const kn = nk(k.name); if (kn.split(" ").length >= 2 && kn !== full && text.includes(kn)) s += 2; });
    return { c, s }; }).filter(h => h.s > 0).sort((a, b) => b.s - a.s);
  return hits.length && (hits.length === 1 || hits[0].s > hits[1].s) ? hits[0].c : null; }

/* ---------- the distribution list, redesigned ---------- */
splitHTML = function(){ const L = splitItems(); if (!L.length) return `<div class="fx-done"><b>✓ اكتمل التوزيع</b><span>كل الموافقات والأنشطة صارت عند منسقيها.</span></div>`;
  const groups = [...new Set(L.map(x => x.g.name))], gf = groups.includes(S.f.spg) ? S.f.spg : groups[0], I = L.filter(x => x.g.name === gf);
  const sug = L.map(x => ({ x, c:suggestCo(x) })).filter(y => y.c);
  return `<div class="sp-top"><div><b>${L.length} عنصر يحتاج تحديد منسقه</b><span>كانت مسجلة باسم الجالية القديمة المشتركة. افتح الكتاب إن احتجت، ثم اضغط اسم المنسق الصحيح، فتنتقل الموافقة وكل أنشطتها إليه.</span></div>
      ${sug.length && S.canWrite ? `<button type="button" class="btn btn-primary" data-spall>اعتماد المقترحات (${sug.length})</button>` : ""}</div>
    <div class="toolbar"><div class="seg">${groups.map(g => `<button type="button" class="${g === gf ? "on" : ""}" data-spg="${esc(g)}">${esc(g)} <span class="num">${L.filter(x => x.g.name === g).length}</span></button>`).join("")}</div></div>
    <div class="sp2">${I.map(x => { const w = x.kind === "doc" ? wqByNo(x.key) : null, d = x.kind === "doc" ? docBy[x.key] : null, s = suggestCo(x);
      return `<div class="sp2-i"><div class="sp2-h"><div><b>${x.kind === "doc" ? `الموافقة <bdi dir="ltr">${esc(x.key)}</bdi>` : esc(x.title)}</b>
          <span>${esc(w?.subj || x.sub || "")}</span>${d ? `<span class="s">${d.start ? "من " + fmt(d.start) : ""}${d.end ? " إلى " + fmt(d.end) : ""}${d.end && d.end < TODAY ? ` <span class="chip bad">منتهية</span>` : ""}</span>` : ""}</div>
          ${w ? `<button type="button" class="btn" data-spopen="${esc(w.id)}">عرض الكتاب</button>` : x.acts[0] ? `<button type="button" class="btn" data-prio-open="act:${esc(x.acts[0].id)}">فتح النشاط</button>` : ""}</div>
        ${x.acts.length ? `<div class="sp2-a">${x.acts.slice(0, 4).map(e => `<div><span class="chip">${esc(e.type || "درس")}</span> ${esc(e.mosName || "مسجد غير محدد")} · ${esc(daysText(e) || "")} ${esc(e.time || "")}${e.lect ? ` · <b>${esc(e.lect)}</b>` : ""}</div>`).join("")}${x.acts.length > 4 ? `<div class="s">و${x.acts.length - 4} نشاط آخر</div>` : ""}</div>` : ""}
        <div class="sp2-q">${S.canWrite ? `<span class="s">لمن تتبع؟</span>` : ""}${(x.g.split || []).map(c => { const co = S.coords.find(k => k.comm === c && k.phone);
          return `<button type="button" class="sp2-c${c === s ? " sug" : ""}" data-spk="${x.kind}" data-spkey="${esc(x.key)}" data-spc="${esc(c)}"${S.canWrite ? "" : " disabled"}><b>${esc(shortCo(c))}</b>${co ? `<span dir="ltr">${esc(co.phone)}</span>` : ""}${c === s ? `<i>مقترح</i>` : ""}</button>`; }).join("")}</div></div>`; }).join("")}</div>`; };

/* ---------- missing-data tabs: clearer rows with a direct action ---------- */
const _vFix56 = vFix;
vFix = function(){ return _vFix56()
  .replace('<div class="fx-head"><b>إكمال البيانات</b><span>كل نقص يمنع كشف التعارضات أو التذكير، اضغط أي سطر وأكمله.</span></div>', `<div class="fx-head"><b>إكمال البيانات</b><span>هنا كل ما ينقص النظام ليعمل بدقة: توزيع الموافقات القديمة على المنسقين، والأنشطة الناقصة، والجاليات بلا منسق. ابدأ بالتبويب الأول، وكل ما تُكمله يختفي من القائمة.</span></div>`)
  .replace(/<span class="fx-m">([\s\S]*?)<\/span><\/button>/g, (m, a) => `<span class="fx-m">${a}</span><span class="fx-go">إكمال</span></button>`); };

document.addEventListener("click", async ev => { const t = ev.target.closest("[data-spg],[data-spopen],[data-spall]"); if (!t) return; const D = t.dataset;
  if (D.spg) { S.f.spg = D.spg; return render(); }
  if (D.spopen) return wqForm(D.spopen);
  if (D.spall !== undefined) { const L = splitItems().map(x => ({ x, c:suggestCo(x) })).filter(y => y.c); if (!L.length) return;
    if (t.dataset.sure !== "1") { t.dataset.sure = "1"; t.textContent = `تأكيد نقل ${L.length} عنصر لمنسقيها المقترحين`; return; }
    t.disabled = true; let n = 0; for (const { x, c } of L) { const { error } = await sb.rpc("assign_comm", { p_kind:x.kind, p_key:x.key, p_comm:c }); if (error) { writeFail(error); break; } n++;
      if (x.kind === "doc") { for (const [, a] of S.acts) if (a.doc === x.key) a.comm = c; const d = docBy[x.key]; if (d) d.comm = c; } else if (x.kind === "act") { const a = S.acts.get(x.key); if (a) a.comm = c; } else { const k = S.khatibs.get(x.key); if (k) k.comm = c; } }
    derive(); render(); toast(`نُقل ${n} عنصر لمنسقيه`); } });

NEWF.splice(1, 0, ["v56-fix", "nav:fix", "إكمال البيانات أوضح وأسهل", "افتح الكتاب الأصلي لكل موافقة من مكانها، وشاهد أنشطتها وتواريخها، ويقترح النظام المنسق الصحيح من نص الكتاب، ويمكن اعتماد كل المقترحات بضغطة.", false, "2026-10-21"]);
