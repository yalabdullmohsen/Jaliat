// Receives documents read from the Watheqa system (by the bridge or an assisted sync) and stores them for «إنجاز».
// Partial updates: fields that are missing or empty are left untouched (a body-only fetch never wipes list data).
// Only community-related documents are kept (others are skipped).
// v8: stores procedures («إجراءات الوثيقة»: «لا مانع» there counts as approval) and the page's links to its original letter / sub-letters,
//     then wq_link_parents() links every approval to the original letter.
// v9: list rows with a different column layout are ignored, the first sender of a known document is kept,
//     «لم يتم الموافقة» counts as a refusal, and the old recipient code #28105 is shown as Hawalli mosques.
// v11 (JL-SYNC-2): «مزامنة الآن» from any device: the bridge sends the signed-in user's session (Authorization: Bearer)
//     instead of the key; only active admins/editors are accepted. While settings.wq_sync_auto.paused is true, key pushes
//     (the periodic task) are refused unless a «مزامنة الآن» request is open, so the periodic sync stays off until Yusuf turns it back on.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, x-key, authorization, apikey", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const REL = /جالي|البنغال|الارد|الأرد|الاوردو|الأوردو|الفلبين|الهند|كيرل|مهتد|بعوث|علمني|البلاغ|النيبال|سيريلانك|الأفغان|الافغان|الصين|اندونيس|الاندونيس|الباكستان|التاميل|المالايالام|الفارسي|وافد|تحويل خطبة|غير الناطقين|ترجمة خطبة|خطبة الجمعة|حجز قاعة|حلقة|دروس|درس |التعريف بالإسلام|الإسلامي الكويتي|فصول/;
const OK = /لا\s*مانع|لا يوجد تعارض|نفيدكم بالموافقة|تمت الموافقة|نوافق على|الموافقة على/;
// in the procedures a request like «للتفضل بالموافقة على» is not an approval: only clear answers count
const ACT_OK = /لا\s*مانع|لا يوجد (?:أي |اي )?تعارض|تمت الموافق[ةه]|تم الموافق[ةه]|نوافق|موافق مبدئياً?|مع الموافق[ةه]/;
const NO = /عدم الموافقة|نعتذر|يتعذر|نأسف|لا نوافق|لم يتم الموافق[ةه]/;
const TO_CODES: Record<string, string> = { "#28105": "مدير اداره مساجد محافظه حولي" };
const fixTo = (t: string) => Object.entries(TO_CODES).reduce((x, [c, n]) => x.replace(c, n), t);
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
let key = "";

// who is pushing: "key" (periodic task / assisted sync) or "user" (the bridge on the device where «مزامنة الآن» was pressed)
async function caller(req: Request): Promise<{ via: "key" | "user"; user?: string } | null> {
  if (!key) { const { data } = await sb.from("app_secrets").select("v").eq("k", "watheqa_ingest").single(); key = data?.v || ""; }
  const xk = req.headers.get("x-key");
  if (xk) return key && xk === key ? { via: "key" } : null;
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data: u } = await sb.auth.getUser(jwt);
  if (!u?.user) return null;
  const { data: p } = await sb.from("profiles").select("role,active").eq("id", u.user.id).maybeSingle();
  return p?.active && ["admin", "editor"].includes(p.role) ? { via: "user", user: u.user.id } : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const who = await caller(req);
    if (!who) return new Response("forbidden", { status: 403, headers: CORS });
    if (who.via === "key") {
      const { data: flag } = await sb.from("settings").select("value").eq("key", "wq_sync_auto").maybeSingle();
      if (flag?.value?.paused) {
        const { count: open } = await sb.from("watheqa_sync_requests").select("id", { count: "exact", head: true }).in("status", ["pending", "running"]);
        if (!open) return json({ ok: false, paused: true, error: "المزامنة الدورية متوقفة مؤقتًا (settings.wq_sync_auto)" }, 423);
      }
    }
    const { docs } = await req.json();
    if (!Array.isArray(docs) || docs.length > 500) return new Response("bad", { status: 400, headers: CORS });
    const s = (v: unknown, n = 300) => String(v ?? "").trim().slice(0, n);
    const all = docs.filter((d) => d && /^\d+$/.test(String(d.id)));
    const { data: have } = await sb.from("watheqa_docs").select("id").in("id", all.map((d) => String(d.id)));
    const known = new Set((have || []).map((x: { id: string }) => x.id));
    const rows = all.filter((d) => known.has(String(d.id)) || REL.test([d.subj, d.body, d.to, ...(Array.isArray(d.row) ? d.row : [])].join(" "))).map((d) => {
      const body = s(d.body, 8000), actions = s(d.actions, 4000);
      const links = Array.isArray(d.links) ? [...new Set(d.links.map((x: unknown) => String(x)).filter((x: string) => /^\d{4,}$/.test(x) && x !== String(d.id)))].slice(0, 30) : [];
      let row = Array.isArray(d.row) ? d.row.map((x: unknown) => s(x, 300)) : null;
      if (row && /^\d{4}\/\d{2}\/\d{2}/.test(row[5] || "")) row = null;
      const r: Record<string, unknown> = { id: String(d.id), no: s(d.no, 20), doc_date: s(d.date, 20), to_whom: fixTo(s(d.to)), subj: s(d.subj, 500), body, signer: s(d.signer), synced_at: new Date().toISOString() };
      if (row) {
        Object.assign(r, { status: row[4] || "", action_state: row[1] || "", created: row[6] || "", last_action: row[7] || "" });
        if (!known.has(String(d.id))) r.sender = row[5] || "";
      }
      if (body) {
        r.refs = [...new Set((body.match(/\d{4}\s*-\s*\d{4}/g) || []).map((x) => x.replace(/\s+/g, "")).map((x) => { const [a, b] = x.split("-"); return +a < +b && b.startsWith("26") ? `${b}-${a}` : x; }))].slice(0, 20);
        r.approval = OK.test(body) && !NO.test(body);
      }
      if (actions) { r.actions = actions; r.act_ok = ACT_OK.test(actions) && !NO.test(actions); }
      if (links.length) r.links = links;
      for (const k of Object.keys(r)) if (r[k] === "" && k !== "id") delete r[k];
      return r;
    });
    const groups = new Map<string, Record<string, unknown>[]>();
    for (const r of rows) { const sig = Object.keys(r).sort().join(","); if (!groups.has(sig)) groups.set(sig, []); groups.get(sig)!.push(r); }
    for (const g of groups.values()) { const { error } = await sb.from("watheqa_docs").upsert(g); if (error) throw error; }
    const { data: linked } = await sb.rpc("wq_link_parents", { p_all: false });
    const { count } = await sb.from("watheqa_docs").select("id", { count: "exact", head: true });
    // updating watheqa_sync closes any open «مزامنة الآن» request as done (trigger watheqa_sync_settings_close)
    await sb.from("settings").upsert({ key: "watheqa_sync", value: { last: new Date().toISOString(), count, via: who.via } });
    return json({ ok: true, n: rows.length, skipped: all.length - rows.length, linked });
  } catch (e) {
    return new Response(String(e), { status: 500, headers: CORS });
  }
});
