const test = require("node:test");
const assert = require("node:assert/strict");
const { handler, buildEmail } = require("../netlify/functions/contact.js");

const base = {
  contact: {
    form_type: "contact",
    page: "contact.html",
    name: "Alex Morgan",
    email: "alex@example.com",
    message: "Do you have time for a Brazilian on Saturday?"
  },
  application: {
    form_type: "application",
    page: "careers.html",
    name: "Sam Lee",
    email: "sam@example.com",
    phone: "(202) 555-0134",
    position: "Massage Therapist",
    portfolio: "@samlee.massage",
    message: "Five years of deep tissue experience."
  },
  "private-event": {
    form_type: "private-event",
    page: "events.html",
    name: "Jordan Kim",
    email: "jordan@example.com",
    phone: "202-555-0199",
    event_type: "Birthday party",
    event_date: "2027-02-14",
    guest_count: "12",
    "services_wanted[]": ["Spa services", "DJ & sound"],
    budget: "$300 – $800"
  },
  partnership: {
    form_type: "partnership",
    page: "partners.html",
    name: "Riley Fox",
    email: "riley@example.com",
    business_name: "Fox Yoga",
    business_url: "foxyoga.com",
    business_type: "Wellness or health",
    "partnership_types[]": ["Cross-promotion", "Referral offer"],
    message: "We'd love to cross-promote."
  }
};

const request = (body, { method = "POST", headers = { "content-type": "application/json" } } = {}) => handler({
  httpMethod: method,
  headers,
  body: typeof body === "string" ? body : JSON.stringify(body)
});

const statusFor = async (body) => (await request(body)).statusCode;
const make = (type, overrides = {}) => {
  const body = { ...base[type], ...overrides };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete body[key];
    }
  }
  return body;
};

const DELIVERY_KEYS = ["RESEND_API_KEY", "CONTACT_TO_EMAIL", "CONTACT_FROM_EMAIL", "CAREERS_TO_EMAIL", "EVENTS_TO_EMAIL", "PARTNERS_TO_EMAIL"];

const withDelivery = async (env, fetchMock, callback) => {
  const previous = Object.fromEntries(DELIVERY_KEYS.map((key) => [key, process.env[key]]));
  const previousFetch = global.fetch;
  for (const key of DELIVERY_KEYS) {
    delete process.env[key];
  }
  Object.assign(process.env, {
    RESEND_API_KEY: "test-key",
    CONTACT_TO_EMAIL: "front-desk@example.com",
    CONTACT_FROM_EMAIL: "Buddies Website <web@example.com>",
    ...env
  });
  global.fetch = fetchMock;
  try {
    return await callback();
  } finally {
    for (const key of DELIVERY_KEYS) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
    global.fetch = previousFetch;
  }
};

const captureFetch = () => {
  const calls = [];
  const fetchMock = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body), headers: options.headers });
    return { ok: true };
  };
  return { calls, fetchMock };
};

test("rejects non-POST, non-JSON, oversized and malformed requests", async () => {
  assert.equal((await request(base.contact, { method: "GET" })).statusCode, 405);
  assert.equal((await request(base.contact, { headers: { "content-type": "text/plain" } })).statusCode, 415);
  assert.equal(await statusFor("{not json"), 400);
  assert.equal(await statusFor({ ...base.contact, message: "x".repeat(40 * 1024) }), 413);
  assert.equal(await statusFor([]), 400);
});

test("every form type validates with its normal payload", async () => {
  const { calls, fetchMock } = captureFetch();
  await withDelivery({}, fetchMock, async () => {
    for (const type of Object.keys(base)) {
      const response = await request(base[type]);
      assert.equal(response.statusCode, 200, `${type} should be accepted`);
    }
  });
  assert.equal(calls.length, 4);
});

test("unknown form types and unexpected fields are rejected", async () => {
  assert.equal(await statusFor(make("contact", { form_type: "newsletter" })), 400);
  assert.equal(await statusFor(make("contact", { position: "Massage Therapist" })), 400);
  assert.equal(await statusFor(make("contact", { admin: "true" })), 400);
});

test("inherited object keys are never treated as form types or fields", async () => {
  for (const formType of ["constructor", "__proto__", "toString", "hasOwnProperty"]) {
    const response = await request({ ...base.contact, form_type: formType });
    assert.equal(response.statusCode, 400, `form_type "${formType}"`);
    assert.equal(JSON.parse(response.body).error, "validation_error");
  }
  for (const field of ["constructor", "toString", "valueOf"]) {
    assert.equal(await statusFor({ ...base.contact, [field]: "x" }), 400, `field "${field}"`);
  }
  // A raw "__proto__" key (JSON.parse keeps it as an own property).
  assert.equal(await statusFor(JSON.stringify(base.contact).replace(/^\{/, '{"__proto__":{"x":1},')), 400);
  assert.equal(await statusFor({ ...base.contact, form_type: 42 }), 400);
});

test("required fields are enforced per form type", async () => {
  assert.equal(await statusFor(make("contact", { message: undefined })), 400);
  assert.equal(await statusFor(make("contact", { email: "not-an-email" })), 400);
  assert.equal(await statusFor(make("application", { phone: undefined })), 400);
  assert.equal(await statusFor(make("application", { position: undefined })), 400);
  assert.equal(await statusFor(make("private-event", { event_type: undefined })), 400);
  assert.equal(await statusFor(make("partnership", { business_name: undefined })), 400);
});

test("private-event messages are optional; other types require one", async () => {
  const { fetchMock } = captureFetch();
  await withDelivery({}, fetchMock, async () => {
    assert.equal(await statusFor(make("private-event", { message: undefined })), 200);
  });
  assert.equal(await statusFor(make("partnership", { message: undefined })), 400);
});

test("select and checkbox values must come from the allowed lists", async () => {
  assert.equal(await statusFor(make("application", { position: "CEO" })), 400);
  assert.equal(await statusFor(make("contact", { topic: "Spam" })), 400);
  assert.equal(await statusFor(make("private-event", { budget: "$1,000,000" })), 400);
  assert.equal(await statusFor(make("private-event", { "services_wanted[]": ["Fireworks"] })), 400);
  assert.equal(await statusFor(make("private-event", { "services_wanted[]": ["Massage", "Massage"] })), 400);
  assert.equal(await statusFor(make("partnership", { "partnership_types[]": "Sponsorship" })), 400);
});

test("dates, guest counts, phones, links and page tags are validated", async () => {
  assert.equal(await statusFor(make("private-event", { event_date: "2027-02-30" })), 400);
  assert.equal(await statusFor(make("private-event", { guest_count: "0" })), 400);
  assert.equal(await statusFor(make("private-event", { guest_count: "lots" })), 400);
  assert.equal(await statusFor(make("application", { phone: "call me" })), 400);
  assert.equal(await statusFor(make("application", { portfolio: "javascript:alert(1)" })), 400);
  assert.equal(await statusFor(make("contact", { page: "../../etc/passwd" })), 400);
  assert.equal(await statusFor(make("contact", { name: "Alex\u0000" })), 400);
});

test("honeypot submissions get a quiet success and send nothing", async () => {
  const { calls, fetchMock } = captureFetch();
  await withDelivery({}, fetchMock, async () => {
    const response = await request(make("contact", { website: "https://spam.example" }));
    assert.equal(response.statusCode, 200);
  });
  assert.equal(calls.length, 0);
});

test("returns 503 when email delivery is not configured", async () => {
  const previous = { ...process.env };
  for (const key of DELIVERY_KEYS) {
    delete process.env[key];
  }
  try {
    assert.equal(await statusFor(base.contact), 503);
  } finally {
    Object.assign(process.env, previous);
  }
});

test("routes each form type to its own inbox, falling back to CONTACT_TO_EMAIL", async () => {
  const { calls, fetchMock } = captureFetch();
  await withDelivery({ CAREERS_TO_EMAIL: "hiring@example.com", EVENTS_TO_EMAIL: "events@example.com" }, fetchMock, async () => {
    await request(base.application);
    await request(base["private-event"]);
    await request(base.partnership);
  });
  assert.deepEqual(calls.map((call) => call.body.to[0]), ["hiring@example.com", "events@example.com", "front-desk@example.com"]);
  assert.ok(calls.every((call) => call.body.reply_to));
});

test("emails escape HTML and are tagged with the source page", async () => {
  const email = buildEmail({
    ...base.contact,
    phone: "",
    topic: "",
    website: "",
    message: "<script>alert('x')</script>\nSecond line"
  });
  assert.match(email.html, /&lt;script&gt;/);
  assert.doesNotMatch(email.html, /<script>/);
  assert.match(email.html, /Submitted from/);
  assert.match(email.text, /contact\.html/);
  assert.match(email.html, /<br>Second line/);
});

test("rejects requests from origins that are not allowed", async () => {
  const previous = process.env.CONTACT_ALLOWED_ORIGINS;
  process.env.CONTACT_ALLOWED_ORIGINS = "https://www.buddiesspa.com";
  try {
    const response = await request(base.contact, { headers: { "content-type": "application/json", origin: "https://evil.example" } });
    assert.equal(response.statusCode, 403);
  } finally {
    if (previous === undefined) {
      delete process.env.CONTACT_ALLOWED_ORIGINS;
    } else {
      process.env.CONTACT_ALLOWED_ORIGINS = previous;
    }
  }
});

test("production rejects forms when no allowed origins are configured", async () => {
  const saved = { CONTEXT: process.env.CONTEXT, CONTACT_ALLOWED_ORIGINS: process.env.CONTACT_ALLOWED_ORIGINS };
  delete process.env.CONTACT_ALLOWED_ORIGINS;
  try {
    process.env.CONTEXT = "production";
    assert.equal(await statusFor(base.contact), 403);
    process.env.CONTEXT = "deploy-preview";
    assert.notEqual(await statusFor(base.contact), 403);
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});

test("delivery failures report service_unavailable", async () => {
  await withDelivery({}, async () => ({ ok: false }), async () => {
    const response = await request(base.contact);
    assert.equal(response.statusCode, 503);
    assert.equal(JSON.parse(response.body).error, "service_unavailable");
  });
});
