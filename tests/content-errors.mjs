// EXPLAIN: proves that a wrong edit in a content file stops the build with a clear message (NFR-09 v1).
// It plants 1 typical mistake at a time, runs the build, checks that it FAILS and that the message names the problem,
// then puts the file back. Run: npm run test:content
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const cases = [
  ['src/content/projects/selfbet.md', (s) => s.replace('status: Planned', 'status: Done'), /status/],
  ['src/content/projects/selfbet.md', (s) => s.replace('epic: AGP-52', 'epic: SB-1'), /Jira key/],
  ['src/content/projects/raid-log-extractor.md', (s) => s.replace('image: raid-log-extractor.webp', 'image: no-such-file.webp'), /no-such-file\.webp/],
  ['src/content/projects/raid-log-extractor.md', (s) => s.replace(/\n  stack: .*\n/, '\n'), /stack/],
  ['src/content/projects/selfbet.md', (s) => s.replace('order: 2', 'order: 1'), /order 1 is used twice/],
  ['src/content/projects/selfbet.md', (s) => s.replace('name: SelfBet', 'name: SelfBet\ncolour: red'), /colour/],
  ['src/content/profile/profile.md', (s) => s.replace('hiddenBadges:\n  - MS Computer Engineering (USA)', 'hiddenBadges:\n  - MBA'), /hidden badge "MBA"/],
  ['src/content/experience/amazon.md', (s) => s.replace(/---\n\n[\s\S]*$/, '---\n'), /amazon\.md: write the text/],
];

let fails = 0;
for (const [file, edit, want] of cases) {
  const orig = readFileSync(file, 'utf8');
  const changed = edit(orig);
  if (changed === orig) { console.log(`FAIL setup: the edit did not change ${file} (${want})`); fails++; continue; }
  writeFileSync(file, changed);
  try {
    const r = spawnSync('npx', ['astro', 'build'], { encoding: 'utf8', env: { ...process.env, FORCE_COLOR: '0' } });
    const out = r.stdout + r.stderr;
    if (r.status === 0) { console.log(`FAIL ${file}: the build passed with a wrong edit (${want})`); fails++; }
    else if (!want.test(out)) { console.log(`FAIL ${file}: the build failed, but the message does not name the problem (${want})`); fails++; }
    else console.log(`ok   ${file}: stopped, message matches ${want}`);
  } finally {
    writeFileSync(file, orig);
  }
}
console.log(fails ? `RESULT: FAIL (${fails})` : `RESULT: PASS (${cases.length} wrong edits stopped)`);
process.exit(fails ? 1 : 0);
