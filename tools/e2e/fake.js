(() => {
const D = window.__DB, uid = localStorage.getItem("uid"), me = () => D.profiles.find(p => p.id === uid);
const depts = D.depts, parentOf = c => depts.find(d => d.code === c)?.parent;
const deptOk = d => { const m = me()?.dept; return !!m && (m === "all" || m === d || parentOf(d) === m); };
const SCOPED = ["dept_items", "notes", "audit", "od_saves", "dept_backups", "feature_requests"];
const COMM = ["acts", "khatibs", "refs", "requests", "tasks", "questions", "chat_messages", "backups", "bookings", "attendance", "sermons", "watheqa_docs", "wq_track", "watheqa_outbox"];
const vis = (t, r) => SCOPED.includes(t) ? (t === "feature_requests" ? (r.uid === uid || deptOk(r.dept)) : deptOk(r.dept)) : COMM.includes(t) ? deptOk("com_m") : t === "my_notes" ? r.user_id === uid : true;
const uuid = () => crypto.randomUUID(), now = () => new Date().toISOString();
const err = m => ({ message: m, code: "42501" });
D.calls = []; D.errors = [];
const audit = (tbl, row, action, dept, summary) => D.audit.push({ id: D.audit.length + 100, at: now(), user_id: uid, tbl, row_id: String(row.id), action, summary, dept });
function from(t) {
  D[t] ||= [];
  const q = { f: [], op: "select", lim: 1e9, ord: null, one: false, maybe: false, rows: null, patch: null };
  const run = () => {
    const rows = D[t]; let out = rows.filter(r => vis(t, r) && q.f.every(fn => fn(r)));
    if (q.op === "select") {
      if (q.ord) out = [...out].sort((a, b) => (a[q.ord.c] > b[q.ord.c] ? 1 : -1) * (q.ord.asc ? 1 : -1));
      out = out.slice(0, q.lim);
      if (q.one) return out.length ? { data: out[0], error: null } : (q.maybe ? { data: null, error: null } : { data: null, error: err("no rows") });
      return { data: out, error: null, count: out.length };
    }
    if (q.op === "insert" || q.op === "upsert") {
      const res = [];
      for (const x of [].concat(q.rows)) {
        const ex = x.id && rows.find(r => r.id === x.id);
        let r = ex ? { ...ex, ...x } : { id: x.id || (t === "notes" || t === "dept_items" ? uuid() : rows.length + 1), created_at: now(), updated_at: now(), ...x };
        if (["notes", "od_saves"].includes(t) && !r.dept) r.dept = "com_m";
        if (t === "od_saves" && !r.user_id) r.user_id = uid;
        if (t === "dept_items" && !r.created_by) r.created_by = uid;
        if (t === "feature_requests" && !r.uid) r.uid = uid;
        if (SCOPED.includes(t) && t !== "feature_requests" && !deptOk(r.dept)) return { data: null, error: err('new row violates row-level security policy for table "' + t + '"') };
        if (COMM.includes(t) && !deptOk("com_m")) return { data: null, error: err("rls") };
        if (ex) Object.assign(ex, r); else rows.push(r);
        if (["notes", "dept_items"].includes(t)) audit(t, r, ex ? "UPDATE" : "INSERT", r.dept, r.title || r.data?.title || r.id);
        res.push(ex || r);
      }
      return q.one ? { data: res[0], error: null } : { data: res, error: null };
    }
    if (q.op === "update") { out.forEach(r => { Object.assign(r, q.patch); if (["notes", "dept_items"].includes(t)) audit(t, r, "UPDATE", r.dept, r.title || r.data?.title); }); return { data: q.one ? out[0] : out, error: null }; }
    if (q.op === "delete") { out.forEach(r => { rows.splice(rows.indexOf(r), 1); if (["notes", "dept_items"].includes(t)) audit(t, r, "DELETE", r.dept, r.title || r.data?.title); }); return { data: null, error: null, count: out.length }; }
  };
  const api = {
    select() { return api; }, insert(r) { q.op = "insert"; q.rows = r; return api; }, upsert(r) { q.op = "upsert"; q.rows = r; return api; },
    update(p) { q.op = "update"; q.patch = p; return api; }, delete() { q.op = "delete"; return api; },
    eq(c, v) { q.f.push(r => r[c] === v); return api; }, neq(c, v) { q.f.push(r => r[c] !== v); return api; }, in(c, a) { q.f.push(r => a.includes(r[c])); return api; },
    gte(c, v) { q.f.push(r => r[c] >= v); return api; }, lte(c, v) { q.f.push(r => r[c] <= v); return api; },
    order(c, o) { q.ord = { c, asc: o?.ascending !== false }; return api; }, limit(n) { q.lim = n; return api; },
    single() { q.one = true; return api; }, maybeSingle() { q.one = true; q.maybe = true; return api; },
    then(ok, no) { try { return Promise.resolve(run()).then(ok, no); } catch (e) { D.errors.push(String(e)); return Promise.resolve({ data: null, error: err(String(e)) }).then(ok, no); } },
  };
  return api;
}
const scopeItems = (t, p) => D[t].filter(r => deptOk(r.dept) && (p == null || r.dept === p));
const rpcs = {
  staff_activity: () => D.profiles.filter(p => p.active && deptOk(p.dept)).map(p => ({ id: p.id, name: p.name, role: p.role, n: D.audit.filter(a => a.user_id === p.id).length, items: [], by: {} })),
  team_backup: () => deptOk("com_m") ? { at: now(), tables: { acts: D.acts || [], notes: D.notes } } : { at: now(), tables: { dept_items: scopeItems("dept_items"), notes: scopeItems("notes"), feature_requests: scopeItems("feature_requests") } },
  take_dept_backup: a => { if (!deptOk(a.p_dept) || !["admin", "editor"].includes(me().role)) return err("not allowed"); D.dept_backups.push({ id: D.dept_backups.length + 1, dept: a.p_dept, at: now(), data: { tables: { dept_items: scopeItems("dept_items", a.p_dept), notes: scopeItems("notes", a.p_dept) } } }); return null; },
  set_user_dept: a => { D.profiles.find(p => p.id === a.p_uid).dept = a.p_dept; return null; },
};
const client = {
  from, rpc: async (n, a) => { D.calls.push(["rpc", n, a]); const r = rpcs[n]; if (!r) return { data: null, error: null }; const v = r(a || {}); return v && v.message ? { data: null, error: v } : { data: v, error: null }; },
  auth: { getSession: async () => ({ data: { session: uid ? { user: { id: uid }, access_token: "t" } : null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), signOut: async () => ({}), getUser: async () => ({ data: { user: { id: uid } } }), signInWithPassword: async () => ({ data: {}, error: null }), refreshSession: async () => ({ data: {}, error: null }) },
  channel: () => { const c = { on: () => c, subscribe: () => c, track: async () => {}, presenceState: () => ({}), send: async () => {} }; return c; }, removeChannel() {},
  functions: { invoke: async (n, o) => { D.calls.push(["fn", n, o?.body]); return { data: { ok: true }, error: null }; } },
  storage: { from: () => ({ upload: async () => ({}), getPublicUrl: () => ({ data: { publicUrl: "" } }), createSignedUrl: async () => ({ data: {} }) }) },
};
window.supabase = { createClient: () => client };
})();
