/* ================= v95 (JL-4): تراكم الإشعارات + حالة مزامنة وثيقة ================= */
/* 1) ثلاث درجات بنفس تصنيف الخادم notif_tier: عاجل / يحتاج إجراء / للعلم (للعلم بلا شارة، في ملخص يومي) */
const NT_URGENT = ["wq_sync_late", "wq_no", "task_due", "booking_today", "request_waiting"];
const NT_INFO = ["wq_ok", "weekly", "monthly_report", "task_progress", "task_seen", "task_done", "question_seen", "permit_issued", "request_status", "act_changed", "note_new", "sermon_rec", "test", "chat_team"];
NKIND.unshift(["wq_sync", "i-doc", "--bad", "مزامنة وثيقة"], ["wq", "i-doc", "--t1", "وثيقة"], ["client_err", "i-log", "--bad", "أخطاء النظام"], ["pending_items", "i-inbox", "--warn", "معلّق"]);
const nTier = n => n.tier || (NT_URGENT.includes(n.kind) ? "urgent" : NT_INFO.includes(n.kind) ? "info" : "action");
S.ntfLive = null; S.ntfCount = null; /* ntfLive: هل عمود الأرشفة موجود في القاعدة؛ ntfCount: عدد ما يحتاج إجراءً غير المقروء في القاعدة كلها لا آخر 80 */

/* التحميل: غير المؤرشف فقط، والعدّ من الخادم */
loadNtf = async function(){
  let q = await sb.from("notifications").select("*").eq("user_id", S.me.id).is("archived_at", null).order("created_at", { ascending:false }).limit(150);
  if (q.error && /archived_at/.test(q.error.message || "")) { S.ntfLive = false; q = await sb.from("notifications").select("*").eq("user_id", S.me.id).order("created_at", { ascending:false }).limit(150); }
  else if (!q.error) S.ntfLive = true;
  if (q.error) return console.warn("loadNtf", q.error);
  S.ntf = q.data || []; await ntfCountLoad();
};
async function ntfCountLoad(){
  let q = sb.from("notifications").select("id", { count:"exact", head:true }).eq("user_id", S.me.id).is("read_at", null).not("kind", "in", `(${NT_INFO.join(",")})`);
  if (S.ntfLive) q = q.is("archived_at", null);
  const { count, error } = await q; S.ntfCount = error ? null : Math.max(0, count - ntfLocal()); /* ما هو خارج المحمّل فقط */
}
const ntfLocal = () => S.ntf.filter(x => !x.read_at && nTier(x) !== "info").length;
const ntfUnread = () => (S.ntfCount || 0) + ntfLocal();
bellRefresh = function(){ const b = $("#bell"); if (!b) return; const n = ntfUnread(); const bn = b.querySelector(".bn"); bn.textContent = n > 99 ? "99+" : n || ""; bn.hidden = !n; b.classList.toggle("off", !S.push.on && S.push.sup); };

/* تعليم الكل مقروءًا: كل غير المقروء في القاعدة لا المحمّل فقط */
async function ntfReadAll(){ const now = new Date().toISOString(); S.ntf.forEach(x => { if (!x.read_at) x.read_at = now; }); S.ntfCount = 0; bellRefresh();
  const { error } = await sb.from("notifications").update({ read_at:now }).eq("user_id", S.me.id).is("read_at", null); if (error) return writeFail(error); toast("عُلّمت كل الإشعارات مقروءة"); }

/* 2) تجميع المتشابه: نفس النوع في نفس اليوم (3 فأكثر) صف واحد يتوسّع */
function ntfGroups(L){ const out = [], by = new Map();
  for (const n of L) { const k = n.kind + "|" + nDay(n.created_at); if (!by.has(k)) { const G = { k, items:[] }; by.set(k, G); out.push(G); } by.get(k).items.push(n); }
  return out; }
function ntfGroupHtml(G){ if (G.items.length < 3) return G.items.map(nItem).join("");
  const n0 = G.items[0], [, ic, col, lab] = nKind(n0.kind), u = G.items.filter(x => !x.read_at).length;
  return `<details class="nc-grp" style="--c:var(${col})"><summary class="nc-i${u ? " new" : ""}"><span class="nc-ic"><svg><use href="#${ic}"/></svg></span>
    <span class="nc-b"><span class="nc-top"><b>${G.items.length} إشعارات: ${esc(lab)}</b><time>${nTime(n0.created_at)}</time></span><span class="nc-tx">${esc(n0.title)}${G.items.length > 1 ? " وغيرها" : ""}</span></span>${u ? `<button type="button" class="nc-btn" data-ngread="${G.items.filter(x => !x.read_at).map(x => x.id).join(",")}">قراءة ${u}</button>` : ""}</summary>
    <div class="nc-gl">${G.items.map(nItem).join("")}</div></details>`; }
function ntfTierHtml(tier, title, L){ if (!L.length) return "";
  if (tier === "info") { const days = []; for (const n of L) { const d = nDay(n.created_at); let D = days.find(x => x.d === d); if (!D) days.push(D = { d, items:[] }); D.items.push(n); }
    return `<div class="nc-g">${title}</div>${days.map(D => { const cnt = new Map(); D.items.forEach(n => { const l = nKind(n.kind)[3]; cnt.set(l, (cnt.get(l) || 0) + 1); });
      return `<details class="nc-grp nc-info"><summary class="nc-i"><span class="nc-ic"><svg><use href="#i-spark"/></svg></span><span class="nc-b"><span class="nc-top"><b>ملخص ${D.d}</b><time>${D.items.length}</time></span><span class="nc-tx">${[...cnt].map(([l, c]) => `${c} ${esc(l)}`).join("، ")}</span></span></summary><div class="nc-gl">${D.items.map(nItem).join("")}</div></details>`; }).join("")}`; }
  return `<div class="nc-g">${title}${tier === "urgent" ? ` <span class="chip bad">${L.filter(x => !x.read_at).length || ""}</span>` : ""}</div>${ntfGroups(L).map(ntfGroupHtml).join("")}`; }

const _bellOpen95 = bellOpen;
bellOpen = function(){
  const tab = S.bellTab || "mine", f = S.ncF || "all";
  _bellOpen95(); const p = $("#bell-pop"); if (!p || tab !== "mine") return;
  let L = S.ntf; if (f === "new") L = L.filter(n => !n.read_at);
  const T = { urgent:[], action:[], info:[] }; L.forEach(n => T[nTier(n)].push(n));
  const box = p.querySelector(".nc-l"); if (!box) return;
  if (L.length) box.innerHTML = ntfTierHtml("urgent", "عاجل", T.urgent) + ntfTierHtml("action", "يحتاج إجراء", T.action) + ntfTierHtml("info", "للعلم", T.info);
  const nf = p.querySelector('[data-ncf="new"]'); if (nf) nf.textContent = "غير المقروءة";
  const all = p.querySelector("[data-nall]"); if (all) all.textContent = "✓ تعليم الكل مقروءًا";
  const n = p.querySelector(".nc-n"), u = ntfUnread(); if (n) n.textContent = u ? `${u} يحتاج انتباهك` : "";
  p.querySelector(".nc-f")?.insertAdjacentHTML("afterend", `<div class="nc-note s">المقروء والمنتهي يُؤرشف تلقائيًا بعد 7 أيام، و«للعلم» لا يُحسب في الشارة.</div>`);
};
document.addEventListener("click", ev => { const t = ev.target.closest("button"); if (!t) return;
  if (t.dataset.nall !== undefined) { ev.stopImmediatePropagation(); ev.preventDefault(); ntfReadAll().then(() => { $("#bell-pop")?.remove(); bellOpen(); }); return; }
  if (t.dataset.ngread) { ev.stopImmediatePropagation(); ev.preventDefault(); ntfRead(t.dataset.ngread.split(",").map(Number)).then(() => { $("#bell-pop")?.remove(); bellOpen(); }); }
}, true);

/* 3) إعداد لكل مستخدم: الإشعار الفوري للعاجل فقط أو للكل */
const _nSettings95 = nSettings;
nSettings = function(){ _nSettings95(); const m = S.prefs.push_mode || "all";
  document.querySelector("#drawer .fld")?.insertAdjacentHTML("beforebegin", `<div class="fld"><label>الإشعار الفوري على الجهاز</label>
    <label><input type="radio" name="npm" value="all"${m === "all" ? " checked" : ""}> كل ما يحتاج إجراء والعاجل</label>
    <label><input type="radio" name="npm" value="urgent"${m === "urgent" ? " checked" : ""}> العاجل فقط (والباقي يبقى في الجرس)</label>
    <span class="hint">«للعلم» لا يصل فوريًا أبدًا، ويظهر في ملخص يومي داخل الجرس.</span></div>`); };
const _nSave95 = nSave;
nSave = async function(){ const v = document.querySelector('input[name="npm"]:checked')?.value;
  if (v && v !== (S.prefs.push_mode || "all")) { const { error } = await sb.from("notif_prefs").upsert({ user_id:S.me.id, off:S.prefs.off || [], push_mode:v }, { onConflict:"user_id" });
    if (error) return /push_mode/.test(error.message || "") ? toast("إعداد الإشعار الفوري يعمل بعد تحديث قاعدة البيانات") : writeFail(error);
    S.prefs.push_mode = v; }
  return _nSave95(); };

/* 4) «المطلوب منك الآن»: يخرج منه ما ينتظر قرار رئيس القسم (المنجز والملغى خارج أصلًا) */
const _myWork95 = myWork;
myWork = function(){ const W = _myWork95(); if (!W) return W; const wait = new Set(S.tasks.filter(t => t.waiting === "mgr").map(t => `data-task="${t.id}"`));
  W.now = W.now.filter(x => !wait.has(x.a)); return W; };

/* 5) حالة مزامنة وثيقة: آخر مزامنة بالوقت الدقيق، وتحذير بسببه إن تأخرت */
const WQ_LATE_H = 24;
function wqSyncInfo(){ const sy = S.wqSync || {}, last = sy.last || null, h = last ? (Date.now() - new Date(last)) / 36e5 : Infinity;
  const late = h > WQ_LATE_H, login = sy.state === "login";
  const since = !last ? "" : h < 1 ? `قبل ${Math.max(1, Math.round(h * 60))} دقيقة` : h < 48 ? `قبل ${Math.round(h)} ساعة` : `قبل ${Math.floor(h / 24)} يوم`;
  const why = login ? "جلسة وثيقة منتهية: سجّل دخولك في وثيقة ثم اضغط «مزامنة الآن»."
    : !last ? "لم تصل أي بيانات من وثيقة بعد." : late ? "لم تصل بيانات من وثيقة: افتح وثيقة على هذا الجهاز أو أي جهاز عليه جسر إنجاز، ثم اضغط «مزامنة الآن»." : "";
  return { last, late:late || login, since, why }; }
function wqSyncLine(){ const I = wqSyncInfo();
  return `<span class="wqsy ${I.late ? "late" : "ok"}">${I.late ? "⚠ لم تتم المزامنة" : "✓ آخر مزامنة"}${I.last ? `: ${I.since} (${esc(fmtTime(I.last))})` : ""}</span>`; }
function wqSyncCard(){ if (!S.canWrite) return ""; const I = wqSyncInfo();
  return `<div class="panel wqsy-card ${I.late ? "late" : ""}"><div class="panel-b"><div><b>وثيقة</b> ${wqSyncLine()}${I.why ? `<span class="s">${esc(I.why)}</span>` : ""}</div>
    <div class="br-acts">${I.late ? `<button type="button" class="btn" data-ext="${WATHEQA}">فتح وثيقة</button>` : ""}<button type="button" class="btn btn-ghost" data-go="watheqa">صفحة وثيقة</button></div></div></div>`; }
const _vHome95 = vHome;
vHome = function(){ return wqSyncCard() + _vHome95(); };
const _vWatheqa95 = vWatheqa;
vWatheqa = function(){ const h = _vWatheqa95(), I = wqSyncInfo();
  return h.replace(/(<span class="s">)(?:⚠ جلسة وثيقة منتهية[^·]*|آخر مزامنة: [^·]*)·/, `$1${wqSyncLine()}${I.why ? ` ${esc(I.why)}` : ""} ·`); };
/* كل كتاب لم يُحفظ بعد في وثيقة: وسم «لم تتم مزامنته» ومدة الانتظار */
const woWait = o => { const h = (Date.now() - new Date(o.created_at)) / 36e5; return h < 1 ? `${Math.max(1, Math.round(h * 60))} دقيقة` : h < 48 ? `${Math.round(h)} ساعة` : `${Math.floor(h / 24)} يوم`; };
const _woPanel95 = woPanel;
woPanel = function(){ let h = _woPanel95(); if (!S.wqOut) return h;
  for (const o of S.wqOut.filter(o => o.status === "pending" || o.status === "working")) h = h.replace(`<span class="num">ك-${o.no}</span>`, `<span class="num">ك-${o.no}</span><span class="chip ${(Date.now() - new Date(o.created_at)) / 36e5 > WQ_LATE_H ? "bad" : "warn"}">لم تتم مزامنته · ينتظر ${woWait(o)}</span>`);
  return h; };
