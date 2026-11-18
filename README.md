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
All text and links are in Markdown files in `src/content/` (NFR-09). Edit a file on GitHub, open a pull request, and the page changes after the merge. No code change is needed.

| Folder | One file is | Fields at the top | Text under the `---` line |
| --- | --- | --- | --- |
| `projects/` | one project card, and its project page | name, line, status, group, order, epic, image, version, links, page | not used |
| `profile/profile.md` | the intro card, top bar and sidebar | name, title, location, badges, hiddenBadges, email in 2 parts, links, ladder | the summary |
| `experience/` | one job | org, role, order | the card text |
| `skills/` | one skills box | head, order, tools | the box text |

A project gets its own page when its file has all 5 parts of `page` (problem, approach, role, stack, outcome).
A wrong value stops the build and names the file (for example a status other than Live, In progress or Planned, an epic that is not a Jira key, an image that is not in `public/img`, or the same order twice). `npm run test:content` proves this with 8 planted mistakes.

The résumé is `public/resume.pdf`: add or replace that file, and the button changes from "Résumé coming soon" to "Download résumé".
The old content file is kept, unused, in `archive/site.ts`.

## Credits

| Item | Source | Licence |
|---|---|---|
| LinkedIn icon | [Font Awesome Free](https://fontawesome.com) (brands) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| GitHub icon | [Primer Octicons](https://github.com/primer/octicons) | MIT |
| Tool icons | [Simple Icons](https://simpleicons.org) | CC0 1.0 |
| Fonts | Bangers and Inter, through [Fontsource](https://fontsource.org) | OFL 1.1 |

Brand names and logos belong to their owners. They are used only to link to Aswin's profiles and tools.

## Hosting
GitHub Pages (decision D1).

## Project management
Each action and its reason is logged in the Code guide (Confluence space AGP).

## Assets
`docs/assets/` holds the screenshots for the project cards (checklist item B6).

## Releases
To release, a pull request sets the version in the `VERSION` file (for example `1.0.0`). An optional `RELEASE_NOTES.md` holds the release text. After the merge to main, the workflow `.github/workflows/release.yml` makes the tag `v<VERSION>` and the GitHub release.
