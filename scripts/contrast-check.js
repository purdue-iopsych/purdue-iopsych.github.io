// Checks the colour tokens in css/style.css against WCAG AA (4.5:1 normal text).
// Run: node scripts/contrast-check.js
const fs = require("fs");
const path = require("path");

const css = fs.readFileSync(path.join(__dirname, "..", "css", "style.css"), "utf8");

const tokens = {};
for (const line of css.split("\n")) {
  const m = line.match(/^\s*--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/);
  if (m) tokens[m[1]] = m[2];
}

const hex = (h) => { h = h.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16)); };
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const L = (h) => { const [r, g, b] = hex(h); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const ratio = (a, b) => { const x = L(a), y = L(b); const [hi, lo] = x > y ? [x, y] : [y, x]; return (hi + 0.05) / (lo + 0.05); };

const t = (n) => tokens[n] || (() => { throw new Error("missing token --" + n); })();
const WHITE = "#ffffff", BLACK = "#000000";

const checks = [
  ["body text on white", t("ink"), WHITE],
  ["secondary text on white", t("ink-soft"), WHITE],
  ["muted on white", t("muted"), WHITE],
  ["muted on band", t("muted"), t("band")],
  ["link on white", t("aged"), WHITE],
  ["link on band", t("aged"), t("band")],
  ["link on band-deep", t("aged"), t("band-deep")],
  ["button text on gold", BLACK, t("gold")],
  ["button text on dust (hover)", BLACK, t("dust")],
  ["nav / footer text on black", t("steam"), BLACK],
  ["footer muted on black", t("cool-gray"), BLACK],
  ["stat number on black", t("gold"), BLACK],
];

let failed = 0;
for (const [name, fg, bg] of checks) {
  const r = ratio(fg, bg);
  if (r < 4.5) failed++;
  console.log(`${r >= 4.5 ? "  ok  " : "  !!  "}${name.padEnd(30)}${r.toFixed(2)}:1`);
}

// Gold as text on white is the trap this palette invites. Assert it is never used that way.
const goldAsText = ratio(t("gold"), WHITE);
console.log(`\n  note  gold on white would be ${goldAsText.toFixed(2)}:1 — never use gold for text.`);

console.log(failed ? `\nFAILED: ${failed} pair(s) below 4.5:1` : "\nAll pairs pass WCAG AA (4.5:1).");
process.exit(failed ? 1 : 0);
