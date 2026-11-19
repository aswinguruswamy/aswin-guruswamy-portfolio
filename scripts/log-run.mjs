// EXPLAIN: adds 1 line to logs/run-log.md for each daily Workshop run (AGP-37 v1 AC7, NFR-11 v0).
// The line has the UTC time, the result, the number of epics and stories, the page points and a note.
// All numbers come from the files, never by hand (lesson AL3).
// Usage: node scripts/log-run.mjs <ok|failed> [note]
import { readFileSync, appendFileSync } from 'node:fs';

const [result = '', ...rest] = process.argv.slice(2);
if (!['ok', 'failed'].includes(result)) { console.error('Usage: node scripts/log-run.mjs <ok|failed> [note]'); process.exit(2); }
const note = (rest.join(' ').trim() || '-').replace(/\|/g, '/').replace(/\s+/g, ' ');
const read = (p) => { try { return JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8')); } catch { return null; } };
const prog = read('../public/data/progress.json');
const snap = read('../data/jira-snapshot.json');
const time = new Date().toISOString().slice(0, 16).replace('T', ' ');
const epics = prog ? Object.keys(prog.epics).length : '-';
const stories = snap ? snap.stories.length : '-';
const page = prog ? `${prog.page.done}/${prog.page.total}` : '-';
const line = `| ${time} | ${result} | ${epics} | ${stories} | ${page} | ${note} |\n`;
appendFileSync(new URL('../logs/run-log.md', import.meta.url), line);
process.stdout.write(line);
