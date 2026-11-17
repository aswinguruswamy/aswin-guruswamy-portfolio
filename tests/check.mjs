// EXPLAIN: the automatic checks that CI runs on every pull request. A failed check blocks the merge.
// It opens each page at 3 widths and in light and dark mode, then checks:
// 1 no page error, 2 nothing wider than the screen, 3 every local link and image works,
// 4 no placeholder text "[...]" and no team words, 5 the text contrast is 4.5:1 or more, 6 tap targets are 44 px or more on a phone.
import { chromium, firefox, webkit } from '@playwright/test';
import { start, URL_BASE } from './server.mjs';
const srv = await start(4500);
// BROWSER=chromium|firefox|webkit (NFR-04). CHROME = a local Chrome path for chromium.
const kind = process.env.BROWSER || 'chromium';
const browser = await ({ chromium, firefox, webkit })[kind].launch(kind === 'chromium' && process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
console.log('browser:', kind);
const B = URL_BASE(4500);
const pages = ['', 'projects/monte-carlo-delivery-forecast/', 'projects/raid-log-extractor/', 'projects/status-report-generator/', 'projects/pm-benchmark/', 'no-such-page'];
const fails = [];
const seen = new Set();
for (const path of pages) for (const w of [320, 390, 1440]) for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: scheme });
  const pg = await ctx.newPage();
  const tag = `${path || 'home'} @${w} ${scheme}`;
  pg.on('pageerror', (e) => fails.push(`${tag}: page error ${e.message}`));
  pg.on('console', (m) => { if (m.type() === 'error' && !(path === 'no-such-page' && /404/.test(m.text()))) fails.push(`${tag}: console ${m.text()}`); });
  await pg.goto(B + path);
  await pg.evaluate(() => document.fonts.ready);
  const r = await pg.evaluate((w) => {
    const out = [];
    if (document.documentElement.scrollWidth > w + 1) out.push('page is wider than the screen: ' + document.documentElement.scrollWidth);
    const txt = document.body.innerText;
    if (/\[[^\]]{2,}\]/.test(txt)) out.push('placeholder text: ' + txt.match(/\[[^\]]{2,}\]/)[0]);
    // every clip-path must point to a clipPath that exists (the avatar circle)
    for (const g of document.querySelectorAll('[clip-path]')) { const m = g.getAttribute('clip-path').match(/^url\(#([\w-]+)\)$/); if (!m || !document.getElementById(m[1])) out.push('broken clip-path: ' + g.getAttribute('clip-path')); }
    if (/\$\{|\{`/.test(document.documentElement.innerHTML)) out.push('unprocessed template text in the page');
    if (/build overlay/i.test(txt)) out.push('team word "Build Overlay" on the page');
    // contrast of each visible text element against its nearest solid background
    const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
    const bg = (el) => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length >= 3 && (c.length === 3 || c[3] > 0.9)) return c.slice(0, 3); } return null; };
    for (const el of document.querySelectorAll('h1,h2,strong,span,p,a,li,summary,small,button')) {
      if (!el.offsetParent || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      if (el.closest('[aria-disabled="true"]')) continue;
      const b = bg(el); if (!b) continue;
      const f = rgb(getComputedStyle(el).color).slice(0, 3);
      const L1 = lum(f), L2 = lum(b); const cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      if (cr < 4.5) out.push(`low contrast ${cr.toFixed(2)}: ${el.textContent.trim().slice(0, 30)}`);
    }
    if (w < 761) for (const el of document.querySelectorAll('a.btn,button,.nav a,summary')) {
      if (!el.offsetParent) continue; const r = el.getBoundingClientRect();
      if (r.height < 43.5) out.push('tap target under 44 px: ' + el.textContent.trim().slice(0, 25));
    }
    const links = [...document.querySelectorAll('a[href]')].map((a) => a.href).filter((h) => h.startsWith(location.origin));
    const imgs = [...document.querySelectorAll('img')].map((i) => i.src);
    return { out, urls: [...links, ...imgs] };
  }, w);
  r.out.forEach((o) => fails.push(`${tag}: ${o}`));
  for (const u of r.urls) {
    const clean = u.split('#')[0];
    if (seen.has(clean) || clean.endsWith('no-such-page')) continue; seen.add(clean);
    const res = await pg.request.get(clean);
    if (res.status() !== 200) fails.push(`${tag}: broken link ${clean} (${res.status()})`);
  }
  await ctx.close();
}
// site-wide files (REQ-21) and no plain email address in any page source (NFR-05)
{
  const ctx = await browser.newContext(); const pg = await ctx.newPage();
  for (const f of ['sitemap.xml', 'robots.txt', 'og.png', 'favicon-32.png', 'apple-touch-icon.png', 'favicon.svg']) {
    const r = await pg.request.get(B + f); if (r.status() !== 200) fails.push(`missing ${f} (${r.status()})`);
  }
  for (const path of pages.slice(0, 5)) {
    const html = await (await pg.request.get(B + path)).text();
    if (/[\w.+-]+@[\w-]+\.(com|ca|org|net|io)\b/i.test(html)) fails.push(`${path || 'home'}: plain email address in the page source`);
    if (!/property="og:image"/.test(html)) fails.push(`${path || 'home'}: no link-preview image tag`);
  }
  const home = await (await pg.request.get(B)).text();
  const ld = home.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
  try { if (!ld || JSON.parse(ld[1])['@type'] !== 'Person') fails.push('home: no Person structured data'); } catch { fails.push('home: structured data is not valid JSON'); }
  await ctx.close();
}
await browser.close(); srv.close();
const uniq = [...new Set(fails)];
uniq.forEach((f) => console.log('FAIL', f));
console.log(uniq.length ? `RESULT: FAIL (${uniq.length})` : 'RESULT: PASS');
process.exit(uniq.length ? 1 : 0);
