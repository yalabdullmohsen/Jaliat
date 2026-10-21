/* ===== v70: «عاجي ملكي» — approved light theme: ivory, royal green, gold + home hero ===== */
(function(){ if (document.getElementById("kufi-f")) return; const l = document.createElement("link"); l.id = "kufi-f"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@600;700&display=swap"; document.head.appendChild(l); })();
function heroCard(){ if (!S.me) return "";
  const P = (typeof priorities === "function" ? priorities() : []).filter(p => p.w >= 50), N = P.length;
  const hr = +new Date().toLocaleString("en-US", { hour:"numeric", hour12:false, timeZone:"Asia/Kuwait" }), hi = hr < 12 ? "صباح الخير" : "مساء الخير";
  const nm = esc((S.me.name || S.me.username || "").split(" ")[0]);
  const W = typeof myWork === "function" ? myWork() : null, pct = W ? (W.doneN + W.openN ? Math.round(W.doneN / (W.doneN + W.openN) * 100) : 100) : 0, off = Math.round(314 * (1 - pct / 100));
  const ttl = N ? `أهلاً ${nm}، عندك ${N} ${N === 1 ? "أمر يحتاجك" : N === 2 ? "أمران يحتاجانك" : N <= 10 ? "أمور تحتاجك" : "أمراً يحتاجك"} اليوم` : `أهلاً ${nm}، كل شيء تحت السيطرة اليوم`;
  const sub = N ? P.slice(0, 3).map(p => p.t).join("، ") + "." : "لا يوجد ما يحتاج تصرّفك الآن.";
  return `<section class="hx"><div class="hx-t"><small>${hi}</small><h2>${ttl}</h2><p>${esc(sub)}</p><div class="hx-a"><button type="button" class="hx-b" data-hxgo="prio">ابدأ بالأولويات</button><button type="button" class="hx-b o" data-go="weekly">الجدول الأسبوعي</button></div></div>
    <div class="hx-r"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="10"/><circle cx="60" cy="60" r="50" fill="none" stroke="#C9A35A" stroke-width="10" stroke-linecap="round" stroke-dasharray="314" stroke-dashoffset="${off}" transform="rotate(-90 60 60)"/></svg><b class="num">${pct}%</b><span>إنجاز الشهر</span></div></section>`; }
const _vHome70 = vHome;
vHome = function(){ return heroCard() + _vHome70(); };
document.addEventListener("click", ev => { const b = ev.target.closest("[data-hxgo]"); if (!b) return; document.querySelector(".prio")?.scrollIntoView({ behavior:"smooth", block:"start" }); });
NEWF.splice(1, 0, ["v70-theme", "nav:home", "التصميم الجديد «عاجي ملكي»", "ألوان عاجية هادئة مع أخضر ملكي وذهبي، وبطاقة ترحيب في الرئيسية تلخّص ما يحتاجك اليوم ونسبة إنجاز الشهر.", false, "2026-10-21"]);
/* ===== v72: smarter «أولويات اليوم» — IBAN problems and the Friday sermon window are linked in ===== */
S.ibIss = []; S.fwin = null;
async function smartLoad72(){ try { const [a, b] = await Promise.all([sb.from("khatib_bank").select("cid,name,issue").not("issue", "is", null), sb.rpc("sermon_window_now")]);
  S.ibIss = a.data || []; S.fwin = b.data || null; if (S.view === "home") render(); } catch (_) {} }
const _boot9s72 = boot9; boot9 = function(){ _boot9s72(); setTimeout(smartLoad72, 1500); };
const _prio72 = priorities;
priorities = function(){ const P = _prio72();
  if (S.ibIss.length && S.canWrite) P.push({ w:66, k:"warn", t:`${S.ibIss.length} آيبان خطيب عليه ملاحظة قبل صرف المكافآت`, s:S.ibIss.slice(0, 2).map(x => x.name).join(" · "), act:{ go:"rewards", l:"الكشف" } });
  const w = S.fwin; if (w && w.opens) { const t12 = d => new Date(d).toLocaleTimeString("ar-KW-u-nu-latn", { hour:"numeric", minute:"2-digit", hour12:true, timeZone:"Asia/Kuwait" });
    const now = Date.now(), o = +new Date(w.opens), c = +new Date(w.closes), got = (S.srecs || []).filter(r => r.kind !== "lesson" && r.fri === w.fri).length, tot = S.khatibs?.size || 0;
    if (now >= o && now <= c + 3 * 3600e3) P.push({ w:84, k:now <= c ? "gold" : (got < tot ? "warn" : "ok"), t:now <= c ? `تسجيل خطبة الجمعة مفتوح الآن حتى ${t12(c)}` : `وصلت ${got} خطبة من ${tot} مسجد هذه الجمعة`, s:now <= c ? `وصل حتى الآن ${got} تسجيل` : "التسجيل أُغلق بعد الصلاة", act:{ go:"sermrec", l:"التسجيلات" } });
    else if (o - now > 0 && o - now < 36 * 3600e3) P.push({ w:40, k:"", t:`الجمعة: تسجيل الخطب يفتح ${t12(o)} ويُغلق ${t12(c)}`, s:"المنسقون يسجّلون من البوابة وقت الخطبة فقط", act:{ go:"sermrec", l:"التسجيلات" } }); }
  return P.sort((a, b) => b.w - a.w); };
