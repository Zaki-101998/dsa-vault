import { daysSince, isDue } from "./decay";
import type { Grade, Problem, RevEntry } from "./types";

// Per-problem revision scheduling, and the drill queue built on top of it.
//
// Until this module the vault had one revision rule: every starred problem
// turned red over the same global window (`decay_days`). A problem you had
// nailed four times nagged exactly as loudly as one you drew a blank on.
//
// Now a problem carries its own window, set by how the last recall went:
//
//   red     blank on the approach      -> 1 day
//   yellow  right pattern, fuzzy parts -> about 60% of the base window
//   green   came back cleanly          -> the window doubles, up to a cap
//
// lib/decay.ts is untouched — isDue / isOverdue / starColor always took "a
// window in days". Callers simply hand them windowDays(p, decayDays) instead of
// the global number, which is why the gold -> red star needed no change.
//
// Pure functions only: no React, no stores, no Date.now() except through
// lib/decay.ts's daysSince, so every rule here can be checked from a script.

/** A window never grows past this, however many greens in a row. */
export const MAX_INTERVAL_DAYS = 60;

/** Worst first — the order the buttons sit in, and the keys 1 / 2 / 3. */
export const GRADE_ORDER: readonly Grade[] = ["red", "yellow", "green"];

export const GRADES: Record<
  Grade,
  { label: string; dot: string; color: string; hotkey: string; meaning: string }
> = {
  red: {
    label: "Blank",
    dot: "🔴",
    color: "#e12d39",
    hotkey: "1",
    meaning: "Couldn't produce the approach — code this one again",
  },
  yellow: {
    label: "Fuzzy",
    dot: "🟡",
    color: "#f0b429",
    hotkey: "2",
    meaning: "Right pattern, but details or edge cases were shaky",
  },
  green: {
    label: "Got it",
    dot: "🟢",
    color: "#3ecf8e",
    hotkey: "3",
    meaning: "Pattern, key insight and complexity all came back",
  },
};

/**
 * The problem's revision window: its own once graded, otherwise the global
 * setting — so an ungraded problem behaves exactly as it did before grades.
 */
export function windowDays(p: Pick<Problem, "intervalDays">, decayDays: number): number {
  return p.intervalDays ?? decayDays;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * The window a problem gets after being graded.
 *
 * `prev` is its current window (null = never graded, so the global base).
 * `elapsedDays` is how long since it was last revised (Infinity = never).
 *
 * Green only grows the window when the problem was actually due — the same
 * 60% mark isDue uses. Without that, drilling a step twice in one evening
 * would double every window twice and push the whole step two months out on
 * the strength of ten minutes' short-term memory. An early green just resets
 * the clock.
 *
 * The growth floor is the base window: a green after a red goes back to the
 * base rather than crawling 1 -> 2 -> 4, since the red has already cost a
 * next-day repeat.
 */
export function nextInterval(
  prev: number | null,
  grade: Grade,
  decayDays: number,
  elapsedDays: number
): number {
  const current = prev ?? decayDays;
  if (grade === "red") return 1;
  if (grade === "yellow") return round1(Math.max(Math.round(decayDays * 0.6), current / 2, 1));
  const wasDue = elapsedDays >= current * 0.6;
  if (!wasDue) return current;
  return round1(Math.min(Math.max(current * 2, decayDays), MAX_INTERVAL_DAYS));
}

/** Recall text is kept on this many of the newest entries; older ones keep only the grade. */
const RECALL_TEXT_KEPT = 3;
export const RECALL_TEXT_MAX = 600;

/**
 * Append one revision to a rev_log, then strip the typed recall off all but the
 * newest few entries that carry one. The log rides along on every save of the
 * row, so it must not grow by a paragraph per revision forever; the grades and
 * timestamps — the part worth charting later — are kept in full.
 */
export function appendRevEntry(
  log: readonly (string | RevEntry)[],
  entry: RevEntry
): (string | RevEntry)[] {
  const next: (string | RevEntry)[] = [...log, entry];
  let withText = 0;
  for (let i = next.length - 1; i >= 0; i--) {
    const e = next[i];
    if (typeof e === "string" || !e.recall) continue;
    withText++;
    if (withText > RECALL_TEXT_KEPT) {
      const { recall: _dropped, ...rest } = e;
      void _dropped;
      next[i] = rest;
    }
  }
  return next;
}

// ---------------------------------------------------------------------------
// Drill queue
// ---------------------------------------------------------------------------

/**
 * Which slice of the pool a drill runs over. The "rounds" of a revision cycle
 * are nothing more than these presets read off the grades — there is no stored
 * round counter to get out of step with reality.
 *
 *   due    whatever the star rotation says is due now
 *   all    round 1 — everything in the pool, never-graded first
 *   shaky  round 2 — the yellows and reds
 *   reds   round 3 — the reds, plus a random tenth of the greens to check they stuck
 */
export type DrillRound = "due" | "all" | "shaky" | "reds";

export const DRILL_ROUNDS: readonly { id: DrillRound; label: string; blurb: string }[] = [
  { id: "due", label: "Due now", blurb: "What the star rotation says is due" },
  { id: "all", label: "Round 1 — everything", blurb: "Every solved or starred one, ungraded first" },
  { id: "shaky", label: "Round 2 — 🟡 + 🔴", blurb: "Only what was fuzzy or blank last time" },
  { id: "reds", label: "Round 3 — 🔴 + some 🟢", blurb: "The blanks, plus a tenth of the greens" },
];

/**
 * What can be drilled at all: something you have solved, or already put in the
 * rotation. You cannot recall an approach you never learned, so an untouched
 * problem stays out however the queue is cut.
 */
export function inDrillPool(p: Pick<Problem, "status" | "starred">): boolean {
  return p.status === "Solved" || p.starred;
}

function shuffled<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The round's problems as priority tiers, most urgent tier first. Within a
 * tier the incoming order is kept (sheet or teaching order), except `due`,
 * which is a single tier sorted by how far past its own window each one is.
 */
function tiersFor(pool: Problem[], round: DrillRound, decayDays: number, rand: () => number): Problem[][] {
  const by = (g: Grade | null) => pool.filter((p) => p.recall === g);
  switch (round) {
    case "due": {
      const overdueBy = (p: Problem) => daysSince(p.lastRevised) / windowDays(p, decayDays);
      return [
        pool
          .filter((p) => isDue(p.starred, p.lastRevised, windowDays(p, decayDays)))
          .sort((a, b) => overdueBy(b) - overdueBy(a)),
      ];
    }
    case "all":
      return [by(null), by("red"), by("yellow"), by("green")];
    case "shaky":
      return [by("red"), by("yellow")];
    case "reds": {
      const greens = by("green");
      const sample = greens.length ? Math.max(1, Math.round(greens.length * 0.1)) : 0;
      return [by("red"), shuffled(greens, rand).slice(0, sample)];
    }
  }
}

/** How many problems a round would offer from these, before any size cap. */
export function drillCount(problems: readonly Problem[], round: DrillRound, decayDays: number): number {
  const pool = dedupe(problems).filter(inDrillPool);
  // `reds` samples its greens, but the sample size is deterministic.
  return tiersFor(pool, round, decayDays, () => 0).reduce((n, t) => n + t.length, 0);
}

function dedupe(problems: readonly Problem[]): Problem[] {
  const seen = new Set<string>();
  return problems.filter((p) => (seen.has(p.key) ? false : (seen.add(p.key), true)));
}

/**
 * The keys to drill, in order.
 *
 * `size` cuts by priority *before* the final shuffle: with a cap of 10, a
 * shuffled round 1 is ten random never-graded problems in random order, not a
 * random ten of everything. `shuffle` also mixes within each tier first, so a
 * capped queue is not always the first ten problems of step 1.
 *
 * `rand` is injectable so the rules can be checked deterministically.
 */
export function buildDrillQueue(
  problems: readonly Problem[],
  opts: { round: DrillRound; size: number | null; shuffle: boolean },
  decayDays: number,
  rand: () => number = Math.random
): string[] {
  const pool = dedupe(problems).filter(inDrillPool);
  const tiers = tiersFor(pool, opts.round, decayDays, rand);
  // `due` is already ordered by urgency, which a size cap should respect.
  const mixWithin = opts.shuffle && opts.round !== "due";
  let queue = tiers.flatMap((t) => (mixWithin ? shuffled(t, rand) : t));
  if (opts.size != null) queue = queue.slice(0, opts.size);
  if (opts.shuffle) queue = shuffled(queue, rand);
  return queue.map((p) => p.key);
}
