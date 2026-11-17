<!-- EXPLAIN: this whole file is a learning guide. It is removed at gate G10 (PM Plan › Explain every action). -->

# Code guide — what we do, why, and where

This guide explains each action of the portfolio page project in plain words.
Aswin reads it to follow the build and to explain the work to other people.

**Rules for this guide** (PM Plan › Explain every action, decided 11 Nov 2026)

- Each action gets 1 entry: **what** was done, **why**, and **where** to find it.
- Each entry has the tag `EXPLAIN`. The Jira label for the same work is `explain`.
- Claude adds the entries of each working day before the session ends (lesson AL13).
- At gate G10, all `EXPLAIN` entries and this file are removed from the repository.

**Where the records are**

| Record | Where |
|---|---|
| Plans, decisions, risks, lessons | Confluence space **AGP** (Home page links all pages) |
| Stories, sprints, points | Jira project **AGP**, board 4 |
| Code, tests, release workflow | This GitHub repository |
| Final design | Claude Design canvas (34 Court and Clay boards, D32) |

## Chapters

1. [Project setup](#1-project-setup)
2. [Page code](#2-page-code) — starts in Sprint 1
3. [DevOps and release](#3-devops-and-release)
4. [Tests and checks](#4-tests-and-checks) — starts in Sprint 1
5. [Project log (by date)](#5-project-log-by-date)

---

## 1. Project setup

`EXPLAIN`

### 1.1 The tools and their jobs

| Tool | Job in this project | Why this tool |
|---|---|---|
| **Confluence** (space AGP) | Holds every plan and register: charter, requirements, PM Plan, Work Plan, Decision Log, RAID Log, Lessons Log, test plan, gate packs. | D3, D15: one place for each record. The PM toolset is also portfolio evidence. |
| **Jira** (project AGP) | Holds the epics (the work breakdown), the stories with acceptance criteria, the points, and the sprints. | D13: the Jira epics are the WBS; the REQ ID on each story gives traceability. |
| **GitHub** (this repository) | Holds the code, the CI checks, and the release workflow. Hosts the live page on GitHub Pages. | D1: free fixed link; the repository is evidence of the build. |
| **Claude Design canvas** | Holds the final design boards. | D32 (G4-A): the canvas is the final design; Figma is not used. |
| **Claude** | Builds, tests, drafts the records, and runs the scheduled tasks. Aswin decides and approves. | Solo project: Claude is the build team (pm-toolkit roles). |

### 1.2 Who does what

- **Aswin** is the sponsor, product owner, PM, and approver. He merges pull requests to `main`, makes decisions, and approves each gate.
- **Claude** writes code, tests, and records. Claude cannot merge to `main`, change repository settings, or push tags (main is protected).
- **The gate reviewer** is a separate Claude session that did not build the work. It reviews the work before Aswin approves.

### 1.3 How a change gets to the live page

1. Claude makes a branch and commits the change.
2. Claude opens a pull request (PR). The PR has a "What this code does" section in plain words.
3. CI runs the checks. The gate reviewer reviews the PR.
4. Aswin merges the PR.
5. GitHub Actions deploys the page to GitHub Pages (from Sprint 1, story S2).

**Why:** branch protection (S4) stops a direct change to `main`. A direct change broke CI in an earlier project (MCF lesson L17).

### 1.4 Repository layout (planned, D35)

| Folder | What goes in it |
|---|---|
| `src/` | The page code (Astro, ADR-01). |
| `src/build-overlay/` | The Workshop code. "Build Overlay" is the internal name only (D29). |
| `public/data/progress.json` | The daily Jira snapshot that the Workshop pies read. |
| `logs/run-log.md` | 1 line for each run of the daily task. |
| `docs/assets/` | Screenshots for the project cards. |
| `docs/explain/` | This guide. |
| `.github/workflows/` | The CI, deploy, and release workflows. |

---

## 2. Page code

`EXPLAIN`

No page code exists yet. Sprint 1 (Mon 23 Nov – Sun 29 Nov 2026) starts the code. Each story adds its entries here: the file, what it does, and why.

---

## 3. DevOps and release

`EXPLAIN`

### 3.1 Release workflow (12–13 Nov 2026, PR #3)

- **What:** `.github/workflows/release.yml` reads the `VERSION` file. After a merge to `main`, it makes the tag `v<VERSION>` and the GitHub release.
- **Why:** the Claude session cannot push a tag (403, tested at G3). The workflow runs as GitHub, so it can. Aswin only merges the PR that changes `VERSION`.
- **Where:** `.github/workflows/release.yml`, README section "Releases".

### 3.2 Daily Jira snapshot (planned, story S12 / AGP-37)

- **What:** a scheduled Claude task reads Jira each day and writes `public/data/progress.json`. It opens a PR, and auto-merge merges it when CI passes.
- **Why:** the Workshop needs fresh data. There is no Jira token (D12, D18), so Claude reads Jira through the Atlassian connector. Branch protection stays on, so the data goes through a PR (D33).
- **Where:** Jira AGP-37; Decision Log D12, D18, D33, D35.

### 3.3 Rollback (D33)

- **What:** if a deploy breaks the page, Aswin re-runs the last good deploy in GitHub Actions.
- **Why:** a re-run is faster than a revert and needs no code change.
- **Where:** Test and Release Plan, rollback steps.

---

## 4. Tests and checks

`EXPLAIN`

No tests exist yet. Sprint 1 story S2 (AGP-15) adds them: unit tests, browser tests (Playwright 1.63.0), accessibility, Lighthouse, page weight, the CodeQL code scan, and the licence check. Each check gets an entry here: what it tests, and why.

**Checks used before the build**

- **Render check** (`check_render.py`, headless Chrome) — it opens every design board and checks that labels stay on 1 line, no bar covers a heading, and nothing goes outside the page width. **Why:** 2 design changes broke the layout on 16 Nov, and only a real render found it (lesson AL8).
- **Gate review** — a separate Claude session checks the work against the standard before Aswin approves (G3, G4, Sprint 1 criteria).

---

## 5. Project log (by date)

`EXPLAIN`

Each day lists what was done, why, and where. "D" numbers are rows in the Decision Log.

### Wed 11 Nov 2026 — start and charter

- **Project start.** The plan doc became the charter. **Why:** Aswin wanted the portfolio page run as a full PM project, so the page itself is PM evidence. **Where:** Confluence › Charter.
- **Requirements** REQ-01 to REQ-24 and NFR-01 to NFR-12 written. **Where:** Confluence › Requirements.
- **Hosting** on GitHub Pages, free address first, domain later (D1, D8).
- **Records** in Confluence space AGP; Jira for the stories (D3).
- **Build Overlay idea** (now "Workshop"): a JavaScript layer that shows build progress on the page, fed by a daily Jira snapshot with no token (D12). **Why:** it shows stakeholders the build, and works again on other projects.
- **Other choices:** résumé button (D9), cookieless visit counter (D10), Amazon card (D6), app cards Planned (D11), card status from each GitHub repository (D7).
- **Explain every action** rule added to the PM Plan (this guide).
- **Gate G2** (charter) approved by Aswin in chat.

### Thu 12 Nov 2026 — planning and gate G3

- **Right-size the documents (D13).** Each record now exists once. G3 items went from 16 to 10. **Why:** the documents repeated each other, and the upkeep stopped the work (lesson AL1).
- **Career ladder** kept as Project → Program → Portfolio Manager (D2, D16). **PM skills list** from the CB3 research page (D17).
- **Jira bot** kept as a spare with no token (D18). **Why:** no token keeps risk R8 closed.
- **Layout:** dashboard style, left sidebar, bento grid of cards (D19).
- **Wireframes started early** (D14). **Why:** the design is on the critical path.
- **Backlog estimated:** 81 points in 3 sprints. **Where:** Confluence › Backlog and Estimate; Jira.
- **Repository:** README and card screenshots added; test commits for the daily task (R12 test 2) made and removed (PR #2).
- **Gate G3** approved with conditions C1–C3 (D20). The scope is now fixed; a change needs a change request.

### Fri 13 Nov 2026 — release workflow

- **Release workflow** merged (PR #3). **Why:** the session cannot push tags (see 3.1).
- **Friday status task** ran and drafted a status report, but the draft was not approved or saved (lesson AL12).

### Sat 14 Nov 2026 — theme

- **Theme B2 · Comic** chosen after 4 review rounds (D21).
- **Badminton touches** and an original cartoon avatar added (D22). **Design rules:** attractive, comic, recruiter view first.

### Sun 15 – Mon 16 Nov 2026 — design review rounds

- **Card status rule:** LIVE = first version out; % BUILT = share of the full plan (D23). **Why:** LIVE cards at 50–62% looked like a contradiction.
- **Workshop progress** became a pie on the corner of each card (D24), then a 48 px yellow pie (D25), then a pie with no inner circle (D26). **Why:** bars covered text; circles inside circles forced small text.
- **Change request CR-01** approved: Copy email and Download résumé moved to the top; Contact and Live tools cards removed; 23 → 21 cards (D27). **Why:** a recruiter on a phone needs contact with no scroll.
- **Colour scheme Court and Clay** with dark mode D2 (D28). **Why:** B2 was tiring to look at for a long time.
- **Render check** added after 2 layout breaks (lesson AL8).

### Tue 17 Nov 2026 — gate G4 and Sprint 1 readiness

- **Visitor names:** the 7th PM tool is "Workshop: Build Progress"; "Build Overlay" stays internal (D29). **Why:** labels use the visitor's words.
- **Design details:** Workshop badge, glass phone menu, close buttons, phone icons, Copy email states (D30); keyboard focus ring, favicon, racket-swing hover (D31).
- **ADR-01** accepted: Astro and GitHub Pages.
- **Gate G4** (design sign-off) approved with conditions C1 (ratings by 27 Nov) and C2 (5-second test by 6 Dec) (D32).
- **Sprint 1 acceptance criteria** written for 15 stories, then 2 gate reviews (41 findings) fixed (lesson AL10).
- **Sprint 1 decisions:** container pies into Sprint 1; daily data through a PR with auto-merge; snapshot story split; rollback by re-run; CR-02 adds the Page shell story S31; "Details coming soon" until Sprint 2; Definition of Ready and Done approved (D33). Snapshot stories 1 point each (D34). 0-point pies show "–"; Workshop card In progress until S21 is live; AGP-17 is 2 points (D35).
- **Sprint 1 = 40 points**, total 87 points (Must 80). **Where:** Jira sprint "AGP Sprint 1"; Confluence › Sprint 1 Plan.
- **Benchmark check** against the 108-item PM standard. 7 gaps found and put into plans: code scan and licence check (AGP-15), security scan (AGP-43), debt register, quality metrics, hypercare exit criteria, RAID review, status report task. **Where:** tracker doc "AGP Sprint 1 readiness — work tracker"; RAID R13–R17; Lessons AL9–AL13.
- **This guide** started. It was decided on 11 Nov but not started until today (lesson AL13).
