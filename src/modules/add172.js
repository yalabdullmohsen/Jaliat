/* ================= v172 (JL-CLOCK): ساعة الترويسة بتوقيت الكويت ================= */
/* الساعة والدقيقة (12 ساعة، أرقام لاتينية كبقية المنصة) وسطر صغير للتاريخ الميلادي والهجري إن اتسع المكان.
   تتحدّث عند رأس كل دقيقة (لا مؤقّت كل ثانية)، ولا يُكتب إلا ما تغيّر، والأرقام متساوية العرض فلا تتحرك العناصر. */
const HC_TZ = "Asia/Kuwait";
const HC_T = new Intl.DateTimeFormat("ar-KW-u-nu-latn", { hour:"numeric", minute:"2-digit", hour12:true, timeZone:HC_TZ });
const HC_D = new Intl.DateTimeFormat("ar-EG-u-nu-latn", { weekday:"long", day:"numeric", month:"long", timeZone:HC_TZ });
let HC_H = null; try { HC_H = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn", { day:"numeric", month:"long", timeZone:HC_TZ }); } catch (_) {}
/* «9:41 م» ← ["9:41", "م"]: الرقم والصباح/المساء بعنصرين لتفاوت الحجم */
function hcParts(d){
  const p = HC_T.formatToParts(d), num = p.filter(x => x.type === "hour" || x.type === "minute" || (x.type === "literal" && x.value.includes(":"))).map(x => x.value).join("");
  const ap = (p.find(x => x.type === "dayPeriod")?.value || "").trim();
  return { num, ap, date:HC_D.format(d) + (HC_H ? " · " + HC_H.format(d).replace(/\s?هـ$/, "") : ""), iso:d.toISOString().slice(0, 16) };
}
function hcPaint(){
  const el = document.getElementById("hclock"); if (!el) return;
  const v = hcParts(new Date()), set = (s, t) => { const n = el.querySelector(s); if (n && n.textContent !== t) n.textContent = t; };
  set(".hc-n", v.num); set(".hc-a", v.ap); set(".hc-d", v.date);
  el.querySelector("time")?.setAttribute("datetime", v.iso);
  el.setAttribute("aria-label", `الساعة ${v.num} ${v.ap}، ${v.date}`);
}
function hcMount(){
  const top = document.querySelector("header.top"); if (!top || document.getElementById("hclock")) return;
  const t = document.getElementById("title"); if (!t) return;
  t.insertAdjacentHTML("afterend", `<div class="hclock" id="hclock" role="timer" aria-live="off"><time class="hc-t"><span class="hc-n"></span><span class="hc-a"></span></time><span class="hc-d"></span></div>`);
  hcPaint();
}
let HC_TIMER = 0;
function hcSchedule(){ clearTimeout(HC_TIMER); const ms = 60000 - (Date.now() % 60000) + 50; HC_TIMER = setTimeout(() => { hcPaint(); hcSchedule(); }, ms); }
hcMount(); hcSchedule();
document.addEventListener("visibilitychange", () => { if (!document.hidden) { hcMount(); hcPaint(); hcSchedule(); } });
if (typeof afterRender === "function") { const _afterRender172 = afterRender; afterRender = function(v){ _afterRender172(v); hcMount(); }; }
