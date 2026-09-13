"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

// dnd-kit exposes `attributes`/`listeners` as opaque types; derive them from the
// hook's return so ProblemRow can accept them without deep internal imports.
type SortableHandles = Pick<ReturnType<typeof useSortable>, "attributes" | "listeners">;
import { CSS } from "@dnd-kit/utilities";
import { RevisionStar } from "./RevisionStar";
import { daysSince, isDue, starColor } from "@/lib/decay";
import type { Problem, Status, TopicGroup } from "@/lib/types";

export type FilterKey = "all" | "due" | "starred" | "solved" | "unsolved" | "concepts";

function ProblemRow({
  problem,
  selected,
  decayDays,
  statusLabels,
  onSelect,
  onToggleStar,
  drag,
}: {
  problem: Problem;
  selected: boolean;
  decayDays: number;
  statusLabels: Record<Status, string>;
  onSelect: () => void;
  onToggleStar: () => void;
  drag?: {
    setNodeRef: (el: HTMLElement | null) => void;
    style: React.CSSProperties;
    isDragging: boolean;
  } & SortableHandles;
}) {
  const days = problem.starred ? Math.floor(daysSince(problem.lastRevised)) : null;
  const color = starColor(problem.starred, problem.lastRevised, decayDays);

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
        decayDays={decayDays}
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
          {problem.name || "Untitled"}
        </div>
        <div className="text-[11px] text-[#8b93a7] truncate">
          {[problem.difficulty, statusLabels[problem.status]].filter(Boolean).join(" · ")}
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

function SortableProblemRow({
  problem,
  selected,
  decayDays,
  statusLabels,
  onSelect,
  onToggleStar,
}: {
  problem: Problem;
  selected: boolean;
  decayDays: number;
  statusLabels: Record<Status, string>;
  onSelect: () => void;
  onToggleStar: () => void;
}) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({
    id: problem.key,
  });
  return (
    <ProblemRow
      problem={problem}
      selected={selected}
      decayDays={decayDays}
      statusLabels={statusLabels}
      onSelect={onSelect}
      onToggleStar={onToggleStar}
      drag={{
        setNodeRef,
        style: { transform: CSS.Transform.toString(transform), transition },
        isDragging,
        attributes,
        listeners,
      }}
    />
  );
}

function matchesFilter(p: Problem, filter: FilterKey, decayDays: number): boolean {
  if (filter === "due") return isDue(p.starred, p.lastRevised, decayDays);
  if (filter === "starred") return p.starred;
  if (filter === "solved") return p.status === "Solved";
  if (filter === "unsolved") return p.status !== "Solved";
  if (filter === "concepts") return p.kind !== "problem";
  return true;
}

export function ProblemList({
  groups,
  filter,
  search,
  selectedKey,
  decayDays,
  statusLabels,
  groupNoun,
  entryNounPlural,
  onSelect,
  onToggleStar,
  onReorder,
}: {
  groups: TopicGroup[];
  filter: FilterKey;
  search: string;
  selectedKey: string | null;
  decayDays: number;
  statusLabels: Record<Status, string>;
  /** "Step" for DSA, "Section" for the lecture subjects. */
  groupNoun: string;
  entryNounPlural: string;
  onSelect: (key: string) => void;
  onToggleStar: (key: string) => void;
  onReorder: (groupKey: string, activeKey: string, overKey: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const q = search.trim().toLowerCase();
  const searching = q.length > 0;
  // Dragging only makes sense when every problem is shown in its true order.
  const draggable = filter === "all" && !searching;

  // A small movement threshold lets plain clicks (select row, toggle star) through.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const filteredGroups = useMemo(() => {
    return groups
      .map((g) => ({
        ...g,
        problems: g.problems.filter((p) => {
          if (q && !(p.name + " " + p.topic).toLowerCase().includes(q)) return false;
          return matchesFilter(p, filter, decayDays);
        }),
      }))
      // Keep an empty placeholder section only in the unfiltered view — under a
      // filter or a search, showing sections that can never match is just noise.
      .filter((g) => g.problems.length > 0 || (!!g.placeholder && filter === "all" && !q));
  }, [groups, q, filter, decayDays]);

  const allCollapsed =
    filteredGroups.length > 0 && filteredGroups.every((g) => collapsed[g.key]);

  function toggleAll() {
    if (allCollapsed) setCollapsed({});
    else setCollapsed(Object.fromEntries(filteredGroups.map((g) => [g.key, true])));
  }

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
              statusLabels={statusLabels}
              onSelect={() => onSelect(p.key)}
              onToggleStar={() => onToggleStar(p.key)}
            />
          ))
        )}
      </div>
    );
  }

  return (
    <>
      {!searching && filteredGroups.length > 0 && (
        <div className="flex justify-end px-2 pt-1 shrink-0">
          <button
            onClick={toggleAll}
            className="text-[11px] text-[#565e73] hover:text-[#e6e9f0] px-1.5 py-0.5"
          >
            {allCollapsed ? "⊞ Expand all" : "⊟ Collapse all"}
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-1.5">
      {filteredGroups.length === 0 && (
        <div className="p-5 text-[13px] text-[#8b93a7]">No {entryNounPlural} match.</div>
      )}
      {filteredGroups.map((g) => {
        const solved = g.problems.filter((p) => p.status === "Solved").length;
        const isOpen = searching || !collapsed[g.key];
        const stepLabel = g.order < 1000 ? `${groupNoun} ${g.order} · ` : "";

        function handleDragEnd(e: DragEndEvent) {
          const { active, over } = e;
          if (over && active.id !== over.id) {
            onReorder(g.key, String(active.id), String(over.id));
          }
        }

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
                {g.problems.length === 0 && g.placeholder ? "not yet covered" : `${solved}/${g.problems.length}`}
              </span>
            </button>
            {isOpen && g.problems.length === 0 && g.placeholder && (
              <div className="px-3 pb-2 text-[11px] leading-relaxed text-[#565e73]">
                {g.placeholder}
              </div>
            )}
            {isOpen &&
              (draggable ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={g.problems.map((p) => p.key)} strategy={verticalListSortingStrategy}>
                    <div>
                      {g.problems.map((p) => (
                        <SortableProblemRow
                          key={p.key}
                          problem={p}
                          selected={p.key === selectedKey}
                          decayDays={decayDays}
                          statusLabels={statusLabels}
                          onSelect={() => onSelect(p.key)}
                          onToggleStar={() => onToggleStar(p.key)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div>
                  {g.problems.map((p) => (
                    <ProblemRow
                      key={p.key}
                      problem={p}
                      selected={p.key === selectedKey}
                      decayDays={decayDays}
                      statusLabels={statusLabels}
                      onSelect={() => onSelect(p.key)}
                      onToggleStar={() => onToggleStar(p.key)}
                    />
                  ))}
                </div>
              ))}
          </div>
        );
      })}
      </div>
    </>
  );
}
