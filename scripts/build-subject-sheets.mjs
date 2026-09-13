// Re-runnable generator: turns the raw source listing in scripts/video-manifest.json
// into the seed sheets for the video-based subjects (data/cn-videos.json,
// data/os-videos.json, data/dbms-videos.json). Pure transform — no network.
//
//   node scripts/build-subject-sheets.mjs          # write sheets + report
//   node scripts/build-subject-sheets.mjs --dry    # report only, no file write
//
// Two kinds of source:
//   drive   — a folder of files; one file is one entry.
//   youtube — sections of either `videos` (short, already one topic each) or
//             `entries` (timestamped segments cut out of a long lecture, derived
//             by reading that video's auto-caption transcript). A section may
//             instead be a `placeholder`: a syllabus topic the course has not
//             published yet, rendered as an empty section so the gap is visible.
//
// Each entry is classified `concept` or `problem`; the UI dims `problem` entries
// and the Concepts filter hides them. Classification runs on the CLEANED title,
// which matters for DBMS: every short video is titled "… | Lecture-NN | GATE CS &
// DA | Prof. Ravindrababu Ravula", and without stripping that boilerplate the
// \bgate\b rule would mark the entire subject as problems. Patterns are per
// subject because the same word means different things: "Example" is a concept in
// CN ("CRC Example") but a worked problem in DBMS ("Example 1 on BCNF").
// Anything the heuristics get wrong is fixed by key in
// scripts/subject-kind-overrides.json rather than by widening the regexes.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const MANIFEST = join(here, "video-manifest.json");
const OVERRIDES = join(here, "subject-kind-overrides.json");
const outPath = (id) => join(root, `data/${id}-videos.json`);
const dry = process.argv.includes("--dry");

const VIDEO_EXT = /\.(mp4|m4v|mkv|mov|avi|webm)$/i;
const DOC_EXT = /\.(pdf|docx?|pptx?)$/i;

// "(Not in GATE Syllabus)" / "Not_required_for_GATE" and friends. Applied after
// underscores become spaces, so both the parenthesised and underscored forms hit.
const GATE_NOTE = /\s*\(?\bnot\s+(?:in|required\s+for)\s+gate(?:\s+syllabus)?\b\)?/gi;
// Source watermark carried in some filenames; not part of the lecture title.
const NOISE_PREFIX = /^\s*Raudra\s+Eduservices\s*[-–]\s*/i;

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Drive filename -> display name, plus its leading ordinal. */
function cleanFileName(rawTitle, index) {
  let s = rawTitle.replace(VIDEO_EXT, "").replace(DOC_EXT, "");
  const m = s.match(/^(\d+)\s*[._]\s*/);
  const ordinal = m ? Number(m[1]) : index + 1;
  if (m) s = s.slice(m[0].length);
  s = s.replace(/_/g, " ").replace(GATE_NOTE, "").replace(/\s+/g, " ").trim();
  s = s.replace(NOISE_PREFIX, "").trim();
  s = s.replace(/\s*[-–]\s*$/, "").trim();
  return { name: s || rawTitle, ordinal };
}

/** YouTube title -> display name: drop the boilerplate pipe-segments. */
function cleanVideoTitle(rawTitle, noise) {
  const parts = rawTitle.split("|").map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  const kept = parts.filter((p) => !noise.some((re) => re.test(p)));
  let name = (kept.length ? kept : parts).join(" — ");
  // Some titles omit the pipe before the lecture marker ("… Example 1 Lecture-17"),
  // so the split above leaves it attached. Requiring an l-word before the number
  // keeps legitimate trailing numbers ("Relational Algebra Query 1") intact.
  name = name.replace(/\s+l[a-z]*\s*[-–]?\s*\d+\s*$/i, "");
  return name.replace(/\s+/g, " ").trim() || rawTitle;
}

function hms(total) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

const overrides = JSON.parse(readFileSync(OVERRIDES, "utf8"));
const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
const report = [["subject", "section", "key", "name", "kind", "at", "source"].join("\t")];
let overridden = 0;

for (const subject of manifest.subjects) {
  const problemRes = (subject.problemPatterns || []).map((p) => new RegExp(p, "i"));
  const noiseRes = (subject.titleNoise || []).map((p) => new RegExp(p, "i"));
  const problemSections = subject.problemSections || [];

  const steps = subject.sections.map((section) => {
    const sectionSlug = slug(section.title);
    const seen = new Set();
    const problems = [];

    const push = (name, video, heuristicKind) => {
      let key = `${subject.id}:${sectionSlug}__${slug(name)}`;
      if (seen.has(key)) key = `${key}-${problems.length + 1}`;
      seen.add(key);
      const kind = overrides[key] ?? heuristicKind;
      if (overrides[key] && overrides[key] !== heuristicKind) overridden++;
      report.push(
        [subject.id, section.title, key, name, kind, video.t ? hms(video.t) : "", overrides[key] ? "override" : "auto"].join("\t")
      );
      problems.push({
        key,
        name,
        link: video.provider === "youtube"
          ? `https://www.youtube.com/watch?v=${video.id}${video.t ? `&t=${video.t}s` : ""}`
          : `https://drive.google.com/file/d/${video.id}/view`,
        difficulty: "",
        kind,
        video,
      });
    };

    const classify = (name, sectionOrder) =>
      problemSections.includes(sectionOrder) || problemRes.some((re) => re.test(name))
        ? "problem"
        : "concept";

    for (const [i, file] of (section.files || []).entries()) {
      const { name } = cleanFileName(file.title, i);
      push(name, { provider: "drive", id: file.id }, classify(name, section.order));
    }
    for (const [id, rawTitle] of section.videos || []) {
      const name = cleanVideoTitle(rawTitle, noiseRes);
      push(name, { provider: "youtube", id }, classify(name, section.order));
    }
    for (const e of section.entries || []) {
      // Segment kind is asserted in the manifest (it came from reading the
      // transcript), so trust it and fall back to the heuristics only if absent.
      push(e.n, { provider: "youtube", id: e.v, t: e.t }, e.k || classify(e.n, section.order));
    }

    const step = {
      key: `${subject.id}-${String(section.order).padStart(2, "0")}-${sectionSlug}`,
      order: section.order,
      title: section.title,
      problems,
    };
    if (section.placeholder) step.placeholder = section.placeholder;
    return step;
  });

  const sheet = { subject: subject.id, steps };
  if (!dry) writeFileSync(outPath(subject.id), JSON.stringify(sheet, null, 2) + "\n");

  const all = steps.flatMap((s) => s.problems);
  console.log(
    `${subject.id}: sections=${steps.length} entries=${all.length} ` +
      `concept=${all.filter((p) => p.kind === "concept").length} ` +
      `problem=${all.filter((p) => p.kind === "problem").length} ` +
      `timestamped=${all.filter((p) => p.video?.t).length} ` +
      `placeholders=${steps.filter((s) => s.placeholder).length} ` +
      `uniqueKeys=${new Set(all.map((p) => p.key)).size}`
  );
}

const reportPath = join(process.env.SCRATCHPAD || root, "subject-sheet-report.tsv");
writeFileSync(reportPath, report.join("\n") + "\n");
console.log(`overrides applied: ${overridden}`);
console.log(`report: ${reportPath}${dry ? "  (dry run, sheets not written)" : ""}`);
