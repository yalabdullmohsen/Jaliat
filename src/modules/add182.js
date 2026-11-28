/* ================= v182: «هل المسجد متاح؟» أبسط: استعلام الكتاب بزر واحد (طلب يوسف 28/11/2026)
   زر واحد «استعلم»: إن كان في الخانة نص يفحصه، وإن كانت فارغة يفتح اختيار الملف (PDF أو صور) ويفحص مباشرة.
   وسحب الملف إلى البطاقة، أو لصق صورة في الخانة، يبدأ الاستعلام فوراً بلا ضغطة إضافية. ================= */
function inq182(){ const top = document.querySelector("#view .inq-top"); if (!top || top.dataset.one) return; top.dataset.one = "1";
  const ta = top.querySelector("#inq-text"), go = top.querySelector("#inq-go"), up = top.querySelector("label.btn"), fi = top.querySelector("#inq-file");
  if (!ta || !go || !fi) return;
  /* عنوان «فحص سريع» داخل بطاقته مثل «استعلام عن كتاب» */
  const sub = document.querySelector("#view>.inq-sub"), avx = document.querySelector("#view>.avx"); if (sub && avx) { sub.textContent = "هل المسجد متاح في موعد؟"; avx.prepend(sub); }
  ta.placeholder = "ألصق نص الكتاب، أو اسحب الملف إلى هنا"; ta.rows = 3;
  const one = document.createElement("div"); one.className = "inq-one";
  const b = document.createElement("button"); b.type = "button"; b.className = "btn btn-primary"; b.innerHTML = `${ei("search")}استعلم`;
  b.onclick = () => (ta.value || "").trim().length >= 20 ? go.click() : fi.click();
  ta.before(one); one.append(ta, b); go.hidden = true; if (up) { up.hidden = true; up.style.display = "none"; up.parentElement.append(fi); }
  const send = files => { if (!files?.length) return; const dt = new DataTransfer(); [...files].forEach(f => dt.items.add(f)); fi.files = dt.files; fi.dispatchEvent(new Event("change", { bubbles:true })); };
  ["dragenter", "dragover"].forEach(e => top.addEventListener(e, ev => { ev.preventDefault(); top.classList.add("drag"); }));
  ["dragleave", "drop"].forEach(e => top.addEventListener(e, ev => { ev.preventDefault(); top.classList.remove("drag"); if (e === "drop") send(ev.dataTransfer?.files); }));
  ta.addEventListener("paste", ev => { const fs = [...(ev.clipboardData?.files || [])].filter(f => /pdf|image/.test(f.type)); if (fs.length) { ev.preventDefault(); send(fs); } }); }
const _afterRender182 = afterRender;
afterRender = function(v){ _afterRender182(v); if (v === "avail") try { inq182(); } catch (_) {} };
