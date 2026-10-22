/* ===== v73: extra permissions per employee: «إضافة جالية» and «إضافة منسق» (settings.perms → my_perms) ===== */
S.perms = [];
const canCC = () => S.admin || (S.perms || []).includes("comms_coords");
const _boot9s73 = boot9; boot9 = function(){ _boot9s73(); sb.rpc("my_perms").then(({ data }) => { S.perms = data || []; if (["coords", "comms"].includes(S.view)) render(); }); };
/* coordinators: the admin-only form opens for a granted employee too */
const _listForm73 = listForm;
listForm = function(kind, key){ if (kind === "co" && !S.admin && canCC()) { S.admin = true; try { return _listForm73(kind, key); } finally { S.admin = false; } } return _listForm73(kind, key); };
function ccBtns(){ const v = S.view, tb = $("#view .toolbar") || $("#view");
  if (v === "coords" && canCC() && !$("#view [data-new=co]")) tb?.insertAdjacentHTML("afterbegin", `<button class="btn btn-primary" data-new="co">${icon("i-plus")}إضافة منسق</button>`);
  if (v === "comms" && canCC() && !$("#view [data-cmnew]")) { const w = document.createElement("div"); w.className = "toolbar"; w.innerHTML = `<button class="btn btn-primary" data-cmnew>${icon("i-plus")}إضافة جالية</button><span class="count">جالية جديدة مع منسقها في خطوة واحدة</span>`; $("#view")?.prepend(w); } }
const _afterRender73 = afterRender; afterRender = function(v){ _afterRender73(v); try { ccBtns(); } catch (_) {} };
function cmForm(){ const groups = [...new Set(S.comms.map(c => c.group).filter(Boolean))].sort();
  S.form = { kind:"cmnew" };
  openDrawer("إضافة جالية", `${fld("cm-g", "المجموعة", `<select class="f" id="cm-g"><option value="">اختر</option>${groups.map(g => `<option>${esc(g)}</option>`).join("")}<option value="__new">مجموعة جديدة…</option></select>`)}
    <div id="cm-gn-w" hidden>${fld("cm-gn", "اسم المجموعة الجديدة", `<input class="f" id="cm-gn" placeholder="مثال: الهندية – التاميلية">`)}</div>
    ${fld("cm-l", "اللغة", `<input class="f" id="cm-l" placeholder="مثال: التاملية">`)}
    ${fld("cm-c", "اسم المنسق", `<input class="f" id="cm-c">`)}
    ${fld("cm-p", "هاتف المنسق", `<input class="f num" id="cm-p" inputmode="tel" dir="ltr">`)}
    <span class="hint">اسم الجالية يُكتب تلقائياً «اللغة - المنسق»، ويُضاف المنسق إلى «المنسقون» معها.</span>`,
    `<button class="btn btn-primary" data-cmsave>حفظ الجالية</button><button class="btn btn-ghost" data-close>إلغاء</button>`); }
async function cmSave(btn){ const g0 = $("#cm-g").value, grp = g0 === "__new" ? $("#cm-gn").value.trim() : g0, lang = $("#cm-l").value.trim(), co = $("#cm-c").value.trim(), ph = $("#cm-p").value.replace(/\D/g, "");
  if (!grp || !lang || !co) return toast("اكتب المجموعة واللغة واسم المنسق"); if (ph && ph.length < 8) return toast("رقم الهاتف غير صحيح");
  const name = `${lang} - ${co}`; if (S.comms.some(c => c.name === name)) return toast("هذه الجالية موجودة");
  btn.disabled = true;
  const C = [...S.comms, { no:Math.max(0, ...S.comms.map(c => +c.no || 0)) + 1, lang, name, coord:co, group:grp }];
  const K = [...S.coords, { comm:name, lang, name:co, role:"منسق", phone:ph, status:"نشط" }];
  try { await T.ref("comms", C); await T.ref("coords", K); S.comms = C; S.coords = K; closeDrawer(); toast("أُضيفت الجالية ومنسقها ✓"); render(); }
  catch (e) { btn.disabled = false; writeFail(e); } }
document.addEventListener("click", ev => { const t = ev.target.closest("button"); if (!t) return;
  if (t.dataset.cmnew !== undefined) return cmForm(); if (t.dataset.cmsave !== undefined) return cmSave(t); });
document.addEventListener("change", ev => { if (ev.target.id === "cm-g") { const w = $("#cm-gn-w"); if (w) w.hidden = ev.target.value !== "__new"; } });
/* backups page for every employee (view + take a copy + download); the rest of «الإدارة» stays with the managers */
const _ngA73 = ngApply; ngApply = function(){ _ngA73(); if (S.admin || !S.me) return; const b = $('#nav [data-nav="backups"]'); if (b) { b.hidden = false; b.classList.remove("admin-only"); const g = b.closest(".ng"); if (g) { g.hidden = false; g.classList.remove("admin-only"); g.querySelectorAll("[data-nav]").forEach(x => { if (x !== b) x.hidden = true; }); } } };
