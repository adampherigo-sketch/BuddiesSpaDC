import { createRequire } from "node:module";
import { withLambda } from "@netlify/aws-lambda-compat";

// Netlify reads this block from the source without running it, so the
// values stay literal. RATE LIMIT: windowLimit is the number of form
// submissions allowed per IP per windowSize seconds.
export const config = {
  path: "/.netlify/functions/contact",
  method: "POST",
  rateLimit: {
    action: "rate_limit",
    windowLimit: 3,
    windowSize: 60,
    aggregateBy: ["ip", "domain"]
  }
};

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

// Production refuses every request until CONTACT_ALLOWED_ORIGINS is set, so
// a missing variable can't quietly open the form to any site. Deploy
// previews and local dev keep working without it. CONTEXT is Netlify's
// deploy context; context.deploy.context is the same value on Functions 2.0.
const isProduction = (context) =>
  process.env.CONTEXT === "production" || context?.deploy?.context === "production";

export const originIsAllowed = (request, context) => {
  const allowedOrigins = configuredOrigins();

  if (!allowedOrigins.length) {
    return !isProduction(context);
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
  if (!originIsAllowed(request, context)) {
    return forbiddenResponse();
  }

  return legacyHandler(request, context);
};
