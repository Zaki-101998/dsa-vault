"use client";

import { useRef, useState } from "react";
import { ProblemList, type FilterKey } from "./ProblemList";
import { StatsBar } from "./StatsBar";
import { AddProblemModal } from "./AddProblemModal";
import type { TopicGroup, UserProblemRow } from "@/lib/types";

export function Sidebar({
  groups,
  rows,
  selectedKey,
  decayDays,
  onSelect,
  onToggleStar,
  onReorder,
  onAddProblem,
  onDecayDaysChange,
  onImport,
}: {
  groups: TopicGroup[];
  rows: UserProblemRow[];
  selectedKey: string | null;
  decayDays: number;
  onSelect: (key: string) => void;
  onToggleStar: (key: string) => void;
  onReorder: (groupKey: string, activeKey: string, overKey: string) => void;
  onAddProblem: (name: string, topic: string) => string;
  onDecayDaysChange: (days: number) => void;
  onImport: (rows: UserProblemRow[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [showAdd, setShowAdd] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const allProblems = groups.flatMap((g) => g.problems);

  function exportBackup() {
    const blob = new Blob([JSON.stringify({ rows, decayDays }, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `dsa-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
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

  return (
    <aside className="w-[300px] min-w-[300px] bg-[#161a22] border-r border-[#2a3040] flex flex-col h-full">
      <div className="p-3.5 pb-2.5 border-b border-[#2a3040]">
        <div className="flex items-center justify-between mb-2.5">
          <h1 className="text-base font-bold tracking-wide">
            DSA <span className="text-[#5b8cff]">Vault</span>
          </h1>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-[#5b8cff] text-white rounded-md px-3 py-1 text-[13px] font-semibold hover:brightness-110"
          >
            + Problem
          </button>
        </div>
        <div className="flex gap-1.5">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problems…"
            className="flex-1 bg-[#1c212c] border border-[#2a3040] rounded-md px-2.5 py-1.5 text-[13px] outline-none focus:border-[#5b8cff]"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterKey)}
            className="bg-[#1c212c] border border-[#2a3040] rounded-md px-1.5 py-1.5 text-[13px] outline-none focus:border-[#5b8cff]"
          >
            <option value="all">All</option>
            <option value="due">Due for revision</option>
            <option value="starred">Starred</option>
            <option value="solved">Solved</option>
            <option value="unsolved">Unsolved</option>
          </select>
        </div>
      </div>

      <StatsBar problems={allProblems} decayDays={decayDays} />

      <ProblemList
        groups={groups}
        filter={filter}
        search={search}
        selectedKey={selectedKey}
        decayDays={decayDays}
        onSelect={onSelect}
        onToggleStar={onToggleStar}
        onReorder={onReorder}
      />

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

      {showAdd && (
        <AddProblemModal
          onClose={() => setShowAdd(false)}
          onAdd={(name, topic) => {
            const key = onAddProblem(name, topic);
            onSelect(key);
          }}
        />
      )}
    </aside>
  );
}
