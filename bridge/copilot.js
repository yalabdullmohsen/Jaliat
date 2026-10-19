// Runs inside Microsoft 365 Copilot when it is embedded in the Jaliyat system: receives questions and sends them.
(function () {
  if (window.top === window) return;
  const ORIGIN = "https://yalabdullmohsen.github.io";
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const editor = () => document.getElementById("m365-chat-editor-target-element") || document.querySelector('[role="textbox"][contenteditable="true"]');
  const sendBtn = () => document.querySelector('button[aria-label="Send"], button[aria-label="إرسال"], button[data-testid="sendButton"]');
  async function waitFor(fn, ms = 20000) { const t = Date.now(); while (Date.now() - t < ms) { const x = fn(); if (x) return x; await sleep(250); } return null; }
  async function ask(text) {
    const ed = await waitFor(editor); if (!ed) return post({ type: "jaliyat-copilot-error", e: "editor" });
    ed.focus();
    const sel = window.getSelection(), rg = document.createRange(); rg.selectNodeContents(ed); sel.removeAllRanges(); sel.addRange(rg);
    document.execCommand("insertText", false, text);
    await sleep(400);
    const b = await waitFor(() => { const x = sendBtn(); return x && !x.disabled && x.getAttribute("aria-disabled") !== "true" ? x : null; }, 8000);
    if (b) { b.click(); post({ type: "jaliyat-copilot-sent" }); }
    else { ed.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true })); post({ type: "jaliyat-copilot-sent" }); }
  }
  function post(m) { try { window.parent.postMessage(m, ORIGIN); } catch (e) {} }
  window.addEventListener("message", e => { if (e.origin !== ORIGIN) return; if (e.data?.type === "jaliyat-ask" && typeof e.data.text === "string") ask(e.data.text); });
  waitFor(editor).then(ed => post({ type: ed ? "jaliyat-copilot-ready" : "jaliyat-copilot-error" }));
})();
