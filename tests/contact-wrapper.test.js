// The deployed contact function (netlify/functions-modern/contact.mjs): its
// Netlify config and the origin check that runs before the form handler.

const test = require("node:test");
const assert = require("node:assert/strict");

const load = () => import("../netlify/functions-modern/contact.mjs");

test("contact submissions are limited to 3 per minute per IP", async () => {
  const { config } = await load();
  assert.equal(config.path, "/.netlify/functions/contact");
  assert.equal(config.rateLimit.windowLimit, 3);
  assert.equal(config.rateLimit.windowSize, 60);
  assert.deepEqual(config.rateLimit.aggregateBy, ["ip", "domain"]);
});
