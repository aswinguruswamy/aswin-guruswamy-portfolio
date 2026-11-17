// EXPLAIN: takes the milestone screenshots for the showcase (desktop light and dark, phone, phone menu, project page).
// Use: node tests/snap.mjs <milestone-name>   → docs/snaps/<date>-<milestone>-<view>.png
import { chromium } from '@playwright/test';
import { start, URL_BASE } from './server.mjs';
const name = process.argv[2] || 'snap';
const day = new Date().toISOString().slice(0, 10);
const srv = await start();
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
const views = [
  ['desktop-light', 1440, 'light', ''],
  ['desktop-dark', 1440, 'dark', ''],
  ['phone', 390, 'light', ''],
  ['phone-menu', 390, 'light', 'menu'],
  ['project', 1440, 'light', 'projects/raid-log-extractor/'],
];
for (const [v, w, theme, extra] of views) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: theme, deviceScaleFactor: 1 });
  const pg = await ctx.newPage();
  await pg.goto(URL_BASE() + (extra === 'menu' ? '' : extra));
  await pg.evaluate(() => document.fonts.ready);
  if (extra === 'menu') { await pg.click('.menu-btn'); await pg.waitForTimeout(200); }
  await pg.screenshot({ path: `docs/snaps/${day}-${name}-${v}.png`, fullPage: extra !== 'menu' });
  await ctx.close();
}
await browser.close(); srv.close();
console.log('snaps saved: docs/snaps/' + day + '-' + name + '-*.png');
