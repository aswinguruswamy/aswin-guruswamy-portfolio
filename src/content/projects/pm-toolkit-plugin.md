---
# EXPLAIN: one project = one file. The card uses name, line, status, image; the project page needs "page" (all 5 parts).
# status: Live | In progress | Planned. group: pm-tools | apps. order: place in its row. epic: Jira key for the Workshop pie.
name: pm-toolkit plugin
line: Runs the PM life cycle in Claude
status: Live
group: pm-tools
order: 4
epic: AGP-47
image: pm-toolkit-readme.webp
# D58 v0: no public plugin repository yet; the card links the PM Benchmark repository, which the plugin is built on.
# Change this link when the pm-toolkit repository is public.
links:
  - label: PM Benchmark repository (the plugin is built on it)
    href: https://github.com/aswinguruswamy/pm-benchmark-software-projects
page:
  problem: "A PM can miss steps between the phases of a project, and each new chat with an AI starts with no process."
  approach: "A Claude plugin with 15 skills. The pm-lifecycle hub finds the project phase and sends each request to the right skill: charter and plan, RAID log, status report, change request, quality gate, release readiness, post-mortem and more. Each skill maps to items of the PM Benchmark."
  role: "Author and owner. Claude builds the skills to Aswin's rules and grades them."
  stack: "Claude Code plugin. Skills in Markdown. Built on the PM Benchmark."
  outcome: "Used to run the Monte Carlo Delivery Forecast and this portfolio page. A public repository is planned."
---
