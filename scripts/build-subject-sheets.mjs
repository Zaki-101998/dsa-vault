// Re-runnable generator: turns the raw Google Drive listing in
// scripts/drive-manifest.json into the seed sheets for the video-based subjects
// (data/cn-videos.json, data/os-videos.json). Pure transform — no network.
//
//   node scripts/build-subject-sheets.mjs          # write sheets + report
//   node scripts/build-subject-sheets.mjs --dry    # report only, no file write
//
// To refresh after adding videos to Drive, update the `files` arrays in
// drive-manifest.json and re-run. Keys are derived from the section slug + the
// cleaned title, so they stay stable as long as a video is not renamed.
//
// Each entry is classified `concept` or `problem`. Zack is not preparing for
// GATE, so the GATE framing in the source titles is stripped as noise; what
// matters is separating the teaching videos from the worked-question videos,
// which the UI marks skippable. "Example" is deliberately NOT a problem trigger
// — "CRC Example", "Two-Level Paging Example" and "Mutex Example" all teach a
// concept. Anything the heuristics get wrong is fixed by key in
// scripts/subject-kind-overrides.json rather than by widening the regexes.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const MANIFEST = join(here, "drive-manifest.json");
const OVERRIDES = join(here, "subject-kind-overrides.json");
const OUT = { cn: join(root, "data/cn-videos.json"), os: join(root, "data/os-videos.json") };
const dry = process.argv.includes("--dry");

const VIDEO_EXT = /\.(mp4|m4v|mkv|mov|avi|webm)$/i;
const DOC_EXT = /\.(pdf|docx?|pptx?)$/i;

// "(Not in GATE Syllabus)" / "Not_required_for_GATE" and friends. Applied after
// underscores become spaces, so both the parenthesised and underscored forms hit.
const GATE_NOTE = /\s*\(?\bnot\s+(?:in|required\s+for)\s+gate(?:\s+syllabus)?\b\)?/gi;

// Source watermark carried in some filenames; not part of the lecture title.
const NOISE_PREFIX = /^\s*Raudra\s+Eduservices\s*[-\u2013]\s*/i;

const PROBLEM_PATTERNS = [
  /\bgate\b/i,
  /\bquestions?\b/i,
  /\bproblems?\s+(?:on|\d)/i,
  /^problem\s+\d+/i,
];

function cleanName(rawTitle, index) {
  let s = rawTitle.replace(VIDEO_EXT, "").replace(DOC_EXT, "");
  // Leading ordinal: "12.Foo", "9_Foo", "10. Foo".
  const m = s.match(/^(\d+)\s*[._]\s*/);
  const ordinal = m ? Number(m[1]) : index + 1;
  if (m) s = s.slice(m[0].length);
  s = s.replace(/_/g, " ").replace(GATE_NOTE, "").replace(/\s+/g, " ").trim();
  s = s.replace(NOISE_PREFIX, "").trim();
  // A trailing " - " left behind by stripping, e.g. "Raudra Eduservices - ".
  s = s.replace(/\s*[-–]\s*$/, "").trim();
  return { name: s || rawTitle, ordinal };
}

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function classify({ name, sectionOrder, problemSections }) {
  if (problemSections.includes(sectionOrder)) return "problem";
  return PROBLEM_PATTERNS.some((re) => re.test(name)) ? "problem" : "concept";
}

const overrides = JSON.parse(readFileSync(OVERRIDES, "utf8"));
const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
const report = [["subject", "section", "key", "name", "kind", "source"].join("\t")];
let overridden = 0;

for (const subject of manifest.subjects) {
  const problemSections = subject.problemSections || [];
  const steps = subject.sections.map((section) => {
    const sectionSlug = slug(section.title);
    const seen = new Set();
    const problems = section.files.map((file, i) => {
      const { name, ordinal } = cleanName(file.title, i);
      let key = `${subject.id}:${sectionSlug}__${slug(name)}`;
      // Guard against two files in a section cleaning down to the same slug.
      if (seen.has(key)) key = `${key}-${ordinal}`;
      seen.add(key);

      const heuristic = classify({ name, sectionOrder: section.order, problemSections });
      const kind = overrides[key] ?? heuristic;
      if (overrides[key] && overrides[key] !== heuristic) overridden++;

      report.push(
        [subject.id, section.title, key, name, kind, overrides[key] ? "override" : "auto"].join("\t")
      );

      return {
        key,
        name,
        link: `https://drive.google.com/file/d/${file.id}/view`,
        difficulty: "",
        kind,
        video: { fileId: file.id },
      };
    });
    return { key: `${subject.id}-${String(section.order).padStart(2, "0")}-${sectionSlug}`, order: section.order, title: section.title, problems };
  });

  const sheet = { subject: subject.id, steps };
  if (!dry) writeFileSync(OUT[subject.id], JSON.stringify(sheet, null, 2) + "\n");

  const all = steps.flatMap((s) => s.problems);
  console.log(
    `${subject.id}: sections=${steps.length} entries=${all.length} ` +
      `concept=${all.filter((p) => p.kind === "concept").length} ` +
      `problem=${all.filter((p) => p.kind === "problem").length} ` +
      `uniqueKeys=${new Set(all.map((p) => p.key)).size}`
  );
}

const reportPath = join(
  process.env.SCRATCHPAD || root,
  "subject-sheet-report.tsv"
);
writeFileSync(reportPath, report.join("\n") + "\n");
console.log(`overrides applied: ${overridden}`);
console.log(`report: ${reportPath}${dry ? "  (dry run, sheets not written)" : ""}`);
