"use client";

import { useEffect, useState } from "react";
import { CodeEditor } from "./CodeEditor";
import { GradeButtons } from "./GradeButtons";
import { NotesEditor } from "./NotesEditor";
import { Block, Bullets, Inline } from "./PatternPage";
import { LinkBadge } from "./ProblemHeader";
import type { DrillPlan } from "./DrillSetup";
import { problemLinks } from "@/lib/links";
import { ALSO_BY_KEY, FAMILIES_BY_ID, PRIMARY_BY_KEY } from "@/lib/patterns";
import { GRADES, GRADE_ORDER, RECALL_TEXT_MAX } from "@/lib/schedule";
import type { SubjectConfig } from "@/lib/subjects";
import { useIsMobile } from "@/lib/useIsMobile";
import type { Approach, Grade, Problem, RevRecord } from "@/lib/types";

// The revision loop itself: one problem at a time, answer hidden.
//
//   think   name and a link to the statement. Recall the approach — typed on
//           desktop, in your head on a phone — against a soft timer.
//   reveal  your recall next to the pattern's own summary, your notes and your
//           code. Grade yourself; the grade sets when this one comes back.
//
// Then a summary, whose one real action is turning the blanks into "code it
// from scratch" todos: recall is the default, coding is the remedy for a red.
//
// This replaces the sidebar as well as the main pane (see Workspace). The
// sidebar groups every problem under its step or its pattern, which is exactly
// the answer a blind drill is asking you to produce.

/** Past this the timer turns amber. A nudge, never a cut-off. */
const SOFT_LIMIT_S = 180;

/** In the think phase only "go and read the statement" links — not the article or the video. */
const STATEMENT_LINKS = new Set(["tuf", "practice", "custom-practice"]);

interface Result {
  key: string;
  /** null = skipped: seen, not graded, schedule untouched. */
  grade: Grade | null;
  seconds: number;
}

function fmtClock(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** "3 days ago" for a previous attempt. Manual, like the rest of the app — no toLocale*. */
function fmtWhen(at: number, now: number): string {
  const d = Math.floor((now - at) / 86_400_000);
  if (d <= 0) return "earlier today";
  return d === 1 ? "yesterday" : `${d} days ago`;
}

function hasText(html: string): boolean {
  return html.replace(/<[^>]*>/g, "").trim().length > 0;
}

/** The saved solutions, read-only, with a tab per filled approach. */
function CodePeek({ approaches }: { approaches: Approach[] }) {
  const filled = approaches.filter((a) => a.code.trim());
  const [activeId, setActiveId] = useState<string | undefined>(filled[filled.length - 1]?.id);
  const active = filled.find((a) => a.id === activeId) ?? filled[filled.length - 1];
  if (!active) return <p className="text-[13px] text-[#565e73]">No code saved for this one.</p>;
  return (
    <>
      <div className="flex flex-wrap items-center gap-1 mb-2.5">
        {filled.map((a) => (
          <button
            key={a.id}
            onClick={() => setActiveId(a.id)}
            aria-pressed={a.id === active.id}
            className={`rounded-md px-2.5 py-1 text-[12px] font-semibold border ${
              a.id === active.id
                ? "text-[#5b8cff] border-[#5b8cff]/50 bg-[#5b8cff]/10"
                : "text-[#8b93a7] border-[#2a3040] hover:text-[#e6e9f0] hover:border-[#565e73]"
            }`}
          >
            {a.label}
          </button>
        ))}
        {(active.time || active.space) && (
          <span className="ml-auto text-[12px] text-[#8b93a7] font-mono">
            {active.time && <>time {active.time}</>}
            {active.time && active.space && " · "}
            {active.space && <>space {active.space}</>}
          </span>
        )}
      </div>
      {/* Keyed per approach: @uiw/react-codemirror does not sync a changed
          `value` into a mounted editor, so switching tabs must remount it. */}
      <div className="h-[260px] md:h-[340px] flex flex-col">
        <CodeEditor
          key={active.id}
          value={active.code}
          lang={active.lang ?? "java"}
          readOnly
          onChange={() => {}}
        />
      </div>
    </>
  );
}

export function DrillSession({
  plan,
  byKey,
  subject,
  decayDays,
  canWatchVideo,
  plannedKeys,
  onGrade,
  onPlanReds,
  onOpenProblem,
  onRestart,
  onExit,
}: {
  plan: DrillPlan;
  /** Live — a grade given here flows back through it, like any other edit. */
  byKey: Map<string, Problem>;
  subject: SubjectConfig;
  decayDays: number;
  canWatchVideo: boolean;
  /** Problems that already have an open todo, so the summary does not double-plan them. */
  plannedKeys: Set<string>;
  onGrade: (key: string, grade: Grade, recallText: string) => void;
  /** Add "code it from scratch" todos for today. */
  onPlanReds: (items: { text: string; problemKey: string }[]) => void;
  /** Leave the drill and open this problem. */
  onOpenProblem: (key: string) => void;
  /** Run another session over just these keys. */
  onRestart: (keys: string[]) => void;
  onExit: () => void;
}) {
  const isMobile = useIsMobile();

  // Frozen at mount: the queue is this session's, and must not reshuffle or
  // shrink under you as grades land and `byKey` is rebuilt.
  const [keys] = useState(() => plan.keys.filter((k) => byKey.has(k)));
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"think" | "reveal">("think");
  const [text, setText] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [plannedNow, setPlannedNow] = useState(false);
  // Read once per reveal from the click/keypress that reveals, so "3 days ago"
  // needs no Date.now() during render.
  const [revealedAt, setRevealedAt] = useState(0);

  const done = index >= keys.length;
  const problem = done ? undefined : byKey.get(keys[index]);

  // The clock runs while you are thinking and stops at the reveal — reading
  // your own notes is not recall time.
  useEffect(() => {
    if (done || phase !== "think") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [done, phase, index]);

  function reveal() {
    setRevealedAt(Date.now());
    setPhase("reveal");
  }

  function finish(grade: Grade | null) {
    if (done) return;
    const key = keys[index];
    if (grade) onGrade(key, grade, text);
    setResults((prev) => [...prev, { key, grade, seconds }]);
    setIndex((i) => i + 1);
    setPhase("think");
    setText("");
    setSeconds(0);
  }

  // Re-subscribed every render on purpose: `finish` closes over the card's
  // text and clock, and a listener that is always the current closure is
  // simpler to trust than a ref mirror of four pieces of state.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done) return;
      const t = e.target;
      const typing =
        t instanceof HTMLElement &&
        (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.tagName === "SELECT");
      if (phase === "think") {
        const chord = e.key === "Enter" && (e.metaKey || e.ctrlKey);
        const bare = !typing && (e.key === " " || e.key === "Enter");
        if (chord || bare) {
          e.preventDefault();
          reveal();
        }
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      const grade = GRADE_ORDER.find((g) => GRADES[g].hotkey === e.key);
      if (grade) {
        e.preventDefault();
        finish(grade);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const tally = { red: 0, yellow: 0, green: 0 };
  for (const r of results) if (r.grade) tally[r.grade]++;

  const shell = (body: React.ReactNode, footer?: React.ReactNode) => (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="shrink-0 border-b border-[#2a3040] px-3 md:px-5 py-2 flex items-center gap-3 text-xs text-[#8b93a7]">
        <button
          onClick={() => (done || results.length === 0 ? onExit() : setIndex(keys.length))}
          title={done || results.length === 0 ? "Back to the vault" : "Stop here and see the summary"}
          className="border border-[#2a3040] rounded-md px-2.5 py-1 font-semibold hover:text-[#e6e9f0] hover:border-[#565e73] shrink-0"
        >
          ✕ {done || results.length === 0 ? "Exit" : "End"}
        </button>
        <span className="font-semibold text-[#e6e9f0] truncate min-w-0">▶ {plan.title}</span>
        <span className="ml-auto flex items-center gap-2.5 shrink-0">
          {GRADE_ORDER.map((g) =>
            tally[g] > 0 ? (
              <span key={g} className="font-bold" style={{ color: GRADES[g].color }} title={GRADES[g].label}>
                {tally[g]}
              </span>
            ) : null
          )}
          <span className="font-semibold">
            {Math.min(index + (done ? 0 : 1), keys.length)} / {keys.length}
          </span>
        </span>
      </div>
      <div className="h-[3px] bg-[#1c212c] shrink-0">
        <div
          className="h-full bg-[#5b8cff] transition-[width] duration-300"
          style={{ width: `${keys.length ? (Math.min(index, keys.length) / keys.length) * 100 : 0}%` }}
        />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-[920px] px-3 md:px-5 py-4 md:py-6 space-y-3">{body}</div>
      </div>
      {footer && (
        <div className="shrink-0 border-t border-[#2a3040] bg-[#161a22]">
          <div className="mx-auto max-w-[920px] px-3 md:px-5 py-2.5 md:py-3 flex items-center gap-3">
            {footer}
          </div>
        </div>
      )}
    </div>
  );

  // ---- Summary ------------------------------------------------------------
  if (done) {
    const total = results.reduce((n, r) => n + r.seconds, 0);
    const skipped = results.filter((r) => !r.grade).length;
    const named = (g: Grade) =>
      results
        .filter((r) => r.grade === g)
        .map((r) => byKey.get(r.key))
        .filter((p): p is Problem => !!p);
    const reds = named("red");
    const yellows = named("yellow");
    const toPlan = reds.filter((p) => !plannedKeys.has(p.key));
    const again = [...reds, ...yellows].map((p) => p.key);

    return shell(
      <>
        <header>
          <h2 className="text-[20px] md:text-[23px] font-bold">
            {results.length === 0 ? "Nothing drilled" : "Session done"}
          </h2>
          <p className="text-[14px] text-[#8b93a7] mt-1.5">
            {results.length} {results.length === 1 ? subject.entryNoun : subject.entryNounPlural} in{" "}
            {fmtClock(total)} of recall
            {results.length > 0 && ` — about ${fmtClock(Math.round(total / results.length))} each`}.
          </p>
        </header>

        <div className="grid grid-cols-3 gap-2 md:gap-3">
          {[...GRADE_ORDER].reverse().map((g) => (
            <div key={g} className="bg-[#161a22] border border-[#2a3040] rounded-xl px-3 py-3 text-center">
              <div className="text-[26px] font-bold leading-none" style={{ color: GRADES[g].color }}>
                {tally[g]}
              </div>
              <div className="text-[11.5px] text-[#8b93a7] mt-1.5">{GRADES[g].label}</div>
            </div>
          ))}
        </div>
        {skipped > 0 && <p className="text-[12.5px] text-[#565e73]">{skipped} skipped — left as they were.</p>}

        {[
          { g: "red" as const, list: reds, title: "Blank — code these again" },
          { g: "yellow" as const, list: yellows, title: "Fuzzy — back in a few days" },
        ].map(({ g, list, title }) =>
          list.length > 0 ? (
            <Block key={g} icon={GRADES[g].dot} title={`${title} · ${list.length}`}>
              <ul className="space-y-0.5 -mx-1">
                {list.map((p) => (
                  <li key={p.key}>
                    <button
                      onClick={() => onOpenProblem(p.key)}
                      title="Leave the drill and open this one"
                      className="w-full text-left rounded-lg px-2 py-1.5 text-[13px] hover:bg-[#1c212c] flex items-center gap-2"
                    >
                      <span className="flex-1 min-w-0 truncate">{p.name}</span>
                      <span className="text-[11px] text-[#565e73] shrink-0 truncate max-w-[45%]">{p.topic}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Block>
          ) : null
        )}

        {results.length > 0 && reds.length === 0 && yellows.length === 0 && skipped < results.length && (
          <p className="text-[13.5px] text-[#3ecf8e]">Clean sweep — every one came back. They will stay away longer now.</p>
        )}
      </>,
      <>
        {reds.length > 0 &&
          (plannedNow || toPlan.length === 0 ? (
            <span className="text-[12.5px] text-[#3ecf8e] border border-[#3ecf8e]/40 rounded-lg px-3 py-2">
              ✓ In today&apos;s plan
            </span>
          ) : (
            <button
              onClick={() => {
                onPlanReds(toPlan.map((p) => ({ text: `Code from scratch: ${p.name}`, problemKey: p.key })));
                setPlannedNow(true);
              }}
              title="Adds a “Code from scratch” task for each blank to ☑ Today"
              className="border border-[#2a3040] rounded-lg px-3 py-2 text-[13px] font-semibold text-[#8b93a7] hover:text-[#5b8cff] hover:border-[#5b8cff]"
            >
              📋 Add {toPlan.length} blank{toPlan.length === 1 ? "" : "s"} to today&apos;s plan
            </button>
          ))}
        {again.length > 0 && (
          <button
            onClick={() => onRestart(again)}
            className="border border-[#2a3040] rounded-lg px-3 py-2 text-[13px] font-semibold text-[#8b93a7] hover:text-[#e6e9f0] hover:border-[#565e73]"
          >
            ↻ Drill these {again.length} again
          </button>
        )}
        <button
          onClick={onExit}
          className="ml-auto bg-[#5b8cff] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:brightness-110"
        >
          Done
        </button>
      </>
    );
  }

  // A queued key that has since vanished (deleted in another tab). Step over it.
  if (!problem) {
    return shell(
      <p className="text-[13px] text-[#8b93a7]">This one is no longer in the vault.</p>,
      <button
        onClick={() => finish(null)}
        className="ml-auto bg-[#5b8cff] text-white rounded-lg px-4 py-2 text-[13px] font-semibold"
      >
        Next
      </button>
    );
  }

  // ---- Card ---------------------------------------------------------------
  const revealed = phase === "reveal";
  const pattern = subject.hasPatterns ? PRIMARY_BY_KEY.get(problem.key) ?? null : null;
  const also = subject.hasPatterns ? ALSO_BY_KEY.get(problem.key) ?? [] : [];
  const family = pattern ? FAMILIES_BY_ID.get(pattern.family) ?? null : null;
  const allLinks = problemLinks(problem, { canWatchVideo });
  const links = revealed ? allLinks : allLinks.filter((c) => STATEMENT_LINKS.has(c.key));
  // The most recent revision that says anything — a grade, or typed recall.
  const previous: RevRecord | undefined = [...problem.revLog].reverse().find((r) => r.grade || r.recall);
  const showStep = revealed || !plan.blind;

  const header = (
    <header>
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide mb-1.5">
        <span className={showStep ? "text-[#5b8cff]" : "text-[#565e73]"}>
          {showStep ? problem.topic : "Blind — name the technique yourself"}
        </span>
        <span
          className={`ml-auto font-mono text-[13px] normal-case tracking-normal ${
            seconds >= SOFT_LIMIT_S ? "text-[#f0b429]" : "text-[#8b93a7]"
          }`}
          title={revealed ? "How long you spent recalling" : "A couple of minutes is the aim — it turns amber at 3:00"}
        >
          ⏱ {fmtClock(seconds)}
        </span>
      </div>
      <h2 className="text-[20px] md:text-[24px] font-bold leading-tight">{problem.name || "Untitled"}</h2>
      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
        {subject.showDifficulty && problem.difficulty && (
          <span className="text-[13px] text-[#8b93a7] mr-1">{problem.difficulty}</span>
        )}
        {revealed && pattern && (
          <span className="border rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-[#5b8cff] border-[#5b8cff]/40">
            🧩 {pattern.title}
          </span>
        )}
        {revealed &&
          also.map((p) => (
            <span
              key={p.id}
              className="border rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-[#8b93a7] border-[#2a3040]"
            >
              also {p.title}
            </span>
          ))}
        {links.map((chip) => (
          <LinkBadge key={chip.key} chip={chip} compact />
        ))}
      </div>
    </header>
  );

  if (!revealed) {
    return shell(
      <>
        {header}
        {isMobile ? (
          <div className="bg-[#161a22] border border-[#2a3040] rounded-xl p-4 text-[13.5px] leading-relaxed text-[#c7ccd8]">
            <p className="mb-2.5">Say the approach to yourself before you reveal:</p>
            <Bullets
              items={["Which pattern is it?", "The key insight", "Time and space complexity", "Edge cases"]}
              marker="#5b8cff"
            />
          </div>
        ) : (
          <div>
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={RECALL_TEXT_MAX}
              rows={7}
              placeholder={"Pattern:\nKey insight:\nComplexity:\nEdge cases:"}
              className="w-full bg-[#161a22] border border-[#2a3040] rounded-xl px-4 py-3 text-[14px] leading-relaxed outline-none focus:border-[#5b8cff] resize-y placeholder:text-[#565e73]"
            />
            <p className="text-[11.5px] text-[#565e73] mt-1.5">
              Three to five lines is plenty — it is saved with this attempt, so next time you can read
              it against a fresh one. Leave it empty to just think it through.
            </p>
          </div>
        )}
      </>,
      <>
        <button onClick={() => finish(null)} className="text-[13px] text-[#8b93a7] hover:text-[#e6e9f0] px-1">
          Skip
        </button>
        <button
          onClick={reveal}
          className="ml-auto bg-[#5b8cff] text-white rounded-lg px-5 py-2.5 text-[14px] font-semibold hover:brightness-110"
        >
          Reveal
          {!isMobile && <kbd className="ml-2 font-mono text-[11px] opacity-70">⌘↵</kbd>}
        </button>
      </>
    );
  }

  const typed = text.trim();
  // On a phone nothing is ever typed, so the panel is only worth showing when
  // there is an earlier attempt to look back at.
  const showRecall = isMobile ? !!previous : !!(typed || previous);
  return shell(
    <>
      {header}

      <div className={`grid gap-3 items-start ${pattern && showRecall ? "md:grid-cols-2" : ""}`}>
        {showRecall && (
          <Block icon="✍" title="Your recall">
            {typed ? (
              <p className="text-[13.5px] leading-relaxed text-[#e6e9f0] whitespace-pre-wrap break-words">{typed}</p>
            ) : (
              !isMobile && <p className="text-[13px] text-[#565e73]">Nothing typed this time.</p>
            )}
            {previous && (
              <div className={isMobile && !typed ? "" : "mt-3 pt-3 border-t border-[#2a3040]"}>
                <div className="text-[11px] text-[#8b93a7] mb-1">
                  Last attempt · {fmtWhen(previous.at, revealedAt)}
                  {previous.grade && (
                    <>
                      {" · "}
                      <b style={{ color: GRADES[previous.grade].color }}>{GRADES[previous.grade].label}</b>
                    </>
                  )}
                </div>
                {previous.recall && (
                  <p className="text-[12.5px] leading-relaxed text-[#8b93a7] whitespace-pre-wrap break-words">
                    {previous.recall}
                  </p>
                )}
              </div>
            )}
          </Block>
        )}

        {pattern && (
          <Block icon="🧩" title={`${family ? `${family.title} · ` : ""}${pattern.title}`}>
            <p className="text-[13.5px] leading-relaxed text-[#e6e9f0] mb-3">
              <Inline text={pattern.hook} />
            </p>
            <Bullets items={pattern.recall} marker="#3ecf8e" />
            <div className="text-[12.5px] text-[#8b93a7] mt-3 font-mono">
              time {pattern.complexity.time} · space {pattern.complexity.space}
            </div>
            <div className="mt-3 pt-3 border-t border-[#2a3040]">
              <Bullets items={pattern.traps} marker="#f0b429" />
            </div>
          </Block>
        )}
      </div>

      <Block icon="📝" title="Your notes">
        {hasText(problem.notesHtml) ? (
          <div className="max-h-[460px] flex flex-col -mx-1">
            <NotesEditor
              key={problem.key}
              problemKey={problem.key}
              html={problem.notesHtml}
              readOnly
              onChange={() => {}}
            />
          </div>
        ) : (
          <p className="text-[13px] text-[#565e73]">No notes saved for this one.</p>
        )}
      </Block>

      {subject.tabs.includes("code") && (
        <Block icon="💻" title="Your code">
          <CodePeek key={problem.key} approaches={problem.approaches} />
        </Block>
      )}
    </>,
    <>
      <button onClick={() => finish(null)} className="text-[13px] text-[#8b93a7] hover:text-[#e6e9f0] px-1 shrink-0">
        Skip
      </button>
      <GradeButtons problem={problem} decayDays={decayDays} onGrade={finish} size="lg" showKeys={!isMobile} />
    </>
  );
}
