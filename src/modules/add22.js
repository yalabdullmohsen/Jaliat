/* ================= v22: instant start (last data shown at once, refreshed in the background) + lighter loading ================= */
const LC_KEY = () => "enjaz-c1-" + (S.me?.id || "");
const LC_TABS = ["acts", "khatibs", "notes", "refs"];
function lcApply(rows){ S.acts.clear(); S.khatibs.clear(); S.notes.clear(); LC_TABS.forEach((t, i) => { (rows[i] || []).forEach(r => putRow(t, r)); if (t !== "refs") S.got.add(t); }); ["mosques", "docs", "comms", "coords"].forEach(r => S.got.add(r)); }
function lcSave(rows){ try { localStorage.setItem(LC_KEY(), JSON.stringify({ at:Date.now(), rows })); } catch (_) {} }
function lcRead(){ try { const c = JSON.parse(localStorage.getItem(LC_KEY()) || "null"); return c && Date.now() - c.at < 14 * 864e5 ? c.rows : null; } catch (_) { return null; } }
async function lcFetch(){ const res = await Promise.all(LC_TABS.map(t => sb.from(t).select("*").limit(5000))); const err = res.find(r => r.error); if (err) throw err.error; return res.map(r => r.data); }
let lcFirst = true;
loadAll = async function(){
  const cached = lcFirst ? lcRead() : null; lcFirst = false;
  if (cached && cached[3]?.length) {
    lcApply(cached);
    lcFetch().then(rows => { lcApply(rows); lcSave(rows); derive(); if ($("#drawer").hidden && !$("#bell-pop")) render(); }).catch(() => {});
    return false;
  }
  const rows = await lcFetch(); lcApply(rows); lcSave(rows); return rows[3].length === 0;
};
// a signed-out device keeps nothing behind
const _showLogin22 = showLogin;
showLogin = function(msg){ try { Object.keys(localStorage).filter(k => k.startsWith("enjaz-c1-")).forEach(k => localStorage.removeItem(k)); } catch (_) {} return _showLogin22(msg); };

/* Excel library: loaded only when it is needed (it was ~900 KB on every start) */
let xlsxP = null;
function loadXLSX(){ return window.XLSX ? Promise.resolve() : (xlsxP ||= loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js").catch(e => { xlsxP = null; throw e; })); }
const _boot9xl22 = boot9;
boot9 = function(){ _boot9xl22(); const idle = window.requestIdleCallback || (f => setTimeout(f, 1)); setTimeout(() => idle(() => loadXLSX().catch(() => {})), 8000); };
document.addEventListener("pointerdown", ev => { if (ev.target.closest('[data-xlsx],[data-export],[data-exp],[id*="xls"],[data-wkxls]')) loadXLSX().catch(() => {}); }, true);
