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

// Runs fn with the given environment variables set (undefined = unset), then
// restores them.
const setEnv = (vars) => {
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
};

const withEnv = async (vars, fn) => {
  const previous = Object.fromEntries(Object.keys(vars).map((key) => [key, process.env[key]]));
  setEnv(vars);
  try {
    return await fn();
  } finally {
    setEnv(previous);
  }
};

const post = (origin) => new Request("https://www.buddiesspa.com/.netlify/functions/contact", {
  method: "POST",
  headers: { "content-type": "application/json", ...(origin ? { origin } : {}) }
});

test("production blocks every request until CONTACT_ALLOWED_ORIGINS is set", async () => {
  const { originIsAllowed, default: handle } = await load();
  await withEnv({ CONTEXT: "production", CONTACT_ALLOWED_ORIGINS: undefined }, async () => {
    assert.equal(originIsAllowed(post("https://www.buddiesspa.com")), false);
    assert.equal(originIsAllowed(post()), false);
    const response = await handle(post("https://www.buddiesspa.com"), {});
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error, "forbidden");
  });
  // Functions 2.0 passes the deploy context on the context object as well.
  await withEnv({ CONTEXT: undefined, CONTACT_ALLOWED_ORIGINS: undefined }, async () => {
    assert.equal(originIsAllowed(post("https://www.buddiesspa.com"), { deploy: { context: "production" } }), false);
  });
});

test("previews and local dev work without CONTACT_ALLOWED_ORIGINS", async () => {
  const { originIsAllowed } = await load();
  for (const context of [undefined, "dev", "deploy-preview", "branch-deploy"]) {
    await withEnv({ CONTEXT: context, CONTACT_ALLOWED_ORIGINS: undefined }, async () => {
      assert.equal(originIsAllowed(post("https://deploy-preview-1--buddies.netlify.app")), true, String(context));
    });
  }
});

test("a configured allow-list applies in every context", async () => {
  const { originIsAllowed } = await load();
  await withEnv({ CONTEXT: "production", CONTACT_ALLOWED_ORIGINS: "https://www.buddiesspa.com,https://buddiesspa.com" }, async () => {
    assert.equal(originIsAllowed(post("https://www.buddiesspa.com")), true);
    assert.equal(originIsAllowed(post("https://buddiesspa.com")), true);
    assert.equal(originIsAllowed(post("https://evil.example")), false);
    assert.equal(originIsAllowed(post()), false);
  });
});
