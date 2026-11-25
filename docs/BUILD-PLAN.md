# Buddies Spa Website Rebuild: Build Plan

Nov 21, 2026 · @Mischief · **updated Nov 24, 2026 to match the repo**

## Overview

We are replacing Buddies Spa's Square Online site with a custom-coded 10-page
site that keeps their gold and bronze look and makes it feel polished and
high-end. Booking, payments and gift cards stay in Square. The new site's job
is to sell the visit and hand off cleanly to Square.

- **Client:** Buddies Spa LLC, branded as The Queer Spa DC. 317 H St NW, Mount
  Vernon Triangle, Washington, DC 20001. (202) 926-7178. Hours: Mon–Sat 10 AM–8 PM,
  Sun 10 AM–6 PM; walk-ins welcome. Founded in 2022 by Kris Otto.
- **Current site:** buddiesspa.com on Square Online.
- **Approach:** written from scratch, kept in a GitHub repo with a preview
  deploy (same setup as PMA), moved to the client's hosting at launch.
- **Scope:** Home, About, FAQ, Services, Events, Partners, Careers, Book Now,
  plus Staff and Contact. Privacy, Terms and a 404 page come along from PMA.

## Status (Nov 24)

All 10 pages plus Privacy, Terms and 404 are built on the full framework, with
the client's real content from buddiesspa.com moved in (copy, team bios,
photos, partners, November promo, Pride 2026, event packages, waxing and facial
FAQs). Everything not yet supplied shows a gold **Placeholder** tag.
`npm run verify` passes (42 tests, build, security check).

Waiting on: client answers (`CLIENT-QUESTIONS.md`), the M-Events changes and
M-Staff module, Google Places credentials, Resend setup, and the Square
decisions below.

## Tech stack (as built)

| Layer | Choice | From PMA |
|---|---|---|
| Pages | Static HTML, one file per page; shared header/footer in `partials/`, written in by the build | Yes |
| Styling | `style.css` (tokens + components) + one CSS file per page + `mobile-nav.css` | Yes |
| Fonts | Self-hosted Cormorant Garamond (headings) and Jost (body) | Same self-hosting approach |
| Scripts | Vanilla JS: `site-config`, `feeds`, `nav`, `forms`, plus `intro`/`promos` on Home and one script per page | Yes |
| Build | `scripts/build-site.js` → `dist/`: partials, WebP images, favicons, share image, FAQ schema, sitemap, security.txt | Yes, new page list |
| Content | `data/*.json`: services, faq, partners, careers; seeds for promos, events and staff | New |
| Promos and events | M-Events (tenant `buddies-spa`, new `promo` category) | Reused |
| Staff | M-Staff (new, M-Events pattern) | New |
| Forms | One contact function, four form types → Resend | Reused, extended |
| Reviews | Serverless function → Google Places API (New), cached 6 h | New |
| Quality | `node --test`, `security-check.js`, CI verify, Dependabot, `_headers` | Yes |
| Hosting | Netlify preview now; client hosting at launch | Same |

### Data sources

| Content | Source now | Source at launch |
|---|---|---|
| Business details, hours, Square links | `js/site-config.js` | same |
| Service categories and menu | `data/services.json` | same, or Square catalog sync (option C) |
| Staff | `data/staff.json` | M-Staff feed |
| Monthly specials | Spotlight section in `index.html`, edited monthly | Could be fed by M-Events (`category: promo`) later |
| Events | `data/events.json` | M-Events |
| FAQ | `data/faq.json` | same (also chatbot later) |
| Partners | `data/partners.json` | same, or a listings module |
| Open roles | `data/careers.json` | same |
| Reviews | Google Places API via `/.netlify/functions/reviews` | same |

## Design system (from the homepage design, Nov 24)

The site follows the homepage design: warm and quiet, with brown for actions
and gold kept for fine lines. All values live as tokens in `css/style.css`.

| Token | Value | Use |
|---|---|---|
| Ivory | `#f8f4ec` | Page background, header |
| Paper | `#fffdf8` | Cards |
| Sand | `#ede3d1` | Alternating sections, intro doors |
| Brown (accent) | `#6e4a2c` | Buttons, links, eyebrows (7.1:1 on ivory) |
| Brown, dark | `#4a3220` | Hover |
| Gold | `#c9a45c` | Fine lines on light; eyebrows and numbers on dark (6.7:1 on espresso) |
| Espresso | `#2a211a` | Headings, dark sections, inner-page heroes, footer |
| Body text | `#5a4a3c` / `#6b5a49` | Paragraphs / meta (7.7:1 and 6.0:1 on ivory) |
| Lines | `#d9c9a8` | Hairlines and card borders |

- **Type:** Cormorant Garamond (500, italic accents) for headings and Jost for
  body text, both self-hosted. Eyebrows are 13px uppercase with 0.4em tracking.
- **Shapes:** pill buttons, square cards with hairline borders, arch-topped
  photos (hero frame, service cards, team photos), no heavy shadows.
- **Brand mark:** the sign: a black disc with the rainbow neon "Buddies Spa"
  running wider than the circle. Large on the welcome doors it also shows
  "Welcome to" and "The Queer Spa DC"; in the header center and footer it's
  just the disc and neon. The favicon is a simple "B" medallion.
- **Header:** fixed, links split around the medallion (About, Services, Events ·
  Partners, Careers, FAQ, Book now). Below 980px: Menu · medallion · Book now,
  with a full-height menu panel.
- **Home intro:** on a first visit, wood slat doors show the full sign.
  Scrolling opens them and the sign glides and shrinks into the header, with
  "Welcome to" and "The Queer Spa DC" fading out on the way.
- **Inner pages:** espresso hero, ivory and sand sections, the brown "Ready when
  you are" band for calls to action.

## Pages

| # | Page | File | Status | Waiting on |
|---|---|---|---|---|
| 1 | Home | `index.html` | Built | Reviews credentials; December promo |
| 2 | About | `about.html` | Built | Final story wording, space photos, directions |
| 3 | Services | `services.html` | Built (categories, staff chips, Book, FAQ links) | Menu and prices decision (A/B/C) |
| 4 | Staff | `staff.html` | Built (filters, Book with…) | Confirm services per person; M Le; M-Staff |
| 5 | FAQ | `faq.html` | Built (search, before/during/after, schema) | Policies and prep/aftercare content |
| 6 | Events | `events.html` | Built (upcoming/past, packages, inquiry form) | Next event, Partiful links, package details |
| 7 | Partners | `partners.html` | Built (spotlight, filters, form) | Two missing links, partner terms |
| 8 | Careers | `careers.html` | Draft structure built | Careers workshop |
| 9 | Contact | `contact.html` | Built (form, hours, maps links) | Holiday hours, directions |
| 10 | Book Now | `book.html` | Built (launch page, category and team links) | Square embed and deep-link answers |

Every page shares the header, footer and Book Now buttons. Old URLs redirect
through `_redirects` (tested).

## Page notes

### Home
Built from the homepage design: welcome doors (first visit), hero ("Be confident with Buddies Spa" /
"Be yourself, show your beauty.") with address, hours and phone, "Choose your ritual" (waxing,
massage, facials), About, "What's coming up"
(M-Events), partner logos, Careers and FAQ cards, and the "Ready when you are"
band. Two live sections from this plan were added in the design's style
because the design has no slot for them: current specials (M-Events `promo`,
shown from start to end date, newest first) and Google reviews (rating, count,
latest reviews, Google attribution and link).

**M-Events work (unchanged):**
- [ ] Optional image field in the event model, mapper, table and admin upload
- [ ] `promo` category; the site already filters promos onto Home and off Events
- [ ] `buddies-spa` tenant and a login for whoever posts promos
- [ ] Import `data/promos.json` and `data/events.json` as the first records

### About
Founder story (Kris Otto, 2022), mission and values, the space, Equality
Chamber membership, team grid from M-Staff, contact form tagged with its
page. The chatbot stays a post-launch phase; `data/faq.json` is ready to feed it.

**M-Staff work:**
- [ ] Build from M-Events (model, mapper, table, admin, public feed)
- [ ] Share the promo image uploader
- [ ] Import `data/staff.json` (Square team member IDs included)

### FAQ
One section per service, each split into Before / During / After, plus First
visit & general. Men's waxing and facials are tightened and rewritten
inclusively; the rest are placeholders. Search, jump links, a Book button per
service, and FAQPage structured data built from answered questions only.

### Services
Category blocks with photo, description, menu highlights, "Available with"
staff chips, Book and "What to expect". **Decision pending:** A (categories
only), B (our own prices) or C (Square catalog sync, recommended if the
catalog is Square). Menu rows are placeholders until then.

### Events
M-Events upcoming and past lists with cover images and per-event ticket
buttons (Partiful link or free RSVP). "Throw an event with Buddies" uses the
client's real copy: signature experiences, add-ons, event types, packages
($300 / $800 / custom) and a testimonial. The inquiry form is tagged
`private-event`.

### Partners
PMA-style layout: intro, rotating spotlight (Big Gay Smiles), filterable grid
of eight partners, memberships, how partnership works, and a "Become a
partner" form tagged `partnership`. The DC World Pride 2025 banner was removed.

### Careers (to workshop)
The current pitch, why work here, role cards from `data/careers.json` (Apply
fills in the Position dropdown), hiring steps, application form (links, not
uploads), and an equal opportunity statement. All role details are placeholders.

### Book Now
A branded launch page: a large button to Square, an embed slot, category
quick links, "book with" links for the team, gift cards, walk-ins, and the
policy summary. **Current routing:** the header Book Now goes to `book.html`;
service and team Book buttons go straight to Square
(`booking.serviceButtonsGoDirect`).

## Booking and staff

Square Appointments handles availability and checkout. If Square supports
links that pre-select a category or team member, fill
`booking.categories` (and staff `bookingUrl`) in `js/site-config.js`, and every
Book button picks them up. If it doesn't, all buttons open the main booking
page, which is the current behavior. The choose-service → choose-staff picker
from the first plan is only worth building if pre-select links exist.

## Changes from the Nov 21 plan

0. **Nov 24: homepage design applied site-wide.** New palette, Jost body type,
   pill buttons, arch photos, medallion header and footer, and the door intro.
   The specials ribbon and the home team strip were removed (the design has
   neither); specials moved into a Home section.

1. Phase 5 now matches the Book Now notes: a launch page plus direct links,
   with the picker only if Square supports pre-selection.
2. Phase 4 no longer says "two data files": staff comes from M-Staff, and
   services stay in `data/services.json` unless option C replaces it.
3. Launch steps were missing; they're now in `DEPLOYMENT.md`.
4. FAQ, partners and careers data files were added to the stack table.
5. Hours were added to the client details.
6. Gold is used for lines and for text only on dark backgrounds, where it
   meets contrast; brown carries text and buttons on light backgrounds.
7. The map is a styled card with Google and Apple Maps links instead of an
   embedded iframe, keeping the strict CSP (no third-party frames).

## Build phases

1. [x] **Setup:** structure from PMA, build page list, CI, `_headers`,
   `_redirects`. (The GitHub repo and preview deploy still need creating; see DEPLOYMENT.md.)
2. [x] **Design system and shell:** tokens, type, buttons, header, mobile nav, footer (redone to the homepage design on Nov 24).
3. [x] **Home** (rebuilt to the homepage design, including the welcome intro)
4. [x] **Services and Staff:** category data, staff seed data, cards and filters.
5. [x] **Book Now:** launch page and direct links. Picker only if Square pre-select exists.
6. [x] **About and FAQ**
7. [x] **Events and Partners:** M-Events-shaped data and partner grid. Live feeds once M-Events/M-Staff ship.
8. [x] **Careers and Contact:** forms wired to the contact function. Resend keys pending.
9. [ ] **QA:** real-device mobile and desktop passes, screen reader pass, page
   speed, final SEO and local business schema check. (Automated checks,
   contrast-safe tokens and redirects are done.)
10. [ ] **Client review and launch:** fill placeholders (`npm run launch-check`
    must pass), then follow the launch steps in `DEPLOYMENT.md`.
