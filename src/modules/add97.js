/* ================= v97 (JL-7): بحث موحّد أسهل «ويظهر ما أريد» ================= */
/* البيانات المبحوث فيها هي ما حمّلته الصفحة لهذا المستخدم فقط، وكلها تمرّ بصلاحيات القاعدة (RLS والدوال)،
   فلا يظهر لأي دور إلا ما يحق له. لا جداول ولا دوال جديدة. */

/* 1) تطبيع عربي متسامح: الهمزات، التاء المربوطة والهاء، الياء والألف المقصورة، التشكيل، «ال»، الأرقام العربية والهندية، المسافات */
const AR_DIG = { "٠":"0", "١":"1", "٢":"2", "٣":"3", "٤":"4", "٥":"5", "٦":"6", "٧":"7", "٨":"8", "٩":"9", "۰":"0", "۱":"1", "۲":"2", "۳":"3", "۴":"4", "۵":"5", "۶":"6", "۷":"7", "۸":"8", "۹":"9" };
const sNorm = s => String(s ?? "").toLowerCase()
  .replace(/[ً-ٰٟۖ-ۭـ]/g, "")
  .replace(/[٠-٩۰-۹]/g, d => AR_DIG[d])
  .replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
  .replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
const sWords = s => sNorm(s).split(" ").filter(Boolean).map(w => w.length > 3 && w.startsWith("ال") ? w.slice(2) : w);
const sDigits = s => sNorm(s).replace(/\D/g, "");

/* 2) أنواع إضافية: التصاريح برقمها، كتب وثيقة، المحاضرون والمشايخ، حسابات البوابة وطلباتها (للموظف فقط) */
const _palAll97 = palAll;
palAll = function(){ const A = _palAll97(), E = S.E || [];
  const actsBy = (f) => E.filter(f).length;
  for (const x of A) {
    if (x.g === "المساجد") { const id = (S.mosques.find(m => "مسجد " + m.name === x.t) || {}).id; const n = id ? actsBy(e => e.mosque === id) : 0; x.s = ["مسجد", x.s, n ? `${n} ${n === 1 ? "نشاط" : "أنشطة"}` : "بلا أنشطة"].filter(Boolean).join(" · "); }
    else if (x.g === "الجاليات") { const co = S.coords.filter(c => c.comm === x.t && c.role === "منسق" && c.status !== "سابق").map(c => c.name); const n = actsBy(e => e.comm === x.t);
      x.s = ["جالية", co.length ? "المنسق " + co.join("، ") : "", `${n} نشاط`].filter(Boolean).join(" · "); }
    else if (x.g === "الوثائق") { x.g = "الموافقات"; const d = S.docs.find(k => k.no === x.t); x.s = ["موافقة", d?.comm, d?.end ? (d.end < TODAY ? "انتهت " : "حتى ") + fmt(d.end) : ""].filter(Boolean).join(" · "); x.ids = [x.t]; }
    else if (x.g === "المنسقون") { x.ids = [sDigits(x.s)].filter(v => v.length >= 7); x.s = "منسق · " + x.s; }
    else if (x.g === "الأنشطة") x.s = "نشاط · " + x.s;
    else if (x.g === "خطباء الجمعة") { x.s = "خطبة جمعة · " + x.s; x.ids = [x.txt].join(" ").match(/\d{8}/g) || []; }
    else if (x.g === "الطلبات") x.s = "طلب وارد · " + x.s;
  }
  /* التصاريح وكتب وثيقة موجودة في البحث (add17)؛ تُكمَّل بشرح ورقم للفتح المباشر، ويُضاف ما تجاوز حدها */
  const pSeen = new Set(), wSeen = new Set();
  for (const x of A) {
    if (x.g === "التصاريح") { const p = (S.permits || []).find(k => x.t.startsWith(k.no + " ")); if (p) { pSeen.add(p.id); x.ids = [p.no]; x.s = ["تصريح", p.data?.mosque, pStatus(p)[0]].filter(Boolean).join(" · "); } }
    else if (x.g === "وثيقة") { x.g = "كتب وثيقة"; const w = (S.wq || []).find(k => x.t.startsWith((k.no || "") + " ")); if (w) { wSeen.add(w.id); x.ids = [w.no, w.id]; x.s = ["كتاب وثيقة", wqDir(w) === "out" ? "صادر" : "وارد", x.s].filter(Boolean).join(" · "); } }
  }
  for (const p of (S.permits || []).filter(p => !pSeen.has(p.id)))
    A.push({ g:"التصاريح", t:`${p.no} ${p.data?.sheikh || ""}`, s:["تصريح", p.data?.mosque, pStatus(p)[0]].filter(Boolean).join(" · "), ic:"i-badge", run:() => { go("permits"); permitView(p.id); }, txt:[p.no, p.data?.sheikh, p.data?.mosque].join(" "), ids:[p.no] });
  for (const w of (S.wq || []).filter(w => !wSeen.has(w.id)).slice(0, 2500))
    A.push({ g:"كتب وثيقة", t:`${w.no || ""} ${w.subj || ""}`.trim(), s:["كتاب وثيقة", wqDir(w) === "out" ? "صادر" : "وارد", fmt(wqDate(w))].filter(Boolean).join(" · "), ic:"i-doc", run:() => { go("watheqa"); wqForm(w.id); }, txt:[w.no, w.subj, w.to_whom, w.sender].join(" "), ids:[w.no, w.id] });
  const lect = new Map(); E.forEach(e => (e.names || []).forEach(n => { const k = nkey(n); if (!lect.has(k)) lect.set(k, { n, c:0 }); lect.get(k).c++; }));
  for (const { n, c } of lect.values()) A.push({ g:"المشايخ والمحاضرون", t:n, s:`محاضر · ${c} ${c === 1 ? "نشاط" : "أنشطة"}`, ic:"i-people", run:() => typeof lectForm === "function" ? lectForm(n) : (Object.assign(S.f, F0({ q:n })), go("acts")), txt:n });
  for (const a of S.pacc || []) A.push({ g:"حسابات البوابة", t:a.name || "حساب", s:["حساب بوابة", a.role, a.comm].filter(Boolean).join(" · "), ic:"i-badge", run:() => { S.f.pvt = "accs"; go("portal"); }, txt:[a.name, a.comm, a.phone].join(" "), ids:[a.civil, a.phone].map(sDigits).filter(v => v.length >= 7) });
  for (const g of S.psign || []) A.push({ g:"طلبات حسابات البوابة", t:g.name || "طلب حساب", s:["طلب حساب", g.status === "pending" ? "بانتظار القرار" : g.status, g.comm].filter(Boolean).join(" · "), ic:"i-badge", run:() => { S.f.pvt = "sign"; go("portal"); }, txt:[g.name, g.comm, g.dep_name].join(" "), ids:[g.civil, g.phone, g.dep_civil, g.dep_phone].map(sDigits).filter(v => v.length >= 7) });
  return A; };

/* 3) الترتيب: المطابقة التامة ثم بداية الكلمة ثم الجزئية، والمجموعة صاحبة أفضل نتيجة أولًا */
const PAL_TIER = ["تطابق تام", "يبدأ بما كتبت", "يحتوي ما كتبت", "قريب مما كتبت"];
function palScore(x, q, toks, dq){
  const t = sNorm(x.t), all = sWords(x.t + " " + x.txt + " " + (x.s || "")), hay = " " + all.join(" ") + " ";
  if ((x.ids || []).some(v => v && (sNorm(v) === q || (dq.length >= 4 && sDigits(v) === dq && /^[\d\s+-]+$/.test(q))))) return [1000, 0];
  if (x.n !== undefined && String(x.n) === q) return [900, 0];
  const core = sWords(x.t).filter(w => !/^(مسجد|جامع|شيخ|تصريح|موافقه|نشاط)$/.test(w)).join(" ");
  if (t === q || sWords(x.t).join(" ") === toks.join(" ") || core === toks.join(" ")) return [500, 0];
  if (toks.every(k => hay.includes(" " + k))) return [300 + (sWords(x.t).some(w => w.startsWith(toks[0])) ? 20 : 0), 1];
  if (toks.every(k => hay.includes(k))) return [100, 2];
  const fz = toks.every(k => k.length >= 3 && (subseq(hay, k) || all.some(w => w.length >= 3 && lev1(w, k))));
  return fz ? [20, 3] : [0, -1];
}
function lev1(a, b){ if (Math.abs(a.length - b.length) > 1) return false; let i = 0, j = 0, e = 0; /* خطأ حرف واحد */
  while (i < a.length && j < b.length) { if (a[i] === b[j]) { i++; j++; continue; } if (++e > 1) return false; if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; } }
  return e + (a.length - i) + (b.length - j) <= 1; }
palSearch = function(raw){
  const q = sNorm(raw).replace(/^#/, ""), toks = sWords(q), dq = sDigits(raw), all = palAll();
  if (!toks.length) return all.filter(x => x.g === "إجراءات" || x.g === "الصفحات");
  const scored = []; for (const x of all) { const [sc, tier] = palScore(x, q, toks, dq); if (sc > 0) scored.push({ x, sc, tier }); }
  scored.sort((a, b) => b.sc - a.sc);
  if (scored.length && scored[0].tier >= 0 && scored[0].tier <= 2) for (let i = scored.length - 1; i >= 0; i--) if (scored[i].tier === 3) scored.splice(i, 1); /* «القريب» فقط إن لم يوجد أفضل */
  const best = new Map(); for (const r of scored) if (!best.has(r.x.g)) best.set(r.x.g, r.sc);
  const per = {}, out = [];
  for (const r of scored) { per[r.x.g] = (per[r.x.g] || 0) + 1; if (per[r.x.g] <= 6) out.push(Object.assign(r.x, { _sc:r.sc, _tier:r.tier })); if (out.length >= 60) break; }
  out.sort((a, b) => (best.get(b.g) - best.get(a.g)) || (b._sc - a._sc));
  PAL.direct = scored.length && scored[0].sc >= 900 && (scored.length === 1 || scored[1].sc < 900) ? scored[0].x : null;
  if (!out.length) PAL.dym = palDidYouMean(toks, all);
  return out; };
/* 4) لا نتيجة: أقرب تطابق */
function palDidYouMean(toks, all){ const k = toks.join(" "); let best = null, bd = 99;
  for (const x of all) { if (x.g === "إجراءات" || x.g === "الصفحات") continue; const t = sWords(x.t).join(" "); if (!t) continue;
    const d = editDist(t.slice(0, k.length + 2), k); if (d < bd) { bd = d; best = x; } }
  return best && bd <= Math.max(2, Math.floor(k.length / 3)) ? best : null; }
function editDist(a, b){ const m = a.length, n = b.length; if (!m || !n) return m || n; let p = Array.from({ length:n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const c = [i]; for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; } return p[n]; }

/* 5) العرض: نتائج فورية بمهلة قصيرة، وآخر عمليات البحث، وشرح لكل نتيجة */
const PAL_RECENT = "pal-recent";
const palRecent = () => { try { return JSON.parse(localStorage.getItem(PAL_RECENT) || "[]"); } catch (e) { console.warn("pal-recent", e); return []; } };
const palRemember = q => { q = String(q || "").trim(); if (q.length < 2) return; try { localStorage.setItem(PAL_RECENT, JSON.stringify([q, ...palRecent().filter(x => x !== q)].slice(0, 8))); } catch (e) { console.warn("pal-recent", e); } };
let palT = 0;
palRender = function(q){
  clearTimeout(palT); const L = $("#pal-l"); if (!L) return;
  const draw = () => {
    PAL.dym = null; PAL.direct = null; PAL.items = palSearch(q); PAL.sel = 0; PAL.q = q;
    const rec = !String(q || "").trim() ? palRecent() : [];
    let g = "", h = rec.length ? `<div class="pal-g">آخر عمليات البحث</div><div class="pal-rec">${rec.map(r => `<button type="button" class="chip" data-palq="${esc(r)}">${esc(r)}</button>`).join("")}</div>` : "";
    if (PAL.direct) h += `<div class="pal-g">فتح مباشر</div>`;
    h += PAL.items.map((x, i) => { const head = x.g !== g && !(PAL.direct && i === 0) ? `<div class="pal-g">${esc(g = x.g)}</div>` : (PAL.direct && i === 0 ? (g = "", "") : "");
      const tier = x._tier >= 0 && String(q || "").trim() ? `<span class="pal-tier t${x._tier}">${PAL_TIER[x._tier]}</span>` : "";
      return head + `<button class="pal-i" role="option" data-pi="${i}" aria-selected="${i === 0}"><span class="ic">${icon(x.ic)}</span><span style="min-width:0"><span class="t">${esc(x.t)}</span>${x.s ? `<span class="s">${esc(x.s)}</span>` : ""}</span>${tier}${i === 0 ? `<span class="kbd">Enter</span>` : ""}</button>`; }).join("");
    if (!PAL.items.length) h += `<div class="empty">لا نتائج لـ«${esc(q)}»${PAL.dym ? `<br><button type="button" class="btn btn-ghost" data-palq="${esc(PAL.dym.t)}">هل تقصد: ${esc(PAL.dym.t)}؟</button>` : `<br><span class="s">جرّب كلمة أقصر، أو رقم الموافقة أو التصريح أو الهاتف.</span>`}</div>`;
    L.innerHTML = h; };
  if (!String(q || "").trim()) return draw();
  palT = setTimeout(draw, 120);
};
if (PAL.direct === undefined) PAL.direct = null;
/* ترتيب المباشر أولًا في القائمة */
const _palSearch97b = palSearch;
palSearch = function(q){ const out = _palSearch97b(q); if (PAL.direct) { const i = out.indexOf(PAL.direct); if (i > 0) { out.splice(i, 1); out.unshift(PAL.direct); } else if (i < 0) out.unshift(PAL.direct); } return out; };
const _palRun97 = palRun;
palRun = function(i){ if (PAL.q) palRemember(PAL.q); return _palRun97(i); };
document.addEventListener("click", ev => { const b = ev.target.closest("[data-palq]"); if (!b || !PAL.open) return; ev.stopPropagation(); const inp = $("#pal-q"); inp.value = b.dataset.palq; palRender(inp.value); inp.focus(); }, true);
/* Enter قبل انتهاء المهلة: يحسب النتائج فورًا ثم يفتح */
document.addEventListener("keydown", ev => { if (!PAL.open || ev.key !== "Enter" || ev.isComposing) return; const inp = $("#pal-q"); if (inp && inp.value !== (PAL.q ?? "")) { clearTimeout(palT); PAL.items = palSearch(inp.value); PAL.q = inp.value; PAL.sel = 0; } }, true);
/* حسابات البوابة وطلباتها تُحمَّل عند أول فتح للبحث (دوال القاعدة تتحقق من الصلاحية) */
const _openPal97 = openPal;
openPal = function(){ _openPal97(); if (S.canWrite && !S.pacc && typeof paLoad === "function") paLoad().then(() => { const inp = $("#pal-q"); if (PAL.open && inp?.value) palRender(inp.value); }).catch(e => console.warn("paLoad", e)); const inp = $("#pal-q"); if (inp) inp.placeholder = "ابحث عن جالية، منسق، شيخ، مسجد، نشاط، رقم موافقة أو تصريح، كتاب وثيقة، هاتف أو رقم مدني…"; };
/* زر البحث في الترويسة اسمه واضح */
const _afterRender97 = afterRender;
afterRender = function(v){ _afterRender97(v); const f = $("#finder"); if (f && !f.dataset.j7) { f.dataset.j7 = "1"; f.title = "ابحث في كل شيء (Ctrl+K)"; f.setAttribute("aria-label", "ابحث في كل شيء"); } };
