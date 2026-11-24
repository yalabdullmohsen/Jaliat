/* ================= v94: صفحة الموافقات مرتبة (طلب يوسف «حطه في مكان خاص في الموافقات المنتهية، خل كل شيء مرتب») ================= */
/* ثلاثة أقسام بعددها: سارية، ثم تنتهي خلال 30 يومًا، ثم منتهية. المنتهية في مكانها الخاص فقط (لا تظهر في السارية)،
   وغير المجدَّدة وحدها، مرتبة من الأحدث انتهاءً، ولكل واحدة الجالية والمنسق وتاريخ الانتهاء وعدد أنشطتها وزرّا «تجديد» و«تذكير بالواتساب».
   الإشعار المؤرشف تلقائيًا للمنتهية يبقى كما هو (لا إشعار جديد هنا). */
const AP_SOON = 30;
const apCat = d => !d.end ? "valid" : d.end < TODAY ? "expired" : diffDays(TODAY, d.end) <= AP_SOON ? "soon" : "valid";
const apComm = d => d.comm || S.E.find(e => e.doc === d.no)?.comm || "";
/* جُدِّدت: موافقة أحدث للجالية نفسها سارية، تبدأ قرب انتهاء هذه أو بعده */
const apRenewed = d => { const c = apComm(d); return !!c && S.docs.some(x => x !== d && x.end && x.end >= TODAY && apComm(x) === c && (x.start || x.date || "") >= addDays(d.end, -60)); };
function apGroups(){ const G = { valid:[], soon:[], expired:[], renewed:0 };
  for (const d of S.docs) { const k = apCat(d); if (k === "expired" && apRenewed(d)) { G.renewed++; continue; } G[k].push(d); }
  G.expired.sort((a, b) => (b.end || "").localeCompare(a.end || "")); return G; }
const _vDocs94 = vDocs;
vDocs = function(){ const h = _vDocs94(), G = apGroups(), tab = ["valid", "soon", "expired"].includes(S.f.aptab) ? S.f.aptab : "valid";
  const tabs = `<div class="toolbar ap-tabs"><div class="seg">${[["valid", "سارية"], ["soon", `تنتهي خلال ${AP_SOON} يومًا`], ["expired", "منتهية"]].map(([k, l]) =>
    `<button type="button" class="${tab === k ? "on" : ""}" data-aptab="${k}">${l} <span class="num">${G[k].length}</span></button>`).join("")}</div></div>`;
  if (tab === "expired") return h.replace(/<div class="panel"><div class="table-wrap">[\s\S]*$/, "") + tabs + apExpired(G);
  /* السارية والقريبة: الجدول نفسه (بعمود التجديد) مقصورًا على القسم المختار */
  const keep = new Set(G[tab].map(d => d.no));
  return h.replace(/(<div class="panel"><div class="table-wrap">)/, tabs + "$1").replace(/<tr data-open="doc:([^"]*)">[\s\S]*?<\/tr>/g, (m, no) => keep.has(no.replace(/&quot;/g, '"')) ? m : ""); };
function apExpired(G){ if (!G.expired.length) return `<div class="empty">لا موافقات منتهية غير مجدَّدة ✓${G.renewed ? ` (${G.renewed} منتهية جُدِّدت بموافقة أحدث)` : ""}</div>`;
  return `<div class="panel ap-exp"><div class="panel-h"><h3>الموافقات المنتهية غير المجدَّدة</h3><span class="s">من الأحدث انتهاءً${G.renewed ? ` · لا تشمل ${G.renewed} جُدِّدت بموافقة أحدث` : ""}</span></div><div class="pv-list">${G.expired.map(d => {
    const x = rtBuild(d), c = x.coords[0], n = x.acts.length;
    return `<div class="pv-r"><div class="pv-n"><b>${esc(x.comm || "جالية غير محددة")} · الموافقة <bdi dir="ltr">${esc(d.no)}</bdi></b>
      <span>${c ? `${esc(c.name)} · <bdi dir="ltr">${esc(c.phone)}</bdi>` : "لا يوجد رقم منسق لهذه الجالية"}</span>
      <span class="s">انتهت ${fmt(d.end)} (منذ ${arDays(-diffDays(TODAY, d.end))}) · ${n ? `${n} نشاط مرتبط` : "بلا أنشطة مرتبطة"}</span></div>
      <div class="pv-b"><button type="button" class="btn btn-primary" data-letter="renew:${esc(d.no)}">${icon("i-doc")} تجديد</button>${c ? `<button type="button" class="btn" data-apwa="${esc(d.no)}">${icon("i-wa")} تذكير بالواتساب</button>` : ""}<button type="button" class="btn btn-ghost" data-open="doc:${esc(d.no)}">التفاصيل</button></div></div>`; }).join("")}</div></div>`; }
document.addEventListener("click", ev => { const t = ev.target.closest("[data-aptab],[data-apwa]"); if (!t) return;
  if (t.dataset.aptab) { S.f.aptab = t.dataset.aptab; return render(); }
  const d = S.docs.find(x => x.no === t.dataset.apwa); if (!d) return;
  /* نفس رسالة «إشعار الانتهاء» وتسجيله في صفحة التجديد إن كانت الموافقة فيها، وإلا الرسالة نفسها مباشرة */
  if (rtItems("expired").some(y => rtKey("expired", y) === d.no)) return rtSend(`expired|${d.no}|0`);
  const x = rtBuild(d), c = x.coords[0]; if (c) waOpen(c.phone, rtMsg("expired", x, c)); });
