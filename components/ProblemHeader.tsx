"use client";

import { useState } from "react";
import { RevisionStar } from "./RevisionStar";
import { GradeButtons, fmtWindow } from "./GradeButtons";
import { daysSince, isOverdue } from "@/lib/decay";
import { GRADES, windowDays } from "@/lib/schedule";
import { LinkEditor } from "./LinkEditor";
import { needsResource, problemLinks, type LinkChip } from "@/lib/links";
import { knownSections } from "@/lib/sheet";
import type { EntryTab, SubjectConfig } from "@/lib/subjects";
import type { Grade, Problem, Status } from "@/lib/types";

const STATUSES: Status[] = ["Unsolved", "Attempted", "Solved"];

/** One link badge. `compact` is the phone sizing. Also rendered by the drill card. */
export function LinkBadge({ chip, compact }: { chip: LinkChip; compact?: boolean }) {
  return (
    <a
      href={chip.href}
      target="_blank"
      rel="noopener noreferrer"
      title={chip.title}
      className={`border rounded-md shrink-0 font-semibold hover:brightness-110 ${
        compact ? "px-1.5 py-0.5 text-[11px]" : "px-2.5 py-1 text-[13px]"
      } ${chip.className}`}
    >
      {chip.label}
    </a>
  );
}

/** One technique chip. Clicking it opens that pattern's intro page. */
function PatternChip({
  chip,
  onOpen,
  compact,
}: {
  chip: { id: string; title: string; primary: boolean };
  onOpen: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={() => onOpen(chip.id)}
      title={`Open the ${chip.title} pattern — what to revise for it, and the other problems that use it`}
      className={`border rounded-md shrink-0 font-semibold hover:brightness-125 ${
        compact ? "px-1.5 py-0.5 text-[11px]" : "px-1.5 py-0.5 text-[11px]"
      } ${
        chip.primary
          ? "text-[#5b8cff] border-[#5b8cff]/40"
          : "text-[#8b93a7] border-[#2a3040]"
      }`}
    >
      {chip.primary ? "🧩 " : "also "}
      {chip.title}
    </button>
  );
}

function fmtAgo(ts: number): string {
  const m = (Date.now() - ts) / 60000;
  if (m < 1) return "just now";
  if (m < 60) return Math.floor(m) + "m ago";
  if (m < 1440) return Math.floor(m / 60) + "h ago";
  const d = Math.floor(m / 1440);
  return d + (d === 1 ? " day ago" : " days ago");
}

export function ProblemHeader({
  problem,
  subject,
  knownTopics,
  canWatchVideo,
  decayDays,
  activeTab,
  onTabChange,
  onRename,
  onRetopic,
  onResection,
  onLinksChange,
  onStatusChange,
  onStarClick,
  onMarkRevised,
  onGrade,
  onRemoveStar,
  onDelete,
  planned,
  onPlan,
  patternChips,
  onOpenPattern,
}: {
  problem: Problem;
  subject: SubjectConfig;
  /** Section titles suggested in the topic datalist, scoped to this subject. */
  knownTopics: string[];
  /** False hides the Drive link entirely — see lib/useVideoAccess.ts. */
  canWatchVideo: boolean;
  decayDays: number;
  activeTab: EntryTab;
  onTabChange: (tab: EntryTab) => void;
  onRename: (name: string) => void;
  onRetopic: (topic: string) => void;
  /** Move the problem to another subsection of its step ("" puts it at the top). */
  onResection: (section: string) => void;
  /** Writes the user's own article and/or problem link. */
  onLinksChange: (patch: { custom_link?: string; custom_practice_link?: string }) => void;
  onStatusChange: (status: Status) => void;
  /** Clicking the star icon itself: marks revised, or un-stars if already fresh (<12h). */
  onStarClick: () => void;
  /** The explicit "Mark Revised" button: always marks revised. Mobile only now. */
  onMarkRevised: () => void;
  /**
   * A graded revision — marks revised *and* records how the recall went, which
   * sets this problem's own window. Replaces "Mark Revised" on desktop.
   */
  onGrade: (grade: Grade) => void;
  onRemoveStar: () => void;
  onDelete: () => void;
  /** True when this problem already has an unfinished todo in the daily plan. */
  planned: boolean;
  onPlan: (day: "today" | "tomorrow") => void;
  /**
   * The techniques this problem is about: its primary pattern first, then the
   * patterns that list it under `borrows`. Empty for every subject but DSA —
   * Workspace resolves them, so this component stays subject-agnostic.
   */
  patternChips?: { id: string; title: string; primary: boolean }[];
  onOpenPattern?: (id: string) => void;
}) {
  // Local, blur-committed copies of the editable fields. The parent renders this
  // component with `key={problem.key}` so switching problems remounts it fresh
  // rather than needing an effect to resync state.
  const [name, setName] = useState(problem.name);
  const [topic, setTopic] = useState(problem.topic);

  // This problem's own window once it has a grade, else the global setting.
  const win = windowDays(problem, decayDays);
  const overdue = isOverdue(problem.starred, problem.lastRevised, win);
  const grade = problem.recall ? GRADES[problem.recall] : null;
  // One ordered list, rendered by both the mobile and desktop rows below.
  const links = problemLinks(problem, { canWatchVideo });
  // Offered only where the problem's step actually has subsections.
  const sections = knownSections(subject.id, topic);
  const skippable = problem.kind === "problem";
  const stub = subject.hasResourceGaps && needsResource(problem);
  const chips = onOpenPattern && patternChips?.length ? patternChips : [];

  return (
    <div className="px-3 md:px-5 pt-3 md:pt-4 border-b border-[#2a3040]">
      {/* Mobile: compact read-mode strip — star + name + Mark Revised. Links follow
          on their own line below. */}
      <div className="md:hidden flex items-center gap-2.5 mb-2">
        <RevisionStar
          starred={problem.starred}
          lastRevised={problem.lastRevised}
          decayDays={win}
          size={20}
          onClick={onStarClick}
        />
        <span className="flex-1 min-w-0 truncate text-[16px] font-bold">
          {problem.name || "Untitled"}
        </span>
        {problem.starred && (
          <span
            className={`text-[11px] font-bold shrink-0 ${overdue ? "text-[#e12d39]" : "text-[#8b93a7]"}`}
            title={overdue ? "Overdue — revise now!" : "Days since last revision"}
          >
            {Math.floor(daysSince(problem.lastRevised))}d
          </span>
        )}
        <button
          onClick={onMarkRevised}
          className="bg-[#3ecf8e] text-[#08130d] font-bold rounded-lg px-2 py-1 text-xs shrink-0 hover:brightness-110"
        >
          ✓ Revised
        </button>
      </div>

      {/* Mobile: the technique gets its own strip, directly under the title —
          the first thing you want on the revision surface. The compact row
          above is already full, so it cannot ride along there. */}
      {chips.length > 0 && (
        <div className="md:hidden flex gap-1.5 overflow-x-auto no-scrollbar mb-2">
          {chips.map((chip) => (
            <PatternChip key={chip.id} chip={chip} onOpen={onOpenPattern!} compact />
          ))}
        </div>
      )}

      {/* Mobile: links get their own line — four badges never fit beside the name.
          Scrolls sideways rather than wrapping, like the subject strip. */}
      {links.length > 0 && (
        <div className="md:hidden flex gap-1.5 overflow-x-auto no-scrollbar mb-2">
          {links.map((chip) => (
            <LinkBadge key={chip.key} chip={chip} compact />
          ))}
        </div>
      )}

      <div className="hidden md:flex flex-wrap gap-2.5 items-center mb-2.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== problem.name && onRename(name.trim())}
          placeholder={`${subject.entryNoun} name`}
          className="flex-1 min-w-[140px] text-[19px] font-bold bg-transparent border border-transparent rounded-md px-2 py-1 outline-none hover:bg-[#1c212c] focus:bg-[#1c212c] focus:border-[#2a3040]"
        />
        {subject.showDifficulty && problem.difficulty && (
          <span className="text-[13px] text-[#8b93a7] shrink-0">{problem.difficulty}</span>
        )}
        {/* The pattern sits with the difficulty rather than down in the links
            row: it is an identity fact about the problem, the same class of
            thing as its tier, and it is internal navigation rather than an
            external link. */}
        {chips.map((chip) => (
          <PatternChip key={chip.id} chip={chip} onOpen={onOpenPattern!} />
        ))}
        {skippable && (
          <span
            title="A worked-question video — safe to skip on a first pass"
            className="text-[11px] font-semibold text-[#8b93a7] border border-[#2a3040] rounded-md px-1.5 py-0.5 shrink-0"
          >
            skippable
          </span>
        )}
        {stub && (
          <span
            title="A syllabus topic with nothing attached yet — paste a link below and this clears"
            className="text-[11px] font-semibold text-[#5b8cff] border border-[#5b8cff]/40 rounded-md px-1.5 py-0.5 shrink-0"
          >
            needs a resource
          </span>
        )}
        <select
          value={problem.status}
          onChange={(e) => onStatusChange(e.target.value as Status)}
          className="bg-[#1c212c] border border-[#2a3040] rounded-md px-2 py-1 text-[13px] outline-none"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {subject.statusLabels[s]}
            </option>
          ))}
        </select>
        <button
          onClick={() =>
            confirm(
              `Delete "${problem.name || "Untitled"}" and all its notes${
                subject.tabs.includes("code") ? "/code" : ""
              }/revision history?`
            ) && onDelete()
          }
          title={`Delete ${subject.entryNoun} data`}
          className="text-[#8b93a7] hover:text-[#e12d39] hover:bg-[#1c212c] rounded-md w-8 h-8 flex items-center justify-center"
        >
          🗑
        </button>
      </div>

      <div className="hidden md:flex flex-wrap gap-2.5 mb-3">
        <input
          list="header-topics"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onBlur={() => topic.trim() && topic !== problem.topic && onRetopic(topic.trim())}
          placeholder={subject.topicPlaceholder}
          className="w-full sm:w-[220px] bg-[#1c212c] border border-[#2a3040] rounded-md px-2.5 py-1.5 text-[13px] outline-none focus:border-[#5b8cff]"
        />
        <datalist id="header-topics">
          {knownTopics.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        {sections.length > 0 && (
          <select
            value={sections.includes(problem.section) ? problem.section : ""}
            onChange={(e) => onResection(e.target.value)}
            title="Which subsection this problem sits in"
            className="w-full sm:w-[200px] bg-[#1c212c] border border-[#2a3040] rounded-md px-2.5 py-1.5 text-[13px] outline-none focus:border-[#5b8cff]"
          >
            <option value="">— top of section —</option>
            {sections.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
        )}
        {links.map((chip) => (
          <LinkBadge key={chip.key} chip={chip} />
        ))}
        <LinkEditor
          customLink={problem.customLink}
          customPracticeLink={problem.customPracticeLink}
          customVideoLink={problem.customVideoLink}
          sheetArticle={problem.customLink ? "" : problem.link}
          onChange={onLinksChange}
        />
      </div>

      <div className="hidden md:flex flex-wrap items-center gap-3.5 mb-3.5 bg-[#161a22] border border-[#2a3040] rounded-xl px-3.5 py-2.5">
        <RevisionStar
          starred={problem.starred}
          lastRevised={problem.lastRevised}
          decayDays={win}
          size={28}
          onClick={onStarClick}
        />
        <div className="text-[12.5px] text-[#8b93a7] flex-1 min-w-[180px]">
          {!problem.starred ? (
            <>
              Not in revision rotation. Grade your recall to start tracking — the star then fades
              gold → red over a window set by the grade.
            </>
          ) : (
            <>
              Revised <b className="text-[#e6e9f0]">{problem.revCount}×</b> · last{" "}
              <b className="text-[#e6e9f0]">{fmtAgo(problem.lastRevised!)}</b> ·{" "}
              {grade && (
                <>
                  <b style={{ color: grade.color }}>{grade.label}</b> ·{" "}
                </>
              )}
              {overdue ? (
                <b className="text-[#e12d39]">OVERDUE — revise now!</b>
              ) : (
                <>
                  turns red in{" "}
                  <b className="text-[#e6e9f0]">
                    {Math.max(win - daysSince(problem.lastRevised), 0).toFixed(1)} days
                  </b>{" "}
                  <span title="This problem's revision window — set by its last recall grade, or the sidebar's base window until it has one">
                    ({fmtWindow(win)} window)
                  </span>
                </>
              )}
            </>
          )}
        </div>
        {planned ? (
          <span
            title="Already in your daily plan (open ☑ Today in the top bar)"
            className="text-[12.5px] text-[#3ecf8e] border border-[#3ecf8e]/40 rounded-lg px-2.5 py-1.5 shrink-0"
          >
            ✓ Planned
          </span>
        ) : (
          <span className="flex shrink-0">
            <button
              onClick={() => onPlan("today")}
              title={`Add “Revise: this ${subject.entryNoun}” to today's plan`}
              className="border border-[#2a3040] rounded-l-lg px-2.5 py-1.5 text-xs text-[#8b93a7] hover:text-[#5b8cff] hover:border-[#5b8cff]"
            >
              📋 Plan today
            </button>
            <button
              onClick={() => onPlan("tomorrow")}
              title="Add to tomorrow's plan instead"
              className="border border-l-0 border-[#2a3040] rounded-r-lg px-2 py-1.5 text-xs text-[#8b93a7] hover:text-[#5b8cff] hover:border-[#5b8cff]"
            >
              tmrw
            </button>
          </span>
        )}
        <GradeButtons problem={problem} decayDays={decayDays} onGrade={onGrade} />
        {problem.starred && (
          <button
            onClick={onRemoveStar}
            className="border border-[#2a3040] rounded-lg px-2.5 py-1.5 text-xs text-[#8b93a7] hover:text-[#e6e9f0]"
          >
            Remove star
          </button>
        )}
      </div>

      {/* Notes-only subjects get no tab strip — there is nothing to switch to. */}
      {subject.tabs.length > 1 && (
        <div className="flex gap-0.5">
          {subject.tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`px-3 py-2 md:px-4 md:py-2.5 text-[13.5px] font-semibold border-b-2 ${
                activeTab === tab
                  ? "text-[#5b8cff] border-[#5b8cff]"
                  : "text-[#8b93a7] border-transparent hover:text-[#e6e9f0]"
              }`}
            >
              {tab === "notes" ? "📝 Notes" : "💻 Code"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
