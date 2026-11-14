import { FAMILIES as rawFamilies, PATTERNS as rawPatterns } from "@/data/dsa-patterns/index.mjs";
import { daysSince, isDue } from "./decay";
import { windowDays } from "./schedule";
import { isCustomKey } from "./subjects";
import type { PatternDef, PatternFamily, Problem, SubGroup, TopicGroup } from "./types";

// The pattern catalog, reshaped into what the rest of the app needs.
//
// The point of this module: ProblemList already renders TopicGroup -> SubGroup
// -> Problem, with collapse, search, filtering and counts. The pattern tree is
// exactly that shape — family -> pattern -> problem — so Patterns view is not a
// second list, it is the same component fed a different TopicGroup[]. Which is
// why `patternGroups` below reads out of `byKey` and never builds a Problem:
// every row in Patterns view is the *same object* the Sheet tree holds, so a
// star toggled in one view is already toggled in the other.
//
// These are annotations, not casts. tsconfig sets `allowJs`, so tsc infers the
// literal types out of the .mjs catalog and checks them against PatternDef —
// which is what makes a pattern missing `hook`, or spelling `cues` as `cue`, a
// `npm run build` failure instead of an empty block on the page.
const FAMILIES: PatternFamily[] = rawFamilies;
const PATTERNS: PatternDef[] = rawPatterns;

export const PATTERN_FAMILIES: readonly PatternFamily[] = FAMILIES;

export const FAMILIES_BY_ID: ReadonlyMap<string, PatternFamily> = new Map(
  FAMILIES.map((f) => [f.id, f] as const)
);

export const PATTERNS_BY_ID: ReadonlyMap<string, PatternDef> = new Map(
  PATTERNS.map((p) => [p.id, p] as const)
);

/**
 * Problem key -> the one pattern that owns it. Built from `problems` only, so
 * it holds the single-home rule: `borrows` never makes a second owner. Where
 * the catalog is wrong and a key is claimed twice, the first pattern in catalog
 * order wins and scripts/check-patterns.mjs fails — the map stays usable rather
 * than throwing at import time, so a bad catalog still renders.
 */
export const PRIMARY_BY_KEY: ReadonlyMap<string, PatternDef> = (() => {
  const map = new Map<string, PatternDef>();
  for (const pattern of PATTERNS) {
    for (const key of pattern.problems) if (!map.has(key)) map.set(key, pattern);
  }
  return map;
})();

/** Problem key -> every pattern listing it under `borrows`, in catalog order. */
export const ALSO_BY_KEY: ReadonlyMap<string, PatternDef[]> = (() => {
  const map = new Map<string, PatternDef[]>();
  for (const pattern of PATTERNS) {
    for (const key of pattern.borrows ?? []) {
      const at = map.get(key);
      if (at) at.push(pattern);
      else map.set(key, [pattern]);
    }
  }
  return map;
})();

/**
 * Problem key -> extra words the sidebar search should match, so typing a
 * technique name ("union find", "monotonic") finds its problems. ProblemList's
 * own haystack is `name + " " + topic`, and `topic` is the *step* title — it
 * can never be the pattern name, because it is a user-editable field on a
 * Problem object the Sheet view shares.
 *
 * A module constant, so its identity is stable and it adds no churn to
 * ProblemList's filter memo. Building this inline in Sidebar would re-filter
 * every problem on every keystroke.
 */
export const PATTERN_HAYSTACK: Readonly<Record<string, string>> = (() => {
  const out: Record<string, string> = {};
  for (const pattern of PATTERNS) {
    const family = FAMILIES_BY_ID.get(pattern.family);
    const words = [pattern.title, family?.title ?? "", ...(pattern.aka ?? [])].join(" ");
    // `borrows` keys get the words too: the problem lives elsewhere in the
    // tree, but searching the technique should still surface it.
    for (const key of [...pattern.problems, ...(pattern.borrows ?? [])]) {
      out[key] = out[key] ? `${out[key]} ${words}` : words;
    }
  }
  return out;
})();

// Collapse keys. These land in the same flat localStorage map as the sheet's
// step and subsection keys (see lib/collapseStore.ts), so they must not be able
// to collide with either. They cannot:
//
//   * every step key is `step-NN-<slug>` and every subsection key is rooted at
//     one, so neither can start with `pat:`; no key in data/a2z-sheet.json
//     contains a colon at all, and custom groups use the `custom:` prefix
//   * family and pattern ids are checked against /^[a-z0-9-]+$/ by
//     scripts/check-patterns.mjs, so neither can smuggle in a second separator
//
// `::` appears exactly once in a pattern key, at the family -> pattern
// boundary, which is the same role it plays in a step -> subsection key. That
// keeps collapseStore's documented "only second-level keys contain `::`"
// convention true as written.
const FAMILY_PREFIX = "pat:fam:";

export function familyGroupKey(familyId: string): string {
  return `${FAMILY_PREFIX}${familyId}`;
}

export function patternGroupKey(pattern: PatternDef): string {
  return `${FAMILY_PREFIX}${pattern.family}::${pattern.id}`;
}

/** The pattern id inside a group key, or null if that key is not a pattern's. */
export function patternIdFromGroupKey(key: string): string | null {
  if (!key.startsWith(FAMILY_PREFIX)) return null;
  const at = key.indexOf("::");
  return at === -1 ? null : key.slice(at + 2);
}

// Families sort after the sheet's 19 steps, and — like lib/sheet.ts's custom
// groups — at or above 1000, which is what suppresses ProblemList's numeric
// "Step N ·" prefix (it renders the label only below 1000). Sharing that range
// with custom groups is harmless: ProblemList renders groups in array order and
// never sorts by `order`, and collapse is keyed by `key`.
const FAMILY_ORDER_BASE = 1000;

/** Where the problems the catalog has nothing to say about end up. */
const CUSTOM_FAMILY_KEY = `${FAMILY_PREFIX}custom`;
const UNASSIGNED_FAMILY_KEY = `${FAMILY_PREFIX}unassigned`;

/**
 * The pattern tree as TopicGroups, so ProblemList renders it unchanged: one
 * TopicGroup per family, one SubGroup per pattern.
 *
 * `byKey` is the map mergeProblems returns, so the Problems here are shared
 * with the Sheet tree by reference — the invariant lib/sheet.ts documents.
 *
 * Problems inside a pattern follow the catalog's authored teaching order rather
 * than `sortIndex`: a technique has a pedagogical order (the template's own
 * problem, then the hard dressings) that the sheet does not, and drag reorder
 * is off in this view anyway. A family's flat `problems` is the concatenation
 * of its patterns' arrays in that same order, which is what keeps
 * ProblemList's `loose` computation empty for every real family.
 *
 * Keys the sheet no longer has are skipped rather than thrown on, and a pattern
 * whose problems have all vanished is dropped, so the sidebar still renders
 * against a sheet the catalog has fallen behind.
 */
export function patternGroups(byKey: Map<string, Problem>): TopicGroup[] {
  const groups: TopicGroup[] = [];
  const placed = new Set<string>();

  FAMILIES.forEach((family, index) => {
    const subgroups: SubGroup[] = [];
    const flat: Problem[] = [];

    for (const pattern of PATTERNS) {
      if (pattern.family !== family.id) continue;
      const problems: Problem[] = [];
      for (const key of pattern.problems) {
        const problem = byKey.get(key);
        // Already placed => the catalog claims this key twice. Keep the first
        // home so the tree has no duplicate rows (which would break the flat
        // "due" list's React keys); check-patterns.mjs reports it.
        if (!problem || placed.has(key)) continue;
        placed.add(key);
        problems.push(problem);
      }
      if (problems.length === 0) continue;
      subgroups.push({ key: patternGroupKey(pattern), title: pattern.title, problems });
      flat.push(...problems);
    }

    if (flat.length === 0) return;
    groups.push({
      key: familyGroupKey(family.id),
      title: family.title,
      order: FAMILY_ORDER_BASE + index,
      problems: flat,
      subgroups,
      ...(family.note ? { note: family.note } : {}),
    });
  });

  // Whatever the catalog does not cover. Two buckets on purpose: a problem the
  // user added themselves has no pattern permanently and by design, so mixing
  // it in with the alarm would make the alarm permanent noise.
  //
  // Neither bucket carries `subgroups`, so its rows render through
  // ProblemList's existing `loose` path — that path is the degradation
  // mechanism, not a workaround.
  const mine: Problem[] = [];
  const unassigned: Problem[] = [];
  for (const [key, problem] of byKey) {
    if (placed.has(key)) continue;
    (isCustomKey(key) ? mine : unassigned).push(problem);
  }

  if (mine.length > 0) {
    groups.push({
      key: CUSTOM_FAMILY_KEY,
      title: "Your own problems",
      order: FAMILY_ORDER_BASE + FAMILIES.length,
      problems: mine,
      note: "Problems you added yourself — the catalog has nothing to say about these.",
    });
  }

  if (unassigned.length > 0) {
    groups.push({
      key: UNASSIGNED_FAMILY_KEY,
      title: "⚠ Not yet patterned",
      order: FAMILY_ORDER_BASE + FAMILIES.length + 1,
      problems: unassigned,
      note: "Sheet problems with no pattern yet. Run `npm run check:patterns` — it lists them by step.",
    });
  }

  return groups;
}

/**
 * The pattern page's progress strip. Wording mirrors StatsBar's.
 *
 * "Stalest" is the problem furthest through its *own* revision window, not the
 * one with the most days on it: a green on a 40-day window is not stale at day
 * 12, and a red on a 1-day window very much is at day 3. `stalestWindow` is
 * returned alongside so the caller can colour the badge on the same scale.
 */
export function patternProgress(
  problems: Problem[],
  decayDays: number
): {
  total: number;
  solved: number;
  starred: number;
  due: number;
  stalestDays: number | null;
  stalestWindow: number;
  grades: { red: number; yellow: number; green: number };
} {
  let solved = 0;
  let starred = 0;
  let due = 0;
  let stalest: number | null = null;
  let stalestWindow = decayDays;
  let worstRatio = -1;
  const grades = { red: 0, yellow: 0, green: 0 };
  for (const p of problems) {
    const win = windowDays(p, decayDays);
    if (p.status === "Solved") solved++;
    if (p.recall) grades[p.recall]++;
    if (p.starred) {
      starred++;
      const days = daysSince(p.lastRevised);
      if (Number.isFinite(days) && days / win > worstRatio) {
        worstRatio = days / win;
        stalest = days;
        stalestWindow = win;
      }
    }
    if (isDue(p.starred, p.lastRevised, win)) due++;
  }
  return { total: problems.length, solved, starred, due, stalestDays: stalest, stalestWindow, grades };
}
