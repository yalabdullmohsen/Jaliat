/* ===== v71: شاشة كتاب وثيقة: اتجاه الكتاب (صادر/وارد) واضح، زر نسخ رقم الكتاب، وأزرار مرتبة بأسماء مفهومة ===== */
function cpNo(v){ v = String(v || "").trim(); if (!v) return; const done = () => toast(`نُسخ الرقم ${v}`);
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(v).then(done, () => cpFallback(v, done)); else cpFallback(v, done); }
function cpFallback(v, done){ const t = document.createElement("textarea"); t.value = v; t.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); done(); } catch (_) { toast("تعذّر النسخ، انسخه يدوياً"); } t.remove(); }
document.addEventListener("click", ev => { const b = ev.target.closest("[data-cpno]"); if (!b) return; ev.preventDefault(); ev.stopPropagation(); cpNo(b.dataset.cpno); }, true);
const WQ_DIR = { out:["كتاب صادر", "أرسلناه من القسم"], in:["كتاب وارد", "وصل إلى القسم"], internal:["كتاب داخلي", "بين الإدارات داخل الوزارة"] };
