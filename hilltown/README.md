# Hilltown, Dundee — project site

Five two-bedroom flats at 112–114 Hilltown, Dundee DD3 7BG (former Hillside Works), by Fame Living.

| File | What it is |
|---|---|
| `page.html` | Page source. Edit this, then rebuild `index.html` with the wrap script. |
| `index.html` | The built page served at `/hilltown/`. |
| `model.js` | Geometry traced from LAS Architecture's drawings LAS26044_03–07 (Aug 2026): walls, openings, rooms, fittings, flats, balconies. |
| `viewer3d.js` | The 3D building, floor and walk-through viewer (`window.HT3D`). Built by joining `tools/viewer-src/*.js` in order: head, build-mid, fixfurn, tail, rest. |
| `availability.json` | Mark flats 1–5 as reserved or sold. The site updates when this file is published. |
| `plans/` | Crops of the architect's plans, per flat and per floor. |
| `img/` | Architect's visuals and the photo of the building today. |
| `investor-pack.pdf` | Built from `tools/pack/pack.html` with `node tools/pack/mk.js`. |

Prices come from Fame Living's schedule and are set in `model.js` (`flats`). Estimated rents are in `page.html` (`RENT`).
Sales email, phone, WhatsApp, booking link and form endpoint are in `CONFIG` at the top of the page script.
