// «✨» إنجاز: بوابة واحدة إلى Gemini (JL-AI).
// - المفتاح سرّ في الدالة باسم GEMINI_API_KEY، لا في الواجهة ولا في المستودع.
// - الموظف المسجَّل النشط فقط (admin/editor/viewer)، والبوابة (جلسة منسق أو شيخ) للترجمة وحدها.
// - حجب إلزامي قبل الإرسال: الرقم المدني، الهاتف، IBAN، البريد → رموز ⟦…⟧ تُعاد بعد الرد.
// - حد يومي لكل مستخدم، وتخزين مؤقت 24 ساعة (المدخل والمخرج محجوبان)، وسجل استعمال بلا محتوى.
// - أي فشل أو انتهاء حصة: { ok:false, msg } برسالة عربية هادئة، والمنصة تعمل كما هي.
// - كل مخرج اقتراح فقط؛ الموظف يعتمد.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const KEY = Deno.env.get("GEMINI_API_KEY") || "";
const MODELS = (Deno.env.get("GEMINI_MODELS") || "gemini-3.8-flash,gemini-3.5-flash-lite").split(",").map((s) => s.trim()).filter(Boolean);
const LIMIT_STAFF = +(Deno.env.get("AI_DAILY_LIMIT") || 80), LIMIT_PORTAL = +(Deno.env.get("AI_PORTAL_DAILY_LIMIT") || 30);
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const QUIET = "المساعد الذكي غير متاح الآن، والمنصة تعمل كالمعتاد. حاول لاحقًا.";
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

/* ---------- الحجب ---------- */
const RULES: [string, RegExp][] = [
  ["IBAN", /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,4})?\b/gi],
  ["EMAIL", /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g],
  ["CIVIL", /(?<!\d)[1-3]\d{11}(?!\d)/g],
  ["PHONE", /(?:\+?965[\s-]?)?(?<!\d)[24569]\d{3}[\s-]?\d{4}(?!\d)/g],
];
const AR_DIG = /[٠-٩۰-۹]/g, toLatin = (s: string) => s.replace(AR_DIG, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d) >= 0 ? "٠١٢٣٤٥٦٧٨٩".indexOf(d) : "۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
export function redact(text: string, map: Map<string, string>) {
  let out = toLatin(String(text ?? ""));
  for (const [tag, re] of RULES) out = out.replace(re, (m) => { for (const [k, v] of map) if (v === m) return k; const k = `⟦${tag}${map.size + 1}⟧`; map.set(k, m); return k; });
  return out;
}
const restore = (s: string, map: Map<string, string>) => { let o = s; for (const [k, v] of map) o = o.split(k).join(v); return o; };
const redactDeep = (v: unknown, map: Map<string, string>): unknown =>
  typeof v === "string" ? redact(v, map) : Array.isArray(v) ? v.map((x) => redactDeep(x, map)) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, redactDeep(x, map)])) : v;

/* ---------- المهام (كل مهمة: تعليمات ثابتة + مخطط مخرج) ---------- */
const STYLE = "أنت مساعد رسمي لقسم الجاليات ورعاية المهتدين وطلبة البعوث في الكويت داخل منصة «إنجاز». اكتب بعربية فصحى رسمية موجزة بلا مبالغة ولا رموز تعبيرية، ولا تخترع معلومة غير موجودة في المدخل. الرموز مثل ⟦PHONE1⟧ بيانات محجوبة: أبقها كما هي حرفيًا ولا تشرحها. لا تكتب كلمة «الأوقاف».";
type Task = { portal?: boolean; max: number; prompt: (i: any) => string; schema?: Record<string, unknown> };
const S = (props: Record<string, unknown>, req: string[]) => ({ type: "OBJECT", properties: props, required: req });
const STR = { type: "STRING" }, ARR = { type: "ARRAY", items: STR };
const TASKS: Record<string, Task> = {
  home_brief: { max: 6000, schema: S({ lines: ARR }, ["lines"]),
    prompt: (i) => `من بيانات اليوم التالية (JSON) اكتب ثلاثة أسطر فقط بأهم ما يحتاج انتباه الموظف اليوم، الأهم أولًا، كل سطر جملة واحدة قصيرة تبدأ بالفعل أو بالرقم. لا تكرر ما لا يحتاج إجراء.\n${JSON.stringify(i)}` },
  wq_draft: { max: 8000, schema: S({ subject: STR, body: STR }, ["subject", "body"]),
    prompt: (i) => `صُغ ${i.mode === "reply" ? "ردًا رسميًا على الكتاب" : "كتابًا رسميًا"} لنظام المراسلات «وثيقة» بالمعطيات التالية. ابدأ بالتحية الرسمية المعتادة، ثم الموضوع في فقرة أو فقرتين، ثم الختام «وتفضلوا بقبول فائق الاحترام». لا تضف توقيعًا ولا أرقامًا غير موجودة.\n${JSON.stringify(i)}` },
  req_summary: { max: 8000, schema: S({ line: STR, asks: ARR }, ["line", "asks"]),
    prompt: (i) => `لخّص هذا الطلب الوارد في سطر واحد (من؟ وماذا يريد؟)، ثم اذكر المطلوب من القسم نقاطًا قصيرة (حتى 4).\n${JSON.stringify(i)}` },
  conflict_fix: { max: 8000, schema: S({ pick: { type: "INTEGER" }, why: STR, msg: STR }, ["pick", "why", "msg"]),
    prompt: (i) => `نشاطان متعارضان في المسجد نفسه والوقت نفسه. هذه بدائل متاحة محسوبة من بيانات المنصة (لا تقترح غيرها). اختر رقم البديل الأنسب (pick يبدأ من 0) مع سبب قصير، واكتب رسالة واتساب مهذبة قصيرة للمنسق تقترح البديل.\n${JSON.stringify(i)}` },
  data_qa: { max: 3000, schema: S({ intent: { type: "STRING", enum: [] as string[] }, params: S({ comm: STR, mosque: STR, gov: STR, lect: STR, type: STR, month: STR, status: STR }, []), note: STR }, ["intent"]),
    prompt: (i) => `حوّل سؤال الموظف إلى أحد الاستعلامات المعرّفة فقط (intent) مع معاملاته إن وُجدت، ولا تجب عن السؤال بنفسك. إن لم يطابق أي استعلام فاختر "none" واكتب في note اقتراحًا لصياغة أوضح.\nالاستعلامات: ${JSON.stringify(i.intents)}\nالسؤال: ${i.q}` },
  translate: { portal: true, max: 6000, schema: S({ ar: STR, lang: STR }, ["ar", "lang"]),
    prompt: (i) => `ترجم النص التالي إلى العربية الفصحى ترجمة أمينة دون إضافة أو حذف، واذكر لغة الأصل في lang.\n${String(i.text ?? "")}` },
};

/* ---------- الهوية والصلاحية ---------- */
async function who(req: Request, body: any): Promise<{ id: string; portal: boolean } | null> {
  const tok = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (tok && tok.split(".").length === 3) {
    const { data } = await sb.auth.getUser(tok);
    const uid = data?.user?.id;
    if (uid) { const { data: p } = await sb.from("profiles").select("id,role,active").eq("id", uid).maybeSingle(); if (p?.active && ["admin", "editor", "viewer"].includes(p.role)) return { id: uid, portal: false }; }
  }
  if (typeof body?.portal_s === "string" && body.portal_s.length > 10) {
    const { data, error } = await sb.rpc("pa_acc", { p_s: body.portal_s, p_sheikh: true });
    if (!error && data?.id) return { id: "p:" + data.id, portal: true };
  }
  return null;
}

async function sha(s: string) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""); }
const log = (actor: string, kind: string, ok: boolean, cached: boolean, model: string | null, tokens: number) =>
  sb.from("ai_usage").insert({ actor, kind, ok, cached, model, tokens });

async function gemini(task: Task, prompt: string, schema: Record<string, unknown> | undefined) {
  for (const model of MODELS) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: STYLE }] },
        contents: [{ role: "user", parts: [{ text: prompt.slice(0, task.max) }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1200, ...(schema ? { responseMimeType: "application/json", responseSchema: schema } : {}) },
      }),
    });
    if (r.status === 429 || r.status >= 500) continue; // الحصة أو عطل مؤقت: جرّب النموذج التالي
    if (!r.ok) throw new Error("gemini " + r.status);
    const j = await r.json();
    const text = j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
    if (!text) continue;
    return { text, model, tokens: j?.usageMetadata?.totalTokenCount || 0 };
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  let body: any; try { body = await req.json(); } catch (_) { return json({ ok: false, msg: "طلب غير صالح" }, 400); }
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> origin/main
>>>>>>> origin/main
  const task = TASKS[body?.kind];
  if (!task) return json({ ok: false, msg: "طلب غير صالح" }, 400);
  const me = await who(req, body);
  if (!me) return json({ ok: false, msg: "غير مصرّح" }, 401);
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
=======
  // الهوية قبل أي شيء: موظف نشط بجلسته (JWT مستخدم)، أو جلسة بوابة صالحة (pa_acc) للترجمة وحدها.
  // تُنشر الدالة مع التحقق من JWT (verify_jwt = true): البوابة ترسل مفتاح anon في Authorization وجلستها في portal_s.
  // فحص الجاهزية بعد بوابة JWT (يكفي مفتاح anon) وبلا أي بيانات: هل المفتاح موجود وصالح؟ (قائمة النماذج، بلا توليد ولا حصة). لا يُطبع المفتاح.
  if (body?.kind === "ping") {
    if (!KEY) return json({ ok: false, key: false });
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", { headers: { "x-goog-api-key": KEY } });
    return json({ ok: r.ok, key: true, status: r.status, models: MODELS });
  }
  const me = await who(req, body);
  if (!me) return json({ ok: false, msg: "غير مصرّح" }, 401);
  const task = TASKS[body?.kind];
  if (!task) return json({ ok: false, msg: "طلب غير صالح" }, 400);
>>>>>>> origin/main
>>>>>>> origin/main
>>>>>>> origin/main
  if (me.portal && !task.portal) return json({ ok: false, msg: "غير مصرّح" }, 403);
  if (!KEY) return json({ ok: false, msg: QUIET });

  const since = new Date(Date.now() - 864e5).toISOString();
  const { count } = await sb.from("ai_usage").select("id", { count: "exact", head: true }).eq("actor", me.id).eq("cached", false).gte("at", since);
  if ((count || 0) >= (me.portal ? LIMIT_PORTAL : LIMIT_STAFF)) return json({ ok: false, msg: "بلغتَ حد الاستعمال اليومي للمساعد الذكي، ويتجدد غدًا." });

  const map = new Map<string, string>();
  const input = redactDeep(body.input ?? {}, map) as any;
  const schema = body.kind === "data_qa" ? JSON.parse(JSON.stringify(task.schema).replace('"enum":[]', `"enum":${JSON.stringify([...(input.intents || []).map((x: any) => String(x.id)), "none"])}`)) : task.schema;
  const prompt = task.prompt(input);
  const ck = await sha(body.kind + "\n" + prompt);
  const { data: hit } = await sb.from("ai_cache").select("out").eq("k", ck).gte("at", since).maybeSingle();
  if (hit) { await log(me.id, body.kind, true, true, null, 0); return json({ ok: true, out: JSON.parse(restore(JSON.stringify(hit.out), map)), cached: true, suggestion: true }); }

  try {
    const r = await gemini(task, prompt, schema);
    if (!r) { await log(me.id, body.kind, false, false, null, 0); return json({ ok: false, msg: QUIET }); }
    let out: unknown = r.text; if (schema) { try { out = JSON.parse(r.text); } catch (_) { out = { text: r.text }; } }
    await sb.from("ai_cache").upsert({ k: ck, kind: body.kind, out, at: new Date().toISOString() });
    await log(me.id, body.kind, true, false, r.model, r.tokens);
    return json({ ok: true, out: JSON.parse(restore(JSON.stringify(out), map)), model: r.model, suggestion: true });
  } catch (e) {
    console.error("ai", body.kind, String(e));
    await log(me.id, body.kind, false, false, null, 0);
    return json({ ok: false, msg: QUIET });
  }
});
