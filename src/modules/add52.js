/* ===== v63: issue a permit from the letter: attach the letter (PDF / photo) or pick it from Watheqa, the AI reads it and fills the permit, then one press «إصدار التصريح» ===== */
const PR = { items:[], meta:null, busy:false };
const _permitForm63 = permitForm;
permitForm = function(preset, grant){ _permitForm63(preset, grant); if (S.form?.kind !== "permit") return; PR.items = []; PR.meta = null;
  const L = (S.wq || []).filter(w => w.kind === "موافقة" || (w.dir === "in" && w.approval)).sort((a, b) => wqDate(b).localeCompare(wqDate(a))).slice(0, 40);
  $(".drawer-b")?.insertAdjacentHTML("afterbegin", `<div class="pr-ai">
    <div class="pr-h"><b>✨ تعبئة تلقائية من الكتاب</b><span>أرفق كتاب الموافقة، أو اختره من وثيقة، فيقرؤه الذكاء الاصطناعي ويعبّئ التصريح، ثم اضغط «إصدار التصريح».</span></div>
    <div class="pr-row"><label class="btn btn-primary pr-up">📎 أرفق الكتاب (PDF أو صورة)<input type="file" id="pr-file" accept="application/pdf,image/*" hidden></label>
      ${L.length ? `<select class="f" id="pr-wq"><option value="">أو اختر كتاب موافقة من وثيقة…</option>${L.map(w => `<option value="${esc(w.id)}">${esc(w.no || "")} · ${esc((w.subj || "").slice(0, 60))}</option>`).join("")}</select>` : ""}</div>
    <div id="pr-st" class="pr-st" hidden></div><div id="pr-items" class="pr-items" hidden></div></div>`); };
const b64of = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1] || ""); r.onerror = () => no(r.error); r.readAsDataURL(f); });
async function prSmall(f){ if (!f.type.startsWith("image/") || f.size < 1.5e6 || typeof compressImg !== "function") return f; try { const { blob } = await compressImg(f, 2000, .85); return new File([blob], f.name, { type:"image/jpeg" }); } catch (_) { return f; } }
function prSt(t, cls){ const e = $("#pr-st"); if (!e) return; e.hidden = !t; e.className = "pr-st " + (cls || ""); e.innerHTML = t || ""; }
async function prRead(body){ if (PR.busy) return; PR.busy = true; prSt(`<span class="spin"></span> يقرأ الذكاء الاصطناعي الكتاب… (ثوانٍ)`);
  try { const { data, error } = await sb.functions.invoke("doc-read", { body }); if (error || data?.error) throw new Error(data?.error || (await error?.context?.json?.().catch(() => null))?.error || error?.message);
    PR.meta = data; PR.items = (data.items || []).filter(x => x && (x.sheikh || x.mosque));
    if (!PR.items.length) { prSt("لم أجد في الكتاب بيانات درس (شيخ أو مسجد). عبّئ الحقول يدوياً.", "warn"); return; }
    prFill(0); const box = $("#pr-items");
    if (PR.items.length > 1 && box) { box.hidden = false; box.innerHTML = `<span class="s">في الكتاب ${PR.items.length} دروس، اختر الدرس:</span>${PR.items.map((x, i) => `<button type="button" class="pr-i${i ? "" : " on"}" data-pri="${i}"><b>${esc(x.sheikh || "—")}</b><span>${esc(x.mosque || "")}${x.days ? " · " + esc(x.days) : ""}</span></button>`).join("")}`; }
    prSt(`✓ عُبّئ التصريح من الكتاب${data.no ? ` <bdi dir="ltr">${esc(data.no)}</bdi>` : ""}${data.approved === false ? ` <b class="bad-t">· تنبيه: لم أجد في الكتاب عبارة موافقة، تأكد قبل الإصدار</b>` : ""}${data.note ? `<br><span class="s">${esc(data.note)}</span>` : ""}<br>راجع البيانات ثم اضغط <b>«إصدار التصريح»</b>.`, data.approved === false ? "warn" : "ok");
    const b = $(".drawer-f [data-pissue]"); if (b) { b.classList.add("pr-go"); b.scrollIntoView({ block:"nearest" }); } }
  catch (e) { prSt("تعذّرت القراءة: " + esc(String(e?.message || e).slice(0, 160)), "bad"); }
  finally { PR.busy = false; } }
function prMos(x){ const n = nkey(x.mosque || ""); if (!n) return ""; const a = nkey(x.area || ""), C = S.mosques.filter(m => nkey(m.name) === n), C2 = C.length ? C : S.mosques.filter(m => nkey(m.name).includes(n) || n.includes(nkey(m.name))), m = (a && C2.find(m => nkey(m.area || "").includes(a) || a.includes(nkey(m.area || "x")))) || (a && C2.length > 1 ? null : C2[0]);
  return m ? "مسجد " + m.name + (m.area ? "، " + m.area : "") : "مسجد " + x.mosque + (x.area ? "، " + x.area : ""); }
function prFill(i){ const x = PR.items[i]; if (!x) return; const set = (id, v) => { const e = $("#" + id); if (e && v && !e.readOnly) { e.value = v; e.classList.add("pr-filled"); } };
  set("p-sheikh", x.sheikh); set("p-mosque", prMos(x)); set("p-topic", x.topic || (x.prayer ? "درس ديني " + x.prayer : "")); set("p-lang", x.lang);
  const d = x.date && x.date >= TODAY ? x.date : x.start && x.start >= TODAY ? x.start : addDays(TODAY, 1); set("p-date", d);
  if (/^\d{1,2}:\d{2}$/.test(x.from || "")) set("p-from", x.from.padStart(5, "0")); if (/^\d{1,2}:\d{2}$/.test(x.to || "")) set("p-to", x.to.padStart(5, "0"));
  else if (/^\d{1,2}:\d{2}$/.test(x.from || "")) { const [h, m] = x.from.split(":").map(Number); set("p-to", `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`); }
  const end = x.end || PR.meta?.end; if (end && end > d) { const days = Math.round((dOf(end) - dOf(d)) / 864e5) + 1, pick = DUR.filter(z => z[2] <= days).pop() || DUR[0]; const s = $("#p-dur"); if (s && !s.disabled) s.value = pick[0]; } }
document.addEventListener("change", async ev => { if (ev.target.id === "pr-file") { const f = ev.target.files?.[0]; if (!f) return; if (f.size > 10e6) return prSt("الملف أكبر من 10 ميغا", "bad");
    const g = await prSmall(f); prRead({ b64:await b64of(g), mime:g.type || "application/pdf" }); ev.target.value = ""; }
  if (ev.target.id === "pr-wq" && ev.target.value) { const w = S.wq.find(x => x.id === ev.target.value); if (w) prRead({ text:`رقم الكتاب: ${w.no}\nالتاريخ: ${w.doc_date}\nالموضوع: ${w.subj}\nمن: ${w.signer}\n\n${w.body}` }); } });
document.addEventListener("click", ev => { const t = ev.target.closest("[data-pri]"); if (!t) return; document.querySelectorAll(".pr-i").forEach(b => b.classList.toggle("on", b === t)); prFill(+t.dataset.pri); });
/* drag & drop the letter onto the permit form */
document.addEventListener("dragover", ev => { if (ev.target.closest?.(".pr-ai")) { ev.preventDefault(); ev.target.closest(".pr-ai").classList.add("drag"); } });
document.addEventListener("dragleave", ev => ev.target.closest?.(".pr-ai")?.classList.remove("drag"));
document.addEventListener("drop", async ev => { const z = ev.target.closest?.(".pr-ai"); if (!z) return; ev.preventDefault(); z.classList.remove("drag"); const f = ev.dataTransfer?.files?.[0]; if (!f) return; const g = await prSmall(f); prRead({ b64:await b64of(g), mime:g.type || "application/pdf" }); });
/* the guide mentions it */
if (typeof GUIDES === "object" && GUIDES.permits) GUIDES.permits.s.splice(1, 0, { sel:"[data-pnew]", t:"التعبئة من الكتاب", x:"داخل «إصدار تصريح»: <b>«📎 أرفق الكتاب»</b> (PDF أو صورة، أو اسحبه للنافذة) أو اختر كتاب الموافقة من وثيقة، فيقرؤه الذكاء الاصطناعي ويعبّئ الشيخ والمسجد والتاريخ والوقت والمدة. إن كان فيه أكثر من درس تختار الدرس بضغطة. بعدها <b>«إصدار التصريح»</b>." });
if (typeof TOURS === "object" && TOURS["g-permits"] && GUIDES?.permits) TOURS["g-permits"].steps = [TOURS["g-permits"].steps[0], ...GUIDES.permits.s.map(s => ({ go:"permits", ...s }))];
NEWF.splice(1, 0, ["v63-permit-ai", "nav:permits", "التصريح من الكتاب مباشرة", "عند «إصدار تصريح»: أرفق الكتاب أو اختره من وثيقة، فيعبّئ الذكاء الاصطناعي بيانات التصريح، ثم ضغطة «إصدار التصريح».", false, "2026-10-21"]);
