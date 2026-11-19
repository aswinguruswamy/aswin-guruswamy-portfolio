---
# EXPLAIN: one project = one file. The card uses name, line, status, image; the project page needs "page" (all 5 parts).
# status: Live | In progress | Planned. group: pm-tools | apps. order: place in its row. epic: Jira key for the Workshop pie.
name: "Workshop: Build Progress"
line: Shows the build progress on top of a web page
status: Live
group: pm-tools
order: 7
epic: AGP-10
image: workshop-build-progress.webp
page:
  problem: "A sponsor cannot see where a build stands without a meeting or a Jira login."
  approach: "A switch on the page shows a progress pie on each card and section. The numbers come from Jira each day, through a scheduled task and a pull request, with no token on the page."
  role: "PM and owner. Claude built it."
  stack: "Plain JavaScript on this Astro page. Jira data in progress.json, refreshed daily by a scheduled task."
  outcome: "Live on this page. Press \"View Build Progress\" at the top."
---
