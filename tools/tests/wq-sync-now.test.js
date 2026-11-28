// JL-SYNC: حالة «مزامنة الآن» في الواجهة (WQNOW.state في src/modules/add161.js). التشغيل: node --test tools/tests/
const { test } = require("node:test");
const assert = require("node:assert/strict");
const W = require("../../src/modules/add161.js");

const T0 = Date.parse("2026-11-28T10:00:00Z");
const req = (o) => ({ id: 1, requested_at: "2026-11-28T10:00:00Z", status: "pending", claimed_at: null, error: null, ...o });

test("بلا طلب: لا حالة", () => assert.equal(W.state(null, {}, T0).phase, "idle"));

test("طلب جديد: «جارٍ…» بانتظار جهاز الدوام، ثم يلتقطه", () => {
  assert.deepEqual(W.state(req(), { last: "2026-11-27T08:00:00Z" }, T0 + 30e3).phase, "pending");
  assert.equal(W.state(req({ status: "running", claimed_at: "2026-11-28T10:00:20Z" }), {}, T0 + 60e3).phase, "running");
});

test("وصول المزامنة بعد الطلب يعني تمّت، حتى قبل أن يُغلق المحفّز الطلب", () => {
  assert.equal(W.state(req({ status: "running" }), { last: "2026-11-28T10:01:00Z" }, T0 + 70e3).phase, "done");
  assert.equal(W.state(req({ status: "done" }), {}, T0).phase, "done");
  assert.equal(W.state(req(), { last: "2026-11-28T09:59:00Z" }, T0 + 10e3).phase, "pending", "مزامنة أقدم من الطلب لا تُحسب");
});

test("الفشل بسببه: جلسة منتهية، وسبب من جهاز الدوام", () => {
  assert.match(W.state(req({ status: "running" }), { state: "login" }, T0 + 5e3).text, /جلسة وثيقة منتهية/);
  assert.match(W.state(req({ status: "failed", error: "المتصفح مغلق" }), {}, T0).text, /المتصفح مغلق/);
});

test("المهلة: لا التقاط خلال دقيقتين = جهاز غير متصل، ولا اكتمال خلال 10 دقائق", () => {
  const off = W.state(req(), {}, T0 + (W.CLAIM_S + 1) * 1e3);
  assert.equal(off.phase, "failed"); assert.match(off.text, /غير متصل/);
  const slow = W.state(req({ status: "running", claimed_at: "2026-11-28T10:00:30Z" }), {}, T0 + 30e3 + (W.RUN_S + 1) * 1e3);
  assert.equal(slow.phase, "failed"); assert.match(slow.text, /لم تكتمل/);
});
