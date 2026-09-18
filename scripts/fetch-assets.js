// Downloads every image and PDF the old Google Sites site depended on, so the
// new site is fully self-contained. Re-runnable: skips files already present.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "_source");
const IMG = path.join(ROOT, "images");
const PDF = path.join(ROOT, "newsletters");
const DOCS = path.join(ROOT, "docs");
for (const d of [IMG, path.join(IMG, "pagsip"), PDF, DOCS]) fs.mkdirSync(d, { recursive: true });

const page = (f) => fs.readFileSync(path.join(SRC, f), "utf8");

// --- images, in document order, per page -----------------------------------
function imageUrls(html) {
  const out = [];
  const re = /https:\/\/lh[0-9a-z-]*\.googleusercontent\.com\/sitesv-images-rt\/[A-Za-z0-9_\-]+=w\d+/g;
  let m;
  while ((m = re.exec(html))) if (!out.includes(m[0])) out.push(m[0]);
  return out;
}
const sized = (u, w) => u.replace(/=w\d+$/, "=w" + w);

const PLAN = [
  ["pip_purdue-industrial-organizational-psychology-home.html", ["home-group-photo", "home-2", "home-3"], 1600],
  ["pip_our-program.html", ["program-colloquium", "program-campus-1", "program-campus-2", "program-ungc", "program-awards"], 1600],
  ["pip_people.html", [
    "faculty-harris-watson", "faculty-kung", "faculty-macnamara", "faculty-tay", "faculty-woo",
    "student-byun", "student-kim", "student-liou", "student-lum", "student-masser", "student-showalter",
  ], 800],
  ["pip_news.html", ["news-howard-weiss"], 1000],
  ["pip_purdue-association-of-graduate-students-in-industrial-psychology-pagsip_alumni.html", ["alumni-keith"], 800],
];

const jobs = [];
for (const [file, names, w] of PLAN) {
  const urls = imageUrls(page(file));
  urls.forEach((u, i) => {
    const name = names[i] || `${file.replace(/^pip_|\.html$/g, "")}-${i + 1}`;
    jobs.push({ url: sized(u, w), out: path.join(IMG, name + ".jpg"), label: name });
  });
  if (urls.length !== names.length) console.warn(`  ! ${file}: ${urls.length} images, ${names.length} names`);
}
// PAGSIP carousel: uncaptioned historical photos -> numbered gallery
imageUrls(page("pip_purdue-association-of-graduate-students-in-industrial-psychology-pagsip.html"))
  .forEach((u, i) => {
    const n = String(i + 1).padStart(2, "0");
    jobs.push({ url: sized(u, 1600), out: path.join(IMG, "pagsip", `photo-${n}.jpg`), label: `pagsip/photo-${n}` });
  });

// --- PDFs -------------------------------------------------------------------
const NEWSLETTERS = {
  "2026": "1Ir_RMAzspP2PCOvv2m-l__VE4vwfIRS7", "2025": "167kWoh0DZp9KGlocvFRkSrcxTEJghu_a",
  "2024": "1c4IvRtw_BDz9Yw3oDcmxfvRPWWJgHzYa", "2022": "172IllsOzyIvAY2pzm7isXiiJ1XJ4kBcu",
  "2020": "1TyjXDI7ZzA8XL4NvTuTUKySw4LsoZFuV", "2019": "10qKrFwKJsQUDDrYT-JAqftdhFHhdQSPq",
  "2017": "1B_Zs0bwUqd8A7vbOnhvO6sRQt88ZaLJv", "1996": "1ZHX1rEv9aicQ2L9fFqbpBfrb9wd4-iyO",
  "1993": "1A3XPgn9OigiJSGRZx9cf7kN3Mr6h61i2", "1975": "15P005bgXXRSAIE875aQErRM2uTUDUKNM",
  "1973": "1DwqzEjgyGSqfTNEB6wLg85xmw-isYrk6", "1966": "1-ChG5UhvLE1fgYhHdlkS6CxzKNSsiX9z",
  "1965": "1UJDsw61tUbfT9RC0RgXKEz9Yb-CiayuT", "1964": "1B9ofHgZSULIIcRFg5Vz9S-F9o9vUBitP",
  "1963": "1vuPrp-ZHp_Fv-7BcXchAm1dgWvX6cb7b", "1962-11": "1mlmrvDrBESFOwbGHedzGC1qWWL2L4jBT",
  "1962-04": "1ljY_lWaejYcl6XGzbhs3jhr4YqejD_lL", "1962-01": "1f5IeeSOBgZSbtyOWa2fdmJuiqMkxsY2t",
  "1961": "1599TPBApm4H6XvOr47DUoQJ2HnS6_-ZI", "1960-04": "1mFWlMo0i3RsjPaTpzBSAxKQeezhpKSsB",
  "1960-01": "18dABbqd1A1hv5qiNjrt8UInr5-8gM-Vc", "1958-12": "1O7Gw47IuwKchnen4objwktYbUtyhV3F2",
  "1958-04": "1C77gWp4Qg323z2FMO5Xv8BHzpR2HYZq1", "1957-12": "1fNrnJfTYaqOYCUDS3iTFr4lEV_iUzLO9",
  "1957-04": "1C9kx2v3hRcAYzaLwP4tyWZPHkM5l1-Jh", "1956": "1gqa8k0axK-kwSXe9RDOjfBJ8NuhKq-K9",
  "1955": "1eUF0CeZ-IBU7MI4-uS7LXFOvAlqhCw0e", "1954": "1lhNVPk08Wz_NKermWm8ASYOP6qJBeGnW",
  "1953-10": "14uRZneVlGAdA-FU_G8lUpzP8-043B6cF", "1953-05": "1Va_DaXsVrUvHK39XrPz3lBC8KoB-mOz9",
  "1953-02": "1ARK1Sve09ALmcy7hOa1zuU5tr8a24wAS", "1952": "1h04kYLR-C670uWbcF64br8cWFykALPnu",
};
for (const [year, id] of Object.entries(NEWSLETTERS))
  jobs.push({ url: `https://drive.google.com/uc?export=download&id=${id}`, out: path.join(PDF, `pagsip-newsletter-${year}.pdf`), label: `newsletter ${year}` });

const DOCUMENTS = {
  "pagsip-history": "1iumw2M0m-n4nOw9NphC_szoZg_0G7KID",
  "in-memoriam-dick-jeanneret": "1KQyF9HYHE78xlcbrQvJgPz5MTYGSKYPA",
  "in-memoriam-frank-schmidt": "1f-V0lssAPWCku7KFRKcVWZ0zVl5QLB2O",
  "un-global-compact-coe-2022": "1-VazX0Jz7R4d1SqR3H9_uRIW0FYggMlf",
  "faculty-advice-grad-school-2020": "1O_oa7dw72DzPDNE4x-HNJbp986DVwSba",
};
for (const [name, id] of Object.entries(DOCUMENTS))
  jobs.push({ url: `https://drive.google.com/uc?export=download&id=${id}`, out: path.join(DOCS, `${name}.pdf`), label: name });
// the applying-to-grad-school guide is a Google Doc, not a file -> export as PDF
jobs.push({
  url: "https://docs.google.com/document/d/1LV4xuolNohNpBo8o-6Y1M88O1C7EiJSPm8EBFtKJL-c/export?format=pdf",
  out: path.join(DOCS, "guide-applying-to-graduate-school.pdf"), label: "grad school guide",
});

// --- run --------------------------------------------------------------------
(async () => {
  let ok = 0, skip = 0, fail = [];
  for (const j of jobs) {
    if (fs.existsSync(j.out) && fs.statSync(j.out).size > 1024) { skip++; continue; }
    try {
      const r = await fetch(j.url, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0" } });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      // Drive sometimes returns an HTML interstitial instead of the file
      if (buf.subarray(0, 512).toString("latin1").match(/<html|<!DOCTYPE html/i)) throw new Error("got HTML, not a file");
      fs.writeFileSync(j.out, buf);
      console.log(`  ok  ${j.label}  ${(buf.length / 1024).toFixed(0)}KB`);
      ok++;
    } catch (e) {
      console.log(`  FAIL ${j.label}: ${e.message}`);
      fail.push({ label: j.label, url: j.url, err: e.message });
    }
  }
  console.log(`\ndownloaded ${ok}, skipped ${skip}, failed ${fail.length}`);
  if (fail.length) fs.writeFileSync(path.join(ROOT, "_source", "failed-downloads.json"), JSON.stringify(fail, null, 2));
})();
