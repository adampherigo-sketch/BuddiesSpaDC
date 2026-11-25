# Buddies Spa — The Queer Spa DC

Custom website for Buddies Spa LLC (317 H St NW, Washington, DC), replacing the
Square Online site at buddiesspa.com. Booking, payments and gift cards stay in
Square; this site sells the visit and hands off cleanly to Square.

Built on the same stack as the PMA Consulting site: static HTML, shared CSS,
vanilla JS, a Node build into `dist/`, Netlify functions, and the same tests,
security check and CI. The look follows the homepage design (Nov 24): ivory
and sand, espresso and brown, Cormorant Garamond with Jost, pill buttons,
arch-topped photos and the "B" medallion, with a first-visit door intro on Home.

## Quick start

```bash
npm install
npm run dev           # live preview while you edit (opens your browser)
npm run verify        # tests + build + security check (what CI runs)
npm run preview       # production build, served from dist/
npm run placeholders  # list every placeholder still waiting on the client
```

### Editing with the live preview

`npm run dev` (or in VS Code: **Terminal → Run Task → Preview site (live
reload)**) serves the source files at http://localhost:5503 and keeps every
open page in sync:

- Save a page, script, data file or image and the browser reloads.
- Save a stylesheet and the styles swap in place without a reload, so you can
  tweak the welcome doors while they're half open.
- **http://localhost:5503/?intro** replays the welcome doors on every load
  (without `?intro` they show once per browser; "Replay welcome" in the
  footer also brings them back).
- Forms go through the real validation but are never emailed (the terminal
  logs each submission), and Google reviews show labeled samples.
- The live site's security headers apply, so anything production would block
  (inline styles, outside scripts) is blocked here too.

The intro's timing (when the text fades, when the header appears, medallion
sizes) is in the **Tuning** block at the top of `js/intro.js`; its colors,
fonts and door decoration are in `css/home.css`. Colors and type for the whole
site are the tokens at the top of `css/style.css`.

## Pages

| Page | File | Replaces on the old site |
|---|---|---|
| Home | `index.html` | `/` |
| About | `about.html` | About block on the home page |
| Services | `services.html` | `/services` |
| Our Team | `staff.html` | `/staff` |
| FAQ | `faq.html` | `/faqs` |
| Events | `events.html` | `/events` |
| Partners | `partners.html` | `/trusted-queer-business-dc` |
| Careers | `careers.html` | `/career` |
| Contact | `contact.html` | `/contact-us` |
| Book Now | `book.html` | Square booking link |
| Privacy, Terms, 404 | `privacy.html`, `terms.html`, `404.html` | — |

Old URLs are redirected in `_redirects`.

## Project structure

```
*.html                  one file per page (header/footer slots are empty in source)
partials/               shared header + footer, written into every page by the build
css/style.css           design tokens + every shared component
css/<page>.css          page-specific layout only
css/images/             photos for the design's image spots (see css/images/README.md)
css/mobile-nav.css      narrow-screen header (Menu · medallion · Book now) and menu panel
css/fonts.css, fonts/   self-hosted Cormorant Garamond + Jost (SIL OFL)
js/site-config.js       business details, hours, booking links, feed URLs (edit here)
js/feeds.js             data loading (seed JSON now, M-Events/M-Staff later) + DOM helpers
js/nav.js               menu, active links, sticky header, hours, Book links
js/specials-spotlight.js  home page "Monthly Specials" tabs (css/specials-spotlight.css)
js/intro-gate.js, js/intro.js  home page "Welcome to Buddies Spa" doors (first visit)
js/forms.js             every form → contact function
js/<page>.js            page rendering (services, staff, faq, events, partners, …)
data/*.json             content: services, staff, promos, events, faq, partners, careers
images/                 originals (build converts to WebP); brand-source/ is never published
netlify/functions/      contact.js (forms → Resend), reviews.js (Google Places)
netlify/functions-modern/  deployed wrappers (routes, rate limits, caching)
scripts/                dev-server.js, build-site.js, security-check.js, list-placeholders.js
tests/                  node --test suites
```

## Updating content

| To change… | Edit |
|---|---|
| Phone, email, address, hours, Square links | `js/site-config.js`, plus `partials/footer.html` (a test checks they match) |
| Monthly specials | The Spotlight section in `index.html` (see the comment above it) and photos in `images/specials/YYYY-MM/` |
| Events | M-Events once live; until then `data/events.json` |
| Staff | M-Staff once live; until then `data/staff.json` |
| Service categories, menu rows | `data/services.json` |
| FAQ | `data/faq.json` (also feeds Google's FAQ structured data) |
| Partners | `data/partners.json` |
| Open roles | `data/careers.json` (keep `careers.html`'s Position dropdown in sync; a test checks) |

Anything not yet supplied by the client is marked `[Placeholder: …]` or with a
`ph` block and shows a gold **Placeholder** tag on the page. See
`CLIENT-QUESTIONS.md` for what's needed and `npm run placeholders` for where.

## Docs

- `docs/BUILD-PLAN.md`: the build plan, updated to match this repo
- `DEPLOYMENT.md`: hosting, environment variables, feeds and the launch checklist
- `CLIENT-QUESTIONS.md`: everything waiting on the client
- `CONTENT-RIGHTS-CHECKLIST.md`: image, logo and claim permissions
