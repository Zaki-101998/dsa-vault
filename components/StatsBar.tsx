"use client";

import { isDue } from "@/lib/decay";
import type { Problem } from "@/lib/types";

export function StatsBar({ problems, decayDays }: { problems: Problem[]; decayDays: number }) {
  const solved = problems.filter((p) => p.status === "Solved").length;
  const due = problems.filter((p) => isDue(p.starred, p.lastRevised, decayDays)).length;
  const starred = problems.filter((p) => p.starred).length;

  return (
    <div className="px-3.5 py-1.5 text-xs text-[#8b93a7] border-b border-[#2a3040] flex gap-3 flex-wrap">
      <span>
        {solved}/{problems.length} solved
      </span>
      <span>{starred} in rotation</span>
      {due > 0 ? (
        <span className="text-[#e12d39] font-semibold">⚠ {due} due for revision</span>
      ) : (
        <span className="text-[#3ecf8e]">✓ revision clear</span>
      )}
    </div>
  );
}
