// JL-SYNC: حالة «مزامنة الآن» في الواجهة (WQNOW.state في src/modules/add161.js). التشغيل: node --test tools/tests/
const { test } = require("node:test");
const assert = require("node:assert/strict");
const W = require("../../src/modules/add161.js");

const T0 = Date.parse("2026-11-28T10:00:00Z");
const req = (o) => ({ id: 1, requested_at: "2026-11-28T10:00:00Z", status: "pending", claimed_at: null, error: null, ...o });

test("بلا طلب: لا حالة", () => assert.equal(W.state(null, {}, T0).phase, "idle"));

test("طلب جديد: «جارٍ…» بانتظار جهاز متصل بوثيقة، ثم يلتقطه", () => {
  assert.deepEqual(W.state(req(), { last: "2026-11-27T08:00:00Z" }, T0 + 30e3).phase, "pending");
  assert.equal(W.state(req({ status: "running", claimed_at: "2026-11-28T10:00:20Z" }), {}, T0 + 60e3).phase, "running");
});

test("وصول المزامنة بعد الطلب يعني تمّت، حتى قبل أن يُغلق المحفّز الطلب", () => {
  assert.equal(W.state(req({ status: "running" }), { last: "2026-11-28T10:01:00Z" }, T0 + 70e3).phase, "done");
  assert.equal(W.state(req({ status: "done" }), {}, T0).phase, "done");
  assert.equal(W.state(req(), { last: "2026-11-28T09:59:00Z" }, T0 + 10e3).phase, "pending", "مزامنة أقدم من الطلب لا تُحسب");
});

test("الفشل بسببه: جلسة منتهية، وسبب من الجهاز الذي زامن", () => {
  assert.match(W.state(req({ status: "running" }), { state: "login" }, T0 + 5e3).text, /جلسة وثيقة منتهية/);
  assert.match(W.state(req({ status: "failed", error: "المتصفح مغلق" }), {}, T0).text, /المتصفح مغلق/);
});

test("المهلة: لا التقاط خلال دقيقتين = جهاز غير متصل، ولا اكتمال خلال 10 دقائق", () => {
  const off = W.state(req(), {}, T0 + (W.CLAIM_S + 1) * 1e3);
  assert.equal(off.phase, "failed"); assert.match(off.text, /لم يلتقط الطلب أي جهاز/);
  const slow = W.state(req({ status: "running", claimed_at: "2026-11-28T10:00:30Z" }), {}, T0 + 30e3 + (W.RUN_S + 1) * 1e3);
  assert.equal(slow.phase, "failed"); assert.match(slow.text, /لم تكتمل/);
});

test("JL-SYNC-2: لا ذكر لـ«جهاز الدوام» في أي رسالة، وخطوة الجسر تظهر أثناء التشغيل", () => {
  const all = [W.state(req(), {}, T0 + 5e3), W.state(req(), {}, T0 + (W.CLAIM_S + 1) * 1e3), W.state(req({ status: "running" }), { state: "login" }, T0),
    W.state(req({ status: "running", claimed_at: "2026-11-28T10:00:00Z" }), {}, T0 + (W.RUN_S + 1) * 1e3), W.state(req({ status: "failed", error: "login" }), {}, T0)];
  for (const s of all) assert.doesNotMatch(s.text, /جهاز الدوام/);
  assert.match(W.state(req({ status: "failed", error: "login" }), {}, T0).text, /جلسة وثيقة منتهية على هذا الجهاز/);
  assert.equal(W.state(req({ status: "running", claimed_at: "2026-11-28T10:00:00Z" }), {}, T0 + 5e3, "قراءة الكتب 4 من 12").text, "جارٍ… قراءة الكتب 4 من 12");
});

test("JL-SYNC-2: هذا الجهاز يزامن بنفسه فقط بجسر 2.6 جاهز", () => {
  assert.equal(W.bridgeOk({ copilotBridge: "ready", copilotBridgeV: "2.6" }), true);
  assert.equal(W.bridgeOk({ copilotBridge: "ready", copilotBridgeV: "2.5" }), false);
  assert.equal(W.bridgeOk({ copilotBridge: "1", copilotBridgeV: "2.6" }), false);
  assert.equal(W.bridgeOk({}), false);
});

test("JL-SYNC-2: نافذة القراءة يومان قبل آخر مزامنة بتوقيت الكويت، وبلا مزامنة يقرأ الكل", () => {
  assert.equal(W.since({ last: "2026-11-25T08:40:00Z" }), "2026-11-23T11:40");
  assert.equal(W.since({}), ""); assert.equal(W.since(null), "");
});
