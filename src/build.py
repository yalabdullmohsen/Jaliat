import os, re
D = os.path.dirname(os.path.abspath(__file__))
M = os.path.join(D, "modules") if os.path.isdir(os.path.join(D, "modules")) else D  # module files: src/modules in the repo, flat in the work copy
BASE = os.path.join(D, "base/index.html") if os.path.exists(os.path.join(D, "base/index.html")) else os.path.join(D, "../sys/index.html")
s = open(BASE, encoding="utf8").read()
def R(a, b, n=1):
    global s
    assert s.count(a) == n, (a[:90], s.count(a)); s = s.replace(a, b)

# --- live deltas (GitHub Pages sub-path + private seed) ---
R('<link rel="manifest" href="/manifest.webmanifest">', '<link rel="manifest" href="manifest.webmanifest">')
R('<link rel="apple-touch-icon" href="/icon-180.png">', '<link rel="apple-touch-icon" href="icon-v2-180.png">')
R('<link rel="icon" href="/icon-192.png">', '<link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png?v=2">\n<link rel="icon" type="image/png" sizes="96x96" href="favicon-96.png?v=2">\n<link rel="shortcut icon" href="favicon.ico?v=2">')
R('navigator.serviceWorker.register("/sw.js")', 'navigator.serviceWorker.register("sw.js")')
R('''  const r = await fetch("/seed.gz", { cache:"no-store" });
  const txt = await new Response(r.body.pipeThrough(new DecompressionStream("gzip"))).text();''',
'''  const { data: sd, error: se } = await sb.from("private_seed").select("b64").eq("id", 1).single(); if (se) throw se; const b = Uint8Array.from(atob(sd.b64), c => c.charCodeAt(0));
  const txt = (b[0] === 0x1f && b[1] === 0x8b) ? await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream("gzip"))).text() : new TextDecoder().decode(b);''')

# --- hooks into the core ---
R('const TODAY = isoOf(new Date());', 'let TODAY = isoOf(new Date());')
R('users:vUsers, audit:vAudit}[v] || vHome;', 'users:vUsers, audit:vAudit, mine:vMine, copilot:vCopilot, rewards:vRewards, inbox:vInbox, weekly:vWeekly, backups:vBackups, odsave:vOdSave, guide:vGuide, staffday:vStaffDay, halls:vHalls, tasks:vTasks, questions:vQuestions, watheqa:vWatheqa, permits:vPermits, whatsapp:vWhatsApp, chat:vChat, changes:vChanges, avail:vAvail, renew:vRenew, fix:vFix, report:vReport, portal:vPortal, coordeval:vCoordEval, sermrec:vSermRec, lmap:vLmap}[v] || vHome;')
R('''  $("#view").innerHTML = fn();
''', '''  $("#view").innerHTML = fn();
  if (typeof afterRender === "function") afterRender(v);
''')
R('if (!$("#app").hidden && !(S.form', 'if (!$("#app").hidden && S.view !== "ai" && S.view !== "copilot" && !(S.form')
R('''    schedule(); loadAuditSoon();
  });''', '''    schedule(); loadAuditSoon();
    if (typeof onRemote === "function") onRemote(t, p);
  });''')
R('''    go(S.view);
  } catch (e)''', '''    go(S.view);
    if (typeof boot9 === "function") boot9();
    odAuto(); setInterval(odAuto, 36e5);
  } catch (e)''')

# --- icons ---
R('''  <symbol id="i-down" viewBox="0 0 24 24">''', '''  <symbol id="i-spark" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></g></symbol>
 <symbol id="i-cam" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 8h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13" r="4"/></g></symbol>
  <symbol id="i-chat" viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></symbol>
  <symbol id="i-lock" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></g></symbol>
  <symbol id="i-moon" viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></symbol>
  <symbol id="i-chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-inbox" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1 3h6l1-3h5"/></g></symbol>
  <symbol id="i-bell" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/></g></symbol>
  <symbol id="i-wa" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 20l1.3-4A8 8 0 1 1 8 18.8z"/><path d="M9 8.5c0 3.5 2.5 6.5 6.5 6.5l1-1.6-2-1-1 .8c-1-.4-2.3-1.7-2.7-2.7l.8-1-1-2z"/></g></symbol>
  <symbol id="i-hall" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 20h18M5 20V9l7-5 7 5v11"/><path d="M9 20v-5h6v5M9 11h6"/></g></symbol>
  <symbol id="i-ext" viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></symbol>
  <symbol id="i-down" viewBox="0 0 24 24">''')

# --- sidebar: labels in spans, assistant entry, collapse, theme ---
nav_a = s.index('<nav class="nav" id="nav">'); nav_b = s.index('</nav>', nav_a)
nav = s[nav_a:nav_b]
nav = re.sub(r'(</svg>)([^<]+)(</button>)', r'\1<span>\2</span>\3', nav)
nav = nav.replace('<button data-nav="khatibs">', '<button data-nav="copilot" class="cp-nav"><svg><use href="#i-spark"/></svg><span>Copilot</span><span class="kbd">ذكاء</span></button>\n      <button data-nav="khatibs">', 1)
nav = nav.replace('<span>خطباء الجاليات</span></button>', '<span>خطباء الجاليات</span></button>\n      <button data-nav="rewards"><svg><use href="#i-badge"/></svg><span>مكافآت الخطباء</span></button>', 1)
nav = nav.replace('<button data-nav="acts">', '<button data-nav="tasks"><svg><use href="#i-list"/></svg><span>المهام والإنجاز</span></button>\n      <button data-nav="avail"><svg><use href="#i-cal"/></svg><span>هل الوقت متاح؟</span></button>\n      <button data-nav="renew"><svg><use href="#i-bell"/></svg><span>تذكير التجديد</span></button>\n      <button data-nav="decisions"><svg><use href="#i-badge"/></svg><span>القرارات</span></button>\n      <button data-nav="recs"><svg><use href="#i-spark"/></svg><span>التوصيات</span></button>\n      <button data-nav="portal"><svg><use href="#i-link"/></svg><span>بوابة إنجاز</span></button>\n      <button data-nav="visits"><svg><use href="#i-cam"/></svg><span>الزيارات الميدانية</span></button>\n      <button data-nav="coordeval"><svg><use href="#i-chart"/></svg><span>تقييم المنسقين</span></button>\n      <button data-nav="sermrec"><svg><use href="#i-mic"/></svg><span>تسجيلات الخطب</span></button>\n      <button data-nav="lmap"><svg><use href="#i-pin"/></svg><span>خريطة الدروس</span></button>\n      <button data-nav="fix"><svg><use href="#i-note"/></svg><span>إكمال البيانات</span></button>\n      <button data-nav="report"><svg><use href="#i-chart"/></svg><span>التقرير الشهري</span></button>\n      <button data-nav="chat"><svg><use href="#i-chat"/></svg><span>المحادثات</span></button>\n      <button data-nav="changes"><svg><use href="#i-log"/></svg><span>سجل التحديثات</span></button>\n      <button data-nav="questions"><svg><use href="#i-chat"/></svg><span>الأسئلة</span></button>\n      <button data-nav="inbox"><svg><use href="#i-inbox"/></svg><span>الطلبات الواردة</span></button>\n      <button data-nav="watheqa"><svg><use href="#i-doc"/></svg><span>وثيقة</span></button>\n      <button data-nav="permits"><svg><use href="#i-qr"/></svg><span>تصاريح الدروس</span></button>\n      <button data-nav="whatsapp"><svg><use href="#i-wa"/></svg><span>واتساب القسم</span></button>\n      <button data-nav="acts">', 1)
nav = nav.replace('<span>التقويم</span></button>', '<span>التقويم</span></button>\n      <button data-nav="weekly"><svg><use href="#i-cal"/></svg><span>الجدول الأسبوعي</span></button>\n      <button data-nav="halls"><svg><use href="#i-hall"/></svg><span>حجز القاعات</span></button>', 1)
nav = nav.replace('<span>المستخدمون والصلاحيات</span></button>', '<span>المستخدمون والصلاحيات</span></button>\n      <button data-nav="backups" class="admin-only" hidden><svg><use href="#i-shield"/></svg><span>النسخ الاحتياطية</span></button>', 1)
nav = nav.replace('<span>الملاحظات</span></button>', '<span>الملاحظات</span></button>\n      <button data-nav="mine"><svg><use href="#i-lock"/></svg><span>ملاحظاتي الخاصة</span></button>', 1)
s = s[:nav_a] + nav + s[nav_b:]
R('<div class="brand"><svg><use href="#star"/></svg><div><b>أنشطة الجاليات</b><span>قسم الجاليات ورعاية المهتدين</span></div></div>',
  '<div class="brand"><svg><use href="#star"/></svg><div><b>أنشطة الجاليات</b><span>قسم الجاليات ورعاية المهتدين</span></div><button class="collapse" id="collapse" title="طي القائمة الجانبية" aria-label="طي القائمة"><svg><use href="#i-chev"/></svg></button></div>')
R('<button class="btn" id="install" hidden>تثبيت النظام على هذا الجهاز</button>', '<button class="btn" id="install" hidden><span>تثبيت النظام على هذا الجهاز</span></button>')
R('<button class="btn" id="export"><svg width="16" height="16"><use href="#i-down"/></svg>تصدير إلى إكسل</button>',
  '<div class="side-tools"><button class="btn" id="export" title="تصدير إلى إكسل"><svg width="16" height="16"><use href="#i-down"/></svg><span>إكسل</span></button><button class="btn" id="theme" title="تبديل الوضع الليلي"><svg width="16" height="16"><use href="#i-moon"/></svg><span>الوضع الليلي</span></button></div>')
R('<button class="btn" id="mypass" style="flex:1">كلمة المرور</button><button class="btn" id="logout" style="flex:1">خروج</button>',
  '<button class="btn" id="mypass" style="flex:1" title="كلمة المرور"><span>كلمة المرور</span></button><button class="btn" id="logout" style="flex:1" title="خروج"><span>خروج</span></button>')

# --- top bar: smart finder + assistant ---
R('''      <h2 id="title"></h2>''', '''      <h2 id="title"></h2>
      <button class="finder" id="finder" type="button" aria-label="البحث الذكي"><svg><use href="#i-search"/></svg><span>ابحث في كل شيء…</span><span class="kbd">Ctrl K</span></button>
      <button class="btn ocr-btn" id="ocr-top" type="button" title="إضافة نشاط من صورة" hidden><svg><use href="#i-cam"/></svg><span>من صورة</span></button>''')

# --- lighter professional palette (light mode) ---
R("--bg:#F3F5F2; --surface:#FFFFFF; --surface-2:#EEF2EE; --ink:#11241D; --muted:#5E6D66; --line:#DDE4DE;", "--bg:#F4F8F6; --surface:#FFFFFF; --surface-2:#EEF5F1; --ink:#13281F; --muted:#5C6E66; --line:#DFE8E3;")
R("--primary:#0E6B4E; --primary-ink:#FFFFFF; --primary-soft:#E2F0E8;", "--primary:#168A63; --primary-ink:#FFFFFF; --primary-soft:#E1F3EA;")
R("--side:#0B3A2B; --side-ink:#E8F2EC; --side-muted:#9DBBAE; --side-hi:#145A43;", "--side:#1A7356; --side-2:#14614A; --side-ink:#F2FAF6; --side-muted:#BFE0D1; --side-hi:#23876A;")
R("--shadow:0 1px 2px rgba(17,36,29,.06),0 6px 24px rgba(17,36,29,.06); --band:#EAF5EE;", "--shadow:0 1px 2px rgba(20,70,50,.05),0 8px 24px rgba(20,70,50,.07); --shadow-s:0 1px 2px rgba(20,70,50,.05); --band:#E8F6EF;")
R('<symbol id="i-plus"', '<symbol id="i-gear" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></g></symbol>\n  <symbol id="i-refresh" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 0 0-14.6-4.5L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.6 4.5L20 16"/><path d="M20 21v-5h-5"/></g></symbol>\n  <symbol id="i-link" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></g></symbol>\n  <symbol id="i-qr" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M17 20h4v-3M14 20h.01"/></g></symbol>\n  <symbol id="i-plus"')
# --- inject css + js ---
css = open(os.path.join(M, "add.css"), encoding="utf8").read() + open(os.path.join(M, "add2.css"), encoding="utf8").read() + open(os.path.join(M, "add3.css"), encoding="utf8").read() + open(os.path.join(M, "add4.css"), encoding="utf8").read() + open(os.path.join(M, "add5.css"), encoding="utf8").read() + open(os.path.join(M, "add6.css"), encoding="utf8").read() + open(os.path.join(M, "add7.css"), encoding="utf8").read() + open(os.path.join(M, "add8.css"), encoding="utf8").read() + open(os.path.join(M, "add9.css"), encoding="utf8").read() + open(os.path.join(M, "add62.css"), encoding="utf8").read() + open(os.path.join(M, "add63.css"), encoding="utf8").read()
import subprocess as _sp, json as _json
_log = _sp.run(["git", "-C", "/home/claude/jaliat", "log", "-80", "--format=%h|%cI|%s"], capture_output=True, text=True).stdout.strip().splitlines()
import hashlib as _hl
_cl = [[_hl.md5(x[2].encode()).hexdigest()[:8], x[1], x[2]] for x in (l.split("|", 2) for l in _log if l.count("|") >= 2)]
if os.environ.get("NEXT_MSG"):
    import datetime as _dt
    _cl.insert(0, [_hl.md5(os.environ["NEXT_MSG"].encode()).hexdigest()[:8], _dt.datetime.now(_dt.timezone(_dt.timedelta(hours=3))).isoformat(timespec="seconds"), os.environ["NEXT_MSG"]])
_AR = _json.load(open(os.path.join(M, "chlog_ar.json"), encoding="utf8"))
import re as _re
def _ar(t):
    t = _AR.get(t, t)
    return t if _re.search("[\u0600-\u06FF]", t) and not _re.match(r"(Merge|wip|docs:)", t, _re.I) else ""
_cl = [[c[0], c[1], _ar(c[2])] for c in _cl]; _cl = [c for c in _cl if c[2]]
CHANGELOG_JS = "const CHANGELOG = " + _json.dumps(_cl, ensure_ascii=False) + ";\n"
js = "\n".join(open(os.path.join(M, f), encoding="utf8").read() for f in ("add.js", "add2.js", "add3.js", "add4.js", "add5.js", "add6.js", "add7.js", "add8.js", "add9.js", "add10.js", "add11.js", "add12.js", "add13.js", "add14.js", "add15.js", "add16.js", "add17.js", "add18.js", "add19.js", "add20.js", "add21.js", "add22.js", "add23.js", "add24.js", "add25.js", "add26.js", "add27.js", "add28.js", "add29.js", "add30.js", "add32.js", "add34.js", "add35.js", "add37.js", "add38.js", "add39.js", "add40.js", "add41.js", "add42.js", "add43.js", "add44.js", "add45.js", "add46.js","add47.js","add48.js","add49.js","add50.js","add51.js","add52.js","add53.js","add54.js","add55.js","add56.js","add57.js","add58.js","add59.js","add60.js","add61.js"))
R('</style>\n\n</head>', css + '</style>\n\n</head>')
R('(async function boot(){', '/* ===== v9 ===== */\n' + CHANGELOG_JS + js + '\n(async function boot(){')
# --- logo #3: progress ring + check ---
import re as _re
s, _n = _re.subn(r'<symbol id="star" viewBox="0 0 64 64">.*?</symbol>', '<symbol id="star" viewBox="0 0 64 64"><circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" stroke-opacity=".22" stroke-width="6"/><path d="M32 8a24 24 0 1 1-22.6 16" fill="none" stroke="#d9b54a" stroke-width="6" stroke-linecap="round"/><path d="M22 33l7 7 14-15" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></symbol>', s, count=1, flags=_re.S)
assert _n == 1
s = s.replace('</style>\n\n</head>', '.brand svg{color:#fff;width:38px;height:38px}.brand b{font-size:21px;letter-spacing:.3px}.login-card .mark{width:76px;height:76px}.login-card h1{font-size:34px}</style>\n\n</head>', 1)
# --- system name: «إنجاز» ---
R('<title>نظام أنشطة الجاليات</title>', '<title>إنجاز — قسم الجاليات</title>')
R('<meta name="apple-mobile-web-app-title" content="أنشطة الجاليات">', '<meta name="apple-mobile-web-app-title" content="إنجاز">')
R('<h1>نظام أنشطة الجاليات</h1>', '<h1>إنجاز</h1><p class="sys-tag">منصة أنشطة الجاليات والمهام والإنجاز</p>')
R('<b>أنشطة الجاليات</b><span>قسم الجاليات ورعاية المهتدين</span>', '<b>إنجاز</b><span>قسم الجاليات ورعاية المهتدين</span>')
s = s.replace("نظام أنشطة الجاليات", "نظام «إنجاز» لأنشطة الجاليات").replace("نظام الجاليات", "إنجاز")
s = s.replace('</style>\n\n</head>', '.sys-tag{margin:-6px 0 8px;color:var(--muted);font-size:14px;text-align:center}</style>\n\n</head>')
# --- sidebar: grouped, ordered ---
_na = s.index('<nav class="nav" id="nav">'); _nb = s.index('</nav>', _na)
_nav = s[_na:_nb]
_btn = {}
for m in re.finditer(r'\n\s*(<button[^>]*?(?:data-nav="([a-z]+)"|data-ext="[^"]*")[^>]*>.*?</button>)', _nav):
    _btn[m.group(2) or "wq-ext"] = m.group(1)
for _k in ("decisions", "recs", "visits"): _btn.pop(_k, None)
_btn["guide"] = '<button data-nav="guide"><svg><use href="#i-doc"/></svg><span>الدليل</span></button>'
_btn["staffday"] = '<button data-nav="staffday"><svg><use href="#i-users"/></svg><span>نشاط الموظفين</span></button>'
_btn["odsave"] = '<button data-nav="odsave"><svg><use href="#i-down"/></svg><span>الحفظ في OneDrive</span></button>'
_groups = [("", ["home", "guide", "copilot"]), ("العمل اليومي", ["tasks", "fix", "questions", "inbox", "watheqa", "permits"]), ("التواصل", ["whatsapp", "chat", "renew"]), ("الأنشطة والجدولة", ["avail", "docs", "acts", "cal", "lmap", "weekly", "halls"]),
           ("الجاليات والمساجد", ["portal", "comms", "coords", "coordeval", "mosques"]), ("خطب الجمعة", ["khatibs", "rewards", "sermrec"]), ("التقارير والسجلات", ["odsave", "report", "stats", "notes", "mine", "changes"]), ("الإدارة", ["staffday", "users", "backups", "audit"])]
_out = ['<nav class="nav" id="nav">']
_used = set()
_rest = [v for k, v in _btn.items() if k not in sum([g[1] for g in _groups], [])]
for gi, (title, keys) in enumerate(_groups):
    adm = title == "الإدارة"
    if title: _out.append(f'<div class="ng{" admin-only" if adm else ""}" data-g="{gi}"{" hidden" if adm else ""}><button type="button" class="sep" data-ng="{gi}" aria-expanded="true"><span>{title}</span><svg class="ng-ch"><use href="#i-chev"/></svg></button><div class="ng-b">')
    for k in keys:
        if k in _btn: _out.append(_btn[k]); _used.add(k)
    if title == "الجاليات والمساجد": _out += _rest; print("REST", [k for k in _btn if k not in sum([g[1] for g in _groups], [])])
    if title: _out.append('</div></div>')
assert len(_used) >= 20, len(_used)
s = s[:_na] + "\n      ".join(_out) + "\n    " + s[_nb:]
s = s.replace('</style>\n\n</head>', '.nav .sep{font-weight:700;padding:14px 12px 4px;display:flex;align-items:center;gap:6px;width:100%;min-height:0!important;background:none;border:0;color:var(--side-muted);font-size:11.5px;letter-spacing:.04em;cursor:pointer;text-align:right}.nav .sep:hover{color:var(--side-ink);background:none}.nav .sep span{flex:1}.nav .ng-ch{width:12px!important;height:12px!important;transition:transform .2s;transform:rotate(90deg)}.nav .ng.cl .ng-ch{transform:rotate(180deg)}.nav .ng.cl .ng-b{display:none}.nav .ng-n{background:var(--side-hi);color:var(--side-ink);border-radius:999px;font-size:10.5px;padding:0 7px;letter-spacing:0}.nav .ext-i{width:14px!important;height:14px!important;opacity:.55;margin-inline-start:auto}.nav button{min-height:40px}</style>\n\n</head>', 1)
# --- v22 speed: no Excel library on start, early connections, fewer font files ---
s = s.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js" defer></script>', '')
assert 'xlsx.full.min.js" defer' not in s
s = s.replace('<link rel="preconnect" href="https://fonts.googleapis.com">', '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin><link rel="preconnect" href="https://nybuospfwbbtejvjivhd.supabase.co" crossorigin>', 1)
s = s.replace('family=Readex+Pro:wght@400;500;600;700', 'family=Readex+Pro:wght@500;600')
s = s.replace('if (!window.XLSX)', 'if (!window.XLSX && (loadXLSX(), 1))')
s = re.sub(r'مكتبة إكسل لم تُحمّل( بعد)?', 'جارٍ تجهيز إكسل — اضغط مرة أخرى بعد ثانيتين', s)
# --- the ministry's current name ---
s = s.replace("وزارة الأوقاف والشؤون الإسلامية", "وزارة الشؤون الإسلامية").replace("بوزارة الأوقاف", "بوزارة الشؤون الإسلامية").replace("الأوقاف والشؤون الإسلامية", "الشؤون الإسلامية")
assert "الأوقاف" not in s.replace("awqaf", ""), "old ministry name left"
# --- organisation config (config.json): lets the system be copied to another section / department ---
import json
_cfg_p = os.path.join(D, "config.json")
if os.path.exists(_cfg_p):
    CFG = json.load(open(_cfg_p, encoding="utf8"))
    _m = re.search(r'const SB_URL = "([^"]+)";', s); _k = re.search(r'const SB_KEY = "([^"]+)";', s)
    DEF = {"ministry": "وزارة الشؤون الإسلامية", "admin_unit": "إدارة العلاقات الخارجية", "section": "قسم الجاليات ورعاية المهتدين وطلبة البعوث", "supabase_url": _m.group(1), "supabase_anon_key": _k.group(1)}
    for k, old in DEF.items():
        new = CFG.get(k) or old
        if new != old: s = s.replace(old, new)
# --- منظومة إنجاز: الهوية الموحّدة وسطر الحقوق (brand/brand.js) ---
if "brand/brand.js" not in s:
    _i = s.rfind("</body>"); s = s[:_i] + '<script src="brand/brand.js" data-app="injaz" defer></script>\n' + s[_i:]
open(os.path.join(D, "index.html"), "w", encoding="utf8").write(s)
print("ok", len(s))

import subprocess
subprocess.run(["node", os.path.join(D, "minify.js"), os.path.join(D, "index.html")], check=True)
