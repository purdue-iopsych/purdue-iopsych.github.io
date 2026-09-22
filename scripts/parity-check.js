// Verifies that every person, email, external link and document from the old
// Google Sites pages survived the migration into the built site.
// Run: node scripts/parity-check.js
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

// all built HTML, concatenated
let built = "";
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (["node_modules", ".git", "_source", "src", "scripts"].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".html")) built += fs.readFileSync(p, "utf8");
  }
})(ROOT);

const decoded = built
  .replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&mdash;/g, "—")
  .replace(/&ndash;/g, "–").replace(/&middot;/g, "·").replace(/&nbsp;/g, " ");

const has = (s) => decoded.includes(s);

const EXPECT = {
  "faculty": ["Alex Harris-Watson", "Franki Y. H. Kung", "Brooke N. Macnamara", "Louis Tay", "Sang Eun Woo"],
  "courtesy faculty": ["Brian Dineen", "Brad Alge", "Meredith Woehler", "Michael Campion", "Ellen Kossek", "Allie Gabriel"],
  "graduate students": ["Changyoon Byun", "Hannah Kim", "Gloria Liou", "Joyce Lum", "Jeffrey Masser", "Emma Showalter"],
  "faculty emails": ["aharrisw@purdue.edu", "fkung@purdue.edu", "bmacnama@purdue.edu", "stay@purdue.edu", "sewoo@purdue.edu"],
  "student emails": ["cbyun@purdue.edu", "kim4816@purdue.edu", "lioug@purdue.edu", "lum11@purdue.edu", "jmasser@purdue.edu", "eshowalt@purdue.edu"],
  "contact emails": ["PAGSIP@purdue.edu", "AMKim@prf.org", "pagsip.purdue@gmail.com"],
  "alumni": ["Victoria Scotney Wang", "Meaghan Tracy", "Fanyi Zhang", "Daphne Hou", "Bradley Pitcher", "Rick Yang",
    "Jerod White", "Sharon Li", "Stuti Thapa", "Louis Hickman", "Nicole (Schulz) Strah", "Andrew Jebb",
    "Melissa Keith", "Cassondra Batz-Barbarich", "Vincent Ng", "Rachel Saef", "Scott Parrigon",
    "Drew Mallory", "Brett Guidry", "Caitlin Porter"],
  "honorary committee": ["William C. Byham", "Robert D. Gatewood", "William H. Hendrix", "Paul R. Jeanneret",
    "Richard J. Klimoski", "Frank L. Schmidt", "Kara K. Schmitt", "Neal W. Schmitt", "George C. Thornton III"],
  "news": ["Howard M. Weiss", "Alicia Grandey", "Fred Oswald", "Lillian T. Eby", "Carolyn Jagacinski",
    "Affective Events Theory", "Managing an Emotionally Charged Workplace",
    "The Future and Fairness of Employment Testing", "Mindfulness as a Strategy for Improving Relationships"],
  "key facts": ["1939", "1949", "science-practice model", "SIOP Fellows", "3.64",
    "Mitch Daniels School of Business", "West Lafayette",
    "John and Joyce Schaeuble Award", "Joseph Tiffin Award", "Hendrix",
    "Andrews/Ross Fellowships", "Purdue Research Foundation", "Ernest J. McCormick",
    "Purdue Global", "$89k", "$125k", "10,000 members"],
  "external links": ["siop.org", "apa.org", "onetonline.org", "usnews.com",
    "socialpsychology.org", "homeofpurdue.com",
    "hhs.purdue.edu", "giving.purdue.edu", "bgsu.edu", "en.wikipedia.org"],
  "documents": ["/docs/pagsip-history.pdf", "/docs/in-memoriam-dick-jeanneret.pdf",
    "/docs/in-memoriam-frank-schmidt.pdf", "/docs/guide-applying-to-graduate-school.pdf"],
};

// Dropped deliberately after the September 2026 faculty review of the new site,
// so parity is measured against what the program still stands behind:
//   "UN Global Compact" / "Ten Principles" / unglobalcompact.org / the 2022 CoE
//     PDF  -- the affiliation is no longer current, so the section was removed.
//   cascade.itap.purdue.edu -- every such link was a Cascade CMS authoring URL
//     that showed visitors a login page (two Hendrix awards, one honorary member).
//   faculty-advice-grad-school-2020.pdf -- the advice from faculty still in the
//     program now lives on /admissions itself.

let missing = 0;
for (const [group, items] of Object.entries(EXPECT)) {
  const gone = items.filter((i) => !has(i));
  console.log(`  ${gone.length ? "!!" : "ok"}  ${group.padEnd(20)} ${items.length - gone.length}/${items.length}`);
  for (const g of gone) { console.log(`        MISSING: ${g}`); missing++; }
}

// every newsletter PDF must exist on disk and be linked
const nl = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "newsletters.json"), "utf8"));
const nlMissing = nl.filter((n) => !fs.existsSync(path.join(ROOT, n.file)));
const nlUnlinked = nl.filter((n) => !built.includes("/" + n.file));
console.log(`  ${nlMissing.length || nlUnlinked.length ? "!!" : "ok"}  ${"newsletters".padEnd(20)} ${nl.length} PDFs, ${nl.length - nlMissing.length} on disk, ${nl.length - nlUnlinked.length} linked`);
missing += nlMissing.length + nlUnlinked.length;

console.log(missing ? `\nFAILED: ${missing} item(s) missing` : "\nAll source content accounted for.");
process.exit(missing ? 1 : 0);
