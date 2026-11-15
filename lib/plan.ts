import rawTimes from "@/data/revision-times.json";
import { PRIMARY_BY_KEY } from "./patterns";
import { inDrillPool } from "./schedule";
import type { Focus, Grade, Problem } from "./types";

// The daily revision planner: "here is how long I have, hand me the problems".
//
// lib/schedule.ts answers WHEN a problem is due, one problem at a time. This
// module answers a different question — given one topic to work through and a
// number of minutes, which problems go on the list — and it leans on three
// things:
//
//   an estimate   data/revision-times.json: minutes to revise each sheet
//                 problem, written by hand from what the problem demands
//   the grade     the last recall grade scales that estimate — a 🟢 is a quick
//                 confirmation, a 🔴 is nearly a re-solve
//   a walk order  the topic taken pattern by pattern, so a day's list is a few
//                 related problems rather than whatever the sheet interleaved
//
// It deliberately keeps no plan and no day counter. Progress is one fact read
// off data the vault already stores: a problem is covered once it has been
// revised since the topic was started. A day that was skipped, or half done,
// therefore needs no bookkeeping — the next plan simply starts from whatever is
// still uncovered.
//
// Pure functions only, like lib/schedule.ts: no React, no stores, and no clock.
// Every time a rule needs arrives as an argument, so the rules can be checked
// from a script.

const TIMES: Readonly<Record<string, { min: number; why: string }>> = rawTimes;

/**
 * How the last grade scales a problem's estimate. The estimate itself is
 * written at 🟡 level: recall the approach, walk the key steps and edge cases,
 * skim your own notes. A problem never graded is treated the same way.
 */
export const GRADE_FACTOR: Readonly<Record<Grade, number>> = {
  green: 0.5,
  yellow: 1,
  red: 1.75,
};

/** Nothing is planned as less than this, however small the estimate. */
const MIN_MINUTES = 2;

/**
 * For a problem with no estimate — one the user added themselves — fall back
 * to the sheet's difficulty tag, and to a middling guess when there is none.
 */
const BY_DIFFICULTY: Readonly<Record<string, number>> = { Basic: 5, Core: 10, Pro: 18 };
const UNKNOWN_MINUTES = 8;

/** Minutes to revise this problem at 🟡 level, before the grade is applied. */
export function baseMinutes(p: Pick<Problem, "key" | "difficulty">): number {
  return TIMES[p.key]?.min ?? BY_DIFFICULTY[p.difficulty] ?? UNKNOWN_MINUTES;
}

/** The one-line reason behind an estimate, or "" for a problem that has none. */
export function estimateNote(key: string): string {
  return TIMES[key]?.why ?? "";
}

/** Minutes to budget for this problem today: its estimate, scaled by its last grade. */
export function revisionMinutes(p: Pick<Problem, "key" | "difficulty" | "recall">): number {
  const factor = p.recall ? GRADE_FACTOR[p.recall] : 1;
  return Math.max(MIN_MINUTES, Math.round(baseMinutes(p) * factor));
}

/** The budget offered before one has ever been entered. */
export const DEFAULT_BUDGET_MIN = 60;

/** `user_settings.focus` as it arrives from the database, or null if it is not a Focus. */
export function parseFocus(raw: unknown): Focus | null {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as Partial<Focus>;
  if (typeof f.stepKey !== "string" || !f.stepKey) return null;
  if (typeof f.startedAt !== "string" || Number.isNaN(new Date(f.startedAt).getTime())) return null;
  const budget = Number(f.budgetMin);
  return {
    stepKey: f.stepKey,
    startedAt: f.startedAt,
    budgetMin: Number.isFinite(budget) && budget > 0 ? Math.round(budget) : DEFAULT_BUDGET_MIN,
  };
}

/**
 * Covered = revised since the topic was started, and not left on a blank.
 *
 * The 🔴 exception is what makes "finished" mean something: a problem you drew
 * a blank on has been *seen* this pass, but it stays on the list until it comes
 * back at least fuzzy.
 */
export function isCovered(p: Pick<Problem, "lastRevised" | "recall">, focus: Focus): boolean {
  if (p.recall === "red") return false;
  return p.lastRevised != null && p.lastRevised >= new Date(focus.startedAt).getTime();
}

export interface PatternRun {
  /** Pattern id, or "" for the trailing run of problems no pattern owns. */
  id: string;
  title: string;
  problems: Problem[];
}

/**
 * A topic's problems regrouped pattern by pattern.
 *
 * `problems` arrives in sheet order. Striver's steps interleave techniques —
 * Graphs visits topological sort, leaves it, and comes back — so walking the
 * sheet as written would scatter one technique across several days. Here each
 * pattern is taken whole: patterns keep the order in which the sheet first
 * reaches them, and inside a pattern the catalog's teaching order is used (the
 * template's own problem first, the hard dressings after).
 *
 * Problems the catalog does not own — the user's own additions — keep their
 * incoming order in one run at the end.
 */
export function walkOrder(problems: readonly Problem[]): PatternRun[] {
  const runs = new Map<string, PatternRun>();
  const loose: Problem[] = [];
  for (const p of problems) {
    const pattern = PRIMARY_BY_KEY.get(p.key);
    if (!pattern) {
      loose.push(p);
      continue;
    }
    let run = runs.get(pattern.id);
    if (!run) {
      run = { id: pattern.id, title: pattern.title, problems: [] };
      runs.set(pattern.id, run);
    }
    run.problems.push(p);
  }
  const out = [...runs.values()];
  for (const run of out) {
    const rank = new Map(PRIMARY_BY_KEY.get(run.problems[0].key)!.problems.map((k, i) => [k, i] as const));
    run.problems.sort((a, b) => (rank.get(a.key) ?? 0) - (rank.get(b.key) ?? 0));
  }
  if (loose.length) out.push({ id: "", title: "Your own problems", problems: loose });
  return out;
}

/** Where a topic stands. `pool` is what can be revised at all — see inDrillPool. */
export function topicProgress(
  problems: readonly Problem[],
  focus: Focus
): { pool: number; covered: number; reds: number; remainingMin: number } {
  let pool = 0;
  let covered = 0;
  let reds = 0;
  let remainingMin = 0;
  for (const p of problems) {
    if (!inDrillPool(p)) continue;
    pool++;
    if (isCovered(p, focus)) {
      covered++;
      continue;
    }
    if (p.recall === "red") reds++;
    remainingMin += revisionMinutes(p);
  }
  return { pool, covered, reds, remainingMin };
}

export interface PlannedProblem {
  key: string;
  name: string;
  minutes: number;
  /** A blank from an earlier day, brought to the front of the list. */
  red: boolean;
  /** The pattern it is filed under; "" for a red, which leads the list instead. */
  patternId: string;
  patternTitle: string;
}

/**
 * The problems to revise on one day, to fit `budgetMin`.
 *
 * Order: yesterday's blanks first, then whatever is still uncovered in walk
 * order. Problems are taken while the running total stays inside the budget and
 * the list stops at the first one that does not fit — it never skips ahead to a
 * smaller problem, since that would break a pattern up to save three minutes.
 * The one exception is the first problem, which is always handed out: a budget
 * smaller than the next problem should produce that problem, not nothing.
 *
 * `dayStartMs` is local midnight of the day being planned. A 🔴 is only brought
 * back if it was last revised before then, so planning *today* after blanking
 * on something this morning does not hand it straight back.
 */
export function pickForBudget(
  problems: readonly Problem[],
  focus: Focus,
  budgetMin: number,
  dayStartMs: number
): { picks: PlannedProblem[]; totalMin: number; left: number } {
  const open = walkOrder(problems.filter(inDrillPool))
    .map((run) => ({ ...run, problems: run.problems.filter((p) => !isCovered(p, focus)) }))
    .filter((run) => run.problems.length > 0);

  const queue: PlannedProblem[] = [];
  for (const run of open) {
    for (const p of run.problems) {
      if (p.recall !== "red" || (p.lastRevised ?? 0) >= dayStartMs) continue;
      queue.push({ key: p.key, name: p.name, minutes: revisionMinutes(p), red: true, patternId: "", patternTitle: "" });
    }
  }
  for (const run of open) {
    for (const p of run.problems) {
      if (p.recall === "red") continue;
      queue.push({
        key: p.key,
        name: p.name,
        minutes: revisionMinutes(p),
        red: false,
        patternId: run.id,
        patternTitle: run.title,
      });
    }
  }

  const picks: PlannedProblem[] = [];
  let totalMin = 0;
  for (const next of queue) {
    if (picks.length > 0 && totalMin + next.minutes > budgetMin) break;
    picks.push(next);
    totalMin += next.minutes;
  }
  return { picks, totalMin, left: queue.length - picks.length };
}
