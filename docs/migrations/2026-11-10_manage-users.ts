// manage-users (الإصدار 8): مدير القسم يدير حسابات قسمه فقط، وحساب dept='all' (yousef وsat) يدير الكل.
// الفرق عن الإصدار 7: قراءة قسم المستدعي، وفحص نطاق الحساب المستهدف في update/delete، وإسناد قسم الحساب الجديد في create.
// الموافقة على طلبات الحسابات (approve/reject) تبقى ليوسف وفايز كما كانت.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const DOMAIN = "jaliyat.local";
const ROLES = ["admin", "editor", "viewer"];
const OWNERS = ["yousef", "fayez"]; // only these accounts approve new-account requests
const rnd = () => crypto.randomUUID() + crypto.randomUUID();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: u, error: ue } = await admin.auth.getUser(token);
    if (ue || !u?.user) return json({ error: "يلزم تسجيل الدخول" }, 401);
    const { data: me } = await admin.from("profiles").select("role,active,username,dept").eq("id", u.user.id).single();
    if (!me || me.role !== "admin" || !me.active) return json({ error: "هذه العملية لمدير القسم أو مدير النظام فقط" }, 403);

    // نطاق المستدعي: all = الكل، مراقبة = أقسامها، قسم = نفسه فقط
    const myDept: string = me.dept || "com_m";
    const { data: depts } = await admin.from("depts").select("code,parent");
    const inScope = (d: string | null | undefined) => {
      const c = d || "com_m";
      return myDept === "all" || myDept === c || !!depts?.some((x) => x.code === c && x.parent === myDept);
    };
    const targetOk = async (id: string) => {
      const { data: t } = await admin.from("profiles").select("dept").eq("id", id).single();
      return !!t && inScope(t.dept);
    };

    const body = await req.json();
    const act = body.action;
    if (act === "approve_request" || act === "reject_request") {
      if (!OWNERS.includes(me.username)) return json({ error: "الموافقة على الحسابات ليوسف وفايز فقط" }, 403);
      const { data: r } = await admin.from("account_requests").select("*").eq("id", body.id).single();
      if (!r) return json({ error: "الطلب غير موجود" }, 404);
      if (r.status !== "pending") return json({ error: "تم البت في هذا الطلب مسبقاً" }, 400);
      if (act === "reject_request") {
        await admin.from("account_requests").update({ status: "rejected", pass_hash: null, decided_by: u.user.id, decided_at: new Date().toISOString(), note: String(body.note || "") }).eq("id", r.id).eq("status", "pending");
        return json({ ok: true });
      }
      // claim the request first so two approvers cannot create it twice
      const { data: claimed } = await admin.from("account_requests").update({ status: "approved", decided_by: u.user.id, decided_at: new Date().toISOString() }).eq("id", r.id).eq("status", "pending").select("id");
      if (!claimed?.length) return json({ error: "تم البت في هذا الطلب مسبقاً" }, 400);
      const undo = async () => { await admin.from("account_requests").update({ status: "pending", decided_by: null, decided_at: null }).eq("id", r.id); };
      const role = ROLES.includes(body.role) ? body.role : "editor";
      const { data: c, error } = await admin.auth.admin.createUser({ email: `${r.username}@${DOMAIN}`, password: rnd(), email_confirm: true });
      if (error) { await undo(); return json({ error: /already|registered|exists/i.test(error.message) ? "اسم المستخدم مستخدم من قبل" : error.message }, 400); }
      const { error: he } = await admin.rpc("set_user_hash", { p_uid: c.user!.id, p_hash: r.pass_hash });
      if (he) { await admin.auth.admin.deleteUser(c.user!.id); await undo(); return json({ error: he.message }, 400); }
      const { error: pe } = await admin.from("profiles").insert({ id: c.user!.id, username: r.username, name: r.name, title: r.title || "", role });
      if (pe) { await admin.auth.admin.deleteUser(c.user!.id); await undo(); return json({ error: pe.message }, 400); }
      await admin.from("account_requests").update({ pass_hash: null, role }).eq("id", r.id);
      return json({ ok: true });
    }
    if (act === "create") {
      const username = String(body.username || "").trim().toLowerCase();
      if (!/^[a-z0-9._-]{3,30}$/.test(username)) return json({ error: "اسم المستخدم بحروف إنجليزية أو أرقام (3 أحرف على الأقل)" }, 400);
      if (String(body.password || "").length < 6) return json({ error: "كلمة المرور 6 أحرف على الأقل" }, 400);
      const role = ROLES.includes(body.role) ? body.role : "viewer";
      // قسم الحساب الجديد: المطلوب إن كان ضمن نطاقك، وإلا قسمك (ومدير النظام الافتراضي له الجاليات كما كان)
      const dept: string = body.dept ? String(body.dept) : (myDept === "all" ? "com_m" : myDept);
      if (!depts?.some((x) => x.code === dept) || !inScope(dept)) return json({ error: "هذا القسم خارج صلاحيتك" }, 403);
      const { data: c, error } = await admin.auth.admin.createUser({ email: `${username}@${DOMAIN}`, password: body.password, email_confirm: true });
      if (error) return json({ error: /already|registered|exists/i.test(error.message) ? "اسم المستخدم مستخدم من قبل" : error.message }, 400);
      const { error: pe } = await admin.from("profiles").insert({ id: c.user!.id, username, name: String(body.name || username).trim(), title: String(body.title || "").trim(), role, dept });
      if (pe) { await admin.auth.admin.deleteUser(c.user!.id); return json({ error: pe.message }, 400); }
      return json({ ok: true });
    }
    if (act === "update") {
      if (!(await targetOk(body.id))) return json({ error: "هذا الحساب خارج قسمك" }, 403);
      const patch: Record<string, unknown> = {};
      if (body.name !== undefined) patch.name = String(body.name).trim();
      if (body.title !== undefined) patch.title = String(body.title).trim();
      if (body.role !== undefined) { if (!ROLES.includes(body.role)) return json({ error: "صلاحية غير صحيحة" }, 400); patch.role = body.role; }
      if (body.active !== undefined) patch.active = !!body.active;
      if (body.id === u.user.id && ((patch.role && patch.role !== "admin") || patch.active === false)) return json({ error: "لا يمكنك إزالة صلاحية المدير عن نفسك" }, 400);
      if (body.username !== undefined) {
        const nu = String(body.username).trim().toLowerCase();
        const { data: cur } = await admin.from("profiles").select("username").eq("id", body.id).single();
        if (cur && cur.username !== nu) {
          if (!/^[a-z0-9._-]{3,30}$/.test(nu)) return json({ error: "اسم المستخدم بحروف إنجليزية أو أرقام (3 أحرف على الأقل)" }, 400);
          const { data: dup } = await admin.from("profiles").select("id").eq("username", nu).neq("id", body.id).maybeSingle();
          if (dup) return json({ error: "اسم المستخدم مستخدم من قبل" }, 400);
          const { error: ee } = await admin.auth.admin.updateUserById(body.id, { email: `${nu}@${DOMAIN}`, email_confirm: true });
          if (ee) return json({ error: /already|registered|exists/i.test(ee.message) ? "اسم المستخدم مستخدم من قبل" : ee.message }, 400);
          patch.username = nu;
        }
      }
      if (Object.keys(patch).length) { const { error } = await admin.from("profiles").update(patch).eq("id", body.id); if (error) return json({ error: error.message }, 400); }
      if (body.password) {
        if (String(body.password).length < 6) return json({ error: "كلمة المرور 6 أحرف على الأقل" }, 400);
        const { error } = await admin.auth.admin.updateUserById(body.id, { password: body.password }); if (error) return json({ error: error.message }, 400);
      }
      return json({ ok: true });
    }
    if (act === "delete") {
      if (body.id === u.user.id) return json({ error: "لا يمكنك حذف حسابك" }, 400);
      if (!(await targetOk(body.id))) return json({ error: "هذا الحساب خارج قسمك" }, 403);
      const { error } = await admin.auth.admin.deleteUser(body.id); if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }
    return json({ error: "عملية غير معروفة" }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
