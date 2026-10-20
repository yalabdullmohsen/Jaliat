/* ================= v34: one community per coordinator، distribute the old shared groups in one tap per approval ================= */
const pendingComms = () => S.comms.filter(c => c.pending);
const isPending = name => S.comms.some(c => c.pending && c.name === name);
function splitItems(){ const out = [];
  for (const g of pendingComms()) {
    const docs = S.docs.filter(d => d.comm === g.name).map(d => ({ kind:"doc", key:d.no, g, title:`موافقة ${d.no}`, sub:d.subj || "", acts:S.E.filter(e => e.doc === d.no) }));
    const loose = S.E.filter(e => e.comm === g.name && !docBy[e.doc]).map(e => ({ kind:"act", key:e.id, g, title:`النشاط #${e.n}`, sub:`${e.type || ""} · ${e.mosName || ""}`, acts:[e] }));
    const docActs = new Set(docs.flatMap(d => d.acts.map(e => e.id)));
    const orphan = S.E.filter(e => e.comm === g.name && docBy[e.doc] && docBy[e.doc].comm !== g.name && !docActs.has(e.id)).map(e => ({ kind:"act", key:e.id, g, title:`النشاط #${e.n}`, sub:`${e.type || ""} · ${e.mosName || ""}`, acts:[e] }));
    const kh = [...S.khatibs.entries()].filter(([, k]) => k.comm === g.name).map(([id, k]) => ({ kind:"kh", key:id, g, title:`خطبة جمعة، ${k.mosque || k.label || ""}`, sub:k.area || "", acts:[] }));
    out.push(...docs, ...loose, ...orphan, ...kh);
  } return out; }
const shortCo = n => String(n).split(" - ").slice(1).join(" - ") || n;
function splitHTML(){ const L = splitItems(); if (!L.length) return `<div class="fx-ok">✓ تم توزيع كل الأنشطة على المنسقين</div>`;
  const groups = [...new Set(L.map(x => x.g.name))];
  return `<div class="check"><b>كل منسق صار جالية مستقلة</b><span>هذه الموافقات كانت مسجلة باسم الجالية المشتركة. اختر منسقها، تنتقل الموافقة وكل أنشطتها له بضغطة.</span></div>` +
    groups.map(gn => { const I = L.filter(x => x.g.name === gn), g = I[0].g;
      return `<div class="sp-g"><h3>${esc(gn)} <span class="num">${I.length}</span></h3>${I.map(x => `<div class="sp-i"><div class="sp-t"><b>${esc(x.title)}</b><span>${esc(x.sub)}${x.acts.length ? ` · ${x.acts.length} نشاط: ${esc([...new Set(x.acts.map(e => e.mosName))].slice(0, 2).join("، "))}${x.acts[0]?.lect ? " · " + esc(x.acts[0].lect) : ""}` : ""}</span></div>
        <div class="sp-b">${(g.split || []).map(c => `<button type="button" class="btn" data-spk="${x.kind}" data-spkey="${esc(x.key)}" data-spc="${esc(c)}">${esc(shortCo(c))}</button>`).join("")}</div></div>`).join("")}</div>`; }).join(""); }
async function splitAssign(kind, key, comm, btn){
  btn.disabled = true; const { error } = await sb.rpc("assign_comm", { p_kind:kind, p_key:key, p_comm:comm }); if (error) { btn.disabled = false; return writeFail(error); }
  if (kind === "doc") { for (const [, a] of S.acts) if (a.doc === key) a.comm = comm; const d = docBy[key]; if (d) d.comm = comm; }
  else if (kind === "act") { const a = S.acts.get(key); if (a) a.comm = comm; }
  else { const k = S.khatibs.get(key); if (k) k.comm = comm; }
  S.comms = S.comms.filter(c => !c.pending || S.docs.some(d => d.comm === c.name) || [...S.acts.values()].some(a => a.comm === c.name) || [...S.khatibs.values()].some(k => k.comm === c.name));
  derive(); render(); toast(`✓ نُقلت إلى ${shortCo(comm)}`); }
const _fixCount34 = fixCount;
fixCount = function(){ return _fixCount34() + splitItems().length; };
const _vFix34 = vFix;
vFix = function(){ const n = splitItems().length;
  if (!S.f.fixt && n) S.f.fixt = "split";
  let h = _vFix34().replace('<div class="rn-seg fx-tabs">', `<div class="rn-seg fx-tabs"><button type="button" class="${S.f.fixt === "split" ? "on" : ""}" data-fixt="split">توزيع على المنسقين <span class="num">${n}</span></button>`);
  if (S.f.fixt === "split") h = h.replace(/<div class="fx-l">[\s\S]*<\/div><\/div>$/, `<div class="fx-l">${splitHTML()}</div></div>`).replace(/data-fixt="acts" class="on"|class="on" data-fixt="acts"/, 'data-fixt="acts"');
  return h; };
// communities page: shared old groups are not communities any more، one banner leads to the distribution
const _vComms34 = vComms;
vComms = function(){ const P = pendingComms(); const real = S.comms; S.comms = real.filter(c => !c.pending);
  let h; try { h = _vComms34(); } finally { S.comms = real; }
  const n = splitItems().length;
  return (n ? `<div class="check warn sp-ban"><b>${n} موافقة/خطبة من الجاليات المشتركة القديمة تحتاج تحديد منسقها</b><span>${esc(P.map(c => c.name).join("، "))}</span><button type="button" class="btn btn-primary" data-sp-go>وزّعها الآن</button></div>` : "") + h; };
document.addEventListener("click", ev => { const t = ev.target.closest("button"); if (!t) return; const D = t.dataset;
  if (D.spk) return splitAssign(D.spk, D.spkey, D.spc, t);
  if (D.spGo !== undefined) { S.f.fixt = "split"; return go("fix"); } });
const _prio34 = priorities;
priorities = function(){ const P = _prio34(); const n = splitItems().length; if (n && S.canWrite) P.push({ w:95, k:"warn", t:`${n} موافقة من الجاليات المشتركة تحتاج تحديد منسقها`, s:"كل منسق صار جالية مستقلة", act:{ go:"fix", l:"وزّعها" } }); return P.sort((a, b) => b.w - a.w); };
NEWF.splice(1, 0, ["v34-split", "nav:comms", "جالية لكل منسق", "اعتُمد كشف المنسقين الجديد: كل منسق جالية مستقلة باسم «اللغة - المنسق» مع رقمه ونائبه. والموافقات القديمة تُوزَّع بضغطة من «إكمال البيانات».", false, "2026-10-20"]);
