/* ================= v29: data completion · renewal letter · monthly PDF · coordinators portal links · admin protection ================= */
Object.assign(TITLES, { fix:"إكمال البيانات", report:"التقرير الشهري", portal:"بوابة إنجاز" });

/* ---------- 1) mosques with the same name always show their area ---------- */
const _derive29 = derive;
derive = function(){ _derive29(); const cnt = {}; for (const m of S.mosques) cnt[m.name] = (cnt[m.name] || 0) + 1;
  for (const e of S.E) if (e.mos && cnt[e.mos.name] > 1 && e.area && !e.mosName.includes("، ")) e.mosName += "، " + e.area; };

/* ---------- 2) «إكمال البيانات» ---------- */
const fixActs = () => S.E.filter(e => !["ملغى", "مكتمل"].includes(e.status)).map(e => ({ e, miss:[!e.mosque && "المسجد", !e.sl && "الوقت", (!e.daily && !e.days.length) && "اليوم", (!e.start || !e.end) && "التاريخ", !e.comm && "الجالية", !e.lect && "المحاضر"].filter(Boolean) })).filter(x => x.miss.length);
const fixComms = () => commNames.filter(c => !S.coords.some(k => k.comm === c && k.phone && k.status !== "سابق"));
const fixCoords = () => S.coords.map((c, i) => ({ c, i })).filter(x => x.c.status !== "سابق" && !x.c.phone);
let fixCount = () => fixActs().filter(x => x.miss.some(m => m !== "المحاضر")).length + fixComms().length + fixCoords().length;
function vFix(){
  const A = fixActs(), C = fixComms(), K = fixCoords(), tab = S.f.fixt || "acts";
  const tabs = [["acts", "أنشطة ناقصة", A.length], ["comms", "جاليات بلا منسق", C.length], ["coords", "منسقون بلا رقم", K.length]];
  return `<div class="fx"><div class="fx-head"><b>إكمال البيانات</b><span>كل نقص يمنع كشف التعارضات أو التذكير، اضغط أي سطر وأكمله.</span></div>
    <div class="rn-seg fx-tabs">${tabs.map(([k, l, n]) => `<button type="button" class="${tab === k ? "on" : ""}" data-fixt="${k}">${l} <span class="num">${n}</span></button>`).join("")}</div>
    <div class="fx-l">${tab === "acts" ? (A.map(({ e, miss }) => `<button type="button" class="fx-i" data-prio-open="act:${e.id}"><span class="fx-n">#${e.n}</span><span class="fx-t"><b>${esc(e.type || "نشاط")} · ${esc(e.comm || "—")}</b><span>${esc(e.mosName || "—")} · ${esc(e.time || "—")}</span></span><span class="fx-m">${miss.map(m => `<i>${m}</i>`).join("")}</span></button>`).join("") || `<div class="fx-ok">✓ كل الأنشطة مكتملة</div>`)
      : tab === "comms" ? (C.map(c => `<button type="button" class="fx-i" data-go="coords"><span class="fx-n">!</span><span class="fx-t"><b>${esc(c)}</b><span>لا يوجد منسق برقم هاتف، أضفه من «المنسقون»</span></span><span class="fx-m"><i>المنسق</i></span></button>`).join("") || `<div class="fx-ok">✓ كل الجاليات لها منسق</div>`)
      : (K.map(({ c, i }) => `<button type="button" class="fx-i" data-fixco="${i}"><span class="fx-n">☎</span><span class="fx-t"><b>${esc(c.name)}</b><span>${esc(c.comm || "")} · ${esc(c.role || "")}</span></span><span class="fx-m"><i>رقم الهاتف</i></span></button>`).join("") || `<div class="fx-ok">✓ كل المنسقين لهم أرقام</div>`)}</div></div>`;
}


/* ---------- 4) renewal letter (Watheqa format) from «تذكير التجديد» ---------- */
const _letterData29 = letterData;
letterData = function(src){ if (String(src).startsWith("renew:")) { const no = src.slice(6), d = S.docs.find(x => x.no === no); if (!d) return null;
  const acts = S.E.filter(e => e.doc === no && !["ملغى", "مكتمل"].includes(e.status)); const co = S.coords.find(c => c.comm === d.comm && c.status !== "سابق");
  const start = addDays(d.end, 1); return { comm:d.comm, coord:co?.name || "", org:"", start, end:addMonths(start, 6), renew:no, acts:acts.map(e => ({ ...S.acts.get(e.id), mosque:e.mosque, gov:e.gov })) }; }
  return _letterData29(src); };

/* ---------- 5) monthly report → PDF ---------- */
S.repMonth = S.repMonth || addMonths(TODAY.slice(0, 7) + "-01", -1).slice(0, 7);
function vReport(){
  const months = Array.from({ length:12 }, (_, i) => addMonths(TODAY.slice(0, 7) + "-01", -i).slice(0, 7));
  const MN = ym => ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"][+ym.slice(5) - 1] + " " + ym.slice(0, 4);
  return `<div class="rp"><div class="rp-bar"><select class="f" id="rp-m">${months.map(m => `<option value="${m}"${m === S.repMonth ? " selected" : ""}>${MN(m)}</option>`).join("")}</select>
    <button type="button" class="btn btn-primary" data-rppdf>طباعة / حفظ PDF</button><button type="button" class="btn" data-rpword>${icon("i-doc")} نسخة Word</button></div>
    <iframe class="rp-frame" id="rp-frame" title="التقرير الشهري"></iframe></div>`;
}
function rpFill(){ const f = $("#rp-frame"); if (f) f.srcdoc = reportHTML(S.repMonth).replace("<\/head>", "<style>body{max-width:820px;margin:24px auto;padding:0 24px;background:#fff}@media print{body{margin:0}}<\/style><\/head>"); }
function rpPrint(){ const f = $("#rp-frame"); try { f.contentWindow.focus(); f.contentWindow.print(); } catch (_) { const w = window.open("", "_blank"); w.document.write(reportHTML(S.repMonth)); w.document.close(); setTimeout(() => w.print(), 400); } }

/* ---------- 6) coordinators portal links ---------- */
S.portal = [];
async function loadPortal(){ const { data } = await sb.from("coord_links").select("*"); S.portal = data || []; }
const portalURL = comm => { const l = S.portal.find(x => x.comm === comm && x.active); return l ? `${location.origin}${location.pathname.replace(/[^/]*$/, "")}portal.html` : ""; };
function vPortal(){
  return `<div class="check"><b>بوابة إنجاز</b><span>لكل جالية رابط خاص. أرسله للمنسق، فيقدّم طلب درس جديد أو تجديد بنفسه من جواله، ويصلكم مرتباً في «الطلبات الواردة» برقم ط-.</span></div>
    <div class="pt-l">${commNames.map(c => { const u = portalURL(c), co = S.coords.find(k => k.comm === c && k.phone && k.status !== "سابق");
      return `<div class="pt-i"><div><b>${esc(c)}</b><span>${co ? esc(co.name) + " · " + esc(co.phone) : "لا يوجد منسق برقم"}</span></div>
        <div class="pt-a">${u ? `<button type="button" class="btn btn-primary" data-ptopen="${esc(c)}">فتح بوابتهم</button><button type="button" class="btn" data-ptcopy="${esc(c)}">نسخ الرابط</button>${co ? `<button type="button" class="btn rn-send" data-ptwa="${esc(c)}">${icon("i-wa")} إرسال للمنسق</button>` : ""}` : `<span class="s">—</span>`}</div></div>`; }).join("")}</div>`;
}
const portalMsg = (c, co) => `السلام عليكم ورحمة الله وبركاته\n${co ? `الأخ الفاضل / ${co.name}` : `منسق الجالية ${c}`}\n\nيسرّنا أن نرسل لكم رابط بوابة إنجاز، ومن خلالها تقدّمون طلبات الدروس الجديدة والتجديد والتعديل والإيقاف، وتتابعون طلباتكم وردود القسم، وترسلون التقرير الشهري، وتضيفون نائبكم:\n${portalURL(c)}\n\nأول مرة: اختاروا «طلب حساب جديد» وأدخلوا بيانات المنسق ونائب المنسق، ويعتمده القسم ثم تدخلون برقمكم المدني والرمز السري.\nللاستفسار واتساب: 97512995\n\nوجزاكم الله خيراً${SIGN}`;
// renewal reminders now carry the portal link so the coordinator can renew in one tap
const _renewMsg29 = renewMsg;
renewMsg = function(x, c){ const m = _renewMsg29(x, c), u = portalURL(x.comm); return u ? m.replace(/\n\nوجزاكم الله خيراً/, `\n\nلتقديم طلب التجديد مباشرة:\n${u}\n\nوجزاكم الله خيراً`) : m; };
const _vRenew29 = vRenew;
vRenew = function(){ return _vRenew29().replace(/<button type="button" class="btn btn-ghost" data-rncopy="([^"]+)" data-rni="0">نسخ<\/button>/g, (m, no) => m + `<button type="button" class="btn btn-ghost" data-letter="renew:${no}">${icon("i-doc")} كتاب التجديد</button>`); };


/* ---------- wiring ---------- */
const _openLink29 = openLink;
openLink = function(h){ const s = String(h || "").replace(/^#/, ""); if (["report", "fix", "portal", "renew", "avail", "permits"].includes(s)) return go(s); return _openLink29(h); };
const _afterRender29 = afterRender;
afterRender = function(v){ _afterRender29(v); if (S.view === "report") rpFill(); const b = $('#nav [data-nav="fix"]'); if (b) { let s = b.querySelector(".nb"); if (!s) { s = document.createElement("span"); s.className = "nb"; b.appendChild(s); } const n = fixCount(); s.textContent = n || ""; s.hidden = !n; } };
const _boot9v29 = boot9;
boot9 = function(){ _boot9v29(); Promise.all([loadPortal()]).then(() => { if (["portal", "renew"].includes(S.view) && $("#drawer").hidden) render(); }); };
const _prio29 = priorities;
priorities = function(){ return _prio29().map(p => /بياناته ناقصة/.test(p.t) ? { ...p, act:{ go:"fix", l:"إكمالها" } } : p); };
const _palAll29 = palAll;
palAll = function(){ const A = _palAll29(); A.unshift({ g:"إجراءات", t:"التقرير الشهري (PDF)", s:"", ic:"i-doc", run:() => go("report"), txt:"تقرير شهري pdf الإدارة" }, { g:"إجراءات", t:"إكمال البيانات الناقصة", s:"", ic:"i-list", run:() => go("fix"), txt:"ناقص إكمال بيانات" }, { g:"إجراءات", t:"بوابة إنجاز (روابط الجاليات)", s:"", ic:"i-link", run:() => go("portal"), txt:"بوابة منسق رابط طلب" }); return A; };
NEWF.splice(1, 0, ["v29-fix", "nav:fix", "إكمال البيانات", "كل نشاط أو جالية أو منسق بياناته ناقصة في مكان واحد، اضغط وأكمل.", false, "2026-10-20"],
  ["v29-report", "nav:report", "التقرير الشهري PDF", "تقرير رسمي لكل شهر جاهز للطباعة أو الحفظ PDF، ويصل إشعار للمدراء أول كل شهر.", false, "2026-10-20"],
  ["v29-portal", "nav:portal", "بوابة إنجاز", "رابط خاص لكل جالية يرسله المنسق منه طلب درس جديد أو تجديد، ويصل مرتباً للطلبات الواردة.", false, "2026-10-20"]);
document.addEventListener("change", ev => { if (ev.target.id === "rp-m") { S.repMonth = ev.target.value; rpFill(); } });
document.addEventListener("click", async ev => { const t = ev.target.closest("button"); if (!t) return; const D = t.dataset;
  if (D.fixt) { S.f.fixt = D.fixt; return render(); }
  if (D.fixco !== undefined) return listForm("co", +D.fixco);
  if (D.rppdf !== undefined) return rpPrint();
  if (D.rpword !== undefined) return reportDownload(S.repMonth);
  if (D.ptcopy) { const ok = await cpCopy(portalURL(D.ptcopy)); return toast(ok ? "نُسخ رابط البوابة" : "تعذّر النسخ"); }
  if (D.ptwa) { const co = S.coords.find(k => k.comm === D.ptwa && k.phone && k.status !== "سابق"); return waOpen(co?.phone || "", portalMsg(D.ptwa, co)); }
});
document.addEventListener("change", ev => { if (ev.target.id === "vs-photo") { const l = $("#vs-photo-l"); if (l) l.textContent = ev.target.files?.[0] ? "📷 أُرفقت الصورة ✓" : "📷 التقط صورة"; } });
/* sidebar: collapsible groups (remembered), the current page's group always open */
function ngApply(){ let st = {}; try { st = JSON.parse(localStorage.getItem("ng") || "{}"); } catch (_) {}
  document.querySelectorAll("#nav .ng").forEach(g => { const cur = g.querySelector('[aria-current="page"]'); const cl = !cur && (st[g.dataset.g] === undefined ? true : !!st[g.dataset.g]); g.classList.toggle("cl", cl); g.querySelector(".sep")?.setAttribute("aria-expanded", String(!cl));
    const sp = g.querySelector(".sep"); if (sp) { const n = [...g.querySelectorAll(".ng-b .nb")].reduce((a, b) => a + (parseInt(b.textContent) || 0), 0); let d = sp.querySelector(".ng-n"); if (!d) { d = document.createElement("i"); d.className = "ng-n"; sp.appendChild(d); } d.textContent = n || ""; d.hidden = !n || !cl; } }); }
document.addEventListener("click", ev => { const b = ev.target.closest("#nav [data-ng]"); if (!b) return; ev.stopPropagation(); const g = b.closest(".ng"); const cl = !g.classList.contains("cl");
  g.classList.toggle("cl", cl); b.setAttribute("aria-expanded", String(!cl)); let st = {}; try { st = JSON.parse(localStorage.getItem("ng") || "{}"); } catch (_) {} st[g.dataset.g] = cl;
  // accordion: opening a group folds the others (except the one holding the open page) so the list stays short
  if (!cl) document.querySelectorAll("#nav .ng").forEach(o => { if (o !== g && !o.querySelector('[aria-current="page"]')) { o.classList.add("cl"); o.querySelector(".sep")?.setAttribute("aria-expanded", "false"); st[o.dataset.g] = true; } });
  try { localStorage.setItem("ng", JSON.stringify(st)); } catch (_) {} ngApply(); }, true);
const _afterRender29ng = afterRender;
afterRender = function(v){ _afterRender29ng(v); ngApply(); };
