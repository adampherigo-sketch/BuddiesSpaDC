// Runs js/site-config.js + js/feeds.js in a sandbox to test the promo and
// event rules the browser uses (date windows, published only, categories).

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

const loadFeeds = ({ events = [], promos = [], today = "2026-11-24" } = {}) => {
  const files = {
    "data/events.json": { events },
    "data/promos.json": { promos },
    "data/staff.json": { staff: [] },
    "data/services.json": { categories: [] }
  };
  // A fixed "now" at noon in Washington, DC.
  const RealDate = Date;
  class FixedDate extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : [`${today}T17:00:00Z`]));
    }
    static now() {
      return new RealDate(`${today}T17:00:00Z`).getTime();
    }
  }
  const sandbox = {
    window: {},
    Date: FixedDate,
    Intl,
    fetch: async (url) => ({ ok: true, json: async () => files[url] }),
    document: {},
    Node: class {}
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, "js/site-config.js"), "utf8"), sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, "js/feeds.js"), "utf8"), sandbox);
  return sandbox.window.Buddies;
};

const promo = (overrides) => ({ category: "promo", status: "published", tenantId: "buddies-spa", title: "Promo", ...overrides });

test("promos show from their start date through their end date", async () => {
  const Buddies = loadFeeds({
    promos: [
      promo({ id: "running", start: "2026-11-01", end: "2026-11-30" }),
      promo({ id: "starts-today", start: "2026-11-24", end: "2026-12-05" }),
      promo({ id: "ended-yesterday", start: "2026-11-01", end: "2026-11-23" }),
      promo({ id: "future", start: "2026-12-01", end: "2026-12-31" })
    ]
  });
  const ids = [...(await Buddies.getActivePromos())].map((item) => item.id);
  assert.deepEqual(ids, ["starts-today", "running"], "newest first, only running today");
});

test("draft promos and other tenants never show", async () => {
  const Buddies = loadFeeds({
    promos: [
      promo({ id: "draft", status: "draft", start: "2026-11-01", end: "2026-11-30" }),
      promo({ id: "other-tenant", tenantId: "pma-consulting", start: "2026-11-01", end: "2026-11-30" })
    ]
  });
  assert.equal((await Buddies.getActivePromos()).length, 0);
});

test("events split into upcoming and past, and promos stay off the Events page", async () => {
  const Buddies = loadFeeds({
    events: [
      { id: "pride", status: "published", start: "2026-06-19T17:45:00", end: "2026-06-20T00:00:00" },
      { id: "tonight", status: "published", start: "2026-11-24T19:00:00" },
      { id: "next-month", status: "published", start: "2026-12-12T19:00:00" },
      { id: "hidden", status: "draft", start: "2026-12-20" }
    ],
    promos: [promo({ id: "promo", start: "2026-11-01", end: "2026-11-30" })]
  });
  const { upcoming, past } = await Buddies.getEvents();
  // Spread into this realm's arrays (the sandbox has its own Array).
  assert.deepEqual([...upcoming].map((item) => item.id), ["tonight", "next-month"]);
  assert.deepEqual([...past].map((item) => item.id), ["pride"]);
});

test("the real seed data has a promo running in November 2026", async () => {
  const promos = JSON.parse(fs.readFileSync(path.join(root, "data/promos.json"), "utf8")).promos;
  const Buddies = loadFeeds({ promos, today: "2026-11-15" });
  const active = await Buddies.getActivePromos();
  assert.equal(active[0]?.id, "promo-2026-11");
});

test("safeUrl only allows web, mail, phone and same-site links", () => {
  const Buddies = loadFeeds();
  assert.equal(Buddies.safeUrl("https://partiful.com/e/abc"), "https://partiful.com/e/abc");
  assert.equal(Buddies.safeUrl("tel:+12029267178"), "tel:+12029267178");
  assert.equal(Buddies.safeUrl("staff.html#kris"), "staff.html#kris");
  assert.equal(Buddies.safeUrl("javascript:alert(1)"), "");
  assert.equal(Buddies.safeUrl("data:text/html,hi"), "");
  assert.equal(Buddies.safeUrl("//evil.example"), "");
});

test("bookingUrl falls back to the main Square link", () => {
  const Buddies = loadFeeds();
  const main = Buddies.config.booking.main;
  assert.equal(Buddies.bookingUrl("nails"), main);
  assert.equal(Buddies.bookingUrl("unknown"), main);
  assert.equal(Buddies.bookingUrl(), main);
});
