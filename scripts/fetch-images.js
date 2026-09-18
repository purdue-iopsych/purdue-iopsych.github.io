// Google Sites image URLs are short-lived signed tokens, so the page must be
// fetched and its images downloaded in the SAME run. Re-runnable.
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const IMG = path.join(ROOT, "images");
fs.mkdirSync(path.join(IMG, "pagsip"), { recursive: true });

const BASE = "https://www.purdueiopsych.com/";
const PLAN = [
  ["purdue-industrial-organizational-psychology-home", ["home-group-photo", "home-2", "home-3"], 1600],
  ["our-program", ["program-colloquium", "program-campus-1", "program-campus-2", "program-ungc", "program-awards"], 1600],
  ["people", ["faculty-harris-watson", "faculty-kung", "faculty-macnamara", "faculty-tay", "faculty-woo",
              "student-byun", "student-kim", "student-liou", "student-lum", "student-masser", "student-showalter"], 900],
  ["news", ["news-howard-weiss"], 1000],
  ["purdue-association-of-graduate-students-in-industrial-psychology-pagsip/alumni", ["alumni-keith"], 900],
  ["purdue-association-of-graduate-students-in-industrial-psychology-pagsip", "pagsip-gallery", 1600],
];

const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36" };

function urlsFrom(html) {
  // Scope to the content region: Google Sites also emits banner/theme images
  // outside it, which would silently shift every name in PLAN by one.
  const mm = html.match(/<div[^>]+role="main"[\s\S]*/i);
  if (mm) html = mm[0];
  const out = [];
  const re = /https:\/\/lh[0-9a-z-]*\.googleusercontent\.com\/sitesv-images-rt\/[A-Za-z0-9_\-]+=w\d+/g;
  let m;
  while ((m = re.exec(html))) if (!out.includes(m[0])) out.push(m[0]);
  return out;
}

(async () => {
  let ok = 0, fail = 0;
  for (const [slug, names, w] of PLAN) {
    const html = await (await fetch(BASE + slug, { headers: UA })).text();
    const urls = urlsFrom(html);
    const gallery = names === "pagsip-gallery";
    if (!gallery && urls.length !== names.length)
      console.warn(`  ! ${slug}: found ${urls.length} images, expected ${names.length}`);
    for (let i = 0; i < urls.length; i++) {
      const out = gallery
        ? path.join(IMG, "pagsip", `photo-${String(i + 1).padStart(2, "0")}.jpg`)
        : path.join(IMG, (names[i] || `${slug.replace(/\//g, "-")}-${i + 1}`) + ".jpg");
      if (fs.existsSync(out) && fs.statSync(out).size > 4096) { ok++; continue; }
      const u = urls[i].replace(/=w\d+$/, "=w" + w);
      try {
        const r = await fetch(u, { headers: UA });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length < 4096) throw new Error("suspiciously small (" + buf.length + "B)");
        fs.writeFileSync(out, buf);
        console.log(`  ok  ${path.relative(IMG, out)}  ${(buf.length / 1024).toFixed(0)}KB`);
        ok++;
      } catch (e) { console.log(`  FAIL ${path.relative(IMG, out)}: ${e.message}`); fail++; }
    }
  }
  console.log(`\nimages ok ${ok}, failed ${fail}`);
})();
