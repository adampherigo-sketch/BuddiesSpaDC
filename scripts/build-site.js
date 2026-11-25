// Buddies Spa — production build. Copies the public site into dist/:
//   - writes the shared header/footer (partials/) into every page
//   - converts PNG/JPEG images to resized WebP and rewrites references
//   - generates favicons and the social share image from the logo
//   - adds FAQ structured data, canonical URLs, sitemap, robots, security.txt
//
// Adapted from the PMA Consulting build (same pipeline, Buddies page list).

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist");

const pages = [
  "index.html",
  "about.html",
  "services.html",
  "staff.html",
  "faq.html",
  "events.html",
  "partners.html",
  "careers.html",
  "contact.html",
  "book.html",
  "privacy.html",
  "terms.html",
  "404.html"
];
const indexablePages = pages.filter((page) => page !== "404.html");

// Public folders. assets/m-events (if added later) and partials/ stay private.
const directories = ["css", "js", "fonts", "data"];
const rootFiles = ["_headers", "_redirects"];

// Brand assets (favicons + social image) are generated at build time; the
// share image uses this logo, recolored to the design's brown.
const LOGO_SOURCE = "brand-source/logo-mark.png";
const BRAND_DIR = "images/brand";

// Largest published width per image folder (about 2x the largest CSS size).
// First matching prefix wins; originals in images/ are never modified.
const IMAGE_MAX_WIDTHS = [
  ["css/images/", 1600],
  ["images/logo", 900],
  ["images/equality-chamber", 300],
  ["images/partners/", 600],
  ["images/staff/", 900],
  ["images/services/", 1100],
  ["images/hero/", 1100],
  ["images/promos/", 1400],
  ["images/specials/", 1040],
  ["images/events/", 1200],
  ["images/", 1200]
];
const CONVERTIBLE = new Set([".png", ".jpg", ".jpeg"]);
const TEXT_EXTENSIONS = new Set([".html", ".css", ".js", ".json"]);

const toPosix = (value) => value.split(path.sep).join("/");

const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true })
  .flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.name === ".DS_Store") {
      return [];
    }
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });

const copy = (source) => {
  fs.cpSync(path.join(root, source), path.join(output, source), {
    recursive: true,
    // Notes like css/images/README.md stay out of the public site.
    filter: (file) => path.basename(file) !== ".DS_Store" && !file.endsWith(".md")
  });
};

const maxWidthFor = (relativePath) =>
  IMAGE_MAX_WIDTHS.find(([prefix]) => relativePath.startsWith(prefix))[1];

// ---- Images ---------------------------------------------------------------

const buildImages = async (sharp) => {
  const renamed = new Map();
  let before = 0;
  let after = 0;

  // images/ holds content photos; css/images/ holds photos for design spots.
  const designImages = path.join(root, "css", "images");
  const sources = [
    ...walk(path.join(root, "images")),
    ...(fs.existsSync(designImages) ? walk(designImages).filter((file) => !file.endsWith(".md")) : [])
  ];

  for (const absolute of sources) {
    const relative = toPosix(path.relative(root, absolute));
    const extension = path.extname(relative).toLowerCase();
    const destination = path.join(output, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    before += fs.statSync(absolute).size;

    if (!CONVERTIBLE.has(extension)) {
      fs.copyFileSync(absolute, destination);
      after += fs.statSync(destination).size;
      continue;
    }

    const webpRelative = relative.slice(0, -extension.length) + ".webp";
    if (fs.existsSync(path.join(root, webpRelative))) {
      renamed.set(relative, webpRelative);
      continue;
    }

    const webpDestination = path.join(output, webpRelative);
    // css/ was copied as-is; publish only the optimized version.
    fs.rmSync(destination, { force: true });
    await sharp(absolute)
      .rotate()
      .resize({ width: maxWidthFor(relative), withoutEnlargement: true })
      .webp({ quality: 82, effort: 5 })
      .toFile(webpDestination);

    after += fs.statSync(webpDestination).size;
    renamed.set(relative, webpRelative);
  }

  const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1);
  console.log(`Optimized images: ${mb(before)} MB -> ${mb(after)} MB`);
  return renamed;
};

// Favicons use the script "B" from the logo; the share image uses the full
// champagne logo on onyx with a soft gold glow.
const buildBrandAssets = async (sharp) => {
  const brandDir = path.join(output, BRAND_DIR);
  fs.mkdirSync(brandDir, { recursive: true });

  // The "B" medallion from the homepage design: brown disc, gold ring, ivory B.
  const medallion = (size, { square = false } = {}) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
    ${square ? '<rect width="100" height="100" fill="#6e4a2c"/>' : ""}
    <circle cx="50" cy="50" r="${square ? 40 : 47}" fill="#6e4a2c" stroke="#c9a45c" stroke-width="${square ? 1.5 : 3}"/>
    <text x="50" y="${square ? 66 : 68}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${square ? 50 : 58}" fill="#f8f4ec">B</text></svg>`);

  await sharp(medallion(64)).resize(32, 32).png().toFile(path.join(brandDir, "favicon-32.png"));
  await sharp(medallion(180, { square: true })).png().toFile(path.join(brandDir, "apple-touch-icon.png"));

  // Social share image: the script logo in the design's brown on ivory,
  // inside the thin gold frames of the welcome doors.
  const { data, info } = await sharp(path.join(root, LOGO_SOURCE)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 0x6e;
    data[i + 1] = 0x4a;
    data[i + 2] = 0x2c;
  }
  const mark = await sharp(data, { raw: info }).resize({ height: 330 }).png().toBuffer();
  const markMeta = await sharp(mark).metadata();
  const background = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <rect width="1200" height="630" fill="#f8f4ec"/>
    <rect x="36" y="36" width="1128" height="558" fill="none" stroke="#b8914a" stroke-opacity=".35"/>
    <rect x="54" y="54" width="1092" height="522" fill="none" stroke="#b8914a" stroke-opacity=".6"/></svg>`);

  await sharp(background)
    .composite([{ input: mark, left: Math.round((1200 - markMeta.width) / 2), top: Math.round((630 - markMeta.height) / 2) }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(path.join(brandDir, "og-image.jpg"));

  console.log("Generated favicons and social share image");
};

// ---- Pages ----------------------------------------------------------------

// Netlify sets process.env.URL during builds; locally URL-based output is skipped.
const siteUrl = () => (process.env.URL || "").replace(/\/+$/, "");
const pageUrl = (page) => `${siteUrl()}/${page === "index.html" ? "" : page}`;
const escapeAttribute = (value) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

const readPartial = (name) => fs.readFileSync(path.join(root, "partials", `${name}.html`), "utf8")
  .replace(/^<!--[\s\S]*?-->\s*/, "");

// Keep in sync with markActiveLinks() in js/nav.js.
const markLinks = (html, page) => html.replace(
  /<a((?:\s+(?!href)[\w-]+="[^"]*")*)\s+href="([^"]+)"/g,
  (match, attributes, href) => {
    if (href !== page || /class="[^"]*\bbtn\b/.test(attributes)) {
      return match;
    }
    return `<a${attributes} href="${href}" aria-current="page"`;
  }
);

const insertPartials = (html, page) => {
  const header = readPartial("header").replace(/<nav[\s\S]*?<\/nav>/, (nav) => markLinks(nav, page));
  const footer = readPartial("footer")
    .replace(/<nav class="footer-col[^"]*"[\s\S]*?<\/nav>/g, (column) => markLinks(column, page))
    .replace(/(<span data-current-year>)\d{4}/, `$1${new Date().getFullYear()}`);

  const filled = html
    .replace(/(<header class="site-header" data-site-header>)(<\/header>)/, (match, open, close) => `${open}\n${header}${close}`)
    .replace(/(<footer class="site-footer" data-site-footer>)(<\/footer>)/, (match, open, close) => `${open}\n${footer}${close}`);

  if (!filled.includes('header-bar"') || !filled.includes('footer-top"')) {
    throw new Error(`${page} is missing the shared header or footer placeholder`);
  }
  return filled;
};

const addCanonical = (html, page) => {
  if (!siteUrl() || !indexablePages.includes(page)) {
    return html;
  }
  const url = escapeAttribute(pageUrl(page));
  return html.replace(
    /(<title>[^<]*<\/title>\n)/,
    `$1  <link rel="canonical" href="${url}">\n  <meta property="og:url" content="${url}">\n`
  );
};

// FAQPage structured data from data/faq.json (answered questions only).
const plainText = (text) => text
  .replace(/\*\*(.+?)\*\*/g, "$1")
  .replace(/^- /gm, "• ")
  .replace(/\n{2,}/g, "\n")
  .trim();

const faqSchema = () => {
  const faq = JSON.parse(fs.readFileSync(path.join(root, "data/faq.json"), "utf8"));
  const entities = faq.groups.flatMap((group) => group.items)
    .filter((item) => !item.placeholder && !/\[Placeholder/i.test(item.a))
    .map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: plainText(item.a) }
    }));
  const json = JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: entities }, null, 2)
    .replace(/</g, "\\u003c");
  return `<script type="application/ld+json">\n${json}\n  </script>`;
};

const addFaqSchema = (html) => html.replace(/<!-- build: faq-schema[^>]*-->/, faqSchema);

// Social platforms and structured data need absolute image URLs.
const absolutizeImages = (html) => {
  if (!siteUrl()) {
    return html;
  }
  return html
    .replace(/(<meta\s+property="og:image"\s+content=")(?!https?:)\/?([^"]+)"/g, `$1${siteUrl()}/$2"`)
    .replace(/("image":\s*")(?!https?:)\/?([^"]+)"/g, `$1${siteUrl()}/$2"`);
};

const lazyLoadFooterImages = (html) => html.replace(
  /<footer[\s\S]*?<\/footer>/g,
  (footer) => footer.replace(/<img(?![^>]*\bloading=)/g, '<img loading="lazy" decoding="async"')
);

const buildPages = () => {
  for (const page of pages) {
    const source = fs.readFileSync(path.join(root, page), "utf8");
    let html = insertPartials(source, page);
    html = addCanonical(html, page);
    html = addFaqSchema(html);
    fs.writeFileSync(path.join(output, page), html);
  }
};

// ---- Search + security files ----------------------------------------------

const buildSearchFiles = () => {
  const lines = ["User-agent: *", "Allow: /"];
  if (siteUrl()) {
    const urls = indexablePages
      .filter((page) => !["privacy.html", "terms.html"].includes(page))
      .map((page) => `  <url><loc>${pageUrl(page)}</loc></url>`)
      .join("\n");
    fs.writeFileSync(
      path.join(output, "sitemap.xml"),
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
    );
    lines.push(`Sitemap: ${siteUrl()}/sitemap.xml`);
  }
  fs.writeFileSync(path.join(output, "robots.txt"), `${lines.join("\n")}\n`);
};

// security.txt (RFC 9116); regenerated each build so Expires never lapses.
const buildSecurityTxt = () => {
  const expires = new Date();
  expires.setUTCFullYear(expires.getUTCFullYear() + 1);
  const lines = [
    "Contact: mailto:buddiesmensspa@gmail.com",
    `Expires: ${expires.toISOString().replace(/\.\d{3}Z$/, "Z")}`,
    "Preferred-Languages: en"
  ];
  if (siteUrl()) {
    lines.push(`Canonical: ${siteUrl()}/.well-known/security.txt`);
  }
  const directory = path.join(output, ".well-known");
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "security.txt"), `${lines.join("\n")}\n`);
};

const rewriteReferences = (renamed) => {
  const pattern = /(?:css\/)?images\/[A-Za-z0-9_./-]+\.(?:png|jpe?g)/gi;
  const cssDir = path.join(output, "css") + path.sep;
  const usedImages = new Set();

  for (const file of walk(output)) {
    const extension = path.extname(file).toLowerCase();
    if (!TEXT_EXTENSIONS.has(extension)) {
      continue;
    }
    const original = fs.readFileSync(file, "utf8");
    // Inside stylesheets, url("images/…") is relative to css/.
    const inCss = file.startsWith(cssDir);
    let content = original.replace(pattern, (match) => {
      const key = inCss && !match.startsWith("css/") ? `css/${match}` : match;
      usedImages.add(key);
      const published = renamed.get(key);
      if (!published) {
        return match;
      }
      return key === match ? published : published.slice("css/".length);
    });
    if (extension === ".html") {
      content = lazyLoadFooterImages(absolutizeImages(content));
    }
    if (content !== original) {
      fs.writeFileSync(file, content);
    }
  }

  const unused = [...renamed.keys()].filter((image) => !usedImages.has(image));
  if (unused.length) {
    console.warn(`Note: these images are not referenced anywhere:\n  ${unused.join("\n  ")}`);
  }
};

const main = async () => {
  const sharp = require("sharp");

  for (const source of [...pages, ...directories, ...rootFiles, "images", "partials/header.html", "partials/footer.html", LOGO_SOURCE]) {
    if (!fs.existsSync(path.join(root, source))) {
      throw new Error(`Required public source is missing: ${source}`);
    }
  }

  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });

  for (const source of [...directories, ...rootFiles]) {
    copy(source);
  }

  buildPages();
  const renamed = await buildImages(sharp);
  await buildBrandAssets(sharp);
  buildSecurityTxt();
  buildSearchFiles();
  rewriteReferences(renamed);
  checkForSyncConflicts();

  console.log(`Built ${pages.length} pages into ${path.relative(root, output)}/`);
};

// iCloud Drive (Desktop & Documents sync) can rename freshly recreated
// folders to "js 2", "css 2" … which silently breaks the local preview.
// Netlify builds are unaffected; this only guards local builds.
const checkForSyncConflicts = () => {
  const expected = new Set([...directories, "images"]);
  const conflicts = fs.readdirSync(output).filter((name) => / \d+$/.test(name) || (expected.has(name.replace(/ \d+$/, "")) && !fs.existsSync(path.join(output, name.replace(/ \d+$/, "")))));
  const missing = [...expected].filter((name) => !fs.existsSync(path.join(output, name)));
  if (conflicts.length || missing.length) {
    throw new Error(
      `dist/ was changed while building (${[...conflicts, ...missing.map((name) => `missing ${name}/`)].join(", ")}). ` +
      "This happens when the project is in an iCloud-synced folder such as Desktop. Run the build again, " +
      "or move the project out of iCloud (see DEPLOYMENT.md)."
    );
  }
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { pages, indexablePages, insertPartials, markLinks, faqSchema };
