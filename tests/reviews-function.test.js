const test = require("node:test");
const assert = require("node:assert/strict");
const { getReviews, toPayload, resetCache, CACHE_MS } = require("../netlify/functions/reviews.js");

const env = { GOOGLE_PLACES_API_KEY: "test-key", GOOGLE_PLACE_ID: "ChIJ_test_place_id_123" };

const place = {
  rating: 4.8,
  userRatingCount: 212,
  googleMapsUri: "https://maps.google.com/?cid=123",
  reviews: [
    {
      rating: 5,
      text: { text: "Best Brazilian in DC." },
      authorAttribution: { displayName: "Chris P", uri: "https://www.google.com/maps/contrib/1" },
      relativePublishTimeDescription: "2 weeks ago",
      publishTime: "2026-11-01T10:00:00Z"
    },
    {
      rating: 3,
      text: { text: "Good, a little rushed." },
      authorAttribution: { displayName: "Dana", uri: "javascript:alert(1)" },
      relativePublishTimeDescription: "a day ago",
      publishTime: "2026-11-20T10:00:00Z"
    },
    {
      rating: 5,
      originalText: { text: "Increíble." },
      authorAttribution: { displayName: "Luis" },
      publishTime: "2026-10-01T10:00:00Z"
    }
  ]
};

const okFetch = (calls = []) => async (url, options) => {
  calls.push({ url, options });
  return { ok: true, json: async () => place };
};

test.beforeEach(() => resetCache());

test("reports not_configured without a key or place ID", async () => {
  const result = await getReviews({ env: {}, fetchImpl: okFetch() });
  assert.equal(result.status, 503);
  assert.equal(result.payload.error, "not_configured");
});

test("calls Places API (New) with the key in a header and a field mask", async () => {
  const calls = [];
  await getReviews({ env, fetchImpl: okFetch(calls) });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /^https:\/\/places\.googleapis\.com\/v1\/places\/ChIJ_test_place_id_123$/);
  assert.equal(calls[0].options.headers["X-Goog-Api-Key"], "test-key");
  assert.match(calls[0].options.headers["X-Goog-FieldMask"], /reviews/);
  assert.doesNotMatch(calls[0].url, /test-key/);
});

test("returns rating, count and newest-first reviews with safe links", async () => {
  const { status, payload } = await getReviews({ env, fetchImpl: okFetch() });
  assert.equal(status, 200);
  assert.equal(payload.rating, 4.8);
  assert.equal(payload.userRatingCount, 212);
  assert.deepEqual(payload.reviews.map((review) => review.author), ["Dana", "Chris P", "Luis"]);
  assert.equal(payload.reviews[0].authorUri, "", "non-https author links are dropped");
  assert.equal(payload.reviews[2].text, "Increíble.");
});

test("REVIEWS_MIN_RATING filters lower ratings", async () => {
  const { payload } = await getReviews({ env: { ...env, REVIEWS_MIN_RATING: "4" }, fetchImpl: okFetch() });
  assert.ok(payload.reviews.every((review) => review.rating >= 4));
  assert.equal(payload.reviews.length, 2);
});

test("caches results so repeat visits don't call Google", async () => {
  const calls = [];
  const now = Date.now();
  await getReviews({ env, fetchImpl: okFetch(calls), now });
  await getReviews({ env, fetchImpl: okFetch(calls), now: now + 1000 });
  assert.equal(calls.length, 1);
  await getReviews({ env, fetchImpl: okFetch(calls), now: now + CACHE_MS + 1 });
  assert.equal(calls.length, 2);
});

test("serves the cached copy if Google fails, otherwise reports upstream_error", async () => {
  const failing = async () => ({ ok: false, status: 500 });
  const first = await getReviews({ env, fetchImpl: failing });
  assert.equal(first.status, 502);

  const now = Date.now();
  await getReviews({ env, fetchImpl: okFetch(), now });
  const stale = await getReviews({ env, fetchImpl: failing, now: now + CACHE_MS + 1 });
  assert.equal(stale.status, 200);
  assert.equal(stale.payload.rating, 4.8);
});

test("long reviews are clipped", () => {
  const payload = toPayload({ reviews: [{ rating: 5, text: { text: "a".repeat(2000) } }] });
  assert.ok(payload.reviews[0].text.length <= 600);
  assert.ok(payload.reviews[0].text.endsWith("…"));
});
