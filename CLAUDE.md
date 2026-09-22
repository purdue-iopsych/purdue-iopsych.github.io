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
| `scripts/` | Checks and tools. Not part of the build — run them by hand. |
| `*/index.html`, `sitemap.xml` | **Generated. Do not edit.** |

## Common edits

**Update a person, add a student, change research interests** — edit
`data/people.json`, then rebuild. Add the headshot to `images/` and reference it
as `images/<file>.jpg` (no leading slash; `build.js` adds it). **Then run the
image optimizer** (below) — headshots off a phone or a faculty page are
routinely 1 MB for a picture rendered at 130 pixels.

**Add a news item or McCormick lecture** — prepend an object to `data/news.json`.
Lecture entries use `year`/`speaker`/`talkTitle`/`abstract`; long-form posts use
`body` (an array of paragraphs) and optional `photo`/`byline`.

**Add a newsletter** — drop the PDF in `newsletters/` as
`pagsip-newsletter-<year>.pdf`, then prepend an entry to `data/newsletters.json`
with `key`, `year`, `label`, `file`, and `sizeKB`. The newest entry is rendered as
the featured "latest issue", so order matters.

**Change who is admitting students** — edit the `admitting` field on each person
in `data/people.json` (e.g. `"admitting": "Fall 2027"`). Remove the field for
anyone not taking a student. The badge on their card *and* the summary sentence
on `/people` and `/admissions` are both generated from this one field, so they
can never disagree. **This goes stale every admissions cycle — check it each
autumn.**

**Add or replace a photo** — drop it in `images/`, then:

```
powershell -ExecutionPolicy Bypass -File scripts/optimize-images.ps1
```

It re-encodes everything under `images/` to a right-sized JPEG, capped at the
width the layout actually renders (the caps live at the top of the script,
one per filename pattern). Filenames never change, so no HTML or JSON moves.
Re-running it is a no-op: a file is only replaced when the new one is smaller.
Add `-WhatIf` to see what it would do first.

This matters more than it sounds. The Google Sites migration saved ten files
with a `.jpg` name that were really PNG-encoded photographs — 6 MB on their own
— and the first pass took `images/` from **18.2 MB to 4.3 MB**.

`build.js` reads each image's real dimensions out of the file and writes
`width`/`height` onto the `<img>`, so nothing on the page jumps around while
images load. Never hand-write those attributes unless you want to override
what the file says.

**Add a page** — add an entry to `PAGES` in `build.js` and create the matching
`src/<slug>.html`. Add it to `NAV` if it belongs in the top navigation. The file
is written to `<url>/index.html` so the live URL has no `.html` suffix.

**Inject a list into a page** — put `<!--PLACEHOLDER-->` in the fragment and add a
matching entry to `RENDERERS` in `build.js`. Existing ones: `FACULTY`, `COURTESY`,
`STUDENTS`, `NEWS_ITEMS`, `ALUMNI`, `INTERVIEWS`, `NEWSLETTERS`, `HONORARY`,
`GALLERY`.

## The feedback form

Every page ends with a "Give feedback on this page" strip. GitHub Pages is
static and cannot receive a form post, so this points at an off-site form.

It is configured by the `FEEDBACK` object near the top of `build.js`:

```js
const FEEDBACK = {
  formUrl:   "",   // https://docs.google.com/forms/d/e/1FAIpQLSc.../viewform
  pageEntry: "",   // entry.1234567890  -> the "Which page" question
  fallbackEmail: "PAGSIP@purdue.edu",
};
```

While `formUrl` is empty the button falls back to a `mailto:` link with the page
path in the subject, so the site is never broken.

The strip's wording also lives in `FEEDBACK` (`heading`, `body`, `cta`). It is
currently addressed to the I-O area during internal review. **Before the domain
cutover it becomes public-facing** — reword it for visitors, or set
`enabled: false` to drop the strip entirely.

**To connect a Google Form:**

1. Build the form with a short-answer question named **Which page** first, then
   the feedback questions.
2. Responses tab → link it to a Google Sheet.
3. Send → link icon → copy the `.../viewform` URL into `formUrl`.
4. Three-dot menu → **Get pre-filled link** → put anything in *Which page* →
   Get link → the copied URL contains `entry.1234567890=...`. Copy just the
   `entry.1234567890` part into `pageEntry`.
5. `node build.js`, commit, push.

Every page then links to the form with *Which page* already filled in, so
responses arrive tagged with where the reader was — no need to ask them.

To compile the feedback later, read the linked Sheet (Claude can read it
directly through the Google Drive connector) and work through the items.

Any other endpoint works too — Formspree, Tally, Microsoft Forms. Only
`FEEDBACK.formUrl` needs to change; drop `pageEntry` if that service has no
prefill mechanism.

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

## What the build does for search engines

Most of this is automatic — it is listed here so nobody adds it twice by hand.

- **Titles, descriptions, canonicals, Open Graph, Twitter cards** come from the
  `PAGES` entry. Titles lead with what a person would type into Google
  (*"Admissions & Funding"*, not *"Admissions"*), so keep that shape.
- **Structured data** (JSON-LD) is assembled in `structuredData()`:
  the program as an `EducationalOrganization` on every page; an
  `EducationalOccupationalProgram` on the home and admissions pages;
  `BreadcrumbList` on the two pages nested under PAGSIP; `Person` entries for
  every faculty member and student on `/people`; and a `FAQPage` on
  `/i-o-psychology-resources`.
- **The FAQ markup is read out of the page itself** — each `<h2 id>` becomes a
  question and the prose below it the answer. Add or reword an H2 there and the
  markup follows. It cannot drift out of sync, so never hand-maintain a copy.
- **`sitemap.xml` carries `lastmod`**, taken from the git commit date of the
  fragment and the JSON a page is built from. Outside a git checkout the dates
  are simply omitted, because a file mtime would just say "today" for
  everything and mean nothing.
- **`robots.txt` and `llms.txt`** are hand-maintained. `llms.txt` summarises the
  program for AI assistants; update its key facts when the program's change.

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
