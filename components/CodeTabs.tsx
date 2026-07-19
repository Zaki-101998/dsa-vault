"use client";

import { useState } from "react";
import { CodeEditor } from "./CodeEditor";
import { newApproachId } from "@/lib/sheet";
import type { Approach } from "@/lib/types";

export function CodeTabs({
  approaches,
  onChange,
}: {
  approaches: Approach[];
  onChange: (approaches: Approach[]) => void;
}) {
  const [activeId, setActiveId] = useState<string>(approaches[0]?.id);
  const [copied, setCopied] = useState(false);

  const active = approaches.find((a) => a.id === activeId) || approaches[0];

  function patchActive(patch: Partial<Approach>) {
    if (!active) return;
    const next = approaches.map((a) => (a.id === active.id ? { ...a, ...patch } : a));
    onChange(next);
  }

  function addApproach() {
    const label = prompt("Approach name (e.g. Two-pointer, DP memo):");
    if (!label?.trim()) return;
    const na: Approach = { id: newApproachId(), label: label.trim(), code: "", time: "", space: "", custom: true };
    onChange([...approaches, na]);
    setActiveId(na.id);
  }

  function removeApproach(a: Approach) {
    if (!confirm(`Remove approach "${a.label}"?`)) return;
    const next = approaches.filter((x) => x.id !== a.id);
    onChange(next);
    if (a.id === activeId) setActiveId(next[0]?.id);
  }

  async function copyCode() {
    if (!active) return;
    try {
      await navigator.clipboard.writeText(active.code || "");
    } catch {
      // clipboard API unavailable — silently ignore
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  if (!active) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#8b93a7] text-sm">
        No approaches yet.
        <button onClick={addApproach} className="ml-2 text-[#5b8cff] underline">
          Add one
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex gap-1.5 mb-2.5 flex-wrap items-center">
        {approaches.map((a) => (
          <button
            key={a.id}
            onClick={() => setActiveId(a.id)}
            className={`border rounded-md px-3.5 py-1 text-[13px] flex items-center gap-2 ${
              a.id === active.id
                ? "text-white bg-[#232937] border-[#5b8cff]"
                : "text-[#8b93a7] border-[#2a3040] hover:text-[#e6e9f0] bg-[#161a22]"
            }`}
          >
            {a.label}
            {a.custom && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  removeApproach(a);
                }}
                className="text-[11px] opacity-60 hover:opacity-100 hover:text-[#e12d39]"
                title="Remove"
              >
                ✕
              </span>
            )}
          </button>
        ))}
        <button
          onClick={addApproach}
          className="border border-dashed border-[#2a3040] rounded-md px-3 py-1 text-[13px] text-[#8b93a7] hover:text-[#5b8cff] hover:border-[#5b8cff]"
        >
          + Approach
        </button>
      </div>

      <div className="flex gap-2.5 mb-2.5 items-center">
        <label className="text-xs text-[#8b93a7]">Time</label>
        <input
          value={active.time}
          onChange={(e) => patchActive({ time: e.target.value })}
          placeholder="O(n log n)"
          className="w-[180px] font-mono text-[12.5px] bg-[#1c212c] border border-[#2a3040] rounded-md px-2.5 py-1 outline-none focus:border-[#5b8cff]"
        />
        <label className="text-xs text-[#8b93a7]">Space</label>
        <input
          value={active.space}
          onChange={(e) => patchActive({ space: e.target.value })}
          placeholder="O(1)"
          className="w-[180px] font-mono text-[12.5px] bg-[#1c212c] border border-[#2a3040] rounded-md px-2.5 py-1 outline-none focus:border-[#5b8cff]"
        />
        <button
          onClick={copyCode}
          className="ml-auto border border-[#2a3040] rounded-md px-3 py-1 text-[12.5px] text-[#8b93a7] hover:text-[#e6e9f0]"
        >
          {copied ? "✓ Copied" : "⧉ Copy code"}
        </button>
      </div>

      <CodeEditor key={active.id} value={active.code} onChange={(code) => patchActive({ code })} />
    </div>
  );
}
