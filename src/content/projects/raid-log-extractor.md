---
# EXPLAIN: one project = one file. The card uses name, line, status, image; the project page needs "page" (all 5 parts).
# status: Live | In progress | Planned. group: pm-tools | apps. order: place in its row. epic: Jira key for the Workshop pie.
name: RAID Log Extractor
line: Risks, assumptions, issues and dependencies from notes
status: Live
group: pm-tools
order: 2
epic: AGP-45
image: raid-log-extractor-v2.webp
version: v2.0.0
links:
  - label: Live demo
    href: https://raid-log-extractor.streamlit.app/
  - label: Repository
    href: https://github.com/aswinguruswamy/raid-log-extractor
page:
  problem: "After a call, the PM writes the RAID log by hand. Owners and dates get lost, and an AI tool can invent an owner or a date that nobody agreed."
  approach: "Claude reads the call notes and lists the risks, assumptions, issues, dependencies, actions and decisions, each with a quote. Version 2 adds owner states (confirmed, tentative, declined), dates converted by code from the meeting date, code checks before display, and a \"Needs attention\" list."
  role: "PM, sponsor and product owner: scope, the hard test cases and the release gate. Claude built and tested the code."
  stack: "Python, Streamlit, Claude API, pytest, GitHub Actions, Markdown export."
  outcome: "Version 2.0.0 passed its release gate on 28 unseen calls (5 runs each): 95% recall, 99% precision, 0 invented owners and 0 invented dates. A keyless demo shows saved results."
---
