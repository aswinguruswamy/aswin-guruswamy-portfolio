# Aswin Guruswamy — Portfolio Page

Personal portfolio page of Aswin Guruswamy, Project Manager (PMP, CSM, CSPO), Greater Toronto Area, Canada.

## Status
Phase 3 done: design approved at gate G4 (17 Nov 2026). Sprint 1 starts Mon 23 Nov 2026.

## Code guide
[`docs/explain/code-guide.md`](docs/explain/code-guide.md) explains each action of the project in plain words: what, why, and where.

## Planned contents
- Header, credentials, and career-goal card
- PM tools container (7 project cards, including the Build Overlay)
- Apps and simulations container (4 project cards)
- Skills matrix and contact card
- Build Overlay: a JavaScript overlay that shows build progress from `progress.json`

## Hosting
GitHub Pages (decision D1).

## Project management
The project runs with the pm-toolkit life cycle. Jira project AGP holds the work. The project records are in Confluence space AGP.

## Assets
`docs/assets/` holds the screenshots for the project cards (checklist item B6).

## Releases
To release, a pull request sets the version in the `VERSION` file (for example `1.0.0`). An optional `RELEASE_NOTES.md` holds the release text. After the merge to main, the workflow `.github/workflows/release.yml` makes the tag `v<VERSION>` and the GitHub release.
