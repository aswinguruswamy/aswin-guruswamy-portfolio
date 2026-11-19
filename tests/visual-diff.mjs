// EXPLAIN: P-RB-9 visual diff for each pull request. It serves 2 builds (the PR in dist/, main in a second folder),
// takes the same screenshots of both, and compares them pixel by pixel. A changed screenshot must be named in the
// PR description, on a line that starts "Visual changes:" (for example "Visual changes: home-390-light, home-390-dark").
// So a change nobody meant (a hidden layout break) stops the merge; a planned change passes once it is named.
// Use: node tests/visual-diff.mjs <main-dist-folder> [out-folder]
//   env PR_BODY: the PR description (CI sets it). With no PR_BODY the script only reports.
import fs from 'node:fs';
import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { start, URL_BASE } from './server.mjs';

const baseDist = process.argv[2];
const out = process.argv[3] || 'visual-diff';
if (!baseDist || !fs.existsSync(baseDist)) { console.log('usage: node tests/visual-diff.mjs <main-dist-folder> [out]'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });

// The shots: 3 pages x 3 widths x 2 themes, plus the phone menu and the Workshop view.
const pages = [['home', ''], ['mcf', 'projects/monte-carlo-delivery-forecast/'], ['raid', 'projects/raid-log-extractor/']];
const shots = [];
for (const [p, path] of pages) for (const w of [390, 768, 1440]) for (const t of ['light', 'dark']) shots.push({ name: `${p}-${w}-${t}`, path, w, t });
shots.push({ name: 'home-390-light-menu', path: '', w: 390, t: 'light', menu: true });
shots.push({ name: 'home-1440-light-workshop', path: '?workshop', w: 1440, t: 'light', workshop: true });

// A shot counts as changed above 4 changed pixels. 2 builds of the same code give 0 (tested 19 Nov). A % limit missed a small
// change on the 1440 px page, and a 50-pixel limit missed a 20-pixel ↗ mark (D58 v0), so the limit stays just above 0.
const MIN_PIXELS = 4;
const prSrv = await start(4601, 'dist'); const baseSrv = await start(4602, baseDist);
const browser = await chromium.launch();

async function snap(port, s) {
  const ctx = await browser.newContext({ viewport: { width: s.w, height: 900 }, colorScheme: s.t, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const pg = await ctx.newPage();
  // The Workshop strip shows the data time; fix the clock so both builds show the same text.
  await pg.addInitScript(() => { const T = Date.parse('2026-11-19T12:00:00Z'); Date.now = () => T; });
  await pg.goto(URL_BASE(port) + s.path); await pg.evaluate(() => document.fonts.ready);
  if (s.menu) { await pg.click('.menu-btn'); }
  await pg.waitForTimeout(s.workshop ? 700 : 250);
  const buf = await pg.screenshot({ fullPage: !s.menu, animations: 'disabled', caret: 'hide' });
  await ctx.close();
  return PNG.sync.read(buf);
}

// Pads the smaller image with white, so 2 pages of different height can be compared (the height change itself counts).
function pad(img, w, h) {
  if (img.width === w && img.height === h) return img;
  const o = new PNG({ width: w, height: h }); o.data.fill(255);
  PNG.bitblt(img, o, 0, 0, img.width, img.height, 0, 0); return o;
}

const rows = [];
for (const s of shots) {
  const a = await snap(4602, s), b = await snap(4601, s);
  const w = Math.max(a.width, b.width), h = Math.max(a.height, b.height);
  const A = pad(a, w, h), B = pad(b, w, h), diff = new PNG({ width: w, height: h });
  const n = pixelmatch(A.data, B.data, diff.data, w, h, { threshold: 0.1 });
  const ratio = n / (w * h);
  const changed = n > MIN_PIXELS || a.height !== b.height;
  if (changed) {
    // main | PR | diff side by side, for the reviewer
    const side = new PNG({ width: w * 3, height: h });
    PNG.bitblt(A, side, 0, 0, w, h, 0, 0); PNG.bitblt(B, side, 0, 0, w, h, w, 0); PNG.bitblt(diff, side, 0, 0, w, h, w * 2, 0);
    fs.writeFileSync(`${out}/${s.name}.png`, PNG.sync.write(side));
  }
  rows.push({ name: s.name, px: n, pct: (ratio * 100).toFixed(3), heights: `${a.height}→${b.height}`, changed });
}
await browser.close(); prSrv.close(); baseSrv.close();

const changed = rows.filter((r) => r.changed).map((r) => r.name);
const body = process.env.PR_BODY;
const line = (body || '').split(/\r?\n/).find((l) => /^\s*Visual changes:/i.test(l)) || '';
const named = new Set(line.replace(/^\s*Visual changes:/i, '').split(/[\s,]+/).filter(Boolean));
const unnamed = changed.filter((n) => !named.has(n) && !named.has('all'));

const md = ['## Visual diff (PR vs main)', '', '| shot | changed pixels | page height | status |', '|---|---|---|---|',
  ...rows.map((r) => `| ${r.name} | ${r.px} (${r.pct}%) | ${r.heights} | ${!r.changed ? 'same' : named.has(r.name) || named.has('all') ? 'changed, named' : '**changed, NOT named**'} |`),
  '', changed.length ? `Changed: ${changed.join(', ')}. Side-by-side images (main | PR | diff) are in the "visual-diff" artifact.` : 'No visual change.'];
fs.writeFileSync(`${out}/report.md`, md.join('\n') + '\n');
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md.join('\n') + '\n');
console.log(md.join('\n'));
if (body === undefined) { console.log('RESULT: REPORT ONLY (no PR_BODY)'); process.exit(0); }
if (unnamed.length) {
  console.log(`\nFAIL visual: ${unnamed.length} changed shot(s) not named in the PR description: ${unnamed.join(', ')}`);
  console.log('Look at the images. If the change is meant, add this line to the PR description:');
  console.log(`Visual changes: ${changed.join(', ')}`);
  console.log(`RESULT: FAIL (${unnamed.length})`); process.exit(1);
}
console.log(`RESULT: PASS (${changed.length} changed, all named)`);
