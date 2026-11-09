// Checks data/dsa-patterns/ against data/a2z-sheet.json.
//
//   node scripts/check-patterns.mjs             # the gate: full coverage required
//   node scripts/check-patterns.mjs --partial   # authoring mode: coverage is a warning
//
// Pure — no network, no writes.
//
// WHY THIS EXISTS. The whole pattern tree rests on a single invariant: every
// sheet problem appears in exactly ONE pattern's `problems`. That is what keeps
// each problem in one place in the sidebar, keeps the family counts adding up,
// and — least obviously — keeps ProblemList's flat "Due for revision" list free
// of duplicate React keys, since that list flattens every group it is given.
// Nothing in the type system can enforce it, and `npm run build` will not catch
// it. This script is the only guard, so run it after every catalog edit.
//
// The other thing it guards is key drift. scripts/build-a2z-sheet.mjs can
// introduce new keys when Striver's sheet is rebuilt, and its header is
// emphatic that keys are load-bearing identity. A key this catalog names that
// the sheet no longer has is a hard failure here, never downgradable — that is
// precisely the signal that something moved.
//
// `--partial` exists for the authoring batches: it turns "this sheet problem has
// no pattern yet" into a warning so a half-written catalog has a gate it can
// pass, while every structural error stays fatal. Drop the flag once coverage
// is complete; from then on it is the gate.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { FAMILIES, PATTERNS } from "../data/dsa-patterns/index.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SHEET = join(here, "..", "data", "a2z-sheet.json");

const partial = process.argv.includes("--partial");

const sheet = JSON.parse(readFileSync(SHEET, "utf8"));

/** key -> the step title it lives in, for readable reports. */
const stepOf = new Map();
for (const step of sheet.steps) {
  for (const p of step.problems) stepOf.set(p.key, step.title);
}

const errors = [];
const warnings = [];
const ID_RE = /^[a-z0-9-]+$/;

// The id shape is not cosmetic: lib/patterns.ts builds collapse keys as
// `pat:fam:<family>::<pattern>` and its collision argument against the sheet's
// own step keys depends on an id never containing a colon or a separator.
const familyIds = new Set();
for (const f of FAMILIES) {
  if (!f.id || !ID_RE.test(f.id)) errors.push(`family id "${f.id}" must match ${ID_RE}`);
  if (familyIds.has(f.id)) errors.push(`duplicate family id "${f.id}"`);
  familyIds.add(f.id);
  if (!f.title) errors.push(`family "${f.id}" has no title`);
}

const REQUIRED = ["id", "title", "family", "hook", "cues", "template", "recall", "complexity", "traps", "problems"];
const KNOWN = new Set([...REQUIRED, "borrows", "aka"]);

/** key -> [pattern ids claiming it as primary] */
const owners = new Map();
const patternIds = new Set();

for (const p of PATTERNS) {
  const at = `pattern "${p.id ?? "(no id)"}"`;

  if (!p.id || !ID_RE.test(p.id)) errors.push(`${at}: id must match ${ID_RE}`);
  if (patternIds.has(p.id)) errors.push(`${at}: duplicate pattern id`);
  patternIds.add(p.id);

  if (!familyIds.has(p.family)) errors.push(`${at}: family "${p.family}" is not in FAMILIES`);

  for (const field of REQUIRED) {
    const v = p[field];
    const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
    if (empty) errors.push(`${at}: missing or empty "${field}"`);
  }
  // The typo-catcher. `// @ts-check` in the catalog files covers this too, but
  // only for fields the type knows about; this also fires when someone adds a
  // field the app will silently ignore.
  for (const field of Object.keys(p)) {
    if (!KNOWN.has(field)) errors.push(`${at}: unknown field "${field}"`);
  }

  if (!p.template?.java) errors.push(`${at}: template.java is required`);
  if (!p.complexity?.time || !p.complexity?.space) {
    errors.push(`${at}: complexity needs both "time" and "space"`);
  }

  const primary = p.problems ?? [];
  const borrows = p.borrows ?? [];

  for (const key of primary) {
    if (!stepOf.has(key)) errors.push(`${at}: problems lists "${key}", which is not in the sheet`);
    const seen = owners.get(key);
    if (seen) seen.push(p.id);
    else owners.set(key, [p.id]);
  }

  for (const key of borrows) {
    if (!stepOf.has(key)) errors.push(`${at}: borrows lists "${key}", which is not in the sheet`);
    if (primary.includes(key)) errors.push(`${at}: "${key}" is in both problems and borrows`);
  }
}

// The single-home rule.
for (const [key, claimedBy] of owners) {
  if (claimedBy.length > 1) {
    errors.push(`"${key}" is claimed as primary by ${claimedBy.length} patterns: ${claimedBy.join(", ")}`);
  }
}

// Coverage, grouped by step so an authoring batch has a list to work through.
const uncoveredByStep = new Map();
let covered = 0;
for (const step of sheet.steps) {
  for (const p of step.problems) {
    if (owners.has(p.key)) {
      covered++;
    } else {
      const at = uncoveredByStep.get(step.title) ?? [];
      at.push(p.name || p.key);
      uncoveredByStep.set(step.title, at);
    }
  }
}

const total = stepOf.size;
if (covered < total) {
  const msg = `${total - covered} of ${total} sheet problems have no pattern`;
  (partial ? warnings : errors).push(msg);
}

// ---- report ----------------------------------------------------------------

const borrowCount = PATTERNS.reduce((n, p) => n + (p.borrows?.length ?? 0), 0);
const noCpp = PATTERNS.filter((p) => !p.template?.cpp).length;
const noPy = PATTERNS.filter((p) => !p.template?.python).length;

console.log(
  `${sheet.steps.length} steps · ${total} problems · ${FAMILIES.length} families · ${PATTERNS.length} patterns`
);
console.log(
  `coverage ${covered}/${total}   borrows ${borrowCount}   no C++ template ${noCpp}   no Python template ${noPy}`
);

if (uncoveredByStep.size > 0) {
  console.log("\nnot yet patterned, by step:");
  for (const step of sheet.steps) {
    const missing = uncoveredByStep.get(step.title);
    if (!missing) {
      console.log(`  ✓ ${step.title} — ${step.problems.length}/${step.problems.length}`);
      continue;
    }
    const done = step.problems.length - missing.length;
    console.log(`  · ${step.title} — ${done}/${step.problems.length}`);
    for (const name of missing.slice(0, 6)) console.log(`      ${name}`);
    if (missing.length > 6) console.log(`      … and ${missing.length - 6} more`);
  }
}

for (const w of warnings) console.log(`\nwarning: ${w}`);

if (errors.length > 0) {
  console.error(`\n${errors.length} error${errors.length === 1 ? "" : "s"}:`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

console.log(partial && warnings.length > 0 ? "\n✓ structure OK (partial coverage)" : "\n✓ all checks passed");
