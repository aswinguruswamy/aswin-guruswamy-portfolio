// EXPLAIN: P-CI-2. Every "uses:" line in .github/workflows must name a full commit SHA (40 hex) with the version as a
// comment, for example: actions/checkout@<sha> # v4.4.0. A tag (@v4) can be moved to other code; a SHA cannot.
// Local actions (./path) are allowed. Run: node scripts/check-pins.mjs [folder]
import { readdirSync, readFileSync } from 'node:fs';
const dir = process.argv[2] || '.github/workflows';
const bad = [];
for (const f of readdirSync(dir).filter((f) => /\.ya?ml$/.test(f))) {
  readFileSync(`${dir}/${f}`, 'utf8').split('\n').forEach((line, i) => {
    const m = line.match(/^\s*-?\s*uses:\s*(\S+)/);
    if (!m || m[1].startsWith('./')) return;
    if (!/@[0-9a-f]{40}$/.test(m[1]) || !/#\s*v\d/.test(line)) bad.push(`${f}:${i + 1}: ${m[1]}`);
  });
}
// AGP-15 AC9: the Playwright container image must match @playwright/test in package.json, or the browsers do not match.
const pw = JSON.parse(readFileSync('package.json', 'utf8')).devDependencies?.['@playwright/test'];
for (const f of readdirSync(dir).filter((f) => /\.ya?ml$/.test(f))) {
  for (const m of readFileSync(`${dir}/${f}`, 'utf8').matchAll(/mcr\.microsoft\.com\/playwright:v([\d.]+)/g)) {
    if (m[1] !== pw) bad.push(`${f}: Playwright image v${m[1]} does not match @playwright/test ${pw} in package.json`);
  }
}
bad.forEach((b) => console.log('FAIL pin', b));
console.log(bad.length ? `RESULT: FAIL (${bad.length}: a tag-only action or a Playwright image that does not match package.json)` : 'RESULT: PASS (all actions pinned; Playwright image matches package.json)');
process.exit(bad.length ? 1 : 0);
