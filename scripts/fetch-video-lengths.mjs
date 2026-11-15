// Fetches the length of every YouTube video the DSA sheet links to.
//
//   node scripts/fetch-video-lengths.mjs           # only the ids not cached yet
//   node scripts/fetch-video-lengths.mjs --force   # refetch everything
//
// Writes scripts/video-lengths.cache.json as { "<youtube id>": <seconds> }.
//
// WHY THIS EXISTS. data/revision-times.json holds a hand-written estimate of how
// long each problem takes to revise. A lecture's length is the one outside
// number available for every video-backed problem, so scripts/check-revision-
// times.mjs reads this cache and flags estimates that sit far from it. It is a
// review aid for whoever edits the estimates — nothing in the app reads it, and
// a long video is not by itself a reason to raise an estimate (Two Sum's runs
// 18 minutes because it teaches two variants and three approaches).
//
// No API key: the watch page's own HTML carries `"lengthSeconds":"1234"`. A
// video that cannot be read is skipped and reported, never written as 0.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const SHEET = join(here, "..", "data", "a2z-sheet.json");
const CACHE = join(here, "video-lengths.cache.json");
const CONCURRENCY = 4;

const force = process.argv.includes("--force");
const sheet = JSON.parse(readFileSync(SHEET, "utf8"));
const cache = !force && existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};

const ids = [
  ...new Set(
    sheet.steps
      .flatMap((s) => s.problems)
      .filter((p) => p.video?.provider === "youtube")
      .map((p) => p.video.id)
  ),
];
const todo = ids.filter((id) => !(id in cache));
console.log(`${ids.length} videos, ${todo.length} to fetch`);

async function lengthOf(id) {
  const res = await fetch(`https://www.youtube.com/watch?v=${id}`, {
    headers: { "user-agent": "Mozilla/5.0", "accept-language": "en" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const m = (await res.text()).match(/"lengthSeconds":"(\d+)"/);
  if (!m) throw new Error("no lengthSeconds in page");
  return Number(m[1]);
}

const failed = [];
let next = 0;
async function worker() {
  while (next < todo.length) {
    const id = todo[next++];
    try {
      cache[id] = await lengthOf(id);
    } catch (err) {
      failed.push(`${id}: ${err.message}`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

// Sorted keys, so a refetch produces a stable diff.
const sorted = Object.fromEntries(Object.keys(cache).sort().map((k) => [k, cache[k]]));
writeFileSync(CACHE, JSON.stringify(sorted, null, 2) + "\n");
console.log(`wrote ${Object.keys(sorted).length} lengths to ${CACHE}`);
if (failed.length) {
  console.log(`\n${failed.length} could not be read:`);
  for (const f of failed) console.log("  " + f);
}
