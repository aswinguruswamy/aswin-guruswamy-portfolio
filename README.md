# Aswin Guruswamy — Portfolio Page

Personal portfolio page of Aswin Guruswamy, Project Manager (PMP, CSM, CSPO), Greater Toronto Area, Canada.

## Status
Build in progress (since 17 Nov 2026). Live page: https://aswinguruswamy.github.io/aswin-guruswamy-portfolio/


## Contents
- Header with credentials, Copy email and Download résumé
- PM tools (7 cards) and apps and simulations (4 cards); a project page for each card with content
- Experience, skills, light and dark mode, phone menu

## Run it
```bash
npm ci
npm run dev        # local page at http://localhost:4321/aswin-guruswamy-portfolio/
npm run build      # static files in dist/
npm test           # the checks that CI runs (needs: npx playwright install chromium)
node tests/snap.mjs <name>   # milestone screenshots in docs/snaps/
```

## Edit the content
All text and links are in `src/data/site.ts`. The résumé is `public/resume.pdf`: add or replace that file, and the button changes from "Résumé coming soon" to "Download résumé".

## Hosting
GitHub Pages (decision D1).

## Project management
Each action and its reason is logged in the Code guide (Confluence space AGP).

## Assets
`docs/assets/` holds the screenshots for the project cards (checklist item B6).

## Releases
To release, a pull request sets the version in the `VERSION` file (for example `1.0.0`). An optional `RELEASE_NOTES.md` holds the release text. After the merge to main, the workflow `.github/workflows/release.yml` makes the tag `v<VERSION>` and the GitHub release.
