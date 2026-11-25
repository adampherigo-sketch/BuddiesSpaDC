import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { getReviews } = require("../functions/reviews.js");

export default async () => {
  const { status, payload } = await getReviews();
  const cacheable = status === 200;

  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      // Browsers re-check every 5 minutes; Netlify's CDN serves one shared
      // copy for 6 hours (and stale for a day while it refreshes).
      "Cache-Control": cacheable ? "public, max-age=300" : "no-store",
      "Netlify-CDN-Cache-Control": cacheable
        ? "public, durable, max-age=21600, stale-while-revalidate=86400"
        : "no-store"
    }
  });
};

export const config = {
  path: "/.netlify/functions/reviews",
  method: "GET",
  rateLimit: {
    action: "rate_limit",
    windowLimit: 60,
    windowSize: 60,
    aggregateBy: ["ip", "domain"]
  }
};
