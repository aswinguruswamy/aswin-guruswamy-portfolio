// EXPLAIN: the automatic checks that CI runs on every pull request. A failed check blocks the merge.
// It opens each page at 11 widths (320, 360, 375, 390, 414, 430, 768, 1024, 1280, 1440, 1920 px) and in light and dark mode, then checks:
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
const pages = ['', 'projects/monte-carlo-delivery-forecast/', 'projects/raid-log-extractor/', 'projects/status-report-generator/', 'projects/pm-benchmark/', 'projects/ame-3d-lessons/', 'no-such-page'];
const fails = [];
const warns = [];
const seen = new Set();
for (const path of pages) for (const w of [320, 360, 375, 390, 414, 430, 768, 1024, 1280, 1440, 1920]) for (const scheme of ['light', 'dark']) {
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
    // D56 v0: Aswin's texts replaced the lorem ipsum of D43 v1 (18 Nov 2026). No placeholder text may come back.
    if (/lorem ipsum|dolor sit amet/i.test(txt)) out.push('placeholder text "lorem ipsum" on the page (D56 v0)');
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
    // no 2 buttons or links overlap or sit closer than 4 px (a cut or covered control is not page overflow, so the overflow check misses it)
    { const els = [...document.querySelectorAll('a[href], button, [tabindex="0"]')].filter((e) => e.offsetParent && !e.closest('.row') && !e.matches('ul.row') && getComputedStyle(e).visibility !== 'hidden')
        .map((e) => ({ e, r: e.getBoundingClientRect() })).filter((x) => x.r.width && x.r.right > 0 && x.r.left < innerWidth);
      for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
        const a = els[i], c = els[j]; if (a.e.contains(c.e) || c.e.contains(a.e)) continue;
        const gx = Math.max(c.r.left - a.r.right, a.r.left - c.r.right), gy = Math.max(c.r.top - a.r.bottom, a.r.top - c.r.bottom);
        if (gx < 4 && gy < 4) out.push(`controls overlap or touch: "${(a.e.getAttribute('aria-label') || a.e.textContent).trim().slice(0, 20)}" and "${(c.e.getAttribute('aria-label') || c.e.textContent).trim().slice(0, 20)}"`);
      } }
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
  await pg.click('.side .nav a[href="#experience"]');
  // The smooth scroll can take longer than 900 ms in Firefox. Wait up to 3 s for the mark (a fixed wait made this check flaky).
  await pg.waitForFunction(() => document.querySelector('.nav a[aria-current]')?.textContent.trim() === 'Experience', null, { timeout: 3000 }).catch(() => {});
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

  // AGP-34 v2 AC2, AC4, AC5, AC6 and AGP-35 AC1, AC2, AC6, AC7 (D23 v0, D25 v0, D26 v0, D28 v0, D35 v1): test data with known answers.
  {
    await pg.setViewportSize({ width: 1440, height: 900 });
    const pd = JSON.parse(await (await pg.request.get(B + 'data/progress.json')).text());
    const keys = Object.keys(pd.epics); const t = JSON.parse(JSON.stringify(pd));
    for (const k of keys) t.epics[k] = { title: t.epics[k].title, done: 0, total: 0 };
    t.epics['AGP-44'] = { title: '<img src=x onerror="window.__xss=1">MCF', done: 1, total: 250 }; // 0.4% -> 1%; HTML in a title
    t.epics['AGP-45'] = { title: 'RAID', done: 3, total: 4 }; // 75%
    t.epics['AGP-10'] = { title: 'Workshop', done: 1, total: 3 }; // 33%
    for (const g of Object.keys(t.groups)) t.groups[g] = { done: 0, total: 0 };
    t.groups['pm-tools'] = { done: 5, total: 257 }; // the sum of its epics, made by make-progress.mjs
    t.takenAt = new Date().toISOString();
    // One page load: measure with the Workshop off, then press the switch and measure again (WebKit gave 2 page loads
    // different head heights, 19 Nov, so 2 loads cannot show what the pies alone do).
    await pg.route('**/data/progress.json*', (r) => r.fulfill({ body: JSON.stringify(t), contentType: 'application/json' }));
    await pg.goto(B); await pg.waitForLoadState('networkidle'); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(300);
    // Each card is measured from the top of its own section, after the fonts load (WebKit flake, 19 Nov: the top row
    // height changed with font timing, not with the pies).
    const POS = () => [...document.querySelectorAll('[data-epic]')].map((x) => { const r = x.getBoundingClientRect(); const s = (x.parentElement.closest('section.panel') || x.parentElement).getBoundingClientRect(); return [x.dataset.epic, Math.round(r.x - s.x), Math.round(r.y - s.y)]; });
    const before = await pg.evaluate(POS);
    await pg.click('[data-workshop]'); await pg.waitForSelector('.ws-strip .ws-legend'); await pg.waitForTimeout(300);
    const got = await pg.evaluate(() => {
      const pieOf = (sel) => document.querySelector(sel)?.querySelector('.pie');
      const p = pieOf('[data-epic="AGP-44"]'); const cs = getComputedStyle(p);
      return {
        mcf: p.textContent, raid: pieOf('[data-epic="AGP-45"]').textContent, nm: pieOf('[data-epic="AGP-51"]').textContent,
        nmLabel: pieOf('[data-epic="AGP-51"]').getAttribute('aria-label'),
        pmGroup: pieOf('[data-group="pm-tools"]').textContent, apps: pieOf('[data-group="apps"]').textContent,
        w: p.getBoundingClientRect().width, size: cs.fontSize, weight: cs.fontWeight, color: cs.color, bg: cs.backgroundImage,
        legend: document.querySelector('.ws-legend').textContent, time: document.querySelector('.ws-strip').textContent,
        xss: window.__xss === 1, img: !!document.querySelector('.ws-strip img, .pie img'),
        on: document.documentElement.classList.contains('ws-on'),
      };
    });
    await pg.evaluate(() => document.fonts.ready); got.after = await pg.evaluate(POS);
    if (got.mcf !== '1%') fails.push(`AGP-34 AC2: 1 of 250 points shows "${got.mcf}", want "1%"`);
    if (got.raid !== '75%') fails.push(`AGP-34 AC2: 3 of 4 points shows "${got.raid}", want "75%"`);
    if (got.nm !== '–' || !/no work planned yet/i.test(got.nmLabel || '')) fails.push('AGP-34 AC3: 0 planned points must show "–" and read "No work planned yet"');
    if (got.pmGroup !== '2%') fails.push(`AGP-35 AC1: PM tools pie shows "${got.pmGroup}", want 2% (5 of 257 points)`);
    if (got.apps !== '–') fails.push(`AGP-35 AC1: Apps pie shows "${got.apps}", want "–" (0 planned points)`);
    if (Math.round(got.w) !== 48 || got.size !== '13px' || Number(got.weight) < 700 || got.color !== 'rgb(0, 0, 0)') fails.push(`AGP-34 AC4: pie ${got.w}px, ${got.size}, weight ${got.weight}, colour ${got.color}`);
    if (!/rgb\(255, 255, 255\)/.test(got.bg) || !got.on) fails.push('AGP-34 AC6: the empty part of the pie is not white, or the page has no 55% screen');
    if (got.legend !== 'LIVE = first version out · % = share of the full plan built' || !/UTC/.test(got.time)) fails.push('AGP-35 AC2: the strip has no snapshot time or the legend text is wrong');
    if (got.xss || got.img) fails.push('AGP-35 AC7: HTML from progress.json went into the page');
    // The strip sits above the content (D46 v0) and moves whole sections down; a pie must move no card inside its section.
    const moved = got.after.filter((a, i) => before[i] && (Math.abs(a[1] - before[i][1]) > 1 || Math.abs(a[2] - before[i][2]) > 1)).map((a) => a[0]);
    if (moved.length) fails.push(`AGP-34 AC5: cards moved when the Workshop turned on: ${got.after.filter((a, i) => before[i] && (a[1] !== before[i][1] || a[2] !== before[i][2])).map((a, i) => a.join(':') + ' was ' + before.find((b) => b[0] === a[0]).slice(1).join(':')).slice(0, 3).join(', ')}`);
    for (const [kind, body] of [['empty', ''], ['broken', '{"epics": ']]) {
      await pg.unroute('**/data/progress.json*');
      await pg.route('**/data/progress.json*', (r) => r.fulfill({ body, contentType: 'application/json' }));
      await pg.goto(B + '?workshop'); await pg.waitForSelector('.ws-strip'); await pg.waitForTimeout(300);
      const r = await pg.evaluate(() => ({ nums: [...document.querySelectorAll('.pie')].filter((p) => p.textContent !== '–').length, text: document.querySelector('.ws-strip').textContent }));
      if (r.nums || /error|undefined|null|NaN|Syntax|JSON/i.test(r.text)) fails.push(`AGP-35 AC6: ${kind} progress.json: ${r.nums} pies with a number, strip "${r.text.slice(0, 60)}"`);
    }
    await pg.unroute('**/data/progress.json*');
  }
  // AGP-32 AC4, AC5 (NFR-12): the choice is kept for the next visit, only the theme is in local storage, and theme.js runs before the CSS.
  {
    const c = await browser.newContext({ viewport: { width: 1440, height: 800 }, colorScheme: 'light' }); const q = await c.newPage();
    await q.goto(B); await q.locator('.top .theme').click();
    const q2 = await c.newPage(); await q2.goto(B);
    if ((await q2.evaluate(() => document.documentElement.getAttribute('data-theme'))) !== 'dark') fails.push('AGP-32 AC4: a new visit does not open in the saved dark choice');
    const ls = await q2.evaluate(() => Object.keys(localStorage));
    if (ls.join(',') !== 'theme') fails.push(`AGP-32 AC4 (NFR-12): local storage holds [${ls}], want only theme`);
    const head = await (await q2.request.get(B)).text();
    const iT = head.indexOf('/js/theme.js'), iC = head.search(/<link[^>]+stylesheet/);
    if (iT < 0 || (iC >= 0 && iT > iC) || /<script[^>]+theme\.js[^>]+(defer|async)/.test(head)) fails.push('AGP-32 AC5: theme.js must load before the CSS, with no defer or async');
    await c.close();
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
// Keyboard and screen readers (AGP-30, AGP-32 AC7, AGP-55 AC5, front-end bug check 18 Nov)
{
  for (const w of [390, 1024]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 } }); const pg = await ctx.newPage(); await pg.goto(B);
    await pg.click('.menu-btn'); await pg.waitForTimeout(150);
    for (let i = 0; i < 20; i++) { await pg.keyboard.press('Tab'); if (!(await pg.evaluate(() => document.getElementById('menu').contains(document.activeElement)))) { fails.push(`menu @${w}: Tab leaves the open menu (AGP-55 AC5)`); break; } }
    await pg.keyboard.press('Shift+Tab'); await pg.keyboard.press('Shift+Tab');
    if (!(await pg.evaluate(() => document.getElementById('menu').contains(document.activeElement)))) fails.push(`menu @${w}: Shift+Tab leaves the open menu`);
    await pg.keyboard.press('Escape');
    if (!(await pg.evaluate(() => document.activeElement && document.activeElement.classList.contains('menu-btn')))) fails.push(`menu @${w}: Esc does not give focus back to the menu button`);
    await ctx.close();
  }
  // REQ-05 v0, D30 v0 item 4: at each width, with the Workshop off and on, a visitor can reach LinkedIn, GitHub and light/dark:
  // in the top bar, or in the menu when the menu button shows.
  for (const w of [320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) for (const ws of [false, true]) {
    const c = await browser.newContext({ viewport: { width: w, height: 800 } }); const q = await c.newPage(); await q.goto(B + (ws ? '?workshop' : '')); await q.waitForTimeout(250);
    const vis = (sel) => q.evaluate((sel) => [...document.querySelectorAll(sel)].some((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }), sel);
    const need = { LinkedIn: 'a[href*="linkedin.com"]', GitHub: 'a[href^="https://github.com/aswinguruswamy"]', 'light/dark': '.theme' };
    const missing = [];
    for (const [n, sel] of Object.entries(need)) if (!(await vis('.top ' + sel)) && !(await vis('.side ' + sel))) missing.push(n);
    if (missing.length && (await vis('.menu-btn'))) {
      await q.click('.menu-btn'); await q.waitForTimeout(150);
      for (const n of [...missing]) if (await vis('#menu ' + need[n])) missing.splice(missing.indexOf(n), 1);
    }
    missing.forEach((n) => fails.push(`links @${w}${ws ? ' Workshop on' : ''}: no visible ${n} in the top bar or the menu (REQ-05, D30 v0 item 4)`));
    await c.close();
  }
  // D53 v0, D55 v0 (AGP-21 AC8): LinkedIn and GitHub logos are the official kit files, unchanged, in the agreed colour,
  // at least 21 px (LinkedIn [in]) and at least 3:1 against their button (WCAG 1.4.11).
  {
    const fs = await import('node:fs'); const crypto = await import('node:crypto');
    const kit = JSON.parse(fs.readFileSync('tests/brand-kit.json', 'utf8')).files;
    for (const [f, e] of Object.entries(kit)) {
      const path = 'public/img/brand/' + f;
      if (!fs.existsSync(path)) { fails.push(`brand: ${f} is missing`); continue; }
      const sha = crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
      if (sha !== e.sha256) fails.push(`brand: ${f} is not the checked kit file (sha256 changed)`);
      if (e.kitSize) { const [kw, kh] = e.kitSize, [w, h] = e.size; if (Math.abs(w - Math.round(kw * h / kh)) > 1) fails.push(`brand: ${f} does not keep the kit ratio`); }
    }
    const COLOUR = { 'linkedin-in-blue.png': [10, 102, 194], 'linkedin-in-black.png': [0, 0, 0], 'linkedin-in-white.png': [255, 255, 255], 'github-invertocat-black.svg': [0, 0, 0], 'github-invertocat-white.svg': [255, 255, 255] };
    const WANT = { light: { LinkedIn: 'linkedin-in-blue.png', GitHub: 'github-invertocat-black.svg' }, darktop: { LinkedIn: 'linkedin-in-white.png', GitHub: 'github-invertocat-white.svg' }, darkother: { LinkedIn: 'linkedin-in-black.png', GitHub: 'github-invertocat-black.svg' } };
    const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    for (const w of [390, 1440]) for (const scheme of ['light', 'dark']) for (const menu of [false, true]) {
      if (menu && w === 1440) continue;
      const c = await browser.newContext({ viewport: { width: w, height: 800 }, colorScheme: scheme }); const q = await c.newPage(); await q.goto(B); await q.waitForTimeout(150);
      if (menu) { await q.click('.menu-btn'); await q.waitForTimeout(150); }
      const marks = await q.evaluate(() => [...document.querySelectorAll('.bm')].filter((m) => m.getBoundingClientRect().width > 0).map((m) => {
        const shown = [...m.querySelectorAll('img')].filter((i) => getComputedStyle(i).display !== 'none');
        let bg = null; for (let e = m; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor.match(/[\d.]+/g); if (c && (c.length === 3 || +c[3] > 0.9)) { bg = c.slice(0, 3).map(Number); break; } }
        return { brand: m.dataset.brand, top: !!m.closest('.top'), files: shown.map((i) => i.getAttribute('src').split('/').pop()), h: shown[0] ? shown[0].getBoundingClientRect().height : 0, bg };
      }));
      if (!marks.length) fails.push(`brand @${w} ${scheme}${menu ? ' menu' : ''}: no visible logo`);
      for (const m of marks) {
        const where = `brand ${m.brand} @${w} ${scheme}${m.top ? ' top bar' : ' menu'}`;
        if (m.files.length !== 1) { fails.push(`${where}: ${m.files.length} logo files show (want 1)`); continue; }
        const want = WANT[scheme === 'light' ? 'light' : m.top ? 'darktop' : 'darkother'][m.brand];
        if (m.files[0] !== want) fails.push(`${where}: shows ${m.files[0]}, want ${want} (D55 v0)`);
        if (m.brand === 'LinkedIn' && m.h < 21) fails.push(`${where}: the [in] is ${m.h} px high (LinkedIn minimum 21 px)`);
        const a = lum(COLOUR[m.files[0]]), b = lum(m.bg || [255, 255, 255]); const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        if (ratio < 3) fails.push(`${where}: logo contrast ${ratio.toFixed(2)}:1 against its button (want 3:1)`);
      }
      await c.close();
    }
  }
  // Polish list (Code guide 7b, 18 Nov 2026): P1-P5 and AGP-28. Each check failed on the old page.
  {
    const midY = (r) => (r.top + r.bottom) / 2;
    // P1, P2: arrow buttons on project pages: 1 normal gap (<= 10 px) between text and arrow; arrow on the text centre line (<= 2.5 px).
    for (const w of [390, 1440]) {
      const c = await browser.newContext({ viewport: { width: w, height: 900 } }); const q = await c.newPage();
      for (const path of ['projects/monte-carlo-delivery-forecast/', 'projects/raid-log-extractor/']) {
        await q.goto(B + path); await q.evaluate(() => document.fonts.ready);
        const r = await q.evaluate(() => [...document.querySelectorAll('.p-links .btn, .pager .btn, main .btn')].filter((b) => /[↗←→]/.test(b.textContent) && b.offsetParent).map((b) => {
          const arr = b.querySelector('.arr'); const txt = [...b.children].find((x) => x !== arr && !x.classList.contains('vh'));
          if (!arr || !txt) return { name: b.textContent.trim().slice(0, 24), bad: 'arrow is not in its own span' };
          const range = document.createRange(); range.selectNodeContents(txt.firstChild || txt); const t = range.getBoundingClientRect(); const a = arr.getBoundingClientRect();
          const gap = a.left >= t.right ? a.left - t.right : t.left - a.right;
          return { name: b.textContent.trim().slice(0, 24), gap: Math.round(gap), dy: Math.abs((a.top + a.bottom) / 2 - (t.top + t.bottom) / 2) };
        }));
        for (const x of r) {
          if (x.bad) fails.push(`P1/P2 ${path} @${w}: "${x.name}": ${x.bad}`);
          else { if (x.gap > 10) fails.push(`P1 ${path} @${w}: "${x.name}": ${x.gap} px gap before the arrow (want 10 px or less)`); if (x.dy > 2.5) fails.push(`P2 ${path} @${w}: "${x.name}": arrow ${x.dy.toFixed(1)} px off the text centre line`); }
        }
        // P2: phones: when previous and next stack, both are full width and "next" text ends at the right.
        if (w === 390) {
          const pg = await q.evaluate(() => { const bs = [...document.querySelectorAll('.pager .btn')]; const nav = document.querySelector('.pager').getBoundingClientRect(); return bs.map((b) => { const r = b.getBoundingClientRect(); const t = b.querySelector('span:not(.arr)'); return { next: b.classList.contains('next'), w: r.width, navW: nav.width, right: r.right - (t ? t.getBoundingClientRect().right : 0) }; }); });
          for (const x of pg) { if (Math.abs(x.w - x.navW) > 1) fails.push(`P2 ${path} @390: a pager button is ${Math.round(x.w)} px, not full width (${Math.round(x.navW)} px)`); if (x.next && x.right > 60) fails.push(`P2 ${path} @390: "next" text is not on the right`); }
        }
      }
      await c.close();
    }
    {
      const c = await browser.newContext({ viewport: { width: 390, height: 900 } }); const q = await c.newPage(); await q.goto(B); await q.evaluate(() => document.fonts.ready);
      await q.evaluate(() => { const d = document.querySelectorAll('.skills details'); if (d[1]) d[1].open = true; });
      await q.waitForTimeout(400); // let the marker finish its 0.15 s turn before it is measured (WebKit measured mid-turn)
      const r = await q.evaluate(() => {
        // P3: footer: the last line is at least 40% as wide as the first line.
        const f = document.querySelector('footer'); const range = document.createRange(); range.selectNodeContents(f);
        const lines = {}; for (const x of range.getClientRects()) { if (x.width < 1) continue; const k = Math.round(x.top); lines[k] = (lines[k] || 0) + x.width; }
        const ws = Object.keys(lines).sort((a, b) => a - b).map((k) => lines[k]);
        // P4: no divider under the last job.
        const boxes = [...document.querySelectorAll('#experience .box')]; const last = boxes[boxes.length - 1];
        // P5: the open and the closed skills marker have the same size.
        const ch = [...document.querySelectorAll('.skills summary .chev')].map((e) => { const b = e.getBoundingClientRect(); const open = e.closest('details').open; const cs = getComputedStyle(e); const lw = parseFloat(cs.width), lh = parseFloat(cs.height); return { open, w: Math.round(isNaN(lw) ? b.width : lw), h: Math.round(isNaN(lh) ? b.height : lh), tag: e.tagName }; }); // layout size: a turn (transform) does not change it
        // AGP-28: AI skills: each item with a project links to a project page.
        const links = [...document.querySelectorAll('.skill-items a')].map((a) => a.getAttribute('href'));
        // P5: the content of each open skills box ends at least 8 px above the box edge.
        const tight = [...document.querySelectorAll('.skills details[open]')].map((d) => { const last = d.lastElementChild.getBoundingClientRect(); const box = d.getBoundingClientRect(); return { head: d.querySelector('summary').textContent.trim(), space: box.bottom - last.bottom }; }).filter((x) => x.space < 8);
        return { ws, lastBorder: last ? parseFloat(getComputedStyle(last).borderBottomWidth) : 0, ch, links, tight };
      });
      if (r.ws.length > 1 && r.ws[r.ws.length - 1] < r.ws[0] * 0.4) fails.push(`P3 footer @390: the last line is ${Math.round(r.ws[r.ws.length - 1])} px, the first ${Math.round(r.ws[0])} px (1 word alone)`);
      if (r.lastBorder > 0) fails.push(`P4 experience @390: a ${r.lastBorder} px divider under the last job`);
      // P5 measures the shape without rotation: a turned square keeps its box; a turned glyph does not.
      const open = r.ch.find((x) => x.open), shut = r.ch.find((x) => !x.open);
      if (!open || !shut) fails.push('P5 skills @390: need 1 open and 1 closed box to compare');
      else if (open.w !== shut.w || open.h !== shut.h || open.w !== open.h) fails.push(`P5 skills @390: open marker ${open.w}x${open.h} px, closed ${shut.w}x${shut.h} px (want the same square)`);
      for (const x of r.tight) fails.push(`P5 skills @390: "${x.head}" content ends ${Math.round(x.space)} px above the box edge (want 8 px or more)`);
      if (r.links.length < 3) fails.push(`AGP-28 AI skills: ${r.links.length} links to project pages (want 3 or more)`);
      for (const h of r.links) if (!/\/projects\/[a-z0-9-]+\/$/.test(h)) fails.push(`AGP-28 AI skills: link "${h}" is not a project page`);
      await c.close();
    }
  }
  // P6 (Aswin, 18 Nov 2026): each section tag fills its panel's top-left corner: at the inner edge of the panel border,
  // no own top/left border, and the same corner curve as the inside of the panel. Light and dark, phone and computer.
  for (const w of [390, 1024, 1440]) for (const scheme of ['light', 'dark']) {
    const c = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: scheme }); const q = await c.newPage(); await q.goto(B); await q.evaluate(() => document.fonts.ready);
    const r = await q.evaluate(() => [...document.querySelectorAll('.panel .tag')].filter((t) => t.offsetParent).map((t) => {
      const pn = t.closest('.panel'); const a = t.getBoundingClientRect(), b = pn.getBoundingClientRect(); const ps = getComputedStyle(pn), ts = getComputedStyle(t);
      const bw = parseFloat(ps.borderTopWidth), inner = parseFloat(ps.borderTopLeftRadius) - bw;
      return { tag: t.textContent.trim(), dx: a.left - b.left - bw, dy: a.top - b.top - bw, rad: parseFloat(ts.borderTopLeftRadius), inner, bt: parseFloat(ts.borderTopWidth), bl: parseFloat(ts.borderLeftWidth) };
    }));
    for (const x of r) {
      const where = `P6 tag "${x.tag}" @${w} ${scheme}`;
      if (Math.abs(x.dx) > 0.6 || Math.abs(x.dy) > 0.6) fails.push(`${where}: ${x.dx.toFixed(1)}/${x.dy.toFixed(1)} px from the panel's inner corner (want 0)`);
      if (Math.abs(x.rad - x.inner) > 0.6) fails.push(`${where}: corner ${x.rad} px, panel inner corner ${x.inner} px`);
      if (x.bt > 0 || x.bl > 0) fails.push(`${where}: own top/left border (${x.bt}/${x.bl} px) shows a double line`);
    }
    await c.close();
  }
  // P-RB-4, D58 v0: every Live card leads somewhere (its page, or an outside link in a new tab).
  {
    const c = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const q = await c.newPage(); await q.goto(B);
    const r = await q.evaluate(() => [...document.querySelectorAll('.row .tile')].map((t) => ({ name: t.querySelector('strong')?.textContent.trim(), live: /live/i.test(t.querySelector('.badge')?.textContent || ''), tag: t.tagName, href: t.getAttribute('href') || '', target: t.getAttribute('target') })));
    for (const t of r.filter((x) => x.live)) {
      if (t.tag !== 'A' || !t.href) fails.push(`P-RB-4 Live card "${t.name}" leads nowhere (no page, no link)`);
      else if (/^https?:/.test(t.href) && t.target !== '_blank') fails.push(`P-RB-4 Live card "${t.name}": an outside link must open in a new tab`);
    }
    await c.close();
  }
  // AGP-37 v1 AC2, AC3 (NFR-12 v0, D29 v0): the public progress.json has only the agreed fields, and no epic code or team word.
  {
    const j = await (await fetch(B + 'data/progress.json')).json();
    const keys = Object.keys(j).sort().join(',');
    if (keys !== 'epics,groups,page,takenAt') fails.push(`progress.json: top fields are [${keys}] (AGP-37 AC2)`);
    for (const [k, e] of Object.entries(j.epics || {})) {
      if (!/^AGP-\d+$/.test(k)) fails.push(`progress.json: bad epic key ${k}`);
      if (Object.keys(e).sort().join(',') !== 'done,title,total') fails.push(`progress.json ${k}: fields [${Object.keys(e)}] (AGP-37 AC2)`);
      if (/^E\d+\b/.test(e.title) || /build overlay/i.test(e.title)) fails.push(`progress.json ${k}: title "${e.title}" has an epic code or a team word (AGP-37 AC3)`);
    }
    for (const [g, v] of Object.entries({ ...(j.groups || {}), page: j.page })) if (!v || Object.keys(v).sort().join(',') !== 'done,total') fails.push(`progress.json ${g}: fields must be done and total`);
  }
  // REQ-09 v0, AGP-25: every project page has no empty box (picture or "Coming soon"; LINKS only with links), and its menu item and Back link name its own container.
  {
    const html = await (await fetch(B)).text();
    const slugs = [...new Set([...html.matchAll(/projects\/([a-z0-9-]+)\//g)].map((m) => m[1]))];
    if (slugs.length !== 10) fails.push(`project pages: ${slugs.length} cards link to a page, want 10 (REQ-09, D11 v2)`);
    for (const s of slugs) {
      const h = await (await fetch(B + 'projects/' + s + '/')).text();
      if (/<div class="shot"><\/div>/.test(h)) fails.push(`projects/${s}: empty picture box`);
      if (/<div class="p-links"><\/div>/.test(h)) fails.push(`projects/${s}: empty LINKS box`);
      const apps = /All Apps and simulations/.test(h);
      const cur = (h.match(/href="[^"]*#([a-z-]+)" aria-current="true"/) || [])[1];
      if (cur !== (apps ? 'apps' : 'pm-tools')) fails.push(`projects/${s}: menu marks "${cur}", not its own container`);
    }
  }
  // AGP-37 v1 AC7 (NFR-11 v0): each run line from 19 Nov 2026 on has the UTC time, the result, the epic count, the stories and the page points.
  {
    const fs = await import('node:fs');
    const rows = fs.readFileSync('logs/run-log.md', 'utf8').split('\n').filter((l) => /^\| 20\d\d-/.test(l) && l >= '| 2026-11-19');
    if (!rows.length) fails.push('run-log: no run line from 19 Nov 2026 on (AGP-37 AC7)');
    for (const l of rows) if (!/^\| \d{4}-\d\d-\d\d \d\d:\d\d \| (ok|failed) \| \d+ \| \d+ \| \d+\/\d+ \| [^|]+ \|$/.test(l)) fails.push(`run-log: line "${l}" needs time, result, epics, stories, page (AGP-37 AC7)`);
  }
  // AGP-43 release checks (NFR-02): the keyboard reaches every control on each page, each in a visible focus ring;
  // and no page shows "Details coming soon" (D33 v0 (6), AGP-23 AC6, AGP-24 AC5).
  {
    const html = await (await fetch(B)).text();
    const pages = ['', ...new Set([...html.matchAll(/projects\/([a-z0-9-]+)\//g)].map((m) => 'projects/' + m[1] + '/'))];
    const c = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const q = await c.newPage();
    for (const path of pages) {
      await q.goto(B + path); await q.waitForLoadState('networkidle');
      if (/Details coming soon/.test(await q.evaluate(() => document.body.innerText))) fails.push(`/${path}: shows "Details coming soon" (AGP-43)`);
      const want = await q.evaluate(() => [...document.querySelectorAll('a[href], button:not([disabled]), [tabindex="0"]')].filter((e) => e.offsetParent && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[inert], [hidden], #menu')).length);
      const seen = new Set(); let noRing = [];
      for (let i = 0; i < want + 5; i++) {
        await q.keyboard.press('Tab');
        const f = await q.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const cs = getComputedStyle(e); const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2) || /rgb/.test(cs.boxShadow); return { id: e.outerHTML.slice(0, 80), ring }; });
        if (!f) continue; seen.add(f.id); if (!f.ring) noRing.push(f.id);
      }
      if (seen.size < want) fails.push(`/${path}: Tab reached ${seen.size} of ${want} controls (AGP-43 keyboard)`);
      [...new Set(noRing)].slice(0, 3).forEach((n) => fails.push(`/${path}: no visible focus ring on ${n} (D31 v0 (1))`));
    }
    await c.close();
  }
  // D10 v1 (NFR-06, AGP-41): the visit counter loads from this site only, the CSP allows only the GoatCounter image
  // address, and no count, cookie or local-storage entry is made outside the live address or in a test browser.
  {
    const html = await (await fetch(B)).text();
    if (!/\/js\/count\.js\?v=/.test(html)) fails.push('D10 v1: the page does not load js/count.js');
    const csp = (html.match(/Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
    if (!/script-src 'self';/.test(csp) || !/img-src 'self' data: https:\/\/aswinguruswamy\.goatcounter\.com;/.test(csp)) fails.push(`D10 v1: CSP must keep script-src 'self' and add only the GoatCounter image host: ${csp}`);
    const c = await browser.newContext(); const q = await c.newPage(); const hits = [];
    q.on('request', (r) => { if (/goatcounter|zgo\.at/.test(r.url())) hits.push(r.url()); });
    await q.goto(B); await q.waitForLoadState('networkidle');
    if (hits.length) fails.push(`D10 v1: a count went out from a test browser: ${hits[0]}`);
    if ((await c.cookies()).length) fails.push('D10 v1 (NFR-06): the page set a cookie');
    await c.close();
  }
  // REQ-20 v0, D51 v0: when public/resume.pdf exists, the page has a working "Download résumé" link (sidebar and intro card) and no "coming soon".
  {
    const fs = await import('node:fs');
    if (fs.existsSync('public/resume.pdf')) {
      const html = await (await fetch(B)).text();
      const n = (html.match(/href="[^"]*\/resume\.pdf"[^>]*download/g) || []).length;
      if (n < 2) fails.push(`résumé: public/resume.pdf exists but the page has ${n} download links (want 2)`);
      if (/Résumé (coming )?soon/.test(html)) fails.push('résumé: the page still says "Résumé coming soon"');
      const r = await fetch(B + 'resume.pdf'); if (r.status !== 200) fails.push('résumé: resume.pdf does not load (' + r.status + ')');
      // D54 v0: the label names the type and the real size; a click shows "✓ Downloading" and tells screen readers, then the label comes back.
      const kb = Math.round(fs.statSync('public/resume.pdf').size / 1024);
      if (!html.includes(`(PDF, ${kb} KB)`)) fails.push(`résumé: the label does not say "(PDF, ${kb} KB)" (D54 v0)`);
      const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true }); const q = await c.newPage(); await q.goto(B);
      if (!(await q.locator('.side [data-resume]').count())) { fails.push('résumé: no [data-resume] button for the "✓ Downloading" state (D54 v0)'); await c.close(); }
      else {
      await q.click('.side [data-resume]'); await q.waitForTimeout(150);
      if ((await q.textContent('.side [data-resume]')).trim() !== '✓ Downloading') fails.push('résumé: the button does not show "✓ Downloading" after the click (D54 v0)');
      if (!/downloading/i.test((await q.textContent('#status')) || '')) fails.push('résumé: screen readers do not hear "downloading"');
      await q.waitForTimeout(5200);
      if (!/Download résumé \(PDF/.test(await q.textContent('.side [data-resume]'))) fails.push('résumé: the label does not come back after 5 s');
      await c.close();
      }
    }
  }
  // AGP-35 AC3, AC4: with no progress.json the strip shows only "Try again"; it shows the loading line, then loads again.
  {
    const c = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const q = await c.newPage();
    let n = 0; await q.route('**/data/progress.json*', async (r) => { n++; await new Promise((ok) => setTimeout(ok, 300)); r.fulfill({ status: 404, body: '' }); });
    await q.goto(B + '?workshop'); await q.waitForTimeout(100);
    if (!/loading/i.test((await q.textContent('.ws-strip .ws-msg').catch(() => '')) || '')) fails.push('workshop: no loading line while progress.json loads (AGP-35 AC3)');
    await q.waitForTimeout(500);
    const btns = await q.$$eval('.ws-strip button', (b) => b.map((x) => x.textContent.trim()));
    if (btns.join('|') !== 'Try again') fails.push(`workshop: the no-data strip must have only "Try again", has [${btns.join(', ')}] (AGP-35 AC4)`);
    else { await q.click('.ws-retry'); await q.waitForTimeout(100); if (!/loading/i.test(await q.textContent('.ws-strip .ws-msg'))) fails.push('workshop: "Try again" does not show the loading line'); await q.waitForTimeout(500); if (n < 2) fails.push('workshop: "Try again" does not load progress.json again'); }
    await c.close();
  }
  {
    const c = await browser.newContext({ viewport: { width: 1440, height: 800 }, colorScheme: 'light' }); const q = await c.newPage(); await q.goto(B);
    const t = q.locator('.top .theme');
    if ((await t.getAttribute('aria-pressed')) !== 'false') fails.push('theme: aria-pressed is not "false" in light mode (AGP-32 AC7)');
    await t.click(); if ((await t.getAttribute('aria-pressed')) !== 'true') fails.push('theme: aria-pressed is not "true" after the switch to dark');
    if ((await q.locator('#menu .theme').count()) === 0 || (await q.locator('#menu .theme').getAttribute('aria-pressed')) !== 'true') fails.push('theme: the menu switch does not show the same pressed state');
    await c.close();
  }
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, colorScheme: 'light' }); const pg = await ctx.newPage();
  await pg.addInitScript(() => { try { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.resolve() } }); } catch (e) {} });
  await pg.goto(B);
  const st = pg.locator('#status');
  if ((await st.getAttribute('aria-live')) !== 'polite') fails.push('status: no aria-live status line (AGP-30)');
  await pg.click('.hero [data-u]'); await pg.waitForTimeout(250);
  const said = await st.textContent();
  if (await pg.evaluate(() => window.isSecureContext && !!navigator.clipboard)) { if (!/copied/i.test(said || '')) fails.push('copy email: screen readers do not hear "copied" (AGP-30)'); }
  await pg.focus('.more'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(100);
  if (await pg.evaluate(() => document.activeElement === document.body || !document.activeElement)) fails.push('show all: focus is lost after the button hides');
  else if (!(await pg.evaluate(() => document.getElementById('tools-row').contains(document.activeElement)))) fails.push('show all: focus does not go to the new cards');
  await ctx.close();
}
// D59 v0: the 3 v2 PM tools share Chrome-style tabs. Each page has the 3 tabs in order, its own tab marked
// (aria-current, panel colour), the full name for screen readers, short labels on phones, and v2.0.0 on desktop.
{
  const SUITE = [['monte-carlo-delivery-forecast', 'Monte Carlo Delivery Forecast', 'Forecast'], ['raid-log-extractor', 'RAID Log Extractor', 'RAID'], ['status-report-generator', 'Status Report Generator', 'Status']];
  for (const [w, scheme] of [[1440, 'light'], [1440, 'dark'], [390, 'light']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: scheme }); const pg = await ctx.newPage();
    for (const [slug] of SUITE) {
      await pg.goto(B + 'projects/' + slug + '/');
      const t = await pg.evaluate(() => {
        const nav = document.querySelector('nav.vt'); if (!nav) return null;
        const panel = nav.nextElementSibling;
        return { next: panel?.matches('section.panel'), panelBg: getComputedStyle(panel).backgroundColor, tabs: [...nav.querySelectorAll('a')].map((a) => ({
          href: a.getAttribute('href'), cur: a.getAttribute('aria-current'), bg: getComputedStyle(a).backgroundColor, text: [...a.children].filter((e) => e.getBoundingClientRect().width > 2 && getComputedStyle(e).display !== 'none').map((e) => e.textContent.trim()).join(' '),
          name: (a.querySelector('.l')?.textContent || '') })) };
      });
      const tag = `D59 v0 ${slug} @${w} ${scheme}`;
      if (!t) { fails.push(`${tag}: no tab bar`); continue; }
      if (!t.next) fails.push(`${tag}: the tab bar is not on top of the first panel`);
      if (t.tabs.map((x) => x.href.replace(/^.*\/projects\//, '').replace(/\/$/, '')).join('|') !== SUITE.map((x) => x[0]).join('|')) fails.push(`${tag}: tab order or links are wrong`);
      t.tabs.forEach((x, i) => {
        const mine = SUITE[i][0] === slug;
        if (mine !== (x.cur === 'page')) fails.push(`${tag}: tab ${i + 1} aria-current is ${x.cur}`);
        if (mine && x.bg !== t.panelBg) fails.push(`${tag}: the open tab (${x.bg}) is not the panel colour (${t.panelBg})`);
        if (!mine && x.bg === t.panelBg) fails.push(`${tag}: a closed tab has the panel colour`);
        if (x.name !== SUITE[i][1]) fails.push(`${tag}: tab ${i + 1} screen-reader name is "${x.name}"`);
        const want = `${'FRS'[i]} ` + (w < 900 ? SUITE[i][2] : `${SUITE[i][1]} v2.0.0`);
        if (x.text !== want) fails.push(`${tag}: tab ${i + 1} shows "${x.text}", want "${want}"`);
      });
    }
    await pg.goto(B + 'projects/pm-benchmark/');
    if (await pg.locator('nav.vt').count()) fails.push('D59 v0: a tool outside the v2 family has the tab bar');
    await ctx.close();
  }
}
// REQ-08 v2, D11 v2, AGP-100: the Apps row has 3 cards, AME 3D Lessons first; the Yaw Damper Simulation and AME Courseware cards are gone; the AME page has its 2 links.
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const pg = await ctx.newPage();
  await pg.goto(B);
  const apps = await pg.evaluate(() => [...document.querySelectorAll('#apps-row .tile')].map((t) => ({ name: t.querySelector('strong')?.childNodes[0]?.textContent.trim(), epic: t.getAttribute('data-epic'), status: t.querySelector('.badge, [class*="badge"]')?.textContent.trim() || t.textContent, img: !!t.querySelector('img') })));
  const want = ['AME 3D Lessons', 'Notification and Subscription Dashboard', 'SelfBet'];
  if (apps.map((a) => a.name).join('|') !== want.join('|')) fails.push(`AGP-100 AC1: Apps row is [${apps.map((a) => a.name).join(', ')}], want [${want.join(', ')}]`);
  const ame = apps.find((a) => a.name === 'AME 3D Lessons');
  if (!ame || ame.epic !== 'AGP-53' || !/live/i.test(ame.status) || !ame.img) fails.push('AGP-100 AC3: AME 3D Lessons card is not Live, has no picture, or has no data-epic="AGP-53"');
  const slugs = await pg.evaluate(() => [...document.querySelectorAll('a.tile')].map((a) => a.getAttribute('href')));
  for (const path of ['', ...slugs.filter((h) => h && h.includes('/projects/')).map((h) => h.replace(/^.*?\/projects\//, 'projects/'))]) {
    const html = await (await pg.request.get(B + path)).text();
    if (/yaw damper simulation/i.test(html)) fails.push(`AGP-100 AC2: ${path || 'home'} still shows "Yaw Damper Simulation"`);
    if (/AME Courseware/.test(html)) fails.push(`D11 v2: ${path || 'home'} still shows "AME Courseware"`);
  }
  const gone = await pg.request.get(B + 'projects/yaw-damper-simulation/');
  if (gone.status() === 200 && !/404|out of court/i.test(await gone.text())) fails.push('AGP-100 AC2: /projects/yaw-damper-simulation/ is still built');
  await pg.goto(B + 'projects/ame-3d-lessons/');
  const links = await pg.evaluate(() => [...document.querySelectorAll('.p-links a')].map((a) => [a.textContent.replace(/\s*\(opens in a new tab\)\s*/, '').replace('↗', '').trim(), a.href, a.target]));
  const wantL = [['Live demo', 'https://aswinguruswamy.github.io/ame-3d-lessons/', '_blank'], ['Repository', 'https://github.com/aswinguruswamy/ame-3d-lessons', '_blank']];
  if (JSON.stringify(links) !== JSON.stringify(wantL)) fails.push(`AGP-100 AC4: AME page links are ${JSON.stringify(links)}`);
  await ctx.close();
}
await browser.close(); srv.close();
[...new Set(warns.map((w) => w.replace(/^.*?: /, '')))].forEach((w) => console.log('WARN', w));
const uniq = [...new Set(fails)];
uniq.forEach((f) => console.log('FAIL', f));
console.log(uniq.length ? `RESULT: FAIL (${uniq.length})` : 'RESULT: PASS');
process.exit(uniq.length ? 1 : 0);
