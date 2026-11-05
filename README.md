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
- `tools/`       – scripts used to trace the model from the architect's PDFs (not needed to run the site)

## Sources
- Floors 1–4: first floor warrant drawing 40612_202 (Dec 2024). Flat 5 is the two-bedroom version from this drawing.
- Ground floor and basement: planning drawings "Proposed Floor Plans 1 of 2 / 2 of 2" (Fitzgerald Associates, Nov 2022).
- Floor 4 currently uses the first-floor layout until its drawing is supplied.

## Swap in real media
In `index.html`, find `const ASSETS=` and fill in by layout position (flat 1–7 on each floor):

    5:{renders:['renders/flat-5-lounge.jpg'], tour:'https://your-360-tour-link'},

When a tour link is set, the Virtual tour tab shows an "Open 360° tour" button next to the 3D walk-through.

## Prices, rents, reservations
- Launch prices: 2 bedroom £110,000, 1 bedroom £90,000 (search for `const price=` in `index.html`).
- All 28 flats are available. To mark a flat reserved, add its number to `RESERVED`.
- Rents are estimates for the yield calculator.

## Garden, parking and cycle yard
From the landscaping plan CHRQ-2510-LS (astell associates, 9 Oct 2025), saved as `plans/landscaping.png`:
shared rear garden with trees, shrub beds and an 18 m beech hedge; 3 accessible parking bays; 1 EV charging bay;
covered cycle shelter (10 spaces) and bin store behind the building. Shown in 3D under "Garden and parking".
