/* ================= v29: data completion · field visits · renewal letter · monthly PDF · coordinators portal links · admin protection ================= */
Object.assign(TITLES, { fix:"إكمال البيانات", visits:"الزيارات الميدانية", report:"التقرير الشهري", portal:"بوابة المنسقين" });

/* ---------- 1) mosques with the same name always show their area ---------- */
const _derive29 = derive;
derive = function(){ _derive29(); const cnt = {}; for (const m of S.mosques) cnt[m.name] = (cnt[m.name] || 0) + 1;
  for (const e of S.E) if (e.mos && cnt[e.mos.name] > 1 && e.area && !e.mosName.includes(" — ")) e.mosName += " — " + e.area; };

/* ---------- 2) «إكمال البيانات» ---------- */
const fixActs = () => S.E.filter(e => !["ملغى", "مكتمل"].includes(e.status)).map(e => ({ e, miss:[!e.mosque && "المسجد", !e.sl && "الوقت", (!e.daily && !e.days.length) && "اليوم", (!e.start || !e.end) && "التاريخ", !e.comm && "الجالية", !e.lect && "المحاضر"].filter(Boolean) })).filter(x => x.miss.length);
const fixComms = () => commNames.filter(c => !S.coords.some(k => k.comm === c && k.phone && k.status !== "سابق"));
const fixCoords = () => S.coords.map((c, i) => ({ c, i })).filter(x => x.c.status !== "سابق" && !x.c.phone);
let fixCount = () => fixActs().filter(x => x.miss.some(m => m !== "المحاضر")).length + fixComms().length + fixCoords().length;
function vFix(){
  const A = fixActs(), C = fixComms(), K = fixCoords(), tab = S.f.fixt || "acts";
  const tabs = [["acts", "أنشطة ناقصة", A.length], ["comms", "جاليات بلا منسق", C.length], ["coords", "منسقون بلا رقم", K.length]];
  return `<div class="fx"><div class="fx-head"><b>إكمال البيانات</b><span>كل نقص يمنع كشف التعارضات أو التذكير — اضغط أي سطر وأكمله.</span></div>
    <div class="rn-seg fx-tabs">${tabs.map(([k, l, n]) => `<button type="button" class="${tab === k ? "on" : ""}" data-fixt="${k}">${l} <span class="num">${n}</span></button>`).join("")}</div>
    <div class="fx-l">${tab === "acts" ? (A.map(({ e, miss }) => `<button type="button" class="fx-i" data-prio-open="act:${e.id}"><span class="fx-n">#${e.n}</span><span class="fx-t"><b>${esc(e.type || "نشاط")} · ${esc(e.comm || "—")}</b><span>${esc(e.mosName || "—")} · ${esc(e.time || "—")}</span></span><span class="fx-m">${miss.map(m => `<i>${m}</i>`).join("")}</span></button>`).join("") || `<div class="fx-ok">✓ كل الأنشطة مكتملة</div>`)
      : tab === "comms" ? (C.map(c => `<button type="button" class="fx-i" data-go="coords"><span class="fx-n">!</span><span class="fx-t"><b>${esc(c)}</b><span>لا يوجد منسق برقم هاتف — أضفه من «المنسقون»</span></span><span class="fx-m"><i>المنسق</i></span></button>`).join("") || `<div class="fx-ok">✓ كل الجاليات لها منسق</div>`)
      : (K.map(({ c, i }) => `<button type="button" class="fx-i" data-fixco="${i}"><span class="fx-n">☎</span><span class="fx-t"><b>${esc(c.name)}</b><span>${esc(c.comm || "")} · ${esc(c.role || "")}</span></span><span class="fx-m"><i>رقم الهاتف</i></span></button>`).join("") || `<div class="fx-ok">✓ كل المنسقين لهم أرقام</div>`)}</div></div>`;
}

/* ---------- 3) field visits ---------- */
S.visits = [];
async function loadVisits(){ const { data } = await sb.from("visits").select("*").order("at", { ascending:false }).limit(1000); S.visits = data || []; }
function visitForm(actId){
  const e = S.byId.get(actId); if (!e) return; S.form = { kind:"visit", act:actId, lat:null, lng:null };
  openDrawer("تسجيل زيارة ميدانية", `<div class="q-meta"><b>#${e.n} · ${esc(e.type || "")} · ${esc(e.comm || "")}</b><span class="s">${esc(e.mosName || "")} · ${esc(daysText(e))} ${esc(e.time || "")}</span></div>
    <div class="vs-seg" id="vs-held">${["قائم", "متأخر", "لم يُقم"].map((h, i) => `<button type="button" class="${i === 0 ? "on" : ""}" data-vsheld="${h}">${h === "قائم" ? "✓ النشاط قائم" : h === "متأخر" ? "⏱ بدأ متأخراً" : "✕ لم يُقم"}</button>`).join("")}</div>
    ${fld("vs-count", "عدد الحضور (تقريبي)", `<input class="f" id="vs-count" type="number" inputmode="numeric" min="0">`)}
    ${fld("vs-photo", "صورة من الموقع", `<label class="vs-cam"><input type="file" id="vs-photo" accept="image/*" capture="environment"><span id="vs-photo-l">📷 التقط صورة</span></label>`)}
    ${fld("vs-note", "ملاحظات", `<textarea class="f" id="vs-note" rows="2" placeholder="مثال: المحاضر حاضر، الحضور جيد"></textarea>`)}
    <span class="hint" id="vs-loc">📍 جارٍ تحديد الموقع…</span>`,
    `<button class="btn btn-primary" data-vssave>حفظ الزيارة</button><button class="btn btn-ghost" data-close>إلغاء</button>`);
  S.form.held = "قائم";
  navigator.geolocation?.getCurrentPosition(p => { if (S.form?.kind !== "visit") return; S.form.lat = p.coords.latitude; S.form.lng = p.coords.longitude; const l = $("#vs-loc"); if (l) l.textContent = "📍 تم تحديد الموقع ✓"; },
    () => { const l = $("#vs-loc"); if (l) l.textContent = "📍 لم يُحدَّد الموقع (اسمح بالموقع للمتصفح)"; }, { enableHighAccuracy:true, timeout:10000 });
}
async function visitSave(btn){
  const F = S.form; if (F?.kind !== "visit") return; btn.disabled = true; btn.textContent = "جارٍ الحفظ…";
  let photo = ""; const f = $("#vs-photo")?.files?.[0];
  if (f) { try { const { blob } = await compressImg(f, 1400, .82); const p = `visits/${crypto.randomUUID()}.jpg`; const up = await sb.storage.from("requests").upload(p, blob, { contentType:"image/jpeg" }); if (!up.error) photo = p; } catch (_) {} }
  const row = { act_id:F.act, held:F.held, count:+$("#vs-count").value || null, note:$("#vs-note").value.trim(), lat:F.lat, lng:F.lng, photo, user_id:S.me.id };
  const { data, error } = await sb.from("visits").insert(row).select().single(); btn.disabled = false; btn.textContent = "حفظ الزيارة";
  if (error) return writeFail(error); S.visits = [data, ...S.visits]; closeDrawer(); toast("سُجّلت الزيارة ✓"); if (S.view === "visits") render();
}
function vVisits(){
  const q = nkey(S.f.vsq || ""), L = S.visits.filter(v => { const e = S.byId.get(v.act_id); return !q || nkey([e?.comm, e?.mosName, pname(v.user_id), v.note].join(" ")).includes(q); });
  const wk = S.visits.filter(v => v.at.slice(0, 10) >= addDays(TODAY, -7)).length, notHeld = S.visits.filter(v => v.held === "لم يُقم").length;
  return `<div class="toolbar"><div class="search"><svg><use href="#i-search"/></svg><input class="f" id="vsq" data-fk="vsq" placeholder="ابحث بالجالية أو المسجد أو الموظف…" value="${esc(S.f.vsq || "")}"></div><span class="count">${wk} زيارة هذا الأسبوع · ${notHeld} لم يُقم</span></div>
    <div class="check"><b>كيف تسجّل زيارة؟</b><span>افتح أي نشاط واضغط «زيارة ميدانية» — من الجوال تلتقط صورة ويُسجَّل موقعك تلقائياً.</span></div>
    <div class="vs-l">${L.map(v => { const e = S.byId.get(v.act_id); const c = v.held === "قائم" ? "ok" : v.held === "متأخر" ? "warn" : "bad";
      return `<div class="vs-i"><span class="chip ${c}">${esc(v.held)}</span><button type="button" class="vs-t" data-prio-open="act:${esc(v.act_id)}"><b>${e ? `#${e.n} · ${esc(e.comm || "")}` : "نشاط محذوف"}</b><span>${esc(e?.mosName || "")} · ${esc(pname(v.user_id))} · ${new Date(v.at).toLocaleString("ar-KW-u-nu-latn", { dateStyle:"medium", timeStyle:"short", hour12:true })}${v.count ? ` · ${v.count} حاضر` : ""}</span>${v.note ? `<span class="vs-n">${esc(v.note)}</span>` : ""}</button>
        <span class="vs-a">${v.photo ? `<button type="button" class="btn btn-ghost" data-vsphoto="${esc(v.photo)}">📷 الصورة</button>` : ""}${v.lat ? `<a class="btn btn-ghost" href="https://maps.google.com/?q=${v.lat},${v.lng}" target="_blank" rel="noopener">📍 الموقع</a>` : ""}</span></div>`; }).join("") || `<div class="empty">لا توجد زيارات بعد</div>`}</div>`;
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
  return `<div class="check"><b>بوابة المنسقين</b><span>لكل جالية رابط خاص. أرسله للمنسق، فيقدّم طلب درس جديد أو تجديد بنفسه من جواله، ويصلكم مرتباً في «الطلبات الواردة» برقم ط-.</span></div>
    <div class="pt-l">${commNames.map(c => { const u = portalURL(c), co = S.coords.find(k => k.comm === c && k.phone && k.status !== "سابق");
      return `<div class="pt-i"><div><b>${esc(c)}</b><span>${co ? esc(co.name) + " · " + esc(co.phone) : "لا يوجد منسق برقم"}</span></div>
        <div class="pt-a">${u ? `<button type="button" class="btn btn-primary" data-ptopen="${esc(c)}">فتح بوابتهم</button><button type="button" class="btn" data-ptcopy="${esc(c)}">نسخ الرابط</button>${co ? `<button type="button" class="btn rn-send" data-ptwa="${esc(c)}">${icon("i-wa")} إرسال للمنسق</button>` : ""}` : `<span class="s">—</span>`}</div></div>`; }).join("")}</div>`;
}
const portalMsg = (c, co) => `السلام عليكم ورحمة الله وبركاته\n${co ? `الأخ الفاضل / ${co.name}` : `منسق الجالية ${c}`}\n\nيسرّنا أن نرسل لكم رابط بوابة المنسقين، ومن خلالها تقدّمون طلبات الدروس الجديدة والتجديد والتعديل والإيقاف، وتتابعون طلباتكم وردود القسم، وترسلون التقرير الشهري، وتضيفون نائبكم:\n${portalURL(c)}\n\nأول مرة: اختاروا «طلب حساب جديد» وأدخلوا بيانات المنسق ونائب المنسق، ويعتمده القسم ثم تدخلون برقمكم المدني والرمز السري.\nللاستفسار واتساب: 97512995\n\nوجزاكم الله خيراً${SIGN}`;
// renewal reminders now carry the portal link so the coordinator can renew in one tap
const _renewMsg29 = renewMsg;
renewMsg = function(x, c){ const m = _renewMsg29(x, c), u = portalURL(x.comm); return u ? m.replace(/\n\nوجزاكم الله خيراً/, `\n\nلتقديم طلب التجديد مباشرة:\n${u}\n\nوجزاكم الله خيراً`) : m; };
const _vRenew29 = vRenew;
vRenew = function(){ return _vRenew29().replace(/<button type="button" class="btn btn-ghost" data-rncopy="([^"]+)" data-rni="0">نسخ<\/button>/g, (m, no) => m + `<button type="button" class="btn btn-ghost" data-letter="renew:${no}">${icon("i-doc")} كتاب التجديد</button>`); };

/* ---------- 7) admin protection: re-enter the password before sensitive actions; auto sign-out when idle ---------- */
S.authAt = Date.now();
const SENSITIVE = '[data-delok],[data-pissue],[data-pgsave],[data-arok],[data-arno],[data-prevoke],[data-pgrevoke],[data-wasave],[data-pasave],[data-bkrestore]';
function reauth(then){
  $("#ra-box")?.remove(); const b = document.createElement("div"); b.id = "ra-box"; b.className = "ra";
  b.innerHTML = `<form class="ra-c" id="ra-form"><b>تأكيد الهوية</b><span>هذه عملية حساسة — اكتب كلمة المرور للمتابعة.</span><input class="f" id="ra-p" type="password" dir="ltr" autocomplete="current-password" placeholder="كلمة المرور"><p class="err" id="ra-e" hidden></p><div class="br-acts"><button class="btn btn-primary" type="submit">تأكيد</button><button class="btn btn-ghost" type="button" data-racancel>إلغاء</button></div></form>`;
  document.body.appendChild(b); setTimeout(() => $("#ra-p")?.focus(), 30);
  $("#ra-form").addEventListener("submit", async ev => { ev.preventDefault(); const p = $("#ra-p").value; if (!p) return;
    const { error } = await sb.auth.signInWithPassword({ email:`${S.me.username}@${DOMAIN}`, password:p });
    if (error) { const e = $("#ra-e"); e.textContent = "كلمة المرور غير صحيحة"; e.hidden = false; return; }
    S.authAt = Date.now(); b.remove(); then(); });
}
document.addEventListener("click", ev => {
  if (ev.target.closest("[data-racancel]")) return $("#ra-box")?.remove();
  const t = ev.target.closest(SENSITIVE) || (ev.target.closest("[data-save]") && S.form?.kind === "user" ? ev.target.closest("[data-save]") : null);
  if (!t || !S.admin || Date.now() - S.authAt < 10 * 60e3) return;
  ev.preventDefault(); ev.stopImmediatePropagation(); reauth(() => t.click());
}, true);
let idleT = null; const IDLE = 30 * 60e3;
function idleReset(){ S.lastAct = Date.now(); }
["pointerdown", "keydown", "touchstart", "scroll"].forEach(e => document.addEventListener(e, idleReset, { passive:true, capture:true }));
setInterval(() => { if (!S.me || !S.lastAct) return; if (Date.now() - S.lastAct > IDLE) { S.lastAct = 0; if (typeof lockApp === "function") lockApp(); } }, 60e3);

/* ---------- wiring ---------- */
const _openLink29 = openLink;
openLink = function(h){ const s = String(h || "").replace(/^#/, ""); if (["report", "visits", "fix", "portal", "renew", "avail", "permits"].includes(s)) return go(s); return _openLink29(h); };
const _actForm29 = actForm;
actForm = function(id, preset){ _actForm29(id, preset); const e = id && S.byId.get(id); if (!e || S.form?.kind !== "act") return;
  $(".drawer-f [data-close]")?.insertAdjacentHTML("beforebegin", `<button class="btn btn-ghost" type="button" data-vsnew="${esc(id)}">📍 زيارة ميدانية</button>`);
  const V = S.visits.filter(v => v.act_id === id).slice(0, 3);
  if (V.length) $("#drawer .drawer-b")?.insertAdjacentHTML("beforeend", lkPanel("الزيارات الميدانية", V.map(v => lkRow("i-users", `${v.held} — ${pname(v.user_id)}`, `${new Date(v.at).toLocaleDateString("ar-KW-u-nu-latn")}${v.note ? " · " + v.note : ""}`, "go:visits")))); };
const _afterRender29 = afterRender;
afterRender = function(v){ _afterRender29(v); if (S.view === "report") rpFill(); const b = $('#nav [data-nav="fix"]'); if (b) { let s = b.querySelector(".nb"); if (!s) { s = document.createElement("span"); s.className = "nb"; b.appendChild(s); } const n = fixCount(); s.textContent = n || ""; s.hidden = !n; } };
const _boot9v29 = boot9;
boot9 = function(){ _boot9v29(); idleReset(); Promise.all([loadVisits(), loadPortal()]).then(() => { if (["visits", "portal", "renew"].includes(S.view) && $("#drawer").hidden) render(); }); };
const _prio29 = priorities;
priorities = function(){ return _prio29().map(p => /بياناته ناقصة/.test(p.t) ? { ...p, act:{ go:"fix", l:"إكمالها" } } : p); };
const _palAll29 = palAll;
palAll = function(){ const A = _palAll29(); A.unshift({ g:"إجراءات", t:"التقرير الشهري (PDF)", s:"", ic:"i-doc", run:() => go("report"), txt:"تقرير شهري pdf الإدارة" }, { g:"إجراءات", t:"إكمال البيانات الناقصة", s:"", ic:"i-list", run:() => go("fix"), txt:"ناقص إكمال بيانات" }, { g:"إجراءات", t:"بوابة المنسقين (روابط الجاليات)", s:"", ic:"i-link", run:() => go("portal"), txt:"بوابة منسق رابط طلب" }); return A; };
NEWF.splice(1, 0, ["v29-fix", "nav:fix", "إكمال البيانات", "كل نشاط أو جالية أو منسق بياناته ناقصة في مكان واحد — اضغط وأكمل.", false, "2026-10-20"],
  ["v29-visits", "nav:visits", "الزيارات الميدانية", "سجّل زيارتك لأي نشاط من جوالك مع صورة وموقع — من زر «زيارة ميدانية» داخل النشاط.", false, "2026-10-20"],
  ["v29-report", "nav:report", "التقرير الشهري PDF", "تقرير رسمي لكل شهر جاهز للطباعة أو الحفظ PDF، ويصل إشعار للمدراء أول كل شهر.", false, "2026-10-20"],
  ["v29-portal", "nav:portal", "بوابة المنسقين", "رابط خاص لكل جالية يرسله المنسق منه طلب درس جديد أو تجديد، ويصل مرتباً للطلبات الواردة.", false, "2026-10-20"]);
document.addEventListener("change", ev => { if (ev.target.id === "rp-m") { S.repMonth = ev.target.value; rpFill(); } });
document.addEventListener("click", async ev => { const t = ev.target.closest("button"); if (!t) return; const D = t.dataset;
  if (D.fixt) { S.f.fixt = D.fixt; return render(); }
  if (D.fixco !== undefined) return listForm("co", +D.fixco);
  if (D.vsnew) { const id = D.vsnew; closeDrawer(); return visitForm(id); }
  if (D.vsheld) { S.form.held = D.vsheld; document.querySelectorAll("#vs-held button").forEach(b => b.classList.toggle("on", b === t)); return; }
  if (D.vssave !== undefined) return visitSave(t);
  if (D.vsphoto) { const { data } = await sb.storage.from("requests").createSignedUrl(D.vsphoto, 3600); if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener"); return; }
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
