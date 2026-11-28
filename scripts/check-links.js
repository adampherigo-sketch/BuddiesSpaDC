// Buddies Spa — link checker for the built site.
//
//   npm run build && npm run check-links
//
// Scans every .html file in dist/ and checks each internal href:
//   - the target file exists in dist/ (query strings are ignored)
//   - a #anchor exists in the target page: an id="…" (or name="…") in its
//     HTML, or one the page's script creates from data/services.json ids
// Links to other sites, mailto:, tel: and similar are skipped. Exits with
// code 1 and a list of broken links if any are found.

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

// Anchors scripts add after load, keyed by the page that creates them.
// js/services.js gives each category section its id (and wraps the waxing
// categories in #waxing); js/book.js gives each category card its id.
const scriptAnchors = () => {
  const { categories } = JSON.parse(fs.readFileSync(path.join(root, "data/services.json"), "utf8"));
  const ids = categories.map((category) => category.id);
  const groups = ids.some((id) => /-waxing$/.test(id)) ? ["waxing"] : [];
  return {
    "services.html": [...ids, ...groups],
    "book.html": ids
  };
};

const SKIP = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i; // https:, mailto:, tel:, data:, protocol-relative …

const decode = (value) => value
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">");

const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});

const toPosix = (value) => value.split(path.sep).join("/");

// Resolves an href's path part (no query or hash) to a file inside the site.
const resolveTarget = (page, linkPath, siteDir = dist) => {
  if (!linkPath) {
    return page;
  }
  let target = linkPath.startsWith("/")
    ? linkPath.replace(/^\/+/, "")
    : path.posix.join(path.posix.dirname(page), linkPath);
  target = path.posix.normalize(target);
  if (target === "." || target === "" || target.endsWith("/")) {
    target = `${target === "." ? "" : target}index.html`;
  }
  const full = path.join(siteDir, target);
  if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
    target = path.posix.join(target, "index.html");
  }
  return target.startsWith("..") ? null : target;
};

// siteDir and extraAnchors are options so tests can check a small fixture.
const checkLinks = ({ siteDir = dist, extraAnchors = scriptAnchors() } = {}) => {
  if (!fs.existsSync(siteDir)) {
    throw new Error(`${path.relative(root, siteDir) || siteDir}/ not found. Run \`npm run build\` first.`);
  }

  const pages = walk(siteDir).filter((file) => file.endsWith(".html")).map((file) => toPosix(path.relative(siteDir, file))).sort();
  const extra = extraAnchors;
  const anchorCache = new Map();
  const anchorsIn = (page) => {
    if (!anchorCache.has(page)) {
      const html = fs.readFileSync(path.join(siteDir, page), "utf8");
      const found = new Set([...html.matchAll(/\s(?:id|name)="([^"]+)"/g)].map((match) => decode(match[1])));
      (extra[page] || []).forEach((id) => found.add(id));
      anchorCache.set(page, found);
    }
    return anchorCache.get(page);
  };

  const broken = [];
  let checked = 0;

  for (const page of pages) {
    const html = fs.readFileSync(path.join(siteDir, page), "utf8");
    for (const match of html.matchAll(/\shref="([^"]*)"/g)) {
      const href = decode(match[1]).trim();
      if (SKIP.test(href)) {
        continue;
      }
      checked += 1;
      const hashIndex = href.indexOf("#");
      const beforeHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
      const anchor = hashIndex >= 0 ? decodeURIComponent(href.slice(hashIndex + 1)) : "";
      const linkPath = decodeURIComponent(beforeHash.split("?")[0]);

      const target = resolveTarget(page, linkPath, siteDir);
      if (!target || !fs.existsSync(path.join(siteDir, target))) {
        broken.push(`${page}: "${href}" → missing file ${target || linkPath}`);
        continue;
      }
      if (anchor && target.endsWith(".html") && !anchorsIn(target).has(anchor)) {
        broken.push(`${page}: "${href}" → no #${anchor} in ${target}`);
      }
    }
  }

  return { pages: pages.length, checked, broken };
};

if (require.main === module) {
  try {
    const { pages, checked, broken } = checkLinks();
    if (broken.length) {
      console.error(`Broken links (${broken.length}):\n  ${broken.join("\n  ")}`);
      process.exitCode = 1;
    } else {
      console.log(`Link check passed: ${checked} internal links across ${pages} pages.`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { checkLinks, resolveTarget, scriptAnchors };
