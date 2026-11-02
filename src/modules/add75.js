/* ===== v75: تعديل اسم الجالية وإلغاؤها (المدير ورئيس القسم وكل من عنده صلاحية الجاليات والمنسقين) ===== */
const _cmEditForm75 = cmEditForm;
cmEditForm = function(name){ _cmEditForm75(name); if (S.form?.kind !== "cmedit") return;
  const chk = $(".drawer-b .check"); if (chk) chk.innerHTML = `<b>تغيير الاسم يشمل كل الأنشطة والكتب والتصاريح والحسابات</b><span>يُحدَّث الاسم في كل مكان تلقائياً. تقدر أيضاً تغيّر اللغة والمجموعة.</span>`;
  $(".drawer-b")?.insertAdjacentHTML("afterbegin", fld("ce-n", "اسم الجالية", `<input class="f" id="ce-n" value="${esc(name)}">`));
  $(".drawer-f")?.insertAdjacentHTML("beforeend", `<span style="margin-inline-start:auto"><button class="btn btn-danger" data-cmdrop="${esc(name)}">إلغاء الجالية</button></span>`); };
document.addEventListener("click", async ev => { const b = ev.target.closest("[data-cesave]"); if (!b) return;
  const old = S.form?.name, nn = ($("#ce-n")?.value || "").trim(); if (!old || !nn || nn === old) return;
  ev.stopImmediatePropagation(); if (S.comms.some(x => x.name === nn)) return toast("هذا الاسم موجود لجالية أخرى");
  b.disabled = true; const { error } = await sb.rpc("staff_comm_rename", { p_old:old, p_new:nn }); if (error) { b.disabled = false; return writeFail(error); }
  const grp = (() => { const g0 = $("#ce-g").value; return g0 === "__new" ? $("#ce-gn").value.trim() : g0; })(), lang = $("#ce-l").value.trim();
  try { const { data } = await sb.from("refs").select("id,data").in("id", ["comms", "coords"]); const m = Object.fromEntries((data || []).map(r => [r.id, r.data]));
    if (m.comms) await T.ref("comms", m.comms.map(x => x.name === nn ? { ...x, group:grp || x.group, lang:lang || x.lang } : x)); } catch (_) {}
  toast("تغيّر اسم الجالية في كل مكان ✓"); setTimeout(() => location.reload(), 700); }, true);
document.addEventListener("click", async ev => { const t = ev.target.closest("[data-cmdrop]"); if (!t) return; const nm = t.dataset.cmdrop;
  const n = S.E.filter(e => e.comm === nm).length; if (n) return toast(`فيها ${n} نشاط، انقل أنشطتها أو غيّر اسمها بدل الإلغاء`);
  if (t.dataset.sure !== "1") { t.dataset.sure = "1"; t.textContent = "تأكيد إلغاء الجالية"; return; }
  t.disabled = true; try { await T.ref("comms", S.comms.filter(x => x.name !== nm)); await T.ref("coords", S.coords.map(x => x.comm === nm ? { ...x, status:"سابق" } : x));
    S.comms = S.comms.filter(x => x.name !== nm); S.coords = S.coords.map(x => x.comm === nm ? { ...x, status:"سابق" } : x); closeDrawer(); toast("أُلغيت الجالية ✓"); render(); } catch (e) { t.disabled = false; writeFail(e); } });
