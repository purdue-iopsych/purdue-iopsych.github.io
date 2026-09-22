#!/usr/bin/env node
/**
 * Static site generator for purdueiopsych.com.
 *
 *   node build.js
 *
 * Wraps each content fragment in src/ with the shared shell and writes the
 * finished HTML. Fragments may contain <!--PLACEHOLDER--> comments, which are
 * replaced by the render functions below using the JSON in data/.
 * No dependencies; Node core only.
 */
const fs = require("fs");
const path = require("path");

const BASE = "https://www.purdueiopsych.com";
const ROOT = __dirname;
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const data = (name) => JSON.parse(read(path.join("data", name + ".json")));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ---------------------------------------------------------------- pages ---
 * `url` is the live path; the file is written to <url>/index.html so that URLs
 * keep the shape the Google Sites version used (no .html suffix).
 */
const PAGES = {
  index: {
    url: "/",
    title: "Purdue University Industrial-Organizational Psychology",
    desc: "Purdue's I-O psychology Ph.D. program is among the oldest in the world, conferring its first degree in 1939, and has graduated more PhDs and SIOP Fellows than any other I-O program.",
  },
  "our-program": {
    url: "/our-program",
    title: "Our Program | Purdue I-O Psychology",
    desc: "A research-intensive Ph.D. in industrial-organizational psychology at Purdue University, built on a science-practice model, with apprenticeship-based training alongside a faculty advisor.",
  },
  people: {
    url: "/people",
    title: "People | Purdue I-O Psychology",
    desc: "Faculty and graduate students in the industrial-organizational psychology program at Purdue University.",
  },
  admissions: {
    url: "/admissions",
    title: "Admissions | Purdue I-O Psychology",
    desc: "Admissions criteria, guaranteed five-year funding, and application guidance for the Purdue I-O psychology Ph.D. program.",
  },
  news: {
    url: "/news",
    title: "News | Purdue I-O Psychology",
    desc: "News from the Purdue I-O psychology program, including the Ernest J. McCormick Memorial Lecture.",
  },
  "i-o-psychology-resources": {
    url: "/i-o-psychology-resources",
    title: "What Is I-O Psychology? | Purdue I-O Psychology",
    desc: "What industrial-organizational psychology is, what I-O psychologists do, how the field differs from OB and HR, and what the job prospects look like.",
  },
  pagsip: {
    url: "/purdue-association-of-graduate-students-in-industrial-psychology-pagsip",
    title: "PAGSIP | Purdue I-O Psychology",
    desc: "The Purdue Association of Graduate Students in Industrial Psychology, established in 1949, connects current I-O graduate students with program alumni.",
  },
  alumni: {
    url: "/purdue-association-of-graduate-students-in-industrial-psychology-pagsip/alumni",
    title: "Alumni | PAGSIP | Purdue I-O Psychology",
    desc: "Recent Purdue I-O psychology Ph.D. graduates, where they are now, and interviews with alumni about life after the program.",
  },
  newsletters: {
    url: "/purdue-association-of-graduate-students-in-industrial-psychology-pagsip/newsletters",
    title: "Newsletters | PAGSIP | Purdue I-O Psychology",
    desc: "The PAGSIP newsletter archive, spanning 1952 to today.",
  },
  404: { url: "/404", title: "Page Not Found | Purdue I-O Psychology", desc: "Page not found.", noindex: true },
};

const NAV = [
  ["/our-program", "Program"],
  ["/people", "People"],
  ["/admissions", "Admissions"],
  ["/news", "News"],
  ["/i-o-psychology-resources", "What Is I-O?"],
  [PAGES.pagsip.url, "PAGSIP"],
];

/* Old Google Sites paths that must keep working, plus short aliases. */
const REDIRECTS = {
  "/purdue-industrial-organizational-psychology-home": "/",
  "/pagsip": PAGES.pagsip.url,
};

const canonical = (slug) => BASE + (PAGES[slug].url === "/" ? "/" : PAGES[slug].url);

/* ------------------------------------------------------------- feedback ---
 * Pages is static, so feedback needs an off-site endpoint. This is wired to a
 * Google Form: responses land in a Sheet the program already controls, and the
 * page the reader was on is prefilled automatically so comments arrive tagged.
 *
 * To connect it, fill in both values (see CLAUDE.md for how to find them).
 * While `formUrl` is empty the site falls back to a mailto: link, so nothing
 * on the page is ever broken.
 */
const FEEDBACK = {
  // "New Purdue IO Site Feedback"
  formUrl: "https://docs.google.com/forms/d/e/1FAIpQLScGSSeWxkQWze0z62CQUti_PrM6jMvtOkPxrAk6-gEDBvqcRg/viewform",
  // The form's one paragraph question. Run `node scripts/form-entries.js <url>`
  // to re-read the entry IDs if the form's questions ever change.
  pageEntry: "entry.1844560478",
  // Prefilled into that field so every response says which page it is about
  // without the reader having to remember. If a dedicated short-answer "Which
  // page" question is ever added, point pageEntry at it and set this to "".
  pagePrefix: "[Page: ",
  pageSuffix: "]\n\n",
  fallbackEmail: "PAGSIP@purdue.edu",

  // Copy for the strip at the bottom of every page. This is currently aimed at
  // the I-O area while the new site is under internal review.
  // TODO before the domain cutover: this becomes public-facing. Either reword it
  // for visitors or set `enabled: false` to drop the strip entirely.
  enabled: true,
  heading: "What would make this page better?",
  body: "We are reviewing the new site with the I-O area. Corrections, anything missing, wording that does not land, or something you would like this page to do &mdash; all of it is useful.",
  cta: "Share feedback on this page",
};

function feedbackLink(slug) {
  const where = PAGES[slug] ? PAGES[slug].url : "/";
  if (!FEEDBACK.formUrl) {
    return `mailto:${FEEDBACK.fallbackEmail}?subject=${encodeURIComponent("Website feedback: " + where)}`;
  }
  if (!FEEDBACK.pageEntry) return FEEDBACK.formUrl;
  const value = (FEEDBACK.pagePrefix || "") + where + (FEEDBACK.pageSuffix || "");
  const sep = FEEDBACK.formUrl.includes("?") ? "&" : "?";
  return `${FEEDBACK.formUrl}${sep}usp=pp_url&${FEEDBACK.pageEntry}=${encodeURIComponent(value)}`;
}

/* --------------------------------------------------------------- shell --- */
const headerHTML = `
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="/">
      <span class="brand-rule" aria-hidden="true"></span>
      <span class="brand-text"><b>Purdue</b> Industrial-Organizational Psychology</span>
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Menu">
      <span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>
    </button>
    <nav class="site-nav" id="site-nav" aria-label="Primary">
      ${NAV.map(([href, label]) => `<a href="${href}">${label}</a>`).join("\n      ")}
    </nav>
  </div>
</header>`;

const feedbackStrip = (slug) => !FEEDBACK.enabled ? "" : `
<section class="feedback-strip">
  <div class="wrap feedback-inner">
    <div>
      <h2>${FEEDBACK.heading}</h2>
      <p>${FEEDBACK.body}</p>
    </div>
    <a class="btn" href="${feedbackLink(slug)}"${FEEDBACK.formUrl ? ' target="_blank" rel="noopener"' : ""}>${FEEDBACK.cta} <span aria-hidden="true">&rarr;</span></a>
  </div>
</section>`;

const footer = (slug) => `${feedbackStrip(slug)}
<footer class="site-footer">
  <div class="wrap footer-grid">
    <div class="footer-brand">
      <p class="footer-name"><b>Purdue University</b><br>Industrial-Organizational Psychology</p>
      <p class="footer-note">Department of Psychological Sciences<br>West Lafayette, Indiana</p>
    </div>
    <nav class="footer-col" aria-label="Program links">
      <h2>Program</h2>
      <a href="/our-program">Our Program</a>
      <a href="/people">People</a>
      <a href="/admissions">Admissions</a>
      <a href="/news">News</a>
    </nav>
    <nav class="footer-col" aria-label="Community links">
      <h2>Community</h2>
      <a href="${PAGES.pagsip.url}">PAGSIP</a>
      <a href="${PAGES.alumni.url}">Alumni</a>
      <a href="${PAGES.newsletters.url}">Newsletters</a>
      <a href="/i-o-psychology-resources">What Is I-O?</a>
    </nav>
    <div class="footer-col">
      <h2>Contact</h2>
      <a href="mailto:PAGSIP@purdue.edu">PAGSIP@purdue.edu</a>
      <a href="https://hhs.purdue.edu/graduate-programs/industrial-organizational-psychology/">Apply to the program</a>
      <a href="https://giving.purdue.edu/">Give to the program</a>
    </div>
  </div>
  <div class="wrap footer-base">
    <p>&copy; ${new Date().getFullYear()} Purdue University Industrial-Organizational Psychology.</p>
    <p>Part of Purdue University's Department of Psychological Sciences. Not affiliated with the Purdue Global I-O Psychology program.</p>
  </div>
</footer>`;

const navScript = `
<script>
(function () {
  var p = location.pathname.replace(/\\/index\\.html$/, "") || "/";
  Array.prototype.forEach.call(document.querySelectorAll(".site-nav a"), function (a) {
    var h = a.getAttribute("href");
    if (h === p || (h !== "/" && p.indexOf(h) === 0)) {
      a.classList.add("active");
      a.setAttribute("aria-current", "page");
    }
  });
  var t = document.querySelector(".nav-toggle"), n = document.getElementById("site-nav");
  if (t && n) t.addEventListener("click", function () {
    var open = n.classList.toggle("open");
    t.setAttribute("aria-expanded", open ? "true" : "false");
  });
})();
</script>`;

function structuredData(slug) {
  const org = {
    "@type": "EducationalOrganization",
    "@id": BASE + "/#program",
    name: "Purdue University Industrial-Organizational Psychology",
    alternateName: "Purdue I-O Psychology",
    url: BASE + "/",
    description: PAGES.index.desc,
    foundingDate: "1939",
    parentOrganization: { "@type": "CollegeOrUniversity", name: "Purdue University", url: "https://www.purdue.edu/" },
    address: { "@type": "PostalAddress", addressLocality: "West Lafayette", addressRegion: "IN", addressCountry: "US" },
  };
  let graph = [org];
  if (slug === "index") {
    graph.push({
      "@type": "WebSite", "@id": BASE + "/#website", url: BASE + "/",
      name: "Purdue I-O Psychology", publisher: { "@id": BASE + "/#program" },
    });
  }
  if (slug === "people") {
    const p = data("people");
    graph = graph.concat([...p.faculty, ...p.students].map((x) => ({
      "@type": "Person",
      name: x.name,
      email: "mailto:" + x.email,
      ...(x.role ? { jobTitle: x.role } : {}),
      affiliation: { "@id": BASE + "/#program" },
      knowsAbout: x.interests,
    })));
  }
  return `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph })}</script>`;
}

function page(slug, meta, main) {
  const ogImage = BASE + "/images/home-group-photo.jpg";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.desc)}">
<link rel="canonical" href="${canonical(slug)}">
<meta name="robots" content="${meta.noindex ? "noindex, follow" : "index, follow, max-image-preview:large"}">
<meta name="theme-color" content="#000000">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Purdue I-O Psychology">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(meta.desc)}">
<meta property="og:url" content="${canonical(slug)}">
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&amp;family=Inter:wght@400;500;600;700&amp;display=swap">
<link rel="stylesheet" href="/css/style.css">
${structuredData(slug)}
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
${headerHTML}
<main id="main">
${main.trim()}
</main>
${footer(slug)}
${navScript}
</body>
</html>
`;
}

/* ------------------------------------------------------------ renderers --- */
function renderFaculty() {
  return data("people").faculty.map((f) => `
    <article class="person">
      <img class="person-photo" src="/${f.photo}" alt="Photograph of ${esc(f.name)}" width="400" height="400">
      <div class="person-body">
        <h3 class="person-name">${esc(f.name)}</h3>
        ${f.admitting ? `<p class="admitting"><span class="dot" aria-hidden="true"></span>Admitting a student for ${esc(f.admitting)}</p>` : ""}
        <p class="person-meta"><a href="mailto:${esc(f.email)}">${esc(f.email)}</a></p>
        <p class="person-interests"><span class="label">Research interests</span> ${esc(f.interests)}</p>
        ${f.lab ? `<p class="person-meta"><span class="label">Lab</span> <a href="${esc(f.site)}" target="_blank" rel="noopener">${esc(f.lab)}</a></p>` : ""}
      </div>
    </article>`).join("\n");
}

/* Derived from people.json so the prose can never contradict the badges. */
function renderAdmittingSummary() {
  const fac = data("people").faculty;
  const open = fac.filter((f) => f.admitting);
  if (!open.length) return "";
  const cycles = [...new Set(open.map((f) => f.admitting))];
  const who = open.length === fac.length
    ? `All ${fac.length} core faculty are`
    : open.length === 1
      ? `${open[0].name} is`
      : `${open.length} of our ${fac.length} core faculty are`;
  const cycle = cycles.length === 1 ? cycles[0] : cycles.join(" and ");
  const names = open.length === fac.length ? "" :
    ` (${open.map((f) => esc(f.name)).join(", ")})`;
  return `<p class="callout admitting-note"><b>${who} admitting students for ${esc(cycle)}.</b>${names}
    Prospective applicants are encouraged to contact the faculty member whose research interests match their own.</p>`;
}

function renderCourtesy() {
  return `<ul class="chip-list">${data("people").courtesy.map((c) => `<li>${esc(c.name)}</li>`).join("")}</ul>`;
}

/* Post-docs and post-bac researchers, split into current and former. These are
   people attached to the program's labs rather than enrolled in the Ph.D., so
   they get a lighter entry than the person cards above. */
function renderResearchers(key, currentLabel, formerLabel) {
  const all = data("people")[key] || [];
  const group = (status) => all.filter((r) => r.status === status);
  const entry = (r) => `
        <li>
          <span class="researcher-name">${r.url ? `<a href="${esc(r.url)}">${esc(r.name)}</a>` : esc(r.name)}</span>
          ${r.role || r.lab ? `<span class="researcher-role">${[r.role, r.lab].filter(Boolean).map(esc).join(" &middot; ")}</span>` : ""}
          ${r.note ? `<span class="researcher-note">${esc(r.note)}</span>` : ""}
        </li>`;
  const block = (status, label) => {
    const rows = group(status);
    if (!rows.length) return "";
    return `
      <div class="researcher-group">
        <h3>${label}</h3>
        <ul class="researcher-list">${rows.map(entry).join("")}</ul>
      </div>`;
  };
  return block("current", currentLabel) + block("former", formerLabel);
}

/* The PAGSIP membership is the current graduate cohort, so it is rendered from
   the same list as /people rather than kept as a second copy that can drift. */
function renderPagsipMembers() {
  return `<ul class="chip-list">${data("people").students.map((s) =>
    `<li${s.role ? ' class="chip-role"' : ""}>${esc(s.name)}${s.role ? `<span class="chip-tag">${esc(s.role)}</span>` : ""}</li>`
  ).join("")}</ul>`;
}

function renderStudents() {
  return data("people").students.map((s) => `
    <article class="person">
      <img class="person-photo" src="/${s.photo}" alt="Photograph of ${esc(s.name)}" width="400" height="400">
      <div class="person-body">
        <h3 class="person-name">${esc(s.name)}</h3>
        ${s.role ? `<p class="person-role">${esc(s.role)}</p>` : ""}
        <p class="person-meta">Year ${esc(s.year)} &middot; Advisor: ${esc(s.advisor)}<br><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></p>
        <p class="person-interests"><span class="label">Research interests</span> ${esc(s.interests)}</p>
      </div>
    </article>`).join("\n");
}

function renderNews() {
  return data("news").map((n) => {
    if (n.body) {
      return `
    <article class="news-item" id="${n.id}">
      <p class="kicker">${esc(n.kind)}</p>
      <h2>${esc(n.title)}</h2>
      ${n.photo ? `<img class="news-photo" src="/${n.photo}" alt="${esc(n.photoAlt || n.title)}">` : ""}
      ${n.body.map((p) => `<p>${esc(p)}</p>`).join("\n      ")}
      ${n.byline ? `<p class="byline">${esc(n.byline)}</p>` : ""}
    </article>`;
    }
    return `
    <article class="news-item" id="${n.id}">
      <p class="kicker">${esc(n.kind)} &middot; ${esc(n.year)}</p>
      <h2>${esc(n.title)}</h2>
      <p class="lead">${esc(n.intro)}</p>
      <p class="talk-title">${esc(n.talkTitle)}</p>
      <p><span class="label">Abstract</span> ${esc(n.abstract)}</p>
    </article>`;
  }).join("\n");
}

function renderAlumni() {
  return data("alumni").map((y) => `
    <section class="alumni-year">
      <h3 class="year-label">${esc(y.year)}</h3>
      <ul class="alumni-list">
        ${y.graduates.map((g) => `<li><span class="alum-name">${g.url ? `<a href="${esc(g.url)}">${esc(g.name)}</a>` : esc(g.name)}</span>${g.position ? `<span class="alum-pos">${esc(g.position)}</span>` : ""}</li>`).join("\n        ")}
      </ul>
    </section>`).join("\n");
}

function renderInterviews() {
  return data("interviews").map((iv) => `
    <article class="interview" id="${iv.id}">
      <header class="interview-head">
        ${iv.photo ? `<img class="interview-photo" src="/${iv.photo}" alt="${esc(iv.photoAlt || iv.name)}">` : ""}
        <div>
          <p class="kicker">Alumni interview</p>
          <h3>${esc(iv.name)}</h3>
          <p class="person-meta">${esc(iv.cohort)}</p>
        </div>
      </header>
      <dl class="qa">
        ${iv.qa.map((x) => `<dt>${esc(x.q)}</dt>
        <dd>${x.list
          ? `<ol>${x.list.map((li) => `<li>${esc(li)}</li>`).join("")}</ol>`
          : x.a.map((p) => `<p>${esc(p)}</p>`).join("")}</dd>`).join("\n        ")}
      </dl>
    </article>`).join("\n");
}

function renderNewsletters() {
  const all = data("newsletters");
  const latest = all[0];
  const past = all.slice(1);
  return `
    <div class="latest-issue">
      <p class="kicker">Latest issue</p>
      <h2>${esc(latest.label)} PAGSIP Newsletter</h2>
      <p>New members, alumni interviews, and recent research from the program.</p>
      <a class="btn" href="/${latest.file}">Read the ${esc(latest.label)} issue <span aria-hidden="true">&rarr;</span></a>
    </div>
    <h2 class="section-head" id="archive">The archive, 1952&ndash;${esc(latest.year)}</h2>
    <p class="lead">Every issue we hold &mdash; ${all.length} in all &mdash; preserved as PDFs on this site.</p>
    <ul class="archive-grid">
      ${past.map((n) => `<li><a href="/${n.file}"><span class="archive-year">${esc(n.label)}</span><span class="archive-size">PDF &middot; ${n.sizeKB} KB</span></a></li>`).join("\n      ")}
    </ul>`;
}

function renderHonorary() {
  return `<ul class="honorary-list">${data("honorary").map((h) => `
    <li>
      <span class="hon-name">${h.url ? `<a href="${esc(h.url)}">${esc(h.name)}</a>` : esc(h.name)}</span>
      <span class="hon-meta">${esc(h.degrees)}${h.role ? " &middot; " + esc(h.role) : ""}</span>
    </li>`).join("")}</ul>`;
}

function renderGallery() {
  const dir = path.join(ROOT, "images", "pagsip");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.jpe?g$/i.test(f)).sort() : [];
  return `<div class="gallery">${files.map((f, i) => `
    <figure><img src="/images/pagsip/${f}" alt="PAGSIP archive photograph ${i + 1} of ${files.length}"></figure>`).join("")}</div>`;
}

const RENDERERS = {
  FACULTY: renderFaculty,
  ADMITTING_SUMMARY: renderAdmittingSummary,
  COURTESY: renderCourtesy,
  PAGSIP_MEMBERS: renderPagsipMembers,
  POSTDOCS: () => renderResearchers("postdocs", "Current post-doctoral researchers", "Former post-doctoral researchers"),
  POSTBACS: () => renderResearchers("postbacs", "Current post-baccalaureate researchers", "Former post-baccalaureate researchers"),
  STUDENTS: renderStudents,
  NEWS_ITEMS: renderNews,
  ALUMNI: renderAlumni,
  INTERVIEWS: renderInterviews,
  NEWSLETTERS: renderNewsletters,
  HONORARY: renderHonorary,
  GALLERY: renderGallery,
};

/* ----------------------------------------------------------------- run --- */
let built = 0;
for (const [slug, meta] of Object.entries(PAGES)) {
  const frag = path.join(ROOT, "src", slug + ".html");
  if (!fs.existsSync(frag)) {
    console.warn("  MISSING fragment:", path.relative(ROOT, frag));
    continue;
  }
  let main = fs.readFileSync(frag, "utf8");

  for (const [key, fn] of Object.entries(RENDERERS)) {
    const token = `<!--${key}-->`;
    if (main.includes(token)) main = main.split(token).join(fn());
  }
  const leftover = main.match(/<!--([A-Z_]+)-->/);
  if (leftover) console.warn(`  ! ${slug}: unresolved placeholder ${leftover[0]}`);

  // lazy-load any image that has not declared a strategy
  main = main.replace(/<img (?![^>]*\bloading=)/gi, '<img loading="lazy" decoding="async" ');

  const out = slug === "404" ? "404.html"
    : meta.url === "/" ? "index.html"
      : path.join(meta.url.replace(/^\//, ""), "index.html");
  const dest = path.join(ROOT, out);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, page(slug, meta, main));
  console.log("  built", out.replace(/\\/g, "/"));
  built++;
}

/* redirect stubs so legacy Google Sites paths keep working */
for (const [from, to] of Object.entries(REDIRECTS)) {
  const dest = path.join(ROOT, from.replace(/^\//, ""), "index.html");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Redirecting&hellip;</title>
<link rel="canonical" href="${BASE}${to === "/" ? "/" : to}">
<meta name="robots" content="noindex, follow">
<meta http-equiv="refresh" content="0; url=${to}">
</head>
<body><p>This page has moved to <a href="${to}">${BASE}${to === "/" ? "/" : to}</a>.</p>
<script>location.replace("${to}");</script>
</body>
</html>
`);
  console.log("  redirect", from, "->", to);
}

/* sitemap */
const urls = Object.keys(PAGES)
  .filter((s) => !PAGES[s].noindex)
  .map((s) => `  <url><loc>${canonical(s)}</loc></url>`);
fs.writeFileSync(path.join(ROOT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`);

console.log(`\n${built} pages + ${Object.keys(REDIRECTS).length} redirects + sitemap.xml`);
