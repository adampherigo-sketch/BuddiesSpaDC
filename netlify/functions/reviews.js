// Buddies Spa — Google reviews for the home page.
//
// Calls the Google Places API (New) server-side so the API key stays hidden,
// and returns the overall rating, review count and latest reviews (Google
// returns at most 5). Results are cached in memory and at Netlify's CDN for
// six hours, so page views don't each trigger a paid API call.
//
// Environment (Netlify UI, never in Git):
//   GOOGLE_PLACES_API_KEY   required — restrict it to the Places API (New)
//   GOOGLE_PLACE_ID         required — the Buddies Spa place ID
//   REVIEWS_MIN_RATING      optional — e.g. 4 to show only 4- and 5-star
//                           reviews (client decision; default shows all)

const PLACES_ENDPOINT = "https://places.googleapis.com/v1/places/";
const FIELD_MASK = "rating,userRatingCount,reviews,googleMapsUri";
const CACHE_MS = 6 * 60 * 60 * 1000;
const TIMEOUT_MS = 8000;
const MAX_TEXT = 600;

let cached = null; // { at, payload }

const clip = (text) => {
  const value = String(text || "").trim();
  return value.length > MAX_TEXT ? `${value.slice(0, MAX_TEXT - 1).trimEnd()}…` : value;
};

const httpsOnly = (value) => {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
};

// Google's response -> the small, safe shape the page renders.
const toPayload = (place, minRating = 0) => ({
  ok: true,
  rating: Number(place.rating) || 0,
  userRatingCount: Number(place.userRatingCount) || 0,
  googleMapsUri: httpsOnly(place.googleMapsUri),
  reviews: (Array.isArray(place.reviews) ? place.reviews : [])
    .filter((review) => (Number(review.rating) || 0) >= minRating)
    .filter((review) => review.text?.text || review.originalText?.text)
    .sort((a, b) => String(b.publishTime || "").localeCompare(String(a.publishTime || "")))
    .map((review) => ({
      author: String(review.authorAttribution?.displayName || "Google user").slice(0, 80),
      authorUri: httpsOnly(review.authorAttribution?.uri),
      rating: Number(review.rating) || 0,
      text: clip(review.text?.text || review.originalText?.text),
      relativeTime: String(review.relativePublishTimeDescription || "").slice(0, 40),
      publishTime: String(review.publishTime || "")
    })),
  fetchedAt: new Date().toISOString()
});

const getReviews = async ({ env = process.env, fetchImpl = globalThis.fetch, now = Date.now() } = {}) => {
  const apiKey = env.GOOGLE_PLACES_API_KEY;
  const placeId = env.GOOGLE_PLACE_ID;

  if (!apiKey || !placeId || !/^[A-Za-z0-9_-]{10,300}$/.test(placeId)) {
    return { status: 503, payload: { ok: false, error: "not_configured" } };
  }

  if (cached && now - cached.at < CACHE_MS) {
    return { status: 200, payload: cached.payload };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetchImpl(`${PLACES_ENDPOINT}${encodeURIComponent(placeId)}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK
      },
      signal: controller.signal
    });

    if (!response.ok) {
      // Serve stale data rather than nothing if Google has a bad moment.
      return cached
        ? { status: 200, payload: cached.payload }
        : { status: 502, payload: { ok: false, error: "upstream_error" } };
    }

    const minRating = Math.min(5, Math.max(0, Number(env.REVIEWS_MIN_RATING) || 0));
    const payload = toPayload(await response.json(), minRating);
    cached = { at: now, payload };
    return { status: 200, payload };
  } catch {
    return cached
      ? { status: 200, payload: cached.payload }
      : { status: 502, payload: { ok: false, error: "upstream_error" } };
  } finally {
    clearTimeout(timeout);
  }
};

const resetCache = () => {
  cached = null;
};

module.exports = { getReviews, toPayload, resetCache, CACHE_MS };
