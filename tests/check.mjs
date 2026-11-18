// EXPLAIN: the automatic checks that CI runs on every pull request. A failed check blocks the merge.
// It opens each page at 7 widths (320, 375, 390, 768, 1024, 1280, 1440 px) and in light and dark mode, then checks:
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
const warns = [];
const seen = new Set();
for (const path of pages) for (const w of [320, 375, 390, 768, 1024, 1280, 1440]) for (const scheme of ['light', 'dark']) {
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
    // D43 v0: text that Aswin will write later may show as "[...: Aswin to write]" (a warning, not a fail). Any other "[...]" fails.
    for (const m of txt.match(/\[[^\]]{2,}\]/g) || []) { if (/: Aswin to write\]$/.test(m)) out.push('WARN placeholder: ' + m); else out.push('placeholder text: ' + m); }
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
    // card rows: the first card keeps the panel padding (about 20 px from the panel edge)
    for (const row of document.querySelectorAll('.row')) { if (getComputedStyle(row).overflowX !== 'auto') continue;
      const P = row.closest('.panel').getBoundingClientRect(), T = row.querySelector('.tile').getBoundingClientRect();
      if (T.left - P.left < 18) out.push('first card too close to the panel edge: ' + Math.round(T.left - P.left) + ' px'); }
    // text stays inside its card: no name, title, step or button runs past the panel edge (issues 3, 4, D39 v0)
    for (const pn of document.querySelectorAll('.panel')) { const P = pn.getBoundingClientRect();
      for (const el of pn.querySelectorAll('h1,h2:not(.tag),.role,.where,.step,.goal,.chips li,.btn,.box strong,.badge,.arrow-btn')) { if (!el.offsetParent || el.closest('.row')) continue;
        const r = el.getBoundingClientRect(); if (r.right > P.right + 0.5 || r.left < P.left - 0.5) out.push('text past the card edge: ' + el.textContent.trim().slice(0, 25)); } }
    // every item in the top bar stays inside the bar (a cut button is not page overflow, so the overflow check misses it)
    { const bar = document.querySelector('.top'); if (bar) { const T = bar.getBoundingClientRect();
      for (const el of bar.querySelectorAll('a, button, .wip')) { if (!el.offsetParent) continue; const r = el.getBoundingClientRect();
        if (r.right > T.right + 0.5 || r.left < T.left - 0.5) out.push('top bar item cut off: ' + (el.getAttribute('aria-label') || el.textContent.trim()).slice(0, 25)); } } }
    // the "goal" pill is on 1 line (a split pill leaves a stray "(" on the line above)
    for (const g of document.querySelectorAll('.goal')) if (g.getClientRects().length > 1) out.push('goal pill breaks over 2 lines');
    // the fixed sidebar shows only when the containers fit; otherwise the menu button shows (D39 v0)
    { const side = document.querySelector('.side'), btn = document.querySelector('.menu-btn');
      const sideOn = side && getComputedStyle(side).display !== 'none', btnOn = btn && getComputedStyle(btn).display !== 'none';
      if (sideOn === btnOn) out.push('sidebar and menu button: exactly one must show'); }
    const links = [...document.querySelectorAll('a[href]')].map((a) => a.href).filter((h) => h.startsWith(location.origin));
    const imgs = [...document.querySelectorAll('img')].map((i) => i.src);
    return { out, urls: [...links, ...imgs] };
  }, w);
  r.out.forEach((o) => (o.startsWith('WARN ') ? warns : fails).push(`${tag}: ${o.slice(o.startsWith('WARN ') ? 5 : 0)}`));
  for (const u of r.urls) {
    const clean = u.split('#')[0];
    if (seen.has(clean) || clean.endsWith('no-such-page')) continue; seen.add(clean);
    const res = await pg.request.get(clean);
    if (res.status() !== 200) fails.push(`${tag}: broken link ${clean} (${res.status()})`);
  }
  await ctx.close();
}
// card rows scroll fully back to the start (no snap bounce)
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage();
  await pg.goto(B);
  const r = await pg.evaluate(async () => { const res = []; for (const row of document.querySelectorAll('.row')) {
    row.scrollLeft = 200; await new Promise((x) => setTimeout(x, 300)); row.scrollLeft = 0; await new Promise((x) => setTimeout(x, 500)); res.push(row.scrollLeft); } return res; });
  r.forEach((v, i) => { if (v > 1) fails.push(`row ${i + 1} does not scroll back to the start (stops at ${v} px)`); });
  // D38 v0: no scrollbar on the rows, and the › button moves the row; ‹ is off at the start
  const sb = await pg.evaluate(() => [...document.querySelectorAll('.row')].map((r) => getComputedStyle(r).scrollbarWidth));
  // D42 v0: under 1100 px the top line is a sideways row with ‹ › and no scrollbar
  await pg.setViewportSize({ width: 1024, height: 900 }); await pg.waitForTimeout(200);
  const top = await pg.evaluate(() => { const r = document.getElementById('top-row'); const n = document.querySelector('.top-nav'); return r ? { sb: getComputedStyle(r).scrollbarWidth, scrolls: r.scrollWidth > r.clientWidth + 1, nav: !!n && getComputedStyle(n).display !== 'none' } : null; });
  if (!top) fails.push('no top-row container'); else {
    const back = await pg.evaluate(async () => { const r = document.getElementById('top-row'); r.scrollLeft = 200; await new Promise((x) => setTimeout(x, 300)); r.scrollLeft = 0; await new Promise((x) => setTimeout(x, 500)); return { left: r.scrollLeft, prevOff: document.querySelector('.top-nav [data-dir="-1"]').disabled }; });
    if (back.left > 1) fails.push(`top row does not scroll back to the start (stops at ${back.left} px)`);
    if (!back.prevOff) fails.push('top row: ‹ is not off at the start'); if (top.sb !== 'none') fails.push('top row shows a scrollbar'); if (!top.scrolls || !top.nav) fails.push('top row at 1024 px is not a sideways row with ‹ ›'); }
  await pg.setViewportSize({ width: 1280, height: 900 });
  sb.forEach((v, i) => { if (v !== 'none') fails.push(`row ${i + 1} shows a scrollbar`); });
  if (await pg.locator('#pm-tools [data-dir="1"]').count() === 0) fails.push('PM tools row has no ‹ › buttons');
  else {
    if (!(await pg.locator('#pm-tools [data-dir="-1"]').isDisabled())) fails.push('‹ button is not off at the start of the row');
    await pg.click('#pm-tools [data-dir="1"]'); await pg.waitForTimeout(700);
    const moved = await pg.evaluate(() => document.getElementById('tools-row').scrollLeft);
    if (moved < 100) fails.push('› button does not move the PM tools row');
  }
  // issue 9: the side menu marks the section on the screen (sidebar shows at 1440 px)
  await pg.setViewportSize({ width: 1440, height: 900 });
  await pg.evaluate(() => document.getElementById('skills').scrollIntoView()); await pg.waitForTimeout(600);
  const atSkills = await pg.evaluate(() => document.querySelector('.nav a[aria-current]')?.textContent.trim());
  if (atSkills !== 'Skills') fails.push(`side menu marks "${atSkills}" at the Skills section`);
  await pg.click('.side .nav a[href="#experience"]'); await pg.waitForTimeout(900);
  const cur = await pg.evaluate(() => document.querySelector('.nav a[aria-current]')?.textContent.trim());
  if (cur !== 'Experience') fails.push(`side menu marks "${cur}" at the Experience section`);
  await ctx.close();
}
// site-wide files (REQ-21) and no plain email address in any page source (NFR-05)
{
  const ctx = await browser.newContext(); const pg = await ctx.newPage();
  for (const f of ['sitemap.xml', 'robots.txt', 'og.png', 'favicon-32.png', 'apple-touch-icon.png', 'favicon.svg']) {
    const r = await pg.request.get(B + f); if (r.status() !== 200) fails.push(`missing ${f} (${r.status()})`);
  }
  // Workshop (REQ-16, D24-D26, D35, D46 v0): the switch, the pies, the strip, the data states
  for (const w of [320, 390, 768, 1024, 1440]) {
    await pg.setViewportSize({ width: w, height: 900 });
    await pg.goto(B + '?workshop'); await pg.waitForSelector('.ws-strip', { timeout: 5000 }).catch(() => {});
    const ws = await pg.evaluate(async () => {
      const r = { pies: document.querySelectorAll('.pie').length, cards: document.querySelectorAll('[data-epic], [data-group]').length, cover: [], over: document.documentElement.scrollWidth - innerWidth };
      // a pie must cover no text in its card (D22 rule 3): compare the pie box with the box of each text line
      for (const pie of document.querySelectorAll('.pie')) {
        const P = pie.getBoundingClientRect(); const host = pie.closest('[data-epic], [data-group]');
        const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (!n.textContent.trim() || pie.contains(n) || !n.parentElement.offsetParent) continue;
          const range = document.createRange(); range.selectNodeContents(n);
          for (const R of range.getClientRects()) if (R.width && R.left < P.right - 1 && R.right > P.left + 1 && R.top < P.bottom - 1 && R.bottom > P.top + 1) { r.cover.push(pie.getAttribute('aria-label') + ' covers "' + n.textContent.trim().slice(0, 20) + '"'); break; }
        }
      }
      return r;
    });
    if (ws.pies !== ws.cards) fails.push(`workshop @${w}: ${ws.pies} pies for ${ws.cards} cards and containers`);
    [...new Set(ws.cover)].forEach((c) => fails.push(`workshop @${w}: ${c}`));
    if (ws.over > 0) fails.push(`workshop @${w}: side scroll ${ws.over}px`);
  }
  {
    await pg.setViewportSize({ width: 1440, height: 900 });
    const pd = JSON.parse(await (await pg.request.get(B + 'data/progress.json')).text());
    await pg.goto(B + '?workshop'); await pg.waitForSelector('.ws-strip');
    const shown = await pg.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-epic]')].map((x) => [x.getAttribute('data-epic'), x.querySelector('.pie')?.textContent])));
    for (const [k, v] of Object.entries(shown)) { const e = pd.epics[k]; const want = e.total ? Math.round((100 * e.done) / e.total) + '%' : '–'; if (v !== want) fails.push(`workshop: pie ${k} shows ${v}, progress.json says ${want}`); }
    if (await pg.evaluate(() => document.querySelector('[data-workshop]').getAttribute('aria-pressed')) !== 'true') fails.push('workshop: the switch is not pressed');
    // D47 v0: no review panel
    if (await pg.locator('.ws-review, .ws-dialog').count()) fails.push('workshop: a review panel or its button is on the page (removed by D47 v0)');
    // old data (more than 24 h) and no data
    for (const [kind, body, want] of [['old', JSON.stringify({ ...pd, takenAt: '2020-01-01T00:00:00Z' }), 'Old data'], ['none', null, 'No build data']]) {
      await pg.route('**/data/progress.json*', (r) => (body ? r.fulfill({ body, contentType: 'application/json' }) : r.fulfill({ status: 404, body: '' })));
      await pg.goto(B + '?workshop'); await pg.waitForSelector('.ws-strip');
      const msg = await pg.evaluate(() => document.querySelector('.ws-msg').textContent);
      if (!msg.includes(want)) fails.push(`workshop ${kind} data: strip says "${msg}"`);
      if (kind === 'none' && (await pg.evaluate(() => [...document.querySelectorAll('.pie')].some((p) => p.textContent !== '–')))) fails.push('workshop no data: a pie shows a number');
      await pg.unroute('**/data/progress.json*');
    }
    // the switch turns it off again
    await pg.goto(B + '?workshop'); await pg.waitForSelector('.ws-strip'); await pg.click('[data-workshop]');
    if (await pg.evaluate(() => document.querySelectorAll('.pie, .ws-strip').length)) fails.push('workshop: switch off leaves pies or the strip');
  }

  // issue 10: the 404 page marks no menu item; issue 12: scripts carry a version tag
  const nf = await (await pg.request.get(B + 'no-such-page')).text();
  if (/aria-current/.test(nf)) fails.push('404: a menu item is marked as current');
  const h0 = await (await pg.request.get(B)).text();
  if (!/js\/site\.js\?v=/.test(h0)) fails.push('site.js has no version tag');
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
[...new Set(warns.map((w) => w.replace(/^.*?: /, '')))].forEach((w) => console.log('WARN', w));
const uniq = [...new Set(fails)];
uniq.forEach((f) => console.log('FAIL', f));
console.log(uniq.length ? `RESULT: FAIL (${uniq.length})` : 'RESULT: PASS');
process.exit(uniq.length ? 1 : 0);
