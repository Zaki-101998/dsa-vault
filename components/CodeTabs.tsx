"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { CodeEditor } from "./CodeEditor";
import { newApproachId } from "@/lib/sheet";
import { formatCode } from "@/lib/format";
import type { Approach, CodeLang } from "@/lib/types";

const LANG_LABELS: Record<CodeLang, string> = { java: "Java", cpp: "C++", python: "Python" };

// The fixed set of canonical approach slots, always shown in this order.
const CANONICAL = ["Brute", "Better", "Optimal"] as const;

function isCanonical(a: Approach): boolean {
  return !a.custom && (CANONICAL as readonly string[]).includes(a.label);
}

function hasContent(a: Approach | undefined): boolean {
  return !!a && (!!a.code.trim() || !!a.time.trim() || !!a.space.trim());
}

// The tab a problem opens on: the first "added" approach in display order —
// canonical slots (in fixed order) that have content, then any legacy custom
// approaches. Returns undefined when nothing has been added yet.
function firstAddedId(approaches: Approach[]): string | undefined {
  for (const label of CANONICAL) {
    const a = approaches.find((x) => isCanonical(x) && x.label === label);
    if (hasContent(a)) return a!.id;
  }
  const custom = approaches.find((x) => !isCanonical(x));
  return custom?.id;
}

export function CodeTabs({
  approaches,
  onChange,
}: {
  approaches: Approach[];
  onChange: (approaches: Approach[]) => void;
}) {
  const [activeId, setActiveId] = useState<string | undefined>(() => firstAddedId(approaches));
  const [copied, setCopied] = useState(false);
  const [fmtState, setFmtState] = useState<"idle" | "working" | "done" | "error">("idle");
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  // Formatting is async — by the time it resolves, `approaches` from this render
  // may be stale, so async patches read the latest array from this ref instead.
  const approachesRef = useRef(approaches);
  useEffect(() => {
    approachesRef.current = approaches;
  }, [approaches]);

  const active = approaches.find((a) => a.id === activeId);
  const lang: CodeLang = active?.lang ?? "java";

  // Canonical slots in fixed order: each is a real tab when it has content or is
  // the one being edited, otherwise a dashed "+ label" placeholder.
  const canonicalSlots = CANONICAL.map((label) => {
    const appr = approaches.find((a) => isCanonical(a) && a.label === label);
    const isReal = hasContent(appr) || (!!appr && appr.id === activeId);
    return { label, appr, isReal };
  });
  // Legacy custom approaches (from before the placeholder model) stay visible.
  const customApproaches = approaches.filter((a) => !isCanonical(a));

  function patchActive(patch: Partial<Approach>) {
    if (!active) return;
    const next = approaches.map((a) => (a.id === active.id ? { ...a, ...patch } : a));
    onChange(next);
  }

  async function runFormat(source: string, opts: { silent: boolean }) {
    if (!active || !source.trim()) return;
    const targetId = active.id;
    if (!opts.silent) setFmtState("working");
    try {
      const formatted = await formatCode(source, lang);
      // The mounted editor doesn't pick up external `value` changes, so apply the
      // result straight into the CodeMirror view — its change listener then syncs
      // state. Guards: only if the doc is still exactly what we formatted (no
      // tab switch or typing meanwhile); otherwise patch state only if the target
      // approach's code is unchanged, and the remount-on-select will display it.
      const view = editorRef.current?.view;
      if (view && view.state.doc.toString() === source) {
        if (formatted !== source) {
          view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: formatted } });
        }
      } else {
        onChange(
          approachesRef.current.map((a) =>
            a.id === targetId && a.code === source ? { ...a, code: formatted } : a
          )
        );
      }
      if (!opts.silent) {
        setFmtState("done");
        setTimeout(() => setFmtState("idle"), 1200);
      }
    } catch {
      // Unformattable (e.g. syntactically broken snippet) — keep the code as-is.
      if (!opts.silent) {
        setFmtState("error");
        setTimeout(() => setFmtState("idle"), 1800);
      }
    }
  }

  // Add (or re-activate) one of the canonical slots from its placeholder.
  function addCanonical(label: (typeof CANONICAL)[number]) {
    const existing = approaches.find((a) => isCanonical(a) && a.label === label);
    if (existing) {
      setActiveId(existing.id);
      return;
    }
    const na: Approach = {
      id: newApproachId(),
      label,
      code: "",
      time: "",
      space: "",
      custom: false,
      lang,
    };
    onChange([...approaches, na]);
    setActiveId(na.id);
  }

  // Remove an approach, reverting a canonical slot back to a placeholder.
  function removeApproach(a: Approach) {
    const next = approaches.filter((x) => x.id !== a.id);
    onChange(next);
    if (a.id === activeId) setActiveId(firstAddedId(next));
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

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex gap-1.5 mb-2.5 flex-wrap items-center">
        {canonicalSlots.map(({ label, appr, isReal }) =>
          isReal && appr ? (
            <button
              key={label}
              onClick={() => setActiveId(appr.id)}
              className={`border rounded-md px-3.5 py-1 text-[13px] flex items-center gap-2 ${
                appr.id === activeId
                  ? "text-white bg-[#232937] border-[#5b8cff]"
                  : "text-[#8b93a7] border-[#2a3040] hover:text-[#e6e9f0] bg-[#161a22]"
              }`}
            >
              {label}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  removeApproach(appr);
                }}
                className="text-[11px] opacity-60 hover:opacity-100 hover:text-[#e12d39]"
                title="Remove"
              >
                ✕
              </span>
            </button>
          ) : (
            <button
              key={label}
              onClick={() => addCanonical(label)}
              className="border border-dashed border-[#2a3040] rounded-md px-3.5 py-1 text-[13px] text-[#565e73] hover:text-[#5b8cff] hover:border-[#5b8cff]"
              title={`Add ${label}`}
            >
              + {label}
            </button>
          )
        )}
        {customApproaches.map((a) => (
          <button
            key={a.id}
            onClick={() => setActiveId(a.id)}
            className={`border rounded-md px-3.5 py-1 text-[13px] flex items-center gap-2 ${
              a.id === activeId
                ? "text-white bg-[#232937] border-[#5b8cff]"
                : "text-[#8b93a7] border-[#2a3040] hover:text-[#e6e9f0] bg-[#161a22]"
            }`}
          >
            {a.label}
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
          </button>
        ))}
      </div>

      {!active ? (
        <div className="flex-1 flex items-center justify-center text-[#8b93a7] text-sm">
          Add Brute / Better / Optimal above to start.
        </div>
      ) : (
        <>
      <div className="flex gap-2.5 mb-2.5 items-center">
        <label className="text-xs text-[#8b93a7]">Time</label>
        <input
          value={active.time}
          onChange={(e) => patchActive({ time: e.target.value })}
          placeholder="O(n log n)"
          className="w-[150px] font-mono text-[12.5px] bg-[#1c212c] border border-[#2a3040] rounded-md px-2.5 py-1 outline-none focus:border-[#5b8cff]"
        />
        <label className="text-xs text-[#8b93a7]">Space</label>
        <input
          value={active.space}
          onChange={(e) => patchActive({ space: e.target.value })}
          placeholder="O(1)"
          className="w-[150px] font-mono text-[12.5px] bg-[#1c212c] border border-[#2a3040] rounded-md px-2.5 py-1 outline-none focus:border-[#5b8cff]"
        />
        <select
          value={lang}
          onChange={(e) => patchActive({ lang: e.target.value as CodeLang })}
          className="ml-auto text-[12.5px] bg-[#1c212c] border border-[#2a3040] rounded-md px-2 py-1 text-[#e6e9f0] outline-none focus:border-[#5b8cff]"
          title="Language for this approach"
        >
          {(Object.keys(LANG_LABELS) as CodeLang[]).map((l) => (
            <option key={l} value={l}>
              {LANG_LABELS[l]}
            </option>
          ))}
        </select>
        <button
          onClick={() => runFormat(active.code, { silent: false })}
          disabled={fmtState === "working"}
          className="border border-[#2a3040] rounded-md px-3 py-1 text-[12.5px] text-[#8b93a7] hover:text-[#e6e9f0] disabled:opacity-60"
        >
          {fmtState === "working"
            ? "Formatting…"
            : fmtState === "done"
              ? "✓ Formatted"
              : fmtState === "error"
                ? "Couldn't format"
                : "✨ Format"}
        </button>
        <button
          onClick={copyCode}
          className="border border-[#2a3040] rounded-md px-3 py-1 text-[12.5px] text-[#8b93a7] hover:text-[#e6e9f0]"
        >
          {copied ? "✓ Copied" : "⧉ Copy code"}
        </button>
      </div>

      <CodeEditor
        key={`${active.id}:${lang}`}
        editorRef={editorRef}
        value={active.code}
        lang={lang}
        onChange={(code) => patchActive({ code })}
        onPasted={(doc) => runFormat(doc, { silent: true })}
      />
        </>
      )}
    </div>
  );
}
