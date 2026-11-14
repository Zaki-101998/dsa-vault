"use client";

import { ProblemRow } from "./ProblemRow";
import { CodeEditor } from "./CodeEditor";
import { LANG_LABELS } from "@/lib/format";
import { patternProgress } from "@/lib/patterns";
import { decayColor } from "@/lib/decay";
import { GRADES, GRADE_ORDER } from "@/lib/schedule";
import { useIsMobile } from "@/lib/useIsMobile";
import type { CodeLang, PatternDef, PatternFamily, Problem, Status } from "@/lib/types";

// A pattern's intro page: what the technique is, how to recognise it, the
// template, and what to revise for it — then the problems that are really about
// it, with their live status and stars.
//
// Fixed six-block layout, deliberately about one screen: every pattern reads
// the same way, so this is skimmable right before a revision session. A
// three-page essay per pattern would not get re-read.
//
// This replaces ProblemHeader + NotesEditor/CodeTabs in the main pane — it is
// not a third tab — so it owns its own scroll container.

const LANG_ORDER: CodeLang[] = ["java", "cpp", "python"];

/**
 * Renders prose with `backtick` spans as inline code. The catalog is plain
 * strings, not markdown: there is no sanitizer in this project and no
 * dangerouslySetInnerHTML anywhere in it, and a fixed set of six blocks needs
 * no parser. This is the whole of the formatting.
 */
export function Inline({ text }: { text: string }) {
  const parts = text.split("`");
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <code
            key={i}
            className="bg-[#1c212c] border border-[#2a3040] rounded px-1 py-[1px] text-[0.92em] font-mono"
          >
            {part}
          </code>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

/** One of the six blocks. Also the drill's reveal panels. */
export function Block({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-[#161a22] border border-[#2a3040] rounded-xl p-3.5 md:p-4">
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#8b93a7] mb-2.5">
        {icon} {title}
      </h3>
      {children}
    </section>
  );
}

/** A bulleted list of prose lines, with `marker` as the bullet colour. */
export function Bullets({ items, marker }: { items: string[]; marker: string }) {
  return (
    <ul className="space-y-1.5 text-[13px] leading-relaxed text-[#c7ccd8]">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="shrink-0 select-none" style={{ color: marker }}>
            ▸
          </span>
          <span className="min-w-0">
            <Inline text={item} />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PatternPage({
  pattern,
  family,
  problems,
  borrowed,
  decayDays,
  statusLabels,
  markStubs,
  lang,
  onLangChange,
  onSelectProblem,
  onToggleStar,
  onOpenPattern,
  onPlan,
  onDrill,
}: {
  pattern: PatternDef;
  family: PatternFamily | null;
  /**
   * The pattern's own problems, in the catalog's teaching order — the same
   * Problem objects the sidebar renders, so a star toggled here is already
   * toggled there.
   */
  problems: Problem[];
  /** Problems whose primary pattern is elsewhere but that also lean on this one. */
  borrowed: { problem: Problem; primary: PatternDef | null }[];
  decayDays: number;
  statusLabels: Record<Status, string>;
  markStubs: boolean;
  /**
   * Which language the template shows. Lifted to Workspace, because this
   * component is keyed by pattern.id — local state would reset the choice every
   * time another pattern is opened.
   */
  lang: CodeLang;
  onLangChange: (lang: CodeLang) => void;
  onSelectProblem: (key: string) => void;
  onToggleStar: (key: string) => void;
  /** Jump to another pattern — the borrowed rows' "primary: X" chip. */
  onOpenPattern: (id: string) => void;
  /**
   * Adds "Revise: <pattern> pattern" to the daily plan. A pattern todo carries
   * no problem_key, so there is no "already planned" state to show — the
   * buttons are always offered.
   */
  onPlan: (day: "today" | "tomorrow") => void;
  /** Opens the drill setup scoped to this pattern's problems. */
  onDrill: () => void;
}) {
  const isMobile = useIsMobile();
  const { total, solved, starred, due, stalestDays, stalestWindow, grades } = patternProgress(
    problems,
    decayDays
  );
  const graded = grades.red + grades.yellow + grades.green;

  // Only the languages actually authored. One language means no switcher.
  const langs = LANG_ORDER.filter((l) => pattern.template[l]);
  const shown = pattern.template[lang] ? lang : "java";
  const stalestColor = stalestDays === null ? null : decayColor(stalestDays, stalestWindow);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="px-3 md:px-5 py-3 md:py-4 max-w-[900px] space-y-3">
        <header>
          <div className="text-[11px] font-bold uppercase tracking-wide text-[#5b8cff] mb-1">
            🧩 {family?.title ?? "Pattern"}
          </div>
          <h2 className="text-[20px] md:text-[23px] font-bold leading-tight">{pattern.title}</h2>
          <p className="text-[14px] md:text-[15px] text-[#8b93a7] mt-1.5 leading-relaxed">
            <Inline text={pattern.hook} />
          </p>
        </header>

        {/* Progress and staleness — "has this pattern gone cold?" answered
            without opening anything, plus the one action that makes revising
            pattern-wise a workflow rather than just a different list. */}
        <div className="bg-[#161a22] border border-[#2a3040] rounded-xl px-3.5 py-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-2 text-[12.5px] text-[#8b93a7]">
          <span className="font-semibold text-[#e6e9f0]">
            {solved}/{total} {statusLabels.Solved.toLowerCase()}
          </span>
          <span>{starred} in rotation</span>
          {due > 0 ? (
            <span className="text-[#e12d39] font-semibold">⚠ {due} due for revision</span>
          ) : (
            <span className="text-[#3ecf8e]">✓ revision clear</span>
          )}
          {stalestDays !== null && (
            <span title="The problem here that is furthest through its own revision window">
              stalest{" "}
              <b className="font-bold" style={{ color: stalestColor ?? undefined }}>
                {Math.floor(stalestDays)}d
              </b>
            </span>
          )}
          {/* How the recall went last time, across the pattern — the at-a-glance
              answer to "do I actually know this technique?". */}
          {graded > 0 && (
            <span className="flex gap-2" title="Last recall grade of each graded problem here">
              {[...GRADE_ORDER].reverse().map((g) =>
                grades[g] > 0 ? (
                  <span key={g} className="font-semibold" style={{ color: GRADES[g].color }}>
                    {grades[g]} {GRADES[g].label.toLowerCase()}
                  </span>
                ) : null
              )}
            </span>
          )}
          <span className="ml-auto flex shrink-0 gap-2">
            <button
              onClick={onDrill}
              title="Recall each of this pattern's problems, then check against your notes"
              className="border border-[#5b8cff]/50 text-[#5b8cff] rounded-lg px-2.5 py-1 text-xs font-semibold hover:bg-[#5b8cff]/10"
            >
              ▶ Drill
            </button>
            <span className="flex">
            <button
              onClick={() => onPlan("today")}
              title={`Add “Revise: ${pattern.title} pattern” to today's plan`}
              className="border border-[#2a3040] rounded-l-lg px-2.5 py-1 text-xs hover:text-[#5b8cff] hover:border-[#5b8cff]"
            >
              📋 Plan today
            </button>
            <button
              onClick={() => onPlan("tomorrow")}
              title="Add to tomorrow's plan instead"
              className="border border-l-0 border-[#2a3040] rounded-r-lg px-2 py-1 text-xs hover:text-[#5b8cff] hover:border-[#5b8cff]"
            >
              tmrw
            </button>
            </span>
          </span>
        </div>

        <Block icon="🔍" title="Reach for it when you see">
          <Bullets items={pattern.cues} marker="#5b8cff" />
        </Block>

        <Block icon="💻" title="The template">
          {langs.length > 1 && (
            <div className="flex gap-1 mb-2.5">
              {langs.map((l) => (
                <button
                  key={l}
                  onClick={() => onLangChange(l)}
                  aria-pressed={shown === l}
                  className={`rounded-md px-2.5 py-1 text-[12px] font-semibold border ${
                    shown === l
                      ? "text-[#5b8cff] border-[#5b8cff]/50 bg-[#5b8cff]/10"
                      : "text-[#8b93a7] border-[#2a3040] hover:text-[#e6e9f0] hover:border-[#565e73]"
                  }`}
                >
                  {LANG_LABELS[l]}
                </button>
              ))}
            </div>
          )}
          {/* Read-only CodeEditor rather than a <pre>: same CodeMirror and
              oneDark theme as the Code tab, so a template looks exactly like
              your own solutions. readOnly also keeps the mobile keyboard shut,
              matching the read-only revision surface the md: breakpoint sets up. */}
          <div className="h-[260px] md:h-[340px] flex flex-col">
            <CodeEditor
              key={`${pattern.id}:${shown}`}
              value={pattern.template[shown] ?? ""}
              lang={shown}
              readOnly
              onChange={() => {}}
            />
          </div>
        </Block>

        <Block icon="🧠" title="Moving parts to recall">
          <Bullets items={pattern.recall} marker="#3ecf8e" />
        </Block>

        <Block icon="⏱" title="Complexity">
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-[13px]">
            <span>
              <span className="text-[#8b93a7]">time </span>
              <b className="text-[#e6e9f0] font-mono">{pattern.complexity.time}</b>
            </span>
            <span>
              <span className="text-[#8b93a7]">space </span>
              <b className="text-[#e6e9f0] font-mono">{pattern.complexity.space}</b>
            </span>
          </div>
          {pattern.complexity.note && (
            <p className="mt-2 text-[12.5px] leading-relaxed text-[#8b93a7]">
              <Inline text={pattern.complexity.note} />
            </p>
          )}
        </Block>

        <Block icon="⚠" title="Traps">
          <Bullets items={pattern.traps} marker="#f0b429" />
        </Block>

        <Block icon="📋" title={`Problems in this pattern · ${total}`}>
          <div className="-mx-1">
            {problems.map((p) => (
              <ProblemRow
                key={p.key}
                problem={p}
                selected={false}
                decayDays={decayDays}
                statusLabels={statusLabels}
                markStubs={markStubs}
                onSelect={() => onSelectProblem(p.key)}
                onToggleStar={() => onToggleStar(p.key)}
              />
            ))}
          </div>
        </Block>

        {borrowed.length > 0 && (
          <Block icon="🔗" title="Borrows from this pattern">
            <p className="text-[12.5px] text-[#8b93a7] mb-2 leading-relaxed">
              Filed under another pattern, but they lean on this one too.
            </p>
            <div className="-mx-1">
              {borrowed.map(({ problem, primary }) => (
                <div key={problem.key}>
                  <ProblemRow
                    problem={problem}
                    selected={false}
                    decayDays={decayDays}
                    statusLabels={statusLabels}
                    markStubs={markStubs}
                    onSelect={() => onSelectProblem(problem.key)}
                    onToggleStar={() => onToggleStar(problem.key)}
                  />
                  {primary && (
                    <button
                      onClick={() => onOpenPattern(primary.id)}
                      title={`Open the ${primary.title} pattern`}
                      className="ml-9 mb-1 text-[11px] text-[#565e73] hover:text-[#5b8cff]"
                    >
                      filed under {primary.title} →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Block>
        )}

        {/* The star is the one control that reads differently on a phone, where
            the rest of the surface is read-only. Say so once, at the bottom. */}
        {isMobile && (
          <p className="text-[11.5px] text-[#565e73] leading-relaxed pb-2">
            Tap a problem to open its notes, or its ☆ to mark it revised.
          </p>
        )}
      </div>
    </div>
  );
}
