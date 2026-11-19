// EXPLAIN: daily outside check (P-RB-1 links, P-RB-2 demos, P-RB-5 versions). It reads the content files and checks:
//   1 every outside link opens (status under 400; LinkedIn answers 999 to robots, so 999 is "blocked", not broken)
//   2 every Streamlit demo loads in a real browser; a sleeping demo is woken up and must load within 3 minutes
//   3 each card version equals the latest version tag of its GitHub repository
// On a failure in the daily run it opens (or comments on) 1 GitHub issue with the label "outside-check".
// Use: node scripts/check-outside.mjs            (real check)
//      node scripts/check-outside.mjs --self-test  (plants a broken link and a wrong version; both must fail)
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';

const selfTest = process.argv.includes('--self-test');

// ---- read the content files (simple line parse; the schema in src/content.config.ts already checks the format) ----
const cards = [];
for (const f of fs.readdirSync('src/content/projects').filter((f) => f.endsWith('.md'))) {
  const s = fs.readFileSync(`src/content/projects/${f}`, 'utf8');
  const fm = s.split(/^---\s*$/m)[1] || '';
  cards.push({
    file: f, status: (fm.match(/^status:\s*(.+)$/m) || [])[1]?.trim(), version: (fm.match(/^version:\s*(\S+)/m) || [])[1],
    links: [...fm.matchAll(/^\s+href:\s*(\S+)/gm)].map((m) => m[1]),
  });
}
const prof = fs.readFileSync('src/content/profile/profile.md', 'utf8');
const profileLinks = [...prof.matchAll(/^(linkedin|github):\s*(\S+)/gm)].map((m) => m[2]);

let links = [...new Set([...profileLinks, ...cards.flatMap((c) => c.links)])];
let versions = cards.filter((c) => c.version).map((c) => {
  const repo = c.links.map((l) => l.match(/^https:\/\/github\.com\/([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/)).find(Boolean);
  return { file: c.file, version: c.version, repo: repo && repo[1] };
});
if (selfTest) {
  // planted mistakes: a repository that does not exist, and a card version that is not the latest tag
  links = ['https://github.com/aswinguruswamy/no-such-repo-p-rb-1-self-test', ...links.filter((l) => /github\.com/.test(l)).slice(0, 1)];
  versions = [{ file: 'self-test.md', version: 'v0.0.1', repo: 'aswinguruswamy/monte-carlo-delivery-forecast' }];
}

const fails = [], notes = [];
const isDemo = (u) => /\.streamlit\.app/.test(u);

// ---- 1 links ----
async function open(u) {
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'Mozilla/5.0 (portfolio link check)' } });
      return r.status;
    } catch (e) { if (i === 1) return 'error: ' + (e.cause?.code || e.name); }
  }
}
for (const u of links.filter((u) => !isDemo(u))) {
  const st = await open(u);
  // LinkedIn answers robots with 999 or 429; that is a block, not a broken link.
  if (st === 999 || (st === 429 && /linkedin\.com/.test(u))) notes.push(`blocked to robots (${st}, not checked): ${u}`);
  else if (typeof st !== 'number' || st >= 400) fails.push(`link does not open (${st}): ${u}`);
}

// ---- 2 demos ----
const demos = selfTest ? [] : links.filter(isDemo);
if (demos.length) {
  const browser = await chromium.launch();
  for (const u of demos) {
    const pg = await browser.newPage();
    try {
      await pg.goto(u, { waitUntil: 'domcontentloaded', timeout: 60000 });
      const appLoaded = async (ms) => {
        const end = Date.now() + ms;
        while (Date.now() < end) {
          for (const fr of pg.frames()) { try { if (await fr.$('[data-testid="stApp"], .stApp')) return true; } catch {} }
          await pg.waitForTimeout(2000);
        }
        return false;
      };
      // Streamlit shows its pages inside frames, so look in every frame.
      const inFrames = async (fn) => { for (const fr of pg.frames()) { try { const r = await fn(fr); if (r) return r; } catch {} } return null; };
      await pg.waitForTimeout(8000);
      const asleep = !!(await inFrames(async (fr) => (await fr.getByText(/gone to sleep|app is asleep|zzz/i).count()) > 0));
      if (asleep) {
        notes.push(`demo was asleep and was woken up: ${u}`);
        await inFrames(async (fr) => { const b = fr.getByRole('button', { name: /back up|wake/i }).first(); if (await b.count()) { await b.click(); return true; } });
      }
      if (!(await appLoaded(asleep ? 180000 : 90000))) {
        fails.push(`demo does not load${asleep ? ' (after wake-up)' : ''}: ${u}`);
        // evidence for the issue: what the page shows (frames, title, first text) and a screenshot
        const name = u.replace(/^https?:\/\//, '').replace(/[^\w.-]+/g, '_');
        fs.mkdirSync('outside-evidence', { recursive: true });
        await pg.screenshot({ path: `outside-evidence/${name}.png`, fullPage: true }).catch(() => {});
        const info = [];
        for (const fr of pg.frames()) info.push(`${fr.url().slice(0, 80)} :: ${((await fr.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 160)}`);
        notes.push(`evidence for ${u}: title "${await pg.title().catch(() => '')}"; frames: ${info.join(' | ')}`);
      }
      const bad = await pg.getByText(/oh no\.|error running app/i).first().isVisible().catch(() => false);
      if (bad) fails.push(`demo shows an error page: ${u}`);
    } catch (e) { fails.push(`demo does not open (${e.name}): ${u}`); }
    await pg.close();
  }
  await browser.close();
}

// ---- 3 versions ----
const semver = (t) => t.replace(/^v/, '').split('.').map(Number);
for (const v of versions) {
  if (!v.repo) { fails.push(`${v.file}: version ${v.version} but no GitHub repository link`); continue; }
  let tags = [];
  try { tags = execFileSync('git', ['ls-remote', '--tags', '--refs', `https://github.com/${v.repo}.git`], { encoding: 'utf8', timeout: 30000 }).split('\n').map((l) => l.split('refs/tags/')[1]).filter((t) => /^v?\d+\.\d+\.\d+$/.test(t || '')); }
  catch { fails.push(`${v.file}: cannot read the tags of ${v.repo}`); continue; }
  if (!tags.length) { fails.push(`${v.file}: ${v.repo} has no version tag`); continue; }
  const latest = tags.sort((a, b) => { const x = semver(a), y = semver(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; }).pop();
  if (semver(latest).join('.') !== semver(v.version).join('.')) fails.push(`${v.file}: card says ${v.version}, latest tag of ${v.repo} is ${latest}`);
}

// ---- report ----
notes.forEach((n) => console.log('NOTE', n));
fails.forEach((f) => console.log('FAIL', f));
if (selfTest) {
  const ok = fails.some((f) => f.includes('no-such-repo')) && fails.some((f) => f.includes('card says v0.0.1'));
  console.log(ok ? `RESULT: PASS (self-test: the planted broken link and wrong version both failed)` : 'RESULT: FAIL (self-test: a planted mistake was not found)');
  process.exit(ok ? 0 : 1);
}
console.log(fails.length ? `RESULT: FAIL (${fails.length})` : `RESULT: PASS (${links.length} links, ${demos.length} demos, ${versions.length} versions)`);

if (fails.length && process.env.OPEN_ISSUE === '1' && process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY) {
  const api = (p, o = {}) => fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${p}`, { ...o, headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'content-type': 'application/json' } }).then((r) => r.json());
  const text = `Daily outside check failed on ${new Date().toISOString().slice(0, 10)}:\n\n${fails.map((f) => `- ${f}`).join('\n')}${notes.length ? `\n\nNotes:\n${notes.map((n) => `- ${n}`).join('\n')}` : ''}\n\nRun: ${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
  const open = await api('/issues?state=open&labels=outside-check');
  if (Array.isArray(open) && open.length) await api(`/issues/${open[0].number}/comments`, { method: 'POST', body: JSON.stringify({ body: text }) });
  else await api('/issues', { method: 'POST', body: JSON.stringify({ title: 'Outside check failed (links, demos or versions)', body: text, labels: ['outside-check'] }) });
}
process.exit(fails.length ? 1 : 0);
