/* ================= v39: letter follow-up (sent → in follow-up → done) + hall-booking letters on the halls page ================= */
async function wqtSet(id, state){ const note = $("#wqt-n")?.value.trim() || null;
  const { data, error } = await sb.from("wq_track").upsert({ wq_id:id, state, note, by_user:S.me.id, at:new Date().toISOString() }).select().single(); if (error) return writeFail(error);
  S.wqt.set(id, data); toast(state === "done" ? "سُجّل الكتاب منجزاً ✓" : "أُعيد الكتاب لقيد المتابعة"); closeDrawer(); render(); }
const _wqForm39 = wqForm;
wqForm = function(id){ _wqForm39(id); const w = S.wq.find(x => x.id === id); if (!w) return; const reply = wqIndex(), st = wqStage(w, reply), tr = S.wqt.get(id), r = reply.get(id);
  const b = $(".drawer-b"); if (!b) return;
  b.insertAdjacentHTML("afterbegin", `<div class="wqs ${st || ""}"><b>${st === "done" ? "✓ منجز" : st === "follow" ? "⏳ قيد المتابعة" : "كتاب وارد"}</b><span>${wqDir(w) === "out" ? (r ? `وصل الرد ${esc(r.no || "")} بتاريخ ${fmt(wqDate(r))}` : `أُرسل ${fmt(wqDate(w))}، بانتظار رد ${esc(wqClean(w.to_whom).replace(/^مدير\s+/, "") || "الجهة")}`) : esc(wqFrom(w) || "")}${tr?.note ? ` · ملاحظة: ${esc(tr.note)}` : ""}</span>
    ${r ? `<button type="button" class="lnk" data-wq="${esc(r.id)}">فتح الرد</button>` : ""}</div>`);
  if (!S.canWrite) return;
  $(".drawer-f [data-close]")?.insertAdjacentHTML("beforebegin", st === "done" ? `<button class="btn btn-ghost" type="button" data-wqts="follow:${esc(id)}">↺ إرجاع لقيد المتابعة</button>` : `<button class="btn btn-ok" type="button" data-wqts="done:${esc(id)}">✓ تم الإنجاز</button>`);
  if (st !== "done") b.insertAdjacentHTML("beforeend", fld("wqt-n", "ملاحظة المتابعة (اختياري)", `<input class="f" id="wqt-n" placeholder="مثال: تم الاتصال بالإدارة وأفادوا بالموافقة" value="${esc(tr?.note || "")}">`)); };

/* halls page: letters we sent to book halls, with their state */
const WQ_HALL = /حجز|قاعة|قاعه|مسرح|خيمة|خيمه/;
function hallLetters(){ const reply = wqIndex(); return S.wq.filter(w => wqDir(w) === "out" && WQ_HALL.test(w.subj || "") && wqDate(w) >= addDays(TODAY, -150)).sort((a, b) => wqDate(b).localeCompare(wqDate(a))).map(w => ({ w, r:reply.get(w.id), st:wqStage(w, reply) })); }
const _vHalls39 = vHalls;
vHalls = function(){ const h = _vHalls39(); const L = hallLetters(); if (!L.length) return h; const wait = L.filter(x => x.st !== "done");
  const box = `<div class="panel hl-w"><div class="panel-b"><div class="hl-h"><b>📨 كتب حجز القاعات</b><span class="chip ${wait.length ? "warn" : "ok"}">${wait.length ? `${wait.length} بانتظار الرد` : "كلها منجزة ✓"}</span></div>
    <div class="hl-l">${L.slice(0, 8).map(({ w, r, st }) => `<button type="button" class="hl-i" data-wq="${esc(w.id)}"><span class="hl-t"><b>${esc(w.subj)}</b><span class="s">إلى: ${esc(wqClean(w.to_whom).replace(/^مدير\s+/, ""))} · أُرسل ${fmt(wqDate(w))}</span></span><span class="chip ${r ? (wqRes(r) === "ok" ? "ok" : wqRes(r) === "no" ? "bad" : "t1") : st === "done" ? "ok" : "warn"}">${r ? (wqRes(r) === "ok" ? "تمت الموافقة" : wqRes(r) === "no" ? "لم تتم الموافقة" : "وصل الرد") : st === "done" ? "منجز" : `بانتظار الرد · ${Math.max(0, Math.round((dOf(TODAY) - dOf(wqDate(w))) / 864e5))} يوم`}</span></button>`).join("")}</div></div></div>`;
  return box + h; };
const _prio39 = priorities;
priorities = function(){ const P = _prio39(); if (!S.wq?.length) return P; const reply = wqIndex(); const old = S.wq.filter(w => wqDir(w) === "out" && wqIsJal(w) && !reply.has(w.id) && !S.wqt.get(w.id) && wqDate(w) >= addDays(TODAY, -60) && wqDate(w) <= addDays(TODAY, -14));
  if (old.length && S.canWrite) P.push({ w:70, k:"warn", t:`${old.length} كتاب أرسلناه قبل أكثر من أسبوعين ولم يصل رده`, s:"تابعها مع الجهة أو سجّلها منجزة", act:{ go:"watheqa", l:"تابعها" } }); return P.sort((a, b) => b.w - a.w); };
document.addEventListener("click", ev => { const t = ev.target.closest("[data-wqts]"); if (!t) return; const [st, id] = t.dataset.wqts.split(":"); wqtSet(id, st); });
NEWF.splice(1, 0, ["v39-wqt", "nav:watheqa", "متابعة الكتب: مرسلة · قيد المتابعة · منجزة", "كل كتاب نرسله يُتابَع حتى يصل رده ويُبلَّغ المنسق فيصير «منجزاً»، ويمكنك تسجيله منجزاً يدوياً بملاحظة. وكتب حجز القاعات تظهر في صفحة القاعات بحالتها.", false, "2026-10-20"]);

/* ================= v40: sidebar search، type to find any page ================= */
const NAV_KW = { docs:"موافقات وثائق تصاريح", fix:"ناقص بيانات توزيع", rewards:"مكافآت رواتب بنوك ايبان", khatibs:"خطباء جمعة", watheqa:"كتب مراسلات", halls:"قاعات حجز مسرح", renew:"تجديد انتهاء", avail:"تعارض وقت متاح", portal:"بوابة منسقين رابط", whatsapp:"واتساب", decisions:"قرارات تعميم", recs:"توصيات اقتراح", report:"تقرير شهري", stats:"إحصائيات", backups:"نسخ احتياطي", users:"مستخدمين صلاحيات حسابات" };
function navSearchMount(){ const nav = $("#nav"); if (!nav || $("#nav-q")) return;
  nav.insertAdjacentHTML("afterbegin", `<div class="nav-q"><svg><use href="#i-search"/></svg><input id="nav-q" type="search" placeholder="ابحث في القائمة…" autocomplete="off" aria-label="ابحث في القائمة"></div>`); }
function navFilter(q){ const k = nkey(q || ""), nav = $("#nav"); if (!nav) return; nav.classList.toggle("q-on", !!k);
  nav.querySelectorAll("button[data-nav]").forEach(b => { const hit = !k || nkey(b.textContent + " " + (NAV_KW[b.dataset.nav] || "")).includes(k); b.classList.toggle("q-hide", !hit); });
  nav.querySelectorAll(".ng").forEach(g => { const any = [...g.querySelectorAll("button[data-nav]")].some(b => !b.classList.contains("q-hide")); g.classList.toggle("q-hide", !!k && !any); if (k) g.classList.toggle("q-open", any); else g.classList.remove("q-open"); }); }
const _afterRender40 = afterRender;
afterRender = function(v){ _afterRender40(v); navSearchMount(); const i = $("#nav-q"); if (i?.value) navFilter(i.value); };
document.addEventListener("input", ev => { if (ev.target.id === "nav-q") navFilter(ev.target.value); });
document.addEventListener("keydown", ev => { if (ev.target.id !== "nav-q") return;
  if (ev.key === "Escape") { ev.target.value = ""; navFilter(""); ev.target.blur(); }
  if (ev.key === "Enter") { const b = [...document.querySelectorAll("#nav button[data-nav]:not(.q-hide)")].find(x => x.offsetParent); if (b) { b.click(); ev.target.value = ""; navFilter(""); } } });
document.addEventListener("click", ev => { if (ev.target.closest("#nav button[data-nav]") && $("#nav-q")?.value) { $("#nav-q").value = ""; navFilter(""); } });

/* ================= v41: every WhatsApp message is sent from «واتساب القسم» inside «إنجاز» (full page, no going outside) ================= */
S.waPop = null;
function waBack(){ const b = S.waPop?.back; S.waPop = null; document.body.classList.remove("wa-q"); go(b && b !== "whatsapp" ? b : "home"); }
function waInside(phone, text, next, name){ const n = waNum(phone); if (n.length < 10) return toast("لا يوجد رقم هاتف صحيح");
  if (!waEmbedOk() || isTouchDev()) { if (isTouchDev()) return window.open(`https://wa.me/${n}?text=${encodeURIComponent(text)}`, "_blank", "noopener"); toast("ركّب «جسر إنجاز» 2.3 ليُرسل من واتساب داخل النظام، من صفحة «واتساب القسم»"); return window.open(`https://web.whatsapp.com/send?phone=${n}&text=${encodeURIComponent(text)}`, "enjaz-whatsapp"); }
  const back = S.waPop?.back || (S.view !== "whatsapp" ? S.view : "home");
  S.waPop = { next, name, back, n }; if (!$("#drawer").hidden) closeDrawer(); document.body.classList.add("wa-q");
  if (S.view !== "whatsapp") go("whatsapp"); else render();
  const fr = $("#wa-embed iframe"); if (fr) fr.src = `https://web.whatsapp.com/send?phone=${n}&text=${encodeURIComponent(text)}`; }
waOpen = (phone, text) => waInside(phone, text);
waGo = (phone, text, next, name) => waInside(phone, text, next, name);
const _vWhatsApp41 = vWhatsApp;
vWhatsApp = function(){ if (!S.waPop || !waEmbedOk() || S.waCfg.on) return _vWhatsApp41();
  return `<div class="wa-qbar"><span class="wa-qi">📲</span><div><b>الرسالة جاهزة${S.waPop.name ? ` إلى ${esc(S.waPop.name)}` : ""}</b><span>تُفتح المحادثة خلال ثوانٍ، اضغط زر الإرسال ➤ داخل واتساب</span></div>${S.waPop.next ? `<button type="button" class="btn btn-primary" data-wapnext>التالي ›</button>` : ""}<button type="button" class="btn btn-ghost" data-wapback>↩ رجوع</button></div>`; };
const _go41 = go;
go = function(v, ...a){ if (v !== "whatsapp" && S.waPop && !S.waPop._leaving) { S.waPop = null; document.body.classList.remove("wa-q"); } return _go41(v, ...a); };
document.addEventListener("click", ev => { const t = ev.target.closest("[data-wapback],[data-wapnext]"); if (!t) return; if (t.dataset.wapnext !== undefined) { const nx = S.waPop?.next; if (nx) nx(); return; } waBack(); });
