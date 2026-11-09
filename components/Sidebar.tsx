"use client";

import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ProblemList, type FilterKey } from "./ProblemList";
import { StatsBar } from "./StatsBar";
import { AddProblemModal } from "./AddProblemModal";
import { VideoAccessBox } from "./VideoAccessBox";
import { needsResource } from "@/lib/links";
import { knownTopics } from "@/lib/sheet";
import { PATTERN_HAYSTACK, patternGroups, patternIdFromGroupKey } from "@/lib/patterns";
import { DEFAULT_WIDTH, clampWidth, sidebarWidthStore } from "@/lib/sidebarWidth";
import type { SubjectConfig } from "@/lib/subjects";
import type { SheetView } from "@/lib/viewStore";
import { viewStore } from "@/lib/viewStore";
import type { VideoAccess } from "@/lib/useVideoAccess";
import type { Problem, TopicGroup, UserProblemRow } from "@/lib/types";

// Reordering a synthetic grouping means nothing, and useVault's reorderProblem
// only resolves real step and subsection keys. `reorderable={false}` already
// stops ProblemList from building a DndContext at all, so this is the second of
// three layers rather than the one doing the work. Module-level, so its
// identity is stable across renders.
const NO_REORDER = () => {};

export function Sidebar({
  groups,
  byKey,
  rows,
  subject,
  videoAccess,
  selectedKey,
  decayDays,
  onSelect,
  onToggleStar,
  onReorder,
  onAddProblem,
  onDecayDaysChange,
  onImport,
  onSelectPattern,
  mobileOpen = false,
  onClose,
}: {
  groups: TopicGroup[];
  /**
   * Every problem by key, straight from mergeProblems. Patterns view is built
   * from this, so its rows are the same objects the sheet tree renders.
   */
  byKey: Map<string, Problem>;
  rows: UserProblemRow[];
  subject: SubjectConfig;
  videoAccess: VideoAccess;
  selectedKey: string | null;
  decayDays: number;
  onSelect: (key: string) => void;
  onToggleStar: (key: string) => void;
  onReorder: (groupKey: string, activeKey: string, overKey: string) => void;
  onAddProblem: (name: string, topic: string, section: string) => string;
  onDecayDaysChange: (days: number) => void;
  onImport: (rows: UserProblemRow[]) => void;
  /** Open a pattern's intro page in the main pane. */
  onSelectPattern: (id: string) => void;
  /** Mobile-only: whether the off-canvas drawer is open. Desktop ignores this. */
  mobileOpen?: boolean;
  /** Mobile-only: dismiss the drawer (also fired after selecting a problem). */
  onClose?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [resizing, setResizing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const asideRef = useRef<HTMLElement>(null);

  const width = useSyncExternalStore(
    sidebarWidthStore.subscribe,
    sidebarWidthStore.getSnapshot,
    sidebarWidthStore.getServerSnapshot
  );

  // Only DSA has a pattern catalog, so every other subject is pinned to the
  // sheet regardless of what is stored.
  const storedView = useSyncExternalStore(
    viewStore.subscribe,
    viewStore.getSnapshot,
    viewStore.getServerSnapshot
  );
  const view: SheetView = subject.hasPatterns ? storedView : "sheet";

  // The pattern tree, built from the same Problem objects as `groups`.
  const viewGroups = useMemo(
    () => (view === "patterns" ? patternGroups(byKey) : groups),
    [view, byKey, groups]
  );

  // Drag the right edge to resize. Pointer capture keeps the drag alive when the
  // cursor outruns the 4px handle, which it always does.
  const startResize = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const left = asideRef.current?.getBoundingClientRect().left ?? 0;
    e.currentTarget.setPointerCapture(e.pointerId);
    setResizing(true);

    const onMove = (ev: PointerEvent) => sidebarWidthStore.set(clampWidth(ev.clientX - left));
    const onUp = (ev: PointerEvent) => {
      sidebarWidthStore.set(clampWidth(ev.clientX - left));
      setResizing(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, []);

  // Deliberately `groups`, not `viewGroups`: the headline counts describe the
  // whole subject, so they must read the same in both views and can never
  // double-count a problem that a pattern lists twice.
  const allProblems = groups.flatMap((g) => g.problems);
  // Only where the sheet seeds unresourced topics — opt-in per subject rather
  // than derived from the entries, so deliberate gaps can stay quiet.
  const anyNeedsResource = subject.hasResourceGaps && allProblems.some(needsResource);

  // Picking a problem also closes the drawer on mobile (no-op on desktop).
  function handleSelect(key: string) {
    onSelect(key);
    onClose?.();
  }

  // Same for opening a pattern's page from its header.
  function handleOpenSubgroup(subgroupKey: string) {
    const id = patternIdFromGroupKey(subgroupKey);
    if (!id) return;
    onSelectPattern(id);
    onClose?.();
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify({ rows, decayDays }, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const importedRows: UserProblemRow[] = Array.isArray(parsed) ? parsed : parsed.rows;
        if (!Array.isArray(importedRows)) throw new Error("bad shape");
        if (!confirm(`Import ${importedRows.length} problem records? This will overwrite matching entries.`)) return;
        onImport(importedRows);
      } catch {
        alert("Could not read that backup file — is it a DSA Vault export?");
      }
    };
    reader.readAsText(file);
  }

  const content = (
    <>
      <div className="p-3.5 pb-2.5 border-b border-[#2a3040]">
        <div className="flex items-center justify-between mb-2.5">
          <h1 className="text-base font-bold tracking-wide truncate">
            {subject.label} <span className="text-[#5b8cff]">Vault</span>
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdd(true)}
              className="bg-[#5b8cff] text-white rounded-md px-3 py-1 text-[13px] font-semibold hover:brightness-110"
            >
              + Add
            </button>
            <button
              onClick={onClose}
              title="Close"
              className="md:hidden text-[#8b93a7] hover:text-[#e6e9f0] rounded-md w-7 h-7 flex items-center justify-center hover:bg-[#1c212c]"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="flex gap-1.5">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${subject.entryNounPlural}…`}
            className="flex-1 min-w-0 bg-[#1c212c] border border-[#2a3040] rounded-md px-2.5 py-1.5 text-[13px] outline-none focus:border-[#5b8cff]"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterKey)}
            className="bg-[#1c212c] border border-[#2a3040] rounded-md px-1.5 py-1.5 text-[13px] outline-none focus:border-[#5b8cff]"
          >
            <option value="all">All</option>
            <option value="due">Due for revision</option>
            <option value="starred">Starred</option>
            {subject.hasConceptFilter && <option value="concepts">Concepts only</option>}
            {anyNeedsResource && <option value="noresource">Needs a resource</option>}
            <option value="solved">{subject.statusLabels.Solved}</option>
            <option value="unsolved">Not {subject.statusLabels.Solved.toLowerCase()}</option>
          </select>
        </div>

        {/* Striver's own tree, or the same problems grouped by technique. The
            rows are identical either way — same stars, same decay badge, same
            Supabase rows — so search, the filter above and everything else
            keeps working in both. */}
        {subject.hasPatterns && (
          <div
            role="group"
            aria-label="Grouping"
            className="mt-2 flex border border-[#2a3040] rounded-md overflow-hidden"
          >
            {(
              [
                ["sheet", "🗂 Sheet", "Striver's own steps and subsections"],
                ["patterns", "🧩 Patterns", "The same problems, grouped by technique"],
              ] as const
            ).map(([id, label, title]) => (
              <button
                key={id}
                onClick={() => viewStore.set(id)}
                aria-pressed={view === id}
                title={title}
                className={`flex-1 px-2 py-1 text-[12px] font-semibold ${
                  view === id
                    ? "text-[#5b8cff] bg-[#5b8cff]/10"
                    : "text-[#8b93a7] hover:text-[#e6e9f0] hover:bg-[#1c212c]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <StatsBar problems={allProblems} decayDays={decayDays} subject={subject} />

      <ProblemList
        groups={viewGroups}
        subjectId={subject.id}
        filter={filter}
        search={search}
        selectedKey={selectedKey}
        decayDays={decayDays}
        statusLabels={subject.statusLabels}
        markStubs={subject.hasResourceGaps}
        groupNoun={
          view === "patterns" ? "Family" : subject.id === "dsa" ? "Step" : "Section"
        }
        entryNounPlural={subject.entryNounPlural}
        onSelect={handleSelect}
        onToggleStar={onToggleStar}
        onReorder={view === "patterns" ? NO_REORDER : onReorder}
        reorderable={view === "sheet"}
        flattenDue={view === "sheet"}
        subNounPlural={view === "patterns" ? "Patterns" : "Subsections"}
        extraHaystack={view === "patterns" ? PATTERN_HAYSTACK : undefined}
        onOpenSubgroup={view === "patterns" ? handleOpenSubgroup : undefined}
      />

      {videoAccess.isOwner && <VideoAccessBox access={videoAccess} />}

      <div className="border-t border-[#2a3040] px-3.5 py-2.5 flex items-center gap-2 text-xs text-[#8b93a7]">
        <button
          onClick={exportBackup}
          className="border border-[#2a3040] rounded-md px-2.5 py-1 hover:text-[#e6e9f0] hover:border-[#565e73]"
        >
          Export
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="border border-[#2a3040] rounded-md px-2.5 py-1 hover:text-[#e6e9f0] hover:border-[#565e73]"
        >
          Import
        </button>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
        <span className="ml-auto flex items-center gap-1.5">
          <span>Red in</span>
          <input
            type="number"
            min={1}
            max={30}
            value={decayDays}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v >= 1 && v <= 30) onDecayDaysChange(v);
            }}
            className="w-11 bg-[#1c212c] border border-[#2a3040] rounded-md px-1.5 py-0.5 text-center text-xs"
          />
          <span>d</span>
        </span>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: static in-flow sidebar, width dragged from its right edge. */}
      <aside
        ref={asideRef}
        style={{ width }}
        className={`hidden md:flex relative shrink-0 bg-[#161a22] border-r border-[#2a3040] flex-col h-full ${
          resizing ? "select-none" : ""
        }`}
      >
        {content}
        <div
          onPointerDown={startResize}
          onDoubleClick={() => sidebarWidthStore.set(DEFAULT_WIDTH)}
          title="Drag to resize · double-click to reset"
          role="separator"
          aria-orientation="vertical"
          className={`absolute top-0 right-0 h-full w-1 cursor-col-resize touch-none z-10 hover:bg-[#5b8cff]/60 ${
            resizing ? "bg-[#5b8cff]/60" : ""
          }`}
        />
      </aside>

      {/* Mobile: off-canvas drawer over a dimmed backdrop. */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 md:hidden"
          onClick={onClose}
          onKeyDown={(e) => e.key === "Escape" && onClose?.()}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-0 h-full w-[300px] max-w-[85%] bg-[#161a22] border-r border-[#2a3040] flex flex-col shadow-2xl"
          >
            {content}
          </aside>
        </div>
      )}

      {showAdd && (
        <AddProblemModal
          subject={subject}
          knownTopics={knownTopics(subject.id)}
          onClose={() => setShowAdd(false)}
          onAdd={(name, topic, section) => {
            const key = onAddProblem(name, topic, section);
            handleSelect(key);
          }}
        />
      )}
    </>
  );
}
