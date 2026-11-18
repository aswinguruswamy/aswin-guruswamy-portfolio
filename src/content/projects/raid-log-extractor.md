---
# EXPLAIN: one project = one file. The card uses name, line, status, image; the project page needs "page" (all 5 parts).
# status: Live | In progress | Planned. group: pm-tools | apps. order: place in its row. epic: Jira key for the Workshop pie.
name: RAID Log Extractor
line: Risks, assumptions, issues and dependencies from notes
status: Live
group: pm-tools
order: 2
epic: AGP-45
image: raid-log-extractor.webp
version: v1.0.0
links:
  - label: Live demo
    href: https://raid-log-extractor.streamlit.app/
  - label: Repository
    href: https://github.com/aswinguruswamy/raid-log-extractor
page:
  problem: After a call, a PM writes the RAID log by hand. It takes minutes, items get lost, and owners and dates get guessed.
  approach: Claude reads the call notes and finds risks, assumptions, issues, dependencies, actions and decisions. Each item has a source quote that the code checks word for word. When the notes give no owner or date, the tool writes "Not stated" and does not guess.
  role: PM, sponsor and product owner. Claude built and tested the code.
  stack: Python, Streamlit, Claude API, pytest, GitHub Actions.
  outcome: "Live demo with no sign-in. On 10 sample calls: 100% recall, 100% precision, 0 invented owners or dates. A log takes about 27 seconds, not 6 to 8 minutes."
---
