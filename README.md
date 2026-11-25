# Buddies Spa — The Queer Spa DC

The website for **Buddies Spa**, a full-service spa in Mount Vernon Triangle,
Washington, DC, and a safe, affirming space for the LGBTQAI+ community. It
replaces the Square Online site at [buddiesspa.com](https://www.buddiesspa.com).

Booking, payments and gift cards stay in Square. This site presents the spa and
hands visitors off to Square to book.

## Highlights

- **13 pages:** Home, About, Services, Our Team, FAQ, Events, Partners, Careers,
  Contact, Book Now, Privacy, Terms and 404.
- **Home page:** a scroll-driven welcome-door intro, Monthly Specials tabs,
  expanding service columns, live Google reviews and upcoming events.
- **Fast and private:** static HTML, CSS and vanilla JavaScript with no
  framework and no third-party scripts. Fonts are self-hosted and images are
  served as WebP.
- **Secure by default:** a strict Content Security Policy, server-side form
  validation with rate limits, and a security check that runs on every build.
- **Accessible:** keyboard support, WAI-ARIA patterns, reduced-motion support,
  and text contrast of at least 4.5:1.

## Tech stack

| Area | Tools |
|---|---|
| Front end | HTML, CSS custom properties, vanilla JS |
| Build | Node 22 script: shared partials, WebP conversion via [sharp](https://sharp.pixelplumbing.com/), favicons, social image |
| Hosting | Netlify (static site + serverless functions) |
| Forms | Netlify function → [Resend](https://resend.com) email |
| Reviews | Netlify function → Google Places API (New), cached for 6 hours |
| Quality | `node --test`, security check, GitHub Actions CI, Dependabot |

## Getting started

Requires **Node.js 22** or later.

```bash
npm install
npm run dev
```

`npm run dev` opens a live preview at http://localhost:5503. Pages reload on
save and stylesheets update in place. Forms are validated but not sent, Google
reviews show labeled samples, and the production security headers apply.
Add `?intro` to the URL to replay the welcome doors.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Live preview of the source files |
| `npm test` | Run the test suites |
| `npm run build` | Build the production site into `dist/` |
| `npm run verify` | Tests, build and security check (what CI runs) |
| `npm run preview` | Build, then serve `dist/` locally |
| `npm run placeholders` | List content still waiting on the client |
| `npm run launch-check` | `verify` plus a check that no placeholders remain |

## Project structure

```
├── *.html                  One file per page
├── partials/               Shared header and footer, inlined by the build
├── css/
│   ├── style.css           Design tokens and shared components
│   ├── <page>.css          Page-specific layout
│   └── images/             Design artwork (doors, neon logo)
├── js/
│   ├── site-config.js      Business details, hours, booking links, feed URLs
│   ├── feeds.js            Data loading and DOM helpers
│   ├── nav.js              Header, menu and shared page behavior
│   ├── intro-gate.js       Decides before first paint whether to show the doors
│   ├── intro.js            Welcome-door intro (timing in its Tuning block)
│   └── <page>.js           Page rendering
├── data/                   Content as JSON: services, staff, events, FAQ, partners, careers
├── images/                 Photos (converted to WebP by the build)
├── fonts/                  Self-hosted Cormorant Garamond, Jost and Roboto (open-source licenses)
├── brand-source/           Logo masters for favicons and social image (never published)
├── netlify/                Serverless functions: contact forms and Google reviews
├── scripts/                Build, dev server, security check, placeholder report
├── tests/                  node --test suites
└── docs/                   Deployment, client questions, content rights, image list
```

## Updating content

| To change | Edit |
|---|---|
| Phone, email, address, hours, Square links | `js/site-config.js` and `partials/footer.html` (a test keeps them in sync) |
| Monthly Specials | The Spotlight section in `index.html`, photos in `images/specials/YYYY-MM/` |
| Services and menu | `data/services.json` |
| Team | `data/staff.json` |
| Events | `data/events.json` |
| FAQ | `data/faq.json` (also feeds Google's FAQ structured data) |
| Partners | `data/partners.json` |
| Open roles | `data/careers.json` and the Position list in `careers.html` (a test keeps them in sync) |
| Colors and type | Tokens at the top of `css/style.css` |

Content not yet supplied by the client shows a gold **Placeholder** tag on the
page. Run `npm run placeholders` to list them all.

## Deployment

Netlify builds with `npm run build` and publishes `dist/`. Environment variables
(Resend, Google Places, allowed origins) are set in Netlify, never committed.
`.env.example` lists their names. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
for setup, the pre-launch checklist and the domain move.

## Documentation

- [Deployment and launch checklist](docs/DEPLOYMENT.md)
- [Open questions for the client](docs/CLIENT-QUESTIONS.md)
- [Content rights checklist](docs/CONTENT-RIGHTS.md)
- [Image shot list](docs/IMAGES.md)
- [Original build plan](docs/BUILD-PLAN.md)

## License

Private and proprietary. © Buddies Spa LLC. All rights reserved.
