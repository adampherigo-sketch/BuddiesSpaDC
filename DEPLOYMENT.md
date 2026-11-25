# Buddies Spa — Deployment

Same pattern as PMA: GitHub repo → Netlify preview deploys now → the client's
hosting at launch.

## 1. Repository

1. Move the project out of iCloud-synced folders (Desktop, Documents) first, for
   example to `~/Projects/buddies-spa-site`. iCloud renames folders that are
   deleted and recreated quickly ("js 2", "css 2"), which breaks local builds
   and can corrupt a `.git` folder. The build now stops with a clear error if
   it detects this.
2. `git init -b main`, add the GitHub remote, push.
3. CI (`.github/workflows/verify.yml`) runs `npm audit` and `npm run verify` on
   every push and pull request. Dependabot checks npm and Actions weekly.

## 2. Netlify

`netlify.toml` builds with `npm run build`, publishes `dist/`, and deploys only
the wrappers in `netlify/functions-modern/`:

| Route | Function | Protection |
|---|---|---|
| `POST /.netlify/functions/contact` | `contact.mjs` → `functions/contact.js` | 10 requests/min per IP, origin allow-list, honeypot, strict validation |
| `GET /.netlify/functions/reviews` | `reviews.mjs` → `functions/reviews.js` | 60 requests/min per IP, 6-hour CDN cache |

### Environment variables (Netlify UI → Site configuration → Environment)

Never commit values. `.env.example` lists the names.

| Variable | Required | Notes |
|---|---|---|
| `RESEND_API_KEY` | yes | Resend API key with send access |
| `CONTACT_FROM_EMAIL` | yes | e.g. `Buddies Spa Website <web@buddiesspa.com>`; the domain must be verified in Resend |
| `CONTACT_TO_EMAIL` | yes | default inbox for every form |
| `CAREERS_TO_EMAIL` | no | applications (falls back to `CONTACT_TO_EMAIL`) |
| `EVENTS_TO_EMAIL` | no | private event inquiries |
| `PARTNERS_TO_EMAIL` | no | partnership inquiries |
| `CONTACT_ALLOWED_ORIGINS` | at launch | `https://www.buddiesspa.com,https://buddiesspa.com` |
| `GOOGLE_PLACES_API_KEY` | for reviews | Google Cloud key restricted to **Places API (New)** |
| `GOOGLE_PLACE_ID` | for reviews | Buddies Spa's place ID |
| `REVIEWS_MIN_RATING` | no | e.g. `4` to hide 1–3 star reviews (client decision) |

Until the Google variables are set, the home page shows a Placeholder block
instead of reviews. Google returns at most 5 reviews; full history needs
Google Business Profile API access (owner-granted, Google-approved).

## 3. Connecting M-Events and M-Staff

The site reads seed files in `data/` until the modules are live:

1. In M-Events: add the image field, the `promo` category and the
   `buddies-spa` tenant (see `docs/BUILD-PLAN.md`). Import `data/events.json`
   and `data/promos.json` as the first records.
2. Build M-Staff from the M-Events pattern and import `data/staff.json`.
3. Set `feeds.eventsUrl` and `feeds.staffUrl` in `js/site-config.js`. The feeds
   may return an array or `{ "events": [...] }` / `{ "staff": [...] }`.
4. Allow the feed host in the Content-Security-Policy: add it to `connect-src`
   in `_headers` (and `img-src` if images are served from it), then update the
   CSP rule in `scripts/security-check.js` to allow exactly that host.

Promos (`category: "promo"`) appear in the home page Specials section on their
start date and drop off after their end date. They never appear on the Events
page.

## 4. Pre-launch checklist

- [ ] `npm run launch-check` passes (verify **and** zero placeholders)
- [ ] All questions in `CLIENT-QUESTIONS.md` answered; address and phone conflicts resolved
- [ ] Square booking and gift card links confirmed in `js/site-config.js`
- [ ] Every Book button tested on mobile and desktop, ending in the right Square flow
- [ ] Each form submitted on the deploy preview and received in the right inbox
- [ ] Google reviews showing; attribution and "See all reviews on Google" link visible
- [ ] `CONTENT-RIGHTS-CHECKLIST.md` complete (stock photos licensed or replaced)
- [ ] Privacy and Terms reviewed by the client
- [ ] Accessibility pass (keyboard, screen reader, contrast) and page speed check
- [ ] `CONTACT_ALLOWED_ORIGINS` set to the production domain(s)
- [ ] `SHOW_EVERY_TIME` set to `false` in `js/intro-gate.js`, so each visitor sees the welcome doors once (it's `true` while designing)

## 5. Launch (moving off Square Online)

1. Add the production domain in Netlify (or the client's host) and issue HTTPS.
2. Lower DNS TTL a day ahead, then point `www` and the apex to the new host.
3. Confirm the old URLs redirect (`/faqs`, `/career`, `/contact-us`,
   `/trusted-queer-business-dc`, `/s/appointments`, …).
4. Unpublish the Square Online site **only after** DNS has moved. Keep Square
   Appointments, payments and gift cards running; they don't depend on it.
5. Submit `sitemap.xml` in Google Search Console and update the website link
   on the Google Business Profile, Instagram and Facebook.
6. Watch Netlify function logs and form deliveries for the first week.
