// One-time (re-runnable) generator: adds a `practice` link (LeetCode preferred,
// else a hand-checked GFG/HackerRank override) to each problem in
// data/a2z-sheet.json, WITHOUT touching the existing takeuforward `link`.
//
//   node scripts/attach-links.mjs          # write data + report
//   node scripts/attach-links.mjs --dry    # report only, no file write
//
// LeetCode links are auto-attached ONLY on an exact normalized-name match against
// the TUF A2Z sheet API response cached at scripts/tuf-a2z.cache.json
// (GET /api/v1/shared/sheets/strivers-a2z-dsa-track). Fuzzy name matching is NOT
// used for auto-attach — it produced wrong links (e.g. every tree traversal
// collapsing to "Inorder Traversal"). All non-exact links (hand-verified LeetCode
// corrections + GFG/HackerRank) live in scripts/practice-overrides.json
// ({ problemKey: url }) and take precedence.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const SHEET = join(root, "data/a2z-sheet.json");
const TUF = join(here, "tuf-a2z.cache.json");
const OVERRIDES = join(here, "practice-overrides.json");
const REPORT = join(here, "..", "..", "link-report.tsv"); // fallback if scratchpad unset
const dry = process.argv.includes("--dry");

const norm = (s) =>
  s
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\|.*$/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const tuf = JSON.parse(readFileSync(TUF, "utf8")).data;
const tufProblems = tuf.categories.flatMap((c) =>
  c.subcategories.flatMap((sc) => sc.problems || [])
);
const leetOf = (p) => (p.tuf_resources || {}).leetcode || "";

// Canonicalize a LeetCode URL to https://leetcode.com/problems/<slug>/, dropping
// junk suffixes (#:~:text=…, /solution, /description, /discuss/…). Returns "" if
// it isn't a recognizable LeetCode problem URL.
function cleanLeet(url) {
  const m = /leetcode\.com\/problems\/([a-z0-9-]+)/i.exec(url);
  return m ? `https://leetcode.com/problems/${m[1]}/` : "";
}

// Problem key-suffixes whose exact TUF name-match points at the WRONG LeetCode
// problem (TUF linked to an unrelated /discuss or variant page). Forced to no
// auto LeetCode link — they are GFG-only problems handled via overrides instead.
const BLOCK = new Set([
  "merge-2-bst-s", // → binary-search-tree-iterator (wrong)
  "cycle-detection-in-directed-graph-dfs", // → course-schedule-ii/discuss (wrong)
  "cycle-detection-in-directed-graph-bfs", // → course-schedule-ii/discuss (wrong)
  "kosaraju-s-algorithm", // → unrelated /discuss link (wrong)
]);

// Index TUF problems by normalized name (first wins on collision).
const byNorm = new Map();
for (const p of tufProblems) {
  const k = norm(p.name);
  if (!byNorm.has(k)) byNorm.set(k, p);
}

const overrides = JSON.parse(readFileSync(OVERRIDES, "utf8"));
const sheet = JSON.parse(readFileSync(SHEET, "utf8"));

let nLeet = 0, nGfg = 0, nNone = 0;
const rows = [["key", "name", "practice", "source", "matchedTufName"]]; // TSV

for (const step of sheet.steps) {
  for (const prob of step.problems) {
    let practice = "";
    let source = "none";
    let matchedName = "";

    const parts = prob.key.split("__");
    const suffix = parts.length > 1 ? parts.slice(1).join("__") : prob.key;

    // 1) Hand-verified override (corrected LeetCode / GFG / HackerRank) wins.
    if (overrides[prob.key]) {
      practice = overrides[prob.key];
      source = "override";
    } else if (!BLOCK.has(suffix)) {
      // 2) LeetCode from TUF — EXACT normalized-name match only (no fuzzy).
      const m = byNorm.get(norm(prob.name));
      const leet = m ? cleanLeet(leetOf(m)) : "";
      if (leet) {
        practice = leet;
        source = "leetcode-exact";
        matchedName = m.name;
      }
    }

    if (practice) {
      if (practice.includes("leetcode.com")) nLeet++;
      else nGfg++;
    } else {
      nNone++;
    }

    // Write additive field (preserve everything else, keep key order).
    if (practice) prob.practice = practice;
    else delete prob.practice;

    rows.push([
      prob.key,
      JSON.stringify(prob.name),
      practice,
      source,
      JSON.stringify(matchedName),
    ]);
  }
}

const reportPath = process.env.SCRATCHPAD
  ? join(process.env.SCRATCHPAD, "link-report.tsv")
  : REPORT;
writeFileSync(reportPath, rows.map((r) => r.join("\t")).join("\n"));

if (!dry) writeFileSync(SHEET, JSON.stringify(sheet, null, 2) + "\n");

console.log(
  `problems=${rows.length - 1}  leetcode=${nLeet}  gfg/other=${nGfg}  none=${nNone}`
);
console.log(`report: ${reportPath}${dry ? "  (dry run, sheet not written)" : ""}`);
