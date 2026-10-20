/* ================= v38: approved reward sheets per bank (history Apr 2026→) + IBAN register ================= */
const RH = { rows:[], kb:new Map(), loaded:false, m:"", q:"" };
const BANK_ORD = ["بيت التمويل الكويتي", "بنك الكويت الدولي", "بنك الكويت الوطني", "البنك التجاري", "بنك الخليج", "بنك برقان", "بنك وربة", "بنك بوبيان", "البنك الأهلي"];
const ibanOk = i => /^KW\d{2}[A-Z]{4}[A-Z0-9]{22}$/.test(i || "");
async function rhLoad(){ const [a, b] = await Promise.all([sb.from("reward_history").select("*").order("month", { ascending:false }).limit(5000), sb.from("khatib_bank").select("*").limit(3000)]);
  RH.rows = a.data || []; RH.kb = new Map((b.data || []).map(r => [r.cid, r])); RH.loaded = true; }
const rhMonths = () => [...new Set(RH.rows.map(r => r.month))].sort().reverse();
const ymOf = (y, m) => `${y}-${String(m + 1).padStart(2, "0")}`;
const monLabel = ym => { const [y, m] = ym.split("-"); return `${MONTHS[+m - 1]} ${y}`; };
function rhGroups(ym){ const q = nkey(RH.q); const L = RH.rows.filter(r => r.month === ym && (!q || nkey(r.name + " " + r.cid + " " + (r.iban || "")).includes(q)));
  const G = new Map(); for (const r of L) { const b = r.bank || "بنك غير محدد"; if (!G.has(b)) G.set(b, []); G.get(b).push(r); }
  for (const l of G.values()) l.sort((a, b) => a.name.localeCompare(b.name, "ar"));
  return [...G.entries()].sort((a, b) => (BANK_ORD.indexOf(a[0]) + 1 || 99) - (BANK_ORD.indexOf(b[0]) + 1 || 99)); }
function rhPeriod(ym){ const [y, m] = ym.split("-").map(Number); const F = fridays(y, m - 1); return F.length ? `من تاريخ ${fmt(F[0])} إلى ${fmt(F[F.length - 1])}م` : ""; }
function vRewardHist(){
  if (!RH.loaded) { rhLoad().then(() => S.view === "rewards" && render()); return `<div class="loading">جارٍ التحميل…</div>`; }
  const M = rhMonths(); if (!RH.m || !M.includes(RH.m)) RH.m = M[0] || ""; if (!RH.m) return `<div class="empty">لا توجد كشوفات معتمدة بعد</div>`;
  const G = rhGroups(RH.m), all = G.flatMap(g => g[1]), sum = all.reduce((s, r) => s + +r.amount, 0), cnt = all.reduce((s, r) => s + r.count, 0), bad = all.filter(r => !ibanOk(r.iban)).length;
  const prev = M[M.indexOf(RH.m) + 1], pr = prev ? RH.rows.filter(r => r.month === prev).reduce((s, r) => s + +r.amount, 0) : null;
  return `<div class="toolbar rh-bar"><div class="seg rh-ms">${M.map(m => `<button type="button" data-rhm="${m}" class="${m === RH.m ? "on" : ""}">${monLabel(m)}</button>`).join("")}</div>
      <div class="search"><svg><use href="#i-search"/></svg><input class="f" id="rhq" placeholder="ابحث بالاسم أو الرقم المدني أو الآيبان…" value="${esc(RH.q)}"></div>
      <button class="btn btn-primary" type="button" data-rhprint>${icon("i-doc")} طباعة كشوف البنوك</button><button class="btn" type="button" data-rhxls>${icon("i-down")} إكسل (ورقة لكل بنك)</button></div>
    <div class="kpis">${[["إجمالي المكافآت", kd(sum) + " د.ك"], ["عدد الخطباء", all.length], ["عدد الخطب", cnt], ["البنوك", G.length]].map(([a, b], i) => `<div class="kpi"><span>${a}</span><b class="num">${b}</b>${i === 0 && pr !== null ? `<span class="s">${sum >= pr ? "▲" : "▼"} ${kd(Math.abs(sum - pr))} عن ${monLabel(prev)}</span>` : ""}</div>`).join("")}</div>
    ${bad ? `<div class="check warn"><b>${bad} آيبان يحتاج تحقق</b><span>طول الآيبان الكويتي 30 خانة — المظلل بالأصفر أقصر أو أطول (كما ورد في الكشف الأصلي).</span></div>` : ""}
    <div class="panel sr-sheet" id="sr-sheet">${G.map(([b, L]) => { const s = L.reduce((x, r) => x + +r.amount, 0), c = L.reduce((x, r) => x + r.count, 0);
      return `<section class="rh-b"><div class="rh-h"><b>وزارة الشؤون الإسلامية — إدارة العلاقات الخارجية</b><span>قسم الجاليات ورعاية المهتدين وطلبة البعوث</span><h3>كشف مكافآت خطب الجمعة ${rhPeriod(RH.m)}</h3><h4>${esc(b)}</h4></div>
        <div class="table-wrap"><table class="stbl rh-t"><thead><tr><th>م</th><th>اسم الخطيب</th><th>آيبان</th><th>الرقم المدني</th><th class="c">عدد الخطب</th><th class="c">المبلغ د.ك</th></tr></thead><tbody>
        ${L.map((r, i) => `<tr><td class="n">${i + 1}</td><td class="nm"><button type="button" class="lnk" data-rhp="${esc(r.cid)}">${esc(r.name)}</button></td><td class="num iban${ibanOk(r.iban) ? "" : " bad-i"}" dir="ltr">${esc(r.iban || "—")}</td><td class="num">${esc(r.cid)}</td><td class="c num">${r.count}</td><td class="c num">${kd(r.amount)}</td></tr>`).join("")}
        </tbody><tfoot><tr><td></td><td class="nm">الإجمالي — ${L.length} خطيب</td><td></td><td></td><td class="c num">${c}</td><td class="c num">${kd(s)}</td></tr></tfoot></table></div>
        <div class="rh-sign"><span>مدير إدارة العلاقات الخارجية</span><i></i></div></section>`; }).join("")}</div>`; }
function rhPerson(cid){ const L = RH.rows.filter(r => r.cid === cid).sort((a, b) => a.month.localeCompare(b.month)), k = RH.kb.get(cid) || L[0]; if (!k) return;
  const sum = L.reduce((s, r) => s + +r.amount, 0), cnt = L.reduce((s, r) => s + r.count, 0);
  openDrawer(esc(k.name), `<div class="q-meta"><span>الرقم المدني: <b class="num">${esc(cid)}</b></span><span>${esc(k.bank || "")} · <span class="num" dir="ltr">${esc(k.iban || "")}</span>${ibanOk(k.iban) ? "" : ` <span class="chip warn">آيبان يحتاج تحقق</span>`}</span></div>
    <div class="kpis"><div class="kpi"><span>المكافآت</span><b class="num">${kd(sum)} د.ك</b></div><div class="kpi"><span>الخطب</span><b class="num">${cnt}</b></div><div class="kpi"><span>الأشهر</span><b class="num">${L.length}</b></div></div>
    <div class="list">${L.map(r => `<div class="li"><span class="t">${monLabel(r.month)}</span><span class="num">${r.count} خطب · ${kd(r.amount)} د.ك</span></div>`).join("")}</div>`, `<button class="btn btn-ghost" data-close>إغلاق</button>`); }
async function rhXls(){ await loadXLSX(); const G = rhGroups(RH.m); const wb = XLSX.utils.book_new(); wb.Workbook = { Views:[{ RTL:true }] };
  for (const [b, L] of G) { const A = [[`${b} - شهر ${+RH.m.slice(5)}/${RH.m.slice(0, 4)}`], ["م", "الاسم", "رقم الايبان", "الرقم المدني", "عدد الخطب", "المبلغ"], ...L.map((r, i) => [i + 1, r.name, r.iban, r.cid, r.count, +r.amount]), ["", "الإجمالي", "", "", L.reduce((s, r) => s + r.count, 0), L.reduce((s, r) => s + +r.amount, 0)], [], ["محاسب", "", "مدقق حسابات"]];
    const ws = XLSX.utils.aoa_to_sheet(A); ws["!cols"] = [{ wch:5 }, { wch:34 }, { wch:34 }, { wch:16 }, { wch:10 }, { wch:10 }]; XLSX.utils.book_append_sheet(wb, ws, b.slice(0, 30)); }
  XLSX.writeFile(wb, `كشوف-مكافآت-الخطباء-${RH.m}.xlsx`); }

/* current month: approve the live sheet into the bank sheets (adds IBAN/bank from the register) */
async function rhApprove(){ const [y, m] = srMonth(), ym = ymOf(y, m); if (!RH.loaded) await rhLoad(); const sheet = srSheet().filter(p => p.pid);
  if (!sheet.length) return toast("لا توجد خطب مسجّلة بأرقام مدنية لهذا الشهر");
  const miss = sheet.filter(p => !RH.kb.get(String(p.pid))?.iban);
  if (miss.length && !confirm(`${miss.length} خطيب بلا آيبان مسجّل (${miss.slice(0, 4).map(p => p.name).join("، ")}${miss.length > 4 ? "…" : ""}). اعتماد الباقي الآن؟`)) return;
  const rows = sheet.filter(p => RH.kb.get(String(p.pid))?.iban).map(p => { const k = RH.kb.get(String(p.pid)); return { month:ym, cid:String(p.pid), name:k.name || p.name, bank:k.bank, iban:k.iban, count:p.n, amount:p.sum, source:"system" }; });
  const { error } = await sb.from("reward_history").upsert(rows, { onConflict:"month,cid" }); if (error) return writeFail(error);
  await rhLoad(); RH.m = ym; SR.tab = "hist"; render(); toast(`اعتُمد كشف ${monLabel(ym)}: ${rows.length} خطيب في كشوف البنوك ✓`); }

const _vRewards38 = vRewards;
vRewards = function(){ let h = _vRewards38();
  h = h.replace('data-srtab="sheet" aria-pressed="' + (SR.tab === "sheet") + '">كشف المكافآت</button>', `data-srtab="sheet" aria-pressed="${SR.tab === "sheet"}">كشف المكافآت</button><button type="button" data-srtab="hist" aria-pressed="${SR.tab === "hist"}">كشوف البنوك المعتمدة</button>`);
  if (SR.tab === "hist") { const seg = (h.match(/<div class="seg" style="flex:none">[\s\S]*?<\/div>/) || [""])[0]; return `<div class="toolbar sr-bar">${seg}</div>` + vRewardHist(); }
  if (SR.tab === "sheet" && S.canWrite) h = h.replace('<span class="count">', `<button class="btn btn-ok" type="button" data-rhapprove>✓ اعتماد الكشف وتوزيعه على البنوك</button><span class="count">`);
  return h; };
document.addEventListener("click", ev => { const t = ev.target.closest("button"); if (!t) return; const D = t.dataset;
  if (D.rhm) { RH.m = D.rhm; return render(); }
  if (D.rhp) return rhPerson(D.rhp);
  if (D.rhxls !== undefined) return rhXls().catch(writeFail);
  if (D.rhapprove !== undefined) return rhApprove();
  if (D.rhprint !== undefined) { document.body.classList.add("print-sheet"); setTimeout(() => { window.print(); setTimeout(() => document.body.classList.remove("print-sheet"), 500); }, 50); }
});
document.addEventListener("input", ev => { if (ev.target.id === "rhq") { RH.q = ev.target.value; const p = ev.target.selectionStart; render(); const i = $("#rhq"); if (i) { i.focus(); i.setSelectionRange(p, p); } } });
NEWF.splice(1, 0, ["v38-rh", "nav:rewards", "كشوف البنوك في مكافآت الخطباء", "كشوف أبريل–يوليو 2026 أُدخلت (107 خطيب بالآيبان) — تظهر لجميع الموظفين، مقسّمة حسب البنك بنفس نموذج الإدارة: طباعة وإكسل لكل بنك، وسجل كل خطيب، واعتماد كشف الشهر الحالي بضغطة.", false, "2026-10-20"]);
