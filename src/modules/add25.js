/* ================= v25/v26: internal messaging — a fixed, app-like chat (incremental updates, read receipts, typing) ================= */
Object.assign(TITLES, { chat:"المحادثات" });
NK.push(["chat_msg", "رسائل المحادثات الخاصة"], ["chat_team", "رسائل محادثة القسم", true]);
NKIND.unshift(["chat", "i-chat", "--primary", "محادثة"]);
S.chat = []; S.chatReads = {}; S.peerReads = {}; S.chatPeer = null; S.typing = {};
const convOf = peer => peer === "team" ? "team" : [S.me.id, peer].sort().join(":");
const peerOfConv = conv => conv === "team" ? "team" : conv.split(":").find(x => x !== S.me.id);
const chatName = id => id === "team" ? "محادثة القسم" : (pname(id) || "—");
const chProf = id => S.profiles.find(p => p.id === id);
const chOnline = id => (S.online || []).includes(id);
const chIni = id => id === "team" ? "" : esc(((chProf(id)?.name || chProf(id)?.username || "؟").trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("")));
const CH_COL = ["#168A63", "#2563EB", "#9333EA", "#C2410C", "#0891B2", "#B45309", "#DB2777", "#4F46E5"];
const chCol = id => CH_COL[[...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % CH_COL.length];
const kwDay = iso => new Date(new Date(iso).getTime() + 3 * 3600e3).toISOString().slice(0, 10);
const chClock = iso => new Date(iso).toLocaleTimeString("ar-KW-u-nu-latn", { hour:"numeric", minute:"2-digit", hour12:true });
const chWhen = iso => { const d = kwDay(iso); return d === TODAY ? chClock(iso) : d === addDays(TODAY, -1) ? "أمس" : d >= addDays(TODAY, -6) ? DAYS[new Date(d + "T12:00").getDay()] : fmt(d); };
const chDayLabel = d => d === TODAY ? "اليوم" : d === addDays(TODAY, -1) ? "أمس" : `${DAYS[new Date(d + "T12:00").getDay()]} ${fmt(d)}`;

async function loadChat(){
  const [m, r] = await Promise.all([sb.from("chat_messages").select("*").order("created_at", { ascending:false }).limit(3000), sb.from("chat_reads").select("*")]);
  if (!m.error) S.chat = m.data || [];
  S.chatReads = {}; S.peerReads = {};
  for (const x of r.data || []) { if (x.user_id === S.me.id) S.chatReads[x.conv] = x.last_read; else S.peerReads[x.conv] = x.last_read; }
}
const chatUnread = conv => S.chat.filter(m => m.conv === conv && m.from_id !== S.me.id && !m.deleted && (!S.chatReads[conv] || m.created_at > S.chatReads[conv])).length;
const chatUnreadAll = () => [...new Set(S.chat.map(m => m.conv))].reduce((n, c) => n + chatUnread(c), 0);
async function chatMarkRead(conv){
  const last = S.chat.find(m => m.conv === conv && m.id > 0)?.created_at; if (!last || (S.chatReads[conv] && S.chatReads[conv] >= last)) return;
  S.chatReads[conv] = last; chatBadge(); chList();
  await sb.from("chat_reads").upsert({ user_id:S.me.id, conv, last_read:last });
  const link = conv === "team" ? "#chat:team" : "#chat:" + peerOfConv(conv); ntfRead(S.ntf.filter(n => !n.read_at && n.link === link).map(n => n.id));
}

/* ---------- view: a fixed shell, filled and updated in place (no flicker, no scroll jumps) ---------- */
function vChat(){
  return `<div id="ch-root" class="ch${S.chatPeer ? " has-sel" : ""}">
    <aside class="ch-side"><div class="ch-sh"><div class="ch-sh-t"><b>المحادثات</b><span class="ch-sh-n" id="ch-tot"></span></div>
      <label class="ch-search"><svg><use href="#i-search"/></svg><input id="ch-q" placeholder="ابحث عن زميل" autocomplete="off"></label></div>
      <div class="ch-ls" id="ch-ls"></div></aside>
    <section class="ch-main" id="ch-main"></section></div>`;
}
function chRows(){
  const people = S.profiles.filter(p => p.active && p.id !== S.me.id);
  const last = c => S.chat.find(m => m.conv === c);
  const q = nkey($("#ch-q")?.value || "");
  return [{ id:"team" }, ...people.map(p => ({ id:p.id }))].map(x => ({ ...x, conv:convOf(x.id), last:last(convOf(x.id)), un:chatUnread(convOf(x.id)) }))
    .filter(r => !q || nkey(chatName(r.id) + " " + (chProf(r.id)?.title || "")).includes(q))
    .sort((a, b) => (a.id === "team" ? -1 : b.id === "team" ? 1 : 0) || (b.last?.created_at || "").localeCompare(a.last?.created_at || "") || chatName(a.id).localeCompare(chatName(b.id), "ar"));
}
function chAv(id, cls = ""){ return id === "team" ? `<span class="ch-av team ${cls}"><svg><use href="#i-users"/></svg></span>` : `<span class="ch-av ${cls}" style="--av:${chCol(id)}">${chIni(id)}${chOnline(id) ? `<i class="ch-on"></i>` : ""}</span>`; }
function chList(){
  const box = $("#ch-ls"); if (!box) return;
  const sel = S.chatPeer, tot = chatUnreadAll(); const t = $("#ch-tot"); if (t) { t.textContent = tot || ""; t.hidden = !tot; }
  box.innerHTML = chRows().map(r => { const typing = S.typing[r.conv] && S.typing[r.conv].until > Date.now();
    const prev = typing ? `<em class="ch-typ-s">يكتب الآن…</em>` : r.last ? `${r.last.from_id === S.me.id ? `<span class="ch-tick${S.peerReads[r.conv] >= r.last.created_at ? " read" : ""}">✓✓</span>` : r.id === "team" ? esc((pname(r.last.from_id) || "").split(" ")[0]) + ": " : ""}${esc(r.last.deleted ? "رسالة محذوفة" : r.last.body.replace(/\s+/g, " ").slice(0, 70))}` : esc(r.id === "team" ? "رسائل لجميع موظفي القسم" : chProf(r.id)?.title || "ابدأ المحادثة");
    return `<button type="button" class="ch-t${r.id === sel ? " on" : ""}${r.un ? " un" : ""}" data-chat="${r.id}">${chAv(r.id)}
      <span class="ch-tt"><span class="ch-tt1"><b>${esc(chatName(r.id))}</b><time>${r.last ? chWhen(r.last.created_at) : ""}</time></span><span class="ch-tt2"><span class="ch-pv">${prev}</span>${r.un ? `<i class="ch-n">${r.un > 99 ? "99+" : r.un}</i>` : ""}</span></span></button>`; }).join("") || `<div class="ch-none">لا يوجد زميل بهذا الاسم</div>`;
}
function chHead(){
  const sel = S.chatPeer, p = chProf(sel), conv = convOf(sel), typing = S.typing[conv] && S.typing[conv].until > Date.now();
  const sub = typing ? `<span class="ch-typ-s">${sel === "team" ? esc((pname(S.typing[conv].from) || "").split(" ")[0]) + " " : ""}يكتب الآن…</span>`
    : sel === "team" ? `${S.profiles.filter(x => x.active).length} موظف` : chOnline(sel) ? `<span class="ch-live">متصل الآن</span>` : esc(p?.title || "");
  return `<button type="button" class="ch-back" data-chback aria-label="رجوع"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>${chAv(sel, "md")}<div class="ch-ht"><b>${esc(chatName(sel))}</b><span id="ch-sub">${sub}</span></div>`;
}
function chMsgsHTML(){
  const sel = S.chatPeer, conv = convOf(sel), team = sel === "team";
  const L = S.chat.filter(m => m.conv === conv).slice(0, 600).sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (!L.length) return `<div class="ch-empty">${chAv(sel, "lg")}<b>${esc(chatName(sel))}</b><span>${team ? "رسالتك هنا تصل لجميع موظفي القسم." : "ابدأ المحادثة — الرسائل خاصة بينكما فقط."}</span></div>`;
  const firstUnread = S.chatReads[conv] ? L.find(m => m.from_id !== S.me.id && m.created_at > S.chatReads[conv]) : null;
  const peerRead = S.peerReads[conv] || "";
  let out = "", day = "";
  L.forEach((m, i) => {
    const d = kwDay(m.created_at), prev = L[i - 1], next = L[i + 1], me = m.from_id === S.me.id;
    if (d !== day) { out += `<div class="ch-day"><span>${chDayLabel(d)}</span></div>`; day = d; }
    if (firstUnread && m.id === firstUnread.id) out += `<div class="ch-newline"><span>رسائل جديدة</span></div>`;
    const startG = !prev || prev.from_id !== m.from_id || kwDay(prev.created_at) !== d || new Date(m.created_at) - new Date(prev.created_at) > 5 * 60e3;
    const endG = !next || next.from_id !== m.from_id || kwDay(next.created_at) !== d || new Date(next.created_at) - new Date(m.created_at) > 5 * 60e3;
    const body = m.deleted ? `<i>تم حذف هذه الرسالة</i>` : esc(m.body).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/#(req|act|task|doc|permit|wq|q|bk):[\w-]+/g, x => `<a href="${x}" class="ch-ref">${x}</a>`).replace(/\n/g, "<br>");
    const tick = me && !m.deleted ? `<span class="ch-tick${m.id < 0 ? " wait" : !team && peerRead >= m.created_at ? " read" : ""}" title="${m.id < 0 ? "جارٍ الإرسال" : !team && peerRead >= m.created_at ? "قُرئت" : "أُرسلت"}">${m.id < 0 ? "◷" : "✓✓"}</span>` : "";
    out += `<div class="ch-row ${me ? "me" : "them"}${startG ? " gs" : ""}${endG ? " ge" : ""}" data-mid="${m.id}">
      ${!me && team ? (endG ? chAv(m.from_id, "sm") : `<span class="ch-av-sp"></span>`) : ""}
      <div class="ch-b${m.deleted ? " del" : ""}">${!me && team && startG ? `<span class="ch-who" style="color:${chCol(m.from_id)}">${esc(pname(m.from_id))}</span>` : ""}<div class="ch-tx">${body}<span class="ch-meta">${m.edited_at && !m.deleted ? "عُدّلت · " : ""}${chClock(m.created_at)}${tick}</span></div></div>
      ${me && !m.deleted && m.id > 0 ? `<button type="button" class="ch-more" data-chmenu="${m.id}" aria-label="خيارات">⋯</button>` : !me && !m.deleted ? `<button type="button" class="ch-more" data-chcopy="${m.id}" aria-label="نسخ">⧉</button>` : ""}</div>`;
  });
  // under my last message in a private chat: «قُرئت» once the colleague has read it
  const lastMine = !team && [...L].reverse().find(m => m.from_id === S.me.id && !m.deleted && m.id > 0);
  if (lastMine && L[L.length - 1] === lastMine) out += peerRead >= lastMine.created_at
    ? `<div class="ch-seen read"><span class="ch-tick read">✓✓</span> قُرئت ${chWhen(peerRead) === chClock(peerRead) ? "الساعة " + chClock(peerRead) : chWhen(peerRead)}</div>`
    : `<div class="ch-seen"><span class="ch-tick">✓✓</span> أُرسلت — لم تُقرأ بعد</div>`;
  return out;
}
function chMain(keepDraft){
  const main = $("#ch-main"); if (!main) return; const root = $("#ch-root"); root.classList.toggle("has-sel", !!S.chatPeer); document.body.classList.toggle("ch-open", !!S.chatPeer);
  if (!S.chatPeer) { main.innerHTML = `<div class="ch-pick"><div class="ch-pick-i"><svg><use href="#i-chat"/></svg></div><b>محادثات «إنجاز»</b><span>اختر زميلاً من القائمة لبدء محادثة خاصة، أو اكتب في «محادثة القسم» للجميع.</span></div>`; return; }
  const draft = keepDraft ? ($("#ch-in")?.value || "") : (S.chDrafts?.[S.chatPeer] || "");
  main.innerHTML = `<header class="ch-head" id="ch-head">${chHead()}</header>
    <div class="ch-th" id="ch-th">${chMsgsHTML()}</div>
    <button type="button" class="ch-down" id="ch-down" hidden aria-label="إلى آخر الرسائل"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg><i id="ch-down-n" hidden></i></button>
    <form class="ch-comp" id="ch-form"><div class="ch-inw"><textarea id="ch-in" rows="1" placeholder="اكتب رسالة…" maxlength="4000" enterkeyhint="send"></textarea></div>
      <button class="ch-send" id="ch-send" type="submit" aria-label="إرسال" disabled><svg viewBox="0 0 24 24"><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" fill="currentColor"/></svg></button></form>`;
  const i = $("#ch-in"); i.value = draft; chFit(); chToBottom(true);
  $("#ch-th").addEventListener("scroll", chOnScroll, { passive:true });
}
function chFit(){ const i = $("#ch-in"); if (!i) return; i.style.height = "auto"; i.style.height = Math.min(150, i.scrollHeight) + "px"; $("#ch-send").disabled = !i.value.trim(); }
const chNearBottom = () => { const t = $("#ch-th"); return !t || t.scrollHeight - t.scrollTop - t.clientHeight < 120; };
function chToBottom(instant){ const t = $("#ch-th"); if (!t) return; t.scrollTo({ top:t.scrollHeight, behavior:instant ? "auto" : "smooth" }); S.chNew = 0; chDownBtn(); }
function chOnScroll(){ if (chNearBottom()) { S.chNew = 0; } chDownBtn(); }
function chDownBtn(){ const b = $("#ch-down"); if (!b) return; b.hidden = chNearBottom(); const n = $("#ch-down-n"); if (n) { n.textContent = S.chNew || ""; n.hidden = !S.chNew; } }
function chThread(){ const t = $("#ch-th"); if (!t) return; const stick = chNearBottom(), top = t.scrollTop; t.innerHTML = chMsgsHTML(); if (stick) chToBottom(true); else { t.scrollTop = top; } }
// layout: the chat always fills exactly the visible screen (also with the iPhone keyboard open)
function chSize(){ const r = $("#ch-root"); if (!r) return; const vv = window.visualViewport, h = vv ? vv.height : innerHeight;
  const top = r.getBoundingClientRect().top + (vv ? 0 : 0); const tab = $("#tabbar"); const tb = tab && !tab.hidden && getComputedStyle(tab).display !== "none" && !document.body.classList.contains("ch-open") ? tab.offsetHeight : 0;
  r.style.height = Math.max(320, h - Math.max(0, top) - tb - (innerWidth < 820 ? 0 : 16)) + "px"; }
window.visualViewport?.addEventListener("resize", () => { if (S.view === "chat") { chSize(); if (chNearBottom()) chToBottom(true); } });
window.addEventListener("resize", () => { if (S.view === "chat") chSize(); });

/* the generic render() would rebuild the page on every live update — in the chat we update in place instead */
const _render25 = render;
render = function(){
  if (S.view === "chat" && $("#ch-root") && S.got.size >= 7) { chList(); chatBadge(); if (S.chatPeer && $("#ch-th")) { $("#ch-head").innerHTML = chHead(); chThread(); } return; }
  const r = _render25.apply(this, arguments);
  if (S.view !== "chat") document.body.classList.remove("ch-mode", "ch-open");
  return r;
};
function chMount(){ document.body.classList.add("ch-mode"); chList(); chMain(); chSize(); setTimeout(chSize, 60); }

/* ---------- live ---------- */
let chCh = null, chTyCh = null;
function liveChat(){
  if (chCh) sb.removeChannel(chCh);
  chCh = sb.channel("chat-" + S.me.id)
    .on("postgres_changes", { event:"*", schema:"public", table:"chat_messages" }, p => { const m = p.new; if (!m?.id) return;
      const isNew = !S.chat.some(x => x.id === m.id);
      S.chat = [m, ...S.chat.filter(x => x.id !== m.id && !(x.id < 0 && x.body === m.body && x.conv === m.conv && m.from_id === S.me.id))].sort((a, b) => b.created_at.localeCompare(a.created_at));
      if (S.typing[m.conv]?.from === m.from_id) delete S.typing[m.conv];
      const open = S.view === "chat" && S.chatPeer && m.conv === convOf(S.chatPeer);
      if (open) { const stick = chNearBottom(); chThread(); if (!stick && isNew && m.from_id !== S.me.id) { S.chNew = (S.chNew || 0) + 1; chDownBtn(); } if (!document.hidden && (stick || m.from_id === S.me.id)) chatMarkRead(m.conv); $("#ch-head").innerHTML = chHead(); }
      else if (isNew && m.from_id !== S.me.id && S.view !== "chat") toast(`${pname(m.from_id)}: ${m.body.slice(0, 60)}`);
      if (S.view === "chat") chList(); chatBadge(); })
    .on("postgres_changes", { event:"*", schema:"public", table:"chat_reads" }, p => { const x = p.new; if (!x?.conv || x.user_id === S.me.id) return; S.peerReads[x.conv] = x.last_read; if (S.view === "chat") { chList(); if (S.chatPeer && x.conv === convOf(S.chatPeer)) chThread(); } })
    .subscribe();
  if (chTyCh) sb.removeChannel(chTyCh);
  chTyCh = sb.channel("chat-typing").on("broadcast", { event:"t" }, ({ payload:p }) => {
    if (!p || p.from === S.me.id || !(p.conv === "team" || String(p.conv).includes(S.me.id))) return;
    S.typing[p.conv] = { from:p.from, until:Date.now() + 4000 };
    if (S.view === "chat") { chList(); if (S.chatPeer && p.conv === convOf(S.chatPeer)) { const s = $("#ch-sub"); if (s) $("#ch-head").innerHTML = chHead(); } }
    setTimeout(() => { if (S.view === "chat") { chList(); if (S.chatPeer && $("#ch-head")) $("#ch-head").innerHTML = chHead(); } }, 4200);
  }).subscribe();
}
let chTyAt = 0;
function chTyping(){ if (!S.chatPeer || Date.now() - chTyAt < 2500) return; chTyAt = Date.now(); try { chTyCh?.send?.({ type:"broadcast", event:"t", payload:{ conv:convOf(S.chatPeer), from:S.me.id } }); } catch (_) {} }

/* ---------- actions ---------- */
async function chatSend(){
  const i = $("#ch-in"), body = i?.value.trim(); if (!body || !S.chatPeer) return;
  const peer = S.chatPeer, conv = convOf(peer); i.value = ""; chFit(); if (S.chDrafts) delete S.chDrafts[peer];
  const row = { conv, from_id:S.me.id, to_id:peer === "team" ? null : peer, body };
  const tmp = { ...row, id:-Date.now(), created_at:new Date().toISOString() }; S.chat = [tmp, ...S.chat]; chThread(); chToBottom(); chList(); i.focus();
  const { data, error } = await sb.from("chat_messages").insert(row).select().single();
  S.chat = S.chat.filter(m => m.id !== tmp.id);
  if (error) { toast("تعذّر الإرسال — تحقق من الاتصال"); if (!i.value) { i.value = body; chFit(); } chThread(); return; }
  if (!S.chat.some(m => m.id === data.id)) S.chat = [data, ...S.chat];
  S.chatReads[conv] = data.created_at; sb.from("chat_reads").upsert({ user_id:S.me.id, conv, last_read:data.created_at }).then(() => {});
  if (S.chatPeer === peer) { chThread(); chToBottom(); } chList();
}
function openChat(peer){
  if (S.chatPeer && $("#ch-in")) { (S.chDrafts ||= {})[S.chatPeer] = $("#ch-in").value; }
  S.chatPeer = peer; S.chNew = 0;
  if (S.view !== "chat" || !$("#ch-root")) { go("chat"); } else { chList(); chMain(); chSize(); }
  chatMarkRead(convOf(peer)); setTimeout(() => { if (innerWidth >= 820) $("#ch-in")?.focus(); }, 60);
}
function chMenu(id, btn){
  document.querySelector(".ch-pop")?.remove(); const m = S.chat.find(x => x.id === id); if (!m) return;
  const r = btn.getBoundingClientRect(), p = document.createElement("div"); p.className = "ch-pop";
  p.innerHTML = `<button type="button" data-chcopy="${id}">نسخ النص</button>${m.from_id === S.me.id ? `<button type="button" data-chedit="${id}">تعديل</button><button type="button" class="bad-t" data-chdel="${id}">حذف الرسالة</button>` : ""}`;
  document.body.appendChild(p); p.style.top = Math.min(innerHeight - p.offsetHeight - 8, r.bottom + 4) + "px"; p.style.left = Math.max(8, Math.min(innerWidth - p.offsetWidth - 8, r.left)) + "px";
  setTimeout(() => document.addEventListener("mousedown", function out(e){ if (!p.contains(e.target)) { p.remove(); document.removeEventListener("mousedown", out, true); } }, true));
}

/* ---------- wiring ---------- */
function chatBadge(){ const b = $('#nav [data-nav="chat"]'); if (!b) return; let s = b.querySelector(".nb"); if (!s) { s = document.createElement("span"); s.className = "nb"; b.appendChild(s); } const n = chatUnreadAll(); s.textContent = n > 99 ? "99+" : n || ""; s.hidden = !n; }
const _openLink25 = openLink;
openLink = function(h){ const s = String(h || "").replace(/^#/, ""); if (s.startsWith("chat:")) return openChat(s.slice(5)); return _openLink25(h); };
const _afterRender25 = afterRender;
afterRender = function(v){ _afterRender25(v); chatBadge(); if (S.view === "chat" && $("#ch-root")) { chMount(); if (S.chatPeer && !document.hidden) chatMarkRead(convOf(S.chatPeer)); } else document.body.classList.remove("ch-mode", "ch-open"); };
const _boot9c25 = boot9;
boot9 = function(){ _boot9c25(); loadChat().then(() => { liveChat(); chatBadge(); if (S.view === "chat" && $("#ch-root")) { chList(); chMain(); } }); };
document.addEventListener("visibilitychange", () => { if (!document.hidden && S.view === "chat" && S.chatPeer && chNearBottom()) chatMarkRead(convOf(S.chatPeer)); });
const _prio25 = priorities;
priorities = function(){ const P = _prio25(); const n = chatUnreadAll(); if (n) P.push({ w:90, k:"t1", t:`${n} رسالة غير مقروءة في المحادثات`, s:"من زملائك في القسم", act:{ go:"chat", l:"المحادثات" } }); return P.sort((a, b) => b.w - a.w); };
const _palAll25 = palAll;
palAll = function(){ const A = _palAll25(); for (const p of S.profiles.filter(p => p.active && p.id !== S.me.id)) A.push({ g:"المحادثات", t:`مراسلة ${p.name || p.username}`, s:p.title || "", ic:"i-chat", run:() => openChat(p.id), txt:"محادثة رسالة مراسلة " + (p.name || "") + " " + p.username }); return A; };
NEWF.splice(2, 0, ["v25-chat", "nav:chat", "المحادثات الداخلية", "راسل أي زميل برسالة خاصة، أو اكتب في «محادثة القسم» للجميع — مع إشعار فوري وعلامة القراءة ✓✓."]);
document.addEventListener("submit", ev => { if (ev.target.id === "ch-form") { ev.preventDefault(); chatSend(); } });
document.addEventListener("keydown", ev => { if (ev.target.id === "ch-in" && ev.key === "Enter" && !ev.shiftKey && !ev.isComposing && !matchMedia("(pointer:coarse)").matches) { ev.preventDefault(); chatSend(); } if (ev.key === "Escape" && S.view === "chat" && S.chatPeer && innerWidth < 820) { S.chatPeer = null; chMain(); chList(); chSize(); } });
document.addEventListener("input", ev => { if (ev.target.id === "ch-in") { chFit(); chTyping(); } if (ev.target.id === "ch-q") chList(); });
document.addEventListener("click", async ev => { const t = ev.target.closest("button"); if (!t) return; const D = t.dataset;
  if (D.chat) return openChat(D.chat);
  if (t.id === "ch-down") return chToBottom();
  if (D.chback !== undefined) { if ($("#ch-in")) (S.chDrafts ||= {})[S.chatPeer] = $("#ch-in").value; S.chatPeer = null; chMain(); chList(); return chSize(); }
  if (D.chmenu) return chMenu(+D.chmenu, t);
  if (D.chcopy) { document.querySelector(".ch-pop")?.remove(); const m = S.chat.find(x => x.id === +D.chcopy); if (m) { const ok = await cpCopy(m.body); toast(ok ? "نُسخت الرسالة" : "تعذّر النسخ"); } return; }
  if (D.chedit) { document.querySelector(".ch-pop")?.remove(); const m = S.chat.find(x => x.id === +D.chedit); if (!m) return; const nb = prompt("تعديل الرسالة:", m.body); if (!nb || !nb.trim() || nb.trim() === m.body) return;
    const { error } = await sb.from("chat_messages").update({ body:nb.trim(), edited_at:new Date().toISOString() }).eq("id", m.id); if (error) return toast("تعذّر التعديل"); m.body = nb.trim(); m.edited_at = new Date().toISOString(); return chThread(); }
  if (D.chdel) { document.querySelector(".ch-pop")?.remove(); const { error } = await sb.from("chat_messages").update({ deleted:true, body:"—" }).eq("id", +D.chdel); if (error) return toast("تعذّر الحذف"); const m = S.chat.find(x => x.id === +D.chdel); if (m) m.deleted = true; chThread(); return chList(); }
});
