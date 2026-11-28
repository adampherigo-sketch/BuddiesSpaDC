// Runs js/site-config.js + js/feeds.js in a sandbox to test the event rules
// the browser uses (upcoming vs past, published only, categories).

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

const loadFeeds = ({ events = [], today = "2026-11-24" } = {}) => {
  const files = {
    "data/events.json": { events },
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

test("events split into upcoming and past, and promos stay off the Events page", async () => {
  const Buddies = loadFeeds({
    events: [
      { id: "pride", status: "published", start: "2026-06-19T17:45:00", end: "2026-06-20T00:00:00" },
      { id: "tonight", status: "published", start: "2026-11-24T19:00:00" },
      { id: "next-month", status: "published", start: "2026-12-12T19:00:00" },
      { id: "hidden", status: "draft", start: "2026-12-20" },
      { id: "other-tenant", status: "published", tenantId: "pma-consulting", start: "2026-12-01" },
      promo({ id: "promo", start: "2026-11-01", end: "2026-11-30" })
    ]
  });
  const { upcoming, past } = await Buddies.getEvents();
  // Spread into this realm's arrays (the sandbox has its own Array).
  assert.deepEqual([...upcoming].map((item) => item.id), ["tonight", "next-month"]);
  assert.deepEqual([...past].map((item) => item.id), ["pride"]);
});

test("team Book buttons only promise a person when they have their own link", () => {
  const Buddies = loadFeeds();
  const main = Buddies.config.booking.main;

  const personal = Buddies.personBooking({ name: "Mimi Nguyen", bookingUrl: "https://book.squareup.com/appointments/abc/staff/mimi", services: ["nails"] });
  assert.equal(personal.label, "Book with Mimi");
  assert.equal(personal.href, "https://book.squareup.com/appointments/abc/staff/mimi");

  const generic = Buddies.personBooking({ name: "Mimi Nguyen", bookingUrl: "", services: ["nails"] });
  assert.equal(generic.label, "Book now");
  assert.equal(generic.href, Buddies.bookingUrl("nails"));

  const unsafe = Buddies.personBooking({ name: "Don Tran", bookingUrl: "javascript:alert(1)" });
  assert.equal(unsafe.label, "Book now", "an unsafe link is ignored");
  assert.equal(unsafe.href, main);
});

test("no one in the seed team data is promised a personal booking link", () => {
  const Buddies = loadFeeds();
  const staff = JSON.parse(fs.readFileSync(path.join(root, "data/staff.json"), "utf8")).staff;
  for (const person of staff) {
    const { label } = Buddies.personBooking(person);
    assert.equal(label, person.bookingUrl ? `Book with ${person.name.split(" ")[0]}` : "Book now", person.name);
  }
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
