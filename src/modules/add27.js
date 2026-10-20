/* ================= v27: «هل الوقت متاح؟»، instant availability check for any date / time / mosque / lecturer ================= */
Object.assign(TITLES, { avail:"هل الوقت متاح؟" });
S.av = { date:TODAY, time:"بعد صلاة المغرب", from:"", to:"", mos:"", lect:"", comm:"", weeks:"1" }; // a single date، no repetition
const AV_SLOTS = [...SLOTS.filter(s => s !== "بين المغرب والعشاء"), "وقت محدد…"];
const mmToT = m => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
const avSlot = () => S.av.time === "وقت محدد…" ? (S.av.from && S.av.to ? (() => { const [a, b] = [S.av.from, S.av.to].map(t => +t.slice(0, 2) * 60 + +t.slice(3, 5)); return b > a ? [a, b] : null; })() : null) : slot(S.av.time);
const mosLabel = m => `مسجد ${m.name}${m.area ? "، " + m.area : ""}`;
const avMosAll = () => { const q = nkey(S.av.mos); if (!q) return []; const ex = S.mosques.filter(m => nkey(mosLabel(m)) === q); if (ex.length) return ex;
  const nm = q.replace(/^مسجد\s*/, ""); const same = S.mosques.filter(m => nkey(m.name) === nm || nkey("مسجد " + m.name) === q); return same.length ? same : S.mosques.filter(m => nkey(m.name).includes(nm)).slice(0, 12); };
const avMos = () => (S.av.mosId && S.mosques.find(m => m.id === S.av.mosId)) || avMosAll()[0] || null;
function avCheck(){
  const sl = avSlot(), m = avMos(), d = S.av.date || TODAY, wd = dOf(d).getDay(), end = addDays(d, (+S.av.weeks - 1) * 7);
  const names = lectNames(S.av.lect);
  const cand = { live:true, start:d, end, days:[wd], sl, mosque:m?.id || "", names, id:"__cand" };
  const out = { sl, m, d, wd, end, mos:[], lect:[], same:[], warn:[], book:[] };
  if (!sl) return out;
  for (const e of S.E) {
    if (!e.live || !e.sl || !e.days.includes(wd) || e.start > end || e.end < d) continue;
    if (!(e.sl[0] < sl[1] && sl[0] < e.sl[1])) continue;
    out.same.push(e);
    if (m && e.mosque === m.id) out.mos.push(e);
    else if (names.length && e.names.length && sameLect(names, e.names)) out.lect.push(e);
  }
  if (sl[0] >= 1140 && /العشاء/.test(S.av.time + "")) out.warn.push("الدروس بعد صلاة العشاء ممنوعة بحسب تعميم الوزارة.");
  if (wd === 5 && sl[0] < 840 && sl[1] > 690) out.warn.push("يتزامن مع وقت صلاة وخطبة الجمعة.");
  if (m && wd === 5) { const kh = [...S.khatibs.values()].find(k => nkey(k.mosque || "") && nkey(m.name).includes(nkey(k.mosque))); if (kh && sl[0] < 840 && sl[1] > 690) out.warn.push(`المسجد فيه خطبة جمعة بلغة ${kh.label || kh.comm || "أخرى"}.`); }
  if (d < TODAY) out.warn.push("التاريخ المختار في الماضي.");
  const all = avMosAll(); if (all.length > 1) out.warn.push(`يوجد ${all.length} مساجد بهذا الاسم (${all.map(x => x.area || x.gov).filter(Boolean).slice(0, 4).join("، ")})، اختر المسجد مع المنطقة من القائمة.`);
  if (S.av.comm) { const docs = S.docs.filter(x => x.comm === S.av.comm && x.start <= d && x.end >= end); if (!docs.length) out.warn.push(`لا توجد موافقة سارية للجالية ${S.av.comm} تغطي هذه الفترة.`); }
  // alternatives: other prayer slots that day at this mosque, and the next free weeks for this slot
  out.altSlots = m ? SLOTS.filter(t => t !== S.av.time && !/العشاء/.test(t)).filter(t => { const s = slot(t); return s && !S.E.some(e => e.live && e.sl && e.days.includes(wd) && e.start <= end && e.end >= d && e.sl[0] < s[1] && s[0] < e.sl[1] && (e.mosque === m.id || (names.length && e.names.length && sameLect(names, e.names)))); }) : [];
  out.altDays = [];
  if (m && (out.mos.length || out.lect.length)) for (let i = 1; i <= 7 && out.altDays.length < 3; i++) { const dd = addDays(d, i), w = dOf(dd).getDay();
    const busy = S.E.some(e => e.live && e.sl && e.days.includes(w) && e.start <= dd && e.end >= dd && e.sl[0] < sl[1] && sl[0] < e.sl[1] && (e.mosque === m.id || (names.length && e.names.length && sameLect(names, e.names))));
    if (!busy) out.altDays.push(dd); }
  return out;
}
/* ---------- UI: answer first, then three simple choices (mosque · day · time) ---------- */
S.av.mosId = S.av.mosId || "";
const avM = () => S.mosques.find(m => m.id === S.av.mosId) || null;
function avAnswer(){
  const m = avM(), sl = avSlot(), d = S.av.date || TODAY, wd = dOf(d).getDay();
  const when = `${d === TODAY ? "اليوم" : d === addDays(TODAY, 1) ? "غداً" : DAYS[wd]} ${fmt(d)} · ${S.av.time === "وقت محدد…" ? (S.av.from && S.av.to ? `${t12(S.av.from)}، ${t12(S.av.to)}` : "حدّد الساعة") : S.av.time}`;
  if (!m) return `<div class="avx-ans idle"><span class="avx-ic">؟</span><div><b>اختر المسجد</b><span>${esc(when)}</span></div></div>`;
  if (!sl) return `<div class="avx-ans idle"><span class="avx-ic">؟</span><div><b>حدّد الساعة</b><span>${esc(mosLabel(m))}</span></div></div>`;
  S.av.mos = mosLabel(m); S.av.lect = "";
  const r = avCheck(); const busy = r.mos;
  const alts = busy.length ? [...r.altSlots.slice(0, 2).map(t => `<button type="button" class="avx-alt" data-avtime="${esc(t)}">${esc(t.replace("بعد صلاة ", "بعد "))}<small>نفس اليوم</small></button>`),
    ...r.altDays.slice(0, 2).map(dd => `<button type="button" class="avx-alt" data-avdate="${dd}">${DAYS[dOf(dd).getDay()]}<small>${fmt(dd)}</small></button>`)].join("") : "";
  return `<div class="avx-ans ${busy.length ? "bad" : "ok"}"><span class="avx-ic">${busy.length ? "✕" : "✓"}</span><div><b>${busy.length ? "غير متاح" : "متاح"}</b><span>${esc(mosLabel(m))}<br>${esc(when)}</span></div></div>
    ${busy.length ? `<div class="avx-why">${busy.slice(0, 3).map(e => `<button type="button" class="avx-act" data-prio-open="act:${e.id}"><b>يوجد ${esc(e.type || "نشاط")}، ${esc(e.comm || "")}</b><span>${esc(e.time || "")}${e.lect ? " · " + esc(e.lect) : ""}</span></button>`).join("")}</div>` : ""}
    ${alts ? `<div class="avx-alts"><span>أوقات متاحة قريبة</span><div>${alts}</div></div>` : ""}
    ${r.warn.filter(w => !/أكثر من مسجد|مساجد بهذا الاسم/.test(w)).map(w => `<div class="avx-warn">⚠ ${esc(w)}</div>`).join("")}`;
}
function avPicks(){
  const q = nkey(S.av.q || ""); if (!q || avM()) return "";
  const L = S.mosques.filter(m => nkey(m.name + " " + (m.area || "") + " " + (m.gov || "")).includes(q.replace(/^مسجد\s*/, ""))).slice(0, 7);
  return L.length ? L.map(m => `<button type="button" class="avx-pick" data-avmos="${m.id}"><b>مسجد ${esc(m.name)}</b><span>${esc([m.area, m.gov].filter(Boolean).join(" · "))}</span></button>`).join("") : `<div class="avx-none">لا يوجد مسجد بهذا الاسم</div>`;
}
function vAvail(){
  const a = S.av, m = avM();
  const days = [["اليوم", TODAY], ["غداً", addDays(TODAY, 1)], ["بعد غد", addDays(TODAY, 2)]];
  const custom = !days.some(([, d]) => d === a.date);
  return `<div class="avx">
    <div class="avx-top" id="av-out">${avAnswer()}</div>
    <div class="avx-step"><label>المسجد</label>
      ${m ? `<button type="button" class="avx-chosen" data-avclear><span><b>مسجد ${esc(m.name)}</b><small>${esc([m.area, m.gov].filter(Boolean).join(" · "))}</small></span><i>تغيير</i></button>`
        : `<div class="avx-search"><svg><use href="#i-search"/></svg><input id="av-q" placeholder="اكتب اسم المسجد أو المنطقة" autocomplete="off" value="${esc(a.q || "")}"></div><div class="avx-picks" id="av-picks">${avPicks()}</div>`}</div>
    <div class="avx-step"><label>اليوم</label><div class="avx-seg">${days.map(([l, d]) => `<button type="button" class="${a.date === d ? "on" : ""}" data-avdate="${d}">${l}</button>`).join("")}
      <label class="avx-date${custom ? " on" : ""}"><input type="date" id="av-date" value="${esc(a.date)}"><span>${custom ? fmt(a.date) : "تاريخ آخر"}</span></label></div></div>
    <div class="avx-step"><label>الوقت</label><div class="avx-seg wrap">${SLOTS.filter(t => t !== "بين المغرب والعشاء").map(t => `<button type="button" class="${a.time === t ? "on" : ""}" data-avtime="${esc(t)}">${esc(t.replace("بعد صلاة ", ""))}</button>`).join("")}<button type="button" class="${a.time === "وقت محدد…" ? "on" : ""}" data-avtime="وقت محدد…">ساعة محددة</button></div>
      ${a.time === "وقت محدد…" ? `<div class="avx-hours"><label>من<input type="time" id="av-from" value="${esc(a.from)}"></label><label>إلى<input type="time" id="av-to" value="${esc(a.to)}"></label></div>` : ""}</div>
  </div>`;
}
function avRefresh(){ const o = $("#av-out"); if (o) o.innerHTML = avAnswer(); }
document.addEventListener("input", ev => { if (S.view !== "avail") return; const id = ev.target.id;
  if (id === "av-q") { S.av.q = ev.target.value; const p = $("#av-picks"); if (p) p.innerHTML = avPicks(); return; }
  if (id === "av-from" || id === "av-to") { S.av[id === "av-from" ? "from" : "to"] = ev.target.value; return avRefresh(); }
  if (id === "av-date" && ev.target.value) { S.av.date = ev.target.value; render(); } });
document.addEventListener("click", ev => { const t = ev.target.closest("button"); if (!t || !t.closest("#view") || S.view !== "avail") return; const D = t.dataset;
  if (D.avmos) { S.av.mosId = D.avmos; S.av.q = ""; render(); return window.scrollTo({ top:0, behavior:"smooth" }); }
  if (D.avclear !== undefined) { S.av.mosId = ""; S.av.q = ""; render(); return setTimeout(() => $("#av-q")?.focus(), 30); }
  if (D.avdate) { S.av.date = D.avdate; render(); return window.scrollTo({ top:0, behavior:"smooth" }); }
  if (D.avtime) { S.av.time = D.avtime; render(); return D.avtime === "وقت محدد…" ? setTimeout(() => $("#av-from")?.focus(), 30) : window.scrollTo({ top:0, behavior:"smooth" }); }
});
// assistant: «هل متاح مسجد العثمان اليوم بعد المغرب»
const _answer27 = answer;
answer = function(q){ const t = norm(q);
  if (/متاح|فاضي|مشغول|تعارض في|يمدي/.test(t) && !/تصريح/.test(t)) {
    const tm = SLOTS.find(s => t.includes(norm(s.replace("بعد صلاة ", "")))) || (/مغرب/.test(t) ? "بعد صلاة المغرب" : /عشاء/.test(t) ? "بعد صلاة العشاء" : /عصر/.test(t) ? "بعد صلاة العصر" : /فجر/.test(t) ? "بعد صلاة الفجر" : null);
    const d = /بعد غد/.test(t) ? addDays(TODAY, 2) : /(غدا|بكره|باكر)/.test(t) ? addDays(TODAY, 1) : TODAY;
    const m = S.mosques.find(x => nkey(x.name).length > 3 && t.includes(nkey(x.name))) || S.mosques.find(x => nkey(x.name).split(" ").filter(w => w.length > 3).some(w => t.includes(w)));
    if (tm) { Object.assign(S.av, { date:d, time:tm, mos:m ? mosLabel(m) : "", mosId:m?.id || "", lect:"" }); const r = avCheck(); const busy = r.mos.length || r.lect.length;
      return { title:m ? (busy ? `⛔ مسجد ${m.name} مشغول ${DAYS[r.wd]} ${tm}` : `✅ مسجد ${m.name} متاح ${DAYS[r.wd]} ${tm}`) : `${r.same.length} نشاط ${DAYS[r.wd]} ${tm}`,
        items:(m ? r.mos : r.same).slice(0, 15).map(e => ({ t:`#${e.n} · ${e.comm || ""} · ${e.mosName || ""}`, s:[e.time, e.lect].filter(Boolean).join(" · "), open:`act:${e.id}` })), extra:"للتفاصيل والبدائل افتح «هل الوقت متاح؟»." }; }
  }
  return _answer27(q); };
SUGG.splice(1, 0, ["هل الوقت متاح؟", "i-cal", "هل مسجد متاح اليوم بعد المغرب"]);
const _palAll27 = palAll;
palAll = function(){ const A = _palAll27(); A.unshift({ g:"إجراءات", t:"هل الوقت متاح؟ (فحص مسجد/محاضر/موعد)", s:"", ic:"i-cal", run:() => go("avail"), txt:"متاح تعارض فاضي مشغول موعد وقت مسجد" }); return A; };
NEWF.splice(1, 0, ["v27-avail", "nav:avail", "هل الوقت متاح؟", "اختر التاريخ والوقت (مثلاً اليوم بعد المغرب) والمسجد أو المحاضر، يطلع لك فوراً متاح أو مشغول مع السبب والبدائل.", false, "2026-10-20"]);
