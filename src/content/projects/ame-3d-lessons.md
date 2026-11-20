---
# EXPLAIN: one project = one file. The card uses name, line, status, image; the project page needs "page" (all 5 parts).
# status: Live | In progress | Planned. group: pm-tools | apps. order: place in its row. epic: Jira key for the Workshop pie.
# D11 v1: this card replaces the Yaw Damper Simulation card (its Dutch roll content is Lesson 2). Epic AGP-53 is reused.
name: AME 3D Lessons
line: Interactive 3D flight-physics lessons for AME students
status: Live
group: apps
order: 1
epic: AGP-53
image: ame-3d-lessons.webp
links:
  - label: Live demo
    href: https://aswinguruswamy.github.io/ame-3d-lessons/
  - label: Repository
    href: https://github.com/aswinguruswamy/ame-3d-lessons
page:
  problem: Textbooks show the Magnus effect and Dutch roll as flat diagrams. Aircraft maintenance students cannot turn the model, change the inputs, or see the forces change.
  approach: "2 step-by-step 3D lessons: the Magnus effect, and Dutch roll with the yaw damper on an A320-class model. The student turns the model, moves sliders and reads live numbers. Every constant has a stated source, and automated tests check the physics before each deploy."
  role: "PM, sponsor and product owner: scope, decisions and acceptance. Claude built and tested the code."
  stack: TypeScript, Three.js, Vite, Vitest, GitHub Actions, GitHub Pages.
  outcome: "2 lessons are live with no sign-in, on desktop and phone. 20 physics tests pass in CI. In the default case, the yaw damper takes the Dutch roll damping ratio from 0.047 to 0.319."
---
