// The local preview server serves only public files, injects live reload,
// mirrors the live site's security headers and fakes the two functions.

const test = require("node:test");
const assert = require("node:assert/strict");
const { createDevServer, resolveFile, LIVE_SCRIPT } = require("../scripts/dev-server.js");

let base;
let server;

test.before(async () => {
  ({ server } = createDevServer());
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test("pages are served with live reload injected", async () => {
  const response = await fetch(`${base}/`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/);
  const html = await response.text();
  assert.ok(html.includes(`<script src="${LIVE_SCRIPT}" defer></script>`));
  assert.ok(html.includes("<title>Buddies Spa"));
});

test("extensionless URLs work like Netlify (/services → services.html)", async () => {
  const response = await fetch(`${base}/services`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /<title>Services/);
});

test("the live site's security headers apply, minus localhost-only exceptions", async () => {
  const response = await fetch(`${base}/`);
  const csp = response.headers.get("content-security-policy");
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /script-src 'self'/);
  assert.doesNotMatch(csp, /upgrade-insecure-requests|frame-ancestors/);
  assert.equal(response.headers.get("strict-transport-security"), null);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("private and non-public files are never served", async () => {
  for (const url of ["/.env.example", "/package.json", "/netlify/functions/contact.js", "/scripts/build-site.js", "/%2e%2e/package.json", "/node_modules/sharp/package.json", "/tests/site.test.js", "/brand-source/logo-original.png"]) {
    const response = await fetch(`${base}${url}`);
    assert.equal(response.status, 404, `${url} should be 404`);
  }
  assert.equal(resolveFile("/../package.json"), null);
  assert.equal(resolveFile("/css/../package.json"), null);
});

test("unknown pages get the 404 page", async () => {
  const response = await fetch(`${base}/no-such-page`);
  assert.equal(response.status, 404);
  assert.match(await response.text(), /Page Not Found/);
});

test("forms use the real validation but are never emailed", async () => {
  const post = (body) => fetch(`${base}/.netlify/functions/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const valid = await post({ form_type: "contact", page: "contact.html", name: "Alex", email: "alex@example.com", message: "Hello" });
  assert.equal(valid.status, 200);
  assert.equal((await valid.json()).dev, true);
  const invalid = await post({ form_type: "contact", page: "contact.html", name: "Alex", email: "not-an-email", message: "Hello" });
  assert.equal(invalid.status, 400);
});

test("reviews return clearly labeled samples", async () => {
  const data = await (await fetch(`${base}/.netlify/functions/reviews`)).json();
  assert.equal(data.ok, true);
  assert.equal(data.dev, true);
  assert.ok(data.reviews.every((review) => /Sample/.test(review.author)));
});
