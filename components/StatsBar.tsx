"use client";

import { isDue } from "@/lib/decay";
import { windowDays } from "@/lib/schedule";
import type { SubjectConfig } from "@/lib/subjects";
import type { Problem } from "@/lib/types";

export function StatsBar({
  problems,
  decayDays,
  subject,
  onDrillDue,
}: {
  problems: Problem[];
  decayDays: number;
  subject: SubjectConfig;
  /** Opens the drill set to "Due now". The due count is the button. */
  onDrillDue?: () => void;
}) {
  const solved = problems.filter((p) => p.status === "Solved").length;
  const due = problems.filter((p) => isDue(p.starred, p.lastRevised, windowDays(p, decayDays))).length;
  const starred = problems.filter((p) => p.starred).length;

  return (
    <div className="px-3.5 py-1.5 text-xs text-[#8b93a7] border-b border-[#2a3040] flex gap-3 flex-wrap">
      <span>
        {solved}/{problems.length} {subject.statusLabels.Solved.toLowerCase()}
      </span>
      <span>{starred} in rotation</span>
      {due > 0 ? (
        onDrillDue ? (
          <button
            onClick={onDrillDue}
            title="Drill what is due — recall each approach, then check it against your notes"
            className="text-[#e12d39] font-semibold hover:underline"
          >
            ⚠ {due} due for revision ▶
          </button>
        ) : (
          <span className="text-[#e12d39] font-semibold">⚠ {due} due for revision</span>
        )
      ) : (
        <span className="text-[#3ecf8e]">✓ revision clear</span>
      )}
    </div>
  );
}
