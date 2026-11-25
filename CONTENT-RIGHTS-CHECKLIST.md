# Buddies Spa — Content Rights & Claims Checklist

An operational safeguard for the site owner and developer, not legal advice.
Before treating third-party content as approved for production, keep a written
record (email, license, release or agreement) supporting each use.

## Images currently on the site

All of these came from the current buddiesspa.com (Square Online) uploads.
Being on the old site doesn't prove Buddies holds a license, so confirm each.

| Asset | Used on | Status |
|---|---|---|
| Rainbow neon logo (`css/images/buddies-spa-rainbow-logo.png`) | Header and footer seal, welcome doors | Confirm it's the client's own artwork; get a high-res or vector master |
| Script logo (`brand-source/`) | Social share image | Buddies' own mark |
| Wood slat wall (`css/images/wood-slat-wall.jpg`) | Welcome doors | Confirm source and license |
| Wax drip (`images/hero/wax-hero.jpg`) | Home hero | Confirm source; looks like stock |
| November promo graphic (`images/promos/november-2026.jpg`) | Home specials | Client-made; file name credits "Nguyen (Ai)". Confirm any AI or stock elements are licensed |
| Men's waxing, women's waxing, trans waxing, massage, facials, hair, lashes and brows (`images/services/`) | Home, Services, Book | **Several look like stock.** Confirm licenses or replace with real photos of the spa |
| Nails (`images/services/nails.jpeg`) | Home, Services, Book | Appears to be Buddies' own work; confirm |
| Staff photos (`images/staff/`) | About, Team, Book | Confirm each person consents to their name, photo and bio online. Several have name or neon overlays; consider a consistent headshot session. Don's photo was cropped to remove payment QR codes |
| Partner logos (`images/partners/`) | Home, Partners | Confirm permission from each partner; get higher-quality files |
| Equality Chamber badge (`images/equality-chamber.png`) | About, Partners | Confirm member badge usage rules |
| Pride 2026 poster (`images/events/pride-2026.jpg`) | Events (past) | Features named performers and sponsor logos; confirm it may stay up after the event |
| Private event photo (`images/events/private-events.jpeg`) | Events | Confirm it's the Buddies space and that no guests are identifiable |

## People

For every named team member, performer or partner contact, confirm:

- permission to use their name, likeness and biography;
- titles, licenses and experience claims are current and accurate;
- wording doesn't imply endorsement or availability beyond the real relationship.

## Partner and business claims

- Partner list, blurbs and links are current (see `data/partners.json`).
- Quotes (Big Gay Smiles, birthday party guest) are approved for use.
- Equality Chamber membership year (2025) is correct.

## Prices, promotions and policies

- Promo terms and dates match what's honored in the spa.
- Event package starting prices ($300, $800) are current.
- Hours, address and phone match Google Business Profile and Square.

## Privacy and inquiry handling

- Form submissions are emailed, not stored on the site. Limit inbox access to
  people who need it.
- Never put Resend or Google API keys, Netlify environment values or passwords
  in Git.
- Review `privacy.html` whenever form fields, hosting, email, analytics or
  review features change.

## Recordkeeping

For each item keep: the person or organization, what was approved, the source
of the asset, who granted permission and when, any restrictions or expiry, and
where the email or agreement is stored. If permission is uncertain, hide the
content until it's confirmed.
