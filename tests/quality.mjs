// EXPLAIN: quality gate for speed and access (NFR-01, NFR-02, NFR-10). It runs on the BUILT page (dist/).
// 1. axe-core: every page, light and dark, phone (390 px) and desktop (1440 px). Fails on any serious or critical error.
// 2. Lighthouse (mobile): main page, 3 runs, the median counts (lesson MCF L18: one browser run can fail by chance).
//    Targets: performance 90+, accessibility 95+, Largest Contentful Paint 2.5 s or less, first load 1 MB or less.
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { start, URL_BASE } from './server.mjs';

const PORT = 4330;
const server = await start(PORT);
const B = URL_BASE(PORT);
const fails = [];

// ---- 1. axe-core ----
const browser = await chromium.launch();
const home = await browser.newPage();
await home.goto(B);
const pages = ['', 'no-such-page', ...new Set(await home.$$eval('a[href*="/projects/"]', (a) => a.map((x) => x.getAttribute('href').replace(/^.*?\/projects\//, 'projects/'))))];
await home.close();
for (const path of pages) {
  for (const scheme of ['light', 'dark']) {
    for (const width of [390, 1440]) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme });
      const pg = await ctx.newPage();
      await pg.goto(B + path);
      await pg.evaluate(() => document.fonts.ready);
      const res = await new AxeBuilder({ page: pg }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      for (const v of res.violations.filter((x) => x.impact === 'serious' || x.impact === 'critical')) {
        fails.push(`axe ${path || 'home'} @${width} ${scheme}: ${v.id} (${v.impact}) on ${v.nodes.length} element(s): ${v.nodes[0].target.join(' ')}`);
      }
      await ctx.close();
    }
  }
}
// The Workshop view (on) and its review panel: same axe rules.
for (const scheme of ['light', 'dark']) {
  for (const width of [390, 1440]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme });
    const pg = await ctx.newPage();
    await pg.goto(B + '?workshop');
    await pg.waitForSelector('.ws-strip');
    for (const step of ['workshop', 'review panel']) {
      if (step === 'review panel') { await pg.click('.ws-review'); await pg.waitForSelector('.ws-dialog[open]'); }
      const res = await new AxeBuilder({ page: pg }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      for (const v of res.violations.filter((x) => x.impact === 'serious' || x.impact === 'critical')) {
        fails.push(`axe ${step} @${width} ${scheme}: ${v.id} (${v.impact}) on ${v.nodes.length} element(s): ${v.nodes[0].target.join(' ')}`);
      }
    }
    await ctx.close();
  }
}
console.log(`axe: ${pages.length} pages x 2 themes x 2 widths checked, plus the Workshop view and its review panel`);

// ---- 2. Lighthouse (mobile) ----
const chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new', '--no-sandbox'] });
const runs = [];
for (let i = 0; i < 3; i++) {
  const r = await lighthouse(B, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['performance', 'accessibility'] });
  const a = r.lhr.audits;
  runs.push({
    perf: Math.round(r.lhr.categories.performance.score * 100),
    a11y: Math.round(r.lhr.categories.accessibility.score * 100),
    lcp: a['largest-contentful-paint'].numericValue / 1000,
    kb: a['total-byte-weight'].numericValue / 1024,
  });
}
await chrome.kill();
const med = (k) => runs.map((r) => r[k]).sort((x, y) => x - y)[1];
const m = { perf: med('perf'), a11y: med('a11y'), lcp: med('lcp'), kb: med('kb') };
console.log(`lighthouse (mobile, median of 3): performance ${m.perf}, accessibility ${m.a11y}, LCP ${m.lcp.toFixed(2)} s, first load ${Math.round(m.kb)} KB`);
if (m.perf < 90) fails.push(`NFR-01: Lighthouse performance ${m.perf} (target 90+)`);
if (m.lcp > 2.5) fails.push(`NFR-01: Largest Contentful Paint ${m.lcp.toFixed(2)} s (target 2.5 s or less)`);
if (m.a11y < 95) fails.push(`NFR-02: Lighthouse accessibility ${m.a11y} (target 95+)`);
if (m.kb > 1024) fails.push(`NFR-10: first load ${Math.round(m.kb)} KB (target 1 MB or less)`);

await browser.close();
server.close();
for (const f of [...new Set(fails)]) console.log('FAIL', f);
console.log(fails.length ? `RESULT: FAIL (${new Set(fails).size})` : 'RESULT: PASS');
process.exit(fails.length ? 1 : 0);
