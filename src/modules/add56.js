/* ===== v69: light sidebar flag (light theme only) + «جديد» list capped ===== */
(function(){ const set = () => { const t = document.documentElement.dataset.theme, dark = t === "dark" || (!t || t === "auto") && matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("side-lt", !dark); };
  set(); try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", set); } catch (_) {}
  new MutationObserver(set).observe(document.documentElement, { attributes:true, attributeFilter:["data-theme"] }); })();
const _nfTip69 = nfTip;
nfTip = function(f, el){ const L = String(f[3] || "").split("\n");
  if (L.length > 6) f = [f[0], f[1], f[2], L.slice(0, 6).join("\n") + `\n… و${L.length - 6} غيرها في «سجل التحديثات»`];
  return _nfTip69(f, el); };
