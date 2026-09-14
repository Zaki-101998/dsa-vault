"use client";

import { useRef, useState } from "react";
import { ProblemList, type FilterKey } from "./ProblemList";
import { StatsBar } from "./StatsBar";
import { AddProblemModal } from "./AddProblemModal";
import { VideoAccessBox } from "./VideoAccessBox";
import { needsResource } from "@/lib/links";
import { knownTopics } from "@/lib/sheet";
import type { SubjectConfig } from "@/lib/subjects";
import type { VideoAccess } from "@/lib/useVideoAccess";
import type { TopicGroup, UserProblemRow } from "@/lib/types";

export function Sidebar({
  groups,
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
  mobileOpen = false,
  onClose,
}: {
  groups: TopicGroup[];
  rows: UserProblemRow[];
  subject: SubjectConfig;
  videoAccess: VideoAccess;
  selectedKey: string | null;
  decayDays: number;
  onSelect: (key: string) => void;
  onToggleStar: (key: string) => void;
  onReorder: (groupKey: string, activeKey: string, overKey: string) => void;
  onAddProblem: (name: string, topic: string) => string;
  onDecayDaysChange: (days: number) => void;
  onImport: (rows: UserProblemRow[]) => void;
  /** Mobile-only: whether the off-canvas drawer is open. Desktop ignores this. */
  mobileOpen?: boolean;
  /** Mobile-only: dismiss the drawer (also fired after selecting a problem). */
  onClose?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [showAdd, setShowAdd] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const allProblems = groups.flatMap((g) => g.problems);
  // Only where the sheet deliberately seeds unresourced topics. DSA has a few
  // theory entries carrying no link either, but those are not gaps to go fill,
  // so the flag is opt-in per subject rather than derived from the entries.
  const anyNeedsResource = subject.hasResourceGaps && allProblems.some(needsResource);

  // Picking a problem also closes the drawer on mobile (no-op on desktop).
  function handleSelect(key: string) {
    onSelect(key);
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
      </div>

      <StatsBar problems={allProblems} decayDays={decayDays} subject={subject} />

      <ProblemList
        groups={groups}
        filter={filter}
        search={search}
        selectedKey={selectedKey}
        decayDays={decayDays}
        statusLabels={subject.statusLabels}
        markStubs={subject.hasResourceGaps}
        groupNoun={subject.id === "dsa" ? "Step" : "Section"}
        entryNounPlural={subject.entryNounPlural}
        onSelect={handleSelect}
        onToggleStar={onToggleStar}
        onReorder={onReorder}
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
      {/* Desktop: static in-flow sidebar. */}
      <aside className="hidden md:flex w-[300px] min-w-[300px] bg-[#161a22] border-r border-[#2a3040] flex-col h-full">
        {content}
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
          onAdd={(name, topic) => {
            const key = onAddProblem(name, topic);
            handleSelect(key);
          }}
        />
      )}
    </>
  );
}
