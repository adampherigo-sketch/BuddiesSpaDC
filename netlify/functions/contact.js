// Buddies Spa — form handler (Contact, About, Careers, Events, Partners).
//
// Every site form posts JSON here with a form_type. Each type has its own
// allowed fields and rules; anything unexpected is rejected. Messages are
// emailed through Resend and never stored on the site.
//
// Environment (Netlify UI, never in Git):
//   RESEND_API_KEY, CONTACT_FROM_EMAIL, CONTACT_TO_EMAIL      required
//   CAREERS_TO_EMAIL, EVENTS_TO_EMAIL, PARTNERS_TO_EMAIL      optional routing
//   CONTACT_ALLOWED_ORIGINS                                   optional, comma list

const careers = require("../../data/careers.json");

const MAX_BODY_BYTES = 32 * 1024;
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DELIVERY_TIMEOUT_MS = 8000;

const POSITIONS = new Set([...careers.roles.map((role) => role.title), "Other / not listed"]);

const CONTACT_TOPICS = new Set([
  "General question",
  "Booking help",
  "Gift cards",
  "Feedback",
  "Other"
]);

const EVENT_TYPES = new Set([
  "Birthday party",
  "Bachelor / bachelorette",
  "Pride event or celebration",
  "Private VIP gathering",
  "Corporate event",
  "Other"
]);

const EVENT_SERVICES = new Set([
  "Spa services",
  "Massage",
  "Bar service",
  "Catering",
  "DJ & sound",
  "Drag & live performers",
  "Decorations & theme",
  "Stage & lighting"
]);

const BUDGETS = new Set([
  "Under $300",
  "$300 – $800",
  "$800 – $2,000",
  "$2,000+",
  "Not sure yet"
]);

const BUSINESS_TYPES = new Set([
  "Wellness or health",
  "Beauty or fashion",
  "Nightlife or hospitality",
  "Nonprofit or community",
  "Professional services",
  "Retail",
  "Other"
]);

const PARTNERSHIP_TYPES = new Set([
  "Cross-promotion",
  "Event co-hosting",
  "Sponsorship",
  "Referral offer"
]);

// Fields shared by every form type.
const COMMON = {
  form_type: { max: 20, required: true },
  page: { max: 40, required: true, pattern: /^[a-z0-9-]+\.html$/ },
  name: { max: 100, required: true },
  email: { max: 254, required: true, email: true },
  phone: { max: 40, phone: true },
  message: { max: 5000, multiline: true },
  website: { max: 200 } // honeypot
};

// Per-type fields and rules.
const FORM_TYPES = {
  contact: {
    label: "Website message",
    route: "CONTACT_TO_EMAIL",
    fields: {
      topic: { max: 40, oneOf: CONTACT_TOPICS }
    },
    requireMessage: true
  },
  application: {
    label: "Job application",
    route: "CAREERS_TO_EMAIL",
    fields: {
      position: { max: 60, required: true, oneOf: POSITIONS },
      license: { max: 80 },
      portfolio: { max: 200, url: true },
      availability: { max: 300 }
    },
    requirePhone: true,
    requireMessage: true
  },
  "private-event": {
    label: "Private event inquiry",
    route: "EVENTS_TO_EMAIL",
    fields: {
      event_type: { max: 40, required: true, oneOf: EVENT_TYPES },
      event_date: { max: 10, date: true },
      guest_count: { max: 4, pattern: /^[1-9][0-9]{0,3}$/ },
      "services_wanted[]": { list: EVENT_SERVICES },
      budget: { max: 20, oneOf: BUDGETS }
    },
    requirePhone: true,
    requireMessage: false
  },
  partnership: {
    label: "Partnership inquiry",
    route: "PARTNERS_TO_EMAIL",
    fields: {
      business_name: { max: 120, required: true },
      business_url: { max: 200, url: true },
      business_type: { max: 40, oneOf: BUSINESS_TYPES },
      "partnership_types[]": { list: PARTNERSHIP_TYPES }
    },
    requireMessage: true
  }
};

const LABELS = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  topic: "Topic",
  position: "Position",
  license: "License",
  portfolio: "Portfolio / Instagram",
  availability: "Availability",
  event_type: "Event type",
  event_date: "Preferred date",
  guest_count: "Guest count",
  "services_wanted[]": "Services wanted",
  budget: "Budget",
  business_name: "Business",
  business_url: "Business website",
  business_type: "Business type",
  "partnership_types[]": "Partnership interest",
  message: "Message",
  page: "Submitted from"
};

const jsonResponse = (statusCode, payload) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  },
  body: JSON.stringify(payload)
});

const getHeader = (event, name) => {
  const target = name.toLowerCase();
  const entry = Object.entries(event.headers || {}).find(([key]) => key.toLowerCase() === target);
  return entry ? entry[1] : "";
};

const configuredOrigins = () => (process.env.CONTACT_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map((origin) => {
    try {
      const parsed = new URL(origin);
      return parsed.protocol === "https:" ? parsed.origin : "";
    } catch {
      return "";
    }
  })
  .filter(Boolean);

const originAllowed = (event) => {
  const origin = getHeader(event, "origin");
  const allowed = configuredOrigins();
  return !origin || !allowed.length || allowed.includes(origin);
};

const CONTROL = /[\x00-\x1F\x7F]/;
const CONTROL_MULTILINE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

const isValidUrl = (value) => {
  // Accept "instagram.com/name" or "@name" as well as full https links.
  if (/^@[A-Za-z0-9_.]{1,30}$/.test(value)) {
    return true;
  }
  try {
    const parsed = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return ["http:", "https:"].includes(parsed.protocol) && parsed.hostname.includes(".");
  } catch {
    return false;
  }
};

const checkString = (value, rule) => {
  if (typeof value !== "string") {
    return false;
  }
  const text = value.trim();
  if (!text) {
    return !rule.required;
  }
  if (text.length > rule.max) {
    return false;
  }
  if (rule.multiline ? CONTROL_MULTILINE.test(text) : CONTROL.test(text)) {
    return false;
  }
  if (rule.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
    return false;
  }
  if (rule.phone && (!/^[0-9+().\s-]+$/.test(text) || (text.match(/\d/g) || []).length < 7)) {
    return false;
  }
  if (rule.pattern && !rule.pattern.test(text)) {
    return false;
  }
  if (rule.oneOf && !rule.oneOf.has(text)) {
    return false;
  }
  if (rule.date && !isValidDate(text)) {
    return false;
  }
  if (rule.url && !isValidUrl(text)) {
    return false;
  }
  return true;
};

const checkList = (value, rule) =>
  Array.isArray(value) &&
  value.length <= rule.list.size &&
  new Set(value).size === value.length &&
  value.every((item) => typeof item === "string" && rule.list.has(item));

// Returns the cleaned submission, or null if anything is off.
const validateRequest = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }
  const type = FORM_TYPES[body.form_type];
  if (!type) {
    return null;
  }
  const rules = { ...COMMON, ...type.fields };

  for (const key of Object.keys(body)) {
    if (!(key in rules)) {
      return null;
    }
  }

  const clean = {};
  for (const [key, rule] of Object.entries(rules)) {
    const value = body[key];
    if (rule.list) {
      if (value === undefined) {
        clean[key] = [];
        continue;
      }
      if (!checkList(value, rule)) {
        return null;
      }
      clean[key] = value;
      continue;
    }
    if (value === undefined) {
      if (rule.required) {
        return null;
      }
      clean[key] = "";
      continue;
    }
    if (!checkString(value, rule)) {
      return null;
    }
    clean[key] = value.trim();
  }

  if (type.requirePhone && !clean.phone) {
    return null;
  }
  if (type.requireMessage && !clean.message) {
    return null;
  }
  return clean;
};

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[character]));

const buildEmail = (submission) => {
  const type = FORM_TYPES[submission.form_type];
  const order = ["name", "email", "phone", ...Object.keys(type.fields), "message", "page"];
  const rows = order
    .map((key) => [LABELS[key] || key, Array.isArray(submission[key]) ? submission[key].join(", ") : submission[key]])
    .filter(([, value]) => value);

  const heading = `${type.label} · Buddies Spa website`;
  const text = [heading.toUpperCase(), ...rows.map(([label, value]) => `${label}\n${value}`)].join("\n\n");
  const html = `<div><h1>${escapeHtml(heading)}</h1>${rows
    .map(([label, value]) => `<p><strong>${escapeHtml(label)}</strong><br>${escapeHtml(value).replace(/\r?\n/g, "<br>")}</p>`)
    .join("")}</div>`;

  const subjectDetail = submission.position || submission.event_type || submission.business_name || submission.topic || "";
  const subject = `New ${type.label.toLowerCase()}${subjectDetail ? ` — ${subjectDetail}` : ""}`;

  return { subject, text, html };
};

const recipientFor = (submission) => {
  const type = FORM_TYPES[submission.form_type];
  return process.env[type.route] || process.env.CONTACT_TO_EMAIL;
};

const deliver = async (submission) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  const to = recipientFor(submission);

  if (!apiKey || !to || !from) {
    return jsonResponse(503, { ok: false, error: "service_unavailable" });
  }

  const email = buildEmail(submission);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "Buddies-Spa-Website/1.0"
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: submission.email,
        subject: email.subject,
        text: email.text,
        html: email.html,
        tags: [{ name: "form_type", value: submission.form_type.replace(/[^a-z_-]/g, "") }]
      }),
      signal: controller.signal
    });
    return response.ok
      ? jsonResponse(200, { ok: true })
      : jsonResponse(503, { ok: false, error: "service_unavailable" });
  } catch {
    return jsonResponse(503, { ok: false, error: "service_unavailable" });
  } finally {
    clearTimeout(timeout);
  }
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { ok: false, error: "method_not_allowed" });
  }
  if (!/^application\/json(?:\s*;|$)/i.test(getHeader(event, "content-type"))) {
    return jsonResponse(415, { ok: false, error: "unsupported_media_type" });
  }
  if (!originAllowed(event)) {
    return jsonResponse(403, { ok: false, error: "forbidden" });
  }

  const bodyText = typeof event.body === "string" ? event.body : "";
  const declaredLength = Number(getHeader(event, "content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES || Buffer.byteLength(bodyText, "utf8") > MAX_BODY_BYTES) {
    return jsonResponse(413, { ok: false, error: "request_too_large" });
  }

  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return jsonResponse(400, { ok: false, error: "invalid_json" });
  }

  // Honeypot: real visitors never see the "website" field. Report success so
  // bots get no signal, and send nothing.
  if (body && typeof body === "object" && typeof body.website === "string" && body.website.trim()) {
    return jsonResponse(200, { ok: true });
  }

  const submission = validateRequest(body);
  if (!submission) {
    return jsonResponse(400, { ok: false, error: "validation_error" });
  }

  try {
    return await deliver(submission);
  } catch {
    return jsonResponse(500, { ok: false, error: "server_error" });
  }
};

// Exposed for tests and for the form scripts' option lists.
exports.FORM_TYPES = FORM_TYPES;
exports.validateRequest = validateRequest;
exports.buildEmail = buildEmail;
