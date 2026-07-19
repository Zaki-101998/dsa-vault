"use client";

import { useMemo, useState } from "react";
import { RevisionStar } from "./RevisionStar";
import { daysSince, isDue, starColor } from "@/lib/decay";
import type { Problem, TopicGroup } from "@/lib/types";

export type FilterKey = "all" | "due" | "starred" | "solved" | "unsolved";

function ProblemRow({
  problem,
  selected,
  decayDays,
  onSelect,
  onToggleStar,
}: {
  problem: Problem;
  selected: boolean;
  decayDays: number;
  onSelect: () => void;
  onToggleStar: () => void;
}) {
  const days = problem.starred ? Math.floor(daysSince(problem.lastRevised)) : null;
  const color = starColor(problem.starred, problem.lastRevised, decayDays);

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-2 px-2 py-[7px] rounded-lg cursor-pointer border ${
        selected ? "bg-[#232937] border-[#2a3040]" : "border-transparent hover:bg-[#1c212c]"
      }`}
    >
      <RevisionStar
        starred={problem.starred}
        lastRevised={problem.lastRevised}
        decayDays={decayDays}
        size={16}
        onClick={(e) => {
          e.stopPropagation();
          onToggleStar();
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] truncate">{problem.name || "Untitled"}</div>
        <div className="text-[11px] text-[#8b93a7] truncate">
          {[problem.difficulty, problem.status].filter(Boolean).join(" · ")}
        </div>
      </div>
      {days !== null && (
        <span className="text-[10px] font-bold shrink-0" style={{ color: color ?? undefined }}>
          {days}d
        </span>
      )}
    </div>
  );
}

function matchesFilter(p: Problem, filter: FilterKey, decayDays: number): boolean {
  if (filter === "due") return isDue(p.starred, p.lastRevised, decayDays);
  if (filter === "starred") return p.starred;
  if (filter === "solved") return p.status === "Solved";
  if (filter === "unsolved") return p.status !== "Solved";
  return true;
}

export function ProblemList({
  groups,
  filter,
  search,
  selectedKey,
  decayDays,
  onSelect,
  onToggleStar,
}: {
  groups: TopicGroup[];
  filter: FilterKey;
  search: string;
  selectedKey: string | null;
  decayDays: number;
  onSelect: (key: string) => void;
  onToggleStar: (key: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const q = search.trim().toLowerCase();
  const searching = q.length > 0;

  const filteredGroups = useMemo(() => {
    return groups
      .map((g) => ({
        ...g,
        problems: g.problems.filter((p) => {
          if (q && !(p.name + " " + p.topic).toLowerCase().includes(q)) return false;
          return matchesFilter(p, filter, decayDays);
        }),
      }))
      .filter((g) => g.problems.length > 0);
  }, [groups, q, filter, decayDays]);

  if (filter === "due") {
    const flat = filteredGroups
      .flatMap((g) => g.problems)
      .sort((a, b) => daysSince(b.lastRevised) - daysSince(a.lastRevised));
    return (
      <div className="flex-1 overflow-y-auto p-1.5">
        {flat.length === 0 ? (
          <div className="p-5 text-[13px] text-[#8b93a7]">Nothing due — nice! 🎉</div>
        ) : (
          flat.map((p) => (
            <ProblemRow
              key={p.key}
              problem={p}
              selected={p.key === selectedKey}
              decayDays={decayDays}
              onSelect={() => onSelect(p.key)}
              onToggleStar={() => onToggleStar(p.key)}
            />
          ))
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-1.5">
      {filteredGroups.length === 0 && (
        <div className="p-5 text-[13px] text-[#8b93a7]">No problems match.</div>
      )}
      {filteredGroups.map((g) => {
        const solved = g.problems.filter((p) => p.status === "Solved").length;
        const isOpen = searching || !collapsed[g.key];
        const stepLabel = g.order < 1000 ? `Step ${g.order} · ` : "";
        return (
          <div key={g.key} className="mb-0.5">
            <button
              onClick={() => !searching && setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }))}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#8b93a7] hover:text-[#e6e9f0]"
            >
              <span className={`text-[10px] transition-transform ${isOpen ? "rotate-90" : ""}`}>▸</span>
              <span className="truncate">
                {stepLabel}
                {g.title}
              </span>
              <span className="ml-auto font-normal normal-case tracking-normal text-[#565e73]">
                {solved}/{g.problems.length}
              </span>
            </button>
            {isOpen && (
              <div>
                {g.problems.map((p) => (
                  <ProblemRow
                    key={p.key}
                    problem={p}
                    selected={p.key === selectedKey}
                    decayDays={decayDays}
                    onSelect={() => onSelect(p.key)}
                    onToggleStar={() => onToggleStar(p.key)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
