/* ================= v32: «استقبال طلب»، خياران: إرفاق ملف/صورة، أو لصق نص → إدخال تلقائي مع تأكيد ================= */
const _intakeOpen32 = intakeOpen;
intakeOpen = function(files){ _intakeOpen32(files); if (S.form?.kind !== "intake") return; S.form.mode = "file";
  $(".drawer-b")?.insertAdjacentHTML("afterbegin", `<div class="seg iz-tabs" id="iz-tabs"><button type="button" class="on" data-izmode="file">📎 إرفاق ملف أو صورة</button><button type="button" data-izmode="paste">📋 لصق نص</button></div>
    <div id="iz-paste" hidden><div class="iz-pbar"><button type="button" class="btn" data-izclip>📋 لصق من الحافظة</button><span class="s">انسخ نص الطلب (من الواتساب أو الإيميل أو أي مكان) والصقه هنا</span></div>
    <textarea class="f" id="iz-text" rows="9" placeholder="مثال:&#10;الجالية الفلبينية، مسجد العثمان، حولي&#10;درس ديني كل اثنين وأربعاء بعد صلاة المغرب&#10;المحاضر: الشيخ عبدالله&#10;المنسق: محمد، 99xxxxxx"></textarea></div>`); };
function izMode(m){ S.form.mode = m; document.querySelectorAll("#iz-tabs button").forEach(b => b.classList.toggle("on", b.dataset.izmode === m));
  const P = $("#iz-paste"); if (P) P.hidden = m !== "paste"; for (const s of ["#iz", "#iz-files", ".iz-mode"]) { const e = $(s); if (e) e.hidden = m === "paste"; }
  izBtn(); if (m === "paste") $("#iz-text")?.focus(); }
function izBtn(){ const b = $("#iz-go"); if (!b) return; b.disabled = S.form?.mode === "paste" ? !($("#iz-text")?.value.trim().length > 5) : !INTAKE.files.length; }
async function izClip(){ try { const t = await navigator.clipboard.readText(); if (!t.trim()) return toast("الحافظة فاضية، انسخ النص أولاً"); const a = $("#iz-text"); a.value = (a.value ? a.value + "\n" : "") + t; izBtn(); toast("تم اللصق ✓"); }
  catch (_) { $("#iz-text")?.focus(); toast("اضغط داخل المربع ثم الصق (⌘V أو مطوّلاً ← لصق)"); } }
async function intakePaste(){ const text = $("#iz-text").value.trim(), note = $("#iz-note")?.value.trim() || ""; if (text.length < 6) return toast("الصق نص الطلب أولاً");
  const b = $("#iz-go"); b.disabled = true; b.textContent = "جارٍ الإدخال…";
  const acts = parseActs(text).acts.map(a => tolAct(a));
  const coordM = text.match(/(?:المنسق|منسق الجالية|مقدم الطلب|الموقع|الاسم)[:\s\-–—]*([؀-ۿ]+(?:\s+[؀-ۿ]+){1,3})/), phoneM = digits(text).match(/\b(?:\+?965)?\s*([569]\d{7})\b/);
  const rid = crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
  const data = { date:TODAY, notes:note, acts, comm:acts[0]?.comm || "", coord:coordM?.[1] || "", phone:phoneM?.[1] || "", text:text.slice(0, 20000), src:"paste" };
  const { error } = await sb.from("requests").insert({ id:rid, data, status:"جديد", files:[] });
  if (error) { b.disabled = false; b.textContent = "تحليل وإدخال تلقائي"; return writeFail(error); }
  await loadReqs(); closeDrawer(); if (S.view !== "inbox") go("inbox"); reqForm(rid);
  const r = S.reqs.find(x => x.id === rid);
  const msg = `✓ تم إدخال الطلب${r?.no ? " ط-" + r.no : ""}: ${acts.length ? `${acts.length} نشاط${data.comm ? "، الجالية " + data.comm : ""}` : "حُفظ النص، أكمل الأنشطة يدوياً"}${data.phone ? " · رقم المنسق ✓" : ""}`;
  toast(msg); setTimeout(() => $(".drawer-b")?.insertAdjacentHTML("afterbegin", `<div class="check ok iz-done"><b>${esc(msg)}</b><span>راجع البيانات أدناه وعدّل أي شيء ناقص.</span></div>`), 50);
}
const _intakeGo32 = intakeGo;
intakeGo = function(){ return S.form?.mode === "paste" ? intakePaste() : _intakeGo32(); };
document.addEventListener("click", ev => { const t = ev.target.closest("button"); if (!t) return; const D = t.dataset;
  if (D.izmode) return izMode(D.izmode);
  if (D.izclip !== undefined) return izClip();
});
document.addEventListener("input", ev => { if (ev.target.id === "iz-text") izBtn(); });
document.addEventListener("paste", ev => { if (S.form?.kind === "intake" && S.form.mode !== "paste" && !ev.clipboardData?.files?.length) { const t = ev.clipboardData?.getData("text"); if (t && t.trim().length > 5) { izMode("paste"); const a = $("#iz-text"); if (a && !a.value) { a.value = t; izBtn(); ev.preventDefault(); } } } });
NEWF.splice(1, 0, ["v32-paste", "nav:inbox", "لصق نص الطلب", "في «استقبال طلب»: خيار جديد «لصق نص»، الصق الطلب من الواتساب أو الإيميل واضغط «إدخال تلقائي»، فيُسجَّل الطلب وأنشطته ويظهر لك تأكيد.", false, "2026-10-20"]);
/* «الاقتراحات»، أسفل القائمة تحت «خروج»: اقتراح سريع يصل لرئيس القسم */
(function(){ const lo = document.getElementById("logout"); if (!lo || document.getElementById("sugg-btn")) return;
  lo.parentElement.insertAdjacentHTML("afterend", `<button class="btn sugg-btn" id="sugg-btn" type="button">💡 <span>الاقتراحات</span></button>`); })();
document.addEventListener("click", ev => { if (ev.target.closest("#sugg-btn")) { $("#side")?.classList.remove("open"); recForm(null, { kind:"مقترح تطوير" }); } });
NEWF.splice(1, 0, ["v32-sugg", "id:sugg-btn", "الاقتراحات", "أسفل القائمة: اكتب اقتراحك لتطوير العمل أو النظام، ويصل لرئيس القسم مباشرة ويتابعه في «التوصيات».", false, "2026-10-20"]);
