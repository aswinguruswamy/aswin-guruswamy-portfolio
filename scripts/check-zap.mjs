// EXPLAIN: AGP-43 (benchmark item 86). Reads the ZAP baseline report: 0 high findings, or the check fails.
// Each medium finding must be in ACCEPTED with a reason, or the check fails. Low and info findings are listed only.
// Usage: node scripts/check-zap.mjs report_json.json
import { readFileSync, appendFileSync } from 'node:fs';

// Medium findings that cannot be fixed on GitHub Pages, with the reason (recorded, AGP-43).
const ACCEPTED = {
  10038: 'CSP header: GitHub Pages cannot set response headers. The page sets a strict CSP in a meta tag (NFR-05).',
  10020: 'Anti-clickjacking header: GitHub Pages cannot set X-Frame-Options, and frame-ancestors does not work in a meta CSP. The page has no forms and no sign-in.',
};
const r = JSON.parse(readFileSync(process.argv[2] || 'report_json.json', 'utf8'));
const alerts = (r.site || []).flatMap((s) => s.alerts || []);
const lines = []; let bad = 0;
for (const a of alerts) {
  const risk = Number(a.riskcode); const name = `${a.pluginid} ${a.name} (${a.count || a.instances?.length || 0})`;
  if (risk >= 3) { bad++; lines.push(`FAIL high: ${name}`); }
  else if (risk === 2) {
    if (ACCEPTED[a.pluginid]) lines.push(`ok   medium, recorded: ${name}: ${ACCEPTED[a.pluginid]}`);
    else { bad++; lines.push(`FAIL medium with no reason: ${name}`); }
  } else lines.push(`note ${risk === 1 ? 'low' : 'info'}: ${name}`);
}
lines.push(bad ? `RESULT: FAIL (${bad})` : `RESULT: PASS (0 high; ${alerts.filter((a) => a.riskcode === '2').length} medium, all recorded; ${alerts.length} findings in all)`);
console.log(lines.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, '## ZAP baseline\n\n```\n' + lines.join('\n') + '\n```\n');
process.exit(bad ? 1 : 0);
