/* v99 — طلب «استبدال خطيب مؤقت» من البوابة: عرضه في الطلبات الواردة بجمعه وتواريخه، دون أن يُعامَل كنشاط */
const isSubst = r => r?.data?.kind === "استبدال خطيب";
const frFmt = d => { const [y, m, x] = d.split("-"); return `${+x}/${+m}`; };
const frGroup = L => { const by = {}; (L || []).forEach(d => (by[d.slice(0, 7)] = by[d.slice(0, 7)] || []).push(d)); return Object.keys(by).sort().map(m => `<div class="sb-m"><b>${["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"][+m.slice(5) - 1]} ${m.slice(0, 4)}</b><span>${by[m].map(d => `<i class="chip">${+d.slice(8)}</i>`).join("")}</span></div>`).join(""); };
const _vInbox99 = vInbox;
vInbox = function(){ let h = _vInbox99(); for (const r of S.reqs) { if (!isSubst(r)) continue; const a = (r.data.acts || [])[0] || {}, n = (a.fridays || []).length;
    h = h.replace(new RegExp(`(data-rq="${r.id}">[\\s\\S]*?<span class="s">)\\d+ نشاط[^<]*(</span>)`), `$1${n} جمعة · ${esc(a.mosque || "")}$2`); } return h; };
const _reqForm99 = reqForm;
reqForm = async function(id){ await _reqForm99(id); const r = S.reqs.find(x => x.id === id); if (!isSubst(r)) return; const a = (r.data.acts || [])[0] || {}, F = a.fridays || [];
  $("#rq-acts")?.closest(".rq-sec")?.setAttribute("hidden", ""); $("[data-rqapprove]")?.setAttribute("hidden", ""); $("[data-letter]")?.setAttribute("hidden", "");
  const wa = (a.subPhone || "").replace(/\D/g, "");
  const box = document.createElement("div"); box.className = "rq-sec sb-box";
  box.innerHTML = `<b>استبدال خطيب مؤقت</b><div class="sb-g"><span class="s">المسجد</span><b>${esc(a.mosque || "—")}</b><span class="s">الخطيب الأساسي</span><b>${esc(a.khatib || khByMosque(a.mosque)?.[1]?.pri || "—")}</b><span class="s">البديل المؤقت</span><b>${esc(a.sub || "—")}${wa ? ` · <bdi dir="ltr">${esc(a.subPhone)}</bdi>` : ""}</b><span class="s">السبب</span><b>${esc(a.reason || "—")}</b><span class="s">عدد الجمع</span><b>${F.length} جمعة${F.length ? `، من ${fmt(F[0])} إلى ${fmt(F[F.length - 1])}` : ""}</b></div>${frGroup(F)}`;
  $("#rq-subj")?.closest("label, .fl, div")?.insertAdjacentElement("beforebegin", box); };
NEWF.splice(1, 0, ["v99-subst", "nav:inbox", "طلب استبدال خطيب مؤقت من البوابة", "المنسق يحدد المسجد والخطيب الأساسي والبديل ويختار الجمع بالتواريخ عبر عدة أشهر، ويصلك الطلب في «طلبات المنسقين» بكل جمعة مفصلة.", false, "2026-10-28"]);

/* تنظيف بقايا «بصمة إنجاز» المحذوفة من المتصفح */
try { Object.keys(localStorage).filter(k => /basma|بصمة/i.test(k)).forEach(k => localStorage.removeItem(k)); } catch (_) {}
