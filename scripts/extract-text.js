// Dump readable text + link/image inventory from the archived Google Sites HTML.
// Usage: node scripts/extract-text.js <file.html>
const fs = require("fs");
const path = require("path");

const file = process.argv[2];
let h = fs.readFileSync(file, "utf8");

// Google Sites wraps real content in role="main"; everything else is chrome.
const m = h.match(/<div[^>]+role="main"[\s\S]*/i);
if (m) h = m[0];

h = h.replace(/<script[\s\S]*?<\/script>/gi, " ")
     .replace(/<style[\s\S]*?<\/style>/gi, " ")
     .replace(/<!--[\s\S]*?-->/g, " ");

// keep link targets inline so we can see where text points
h = h.replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, txt) => {
  const t = txt.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return t ? `[${t}](${href})` : `[](${href})`;
});
h = h.replace(/<img\b[^>]*>/gi, (tag) => {
  const src = (tag.match(/src="([^"]+)"/i) || [])[1] || "";
  const alt = (tag.match(/alt="([^"]*)"/i) || [])[1] || "";
  return `\n{IMG alt="${alt}" src=${src}}\n`;
});

h = h.replace(/<(h[1-6])\b[^>]*>/gi, (_, t) => `\n${"#".repeat(+t[1])} `)
     .replace(/<\/(p|div|h[1-6]|li|tr|section|td)>/gi, "\n")
     .replace(/<br\s*\/?>/gi, "\n")
     .replace(/<li\b[^>]*>/gi, "- ")
     .replace(/<[^>]+>/g, " ");

h = h.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'")
     .replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&gt;/g, ">").replace(/&lt;/g, "<")
     .replace(/&mdash;/g, "—").replace(/&ndash;/g, "–").replace(/&hellip;/g, "…");

const lines = h.split("\n").map(s => s.replace(/[ \t]+/g, " ").trim()).filter(Boolean);
// collapse consecutive duplicates (Sites repeats content for responsive variants)
const out = [];
for (const l of lines) if (out[out.length - 1] !== l) out.push(l);
console.log(out.join("\n"));
