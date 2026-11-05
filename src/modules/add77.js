/* ===== v77: كل تصريح يدخل نشاطه في «إنجاز» تلقائياً: يُربط بنشاطه إن وُجد، وإلا يُنشأ نشاط من بيانات التصريح،
   فيظهر في الأنشطة والتقويم والجدول الأسبوعي والمساجد والتقارير. رقم النشاط الناتج ثابت لكل تصريح فلا يتكرر مهما فتح الموظفون النظام معاً. ===== */
const permitActSweep = (() => { let busy = false; const failed = new Set();
  const clean = t => String(t || "").replace(/\s+/g, " ").trim();
  const lectsOf = t => clean(t).split(/\s+[-–—]\s+|\s*\/\s*/).map(clean).filter(Boolean);
  const mosParts = t => { const a = clean(t).split("،").map(clean); return { name:(a[0] || "").replace(/^مسجد\s+/, ""), area:a[1] || "", gov:(a.find(x => x.startsWith("محافظة")) || "").replace(/^محافظة\s+/, "") }; };
  const mosFind = name => { const k = nkey(name); if (!k) return null; const same = S.mosques.find(m => nkey(m.name) === k); if (same) return same;
    const near = k.length > 6 ? S.mosques.filter(m => { const x = nkey(m.name); return x.length > 6 && (x.includes(k) || k.includes(x)); }) : []; return near.length === 1 ? near[0] : null; };
  const typeOf = t => /دور/.test(t || "") ? "دورة علمية" : /محاضر/.test(t || "") ? "محاضرة دينية" : "درس ديني";
  const weekdayOf = d => d ? [new Date(d + "T12:00:00").getDay()] : [];
  const commOf = names => { const k = new Set(); for (const e of S.E) if (e.comm && sameLect(lectNames(names.join(" / ")), e.names)) k.add(e.comm); return k.size === 1 ? [...k][0] : ""; };
  const existing = (p, names, m, days) => { if (!m) return null; const wanted = lectNames(names.join(" / ")), sl = slot(p.data?.prayer || p.data?.time);
    const L = S.E.filter(e => !["ملغى", "مكتمل"].includes(e.status) && e.mosque === m.id && e.days.some(d => days.includes(d)) && sameLect(wanted, e.names));
    return L.find(e => sl && e.sl && e.sl[0] === sl[0]) || L[0] || null; };
  async function linkOne(p){ const d = p.data || {}, names = lectsOf(d.sheikh), mp = mosParts(d.mosque), days = (d.days || []).length ? d.days : weekdayOf(d.date), id = "ap" + String(p.id).replace(/-/g, "").slice(0, 12);
    let m = mosFind(mp.name), act = S.acts.has(id) ? id : existing(p, names, m, days)?.id;
    if (!act) {
      if (!m && mp.name) { const nid = "m" + String(Math.max(0, ...S.mosques.map(x => +x.id.slice(1) || 0)) + 1).padStart(3, "0"); m = { id:nid, name:mp.name, area:mp.area, gov:mp.gov }; const list = [...S.mosques, m]; await T.ref("mosques", list); S.mosques = list; }
      const doc = (JSON.stringify(d).match(/\b2[5-9]\d{2}-\d{4}\b/) || [""])[0], rep = d.rep && !["weekly", "once"].includes(d.rep) ? d.rep : "", time = clean(d.prayer || (d.time_mode === "none" ? "" : d.time));
      const body = { n:Math.max(0, ...[...S.acts.values()].map(a => a.n || 0)) + 1, type:typeOf(d.topic), comm:docBy[doc]?.comm || commOf(names), mosque:m?.id || "", gov:m?.gov || mp.gov, days, daily:false, time, lect:names.join(" / "),
        title:/^(درس|دروس|درس ديني|دروس دينية|درس شهري)$/.test(clean(d.topic)) ? typeOf(d.topic) : clean(d.topic), start:d.date || "", end:p.until || "", status:"مجدول", doc, notes:`أُضيف تلقائياً من التصريح ${p.no}`, ...(rep ? { rep } : {}), ...(d.lang ? { lang:d.lang } : {}) };
      await T.put("acts", id, body); S.acts.set(id, body); derive(); act = id; }
    const { error } = await sb.from("permits").update({ act_id:act }).eq("id", p.id); if (error) throw error; p.act_id = act; return true; }
  return async function(){ if (busy || !S.canWrite || !S.permits || !S.E.length) return; const L = S.permits.filter(p => !p.revoked && !p.act_id && !failed.has(p.id) && (!p.until || p.until >= TODAY)); if (!L.length) return;
    busy = true; let n = 0; try { for (const p of [...L].reverse()) { try { if (await linkOne(p)) n++; } catch (e) { failed.add(p.id); console.warn("permit→act", p.no, e); } } } finally { busy = false; }
    if (n) { toast(n === 1 ? "دخل نشاط التصريح في «إنجاز» تلقائياً" : `دخلت أنشطة ${n} تصاريح في «إنجاز» تلقائياً`); if ($("#drawer").hidden) render(); } };
})();
setInterval(() => { try { permitActSweep(); } catch (_) {} }, 10000); setTimeout(() => { try { permitActSweep(); } catch (_) {} }, 6000);
NEWF.splice(0, 0, ["v77-pact", "nav:permits", "كل تصريح يدخل نشاطه تلقائياً", "أي تصريح يصدر يُربط بنشاطه، وإذا ما له نشاط يُنشأ له نشاط تلقائياً ويظهر في الأنشطة والتقويم والجدول الأسبوعي والمساجد والتقارير."]);
