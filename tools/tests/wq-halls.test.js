// JL-HALLS: لوحة «يحتاج مراجعة» (HREV في src/modules/add185.js). المحلّل نفسه مختبَر داخل القاعدة: select wq_hall_selftest() ⇒ 'ok'
// (7 حالات: وقت صريح، علامة النهاية تسري على البداية، لا تخمين بلا ص/م، قاعة خارج القائمة، قاعتان، صباحًا إلى ظهرًا، تاريخ مرجعي قبل الكتاب).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const H = require("../../src/modules/add185.js");

test("المتجاهل لا يظهر، والتعارض أولًا ثم الأحدث", () => {
  const v = H.view([
    { doc_id: "1", no: "2608-4004", reason: "لا وقت صريح" },
    { doc_id: "2", no: "2611-1953", reason: "تعارض", conflict_ids: ["b1"] },
    { doc_id: "3", no: "2611-6149", reason: "قاعة خارج القائمة" },
    { doc_id: "4", no: "2611-9999", reason: "x", dismissed: true },
  ]);
  assert.deepEqual(v.map(r => r.doc_id), ["2", "3", "1"]);
  assert.equal(H.isConflict(v[0]), true); assert.equal(H.isConflict(v[1]), false);
  assert.deepEqual(H.view(null), []);
});

test("الترحيل: لا كتابة فوق حجز قائم، ولا تخمين للوقت، والتراجع يحذف المولّد من وثيقة فقط", () => {
  const m = fs.readFileSync(require.resolve("../../docs/migrations/2026-11-28_wq_halls.sql"), "utf8");
  const rb = fs.readFileSync(require.resolve("../../docs/migrations/2026-11-28_wq_halls.rollback.sql"), "utf8");
  assert.match(m, /exception when exclusion_violation then/);
  assert.match(m, /تعارض مع حجز قائم \(لم يُكتب فوقه\)/);
  assert.match(m, /p2 := m\[6\]; if p2 is null then continue; end if;/, "وقت بلا علامة ص/م على نهايته يُترك للمراجعة");
  assert.match(m, /data->>'src' = 'watheqa' and data->>'watheqa_no' = root/, "الرفض يلغي حجوزات الكتاب المولّدة فقط");
  assert.match(rb, /delete from public\.bookings where data->>'src' = 'watheqa';/);
  assert.doesNotMatch(rb, /delete from public\.bookings;/);
});

test("JL-HALLS-2: الحالة من الرد الوارد (موافقة، رفض، تحويل، غير واضح) بنصوص حقيقية، والرفض قبل الموافقة", () => {
  const m = fs.readFileSync(require.resolve("../../docs/migrations/2026-11-28_wq_halls_replies.sql"), "utf8");
  assert.match(m, /if t ~ no_re then return 'no'; end if;\s*if t ~ ok_re then return 'ok'; end if;/, "«غير متاح» تُفحص قبل «متاح»");
  for (const no of ["2611-5137-03", "2610-2239", "2611-4785-02", "2601-6066", "2611-5137-02"]) assert.ok(m.includes(no), `مثال حقيقي ${no} في الاختبار الذاتي`);
  assert.match(m, /st := 'مبدئي';/, "لا رد بعد = مبدئي");
  assert.match(m, /update watheqa_hall_review set dismissed = true, reason = 'رُفض بالرد '/, "الرفض يحسم سؤال الطلب");
});
