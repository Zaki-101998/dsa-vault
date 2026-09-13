"use client";

import { useState } from "react";
import { RevisionStar } from "./RevisionStar";
import { daysSince, isOverdue } from "@/lib/decay";
import { VIDEO_BADGE, driveFileUrl, linkPlatform } from "@/lib/links";
import type { EntryTab, SubjectConfig } from "@/lib/subjects";
import type { Problem, Status } from "@/lib/types";

const STATUSES: Status[] = ["Unsolved", "Attempted", "Solved"];

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
  onRelink,
  onStatusChange,
  onStarClick,
  onMarkRevised,
  onRemoveStar,
  onDelete,
  planned,
  onPlan,
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
  onRelink: (link: string) => void;
  onStatusChange: (status: Status) => void;
  /** Clicking the star icon itself: marks revised, or un-stars if already fresh (<12h). */
  onStarClick: () => void;
  /** The explicit "Mark Revised" button: always marks revised. */
  onMarkRevised: () => void;
  onRemoveStar: () => void;
  onDelete: () => void;
  /** True when this problem already has an unfinished todo in the daily plan. */
  planned: boolean;
  onPlan: (day: "today" | "tomorrow") => void;
}) {
  // Local, blur-committed copies of the editable fields. The parent renders this
  // component with `key={problem.key}` so switching problems remounts it fresh
  // rather than needing an effect to resync state.
  const [name, setName] = useState(problem.name);
  const [topic, setTopic] = useState(problem.topic);
  const [link, setLink] = useState(problem.link);

  const overdue = isOverdue(problem.starred, problem.lastRevised, decayDays);
  const practice = linkPlatform(problem.practiceLink);
  const videoUrl = problem.videoFileId && canWatchVideo ? driveFileUrl(problem.videoFileId) : "";
  const skippable = problem.kind === "problem";

  return (
    <div className="px-3 md:px-5 pt-3 md:pt-4 border-b border-[#2a3040]">
      {/* Mobile: compact read-mode strip — star + name + video + Mark Revised only. */}
      <div className="md:hidden flex items-center gap-2.5 mb-2">
        <RevisionStar
          starred={problem.starred}
          lastRevised={problem.lastRevised}
          decayDays={decayDays}
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
        {videoUrl && (
          <button
            onClick={() => window.open(videoUrl, "_blank", "noopener,noreferrer")}
            title="Watch the lecture on Drive"
            className={`border rounded-lg px-2 py-1 text-xs font-semibold shrink-0 ${VIDEO_BADGE.className}`}
          >
            ▶
          </button>
        )}
        <button
          onClick={onMarkRevised}
          className="bg-[#3ecf8e] text-[#08130d] font-bold rounded-lg px-2 py-1 text-xs shrink-0 hover:brightness-110"
        >
          ✓ Revised
        </button>
      </div>

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
        {skippable && (
          <span
            title="A worked-question video — safe to skip on a first pass"
            className="text-[11px] font-semibold text-[#8b93a7] border border-[#2a3040] rounded-md px-1.5 py-0.5 shrink-0"
          >
            skippable
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
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onBlur={() => link !== problem.link && onRelink(link.trim())}
          placeholder={subject.linkPlaceholder}
          className="flex-1 min-w-[160px] bg-[#1c212c] border border-[#2a3040] rounded-md px-2.5 py-1.5 text-[13px] outline-none focus:border-[#5b8cff]"
        />
        <button
          onClick={() => problem.link && window.open(problem.link, "_blank", "noopener,noreferrer")}
          disabled={!problem.link}
          className="border border-[#2a3040] rounded-md px-2.5 text-[13px] text-[#5b8cff] hover:border-[#5b8cff] disabled:opacity-40 disabled:hover:border-[#2a3040]"
        >
          ↗ Open
        </button>
        {videoUrl && (
          <button
            onClick={() => window.open(videoUrl, "_blank", "noopener,noreferrer")}
            title="Watch the lecture on Google Drive"
            className={`border rounded-md px-2.5 text-[13px] font-semibold hover:brightness-110 ${VIDEO_BADGE.className}`}
          >
            {VIDEO_BADGE.label} ↗
          </button>
        )}
        {practice && (
          <button
            onClick={() => window.open(problem.practiceLink, "_blank", "noopener,noreferrer")}
            title={`Solve on ${practice.label}`}
            className={`border rounded-md px-2.5 text-[13px] font-semibold hover:brightness-110 ${practice.className}`}
          >
            {practice.label} ↗
          </button>
        )}
      </div>

      <div className="hidden md:flex flex-wrap items-center gap-3.5 mb-3.5 bg-[#161a22] border border-[#2a3040] rounded-xl px-3.5 py-2.5">
        <RevisionStar
          starred={problem.starred}
          lastRevised={problem.lastRevised}
          decayDays={decayDays}
          size={28}
          onClick={onStarClick}
        />
        <div className="text-[12.5px] text-[#8b93a7] flex-1 min-w-[180px]">
          {!problem.starred ? (
            <>
              Not in revision rotation. Click <b className="text-[#e6e9f0]">Mark Revised</b> to start tracking —
              the star fades gold → red over {decayDays} days.
            </>
          ) : (
            <>
              Revised <b className="text-[#e6e9f0]">{problem.revCount}×</b> · last{" "}
              <b className="text-[#e6e9f0]">{fmtAgo(problem.lastRevised!)}</b> ·{" "}
              {overdue ? (
                <b className="text-[#e12d39]">OVERDUE — revise now!</b>
              ) : (
                <>
                  turns red in{" "}
                  <b className="text-[#e6e9f0]">
                    {Math.max(decayDays - daysSince(problem.lastRevised), 0).toFixed(1)} days
                  </b>
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
        <button
          onClick={onMarkRevised}
          className="bg-[#3ecf8e] text-[#08130d] font-bold rounded-lg px-3.5 py-1.5 text-[13px] hover:brightness-110"
        >
          ✓ Mark Revised
        </button>
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
