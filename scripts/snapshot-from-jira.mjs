// EXPLAIN: step 1 of the daily Workshop task (S24, AGP-37). It turns a raw Jira search result into data/jira-snapshot.json.
// Input: a JSON file with the issues of project AGP, as the Atlassian connector returns them for the JQL
//   project = AGP AND issuetype = Story   with the fields summary, status, parent, labels, customfield_10016, statuscategorychangedate.
// Each issue needs: key, fields.summary, fields.status.name, fields.parent.key, story points, and labels.
// The epic titles stay as in the current snapshot (neutral titles only, REQ-17, NFR-12). An unknown epic stops the run.
// Usage: node scripts/snapshot-from-jira.mjs <raw.json> [--taken-at=ISO]
import { readFileSync, writeFileSync } from 'node:fs';

const [file] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!file) { console.error('usage: node scripts/snapshot-from-jira.mjs <raw.json> [--taken-at=ISO]'); process.exit(2); }
const takenArg = process.argv.find((a) => a.startsWith('--taken-at='));
const raw = JSON.parse(readFileSync(file, 'utf8'));
const issues = raw.issues || raw.data?.issues || raw;
const snapPath = new URL('../data/jira-snapshot.json', import.meta.url);
const old = JSON.parse(readFileSync(snapPath, 'utf8'));

const points = (f) => {
  const v = f.customfield_10016 ?? f.customFields?.['Story point estimate']?.value;
  if (!Number.isInteger(v)) return null;
  return v;
};
const stories = [];
const errors = [];
for (const i of issues) {
  const f = i.fields || {};
  const epic = f.parent?.key;
  const p = points(f);
  if (!epic || !old.epics[epic]) { errors.push(`${i.key}: unknown epic ${epic}`); continue; }
  if (p === null) { errors.push(`${i.key}: no story points`); continue; }
  const status = f.status?.name;
  const labels = f.labels || [];
  const done = f.status?.statusCategory?.name === 'Done' || status === 'Done';
  stories.push({
    key: i.key, epic, title: String(f.summary || '').slice(0, 90), status: done ? 'Done' : status,
    points: p, doneAt: done && f.statuscategorychangedate ? f.statuscategorychangedate.slice(0, 10) : null,
    kind: labels.includes('card-story') ? 'card' : 'build', labels,
  });
}
if (errors.length) { console.error('snapshot NOT written:\n  ' + errors.join('\n  ')); process.exit(1); }
if (stories.length < 10) { console.error(`snapshot NOT written: only ${stories.length} stories (a broken search?)`); process.exit(1); }
stories.sort((a, b) => Number(a.key.split('-')[1]) - Number(b.key.split('-')[1]));
const out = { takenAt: takenArg ? takenArg.slice(11) : new Date().toISOString(), source: 'Jira project AGP', epics: old.epics, stories };
writeFileSync(snapPath, JSON.stringify(out, null, 1) + '\n');
console.log(`jira-snapshot.json: ${stories.length} stories`);
