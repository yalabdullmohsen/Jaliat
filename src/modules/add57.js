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
