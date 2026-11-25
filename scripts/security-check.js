// Buddies Spa — post-build security verification (runs in CI via npm run verify).
// Adapted from the PMA Consulting check.

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

const fail = (message) => {
  throw new Error(`Security verification failed: ${message}`);
};

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));

if (!exists("dist/index.html")) {
  fail("production build is missing; run npm run build first");
}

for (const required of [
  "dist/privacy.html",
  "dist/terms.html",
  "dist/404.html",
  "dist/_headers",
  "dist/_redirects",
  "netlify/functions-modern/contact.mjs",
  "netlify/functions-modern/reviews.mjs"
]) {
  if (!exists(required)) {
    fail(`missing required file: ${required}`);
  }
}

for (const forbidden of [
  "dist/netlify",
  "dist/tests",
  "dist/scripts",
  "dist/.env",
  "dist/.env.example",
  "dist/docs",
  "dist/README.md",
  "dist/assets",
  "dist/node_modules",
  "dist/package.json",
  "dist/partials",
  "dist/brand-source"
]) {
  if (exists(forbidden)) {
    fail(`private source was copied into the public build: ${forbidden}`);
  }
}

const headers = read("dist/_headers");
for (const expected of [
  "Content-Security-Policy:",
  "Strict-Transport-Security: max-age=31536000",
  "X-Content-Type-Options: nosniff",
  "X-Frame-Options: DENY",
  "Permissions-Policy:",
  "Cross-Origin-Opener-Policy: same-origin"
]) {
  if (!headers.includes(expected)) {
    fail(`missing security header: ${expected}`);
  }
}

// The site loads nothing from other domains: every CSP source must be 'self'
// (or data: for images). Adding a host (e.g. the M-Events feed) must be a
// deliberate change to this check, documented in docs/DEPLOYMENT.md.
const csp = (headers.match(/Content-Security-Policy:(.*)/) || [])[1] || "";
if (/https?:|\*|'unsafe-(inline|eval)'/.test(csp)) {
  fail("Content-Security-Policy allows a third-party host, wildcard, or unsafe source");
}

if (!exists("dist/.well-known/security.txt")) {
  fail("missing dist/.well-known/security.txt");
}

const contactWrapper = read("netlify/functions-modern/contact.mjs");
for (const expected of ['path: "/.netlify/functions/contact"', 'method: "POST"', "rateLimit:", 'aggregateBy: ["ip", "domain"]']) {
  if (!contactWrapper.includes(expected)) {
    fail(`contact protection is missing: ${expected}`);
  }
}

const reviewsWrapper = read("netlify/functions-modern/reviews.mjs");
for (const expected of ['path: "/.netlify/functions/reviews"', 'method: "GET"', "rateLimit:", "Netlify-CDN-Cache-Control"]) {
  if (!reviewsWrapper.includes(expected)) {
    fail(`reviews protection or caching is missing: ${expected}`);
  }
}

if (!read("netlify.toml").includes('directory = "netlify/functions-modern"')) {
  fail("Netlify is not configured to deploy only the modern function wrappers");
}

const publicFiles = [];
const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(absolute);
    } else {
      publicFiles.push(absolute);
    }
  }
};
walk(dist);

const MAX_IMAGE_BYTES = 2.5 * 1024 * 1024;
for (const file of publicFiles) {
  if (/\.(png|jpe?g|webp|gif)$/i.test(file) && fs.statSync(file).size > MAX_IMAGE_BYTES) {
    fail(`image is larger than 2.5 MB: ${path.relative(root, file)}`);
  }
}

for (const brandAsset of ["favicon-32.png", "apple-touch-icon.png", "og-image.jpg"]) {
  if (!exists(`dist/images/brand/${brandAsset}`)) {
    fail(`generated brand asset is missing: ${brandAsset}`);
  }
}

for (const page of publicFiles.filter((file) => file.endsWith(".html"))) {
  const html = fs.readFileSync(page, "utf8");
  const name = path.relative(root, page);
  for (const expected of ['rel="icon"', 'property="og:image"']) {
    if (!html.includes(expected)) {
      fail(`${name} is missing ${expected}`);
    }
  }
  // The build must write the shared header and footer into every page, so
  // navigation works without JavaScript.
  if (/data-site-header><\/header>|data-site-footer><\/footer>/.test(html)) {
    fail(`${name} has an empty shared header or footer`);
  }
  // CSP blocks inline styles and inline scripts; structured data is allowed.
  if (/\sstyle="/.test(html)) {
    fail(`${name} has an inline style attribute (blocked by the CSP)`);
  }
  if (/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>/.test(html)) {
    fail(`${name} has an inline script (blocked by the CSP)`);
  }
  if (/\son[a-z]+="/.test(html)) {
    fail(`${name} has an inline event handler (blocked by the CSP)`);
  }
}

const forbiddenPublicPatterns = [
  /RESEND_API_KEY\s*=/,
  /Bearer\s+re_[A-Za-z0-9_-]+/,
  /\bre_[A-Za-z0-9]{20,}/,
  /AIza[0-9A-Za-z_-]{30,}/,
  /GOOGLE_PLACES_API_KEY\s*=/,
  /CONTACT_FROM_EMAIL\s*=/,
  /CONTACT_ALLOWED_ORIGINS\s*=/
];

for (const file of publicFiles) {
  const extension = path.extname(file).toLowerCase();
  if (![".html", ".js", ".css", ".txt", ".json", ""].includes(extension)) {
    continue;
  }
  const content = fs.readFileSync(file, "utf8");
  for (const pattern of forbiddenPublicPatterns) {
    if (pattern.test(content)) {
      fail(`possible secret/configuration leak in ${path.relative(root, file)}`);
    }
  }
}

console.log("Security verification passed.");
