// Re-runnable generator: lays Striver's live A2Z roadmap
// (scripts/tuf-a2z-v2.cache.json, see fetch-a2z.mjs) over the problem keys the app
// already uses (scripts/a2z-anchors.json), and writes data/a2z-sheet.json.
//
//   node scripts/build-a2z-sheet.mjs          # write sheet + anchors + report
//   node scripts/build-a2z-sheet.mjs --dry    # report only, no file writes
//
// Pure transform — no network.
//
// KEYS ARE IDENTITY. The app keys saved notes/code/stars/revision history by each
// problem's `key`, and user_settings.focus + the sidebar collapse state by each
// step's `key`. So a re-scrape may ADD rows and update names, links, videos and
// placement, but it must never drop a key or quietly point one at a different
// problem — either orphans saved work or, worse, shows it under the wrong name.
//
// HOW. scripts/a2z-anchors.json is a lockfile: for every key the app has ever
// shipped it records the TUF item the key belongs to ({slug, occ} — occ because
// TUF reuses slugs, e.g. "Basic Hashing" sits in two modules under one slug), and
// for every module title its step key. The build:
//
//   1. attaches each anchored key to exactly its anchored item;
//   2. gives every live item no key claims a fresh key, from its slug;
//   3. writes the lockfile back with those new keys added.
//
// There is deliberately no name/link matching any more. Until Nov 2026 this
// script matched the pre-rewrite sheet onto the new one by name, LeetCode slug and
// token overlap; when TUF added 53 problems, that matcher re-pointed 8 existing
// keys and dropped 3 (first-match-wins on a shared practice link), and its fuzzy
// tier had already filed "Maximum Sum Combination" under "Combination Sum". The
// anchors were frozen from what the app showed on 20 Nov 2026, which is the only
// definition of a key's identity that matters: what the user wrote notes against.
//
// Where TUF MERGES problems (several keys on one item), each key still gets its
// own row, keeping its own old name so the distinction survives — "Bubble Sort"
// and "Recursive Bubble Sort" used to be two rows on one video this way. Where TUF
// later splits one back out, REHOME moves the key onto its own item. Where TUF
// DROPS an item, its keys must be listed in CARRIED or the build fails.
//
// Old keys embed a step number and title that no longer match where they sit
// (`step-13-binary-trees__…` inside module 13 of 20). That is cosmetic: keys are
// opaque and never displayed. Do NOT "tidy" them.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { walkSheet } from "./a2z-decode.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const CACHE = join(here, "tuf-a2z-v2.cache.json");
const SHEET = join(root, "data/a2z-sheet.json");
const LEGACY = join(here, "a2z-sheet-legacy.json");
const ANCHORS = join(here, "a2z-anchors.json");
const WORKED = join(here, "a2z-worked-keys.json");

const dry = process.argv.includes("--dry");

const EXPECT = { modules: 20, subsections: 84, items: 495 };

/**
 * Keys with no live TUF item (Striver dropped the problem) and the subsection each
 * is shown in ("Module / Subsection"). The build FAILS if an anchored key loses its
 * item and is missing from here — that assertion is the whole safety net.
 */
const CARRIED = {
  // The new sheet has Kadane's but not its print-the-subarray follow-up.
  "step-03-solve-problems-on-arrays__print-subarray-with-maximum-subarray-sum-extended-version-of-above-problem":
    "Arrays / FAQs(Medium)",
  // Recursion's own atoi drill; TUF's "String to Integer (atoi)" is the iterative
  // string problem and has its own row in Strings (Basic and Medium).
  "step-07-recursion__recursive-implementation-of-atoi": "Recursion / Implementation Problems",
  "step-13-binary-trees__binary-tree-representation-in-java": "Binary Trees / Theory/Traversals",
  "step-13-binary-trees__binary-tree-traversals-in-binary-tree": "Binary Trees / Theory/Traversals",
  // Distinct from the new sheet's "Print root to leaf path in BT" — node, not leaf.
  "step-13-binary-trees__root-to-node-path-in-binary-tree": "Binary Trees / FAQs",
  "step-15-graphs__graph-representation-java": "Graphs / Theory and traversals",
  // The new sheet folds both into a single "Traversal Techniques" entry.
  "step-15-graphs__bfs": "Graphs / Theory and traversals",
  "step-15-graphs__dfs": "Graphs / Theory and traversals",
  "step-15-graphs__cycle-detection-in-unirected-graph-bfs": "Graphs / Cycles",
  "step-15-graphs__why-priority-queue-is-used-in-djisktra-s-algorithm":
    "Graphs / Shortest Path Algorithms",
};

/**
 * Keys that move to a different TUF item: `key -> slug` (occurrence 0).
 *
 * Only for keys whose row ALREADY showed the target problem's name — a merged row
 * keeping its own old name, or a carried one — so moving it changes where the row
 * sits, never what it is. Once a build has written the move into the anchors an
 * entry here is a no-op, but keep it as the record of why the key moved.
 */
const REHOME = {
  // Nov 2026: TUF split these back out of the merged entries they shared.
  "step-02-learn-important-sorting-techniques__recursive-bubble-sort": "recursive-bubble-sort", // was on Bubble Sort
  "step-04-binary-search__count-occurrences-of-a-number-in-a-sorted-array-with-duplicates":
    "count-occurrences-in-a-sorted-array", // was on First and Last Occurrence
  "step-06-learn-linkedlist__reverse-a-dll": "reverse-a-doubly-linked-list", // was on Reverse a LL
  // A fuzzy-match mistake: it was filed under Recursion's "Combination Sum".
  "step-11-heaps__maximum-sum-combination": "maximum-sum-combination",
  // Was carried (Striver had dropped it); now back, in the new Strings module.
  "step-05-strings__remove-outermost-paranthesis": "remove-outermost-parentheses",
};

/**
 * Keys taken out of the sheet entirely. Only for duplicates the app made itself,
 * and the build refuses any key that carries saved work (scripts/a2z-worked-keys.json
 * — refresh it from a fresh backup before adding to this list).
 */
const REMOVE = {
  // The pre-rewrite sheet listed Assign Cookies under both Greedy and DP; both rows
  // ended up side by side in Greedy → Easy. TUF lists it once.
  "step-16-dynamic-programming__assign-cookies": "duplicate of step-12-greedy-algorithms__assign-cookies",
};

// ------------------------------------------------------------------ helpers

const TUF = "https://takeuforward.org";

// The only two takeuforward URL shapes that survived the 2026 rewrite. Everything
// else it used to publish (/data-structure/…, /arrays/…, /plus/…) now 404s.
const LIVE_TUF = /^https:\/\/takeuforward\.org\/(practice\/dsa\/|blogs\/)/;
const liveLink = (url) =>
  url && (!url.includes("takeuforward.org") || LIVE_TUF.test(url)) ? url : "";

// TUF ships a few labels with stray whitespace ("Sorting ", "Flowchart Problem-Solving ").
const label = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

/**
 * TUF's `yt_video` in the three shapes it ships: `youtu.be/ID`, `youtu.be/ID?t=N`,
 * and `youtube.com/watch?v=ID&list=…&index=N`. `list`/`index` are dropped — `v`
 * already identifies the video, and VideoRef has no room for a playlist position.
 */
function parseVideo(url) {
  if (!url) return null;
  const id = /(?:youtu\.be\/|[?&]v=)([A-Za-z0-9_-]{6,})/.exec(url)?.[1];
  if (!id) return null;
  const t = /[?&]t=(\d+)/.exec(url)?.[1];
  const video = { provider: "youtube", id };
  if (t) video.t = Number(t);
  return video;
}

// TUF's own slugs contain apostrophes, commas and parentheses ("kadane's-algorithm",
// "pow(x,n)"). Only brand-new problems get one, so tidying them costs nothing.
const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const ref = (slug, occ) => `${slug}#${occ}`;

// ------------------------------------------------------------- load the data

const syllabus = JSON.parse(readFileSync(CACHE, "utf8"));
const flat = [];
const occSeen = new Map();
const tally = walkSheet(syllabus, (item, { module, subsection }) => {
  const occ = occSeen.get(item.slug) ?? 0;
  occSeen.set(item.slug, occ + 1);
  flat.push({ item, occ, module: label(module.label), subsection: label(subsection?.label) });
});
for (const [k, want] of Object.entries(EXPECT)) {
  if (tally[k] !== want) console.warn(`⚠ ${k}: expected ${want}, got ${tally[k]}`);
}
const byRef = new Map(flat.map((f) => [ref(f.item.slug, f.occ), f]));

if (!existsSync(ANCHORS)) throw new Error(`missing ${ANCHORS} — it is the source of truth for every key`);
const anchorsDoc = JSON.parse(readFileSync(ANCHORS, "utf8"));
const anchors = anchorsDoc.problems;
const stepAnchors = anchorsDoc.steps;

// The pre-rewrite sheet: names for merged rows, practice links to backfill, and
// the full record of carried problems.
const legacy = JSON.parse(readFileSync(LEGACY, "utf8"));
const legacyByKey = new Map(legacy.steps.flatMap((s) => s.problems.map((p) => [p.key, p])));
const workedKeys = new Set(JSON.parse(readFileSync(WORKED, "utf8")));

// ---------------------------------------------------------- resolve anchors

for (const [k, slug] of Object.entries(REHOME)) {
  if (!anchors[k]) throw new Error(`REHOME ${k}: not an anchored key`);
  if (!byRef.has(ref(slug, 0))) throw new Error(`REHOME ${k} -> ${slug}: no such item in the cache`);
}
for (const k of Object.keys(REMOVE)) {
  if (workedKeys.has(k)) throw new Error(`REMOVE ${k}: it has saved work — keep the row`);
}

/** flat entry -> keys attached to it, in lockfile order */
const claims = new Map();
const carriedKeys = [];
const lostItem = [];
let rehomed = 0;

for (const [key, a] of Object.entries(anchors)) {
  if (REMOVE[key]) continue;
  let target = null;
  if (REHOME[key]) {
    target = ref(REHOME[key], 0);
    if (a.carried || a.slug !== REHOME[key]) rehomed++;
  } else if (a.carried || CARRIED[key]) {
    carriedKeys.push(key);
    continue;
  } else {
    target = ref(a.slug, a.occ);
  }
  const f = byRef.get(target);
  if (!f) {
    lostItem.push(`  ${key}   (was on "${target}")`);
    continue;
  }
  if (!claims.has(f)) claims.set(f, []);
  claims.get(f).push(key);
}
if (lostItem.length) {
  throw new Error(
    `${lostItem.length} key(s) are attached to an item TUF no longer lists:\n${lostItem.join("\n")}\n` +
      `Add each to CARRIED with the subsection it belongs in (or REHOME it, if TUF renamed the slug).`
  );
}
const unplaced = carriedKeys.filter((k) => !CARRIED[k]);
if (unplaced.length) throw new Error(`carried keys with no CARRIED placement: ${unplaced.join(", ")}`);

// ------------------------------------------------------------- emit the sheet

const steps = [];
let currentStep = null;
const seenKeys = new Set(Object.keys(anchors)); // never mint a key the lockfile knows, removed ones included
const emittedKeys = new Set();
const nextAnchors = {};
const added = [];

const freshKey = (want) => {
  let key = want;
  let n = 2;
  while (seenKeys.has(key)) key = `${want}-${n++}`;
  seenKeys.add(key);
  return key;
};

/** One emitted problem: live-sheet content, on whichever key it carries. */
function makeProblem({ key, name, item, subsection }) {
  const p = {
    key,
    name,
    link: item.free_blog_link ? `${TUF}${item.free_blog_link}` : "",
    difficulty: { basic: "Basic", core: "Core", pro: "Pro" }[item.difficulty] ?? "",
  };
  if (item.leetcode_link) p.practice = item.leetcode_link;
  // TUF's own practice problems are free now. Their URL is built from the RAW
  // slug, not the sanitised key: /practice/dsa/lower-bound- really does end in a
  // hyphen, and one problem's slug is literally "pow(x,n)".
  if (item.layoutType === "practice") p.tufPractice = `${TUF}/practice/dsa/${item.slug}`;
  const video = parseVideo(item.yt_video);
  if (video) p.video = video;
  if (subsection) p.section = subsection;

  // Fill a missing PRACTICE link from the pre-rewrite sheet — those point at
  // LeetCode and GfG, which are third-party and still live. The article is
  // deliberately NOT backfilled: every takeuforward URL that sheet carried was
  // deleted in the 2026 rewrite and now 404s.
  const old = legacyByKey.get(key);
  if (old && !p.practice && old.practice) p.practice = old.practice;
  return p;
}

for (const f of flat) {
  const { item, occ, module, subsection } = f;
  if (!currentStep || currentStep.title !== module) {
    const key = stepAnchors[module] ?? `step-${slugify(module)}`;
    currentStep = { key, order: steps.length + 1, title: module, problems: [] };
    steps.push(currentStep);
  }

  let keys = claims.get(f);
  if (!keys) {
    // Nothing the app knows: Striver added it.
    keys = [freshKey(slugify(item.slug))];
    added.push({ key: keys[0], name: label(item.label), where: `${module} / ${subsection}` });
  }

  // One key -> it takes the live name. Several -> TUF merged them; each keeps its
  // own name so the distinction that made them separate problems survives.
  const merged = keys.length > 1;
  for (const key of keys) {
    const name = merged ? legacyByKey.get(key)?.name ?? label(item.label) : label(item.label);
    currentStep.problems.push(makeProblem({ key, name, item, subsection }));
    emittedKeys.add(key);
    nextAnchors[key] = { slug: item.slug, occ };
  }
}

// Carried problems, appended to the subsection named for each.
for (const key of carriedKeys) {
  const p = legacyByKey.get(key);
  if (!p) throw new Error(`carried key ${key} is not in ${LEGACY}`);
  const [moduleTitle, subTitle] = CARRIED[key].split(" / ");
  const step = steps.find((s) => s.title === moduleTitle);
  if (!step) throw new Error(`CARRIED ${key}: no module titled "${moduleTitle}"`);
  const lastIndex = step.problems.reduce((at, x, i) => (x.section === subTitle ? i : at), -1);
  if (lastIndex === -1) throw new Error(`CARRIED ${key}: module "${moduleTitle}" has no subsection "${subTitle}"`);

  const carried = {
    key,
    name: p.name,
    // Most of these carry a takeuforward article the rewrite deleted; drop it
    // rather than ship a 404. They keep any third-party practice link below.
    link: liveLink(p.link),
    // The old sheet's Easy/Medium/Hard has no exact tier equivalent; map to the
    // nearest so these rows don't render blank next to Striver's.
    difficulty: p.difficulty === "Easy" ? "Basic" : p.difficulty === "Hard" ? "Pro" : "Core",
    section: subTitle,
  };
  if (p.practice) carried.practice = p.practice;
  step.problems.splice(lastIndex + 1, 0, carried);
  emittedKeys.add(key);
  nextAnchors[key] = { carried: true };
}

const sheet = { steps };
const allProblems = steps.flatMap((s) => s.problems);

// -------------------------------------------------------------- assertions

const keys = allProblems.map((p) => p.key);
const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
if (dupes.length) throw new Error(`duplicate problem keys: ${[...new Set(dupes)].join(", ")}`);

// THE guarantee: every key the app has shipped is still here, bar deliberate removals.
const missing = Object.keys(anchors).filter((k) => !REMOVE[k] && !emittedKeys.has(k));
if (missing.length) throw new Error(`${missing.length} anchored key(s) fell out of the sheet:\n  ${missing.join("\n  ")}`);
const missingWorked = [...workedKeys].filter((k) => !emittedKeys.has(k));
if (missingWorked.length) throw new Error(`keys with saved work missing: ${missingWorked.join(", ")}`);

// …and still on the item it was on, bar REHOME.
const moved = Object.entries(anchors).filter(([k, a]) => {
  if (REMOVE[k] || REHOME[k] || a.carried) return false;
  const n = nextAnchors[k];
  return n.carried ? !CARRIED[k] : n.slug !== a.slug || n.occ !== a.occ;
});
if (moved.length) throw new Error(`keys re-pointed outside REHOME: ${moved.map(([k]) => k).join(", ")}`);

// Step keys are stored by the planner and the sidebar; a module TUF renames
// would silently get a new one. Map the new title onto the old key in the
// lockfile's `steps` instead.
const stepKeys = new Set(steps.map((s) => s.key));
if (stepKeys.size !== steps.length) throw new Error("duplicate step keys");
const lostSteps = Object.entries(stepAnchors).filter(([, k]) => !stepKeys.has(k));
if (lostSteps.length) {
  throw new Error(
    `module(s) gone or renamed — their step key would change:\n` +
      lostSteps.map(([t, k]) => `  "${t}" (${k})`).join("\n") +
      `\nIn ${ANCHORS} → steps, re-key the old step under the module's new title.`
  );
}

// No problem may lose its practice link — those are third-party and still live.
const regressed = allProblems.filter((p) => {
  const o = legacyByKey.get(p.key);
  return o && o.practice && !p.practice;
});
if (regressed.length) {
  throw new Error(`${regressed.length} problem(s) lost a practice link: ${regressed.map((p) => p.key).join(", ")}`);
}

// Anything pointing at a takeuforward path the rewrite deleted is a dead link.
const deadTuf = allProblems.flatMap((p) =>
  [p.link, p.practice, p.tufPractice]
    .filter((u) => u && u.includes("takeuforward.org") && !LIVE_TUF.test(u))
    .map((u) => `${p.key}: ${u}`)
);
if (deadTuf.length) {
  throw new Error(
    `${deadTuf.length} dead takeuforward link(s) — the 2026 rewrite deleted these paths:\n` +
      deadTuf.slice(0, 10).map((x) => "  " + x).join("\n")
  );
}

const sections = new Set();
for (const s of steps) for (const p of s.problems) if (p.section) sections.add(`${s.key}::${p.section}`);
if (steps.length !== EXPECT.modules) throw new Error(`expected ${EXPECT.modules} modules, got ${steps.length}`);
if (sections.size !== EXPECT.subsections) {
  throw new Error(`expected ${EXPECT.subsections} subsections, got ${sections.size}`);
}
const badTier = allProblems.filter((p) => p.difficulty && !["Basic", "Core", "Pro"].includes(p.difficulty));
if (badTier.length) throw new Error(`unexpected difficulty on ${badTier.length} problems`);

// ------------------------------------------------------------------ output

const report = [["change", "key", "name", "where"].join("\t")];
for (const a of added) report.push(["added", a.key, a.name, a.where].join("\t"));
for (const [k, slug] of Object.entries(REHOME)) report.push(["rehome", k, legacyByKey.get(k)?.name ?? "", slug].join("\t"));
for (const [k, why] of Object.entries(REMOVE)) if (anchors[k]) report.push(["removed", k, "", why].join("\t"));
const reportPath = process.env.SCRATCHPAD
  ? join(process.env.SCRATCHPAD, "a2z-sync.tsv")
  : join(root, "..", "a2z-sync.tsv");
writeFileSync(reportPath, report.join("\n") + "\n");

if (!dry) {
  writeFileSync(SHEET, JSON.stringify(sheet, null, 2) + "\n");
  // Removed keys stay in the lockfile (marked) so a later build never re-mints them.
  for (const k of Object.keys(REMOVE)) if (anchors[k]) nextAnchors[k] = { ...anchors[k], removed: true };
  const stepsOut = { ...stepAnchors };
  for (const s of steps) stepsOut[s.title] ??= s.key;
  writeFileSync(
    ANCHORS,
    JSON.stringify({ _comment: anchorsDoc._comment, steps: stepsOut, problems: nextAnchors }, null, 2) + "\n"
  );
}

console.log(
  `modules=${steps.length} subsections=${sections.size} problems=${allProblems.length} (TUF items=${flat.length})\n` +
    `  anchored keys kept : ${emittedKeys.size - added.length - carriedKeys.length}\n` +
    `  brand new          : ${added.length}\n` +
    `  carried            : ${carriedKeys.length}\n` +
    `  rehomed            : ${rehomed}\n` +
    `  removed            : ${Object.keys(REMOVE).filter((k) => anchors[k] && !anchors[k].removed).length}\n` +
    `links: video=${allProblems.filter((p) => p.video).length} ` +
    `tuf=${allProblems.filter((p) => p.tufPractice).length} ` +
    `leetcode/gfg=${allProblems.filter((p) => p.practice).length} ` +
    `article=${allProblems.filter((p) => p.link).length} ` +
    `none=${allProblems.filter((p) => !p.video && !p.tufPractice && !p.practice && !p.link).length}\n` +
    `✓ every anchored key present and on its item; all ${workedKeys.size} keys with saved work present\n` +
    `report: ${reportPath}${dry ? "  (dry run, nothing written)" : ""}`
);
