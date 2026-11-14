"use client";

// Lifted out of ProblemList.tsx so the pattern page can render the same row.
// A copy would drift — this row carries the revision star, the decay-coloured
// "Nd" badge, the skippable and stub markers and the status subtitle, and
// lib/links.ts's header records what happened last time two surfaces each grew
// their own version of the same thing.
//
// The dnd-kit import below is type-only, so nothing in @dnd-kit reaches the
// runtime bundle through this file: the pattern page gets the row without the
// drag machinery.

import type { useSortable } from "@dnd-kit/sortable";
import { RevisionStar } from "./RevisionStar";
import { daysSince, starColor } from "@/lib/decay";
import { GRADES, windowDays } from "@/lib/schedule";
import { needsResource } from "@/lib/links";
import type { Problem, Status } from "@/lib/types";

// dnd-kit exposes `attributes`/`listeners` as opaque types; derive them from the
// hook's return so ProblemRow can accept them without deep internal imports.
export type SortableHandles = Pick<ReturnType<typeof useSortable>, "attributes" | "listeners">;

/** Common props every row in a list needs, threaded down from its container. */
export type RowContext = {
  selectedKey: string | null;
  decayDays: number;
  statusLabels: Record<Status, string>;
  markStubs: boolean;
  onSelect: (key: string) => void;
  onToggleStar: (key: string) => void;
};

export function ProblemRow({
  problem,
  selected,
  decayDays,
  statusLabels,
  markStubs,
  onSelect,
  onToggleStar,
  drag,
}: {
  problem: Problem;
  selected: boolean;
  decayDays: number;
  statusLabels: Record<Status, string>;
  /** Whether this subject seeds unresourced topics worth flagging. */
  markStubs: boolean;
  onSelect: () => void;
  onToggleStar: () => void;
  drag?: {
    setNodeRef: (el: HTMLElement | null) => void;
    style: React.CSSProperties;
    isDragging: boolean;
  } & SortableHandles;
}) {
  const days = problem.starred ? Math.floor(daysSince(problem.lastRevised)) : null;
  // Each problem fades over its own window once it has a recall grade; until
  // then this is the global setting, exactly as before.
  const win = windowDays(problem, decayDays);
  const color = starColor(problem.starred, problem.lastRevised, win);
  const grade = problem.recall ? GRADES[problem.recall] : null;
  const stub = markStubs && needsResource(problem);

  return (
    <div
      ref={drag?.setNodeRef}
      style={drag?.style}
      {...(drag?.attributes ?? {})}
      {...(drag?.listeners ?? {})}
      onClick={onSelect}
      className={`flex items-center gap-2 px-2 py-[7px] rounded-lg cursor-pointer border ${
        drag ? "select-none" : ""
      } ${drag?.isDragging ? "opacity-50" : ""} ${
        selected ? "bg-[#232937] border-[#2a3040]" : "border-transparent hover:bg-[#1c212c]"
      }`}
    >
      <RevisionStar
        starred={problem.starred}
        lastRevised={problem.lastRevised}
        decayDays={win}
        size={16}
        onClick={(e) => {
          e.stopPropagation();
          onToggleStar();
        }}
      />
      <div className={`flex-1 min-w-0 ${problem.kind === "problem" ? "opacity-60" : ""}`}>
        <div className="text-[13px] truncate">
          {problem.kind === "problem" && (
            <span title="Worked-question video — skippable" className="text-[#8b93a7]">
              ◦{" "}
            </span>
          )}
          {stub && (
            <span title="No resource yet — paste a link in the header" className="text-[#5b8cff]">
              ⊕{" "}
            </span>
          )}
          {problem.name || "Untitled"}
        </div>
        <div className="text-[11px] text-[#8b93a7] truncate">
          {[problem.difficulty, statusLabels[problem.status], stub ? "no resource yet" : ""]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>
      {grade && (
        <span
          title={`Last recall: ${grade.label}`}
          aria-label={`Last recall: ${grade.label}`}
          className="w-[7px] h-[7px] rounded-full shrink-0"
          style={{ background: grade.color }}
        />
      )}
      {days !== null && (
        <span className="text-[10px] font-bold shrink-0" style={{ color: color ?? undefined }}>
          {days}d
        </span>
      )}
    </div>
  );
}
