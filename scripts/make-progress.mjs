// EXPLAIN: turns the Jira snapshot (data/jira-snapshot.json) into public/data/progress.json, the file the Workshop reads.
// All totals are computed here, by code, never by hand (lesson AL3).
// Contract of progress.json (AGP-37):
//   takenAt        ISO time of the Jira snapshot (the Workshop shows it; older than 24 h = "old data", NFR-08)
//   epics[key]     { title, done, total }  story points; total 0 = "–" on the pie (D35)
//   groups[name]   { done, total }          sums for the containers (REQ-16: a container pie = sum of its epics)
//   page           { done, total }          the whole page build (E1 to E13)
// Usage: node scripts/make-progress.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const snap = JSON.parse(readFileSync(new URL('../data/jira-snapshot.json', import.meta.url), 'utf8'));

// Which epics sum into which container (REQ-16). Card epics: 2B, 18 Nov 2026. The Workshop card uses E9 (AGP-10).
export const GROUPS = {
  header: ['AGP-3'],
  experience: ['AGP-4'],
  skills: ['AGP-7'],
  'pm-tools': ['AGP-44', 'AGP-45', 'AGP-46', 'AGP-47', 'AGP-48', 'AGP-49', 'AGP-10'],
  apps: ['AGP-51', 'AGP-52', 'AGP-53', 'AGP-54'],
};
const BUILD_EPICS = ['AGP-1', 'AGP-3', 'AGP-4', 'AGP-5', 'AGP-6', 'AGP-7', 'AGP-8', 'AGP-9', 'AGP-10', 'AGP-11', 'AGP-12', 'AGP-13', 'AGP-14'];

const epics = {};
// AGP-37 AC3 (D29 v0): the public file has no epic codes ("E1 Foundation" -> "Foundation") and never "Build Overlay".
const clean = (t) => String(t).replace(/^E\d+\s+/, '');
for (const [key, title] of Object.entries(snap.epics)) {
  const t = clean(title);
  if (/build overlay/i.test(t)) throw new Error(`epic ${key}: the title has the team word "Build Overlay"`);
  epics[key] = { title: t, done: 0, total: 0 };
}
for (const s of snap.stories) {
  const e = epics[s.epic];
  if (!e) throw new Error(`story ${s.key} has an unknown epic ${s.epic}`);
  if (!Number.isInteger(s.points) || s.points < 0) throw new Error(`story ${s.key} has no valid points`);
  e.total += s.points;
  if (s.status === 'Done') e.done += s.points;
}
const sum = (keys) => keys.reduce((a, k) => ({ done: a.done + epics[k].done, total: a.total + epics[k].total }), { done: 0, total: 0 });
const groups = Object.fromEntries(Object.entries(GROUPS).map(([g, keys]) => [g, sum(keys)]));
const page = sum(BUILD_EPICS);

const out = { takenAt: snap.takenAt, epics, groups, page };
mkdirSync(new URL('../public/data/', import.meta.url), { recursive: true });
writeFileSync(new URL('../public/data/progress.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log(`progress.json: ${Object.keys(epics).length} epics, page ${page.done}/${page.total}`);
