// Runs inside Microsoft 365 Copilot when it is embedded in the Jaliyat system (v1.1):
// attach files, send questions, and hand replies back to the system.
(function () {
  if (window.top === window) return;
  const ORIGIN = "https://yalabdullmohsen.github.io";
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const editor = () => document.getElementById("m365-chat-editor-target-element") || document.querySelector('[role="textbox"][contenteditable="true"]');
  const sendBtn = () => document.querySelector('button[aria-label="Send"], button[aria-label="إرسال"], button[data-testid="sendButton"]');
  const replies = () => [...document.querySelectorAll('[data-testid="markdown-reply"]')];
  const busy = () => !!document.querySelector('[data-testid="loading-message"]') || !!document.querySelector('button[aria-label="Stop generating"], button[aria-label="إيقاف"]');
  const post = m => { try { window.parent.postMessage(m, ORIGIN); } catch (e) {} };
  async function waitFor(fn, ms = 20000) { const t = Date.now(); while (Date.now() - t < ms) { const x = fn(); if (x) return x; await sleep(250); } return null; }
  async function attach(file) {
    const inp = await waitFor(() => document.getElementById("upload-file-button"), 10000); if (!inp) return false;
    const f = new File([file.content], file.name, { type: file.type || "text/markdown" });
    const dt = new DataTransfer(); dt.items.add(f); inp.files = dt.files; inp.dispatchEvent(new Event("change", { bubbles: true }));
    await sleep(1500);
    await waitFor(() => { const b = sendBtn(); return b && !b.disabled && b.getAttribute("aria-disabled") !== "true" ? b : null; }, 60000);
    return true;
  }
  async function ask(text, file) {
    const ed = await waitFor(editor); if (!ed) return post({ type: "jaliyat-copilot-error", e: "editor" });
    if (file) { post({ type: "jaliyat-copilot-status", s: "uploading" }); await attach(file); }
    ed.focus();
    const sel = window.getSelection(), rg = document.createRange(); rg.selectNodeContents(ed); sel.removeAllRanges(); sel.addRange(rg);
    document.execCommand("insertText", false, text);
    await sleep(400);
    const before = replies().length;
    const b = await waitFor(() => { const x = sendBtn(); return x && !x.disabled && x.getAttribute("aria-disabled") !== "true" ? x : null; }, 15000);
    if (b) b.click(); else ed.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
    post({ type: "jaliyat-copilot-sent" });
    // wait for the reply to finish, then hand it back
    await waitFor(() => replies().length > before, 120000);
    let last = "", stable = 0;
    for (let i = 0; i < 600 && stable < 6; i++) { await sleep(500); const cur = (replies().pop()?.innerText || ""); if (cur && cur === last && !busy()) stable++; else stable = 0; last = cur; }
    post({ type: "jaliyat-reply", text: last });
  }
  window.addEventListener("message", e => {
    if (e.origin !== ORIGIN) return;
    const d = e.data || {};
    if (d.type === "jaliyat-ask" && typeof d.text === "string") ask(d.text, d.file);
    if (d.type === "jaliyat-get-last") post({ type: "jaliyat-last", text: replies().pop()?.innerText || "" });
  });
  waitFor(editor).then(ed => post({ type: ed ? "jaliyat-copilot-ready" : "jaliyat-copilot-error", v: "1.1" }));
})();
