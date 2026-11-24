/* ================= v126 (JL-10): لوحة إشعارات نظيفة ومرتبة (طلب يوسف «رتبها وهندسها وجملها») ================= */
/* عرض واحد يحلّ محل طبقات add14/add21/add95 المتراكبة (البيانات والأزرار نفسها):
   ترويسة بسطر، وشريط تصفية واحد (الكل، عاجل، يحتاج إجراء، للعلم، ملخص اليوم)، وتفعيل الإشعارات سطرًا رفيعًا يُغلق،
   وبطاقات بأيقونة دائرية بلون الدرجة وعنوان بسطر ووصف بسطرين ووقت نسبي ونقطة غير المقروء فقط، وتجميع حسب الدرجة، ودمج المتشابه.
   تأخّر المهمة يُحسب الآن من المهمة نفسها لا من نص الإشعار (كان «متأخرة 1 يوم» يبقى بعد شهر لأن النص يُكتب يوم الإنشاء). */
const NT_TIERS = [["urgent", "عاجل", "--bad"], ["action", "يحتاج إجراء", "--gold"], ["info", "للعلم", "--n2"]];
const ntRel = iso => { const s = (Date.now() - new Date(iso)) / 1000, d = Math.floor(s / 86400);
  if (s < 60) return "الآن"; if (s < 3600) { const m = Math.round(s / 60); return m === 1 ? "قبل دقيقة" : m === 2 ? "قبل دقيقتين" : `قبل ${m} ${m <= 10 ? "دقائق" : "دقيقة"}`; }
  if (s < 86400) { const h = Math.round(s / 3600); return h === 1 ? "قبل ساعة" : h === 2 ? "قبل ساعتين" : `قبل ${h} ${h <= 10 ? "ساعات" : "ساعة"}`; }
  if (d === 1) return "أمس"; if (d === 2) return "قبل يومين"; if (d <= 10) return `قبل ${d} أيام`; if (d < 30) return `قبل ${d} يومًا`;
  const mo = Math.round(d / 30); return mo === 1 ? "قبل شهر" : mo === 2 ? "قبل شهرين" : `قبل ${mo} أشهر`; };
/* المهمة الحية لإشعار مهمة: التأخر الآن، أو «أُنجزت»، أو «حُذفت» */
const ntTask = n => { const m = String(n.link || "").match(/^#task:(.+)$/); return m ? (S.tasks || []).find(t => String(t.id) === m[1]) || null : undefined; };
function ntBody(n){ let b = String(n.body || ""); if (n.kind !== "task_due") return b; const t = ntTask(n);
  if (t === null) return b.replace(/،?\s*متأخرة\s+\d+\s+يوم/, "") + (b ? "، " : "") + "المهمة لم تعد موجودة";
  if (t && /منجز/.test(t.status || "")) return b.replace(/،?\s*متأخرة\s+\d+\s+يوم/, "") + "، أُنجزت";
  if (t?.due) { const late = diffDays(t.due, TODAY); return b.replace(/متأخرة\s+\d+\s+يوم/, late > 0 ? `متأخرة ${late} ${late === 1 ? "يوم" : late === 2 ? "يومين" : late <= 10 ? "أيام" : "يومًا"}` : "حان موعدها"); }
  return b; }
/* دمج المتشابه: إشعارات المهمة الواحدة تبقى واحدة (الأحدث)، ثم عنوان واحد لما تكرر عنوانه */
function ntMerge(L){ const seen = new Set(), U = [];
  for (const n of L) { const k = n.kind === "task_due" && n.link ? "t|" + n.link : "n|" + n.id; if (seen.has(k)) continue; seen.add(k); U.push(n); }
  const by = new Map(); for (const n of U) { const k = n.kind + "|" + String(n.title || "").replace(/\d+/g, "#"); if (!by.has(k)) by.set(k, []); by.get(k).push(n); }
  return [...by.values()]; }
const ntPlural = (G) => { const n0 = G[0], c = G.length, m = String(n0.title || "").match(/^مهمة متأخرة عند (.+)$/);
  if (m) return c === 2 ? `مهمتان متأخرتان عند ${m[1]}` : `${c} ${c <= 10 ? "مهام متأخرة" : "مهمة متأخرة"} عند ${m[1]}`;
  return `${n0.title} (${c})`; };
function ntCard(n, col){ const b = ntBody(n);
  return `<button type="button" class="nt-i${n.read_at ? "" : " new"}" data-nlink="${esc(n.link || "")}" data-nid="${n.id}" style="--c:var(${col})">
    <span class="nt-ic"><svg><use href="#${nKind(n.kind)[1]}"/></svg></span>
    <span class="nt-b"><span class="nt-t">${esc(n.title)}</span>${b ? `<span class="nt-d">${esc(b)}</span>` : ""}<time>${ntRel(n.created_at)}</time></span>${n.read_at ? "" : `<i class="nt-dot" aria-label="غير مقروء"></i>`}</button>`; }
function ntGroup(G, col){ if (G.length === 1) return ntCard(G[0], col); const u = G.filter(x => !x.read_at).length;
  return `<details class="nt-grp"><summary class="nt-i${u ? " new" : ""}" style="--c:var(${col})"><span class="nt-ic"><svg><use href="#${nKind(G[0].kind)[1]}"/></svg></span>
    <span class="nt-b"><span class="nt-t">${esc(ntPlural(G))}</span><span class="nt-d">${G.slice(0, 2).map(x => esc(ntBody(x))).join("؛ ")}${G.length > 2 ? " وغيرها" : ""}</span><time>${ntRel(G[0].created_at)}</time></span>${u ? `<i class="nt-dot"></i>` : ""}</summary>
    <div class="nt-gl">${G.map(x => ntCard(x, col)).join("")}</div></details>`; }
const ntPushOff = () => { try { return localStorage.getItem("ntPushX") === "1"; } catch (_) { return false; } };
bellOpen = function(){
  const old = $("#bell-pop"); if (old) { old.remove(); $("#nc-scrim")?.remove(); return; }
  const f = ["all", "urgent", "action", "info", "now"].includes(S.ncF) ? S.ncF : "all", A = alerts(), u = ntfUnread();
  const T = { urgent:[], action:[], info:[] }; S.ntf.forEach(n => T[nTier(n)].push(n));
  const cnt = k => ntMerge(T[k]).length;
  const chips = [["all", "الكل", ""], ["urgent", "عاجل", cnt("urgent")], ["action", "يحتاج إجراء", cnt("action")], ["info", "للعلم", ""], ["now", "ملخص اليوم", A.length]];
  const sec = ([k, l, col], head) => { const G = ntMerge(T[k]); if (!G.length) return "";
    return `${head ? `<div class="nt-h">${l} <span>${G.length}</span></div>` : ""}<div class="nt-l">${G.map(g => ntGroup(g, col)).join("")}</div>`; };
  let body;
  if (f === "now") body = A.length ? `<div class="nt-l nt-now">${A.map(aItem).join("")}</div>` : "";
  else if (f === "all") body = NT_TIERS.map(t => sec(t, true)).join("");
  else body = sec(NT_TIERS.find(t => t[0] === f), false);
  const p = document.createElement("div"); p.id = "bell-pop"; p.className = "nc nt"; p.setAttribute("role", "dialog"); p.setAttribute("aria-label", "الإشعارات");
  p.innerHTML = `<div class="nt-top"><b>الإشعارات</b>${u ? `<span class="nt-n">${u > 99 ? "99+" : u}</span>` : ""}<span class="nt-sp"></span>
      ${u ? `<button type="button" class="nt-ib" data-nall title="تعليم الكل مقروءًا" aria-label="تعليم الكل مقروءًا"><svg viewBox="0 0 24 24"><path d="M4 12.5l4.5 4.5L20 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>` : ""}
      <button type="button" class="nt-ib" data-nset title="إعدادات الإشعارات" aria-label="إعدادات الإشعارات"><svg><use href="#i-gear"/></svg></button>
      <button type="button" class="nt-ib" data-ncx title="إغلاق" aria-label="إغلاق"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button></div>
    <div class="nt-f" role="tablist">${chips.map(([k, l, n]) => `<button type="button" role="tab" aria-selected="${k === f}" class="${k === f ? "on" : ""}" data-ncf="${k}">${l}${n ? ` <span>${n}</span>` : ""}</button>`).join("")}</div>
    ${!S.push.on && S.push.sup && !ntPushOff() ? `<div class="nt-push"><svg><use href="#i-bell"/></svg><span>فعّل الإشعارات على هذا الجهاز</span><button type="button" class="nt-pb" data-pushon>تفعيل</button><button type="button" class="nt-ib sm" data-ntpushx aria-label="إخفاء"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button></div>` : ""}
    <div class="nt-body">${body || `<div class="nt-empty"><svg viewBox="0 0 24 24"><path d="M4 12.5l4.5 4.5L20 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><b>لا شيء يحتاجك الآن ✓</b></div>`}</div>`;
  $("#nc-scrim")?.remove(); if (matchMedia("(max-width:700px)").matches) { const s = document.createElement("div"); s.id = "nc-scrim"; s.className = "nc-scrim"; s.addEventListener("click", () => { p.remove(); s.remove(); }); document.body.appendChild(s); }
  document.body.appendChild(p);
  const out = ev => { if (!document.body.contains(p)) return document.removeEventListener("mousedown", out, true); if (!p.contains(ev.target) && !ev.target.closest("#bell")) { p.remove(); $("#nc-scrim")?.remove(); document.removeEventListener("mousedown", out, true); } };
  setTimeout(() => document.addEventListener("mousedown", out, true));
};
document.addEventListener("click", ev => { const t = ev.target.closest("[data-ntpushx]"); if (!t) return; ev.stopPropagation(); try { localStorage.setItem("ntPushX", "1"); } catch (_) {} t.closest(".nt-push")?.remove(); }, true);
/* سطر الشرح القديم ينتقل إلى الإعدادات */
const _nSettings126 = nSettings;
nSettings = function(){ _nSettings126(); document.querySelector("#drawer .drawer-b")?.insertAdjacentHTML("beforeend", `<span class="hint">المقروء والمنتهي يُؤرشف تلقائيًا بعد 7 أيام، و«للعلم» لا يُحسب في الشارة ويظهر في تصفية «للعلم».</span>`); };
