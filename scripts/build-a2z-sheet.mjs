// Re-runnable generator: merges Striver's new A2Z roadmap
// (scripts/tuf-a2z-v2.cache.json, see fetch-a2z.mjs) onto the sheet the app was
// already using (scripts/a2z-sheet-legacy.json), and writes data/a2z-sheet.json.
//
//   node scripts/build-a2z-sheet.mjs          # write sheet + audit map + report
//   node scripts/build-a2z-sheet.mjs --dry    # report only, no file writes
//
// Pure transform — no network.
//
// THE POINT OF THE MERGE. Striver's Sept 2026 rewrite reordered, renamed and
// merged problems. Taking his sheet verbatim would change the key of nearly every
// problem, and the app keys saved notes/code/stars/revision history by exactly
// that string — so a straight swap orphans all of it. Instead:
//
//   * A problem that existed before KEEPS ITS OLD KEY. It takes the new sheet's
//     name, module, subsection, tier, video and links, but its identity — and so
//     everything saved against it — is untouched. This is why there is no database
//     migration: every key already in Postgres still exists in the sheet.
//   * Where the new sheet MERGES several old problems into one, the old ones are
//     emitted in its place rather than collapsed, since each holds its own notes.
//     "Bubble Sort" + "Recursive Bubble Sort" stay two rows, both pointing at the
//     merged entry's video and links.
//   * A problem Striver genuinely DROPPED is carried over only if it has saved
//     work (scripts/a2z-worked-keys.json), placed in the subsection named in
//     CARRIED below. Dropped problems with no work are let go.
//   * Anything with no old counterpart is new, and gets a fresh key.
//
// Old keys embed a step number and title that no longer match the module they now
// sit under (`step-13-binary-trees__…` inside module 12). That is cosmetic: keys
// are opaque and never displayed. Do NOT "tidy" them — renaming a key is exactly
// the data loss this script exists to avoid.
//
// MATCHING runs in descending order of confidence — exact normalized name, then a
// shared LeetCode/GfG problem slug, then token overlap >= MIN_FUZZY — with
// scripts/a2z-key-overrides.json applied first and beating all of it. The
// normalizer is the one attach-links.mjs already uses (strips "(DP-35)",
// "[use priority queue]", "| Theory") plus an abbreviation expansion, because the
// two sheets disagree about "BT" vs "Binary Tree" and "UG" vs "undirected graph".

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { walkSheet } from "./a2z-decode.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const CACHE = join(here, "tuf-a2z-v2.cache.json");
const SHEET = join(root, "data/a2z-sheet.json");
const LEGACY = join(here, "a2z-sheet-legacy.json");
const OVERRIDES = join(here, "a2z-key-overrides.json");
const WORKED = join(here, "a2z-worked-keys.json");
const AUDIT = join(here, "a2z-key-migration.json");

const dry = process.argv.includes("--dry");

// Below this, token overlap starts pairing unrelated problems (every tree
// traversal collapsing onto "Inorder Traversal" — the trap attach-links.mjs
// documents). Anything weaker belongs in a2z-key-overrides.json instead.
const MIN_FUZZY = 0.6;

const EXPECT = { modules: 19, subsections: 79, items: 442 };

/**
 * Problems Striver dropped that carry saved work, and the subsection of the new
 * sheet each belongs in ("Module / Subsection").
 *
 * The build FAILS if a worked orphan is missing from here rather than quietly
 * dropping it — that assertion is the whole safety net.
 */
const CARRIED = {
  // The new sheet has Kadane's but not its print-the-subarray follow-up.
  "step-03-solve-problems-on-arrays__print-subarray-with-maximum-subarray-sum-extended-version-of-above-problem":
    "Arrays / FAQs(Medium)",
  "step-05-strings__remove-outermost-paranthesis": "Beginner Problems / Basic Strings",
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

// ------------------------------------------------------------------ helpers

const TUF = "https://takeuforward.org";

// The only two takeuforward URL shapes that survived the 2026 rewrite. Everything
// else it used to publish (/data-structure/…, /arrays/…, /plus/…) now 404s.
const LIVE_TUF = /^https:\/\/takeuforward\.org\/(practice\/dsa\/|blogs\/)/;
const liveLink = (url) =>
  url && (!url.includes("takeuforward.org") || LIVE_TUF.test(url)) ? url : "";

// TUF ships a few labels with stray whitespace ("Sorting ", "Flowchart Problem-Solving ").
const label = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

// The two sheets abbreviate differently; expand so "Top View of BT" and
// "Top View of Binary Tree" compare equal.
const ABBR = {
  bt: "binary tree",
  bst: "binary search tree",
  ll: "linked list",
  dll: "doubly linked list",
  sll: "singly linked list",
  ug: "undirected graph",
  dg: "directed graph",
  pq: "priority queue",
  dp: "dynamic programming",
  lis: "longest increasing subsequence",
  mst: "minimum spanning tree",
  bfs: "breadth first search",
  dfs: "depth first search",
};

// Same shape as the normalizer in attach-links.mjs: the old sheet tags names with
// "(DP-35)", "[use priority queue]" and "| Theory" that the new one does not.
const base = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\|.*$/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const norm = (s) =>
  base(s)
    .split(" ")
    .map((w) => ABBR[w] ?? w)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

const nameKey = (s) => norm(s).replace(/\s+/g, "");

const STOP = new Set(
  "a an the of in on to and or for using with given problem problems number numbers array arrays".split(" ")
);
const tokens = (s) => new Set(norm(s).split(" ").filter((w) => w && !STOP.has(w)));

function jaccard(a, b) {
  let shared = 0;
  for (const x of a) if (b.has(x)) shared++;
  return shared / (a.size + b.size - shared || 1);
}

/** Canonical problem id shared by both sheets: the LeetCode/GfG URL slug. */
const practiceSlug = (url) => {
  const m = /(?:leetcode\.com\/problems|geeksforgeeks\.org\/problems)\/([a-z0-9-]+)/i.exec(url || "");
  return m ? m[1].replace(/-/g, "") : null;
};

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

// ------------------------------------------------------------- load the data

const syllabus = JSON.parse(readFileSync(CACHE, "utf8"));
const flat = [];
const tally = walkSheet(syllabus, (item, { module, subsection }) => {
  flat.push({ item, module: label(module.label), subsection: label(subsection?.label) });
});
for (const [k, want] of Object.entries(EXPECT)) {
  if (tally[k] !== want) console.warn(`⚠ ${k}: expected ${want}, got ${tally[k]}`);
}

if (!existsSync(LEGACY)) throw new Error(`missing ${LEGACY} — it is the matching source of truth`);
const legacy = JSON.parse(readFileSync(LEGACY, "utf8"));
const oldProblems = legacy.steps.flatMap((s, si) =>
  s.problems.map((p, pi) => ({ ...p, step: s.title, order: si * 1000 + pi }))
);

const overrides = Object.fromEntries(
  Object.entries(JSON.parse(readFileSync(OVERRIDES, "utf8"))).filter(([k]) => !k.startsWith("_"))
);
const workedKeys = new Set(JSON.parse(readFileSync(WORKED, "utf8")));

// ---------------------------------------------------------------- matching

const bySlug = new Map(flat.map((f) => [f.item.slug, f]));
for (const [oldKey, slug] of Object.entries(overrides)) {
  if (!bySlug.has(slug)) throw new Error(`override ${oldKey} -> ${slug}: no such item in the cache`);
}

const byName = new Map();
const byPractice = new Map();
for (const f of flat) {
  const n = nameKey(f.item.label);
  if (!byName.has(n)) byName.set(n, f);
  const l = practiceSlug(f.item.leetcode_link);
  if (l && !byPractice.has(l)) byPractice.set(l, f);
}

/** new item -> the old problems that resolved to it */
const claims = new Map();
const orphans = [];
const via = { override: 0, exact: 0, practice: 0, fuzzy: 0, none: 0 };

for (const p of oldProblems) {
  let hit = null;
  let how = "none";
  let score = 1;

  if (overrides[p.key]) {
    hit = bySlug.get(overrides[p.key]);
    how = "override";
  }
  if (!hit) {
    hit = byName.get(nameKey(p.name));
    if (hit) how = "exact";
  }
  if (!hit) {
    const l = practiceSlug(p.practice);
    if (l && byPractice.has(l)) {
      hit = byPractice.get(l);
      how = "practice";
    }
  }
  if (!hit) {
    const t = tokens(p.name);
    let best = null;
    let bestScore = 0;
    for (const f of flat) {
      const s = jaccard(t, tokens(f.item.label));
      if (s > bestScore) {
        bestScore = s;
        best = f;
      }
    }
    if (best && bestScore >= MIN_FUZZY) {
      hit = best;
      how = "fuzzy";
      score = Number(bestScore.toFixed(2));
    }
  }

  via[how]++;
  if (!hit) {
    orphans.push(p);
    continue;
  }
  if (!claims.has(hit)) claims.set(hit, []);
  claims.get(hit).push({ ...p, via: how, score });
}

// A worked problem Striver dropped must have a home, or we would silently lose it.
const workedOrphans = orphans.filter((p) => workedKeys.has(p.key));
const unplaced = workedOrphans.filter((p) => !CARRIED[p.key]);
if (unplaced.length) {
  throw new Error(
    `${unplaced.length} problem(s) with saved work have no counterpart and no CARRIED placement:\n` +
      unplaced.map((p) => `  ${p.key}   (${p.step} — "${p.name}")`).join("\n") +
      `\nAdd each to CARRIED in scripts/build-a2z-sheet.mjs with the subsection it belongs in.`
  );
}

// ------------------------------------------------------------- emit the sheet

const steps = [];
let currentStep = null;
const seenKeys = new Set();
const audit = {};

const uniqueKey = (want) => {
  let key = want;
  let n = 2;
  while (seenKeys.has(key)) key = `${want}-${n++}`;
  seenKeys.add(key);
  return key;
};

/** One emitted problem: new-sheet content, on whichever key it should carry. */
function makeProblem({ key, name, item, subsection, legacyLinks }) {
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

  // Fill a missing PRACTICE link from the old sheet — those point at LeetCode and
  // GfG, which are third-party and still live.
  //
  // The article is deliberately NOT backfilled. Every takeuforward URL the old
  // sheet carried (/data-structure/…, /arrays/…, /plus/…) was deleted in the 2026
  // rewrite and now 404s, so backfilling would quietly reintroduce dead links —
  // which is exactly how 206 of them ended up in the sheet.
  if (legacyLinks && !p.practice && legacyLinks.practice) p.practice = legacyLinks.practice;
  return p;
}

for (const f of flat) {
  const { item, module, subsection } = f;
  if (!currentStep || currentStep.moduleLabel !== module) {
    currentStep = {
      moduleLabel: module,
      key: `step-${String(steps.length + 1).padStart(2, "0")}-${slugify(module)}`,
      order: steps.length + 1,
      title: module,
      problems: [],
    };
    steps.push(currentStep);
  }

  const olds = (claims.get(f) ?? []).sort((a, b) => a.order - b.order);

  if (olds.length === 0) {
    // Genuinely new: Striver added it in the rewrite.
    currentStep.problems.push(
      makeProblem({ key: uniqueKey(slugify(item.slug)), name: label(item.label), item, subsection })
    );
    continue;
  }

  // One old problem -> it simply keeps its key and takes the new name.
  // Several -> the new sheet merged them; emit each, keeping its own name so the
  // distinction that made them separate problems survives.
  const merged = olds.length > 1;
  for (const o of olds) {
    currentStep.problems.push(
      makeProblem({
        key: uniqueKey(o.key),
        name: merged ? o.name : label(item.label),
        item,
        subsection,
        legacyLinks: o,
      })
    );
    audit[o.key] = { newItem: item.slug, via: o.via, score: o.score, merged };
  }
}

// Carried-over problems Striver dropped, appended to the subsection named for each.
const placed = [];
for (const p of workedOrphans) {
  const [moduleTitle, subTitle] = CARRIED[p.key].split(" / ");
  const step = steps.find((s) => s.title === moduleTitle);
  if (!step) throw new Error(`CARRIED ${p.key}: no module titled "${moduleTitle}"`);
  const lastIndex = step.problems.reduce((at, x, i) => (x.section === subTitle ? i : at), -1);
  if (lastIndex === -1) {
    throw new Error(`CARRIED ${p.key}: module "${moduleTitle}" has no subsection "${subTitle}"`);
  }

  const carried = {
    key: uniqueKey(p.key),
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
  placed.push(p);
}

for (const s of steps) delete s.moduleLabel;
const sheet = { steps };
const allProblems = steps.flatMap((s) => s.problems);

// -------------------------------------------------------------- assertions

const keys = allProblems.map((p) => p.key);
const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
if (dupes.length) throw new Error(`duplicate problem keys: ${[...new Set(dupes)].join(", ")}`);

// THE guarantee: nothing with saved work may fall out of the sheet.
const emitted = new Set(keys);
const missing = [...workedKeys].filter((k) => !emitted.has(k));
if (missing.length) {
  throw new Error(
    `${missing.length} key(s) with saved work are missing from the rebuilt sheet:\n` +
      missing.map((k) => "  " + k).join("\n")
  );
}

// No problem may lose its practice link — those are third-party and still live.
// (The article is allowed to disappear: see makeProblem.)
const legacyByKey = new Map(oldProblems.map((p) => [p.key, p]));
const regressed = allProblems.filter((p) => {
  const o = legacyByKey.get(p.key);
  return o && o.practice && !p.practice;
});
if (regressed.length) {
  throw new Error(
    `${regressed.length} problem(s) lost a practice link: ${regressed.map((p) => p.key).join(", ")}`
  );
}

// Anything pointing at a takeuforward path the rewrite deleted is a dead link,
// so fail rather than ship one.
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

const report = [["old_key", "old_step", "old_name", "via", "score", "outcome"].join("\t")];
for (const p of oldProblems) {
  const a = audit[p.key];
  if (a) report.push([p.key, p.step, p.name, a.via, a.score, a.merged ? "kept (merge)" : "kept"].join("\t"));
  else if (CARRIED[p.key]) report.push([p.key, p.step, p.name, "carried", "", CARRIED[p.key]].join("\t"));
  else report.push([p.key, p.step, p.name, "none", "", "dropped (no saved work)"].join("\t"));
}
const reportPath = process.env.SCRATCHPAD
  ? join(process.env.SCRATCHPAD, "a2z-merge.tsv")
  : join(root, "..", "a2z-merge.tsv");
writeFileSync(reportPath, report.join("\n") + "\n");

if (!dry) {
  writeFileSync(SHEET, JSON.stringify(sheet, null, 2) + "\n");
  writeFileSync(AUDIT, JSON.stringify(audit, null, 2) + "\n");
}

const mergeCount = [...claims.values()].filter((v) => v.length > 1).length;
console.log(
  `modules=${steps.length} subsections=${sections.size} problems=${allProblems.length}\n` +
    `  kept from the old sheet (own key) : ${Object.keys(audit).length}\n` +
    `  brand new                         : ${allProblems.length - Object.keys(audit).length - placed.length}\n` +
    `  carried (dropped but worked on)   : ${placed.length}\n` +
    `matched via: override=${via.override} exact=${via.exact} practice=${via.practice} fuzzy=${via.fuzzy}; ` +
    `${mergeCount} merges kept as separate rows\n` +
    `dropped with no saved work: ${orphans.length - placed.length}\n` +
    `links: video=${allProblems.filter((p) => p.video).length} ` +
    `tuf=${allProblems.filter((p) => p.tufPractice).length} ` +
    `leetcode/gfg=${allProblems.filter((p) => p.practice).length} ` +
    `article=${allProblems.filter((p) => p.link).length} ` +
    `none=${allProblems.filter((p) => !p.video && !p.tufPractice && !p.practice && !p.link).length}\n` +
    `✓ all ${workedKeys.size} keys with saved work are present\n` +
    `report: ${reportPath}${dry ? "  (dry run, nothing written)" : ""}`
);
