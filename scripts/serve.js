// Minimal static server for local preview: node scripts/serve.js [port]
// Serves directory-style URLs (/people -> people/index.html) the way GitHub Pages does.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PORT = Number(process.argv[2]) || 4321;

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json",
  ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".png": "image/png", ".pdf": "application/pdf", ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8", ".ico": "image/x-icon",
};

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const rel = path.normalize(url).replace(/^([/\\])+/, "");
  const base = path.join(ROOT, rel);
  const candidates = [base, path.join(base, "index.html"), base + ".html"];
  const hit = candidates.find((p) => p.startsWith(ROOT) && fs.existsSync(p) && fs.statSync(p).isFile());

  if (!hit) {
    const nf = path.join(ROOT, "404.html");
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
    return res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : "404");
  }
  res.writeHead(200, { "content-type": TYPES[path.extname(hit).toLowerCase()] || "application/octet-stream" });
  fs.createReadStream(hit).pipe(res);
}).listen(PORT, () => console.log("serving " + ROOT + " on http://localhost:" + PORT));
