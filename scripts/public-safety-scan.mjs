import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const skipDirs = new Set([".git", "node_modules", "coverage"]);
const skipFiles = new Set(["scripts/public-safety-scan.mjs"]);

const suspiciousName = /(^|\/)(\.env(?:\.|$)|cookies?(?:\.|$)|storage[-_]?state(?:\.|$)|browser[-_]?profile(?:\/|$)|credentials?(?:\/|\.|$)|secrets?(?:\/|\.|$)|session(?:s)?(?:\/|\.|$))/i;

const checks = [
  ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["github-token", /\bgh[pousr]_[A-Za-z0-9]{20,}\b/],
  ["github-fine-grained-token", /\bgithub_pat_[A-Za-z0-9_]{20,}\b/],
  ["api-secret-token", /\bsk-[A-Za-z0-9_-]{20,}\b/],
  ["private-chat-url", /https?:\/\/(?:www\.)?chatgpt\.com\/(?:c|share|g)\//i],
  ["workflow-secret-reference", /\bsecrets\.[A-Za-z0-9_]+\b/],
  ["email-address", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
];

const findings = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).replaceAll("\\", "/");
    if (entry.isDirectory()) {
      if (suspiciousName.test(rel + "/")) findings.push({ rel, kind: "suspicious-path" });
      walk(full);
      continue;
    }
    if (!entry.isFile()) continue;
    if (skipFiles.has(rel)) continue;
    if (suspiciousName.test(rel)) findings.push({ rel, kind: "suspicious-path" });

    let text;
    try { text = fs.readFileSync(full, "utf8"); } catch { continue; }
    for (const [kind, re] of checks) {
      if (re.test(text)) findings.push({ rel, kind });
    }
  }
}

walk(root);

if (findings.length) {
  console.error("Public-safety scan failed:");
  for (const f of findings) console.error(`- ${f.kind}: ${f.rel}`);
  process.exit(1);
}

console.log("Public-safety scan passed.");
