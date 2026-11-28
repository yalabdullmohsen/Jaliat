/* ================= v183: البحث الذكي أحدث وأرتب (طلب يوسف 28/11/2026)
   تمييز الكلمة المكتوبة داخل النتائج، ورقم النشاط (#26) صغير هادئ بدل أن يزاحم الاسم. الشكل في add183.css ================= */
function pal183(){ const L = document.getElementById("pal-l"), q = (document.getElementById("pal-q")?.value || "").trim(); if (!L) return;
  const re = q.length >= 2 ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi") : null;
  L.querySelectorAll(".pal-i .t").forEach(t => { if (t.dataset.p183 === q) return; t.dataset.p183 = q;
    const raw = t.dataset.raw ?? (t.dataset.raw = t.textContent); const m = raw.match(/^#(\d+)\s*·\s*/), body = m ? raw.slice(m[0].length) : raw;
    const hl = re ? esc(body).replace(re, x => `<mark>${x}</mark>`) : esc(body);
    t.innerHTML = (m ? `<span class="pid">#${m[1]}</span>` : "") + hl; }); }
new MutationObserver(() => { const L = document.getElementById("pal-l"); if (L && !L.dataset.o183) { L.dataset.o183 = "1"; new MutationObserver(pal183).observe(L, { childList:true }); pal183(); } })
  .observe(document.body, { childList:true });
