"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The + at the end of the header's link row: attaches one article and one problem
 * link of your own to a problem.
 *
 * The article field replaces the sheet's article when set — there is only ever one
 * Article badge — so it shows the sheet's URL as a placeholder to make clear what
 * it would override. The problem field is additive and sits alongside the sheet's
 * own TUF/LeetCode links.
 *
 * Both commit on blur, matching how the name and topic fields in ProblemHeader
 * already behave. Clearing a field removes its badge.
 */
export function LinkEditor({
  customLink,
  customPracticeLink,
  sheetArticle,
  onChange,
}: {
  customLink: string;
  customPracticeLink: string;
  /** The sheet's own article, shown as placeholder — empty if it has none. */
  sheetArticle: string;
  onChange: (patch: { custom_link?: string; custom_practice_link?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [article, setArticle] = useState(customLink);
  const [practice, setPractice] = useState(customPracticeLink);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on Escape or a click outside. Bound only while open so the listeners
  // aren't live on every problem in the app.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const has = !!customLink || !!customPracticeLink;

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title={has ? "Edit your own links" : "Add your own article or problem link"}
        aria-expanded={open}
        className={`border rounded-md px-2 py-0.5 text-[13px] font-semibold leading-6 ${
          has
            ? "text-[#5b8cff] border-[#5b8cff]/40"
            : "text-[#565e73] border-[#2a3040] hover:text-[#e6e9f0] hover:border-[#565e73]"
        }`}
      >
        +
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-30 w-[320px] max-w-[85vw] bg-[#161a22] border border-[#2a3040] rounded-lg shadow-2xl p-3 space-y-2.5">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#8b93a7]">
              Article URL
            </span>
            <input
              value={article}
              onChange={(e) => setArticle(e.target.value)}
              onBlur={() => article.trim() !== customLink && onChange({ custom_link: article.trim() })}
              placeholder={sheetArticle || "https://…"}
              className="mt-1 w-full bg-[#1c212c] border border-[#2a3040] rounded-md px-2.5 py-1.5 text-[13px] outline-none focus:border-[#5b8cff]"
            />
            {sheetArticle && !article.trim() && (
              <span className="mt-1 block text-[11px] text-[#565e73]">
                Leave empty to keep the sheet&apos;s article.
              </span>
            )}
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#8b93a7]">
              Problem URL
            </span>
            <input
              value={practice}
              onChange={(e) => setPractice(e.target.value)}
              onBlur={() =>
                practice.trim() !== customPracticeLink &&
                onChange({ custom_practice_link: practice.trim() })
              }
              placeholder="https://…"
              className="mt-1 w-full bg-[#1c212c] border border-[#2a3040] rounded-md px-2.5 py-1.5 text-[13px] outline-none focus:border-[#5b8cff]"
            />
            <span className="mt-1 block text-[11px] text-[#565e73]">
              Shown next to the sheet&apos;s own links, not instead of them.
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
