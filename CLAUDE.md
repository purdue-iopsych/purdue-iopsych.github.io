# purdueiopsych.com

Static site for the Purdue University I-O Psychology program. No framework, no
dependencies, no build tooling beyond Node itself.

## The loop

```
edit src/*.html or data/*.json  ->  node build.js  ->  git commit  ->  git push
```

Pushing to `main` publishes. GitHub Pages serves the repo root.

**Always run `node build.js` before committing.** The generated `*.html` files at
the repo root are committed artifacts — editing them directly is pointless,
because the next build overwrites them.

## Where things live

| Path | What it is |
|---|---|
| `src/<slug>.html` | Page content. Only the inside of `<main>` — no `<head>`, header, or footer. **Edit these.** |
| `data/*.json` | Structured content: people, alumni, news, newsletters, interviews, honorary committee. **Edit these.** |
| `build.js` | The generator: page registry, shared shell, render functions. |
| `css/style.css` | The whole stylesheet. Design tokens are in `:root` at the top. |
| `images/`, `docs/`, `newsletters/` | Photos, program PDFs, and the PAGSIP newsletter archive. |
| `scripts/` | One-off tools used for the Google Sites migration. Not part of the build. |
| `*/index.html`, `sitemap.xml` | **Generated. Do not edit.** |

## Common edits

**Update a person, add a student, change research interests** — edit
`data/people.json`, then rebuild. Add the headshot to `images/` and reference it
as `images/<file>.jpg` (no leading slash; `build.js` adds it).

**Add a news item or McCormick lecture** — prepend an object to `data/news.json`.
Lecture entries use `year`/`speaker`/`talkTitle`/`abstract`; long-form posts use
`body` (an array of paragraphs) and optional `photo`/`byline`.

**Add a newsletter** — drop the PDF in `newsletters/` as
`pagsip-newsletter-<year>.pdf`, then prepend an entry to `data/newsletters.json`
with `key`, `year`, `label`, `file`, and `sizeKB`. The newest entry is rendered as
the featured "latest issue", so order matters.

**Add a page** — add an entry to `PAGES` in `build.js` and create the matching
`src/<slug>.html`. Add it to `NAV` if it belongs in the top navigation. The file
is written to `<url>/index.html` so the live URL has no `.html` suffix.

**Inject a list into a page** — put `<!--PLACEHOLDER-->` in the fragment and add a
matching entry to `RENDERERS` in `build.js`. Existing ones: `FACULTY`, `COURTESY`,
`STUDENTS`, `NEWS_ITEMS`, `ALUMNI`, `INTERVIEWS`, `NEWSLETTERS`, `HONORARY`,
`GALLERY`.

## Conventions

- **URLs must not change.** The paths here match the old Google Sites paths
  exactly, including the very long PAGSIP one, so existing inbound links and
  citations keep working. `REDIRECTS` in `build.js` covers the old home path and a
  `/pagsip` shortcut.
- **Don't invent facts.** Everything on the site came from the program's own
  pages. If a number, date, or title isn't sourced, leave it out rather than
  guessing.
- **Gold is never text on white** — it fails contrast. Use `--aged` (#8E6F3E) for
  links and `--gold` for rules, bands, and button fills with black text.
- Asset paths in `data/*.json` are relative (`images/x.jpg`); paths written
  directly in `src/*.html` are root-relative (`/images/x.jpg`).

## Preview locally

```
npx serve .
```

Then open http://localhost:3000. Directory-style URLs need a server — opening the
files directly with `file://` will break the root-relative CSS and image paths.

## Open TODOs

- **Information sessions.** The old homepage advertised a session on Oct 20, 2025.
  It is commented out in `src/index.html` rather than published with a stale date.
  Fill in new details and uncomment when the next session is scheduled.
- **Faculty titles.** The source site listed no ranks (Professor, Associate
  Professor, endowed chairs), so none are shown. Add a `title` field to
  `data/people.json` and render it in `renderFaculty()` if the program wants them.
- **PAGSIP gallery captions.** The 26 archive photographs came from an uncaptioned
  Google Sites carousel, so their alt text is generic. Real captions would help
  both readers and screen readers.
- **Courtesy faculty links.** Listed by name only, as on the old site. Links to
  their Daniels School profiles would be an easy improvement.
