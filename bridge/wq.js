// يعمل داخل وثيقة بجلسة الموظف نفسه: يعبّئ نموذج الكتاب ثم يحفظ مسودة أو يرسل، ويُبلغ إنجاز بكل خطوة.
// لا كلمات سر ولا شيفرة بعيدة: كل ما يصله بيانات كتاب فقط.
(function () {
  if (window.__wqLoaded) return; window.__wqLoaded = true;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const waitFor = async (fn, ms = 15000, step = 200) => { const t = Date.now(); while (Date.now() - t < ms) { try { const x = fn(); if (x) return x; } catch (_) {} await sleep(step); } return null; };
  const norm = s => String(s || "").replace(/[إأآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/\s+/g, " ").trim();
  const vis = e => e && e.offsetParent !== null;
  const setVal = (el, v) => { const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); };
  const say = (step, extra) => { try { chrome.runtime.sendMessage({ type: "wq-progress", step, ...(extra || {}) }); } catch (_) {} };
  class Stop extends Error {}
  const fail = m => { throw new Stop(m); };

  function guard(job) {
    const draftPage = /[?&]draftFor=/.test(location.search);
    if (!/\/Documents\/Compose/.test(location.pathname)) fail("صفحة إنشاء الكتاب غير مفتوحة");
    if (job.mode === "draft" && !draftPage) fail("وضع المسودة يتطلب صفحة «إنشاء مسودة»");
    if (job.mode === "send" && draftPage) fail("وضع الإرسال المباشر لا يعمل من صفحة المسودة");
    if (!document.getElementById("composeForm")) fail("نموذج الكتاب لم يظهر");
  }

  async function pickRecipient(job) {
    const gov = (/مساجد\s+(?:محافظة\s+)?([^\s،]+)/.exec(job.to || "") || [])[1];
    const query = gov || String(job.to || "").replace(/^مدير\s+/, "").slice(0, 40);
    if (!query) fail("المستلم غير محدد");
    const inp = await waitFor(() => document.querySelector('input[placeholder*="الوظيفة الإشرافية"]'));
    if (!inp) fail("خانة الوظائف الإشرافية غير موجودة");
    inp.focus(); setVal(inp, query);
    const want = gov ? norm("مدير ادارة مساجد " + gov) : norm(job.to);
    const hit = await waitFor(() => {
      const panel = inp.closest(".wq-recipient-picker") || document;
      const cands = [...panel.querySelectorAll("li,div,button,a")].filter(e => vis(e) && !e.querySelector("li,button") && e.innerText && norm(e.innerText).includes(want));
      const top = cands.map(e => (e.closest("li,[role=option],button,a,.wq-recipient-item") || e)).filter((e, i, a) => a.indexOf(e) === i);
      return top.length === 1 ? top[0] : null;
    }, 12000);
    if (!hit) fail("لم أجد مستلماً واحداً مطابقاً لـ«" + (gov ? "مدير إدارة مساجد " + gov : job.to) + "»");
    hit.click();
    const ok = await waitFor(() => [...document.querySelectorAll(".wq-chip")].some(c => norm(c.innerText).includes(want)), 6000);
    if (!ok) fail("لم يثبت المستلم في الكتاب");
    if (document.querySelectorAll("#composeForm .wq-chip").length > 1) fail("في الكتاب أكثر من مستلم، راجعه");
    return [...document.querySelectorAll(".wq-chip-name")].map(x => x.innerText.trim()).join("، ");
  }

  async function setBody(html) {
    const ed = await waitFor(() => document.querySelector(".jodit-wysiwyg"));
    if (!ed) fail("محرر النص لم يظهر");
    const ta = document.getElementById("Message");
    let done = false;
    try { const J = window.Jodit && Object.values(window.Jodit.instances || {})[0]; if (J) { J.value = html; done = true; } } catch (_) {}
    if (!done) { ed.focus(); ed.innerHTML = html; ed.dispatchEvent(new Event("input", { bubbles: true })); await sleep(300); }
    await sleep(500);
    const probe = (html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 25));
    const have = ((ta && ta.value) || ed.innerText || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    if (probe && !have.includes(probe)) { if (ta) setVal(ta, html); await sleep(300); }
    if (probe && !(((ta && ta.value) || ed.innerText || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).includes(probe)) fail("تعذّر إدخال نص الكتاب");
  }

  async function getFile(a) {
    try { const r = await fetch(a.url); if (r.ok) return new File([await r.blob()], a.name || "attachment.pdf", { type: r.headers.get("content-type") || "application/pdf" }); } catch (_) {}
    const r = await chrome.runtime.sendMessage({ type: "wq-fetch", url: a.url });
    if (!r?.ok) fail("تعذّر تنزيل المرفق " + (a.name || ""));
    const bin = atob(r.b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new File([u], a.name || "attachment.pdf", { type: r.type || "application/pdf" });
  }
  async function attach(list) {
    const inp = document.getElementById("attachmentInput"); if (!inp) fail("خانة المرفقات غير موجودة");
    for (const a of list) {
      const f = await getFile(a), dt = new DataTransfer(); dt.items.add(f); inp.files = dt.files; inp.dispatchEvent(new Event("change", { bubbles: true }));
      const key = (f.name || "").slice(0, 18);
      const ok = await waitFor(() => (document.body.innerText || "").includes(key), 60000, 400);
      if (!ok) fail("لم يظهر المرفق «" + f.name + "» بعد الرفع");
    }
  }

  async function setVisa(txt) {
    const tr = document.getElementById("archiveTypeTrigger"); if (!tr) return;
    tr.click(); await sleep(250);
    const opt = [...document.querySelectorAll("#composeForm button")].find(b => vis(b) && b.innerText.trim() === txt);
    if (!opt) fail("تأشيرة «" + txt + "» غير موجودة");
    opt.click(); await sleep(300);
  }

  async function fill(job) {
    guard(job);
    say("تعبئة الموضوع والملاحظات");
    const sub = document.getElementById("Subject"); if (!sub) fail("حقل الموضوع غير موجود");
    setVal(sub, job.subj || ""); const nt = document.getElementById("DocumentNote"); if (nt) setVal(nt, job.note || "");
    say("اختيار التأشيرة"); await setVisa(job.visa || "لعمل اللازم");
    say("اختيار المستلم"); const who = await pickRecipient(job);
    say("كتابة نص الكتاب"); await setBody(job.html || "");
    if ((job.attach || []).length) { say("رفع المرفقات"); await attach(job.attach); }
    // تدقيق أخير قبل الحفظ
    const fd = new FormData(document.getElementById("composeForm"));
    if (!String(fd.get("Subject") || "").trim()) fail("الموضوع فارغ");
    if (!String(fd.get("Message") || "").replace(/<[^>]+>/g, "").trim()) fail("نص الكتاب فارغ");
    if (job.mode === "draft" && !String(fd.get("ManagerReceivers") || "")) fail("المستلم لم يُسجَّل في المسودة");
    return who;
  }

  async function run(job) {
    try {
      const who = await fill(job);
      if (job.dry) { say("جاهز (تجربة بلا حفظ)", { done: "dry", who }); return { ok: true, dry: true, who }; }
      const btn = [...document.querySelectorAll('#composeForm button[type=submit]')].find(b => b.innerText.includes(job.mode === "send" ? "إرسال" : "حفظ المسودّة") || (job.mode === "draft" && b.innerText.includes("حفظ المسود")));
      if (!btn) fail(job.mode === "send" ? "زر «إرسال» غير موجود" : "زر «حفظ المسودّة» غير موجود");
      say(job.mode === "send" ? "جارٍ الإرسال" : "جارٍ حفظ المسودة", { submitting: true, who });
      btn.click();
      return { ok: true, submitted: true, who };
    } catch (e) { const m = e instanceof Stop ? e.message : "خطأ غير متوقع: " + (e && e.message); say("تعذّر", { error: m }); return { ok: false, error: m }; }
  }

  // بعد الحفظ أو الإرسال: يتحقق في الصفحة الناتجة أن الكتاب موجود فعلاً
  async function verify(job) {
    const key = String(job.subj || "").trim().slice(0, 30);
    if (job.mode === "draft") {
      const row = await waitFor(() => [...document.querySelectorAll("tr")].find(r => key && r.innerText.includes(key)), 15000);
      if (!row) return { ok: false, error: "لم أجد المسودة في صندوق المسودات بعد الحفظ" };
      const id = row.querySelector('input[name=draftId]')?.value || "";
      return { ok: true, ref: id ? "مسودة " + id : "مسودة" };
    }
    const m = /\/Documents\/[A-Za-z]*\/?(\d+)/.exec(location.pathname) || /(\d{3,})/.exec(location.pathname);
    const body = document.body.innerText || "";
    if (/\/Compose/.test(location.pathname)) return { ok: false, error: "بقيت الصفحة في النموذج ولم يُقبل الإرسال" };
    return { ok: true, ref: m ? "كتاب " + m[1] : (key && body.includes(key) ? "أُرسل" : "أُرسل (تحقق من صندوق الصادر)") };
  }

  chrome.runtime.onMessage.addListener((msg, _s, reply) => {
    if (msg?.type === "wq-ping") { reply({ ok: true, path: location.pathname + location.search }); return; }
    if (msg?.type === "wq-fill") { run(msg.job).then(reply); return true; }
    if (msg?.type === "wq-verify") { verify(msg.job).then(reply); return true; }
  });
})();
