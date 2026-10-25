// Runs inside Microsoft 365 Copilot when it is embedded in the Jaliyat system (v2.0).
// All page selectors and timings are settings sent by the system, so Copilot UI changes are fixed from the system
// without reinstalling this bridge. No remote code is ever executed — only CSS selectors and numbers are accepted.
(function () {
  if (window.top === window) return;
  const ORIGINS = ["https://injazkwt.com", "https://yalabdullmohsen.github.io"];
  const ORIGIN = (location.ancestorOrigins && [...location.ancestorOrigins].find(o => ORIGINS.includes(o))) || ORIGINS.find(o => document.referrer.startsWith(o)) || ORIGINS[0];
  const CFG = {
    editor: ["#m365-chat-editor-target-element", '[role="textbox"][contenteditable="true"]', 'textarea[placeholder]'],
    send: ['button[aria-label="Send"]', 'button[aria-label="إرسال"]', 'button[data-testid="sendButton"]', 'button[type="submit"]'],
    reply: ['[data-testid="markdown-reply"]', '[data-content="ai-message"]'],
    busy: ['[data-testid="loading-message"]', 'button[aria-label="Stop generating"]', 'button[aria-label="إيقاف"]', 'button[aria-label="Stop"]'],
    upload: ["#upload-file-button", 'input[type="file"]'],
    newchat: ['button[aria-label="New chat"]', 'button[aria-label="محادثة جديدة"]', 'button[data-testid="newChatButton"]'],
    stableTicks: 6, replyWait: 180000, uploadWait: 60000
  };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const q1 = k => { for (const s of CFG[k]) { try { const el = document.querySelector(s); if (el) return el; } catch (e) {} } return null; };
  const qa = k => { for (const s of CFG[k]) { try { const L = document.querySelectorAll(s); if (L.length) return [...L]; } catch (e) {} } return []; };
  const enabled = b => b && !b.disabled && b.getAttribute("aria-disabled") !== "true";
  const busy = () => !!q1("busy");
  const post = m => { try { window.parent.postMessage(m, ORIGIN); } catch (e) {} };
  async function waitFor(fn, ms = 20000) { const t = Date.now(); while (Date.now() - t < ms) { const x = fn(); if (x) return x; await sleep(250); } return null; }
  function setCfg(c) {
    if (!c || typeof c !== "object") return;
    for (const k of ["editor", "send", "reply", "busy", "upload", "newchat"]) if (Array.isArray(c[k])) { const v = c[k].filter(s => typeof s === "string" && s.length < 300).slice(0, 12); if (v.length) CFG[k] = v; }
    for (const k of ["stableTicks", "replyWait", "uploadWait"]) if (Number.isFinite(c[k]) && c[k] > 0 && c[k] < 900000) CFG[k] = c[k];
  }
  async function attach(file) {
    const inp = await waitFor(() => q1("upload"), 10000); if (!inp) return false;
    const f = new File([file.content], file.name, { type: file.type || "text/markdown" });
    const dt = new DataTransfer(); dt.items.add(f); inp.files = dt.files; inp.dispatchEvent(new Event("change", { bubbles: true }));
    await sleep(1500); await waitFor(() => enabled(q1("send")) ? 1 : null, CFG.uploadWait);
    return true;
  }
  async function ask(text, file) {
    const ed = await waitFor(() => q1("editor")); if (!ed) return post({ type: "jaliyat-copilot-error", e: "editor" });
    if (file) { post({ type: "jaliyat-copilot-status", s: "uploading" }); await attach(file); }
    ed.focus();
    if (ed.tagName === "TEXTAREA") { const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set; set.call(ed, text); ed.dispatchEvent(new Event("input", { bubbles: true })); }
    else { const sel = window.getSelection(), rg = document.createRange(); rg.selectNodeContents(ed); sel.removeAllRanges(); sel.addRange(rg); document.execCommand("insertText", false, text); }
    await sleep(400);
    const before = qa("reply").length;
    const b = await waitFor(() => { const x = q1("send"); return enabled(x) ? x : null; }, 15000);
    if (b) b.click(); else ed.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
    post({ type: "jaliyat-copilot-sent" });
    await waitFor(() => qa("reply").length > before, CFG.replyWait);
    let last = "", stable = 0;
    for (let i = 0; i < 900 && stable < CFG.stableTicks; i++) { await sleep(500); const cur = (qa("reply").pop()?.innerText || ""); if (cur && cur === last && !busy()) stable++; else stable = 0; last = cur; }
    post({ type: "jaliyat-reply", text: last });
  }
  let started = false;
  async function start() { if (started) return; started = true; const ed = await waitFor(() => q1("editor"), 30000); post({ type: ed ? "jaliyat-copilot-ready" : "jaliyat-copilot-error", v: "2.0" }); }
  window.addEventListener("message", e => {
    if (!ORIGINS.includes(e.origin)) return;
    const d = e.data || {};
    if (d.type === "jaliyat-config") { setCfg(d.cfg); start(); }
    if (d.type === "jaliyat-ask" && typeof d.text === "string") ask(d.text, d.file);
    if (d.type === "jaliyat-get-last") post({ type: "jaliyat-last", text: qa("reply").pop()?.innerText || "" });
    if (d.type === "jaliyat-new") { const b = q1("newchat"); if (b) b.click(); post({ type: "jaliyat-new-done", ok: !!b }); }
    if (d.type === "jaliyat-ping") post({ type: "jaliyat-pong", v: "2.0", editor: !!q1("editor") });
  });
  post({ type: "jaliyat-copilot-hello", v: "2.0" });
  setTimeout(start, 2500); // works with default settings even if the system sends none
})();
