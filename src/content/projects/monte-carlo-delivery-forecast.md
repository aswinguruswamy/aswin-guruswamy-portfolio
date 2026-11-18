---
# EXPLAIN: one project = one file. The card uses name, line, status, image; the project page needs "page" (all 5 parts).
# status: Live | In progress | Planned. group: pm-tools | apps. order: place in its row. epic: Jira key for the Workshop pie.
name: Monte Carlo Delivery Forecast
line: Delivery dates at 50%, 85% and 95% confidence
status: Live
group: pm-tools
order: 1
epic: AGP-44
image: monte-carlo-forecast.webp
version: v1.2.0
links:
  - label: Live demo
    href: https://mcf-forecast.streamlit.app
  - label: Repository
    href: https://github.com/aswinguruswamy/monte-carlo-delivery-forecast
page:
  problem: A team asks "when will the next 40 items be done?" and gets one velocity date that sounds certain but often slips.
  approach: The tool runs thousands of simulations on the team's past throughput and gives dates at 50%, 85% and 95% confidence, next to the usual velocity date. A back-test on real open-source projects compares the two methods.
  role: "PM, sponsor and product owner: scope, decisions, acceptance and release. Claude built and tested the code."
  stack: Python, Streamlit, pytest, GitHub Actions, Claude API (optional plain-words explanation).
  outcome: Version 1.2.0 is live with a public demo, a Jira CSV import, and back-tests on 29 and 39 real projects.
---
