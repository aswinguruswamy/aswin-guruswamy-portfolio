---
# EXPLAIN: one project = one file. The card uses name, line, status, image; the project page needs "page" (all 5 parts).
# status: Live | In progress | Planned. group: pm-tools | apps. order: place in its row. epic: Jira key for the Workshop pie.
name: Status Report Generator
line: Live status table for every team, from Jira
status: Live
group: pm-tools
order: 3
epic: AGP-46
image: status-report-generator-v2.webp
version: v2.0.0
links:
  - label: Live demo
    href: https://srg-app.streamlit.app
  - label: Repository
    href: https://github.com/aswinguruswamy/status-report-generator
page:
  problem: "A PM with several teams must answer \"how are the teams?\" now, not on Friday. Each team's status lives in a different Jira project, and 2 PMs can give the same team different colours."
  approach: "One table for every team: a colour from fixed rules with the reason, done and total, tickets with no due date, closed and opened in 14 days, and the 85% finish date from the Monte Carlo forecast. A Markdown report is made on demand. Version 2 has no AI text: every number comes from Jira and code."
  role: "PM, sponsor and product owner: the change of direction from a weekly AI report to a live table, scope and release. Claude built and tested the code."
  stack: "Python, Streamlit, Jira Cloud API (read only), the Monte Carlo forecast package, pytest, GitHub Actions."
  outcome: "Version 2.0.0 is live with a public demo on made-up data. Known limits: tested on team-managed Jira projects only; 10 real teams in under 15 seconds is not yet checked by hand."
---
