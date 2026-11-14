"use client";

import { daysSince } from "@/lib/decay";
import { GRADES, GRADE_ORDER, nextInterval } from "@/lib/schedule";
import type { Grade, Problem } from "@/lib/types";

/** "3d", "1.5d", "10d" — a window in days, without a trailing ".0". */
export function fmtWindow(days: number): string {
  return `${Number.isInteger(days) ? days : days.toFixed(1)}d`;
}

/**
 * The three recall grades, each showing the revision window it would set —
 * so the cost of an honest "Blank" (back tomorrow) is visible before you
 * click, rather than discovered afterwards.
 *
 * One component for both places a grade is given: the problem header and the
 * drill's reveal step. `size="lg"` is the drill's thumb-sized row, and
 * `showKeys` labels the 1 / 2 / 3 shortcuts the drill binds.
 */
export function GradeButtons({
  problem,
  decayDays,
  onGrade,
  size = "md",
  showKeys = false,
}: {
  problem: Pick<Problem, "intervalDays" | "lastRevised" | "recall">;
  decayDays: number;
  onGrade: (grade: Grade) => void;
  size?: "md" | "lg";
  showKeys?: boolean;
}) {
  const elapsed = daysSince(problem.lastRevised);
  return (
    <span
      className={`flex ${size === "lg" ? "flex-1 min-w-0 gap-1.5 md:gap-2" : "shrink-0 gap-1"}`}
      role="group"
      aria-label="Grade your recall"
    >
      {GRADE_ORDER.map((g) => {
        const meta = GRADES[g];
        const next = nextInterval(problem.intervalDays, g, decayDays, elapsed);
        return (
          <button
            key={g}
            type="button"
            onClick={() => onGrade(g)}
            title={`${meta.meaning}. Revision window becomes ${fmtWindow(next)}.`}
            style={{ borderColor: `${meta.color}66`, color: meta.color }}
            className={`border rounded-lg font-bold hover:brightness-125 hover:bg-[#1c212c] ${
              size === "lg"
                ? "flex-1 min-w-0 px-1.5 md:px-3 py-2.5 text-[13.5px] md:text-[14px] flex flex-col items-center gap-0.5 whitespace-nowrap"
                : "px-2.5 py-1.5 text-[12.5px]"
            } ${problem.recall === g && size === "md" ? "bg-[#1c212c]" : ""}`}
          >
            <span>
              {showKeys && <kbd className="font-mono text-[11px] opacity-60 mr-1.5">{meta.hotkey}</kbd>}
              {meta.label}
            </span>
            <span className={`font-semibold opacity-70 ${size === "lg" ? "text-[11px]" : "ml-1.5 text-[11px]"}`}>
              {size === "lg" ? `back ~${fmtWindow(next)}` : fmtWindow(next)}
            </span>
          </button>
        );
      })}
    </span>
  );
}
