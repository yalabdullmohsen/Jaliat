/* ================= v171: تبسيط الواجهة (قاعدة عامة)
   - قائمة التصاريح داخل كل كتاب تُطوى («عرض التصاريح (N)») فلا تطول الصفحة.
   - اللوحات قليلة الاستعمال تُطوى تلقائياً (class c170) ويفتحها الضغط على عنوانها.
   - صفحة التصاريح: المطلوب الآن أولاً (الألسنة والموافقات التي تحتاج تصريحاً)، ثم الجاهزة للإرسال، ثم «إصدار بنفس بيانات سابق» مطوية. ================= */
const _prCard171 = prCard;
prCard = function(g){ const h = _prCard171(g); if (g.ps.length < 2) return h;
  return h.replace('<ol class="prs-l">', `<details class="prs-ld"><summary>عرض التصاريح (${g.ps.length})</summary><ol class="prs-l">`).replace("</ol>", "</ol></details>"); };

const C170_FOLD = [".pr-re"];   /* لوحات تُطوى افتراضياً في أي صفحة */
const c170Open = new Set();
function c170Fold(root){ C170_FOLD.forEach(sel => root.querySelectorAll(sel).forEach(p => { if (!p.querySelector(":scope>.panel-h")) return; p.classList.add("c170"); if (c170Open.has(sel)) p.classList.add("open"); p.dataset.c170 = sel; })); }
document.addEventListener("click", ev => { const h = ev.target.closest(".c170>.panel-h"); if (!h || ev.target.closest("button,a,input,select,label")) return;
  const p = h.parentElement, o = p.classList.toggle("open"); o ? c170Open.add(p.dataset.c170) : c170Open.delete(p.dataset.c170); });

function c170Permits(view){ const prs = view.querySelector(":scope>.prs"), re = view.querySelector(":scope>.pr-re"); if (!prs) return;
  /* الترتيب: الألسنة ومحتواها ← الجاهزة للإرسال ← إصدار بنفس بيانات سابق */
  const rest = [...view.children].filter(x => x !== prs && x !== re);
  rest.forEach(x => view.appendChild(x)); view.appendChild(prs); if (re) view.appendChild(re); }

/* القوائم الطويلة: أول 30 عنصراً، والباقي بزر «عرض المزيد» */
const C170_LONG = [".wq-list", "#view .list", "#view tbody", ".pv-list"], C170_STEP = 30, c170More = new Map();
function c170Limit(view){ C170_LONG.forEach(sel => view.querySelectorAll(sel).forEach((L, k) => { const key = S.view + sel + k;
  view.querySelectorAll(`.c170-more[data-k="${CSS.escape(key)}"]`).forEach(x => x.remove()); L.querySelectorAll(":scope>.c170-h").forEach(x => x.classList.remove("c170-h"));
  const items = [...L.children].filter(x => !x.classList.contains("wq-mh") && !x.classList.contains("c170-more")); const lim = c170More.get(key) || C170_STEP;
  if (items.length <= lim + 5) return;
  items.forEach((x, i) => x.classList.toggle("c170-h", i >= lim));
  /* عناوين الأشهر التي كل عناصرها مخفية تُخفى معها */
  L.querySelectorAll(":scope>.wq-mh").forEach(h => { let n = h.nextElementSibling, vis = false; while (n && !n.classList.contains("wq-mh")) { if (!n.classList.contains("c170-h")) vis = true; n = n.nextElementSibling; } h.classList.toggle("c170-h", !vis); });
  const b = document.createElement("button"); b.type = "button"; b.className = "btn btn-ghost c170-more"; b.dataset.k = key; b.textContent = `عرض المزيد (${items.length - lim})`;
  b.onclick = () => { c170More.set(key, lim + C170_STEP * 2); c170Limit(view); };
  if (L.tagName === "TBODY") { const t = L.closest("table"); (t.parentElement.classList.contains("table-wrap") ? t.parentElement : t).after(b); } else L.appendChild(b); })); }

/* وثيقة: «المطلوب منك الآن» والجاهزة للإرسال مباشرة تحت رأس الصفحة */
function c170Watheqa(view){ const head = view.querySelector(":scope>.wq-head"); if (!head) return; let at = head;
  [":scope>.wqtodo", ":scope>.prs"].forEach(sel => { const x = view.querySelector(sel); if (x) { at.after(x); at = x; } }); }

const _afterRender171 = afterRender;
afterRender = function(v){ _afterRender171(v); try { const view = $("#view"); if (v === "permits") c170Permits(view); if (v === "watheqa") c170Watheqa(view); c170Fold(view); c170Limit(view); } catch (_) {} };
