// Checks data/revision-times.json against data/a2z-sheet.json.
//
//   node scripts/check-revision-times.mjs
//
// Pure — no network, no writes.
//
// WHY THIS EXISTS. The daily revision planner (lib/plan.ts) fills a time budget
// from these per-problem estimates. A sheet problem with no estimate silently
// falls back to a guess from its difficulty tag, and an estimate under a key
// the sheet no longer has is dead weight — scripts/build-a2z-sheet.mjs can
// rename keys when Striver's sheet is rebuilt. Neither shows up in
// `npm run build`, so this is the gate: run it after editing either file.
//
// It also prints, as notes only, the estimates that sit far from the length of
// the problem's own lecture (scripts/video-lengths.cache.json, written by
// scripts/fetch-video-lengths.mjs). Those are prompts to look again, not
// errors: a long video is often a long *lesson* around a short idea.

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const read = (...parts) => JSON.parse(readFileSync(join(here, "..", ...parts), "utf8"));

/** Keep in step with the rubric in lib/plan.ts. */
const MIN_MINUTES = 2;
const MAX_MINUTES = 25;

const sheet = read("data", "a2z-sheet.json");
const times = read("data", "revision-times.json");
const lengthsPath = join(here, "video-lengths.cache.json");
const lengths = existsSync(lengthsPath) ? JSON.parse(readFileSync(lengthsPath, "utf8")) : {};

const problems = sheet.steps.flatMap((s) => s.problems.map((p) => ({ ...p, step: s.title })));
const sheetKeys = new Set(problems.map((p) => p.key));

const errors = [];
for (const p of problems) {
  const t = times[p.key];
  if (!t) {
    errors.push(`no estimate: ${p.key}  (${p.step} — ${p.name})`);
    continue;
  }
  if (!Number.isInteger(t.min) || t.min < MIN_MINUTES || t.min > MAX_MINUTES)
    errors.push(`${p.key}: min must be a whole number ${MIN_MINUTES}-${MAX_MINUTES}, got ${t.min}`);
  if (typeof t.why !== "string" || !t.why.trim()) errors.push(`${p.key}: empty "why"`);
}
for (const key of Object.keys(times)) {
  if (!sheetKeys.has(key)) errors.push(`estimate for a key the sheet does not have: ${key}`);
}

// A video shared by several problems is a compilation lecture (all 22 pattern
// problems point at one 82-minute video), so its length says nothing about any
// one of them. Only single-problem videos are compared.
const uses = new Map();
for (const p of problems) {
  if (p.video?.provider === "youtube") uses.set(p.video.id, (uses.get(p.video.id) ?? 0) + 1);
}
const notes = [];
for (const p of problems) {
  const t = times[p.key];
  const secs = p.video?.provider === "youtube" && uses.get(p.video.id) === 1 ? lengths[p.video.id] : null;
  if (!t || !secs) continue;
  const video = Math.round(secs / 60);
  if (t.min <= 4 && video >= 25) notes.push(`${t.min} min but a ${video}-min video: ${p.name}`);
  if (t.min >= 10 && video <= 10) notes.push(`${t.min} min but only a ${video}-min video: ${p.name}`);
}

const total = Object.values(times).reduce((n, t) => n + (t.min || 0), 0);
console.log(`${problems.length} sheet problems, ${Object.keys(times).length} estimates, ${total} minutes in all`);
if (notes.length) {
  console.log(`\n${notes.length} worth a second look (not errors):`);
  for (const n of notes) console.log("  " + n);
}
if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  for (const e of errors) console.error("  " + e);
  process.exit(1);
}
console.log("\nOK");
