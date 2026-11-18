// EXPLAIN: licence check (AGP-15 AC7). It reads package-lock.json and stops CI when a package has a licence
// that is not on the OPEN list, or has no licence. To allow one more package, add it to EXCEPTIONS with a reason.
import fs from 'node:fs';

// Open-source licences (OSI or open-content). A licence text like "(MIT OR CC0-1.0)" or "A AND B" passes when each part is on this list.
const OPEN = new Set(['MIT', 'ISC', '0BSD', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', 'MPL-2.0', 'OFL-1.1', 'CC0-1.0', 'CC-BY-4.0', 'BlueOak-1.0.0', 'LGPL-3.0-or-later']);

// Packages allowed with a licence that is not on the OPEN list. Each one needs a reason.
const EXCEPTIONS = {
  'node_modules/sentry': 'FSL-1.1-Apache-2.0. A dev tool that Lighthouse (the speed test) pulls in. It is not in the built page.',
};

const lock = JSON.parse(fs.readFileSync(new URL('../package-lock.json', import.meta.url)));
const bad = [];
let n = 0;
for (const [path, p] of Object.entries(lock.packages)) {
  if (!path) continue; // the project itself
  n++;
  if (EXCEPTIONS[path]) continue;
  const lic = p.license;
  const parts = lic ? lic.replace(/[()]/g, '').split(/\s+(?:AND|OR)\s+/) : [];
  if (!parts.length || parts.some((x) => !OPEN.has(x.trim()))) bad.push(`${path}: ${lic || 'no licence'}`);
}
bad.forEach((b) => console.log('FAIL licence', b));
console.log(bad.length ? `RESULT: FAIL (${bad.length} of ${n} packages)` : `RESULT: PASS (${n} packages, ${Object.keys(EXCEPTIONS).length} exception)`);
process.exit(bad.length ? 1 : 0);
