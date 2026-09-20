// Scrapes Striver's *new* A2Z roadmap off takeuforward.org into a local cache at
// scripts/tuf-a2z-v2.cache.json, which build-a2z-sheet.mjs then turns into the
// seed sheet. Network is touched ONLY here, and only with --refresh, so every
// other build step is offline and reproducible.
//
//   node scripts/fetch-a2z.mjs --refresh   # re-scrape and overwrite the cache
//   node scripts/fetch-a2z.mjs             # decode the existing cache and report
//
// Why scrape HTML rather than call an API: TUF rewrote the site in Sept 2026.
// The old endpoint (takeuforward.org/api/v1/shared/sheets/strivers-a2z-dsa-track)
// now 404s; the same path on the new host backend-go.takeuforward.org still
// answers — but it serves the OLD 18-step sheet, not the new roadmap. (That host
// also rejects any request without an `Origin: https://takeuforward.org` header,
// which is a red herring worth documenting so nobody re-discovers it.) The new
// 19-module sheet ships only inside the page itself.
//
// The page is a Next.js RSC payload embedded in an inline <script>. Once the
// JS-string escaping is undone, it contains a self-describing table:
//
//   "sheet_syllabus": { fields: [[...names]], rows: [[fieldsIdx, ...values]], roots: [...] }
//
// Each row's LEADING integer indexes `fields` to name that row's columns, so the
// column layout varies per row (18 variants — an item with a video and a
// LeetCode link has different columns from a theory entry with neither). Values
// repeated across rows are replaced by "$…:rows:I:J[:K]" back-references, which
// point back into this same `rows` array.
//
// Rows form a tree: `roots` lists the 19 module rows; a row of type "category"
// carries `children`, a list of row indices that are either more categories
// (the subsections) or the leaf "item" rows.
//
// The cache keeps the payload verbatim rather than the decoded form, so a
// decoding bug found later can be fixed without re-scraping.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { extractSyllabus, walkSheet } from "./a2z-decode.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const CACHE = join(here, "tuf-a2z-v2.cache.json");
const SHEET_URL = "https://takeuforward.org/prep-hub/strivers-a2z-dsa-sheet?page=sheet";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

const refresh = process.argv.includes("--refresh");

// What the live sheet held when this script was written. A mismatch means TUF
// changed the roadmap (fine — update these) or changed the encoding (not fine).
const EXPECT = { modules: 19, subsections: 79, items: 442 };

async function scrape() {
  const res = await fetch(SHEET_URL, {
    headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
  });
  if (!res.ok) throw new Error(`GET ${SHEET_URL} → HTTP ${res.status}`);
  return extractSyllabus(await res.text());
}

const syllabus = refresh ? await scrape() : JSON.parse(readFileSync(CACHE, "utf8"));

const links = { yt_video: 0, leetcode_link: 0, free_blog_link: 0 };
const tally = walkSheet(syllabus, (item) => {
  for (const f of Object.keys(links)) if (item[f]) links[f]++;
});

for (const [k, want] of Object.entries(EXPECT)) {
  if (tally[k] !== want) {
    console.warn(`⚠ ${k}: expected ${want}, got ${tally[k]} — the roadmap may have changed again`);
  }
}

if (refresh) {
  writeFileSync(CACHE, JSON.stringify(syllabus) + "\n");
  console.log(`wrote ${CACHE}`);
}

console.log(
  `modules=${tally.modules} subsections=${tally.subsections} items=${tally.items} contests=${tally.contests}\n` +
    `yt_video=${links.yt_video} leetcode_link=${links.leetcode_link} free_blog_link=${links.free_blog_link}`
);
