/* ================= v21: clean, grouped notification centre + a refresh button on every device ================= */
const NKIND = [ // [prefix, icon, colour var, label]
  ["request", "i-inbox", "--t1", "طلب"], ["task", "i-list", "--t2", "مهمة"], ["question", "i-chat", "--t3", "سؤال"], ["q_", "i-chat", "--t3", "سؤال"],
  ["booking", "i-hall", "--gold", "حجز"], ["doc", "i-doc", "--warn", "موافقة"], ["permit", "i-qr", "--ok", "تصريح"], ["sermon", "i-mic", "--gold", "خطبة"],
  ["mention", "i-chat", "--t1", "إشارة"], ["comment", "i-chat", "--t1", "تعليق"], ["act", "i-cal", "--primary", "نشاط"], ["note", "i-note", "--muted", "ملاحظة"], ["wa", "i-wa", "--ok", "واتساب"]];
const nKind = k => NKIND.find(([p]) => String(k || "").startsWith(p)) || ["", "i-bell", "--primary", "تنبيه"];
const nDay = iso => { const d = String(iso).slice(0, 10), t = new Date(iso); const kw = new Date(t.getTime() + 3 * 3600e3).toISOString().slice(0, 10);
  return kw === TODAY ? "اليوم" : kw === addDays(TODAY, -1) ? "أمس" : kw >= addDays(TODAY, -7) ? "هذا الأسبوع" : "أقدم"; };
const nTime = iso => { const s = (Date.now() - new Date(iso)) / 1000; if (s < 60) return "الآن"; if (s < 3600) return `${Math.round(s / 60)} د`; if (s < 86400) return `${Math.round(s / 3600)} س`;
  return new Date(iso).toLocaleDateString("ar-KW-u-nu-latn", { day:"numeric", month:"numeric" }); };
function nItem(n){ const [, ic, col, lab] = nKind(n.kind);
  return `<button type="button" class="nc-i${n.read_at ? "" : " new"}" data-nlink="${esc(n.link || "")}" data-nid="${n.id}" style="--c:var(${col})">
    <span class="nc-ic"><svg><use href="#${ic}"/></svg></span>
    <span class="nc-b"><span class="nc-top"><b>${esc(n.title)}</b><time>${nTime(n.created_at)}</time></span>${n.body ? `<span class="nc-tx">${esc(n.body)}</span>` : ""}<span class="nc-tag">${lab}</span></span>${n.read_at ? "" : `<i class="nc-dot"></i>`}</button>`; }
function aItem(a){ const col = { bad:"--bad", warn:"--warn", gold:"--gold", ok:"--ok", t1:"--t1" }[a.k] || "--primary";
  return `<button type="button" class="nc-i" data-go="${a.go}"${a.f ? ` data-f="${esc(JSON.stringify(F0(a.f)))}"` : ""} style="--c:var(${col})"><span class="nc-ic"><svg><use href="#${a.k === "bad" ? "i-log" : "i-spark"}"/></svg></span><span class="nc-b"><span class="nc-top"><b>${esc(a.t)}</b></span>${a.s ? `<span class="nc-tx">${esc(a.s)}</span>` : ""}</span></button>`; }
bellOpen = function(){
  const old = $("#bell-pop"); if (old) { old.remove(); $("#nc-scrim")?.remove(); return; }
  const tab = S.bellTab || "mine", A = alerts(), u = unread(), f = S.ncF || "all";
  let L = S.ntf; if (tab === "mine" && f === "new") L = L.filter(n => !n.read_at);
  const groups = []; for (const n of L.slice(0, 60)) { const g = nDay(n.created_at); let G = groups.find(x => x.g === g); if (!G) groups.push(G = { g, items:[] }); G.items.push(n); }
  const p = document.createElement("div"); p.id = "bell-pop"; p.className = "nc"; p.setAttribute("role", "dialog"); p.setAttribute("aria-label", "الإشعارات");
  p.innerHTML = `<div class="nc-h"><div class="nc-tt"><b>الإشعارات</b>${u ? `<span class="nc-n">${u} جديد</span>` : ""}</div>
      <div class="nc-act">${tab === "mine" && u ? `<button type="button" class="nc-btn" data-nall title="تحديد الكل كمقروء">✓ قراءة الكل</button>` : ""}<button type="button" class="nc-btn ic" data-nset title="إعدادات الإشعارات" aria-label="الإعدادات"><svg><use href="#i-gear"/></svg></button><button type="button" class="nc-btn ic nc-x" data-ncx aria-label="إغلاق">×</button></div></div>
    <div class="nc-tabs"><button type="button" class="${tab === "mine" ? "on" : ""}" data-btab="mine">إشعاراتي</button><button type="button" class="${tab === "now" ? "on" : ""}" data-btab="now">ملخص الآن${A.length ? ` <span class="num">${A.length}</span>` : ""}</button></div>
    ${tab === "mine" ? `<div class="nc-f"><button type="button" class="${f === "all" ? "on" : ""}" data-ncf="all">الكل</button><button type="button" class="${f === "new" ? "on" : ""}" data-ncf="new">غير المقروءة${u ? ` ${u}` : ""}</button></div>` : ""}
    ${!S.push.on && S.push.sup ? `<button type="button" class="nc-push" data-pushon><svg><use href="#i-bell"/></svg><span><b>فعّل الإشعارات على هذا الجهاز</b><span>تصلك التنبيهات حتى والنظام مغلق</span></span></button>` : ""}
    <div class="nc-l">${tab === "mine" ? (groups.length ? groups.map(G => `<div class="nc-g">${G.g}</div>${G.items.map(nItem).join("")}`).join("") : `<div class="nc-empty"><svg><use href="#i-bell"/></svg><b>${f === "new" ? "لا توجد إشعارات غير مقروءة" : "لا توجد إشعارات بعد"}</b><span>تظهر هنا المهام والطلبات والأسئلة الموجهة لك</span></div>`)
      : (A.length ? A.map(aItem).join("") : `<div class="nc-empty"><svg><use href="#i-spark"/></svg><b>كل شيء على ما يرام</b></div>`)}</div>`;
  $("#nc-scrim")?.remove(); if (matchMedia("(max-width:700px)").matches) { const s = document.createElement("div"); s.id = "nc-scrim"; s.className = "nc-scrim"; s.addEventListener("click", () => { p.remove(); s.remove(); }); document.body.appendChild(s); }
  document.body.appendChild(p);
  const out = ev => { if (!document.body.contains(p)) return document.removeEventListener("mousedown", out, true); if (!p.contains(ev.target) && !ev.target.closest("#bell")) { p.remove(); $("#nc-scrim")?.remove(); document.removeEventListener("mousedown", out, true); } };
  setTimeout(() => document.addEventListener("mousedown", out, true));
};

/* refresh button (top bar, every device): pick up the newest release, then reload */
async function hardRefresh(btn){
  btn?.classList.add("spin");
  try { const r = await navigator.serviceWorker?.getRegistration(); await r?.update(); if (r?.waiting) r.waiting.postMessage({ type:"skip" }); } catch (_) {}
  try { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } catch (_) {}
  location.reload();
}
function addRefreshBtn(){ if ($("#refresh-btn")) return; const anchor = $("#bell") || $("#ocr-top"); if (!anchor) return;
  anchor.insertAdjacentHTML("beforebegin", `<button class="btn refresh-btn" id="refresh-btn" type="button" title="تحديث الصفحة" aria-label="تحديث الصفحة"><svg><use href="#i-refresh"/></svg></button>`); }
const _afterRender21 = afterRender;
afterRender = function(){ _afterRender21(); addRefreshBtn(); };
document.addEventListener("click", ev => { const t = ev.target.closest("button"); if (!t) return; const D = t.dataset;
  if (t.id === "refresh-btn") return hardRefresh(t);
  if (D.ncx !== undefined) { $("#bell-pop")?.remove(); $("#nc-scrim")?.remove(); return; }
  if (D.ncf) { S.ncF = D.ncf; $("#bell-pop")?.remove(); $("#nc-scrim")?.remove(); return bellOpen(); }
  if (D.nlink !== undefined || D.nset !== undefined) $("#nc-scrim")?.remove();
});
