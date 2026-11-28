// scripts/check-links.js: run against small fixture sites, so it's proven to
// catch broken links (and not just pass on the real build).

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { checkLinks, scriptAnchors } = require("../scripts/check-links.js");

const made = [];
test.after(() => made.forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })));

const site = (files) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buddies-links-"));
  made.push(dir);
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), content);
  }
  return dir;
};

const page = (body) => `<!doctype html><html><head><link rel="stylesheet" href="css/style.css"></head><body>${body}</body></html>`;

test("valid files, anchors, query strings and external links pass", () => {
  const dir = site({
    "css/style.css": "",
    "index.html": page(`<main id="main"><a href="#main">Skip</a>
      <a href="about.html?ref=home#story">Story</a>
      <a href="services.html#nails">Nails</a>
      <a href="./">Home</a> <a href="/about.html">About</a> <a href="#">Top</a>
      <a href="https://www.instagram.com/buddies_spa/">IG</a> <a href="mailto:a@b.co">Mail</a> <a href="tel:+12025550100">Call</a></main>`),
    "about.html": page(`<section id="story"></section>`),
    "services.html": page(`<div data-services></div>`)
  });
  const result = checkLinks({ siteDir: dir, extraAnchors: { "services.html": ["nails"] } });
  assert.deepEqual(result.broken, []);
  assert.equal(result.pages, 3);
  assert.ok(result.checked >= 8);
});

test("missing files and missing anchors are reported", () => {
  const dir = site({
    "css/style.css": "",
    "index.html": page(`<a href="missing.html">Gone</a>
      <a href="about.html#nope">Bad anchor</a>
      <a href="#also-nope">Bad local anchor</a>
      <a href="services.html#not-a-category">Bad script anchor</a>`),
    "about.html": page(`<section id="story"></section>`),
    "services.html": page("")
  });
  const { broken } = checkLinks({ siteDir: dir, extraAnchors: { "services.html": ["nails"] } });
  assert.equal(broken.length, 4, broken.join("\n"));
  assert.ok(broken.some((line) => line.includes('"missing.html" → missing file')));
  assert.ok(broken.some((line) => line.includes("no #nope in about.html")));
  assert.ok(broken.some((line) => line.includes("no #also-nope in index.html")));
  assert.ok(broken.some((line) => line.includes("no #not-a-category in services.html")));
});

test("services.html and book.html accept anchors built from data/services.json ids", () => {
  const anchors = scriptAnchors();
  const ids = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../data/services.json"), "utf8")).categories.map((c) => c.id);
  for (const id of ids) {
    assert.ok(anchors["services.html"].includes(id), `services.html#${id}`);
    assert.ok(anchors["book.html"].includes(id), `book.html#${id}`);
  }
  assert.ok(anchors["services.html"].includes("waxing"), "the waxing group from js/services.js");
});
