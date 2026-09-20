"use client";

import { useMemo, useSyncExternalStore } from "react";
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
import { collapseStore } from "@/lib/collapseStore";
import { daysSince, isDue, starColor } from "@/lib/decay";
import { needsResource } from "@/lib/links";
import type { Problem, Status, SubGroup, SubjectId, TopicGroup } from "@/lib/types";

export type FilterKey =
  | "all"
  | "due"
  | "starred"
  | "solved"
  | "unsolved"
  | "concepts"
  | "noresource";

function ProblemRow({
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
  const color = starColor(problem.starred, problem.lastRevised, decayDays);
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
  markStubs,
  onSelect,
  onToggleStar,
}: {
  problem: Problem;
  selected: boolean;
  decayDays: number;
  statusLabels: Record<Status, string>;
  markStubs: boolean;
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
      markStubs={markStubs}
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

/** Common props every row in a list needs, threaded down from ProblemList. */
type RowContext = {
  selectedKey: string | null;
  decayDays: number;
  statusLabels: Record<Status, string>;
  markStubs: boolean;
  onSelect: (key: string) => void;
  onToggleStar: (key: string) => void;
};

/**
 * One run of rows, wrapped in its own drag context. Steps and subsections each
 * render one, so a drag reorders within the list it started in — `listKey` is
 * the step or subsection key, and reorderProblem resolves either.
 */
function ProblemRows({
  problems,
  listKey,
  draggable,
  ctx,
  onReorder,
}: {
  problems: Problem[];
  listKey: string;
  draggable: boolean;
  ctx: RowContext;
  onReorder: (groupKey: string, activeKey: string, overKey: string) => void;
}) {
  // A small movement threshold lets plain clicks (select row, toggle star) through.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const rows = problems.map((p) =>
    draggable ? (
      <SortableProblemRow
        key={p.key}
        problem={p}
        selected={p.key === ctx.selectedKey}
        decayDays={ctx.decayDays}
        statusLabels={ctx.statusLabels}
        markStubs={ctx.markStubs}
        onSelect={() => ctx.onSelect(p.key)}
        onToggleStar={() => ctx.onToggleStar(p.key)}
      />
    ) : (
      <ProblemRow
        key={p.key}
        problem={p}
        selected={p.key === ctx.selectedKey}
        decayDays={ctx.decayDays}
        statusLabels={ctx.statusLabels}
        markStubs={ctx.markStubs}
        onSelect={() => ctx.onSelect(p.key)}
        onToggleStar={() => ctx.onToggleStar(p.key)}
      />
    )
  );

  if (!draggable) return <div>{rows}</div>;

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (over && active.id !== over.id) onReorder(listKey, String(active.id), String(over.id));
  }

  return (
    // An explicit `id` matters: left to itself dnd-kit derives the draggables'
    // aria-describedby from a module-global counter, which climbs across server
    // renders but restarts on the client — a guaranteed hydration mismatch once
    // the page holds more than a couple of contexts. The list key is stable on
    // both sides.
    <DndContext
      id={listKey}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={problems.map((p) => p.key)} strategy={verticalListSortingStrategy}>
        <div>{rows}</div>
      </SortableContext>
    </DndContext>
  );
}

function matchesFilter(
  p: Problem,
  filter: FilterKey,
  decayDays: number,
  markStubs: boolean
): boolean {
  if (filter === "due") return isDue(p.starred, p.lastRevised, decayDays);
  if (filter === "starred") return p.starred;
  if (filter === "solved") return p.status === "Solved";
  if (filter === "unsolved") return p.status !== "Solved";
  if (filter === "concepts") return p.kind !== "problem";
  if (filter === "noresource") return markStubs && needsResource(p);
  return true;
}

export function ProblemList({
  groups,
  subjectId,
  filter,
  search,
  selectedKey,
  decayDays,
  statusLabels,
  markStubs,
  groupNoun,
  entryNounPlural,
  onSelect,
  onToggleStar,
  onReorder,
}: {
  groups: TopicGroup[];
  /** Which subject's fold state to read — collapse is persisted per subject. */
  subjectId: SubjectId;
  filter: FilterKey;
  search: string;
  selectedKey: string | null;
  decayDays: number;
  statusLabels: Record<Status, string>;
  /** True only where the sheet seeds topics with no resource — see SubjectConfig. */
  markStubs: boolean;
  /** "Step" for DSA, "Section" for the lecture subjects. */
  groupNoun: string;
  entryNounPlural: string;
  onSelect: (key: string) => void;
  onToggleStar: (key: string) => void;
  onReorder: (groupKey: string, activeKey: string, overKey: string) => void;
}) {
  const collapsed = useSyncExternalStore(
    collapseStore.subscribe,
    () => collapseStore.getSnapshot(subjectId),
    collapseStore.getServerSnapshot
  );

  const q = search.trim().toLowerCase();
  const searching = q.length > 0;
  // Dragging only makes sense when every problem is shown in its true order.
  const draggable = filter === "all" && !searching;

  const filteredGroups = useMemo(() => {
    const keep = (p: Problem) => {
      if (q && !(p.name + " " + p.topic).toLowerCase().includes(q)) return false;
      return matchesFilter(p, filter, decayDays, markStubs);
    };
    return groups
      .map((g) => {
        const problems = g.problems.filter(keep);
        const subgroups = g.subgroups
          ?.map((sg) => ({ ...sg, problems: sg.problems.filter(keep) }))
          .filter((sg) => sg.problems.length > 0);
        // Entries the user added themselves sit in no subsection; show them
        // above the subsections rather than hiding them.
        const inSub = new Set((subgroups ?? []).flatMap((sg) => sg.problems.map((p) => p.key)));
        const loose = problems.filter((p) => !inSub.has(p.key));
        return { ...g, problems, subgroups, loose };
      })
      .filter((g) => g.problems.length > 0);
  }, [groups, q, filter, decayDays, markStubs]);

  const stepKeys = filteredGroups.map((g) => g.key);
  const subKeys = filteredGroups.flatMap((g) => (g.subgroups ?? []).map((sg) => sg.key));

  const allCollapsed = stepKeys.length > 0 && stepKeys.every((k) => collapsed[k]);
  const allSubsCollapsed = subKeys.length > 0 && subKeys.every((k) => collapsed[k]);

  /** Fold or unfold one level without disturbing the other's state. */
  function setMany(keys: string[], value: boolean) {
    const next = { ...collapsed };
    for (const k of keys) {
      if (value) next[k] = true;
      else delete next[k];
    }
    collapseStore.set(subjectId, next);
  }

  function toggleOne(key: string) {
    if (searching) return;
    setMany([key], !collapsed[key]);
  }

  const ctx: RowContext = {
    selectedKey,
    decayDays,
    statusLabels,
    markStubs,
    onSelect,
    onToggleStar,
  };

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
              markStubs={markStubs}
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
        <div className="flex justify-end gap-1 px-2 pt-1 shrink-0">
          {subKeys.length > 0 && (
            <button
              onClick={() => setMany(subKeys, !allSubsCollapsed)}
              title={`${allSubsCollapsed ? "Expand" : "Collapse"} every subsection, leaving ${groupNoun.toLowerCase()}s as they are`}
              className="text-[11px] text-[#565e73] hover:text-[#e6e9f0] px-1.5 py-0.5"
            >
              {allSubsCollapsed ? "⊞ Subsections" : "⊟ Subsections"}
            </button>
          )}
          <button
            onClick={() => setMany(stepKeys, !allCollapsed)}
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

          return (
            <div key={g.key} className="mb-0.5">
              <button
                onClick={() => toggleOne(g.key)}
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
              {/* Where this section's material comes from — sections are drawn from
                  more than one course, and some from none yet. */}
              {isOpen && g.note && (
                <div className="px-3 pb-1.5 text-[11px] leading-relaxed text-[#565e73]">{g.note}</div>
              )}
              {isOpen && (
                <>
                  {g.loose.length > 0 && (
                    <ProblemRows
                      problems={g.loose}
                      listKey={g.key}
                      draggable={draggable}
                      ctx={ctx}
                      onReorder={onReorder}
                    />
                  )}
                  {(g.subgroups ?? []).map((sg: SubGroup) => {
                    const subOpen = searching || !collapsed[sg.key];
                    const subSolved = sg.problems.filter((p) => p.status === "Solved").length;
                    return (
                      <div key={sg.key}>
                        <button
                          onClick={() => toggleOne(sg.key)}
                          className="w-full flex items-center gap-1.5 pl-5 pr-2 py-1 text-[11px] font-semibold text-[#6f7789] hover:text-[#c7ccd8]"
                        >
                          <span
                            className={`text-[9px] transition-transform ${subOpen ? "rotate-90" : ""}`}
                          >
                            ▸
                          </span>
                          <span className="truncate">{sg.title}</span>
                          <span className="ml-auto font-normal text-[#4c5468]">
                            {subSolved}/{sg.problems.length}
                          </span>
                        </button>
                        {subOpen && (
                          <ProblemRows
                            problems={sg.problems}
                            listKey={sg.key}
                            draggable={draggable}
                            ctx={ctx}
                            onReorder={onReorder}
                          />
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
