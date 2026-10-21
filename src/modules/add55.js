/* ===== v67: rewards sheet = الاسم، الرقم المدني، الآيبان، عدد الخطب، المبلغ · approval line «اعتماد» ×3 · a properly formatted Excel ===== */
const SIGN3 = ["اعتماد الموظف", "اعتماد رئيس القسم", "اعتماد مدير الإدارة"];
function srRows(sheet){ return sheet.map(p => { const k = RH.kb.get(String(p.pid || "")) || {}; return { name:k.name || p.name || "", pid:String(p.pid || ""), iban:k.iban || "", bank:k.bank || "", n:p.n, sum:p.sum }; }); }
srSheetHTML = function(sheet, y, m, sum, cnt){
  if (!RH.loaded) { rhLoad().then(() => { if (S.view === "rewards") render(); }); }
  const R = srRows(sheet), noIban = R.filter(r => !ibanOk(r.iban)).length;
  return `<div class="toolbar"><button class="btn btn-primary" data-srprint>${icon("i-doc")} طباعة الكشف</button><button class="btn btn-ghost" data-srxls>${icon("i-down")} تصدير إكسل</button><span class="count">${R.length} خطيب · ${cnt} خطبة</span></div>
  ${noIban ? `<div class="check warn"><b>${noIban} خطيب بلا آيبان صحيح</b><span>أكمله من «كشوف البنوك المعتمدة» ← سجل الآيبان، ليظهر في الكشف.</span></div>` : ""}
  <div class="panel sr-sheet" id="sr-sheet"><div class="sr-h"><div><b>وزارة الشؤون الإسلامية</b><span>إدارة العلاقات الخارجية، قسم الجاليات ورعاية المهتدين وطلبة البعوث</span></div>
    <h2>كشف مكافآت خطباء الجاليات عن شهر ${MONTHS[m]} ${y}</h2><span class="s">قيمة الخطبة الواحدة: ${SR.rate ? kd(SR.rate) + " د.ك" : "غير محددة"}</span></div>
    <div class="table-wrap"><table class="stbl sr-tbl sr-tbl5"><thead><tr><th>م</th><th>الاسم</th><th>الرقم المدني</th><th>الآيبان</th><th class="c">عدد الخطب</th><th class="c">المبلغ (د.ك)</th></tr></thead><tbody>
    ${R.map((r, i) => `<tr><td class="n">${i + 1}</td><td class="nm">${esc(r.name || "—")}</td><td class="num">${esc(r.pid)}</td><td class="num iban${ibanOk(r.iban) ? "" : " bad-i"}" dir="ltr">${esc(r.iban || "—")}</td><td class="c num"><b>${r.n}</b></td><td class="c num"><b>${SR.rate ? kd(r.sum) : "—"}</b></td></tr>`).join("") || `<tr><td colspan="6" class="empty">لا توجد خطب مسجلة لهذا الشهر، سجّلها من تبويب «تسجيل الخطب»</td></tr>`}
    </tbody><tfoot><tr><td></td><td class="nm">الإجمالي</td><td></td><td></td><td class="c num">${cnt}</td><td class="c num">${SR.rate ? kd(sum) : "—"}</td></tr></tfoot></table></div>
    <div class="sr-sign">${SIGN3.map(s => `<div><span>${s}</span><i></i></div>`).join("")}</div></div>`; };

/* Excel with real formatting (fonts, borders, header colour, merged title, RTL, print setup) */
const XLSX_STYLE = "https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js";
srXls = async function(){ toast("جارٍ تجهيز ملف الإكسل…");
  try { if (!window.XLSX?.__styled) { await loadScript(XLSX_STYLE); window.XLSX.__styled = true; } } catch (_) { return toast("تعذّر تحميل مكتبة الإكسل، أعد المحاولة"); }
  if (!RH.loaded) await rhLoad();
  const [y, m] = srMonth(), R = srRows(srSheet()), cnt = R.reduce((s, r) => s + r.n, 0), sum = R.reduce((s, r) => s + r.sum, 0);
  const F = "Arial", B = { style:"thin", color:{ rgb:"9AA8A1" } }, BOX = { top:B, bottom:B, left:B, right:B };
  const st = (o = {}) => ({ font:{ name:F, sz:12, ...(o.font || {}) }, alignment:{ horizontal:"center", vertical:"center", wrapText:true, readingOrder:2, ...(o.al || {}) }, ...(o.fill ? { fill:{ patternType:"solid", fgColor:{ rgb:o.fill } } } : {}), ...(o.box ? { border:BOX } : {}) });
  const C = (v, s, t) => ({ v, t:t || (typeof v === "number" ? "n" : "s"), s });
  const head = ["م", "الاسم", "الرقم المدني", "الآيبان", "عدد الخطب", "المبلغ (د.ك)"];
  const A = [
    [C("وزارة الشؤون الإسلامية", st({ font:{ bold:true, sz:14 } }))],
    [C("إدارة العلاقات الخارجية، قسم الجاليات ورعاية المهتدين وطلبة البعوث", st({ font:{ sz:12 } }))],
    [C(`كشف مكافآت خطباء الجاليات عن شهر ${MONTHS[m]} ${y}`, st({ font:{ bold:true, sz:16, color:{ rgb:"0F5440" } } }))],
    [C(`قيمة الخطبة الواحدة: ${SR.rate ? kd(SR.rate) + " د.ك" : "غير محددة"}`, st({ font:{ sz:11, color:{ rgb:"5F6B65" } } }))],
    [],
    head.map(h => C(h, st({ font:{ bold:true, color:{ rgb:"FFFFFF" } }, fill:"0F5440", box:true }))),
    ...R.map((r, i) => { const z = i % 2 ? "F4F7F5" : "FFFFFF";
      return [C(i + 1, st({ fill:z, box:true })), C(r.name, st({ fill:z, box:true, al:{ horizontal:"right" } })), C(r.pid, st({ fill:z, box:true })),
        C(r.iban || "", st({ fill:z, box:true, font:{ name:"Consolas", sz:11, ...(ibanOk(r.iban) ? {} : { color:{ rgb:"A63F33" } }) } })),
        C(r.n, st({ fill:z, box:true })), { v:SR.rate ? +r.sum.toFixed(3) : 0, t:"n", z:"#,##0.000", s:st({ fill:z, box:true }) }]; }),
    [C("", st({ fill:"E6EFEA", box:true })), C("الإجمالي", st({ font:{ bold:true }, fill:"E6EFEA", box:true })), C("", st({ fill:"E6EFEA", box:true })), C("", st({ fill:"E6EFEA", box:true })),
      C(cnt, st({ font:{ bold:true }, fill:"E6EFEA", box:true })), { v:SR.rate ? +sum.toFixed(3) : 0, t:"n", z:"#,##0.000", s:st({ font:{ bold:true }, fill:"E6EFEA", box:true }) }],
    [], [],
    [C(SIGN3[0], st({ font:{ bold:true } })), null, C(SIGN3[1], st({ font:{ bold:true } })), null, C(SIGN3[2], st({ font:{ bold:true } })), null],
    [], [C("..........................", st()), null, C("..........................", st()), null, C("..........................", st()), null]];
  const G2 = A.map(r => r.map(c => c === null ? C("", st()) : c)), ws = XLSX.utils.aoa_to_sheet(G2.map(r => r.map(c => c.v)));
  G2.forEach((r, ri) => r.forEach((c, ci) => { ws[XLSX.utils.encode_cell({ r:ri, c:ci })] = c; }));
  const last = 5 + R.length + 1, sg = last + 3;
  ws["!merges"] = [0, 1, 2, 3].map(r => ({ s:{ r, c:0 }, e:{ r, c:5 } })).concat([[0, 1], [2, 3], [4, 5]].flatMap(([a, b]) => [{ s:{ r:sg, c:a }, e:{ r:sg, c:b } }, { s:{ r:sg + 2, c:a }, e:{ r:sg + 2, c:b } }]));
  ws["!cols"] = [{ wch:6 }, { wch:34 }, { wch:16 }, { wch:34 }, { wch:12 }, { wch:15 }];
  ws["!rows"] = [{ hpt:24 }, { hpt:20 }, { hpt:28 }, { hpt:18 }, { hpt:8 }, { hpt:26 }, ...R.map(() => ({ hpt:22 })), { hpt:24 }];
  ws["!views"] = [{ RTL:true }]; ws["!margins"] = { left:.4, right:.4, top:.5, bottom:.5, header:.2, footer:.2 };
  const wb = XLSX.utils.book_new(); wb.Workbook = { Views:[{ RTL:true }] }; XLSX.utils.book_append_sheet(wb, ws, "كشف المكافآت");
  XLSX.writeFile(wb, `كشف مكافآت الخطباء ${MONTHS[m]} ${y}.xlsx`); };
/* the printed html sheet: same columns */
NEWF.splice(1, 0, ["v67-rewards", "nav:rewards", "كشف المكافآت الجديد", "الكشف صار: الاسم، الرقم المدني، الآيبان، عدد الخطب، المبلغ، مع خانات «اعتماد الموظف» و«اعتماد رئيس القسم» و«اعتماد مدير الإدارة»، وتصدير إكسل منسّق.", false, "2026-10-21"]);
