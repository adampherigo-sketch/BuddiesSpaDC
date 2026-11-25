import { createRequire } from "node:module";
import { withLambda } from "@netlify/aws-lambda-compat";

const require = createRequire(import.meta.url);
const { handler } = require("../functions/contact.js");
const legacyHandler = withLambda(handler);

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

const originIsAllowed = (request) => {
  const allowedOrigins = configuredOrigins();

  if (!allowedOrigins.length) {
    return true;
  }

  const origin = request.headers.get("origin") || "";
  return Boolean(origin) && allowedOrigins.includes(origin);
};

const forbiddenResponse = () => new Response(
  JSON.stringify({ ok: false, error: "forbidden" }),
  {
    status: 403,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  }
);

export const lambdaHandler = handler;

export default async (request, context) => {
  if (!originIsAllowed(request)) {
    return forbiddenResponse();
  }

  return legacyHandler(request, context);
};

export const config = {
  path: "/.netlify/functions/contact",
  method: "POST",
  rateLimit: {
    action: "rate_limit",
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ["ip", "domain"]
  }
};
