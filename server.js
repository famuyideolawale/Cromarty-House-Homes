// Local preview server for Showcase Fame Living (all projects). No installs needed: run with `node server.js`
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = process.env.PORT || 4280, ROOT = __dirname;
const TYPES = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json',
  '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.pdf':'application/pdf','.mp4':'video/mp4'};
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith("/")) p += "index.html";
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
  if (!p.endsWith('/') && fs.existsSync(file) && fs.statSync(file).isDirectory()) { res.writeHead(301, {Location: p + '/'}); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, {'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream'});
    res.end(data);
  });
}).listen(PORT, () => console.log(`Showcase Fame Living running at http://localhost:${PORT}  (Ctrl+C to stop)`));
