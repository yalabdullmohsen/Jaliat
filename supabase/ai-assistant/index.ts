import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const DEFAULT_MODELS = ["claude-sonnet-5-5", "claude-sonnet-4-5", "claude-3-5-sonnet-latest"];
const DAILY_LIMIT = 200;

const SYSTEM = (today: string, me: string, title: string) => `أنت «المساعد الذكي» داخل نظام أنشطة الجاليات في وزارة الأوقاف والشؤون الإسلامية بدولة الكويت — إدارة العلاقات الخارجية — قسم الجاليات ورعاية المهتدين وطلبة البعوث.
تاريخ اليوم: ${today}. المستخدم الذي يحادثك: ${me}${title ? " (" + title + ")" : ""}.
مهمتك: الإجابة عن أسئلة الموظفين اعتماداً على بيانات النظام المرفقة فقط (الأنشطة الدينية للجاليات: دروس ودورات ومحاضرات، وخطباء الجمعة، والمساجد، والوثائق والموافقات، والمنسقين، والملاحظات)، وتحليلها، واكتشاف التعارضات والنواقص، واقتراح المواعيد المناسبة، وكتابة التقارير والملخصات والمراسلات الرسمية.
قواعد:
- اكتب بالعربية الفصحى المهنية الموجزة، ونسّق بعناوين قصيرة ونقاط وجداول Markdown عند الحاجة.
- لا تخترع بيانات غير موجودة. إن لم تجد المعلومة فقل ذلك بوضوح واقترح ما يلزم.
- عند ذكر نشاط اذكر رقمه (#) ليسهل الرجوع إليه.
- في المراسلات الرسمية لا تختلق أرقام صادر أو أختاماً أو توقيعات؛ اترك لها فراغات.
- الأوقات بنظام 12 ساعة، والتواريخ بصيغة يوم/شهر/سنة.
- لا تعرض أرقاماً مدنية أو بيانات شخصية حساسة.`;

async function callClaude(key: string, models: string[], system: string, messages: unknown[]) {
  let last = "";
  for (const model of models) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 3000, system, messages }),
    });
    const t = await r.text();
    let d: any = {}; try { d = JSON.parse(t); } catch (_) { /* ignore */ }
    if (r.ok) return { ok: true, model, text: (d.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n") };
    last = d?.error?.message || t.slice(0, 300);
    if (r.status === 401 || r.status === 403) return { ok: false, status: 401, error: "مفتاح الذكاء الاصطناعي غير صحيح أو غير مفعّل" };
    if (r.status === 429) return { ok: false, status: 429, error: "تم تجاوز حد الاستخدام لدى مزوّد الذكاء الاصطناعي، حاول بعد قليل" };
    if (r.status === 400 && /credit|balance|billing/i.test(last)) return { ok: false, status: 402, error: "رصيد حساب الذكاء الاصطناعي غير كافٍ" };
    if (!(r.status === 404 || /model/i.test(last))) return { ok: false, status: r.status, error: last };
  }
  return { ok: false, status: 400, error: last || "تعذّر الاتصال بالذكاء الاصطناعي" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: u, error: ue } = await admin.auth.getUser(token);
    if (ue || !u?.user) return json({ error: "يلزم تسجيل الدخول" }, 401);
    const { data: me } = await admin.from("profiles").select("name,username,title,role,active").eq("id", u.user.id).single();
    if (!me || !me.active) return json({ error: "الحساب غير مفعّل" }, 403);
    const isAdmin = me.role === "admin";

    const body = await req.json().catch(() => ({}));
    const { data: sec } = await admin.from("ai_secrets").select("anthropic_key,model").eq("id", 1).maybeSingle();
    const key = sec?.anthropic_key || Deno.env.get("ANTHROPIC_API_KEY") || "";
    const models = [...new Set([sec?.model, Deno.env.get("AI_MODEL"), ...DEFAULT_MODELS].filter(Boolean) as string[])];

    if (body.action === "status") return json({ ready: !!key, admin: isAdmin, model: sec?.model || null });

    if (body.action === "set_key") {
      if (!isAdmin) return json({ error: "هذه العملية لمدير النظام فقط" }, 403);
      const k = String(body.key || "").trim();
      if (!k) { await admin.from("ai_secrets").upsert({ id: 1, anthropic_key: null, updated_by: u.user.id, updated_at: new Date().toISOString() }); return json({ ok: true, cleared: true }); }
      if (!/^sk-ant-/.test(k)) return json({ error: "المفتاح يبدأ عادةً بـ sk-ant-" }, 400);
      const test = await callClaude(k, models, "رد بكلمة واحدة.", [{ role: "user", content: "اختبار" }]);
      if (!test.ok) return json({ error: test.error }, 400);
      const { error } = await admin.from("ai_secrets").upsert({ id: 1, anthropic_key: k, model: test.model, updated_by: u.user.id, updated_at: new Date().toISOString() });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, model: test.model });
    }

    if (body.action === "chat") {
      if (!key) return json({ error: "needs_key", admin: isAdmin }, 200);
      const since = new Date(Date.now() - 864e5).toISOString();
      const { count } = await admin.from("ai_log").select("id", { count: "exact", head: true }).eq("user_id", u.user.id).gte("at", since);
      if ((count || 0) >= DAILY_LIMIT) return json({ error: "وصلت للحد اليومي لاستخدام المساعد، حاول غداً" }, 429);
      const msgs = (Array.isArray(body.messages) ? body.messages : []).slice(-16)
        .filter((m: any) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
        .map((m: any) => ({ role: m.role, content: m.content.slice(0, 12000) }));
      if (!msgs.length || msgs[msgs.length - 1].role !== "user") return json({ error: "اكتب سؤالك" }, 400);
      while (msgs.length && msgs[0].role !== "user") msgs.shift();
      const ctx = String(body.context || "").slice(0, 160000);
      const today = String(body.today || new Date().toISOString().slice(0, 10));
      const sys = SYSTEM(today, me.name || me.username, me.title || "") + (ctx ? `\n\n<بيانات_النظام>\n${ctx}\n</بيانات_النظام>` : "");
      const r = await callClaude(key, models, sys, msgs);
      await admin.from("ai_log").insert({ user_id: u.user.id, chars: msgs[msgs.length - 1].content.length });
      if (!r.ok) return json({ error: r.error }, 200);
      if (r.model !== sec?.model) await admin.from("ai_secrets").update({ model: r.model }).eq("id", 1);
      return json({ text: r.text });
    }
    return json({ error: "عملية غير معروفة" }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
