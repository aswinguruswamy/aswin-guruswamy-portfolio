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
bad.forEach((b) => console.log('FAIL pin', b));
console.log(bad.length ? `RESULT: FAIL (${bad.length} not pinned to a SHA with a version comment)` : 'RESULT: PASS (all actions pinned)');
process.exit(bad.length ? 1 : 0);
