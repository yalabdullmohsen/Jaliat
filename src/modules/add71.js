/* ===== v71: شاشة كتاب وثيقة: اتجاه الكتاب (صادر/وارد) واضح، زر نسخ رقم الكتاب، وأزرار مرتبة بأسماء مفهومة ===== */
function cpNo(v){ v = String(v || "").trim(); if (!v) return; const done = () => toast(`نُسخ الرقم ${v}`);
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(v).then(done, () => cpFallback(v, done)); else cpFallback(v, done); }
function cpFallback(v, done){ const t = document.createElement("textarea"); t.value = v; t.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); done(); } catch (_) { toast("تعذّر النسخ، انسخه يدوياً"); } t.remove(); }
document.addEventListener("click", ev => { const b = ev.target.closest("[data-cpno]"); if (!b) return; ev.preventDefault(); ev.stopPropagation(); cpNo(b.dataset.cpno); }, true);
const WQ_DIR = { out:["كتاب صادر", "أرسلناه من القسم"], in:["كتاب وارد", "وصل إلى القسم"], internal:["كتاب داخلي", "بين الإدارات داخل الوزارة"] };
const WQ_BTN = [["فتح في وثيقة", "فتح الكتاب في وثيقة"], ["إسناد متابعة", "إسناد متابعة لموظف"], ["تفويض تصريح", "تفويض إصدار تصريح"], ["إبلاغ المنسق", "إبلاغ المنسق بالواتساب"], ["تم الإنجاز", "تم إنجاز هذا الكتاب"]];
const _wqForm71 = wqForm;
wqForm = function(id){ _wqForm71(id); const w = S.wq.find(x => x.id === id), b = $(".drawer-b"), f = $(".drawer-f"); if (!w || !b) return;
  const d = WQ_DIR[w.dir] || ["كتاب", ""], no = String(w.no || "").trim();
  if (!b.querySelector(".wq-id")) b.insertAdjacentHTML("afterbegin", `<div class="wq-id ${esc(w.dir || "")}"><div class="wq-dir"><b>${d[0]}</b><span>${d[1]}${w.kind ? (d[1] ? " · " : "") + esc(w.kind) : ""}</span></div>${no ? `<button type="button" class="btn wq-cp" data-cpno="${esc(no)}" title="نسخ رقم الكتاب"><bdi dir="ltr">${esc(no)}</bdi><span>نسخ رقم الكتاب</span></button>` : ""}</div>`);
  b.querySelectorAll("span.s .chip").forEach(c => { const n = c.textContent.replace(/[^0-9-]/g, ""); if (/^\d{4}-\d{3,5}$/.test(n) && !c.nextElementSibling?.matches?.(".cp-mini")) c.insertAdjacentHTML("afterend", `<button type="button" class="cp-mini" data-cpno="${n}" title="نسخ رقم الكتاب">نسخ</button>`); });
  if (f) { f.classList.add("wq-f"); f.querySelectorAll(".btn").forEach(btn => { const tn = [...btn.childNodes].reverse().find(n => n.nodeType === 3 && n.textContent.trim()); if (!tn) return; const t = tn.textContent.trim(), pre = (t.match(/^[^\u0600-\u06FF]+/) || [""])[0], core = t.slice(pre.length).trim(), m = WQ_BTN.find(([a]) => core === a); if (m) tn.textContent = pre + m[1]; }); } };
