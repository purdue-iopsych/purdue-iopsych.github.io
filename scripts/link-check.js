// Checks every link in the built site.
//   node scripts/link-check.js          internal links only (fast, offline)
//   node scripts/link-check.js --external   also requests every external URL
//
// Run after adding profile links — people move institutions and university
// sites reorganise, so these rot faster than anything else on the site.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const checkExternal = process.argv.includes("--external");

// Hosts that refuse scripted requests. A non-200 from these means nothing, so
// they are reported separately rather than counted as failures.
// cie.ucmerced.edu answers 403 to every automated client (curl, fetch, a browser
// user-agent) while serving the page normally in a browser -- a WAF, not a dead
// link. 403 rather than 404 is the tell. Verify that one by eye.
const BOT_BLOCKED = ["linkedin.com", "scholar.google.com", "academia.edu", "researchgate.net",
  "x.com", "siop.org", "usnews.com", "fonts.gstatic.com", "fonts.googleapis.com",
  "cie.ucmerced.edu"];

const pages = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if ([".git", "_source", "node_modules", "src", "scripts", "data"].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".html")) pages.push(p);
  }
})(ROOT);

const internal = [];
const external = new Map();
for (const p of pages) {
  // strip comments: commented-out blocks hold placeholder markup, not live links
  const html = fs.readFileSync(p, "utf8").replace(/<!--[\s\S]*?-->/g, "");
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const u = m[1].replace(/&amp;/g, "&");
    if (/^(mailto:|#|data:|tel:)/.test(u)) continue;
    if (/^https?:/.test(u)) {
      if (!external.has(u)) external.set(u, path.relative(ROOT, p));
      continue;
    }
    internal.push([path.relative(ROOT, p), u]);
  }
}

let broken = 0;
for (const [page, u] of internal) {
  if (!u.startsWith("/")) { console.log(`  !!  RELATIVE  ${page}  ${u}`); broken++; continue; }
  const rel = decodeURIComponent(u.split("#")[0]).replace(/^\//, "");
  if (!rel) continue;
  const hit = [rel, path.join(rel, "index.html")].some((c) => fs.existsSync(path.join(ROOT, c)));
  if (!hit) { console.log(`  !!  MISSING   ${page}  ${u}`); broken++; }
}
console.log(`internal: ${internal.length} links across ${pages.length} pages, ${broken} broken`);

if (!checkExternal) {
  console.log(`(run with --external to also check the ${external.size} external URLs)`);
  process.exit(broken ? 1 : 0);
}

(async () => {
  const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0 Safari/537.36", accept: "text/html" };
  let bad = 0, skipped = 0;
  console.log(`\nexternal: ${external.size} URLs`);
  for (const [u, page] of external) {
    if (BOT_BLOCKED.some((h) => u.includes(h))) {
      console.log(`  --  ${u}  (blocks automated checks; verify by hand)`);
      skipped++;
      continue;
    }
    let code;
    try {
      const r = await fetch(u, { redirect: "follow", headers: UA });
      code = r.status;
    } catch (e) { code = "ERR"; }
    if (code !== 200) { console.log(`  !!  ${code}  ${u}\n        on ${page}`); bad++; }
  }
  console.log(`\nexternal: ${external.size - skipped - bad} ok, ${bad} broken, ${skipped} unverifiable`);
  process.exit(broken || bad ? 1 : 0);
})();
