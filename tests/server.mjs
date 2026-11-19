// EXPLAIN: a tiny local web server that serves dist/ under the same path as GitHub Pages, for tests and snaps.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const BASE = '/aswin-guruswamy-portfolio';
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.pdf': 'application/pdf', '.webp': 'image/webp', '.json': 'application/json' };
// dist: the folder to serve (default dist/). The visual diff serves the main build from a second folder.
export function start(port = 4321, dist = 'dist') {
  const DIST = path.resolve(dist);
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (!p.startsWith(BASE)) { res.writeHead(302, { Location: BASE + '/' }); return res.end(); }
    p = p.slice(BASE.length) || '/';
    let f = path.join(DIST, p);
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f)) { res.writeHead(404, { 'Content-Type': 'text/html' }); return res.end(fs.readFileSync(path.join(DIST, '404.html'))); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    res.end(fs.readFileSync(f));
  });
  return new Promise((r) => srv.listen(port, () => r(srv)));
}
export const URL_BASE = (port = 4321) => `http://localhost:${port}${BASE}/`;
