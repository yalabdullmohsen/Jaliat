/* ===== v59: «الحفظ في OneDrive» for every employee: a complete copy of the system saved straight into the OneDrive folder on their own computer ===== */
/* works without any Microsoft permission from IT: the browser writes into the employee's synced OneDrive folder and OneDrive uploads it.
   one-time step per computer: choose the OneDrive folder. after that it saves by itself once a day when إنجاز is opened, and on demand. */
Object.assign(TITLES, { odsave:"الحفظ في OneDrive" });
const ODX = { h:null, busy:false, err:"", last:null, saves:[], perm:"" };
const ODX_DIR = "إنجاز - نسخة احتياطية", ODX_DAY = 20 * 36e5, odxOK = () => "showDirectoryPicker" in window;
function odxDB(){ return new Promise((ok, no) => { const r = indexedDB.open("enjaz-od", 1); r.onupgradeneeded = () => r.result.createObjectStore("kv"); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); }); }
async function odxGet(k){ try { const db = await odxDB(); return await new Promise(ok => { const q = db.transaction("kv").objectStore("kv").get(k); q.onsuccess = () => ok(q.result); q.onerror = () => ok(null); }); } catch (_) { return null; } }
async function odxSet(k, v){ try { const db = await odxDB(); await new Promise(ok => { const t = db.transaction("kv", "readwrite"); t.objectStore("kv").put(v, k); t.oncomplete = ok; t.onerror = ok; }); } catch (_) {} }
async function odxLoad(){ ODX.h = await odxGet("dir"); ODX.last = await odxGet("last");
  if (ODX.h) { try { ODX.perm = await ODX.h.queryPermission({ mode:"readwrite" }); } catch (_) { ODX.perm = "prompt"; } }
  const { data } = await sb.from("od_saves").select("*").order("at", { ascending:false }).limit(40); ODX.saves = data || []; }
async function odxPick(){ try { const h = await window.showDirectoryPicker({ id:"enjaz-onedrive", mode:"readwrite", startIn:"documents" }); ODX.h = h; ODX.perm = "granted"; await odxSet("dir", h); return true; }
  catch (e) { if (e?.name !== "AbortError") toast("تعذّر اختيار المجلد"); return false; } }
async function odxWrite(dir, name, data){ const f = await dir.getFileHandle(name, { create:true }), w = await f.createWritable(); await w.write(data); await w.close(); return data.byteLength ?? data.size ?? 0; }
const odxStamp = () => new Date().toLocaleString("ar-KW-u-nu-latn", { dateStyle:"full", timeStyle:"short", hour12:true });
async function odxBundle(){
  const { data, error } = await sb.rpc("team_backup"); if (error) throw error;
  let xl = null; try { await loadXLSX(); } catch (_) { try { await loadXLSX(); } catch (_) {} }
  const js = new TextEncoder().encode(JSON.stringify(data));
  if (window.XLSX) { const wb = XLSX.utils.book_new(); wb.Workbook = { Views:[{ RTL:true }] };
  const flat = r => { const o = {}; const src = r.data && typeof r.data === "object" && !Array.isArray(r.data) ? { id:r.id, ...r.data } : r;
    for (const [k, v] of Object.entries(src)) { const s = v && typeof v === "object" ? JSON.stringify(v) : v; o[k] = typeof s === "string" && s.length > 32000 ? s.slice(0, 32000) : s; } return o; };
  const used = new Set();
  for (const [t, rows] of Object.entries(data.tables || {})) { if (!rows?.length) continue;
    if (t === "refs") { for (const r of rows) if (r.data?.list?.length) { const n = ("قائمة " + r.id).slice(0, 31); if (!used.has(n)) { used.add(n); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(r.data.list.map(x => typeof x === "object" ? flat(x) : { v:x })), n); } } continue; }
    const n = t.slice(0, 31); if (used.has(n)) continue; used.add(n); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.map(flat)), n); }
  xl = new Uint8Array(XLSX.write(wb, { type:"array", bookType:"xlsx" })); }
  const sys = []; for (const f of ["index.html", "portal.html", "auth.html", "sw.js", "manifest.webmanifest", "README.md"]) { try { const r = await fetch(f, { cache:"no-store" }); if (r.ok) sys.push([f, new Uint8Array(await r.arrayBuffer())]); } catch (_) {} }
  return { xl, js, sys, n:Object.values(data.tables || {}).reduce((a, r) => a + (r?.length || 0), 0), t:Object.keys(data.tables || {}).length }; }
/* the files of one complete copy, written by any target (ministry OneDrive via Microsoft, or a OneDrive folder on the computer) */
const XT59 = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
async function odxWriteAll(put, who){ const B = await odxBundle(), day = TODAY;
  if (B.xl) { await put("", "آخر نسخة - كل البيانات.xlsx", B.xl, XT59); await put("نسخ يومية", `إنجاز ${day}.xlsx`, B.xl, XT59); }
  await put("", "آخر نسخة - كل البيانات.json", B.js, "application/json"); await put("نسخ يومية", `إنجاز ${day}.json`, B.js, "application/json");
  for (const [n, x] of B.sys) await put("ملفات النظام", n, x, "application/octet-stream");
  await put("", "آخر حفظ.txt", new TextEncoder().encode(`نظام «إنجاز»، نسخة احتياطية كاملة\nآخر حفظ: ${odxStamp()}\nبواسطة: ${S.me?.name || ""}${who ? " (" + who + ")" : ""}\nالجداول: ${B.t} · السجلات: ${B.n}\n\n«آخر نسخة - كل البيانات.xlsx»: كل بيانات النظام، كل جدول في ورقة.\n«آخر نسخة - كل البيانات.json»: النسخة الكاملة للاسترجاع.\n«نسخ يومية»: نسخة لكل يوم.\n«ملفات النظام»: الموقع وبوابة إنجاز.\n`), "text/plain; charset=utf-8");
  return B; }
async function odxDone(files, bytes, place){ ODX.last = new Date().toISOString(); await odxSet("last", ODX.last); ODX.place = place; await odxSet("place", place);
  try { await odCfgSave({ last:ODX.last, files, acct:MS.account?.username || OD.cfg?.acct || "", by:S.me?.name || "", freq:"d1" }); } catch (_) {}
  const { data } = await sb.from("od_saves").insert({ files, bytes, place }).select().single(); if (data) ODX.saves = [data, ...ODX.saves.filter(s => s.id !== data.id)]; }
/* 1) the ministry OneDrive account (Microsoft sign-in once; silent afterwards) */
async function odxGraph(interactive){ if (typeof msReady !== "function" || !msReady()) throw new Error("signin");
  await msInit(); await msToken(interactive, OD.scope);
  let bytes = 0, files = 0; await odxWriteAll(async (sub, n, x, t) => { await odPut([OD.dir, sub, n].filter(Boolean).join("/"), x, t); bytes += x.byteLength || 0; files++; }, MS.account?.username);
  await odxDone(files, bytes, "OneDrive: " + (MS.account?.username || "")); return files; }
/* 2) a OneDrive folder on this computer (no Microsoft sign-in) */
async function odxFolder(interactive){ if (!odxOK()) throw new Error("nofolder");
  if (!ODX.h) { if (!interactive || !(await odxPick())) throw new Error("nofolder"); }
  let p = await ODX.h.queryPermission({ mode:"readwrite" }); if (p !== "granted" && interactive) p = await ODX.h.requestPermission({ mode:"readwrite" }); ODX.perm = p; if (p !== "granted") throw new Error("perm");
  const root = await ODX.h.getDirectoryHandle(ODX_DIR, { create:true }), dirs = { "":root }; let bytes = 0, files = 0;
  await odxWriteAll(async (sub, n, x) => { const d = dirs[sub] ||= await root.getDirectoryHandle(sub, { create:true }); bytes += await odxWrite(d, n, x); files++; });
  await odxDone(files, bytes, "مجلد: " + ODX.h.name); return files; }
async function odxSave(manual, how){
  if (ODX.busy) return; ODX.busy = true; ODX.err = ""; odxPaint();
  try { let n;
    if (how === "folder") n = await odxFolder(true);
    else { try { n = await odxGraph(manual); }
      catch (e) { if (ODX.h && odxOK()) n = await odxFolder(manual); else throw e; } }
    toast(`✓ حُفظت نسخة كاملة في OneDrive (${n} ملف)`); }
  catch (e) { const raw = String(e?.message || e?.errorCode || e || ""), m = typeof msErr === "function" ? msErr(e)?.t : "";
    ODX.err = /signin|interaction|login|no_account/i.test(raw) ? "سجّل دخولك بحساب الوزارة مرة واحدة من زر «احفظ الآن»." : (m || raw.slice(0, 160)).replace(/Copilot/g, "OneDrive");
    if (manual) toast("تعذّر الحفظ: " + ODX.err); console.warn("odx", e); }
  finally { ODX.busy = false; odxPaint(); } }
async function odxDownload(){ ODX.busy = true; odxPaint(); try { const B = await odxBundle(), day = TODAY;
  for (const [n, x, t] of [...(B.xl ? [[`إنجاز ${day}.xlsx`, B.xl, XT59]] : []), [`إنجاز ${day}.json`, B.js, "application/json"]]) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([x], { type:t })); a.download = n; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
  toast("✓ نُزّلت النسخة"); } catch (e) { toast("تعذّر: " + String(e?.message || e).slice(0, 120)); } finally { ODX.busy = false; odxPaint(); } }
function odxPaint(){ if (S.view === "odsave" && $("#drawer").hidden) render(); odxBadge(); }
const odxDue = () => !ODX.last || Date.now() - new Date(ODX.last).getTime() > ODX_DAY;
function odxBadge(){ const b = $('#nav [data-nav="odsave"]'); if (b) b.classList.toggle("odx-due", odxDue()); }
const odxFmt = d => new Date(d).toLocaleString("ar-KW-u-nu-latn", { dateStyle:"full", timeStyle:"short", hour12:true });
function vOdSave(){ const acct = MS.account?.username || OD.cfg?.acct || "", ok = !odxDue();
  const st = ODX.busy ? ["جارٍ حفظ نسخة كاملة في OneDrive…", ""] : ODX.err ? ["لم يكتمل آخر حفظ", "bad"] : ok ? ["محفوظ ✓ ويتحدّث وحده كل يوم عند فتح إنجاز", "ok"] : ["لم تُحفظ نسخة اليوم بعد، اضغط «احفظ الآن»", "warn"];
  const ppl = new Map(); for (const s of ODX.saves) if (s.user_id && !ppl.has(s.user_id)) ppl.set(s.user_id, s);
  return `<div class="odx panel"><div class="panel-b">
    <div class="odx-h"><div class="odx-i ${st[1]}">${ODX.busy ? `<span class="spin"></span>` : st[1] === "ok" ? "✓" : "!"}</div><div><b>نسخة كاملة من إنجاز في OneDrive</b><span>${esc(st[0])}</span></div></div>
    <div class="odx-g"><div><small>آخر حفظ</small><b>${ODX.last ? esc(odxFmt(ODX.last)) : "لم تحفظ بعد"}</b></div><div><small>مكان الحفظ</small><b>${esc(ODX.place || (acct ? "OneDrive: " + acct : "OneDrive حساب الوزارة"))} ← مجلد «${esc(ODX.place?.startsWith("مجلد") ? ODX_DIR : OD.dir)}»</b></div></div>
    <div class="odx-a"><button type="button" class="btn btn-primary" data-odx="save" ${ODX.busy ? "disabled" : ""}>احفظ الآن</button></div>
    ${ODX.err ? `<div class="check bad"><b>لم يكتمل الحفظ</b><span>${esc(ODX.err)}</span>${odxOK() ? `<button type="button" class="btn" data-odx="folder" style="margin-top:8px">احفظ في مجلد OneDrive على هذا الجهاز بدلاً من ذلك</button>` : `<button type="button" class="btn" data-odx="dl" style="margin-top:8px">تنزيل النسخة لجهازك</button>`}</div>` : ""}
    <details class="odx-d"><summary>ماذا يُحفظ؟</summary><span>كل جداول النظام (الأنشطة، الخطباء، المنسقون، الجاليات، المساجد، الطلبات، كتب وثيقة، التصاريح، الخطب، المهام، البوابة والمزيد) في ملف إكسل كل جدول بورقة، ونسخة JSON كاملة للاسترجاع، ونسخة لكل يوم في «نسخ يومية»، وملفات الموقع وبوابة إنجاز في «ملفات النظام»، وملف «آخر حفظ.txt» بوقت آخر نسخة. لا تُحفظ الرموز السرية وكلمات المرور.</span></details></div></div>
    <div class="panel"><div class="panel-b"><b>آخر حفظ لكل موظف</b><div class="list" style="margin-top:8px">${[...ppl.values()].map(s => `<div class="li"><span class="t">${esc(pname(s.user_id))}</span><span class="num">${s.at ? esc(odxFmt(s.at)) : ""} · ${s.files} ملف</span></div>`).join("") || `<div class="empty">لم يحفظ أحد بعد</div>`}</div></div></div>`; }
document.addEventListener("click", ev => { const t = ev.target.closest("[data-odx]"); if (!t) return; const k = t.dataset.odx;
  if (k === "dl") return odxDownload(); if (k === "folder") return odxSave(true, "folder"); odxSave(true); });
/* automatic: once a day for every employee when إنجاز opens (silent); if the sign-in expired, a single button appears */
async function odxAuto(){ await odxLoad(); ODX.place = await odxGet("place");
  if (!ODX.last) { await odCfgLoad().catch(() => {}); if (OD.cfg?.last) ODX.last = OD.cfg.last; }
  odxBadge(); if (!odxDue()) return;
  await odxSave(false); if (!odxDue()) return;
  if (!$("#odx-bar")) document.body.insertAdjacentHTML("beforeend", `<button type="button" id="odx-bar" data-odx="save">☁︎ احفظ نسخة اليوم في OneDrive</button>`); }
document.addEventListener("click", ev => { if (ev.target.closest("#odx-bar")) setTimeout(() => $("#odx-bar")?.remove(), 50); }, true);
/* the old admin-only uploader now uses the same complete copy */
odAuto = async function(){}; odRun = function(manual){ return odxSave(!!manual); };
const _boot959 = boot9; boot9 = function(){ _boot959(); setTimeout(() => odxAuto().catch(e => console.warn("odx auto", e)), 5000); };
const _afterRender59 = afterRender; afterRender = function(v){ _afterRender59(v); odxBadge(); if (v === "odsave" && !ODX._l) { ODX._l = 1; Promise.all([odxLoad(), odxGet("place").then(p => ODX.place = p), odCfgLoad().catch(() => {})]).then(() => { if (!ODX.last && OD.cfg?.last) ODX.last = OD.cfg.last; if (S.view === "odsave") render(); }); } };
NEWF.splice(1, 0, ["v59-odx", "nav:odsave", "الحفظ في OneDrive لكل موظف", "كل موظف يحفظ نسخة كاملة من النظام في OneDrive حسابه بالوزارة، وتتحدّث وحدها كل يوم عند فتح إنجاز. ويظهر آخر حفظ لكل موظف.", false, "2026-10-21"]);
