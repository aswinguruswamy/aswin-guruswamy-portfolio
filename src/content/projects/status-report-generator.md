---
# EXPLAIN: one project = one file. The card uses name, line, status, image; the project page needs "page" (all 5 parts).
# status: Live | In progress | Planned. group: pm-tools | apps. order: place in its row. epic: Jira key for the Workshop pie.
name: Weekly Status Report Generator
line: Weekly status with RAG from Jira and GitHub
status: Live
group: pm-tools
order: 3
epic: AGP-46
image: status-report-generator.webp
version: v1.0.0
links:
  - label: Sample report
    href: https://github.com/aswinguruswamy/status-report-generator/blob/main/examples/DEMO-2026-W43.md
  - label: Repository
    href: https://github.com/aswinguruswamy/status-report-generator
page:
  problem: Each week a PM reads Jira, counts the work, picks a status colour and writes a summary. It takes time, and 2 PMs can give the same week different colours.
  approach: Fixed rules set the RAG status, so the same week always gets the same colour. Claude writes only a short summary of the facts, and the tool removes any AI text that breaks a rule.
  role: PM, sponsor and product owner. Claude built and tested the code.
  stack: Python, Jira Cloud API (read only), Claude API, Markdown and HTML output.
  outcome: A full weekly report in less than 2 minutes, also when the AI is not available.
---
