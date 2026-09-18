// Prints the question titles and entry IDs of a public Google Form, so the
// feedback link in build.js can prefill the right field.
//   node scripts/form-entries.js <form viewform URL>
const url = process.argv[2];
if (!url) { console.error("usage: node scripts/form-entries.js <viewform URL>"); process.exit(1); }

const TYPES = {
  0: "short answer", 1: "paragraph", 2: "multiple choice", 3: "dropdown",
  4: "checkboxes", 5: "linear scale", 7: "grid", 9: "date", 10: "time",
};

(async () => {
  const html = await (await fetch(url.replace(/\?.*$/, ""), {
    headers: { "user-agent": "Mozilla/5.0" },
  })).text();

  const m = html.match(/FB_PUBLIC_LOAD_DATA_ = (\[[\s\S]*?\]);\s*<\/script>/);
  if (!m) { console.error("Could not find the form definition. Is the form public?"); process.exit(1); }

  const data = JSON.parse(m[1]);
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "(untitled)";
  const items = (data[1] && data[1][1]) || [];

  console.log(`Form: ${title}`);
  console.log(`Questions: ${items.length}\n`);

  for (const it of items) {
    const [, qTitle, qDesc, qType, entries] = it;
    const ids = (entries || []).map((e) => e && e[0]).filter(Boolean);
    const required = (entries || []).some((e) => e && e[2] === 1);
    console.log(`  ${JSON.stringify(qTitle || "(no title)")}`);
    console.log(`    type: ${TYPES[qType] ?? qType}${required ? "  (required)" : ""}`);
    if (qDesc) console.log(`    help: ${qDesc}`);
    for (const id of ids) console.log(`    entry.${id}`);
    console.log();
  }
})();
