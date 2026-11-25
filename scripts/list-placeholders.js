// Buddies Spa — lists every placeholder still waiting on client content.
//
//   npm run placeholders            report only
//   npm run placeholders -- --strict exit with an error if any remain
//                                    (part of the launch checklist)
//
// A placeholder is any "[Placeholder…]" text, any class="ph" block, or any
// data record with "placeholder": true (status "published" only).

const fs = require("node:fs");
const path = require("node:path");
const { pages } = require("./build-site.js");

const root = path.resolve(__dirname, "..");
const strict = process.argv.includes("--strict");
const found = [];

const add = (file, line, text) => found.push({ file, line, text: text.trim().replace(/\s+/g, " ").slice(0, 140) });

const scanText = (relative) => {
  const lines = fs.readFileSync(path.join(root, relative), "utf8").split("\n");
  lines.forEach((line, index) => {
    for (const match of line.matchAll(/\[Placeholder[^\]]*\]/g)) {
      add(relative, index + 1, match[0]);
    }
    if (/class="(?:[^"]*\s)?ph(?:\s[^"]*)?"/.test(line) && !/\[Placeholder/.test(line)) {
      add(relative, index + 1, "Placeholder block (class=\"ph\")");
    }
  });
};

for (const file of [...pages, "partials/header.html", "partials/footer.html"]) {
  scanText(file);
}

const scanJson = (relative, visit) => {
  const data = JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
  visit(data, (label, text) => add(relative, "-", label ? `${label} › ${text}` : text));
};

const walkJson = (value, report, trail = []) => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkJson(item, report, trail.concat(item?.id || item?.name || item?.q || index)));
  } else if (value && typeof value === "object") {
    if (value.status === "draft") {
      return;
    }
    if (value.placeholder === true) {
      // The record's own name is the last trail entry; report it once.
      report(trail.slice(0, -1).join(" › "), value.q || value.name || value.title || "placeholder record");
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (key !== "_notes") {
        walkJson(child, report, trail);
      }
    }
  } else if (typeof value === "string" && /\[Placeholder/i.test(value)) {
    report(trail.join(" › "), value);
  }
};

for (const file of fs.readdirSync(path.join(root, "data")).filter((name) => name.endsWith(".json"))) {
  scanJson(`data/${file}`, (data, report) => walkJson(data, report));
}

// Services with no prices yet.
const services = JSON.parse(fs.readFileSync(path.join(root, "data/services.json"), "utf8"));
const unpriced = services.categories.flatMap((category) => category.menu.filter((item) => item.placeholder).map((item) => `${category.name}: ${item.name}`));

const byFile = found.reduce((groups, item) => {
  (groups[item.file] ||= []).push(item);
  return groups;
}, {});

for (const [file, items] of Object.entries(byFile)) {
  console.log(`\n${file} (${items.length})`);
  for (const item of items) {
    console.log(`  ${item.line === "-" ? "" : `L${item.line}  `}${item.text}`);
  }
}

console.log(`\n${found.length} placeholders in total (${unpriced.length} of them are unpriced menu rows).`);

if (strict && found.length) {
  console.error("\nLaunch check failed: replace every placeholder before going live.");
  process.exitCode = 1;
}
