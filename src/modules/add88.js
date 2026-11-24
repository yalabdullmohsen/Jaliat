/* ================= v88 (JL-3): رمز تفعيل لمرة واحدة لحساب المنسق في البوابة ================= */
/* لا يُفعَّل الحساب بالرقم المدني والهاتف وحدهما: الموظف يصدر رمزاً (صالحاً 72 ساعة) ويرسله لصاحب الحساب بواتساب.
   يحتاج الترحيل docs/migrations/2026-11-24_portal_activation_code.sql (الدالة staff_portal_activation_code). */
function paCodeBtns(){ if (S.view !== "portal" || !S.canWrite) return;
  document.querySelectorAll(".pv-r [data-pareset]").forEach(b => { const r = b.closest(".pv-r"); if (!r || r.querySelector("[data-pacode]")) return;
    const a = (S.pacc || []).find(x => x.id === b.dataset.pareset); if (!a || a.ready) return;
    b.insertAdjacentHTML("beforebegin", `<button type="button" class="btn btn-primary" data-pacode="${esc(a.id)}">رمز تفعيل</button>`); }); }
const _afterRender88 = afterRender;
afterRender = function(v){ _afterRender88(v); paCodeBtns(); };
document.addEventListener("click", async ev => { const t = ev.target.closest("[data-pacode]"); if (!t) return;
  const a = (S.pacc || []).find(x => x.id === t.dataset.pacode); if (!a) return;
  const { data, error } = await sb.rpc("staff_portal_activation_code", { p_id:a.id }); if (error) return writeFail(error);
  if (!data?.ok) return toast(data?.msg || "تعذّر إصدار الرمز");
  const msg = `السلام عليكم ${a.name}، رمز تفعيل حسابك في بوابة إنجاز: ${data.code}\nصالح 72 ساعة. افتح البوابة واختر «فعّل حسابك»، واكتب رقمك المدني وهاتفك وهذا الرمز، ثم اختر رمزك السري.`;
  const wa = a.phone ? `https://wa.me/${waNum(a.phone)}?text=${encodeURIComponent(msg)}` : "";
  openDrawer("رمز تفعيل الحساب", `<div class="check ok"><b>رمز تفعيل ${esc(a.name)}</b><span dir="ltr" class="num" style="font-size:28px;letter-spacing:4px">${esc(data.code)}</span><span>صالح 72 ساعة، ويُلغى بعد استعماله مرة واحدة.</span>
    ${wa ? `<a class="btn btn-primary" target="_blank" rel="noopener" href="${wa}">${icon("i-wa")} إرساله بواتساب</a>` : `<span class="s">لا رقم هاتف لهذا الحساب؛ أبلغه الرمز بنفسك.</span>`}</div>`); });
