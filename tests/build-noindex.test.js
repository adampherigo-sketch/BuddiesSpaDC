// SITE_NOINDEX: the build's switch that keeps the preview out of search
// engines. scripts/build-site.js applies these two helpers to dist/.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { addNoindexHeader, robotsTxt } = require("../scripts/build-site.js");

const headers = fs.readFileSync(path.resolve(__dirname, "..", "_headers"), "utf8");

// The header lines that belong to the "/*" block.
const allPathsBlock = (text) => {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.trim() === "/*");
  const block = [];
  for (let i = start + 1; i < lines.length && /^\s+\S/.test(lines[i]); i += 1) {
    block.push(lines[i].trim());
  }
  return block;
};

test("without SITE_NOINDEX, robots.txt allows crawling as before", () => {
  assert.equal(robotsTxt(), "User-agent: *\nAllow: /\n");
  assert.equal(
    robotsTxt({ url: "https://www.buddiesspa.com" }),
    "User-agent: *\nAllow: /\nSitemap: https://www.buddiesspa.com/sitemap.xml\n"
  );
  assert.doesNotMatch(headers, /X-Robots-Tag/, "the source _headers never carries noindex");
});

test("with SITE_NOINDEX, robots.txt disallows everything", () => {
  assert.equal(robotsTxt({ noindex: true }), "User-agent: *\nDisallow: /\n");
  assert.equal(robotsTxt({ noindex: true, url: "https://www.buddiesspa.com" }), "User-agent: *\nDisallow: /\n");
});

test("with SITE_NOINDEX, every response gets X-Robots-Tag: noindex, nofollow", () => {
  const result = addNoindexHeader(headers);
  const block = allPathsBlock(result);
  assert.ok(block.includes("X-Robots-Tag: noindex, nofollow"), "added to the /* block");
  assert.equal(block.at(-1), "X-Robots-Tag: noindex, nofollow", "appended after the existing headers");
  assert.deepEqual(block.slice(0, -1), allPathsBlock(headers), "existing /* headers unchanged");
  assert.equal((result.match(/X-Robots-Tag/g) || []).length, 1, "added once");
  // Everything outside the added line is byte-for-byte the same.
  assert.equal(result.replace("  X-Robots-Tag: noindex, nofollow\n", ""), headers);
});
