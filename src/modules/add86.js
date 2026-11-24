/* v266 — طلب «تسجيل نشاط غير مسجل» من البوابة: نشاط قائم فعلًا في المسجد لكنه غير مسجل في النظام.
   يصل بالمسار نفسه (requests بنوع «نشاط غير مسجل»)، بوسم واضح في الوارد، ويُعبَّأ رقم الموافقة وتاريخاه
   في نافذة الطلب من بيانات المنسق، فيعتمده الموظف بزر «اعتماد وإضافة الأنشطة للنظام» المعتاد. */
const UNREG_KIND = "نشاط غير مسجل";
const isUnreg = r => r?.data?.kind === UNREG_KIND;
RQ_KC[UNREG_KIND] = "warn";

const _vInbox86 = vInbox;
vInbox = function(){ let h = _vInbox86();
  for (const r of S.reqs) { if (!isUnreg(r)) continue;
    // وسم add42 العام («نشاط غير مسجل») داخل بطاقة هذا الطلب نفسها يصير وسمًا صريحًا
    h = h.replace(new RegExp(`(data-rq="${r.id}">[\\s\\S]*?)<span class="chip warn">${UNREG_KIND}</span>`), `$1<span class="chip warn" title="نشاط قائم في المسجد غير مسجل في النظام">قائم · ${esc(UNREG_KIND)}</span>`); }
  return h; };

const _reqForm86 = reqForm;
reqForm = async function(id){ await _reqForm86(id); const r = S.reqs.find(x => x.id === id); if (!isUnreg(r)) return;
  const A = r.data.acts || [], a = A[0] || {}, set = (sel, v) => { const el = $(sel); if (el && !el.value && v) el.value = v; };
  set("#rq-doc", r.data.doc || a.docNo); set("#rq-s", r.data.start || a.start); set("#rq-e", r.data.end || a.end);
  const box = document.createElement("div"); box.className = "rq-sec";
  box.innerHTML = `<b>نشاط قائم غير مسجل في النظام</b><span class="s">طلبه المنسق لنشاط يُقام فعلًا. ${a.docNo ? `رقم الموافقة المذكور: <bdi class="num">${esc(a.docNo)}</bdi>.` : "لم يذكر رقم موافقة."} البداية ${esc(a.start || "—")}${a.end ? `، والنهاية ${esc(a.end)}` : ""}.${A.length > 1 ? ` (${A.length} أنشطة)` : ""}</span>`;
  $("#rq-acts")?.closest(".rq-sec")?.insertAdjacentElement("beforebegin", box); };
