# Showcase Fame Living

All Fame Living projects in one site. Each project is a full mini-site in its own folder.

```
index.html          Landing page listing every project (built from landing.html)
landing.html        Landing page source – edit this, then rebuild index.html
assets/             Landing page images
cromarty-house/     Cromarty House, Regent Quay, Aberdeen (see cromarty-house/README.md)
server.js           Local preview server (node server.js → http://localhost:4280)
start-site.bat      Double-click on Windows to start the preview
```

## Add a project
1. Copy `cromarty-house/` to a new folder, e.g. `west-north-street/`, and replace its drawings, model, prices and text.
2. In `landing.html`, add an entry to `PROJECTS` (slug = folder name, image in `assets/`). Set `soon:true` for a teaser banner.
3. Rebuild `index.html` and push. Render deploys automatically.

## Addresses
- Render: the site is served from the repo root (Static Site, publish directory `.`, no build command).
- `cromarty-house-homes.onrender.com` (the original client link) opens Cromarty House directly.
- Custom domain: `showcase.fameliving.co.uk` (CNAME to the Render site).
