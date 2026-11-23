---
# EXPLAIN: one project = one file. The card uses name, line, status, image; the project page needs "page" (all 5 parts).
# status: Live | In progress | Planned. group: pm-tools | apps. order: place in its row. epic: Jira key for the Workshop pie.
name: Monte Carlo Delivery Forecast
line: Delivery dates at 50%, 85% and 95%, and the chance to finish by a charter date
status: Live
group: pm-tools
order: 1
epic: AGP-44
image: monte-carlo-forecast-v2.webp
version: v2.0.0
links:
  - label: Live demo
    href: https://mcf-forecast.streamlit.app
  - label: Repository
    href: https://github.com/aswinguruswamy/monte-carlo-delivery-forecast
page:
  problem: "A team asks \"when will the next 40 items be done?\" and gets one velocity date that sounds certain but often slips. A sponsor also asks: \"will we make the charter date?\""
  approach: "The tool runs 10,000 simulations on the team's past throughput and gives dates at 50%, 85% and 95% confidence, next to the velocity date. Version 2 adds the chance to finish by a charter date, from the same runs, and a warning when the history is thin. Back-tests on real open-source projects compare the methods."
  role: "PM, sponsor and product owner: scope, decisions, acceptance and release. Claude built and tested the code."
  stack: "Python, Streamlit, pytest, GitHub Actions on Python 3.11 to 3.14, Claude API (optional plain-words explanation, with its model and prompt version shown)."
  outcome: "Version 2.0.0 is live with a keyless demo. Both back-tests are shown: 39 projects met the 75% target, 29 projects missed it (69%). The AI check passed 30 of 30. The Status Report Generator uses its forecast."
---
