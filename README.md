# Cromarty House – off-plan sales site

## Run it locally
Double-click **start-site.bat**. It opens http://localhost:4280 in your browser.
(Or in a terminal in this folder: `node server.js`.) Close the window to stop it.
The 3D views need an internet connection the first time, to load the 3D library.

## What's in the folder
- `index.html`   – the site
- `model.js`     – the building model (walls, doors, windows, stairs, lift, rooms, fittings) traced from the drawings
- `viewer3d.js`  – the 3D building view, flat models and walk-through tours
- `plans/`       – crops of the architect's warrant drawing for each flat position, and the ground floor plan
- `renders/`     – put real renders here
- `page.html`    – same page without the html/head wrapper (used for the hosted preview)
- `tools/`       – scripts used to trace the model from the architect's PDFs, and the investor pack source
- `availability.json` – reserved and sold flats
- `investor-pack.pdf`, `og-image.jpg` – investor pack and link-sharing image

## Sources
- Floors 1–4: first floor warrant drawing 40612_202 (Dec 2024). Flat 5 is the two-bedroom version from this drawing.
- Ground floor and basement: planning drawings "Proposed Floor Plans 1 of 2 / 2 of 2" (Fitzgerald Associates, Nov 2022).
- Floor 4 currently uses the first-floor layout until its drawing is supplied.

## Swap in real media
In `index.html`, find `const ASSETS=` and fill in by layout position (flat 1–7 on each floor):

    5:{renders:['renders/flat-5-lounge.jpg'], tour:'https://your-360-tour-link'},

When a tour link is set, the Virtual tour tab shows an "Open 360° tour" button next to the 3D walk-through.

## Site settings (contact, WhatsApp, forms, analytics)
Open `page.html` (and `index.html`) and find `const CONFIG=` near the top of the script. Fill in:
- `email`, `phone` – shown in the Register interest section.
- `whatsapp` – digits only with country code (e.g. `447700900123`). Adds a WhatsApp button.
- `bookingUrl` – e.g. a Calendly link. Adds a "Book a call" button.
- `formEndpoint` – where enquiries and investor-pack requests are sent. Easiest: create a free form at
  formspree.io and paste its URL (`https://formspree.io/f/...`). Until this is set, the form shows a thank-you
  and, if `email` is set, offers to send the enquiry by email.
- `analytics` – a Plausible domain or a Google Analytics 4 ID. Tracks flat opens, 3D/tour opens, enquiries,
  investor-pack downloads, currency changes.
- `payment`, `bulk`, `team`, `timeline`, `developerAbout` – the text in the Invest and Developer sections.
  The payment schedule is indicative until Fame Living confirms it.
Edit `page.html`, then rebuild `index.html` (or edit both the same way).

## Reserved and sold flats – no code changes
Edit `availability.json`: put flat numbers in `"reserved"` or `"sold"`, save and publish. The flat cards,
front view, floor plans and portfolio builder update automatically.

## Prices, rents, currency
- Launch prices: 2 bedroom £110,000, 1 bedroom £90,000 (search for `const price=`).
- Rents are estimates near Citylets Q2 2026 Aberdeen averages (1 bed £565, 2 bed £814): 1 bed from £595,
  2 bed from £840, a little more on higher floors and harbour side (search for `const rent=`).
- The currency menu (GBP, USD, EUR, CAD, NGN) shows approximate conversions using live rates from
  open.er-api.com, with fallback rates in `CONFIG.ratesFallback`. Prices stay in pounds.

## Investor pack (PDF)
`investor-pack.pdf` is generated from `tools/pack.html`. After changing prices or text, run
`node tools/make-pack.js` (needs Playwright: `npm i playwright`, then `npx playwright install chromium`).
Visitors get the download link after giving their name and email.

## Sharing preview
`og-image.jpg` is the picture shown when the link is shared on WhatsApp, LinkedIn, etc.

## Garden, parking and cycle yard
From the landscaping plan CHRQ-2510-LS (astell associates, 9 Oct 2025), saved as `plans/landscaping.png`:
shared rear garden with trees, shrub beds and an 18 m beech hedge; 3 accessible parking bays; 1 EV charging bay;
covered cycle shelter (10 spaces) and bin store behind the building. Shown in 3D under "Garden and parking".
