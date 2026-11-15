"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_BUDGET_MIN,
  estimateNote,
  pickForBudget,
  topicProgress,
  type PlannedProblem,
} from "@/lib/plan";
import { inDrillPool } from "@/lib/schedule";
import type { Focus, TopicGroup } from "@/lib/types";

// The top of the Daily plan drawer: pick a topic once, then each night type how
// many minutes tomorrow has and get the problems that fit.
//
// All of the rules live in lib/plan.ts. This component only holds what is on
// screen — the minutes box and the not-yet-added preview — and nothing it shows
// is stored except the topic itself (Focus, in user_settings). The handed-out
// problems become ordinary todos, so everything the drawer already does for a
// todo (carry-forward, tick, delete, click to open) applies to them unchanged.

type Day = "today" | "tomorrow";

const BUDGET_CHIPS = [30, 45, 60, 90, 120] as const;

const FIELD =
  "bg-[#1c212c] border border-[#2a3040] rounded-lg px-2.5 py-1.5 text-[13px] outline-none focus:border-[#5b8cff]";
const LINK = "text-[11.5px] text-[#8b93a7] hover:text-[#e6e9f0] underline underline-offset-2";

/** Local midnight at the start of the day being planned. */
function dayStartMs(day: Day): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (day === "tomorrow") d.setDate(d.getDate() + 1);
  return d.getTime();
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

interface Preview {
  day: Day;
  budget: number;
  picks: PlannedProblem[];
  totalMin: number;
  left: number;
}

export function RevisionPlanner({
  groups,
  focus,
  onSetFocus,
  day,
  plannedKeys,
  onAdd,
}: {
  /** The DSA sheet's steps, in sheet order. */
  groups: TopicGroup[];
  focus: Focus | null;
  onSetFocus: (next: Focus | null) => Promise<boolean>;
  /** The drawer's active tab — the day a plan is being made for. */
  day: Day;
  /** Problems that already have an unfinished todo; never added a second time. */
  plannedKeys: Set<string>;
  onAdd: (items: { text: string; problemKey: string }[], day: Day) => void;
}) {
  const step = focus ? groups.find((g) => g.key === focus.stepKey) ?? null : null;

  const [choosing, setChoosing] = useState(false);
  const [pickedStep, setPickedStep] = useState("");
  const [budgetText, setBudgetText] = useState(String(focus?.budgetMin ?? DEFAULT_BUDGET_MIN));
  const [preview, setPreview] = useState<Preview | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const topics = useMemo(
    () =>
      groups.map((g) => ({
        key: g.key,
        // Same rule as the sidebar: only real sheet steps carry a number.
        title: g.order < 1000 ? `${g.order}. ${g.title}` : g.title,
        pool: g.problems.filter(inDrillPool).length,
      })),
    [groups]
  );

  const progress = useMemo(
    () => (focus && step ? topicProgress(step.problems, focus) : null),
    [focus, step]
  );

  const budget = Math.round(Number(budgetText));
  const budgetOk = Number.isFinite(budget) && budget >= 5 && budget <= 600;
  const dayLabel = day === "today" ? "Today" : "Tomorrow";
  // A preview belongs to the tab it was made on; flipping tabs hides it rather
  // than offering to add tomorrow's picks to today.
  const shown = preview && preview.day === day ? preview : null;

  // What the topic select shows before it is touched: the first topic with
  // anything to revise that is not the one already running — after finishing
  // Hashing, the natural next pick is not Hashing again.
  const selectedStep =
    pickedStep ||
    (topics.find((t) => t.pool > 0 && t.key !== focus?.stepKey) ?? topics.find((t) => t.pool > 0))?.key ||
    "";

  async function startTopic() {
    const key = selectedStep;
    if (!key) return;
    setError("");
    setNotice("");
    setPreview(null);
    const ok = await onSetFocus({
      stepKey: key,
      startedAt: new Date().toISOString(),
      budgetMin: budgetOk ? budget : DEFAULT_BUDGET_MIN,
    });
    if (ok) {
      setChoosing(false);
      setPickedStep("");
    } else
      setError(
        "Couldn't save the topic. If this is the first time, the focus SQL (supabase/migration-focus.sql) has not been run yet."
      );
  }

  function pick() {
    if (!focus || !step || !budgetOk) return;
    setNotice("");
    setPreview({ day, budget, ...pickForBudget(step.problems, focus, budget, dayStartMs(day)) });
  }

  function addPreview() {
    if (!shown || !focus) return;
    const fresh = shown.picks.filter((p) => !plannedKeys.has(p.key));
    onAdd(
      fresh.map((p) => ({ text: `Revise: ${p.name} · ${p.minutes} min`, problemKey: p.key })),
      shown.day
    );
    // Remember the budget as the next default. Not awaited: the todos are
    // already added, and a failed save here only costs retyping a number.
    if (shown.budget !== focus.budgetMin) void onSetFocus({ ...focus, budgetMin: shown.budget });
    setPreview(null);
    setNotice(`Added ${plural(fresh.length, "problem")} to ${dayLabel}.`);
  }

  const picker = (
    <div className="flex gap-2">
      <select
        value={selectedStep}
        onChange={(e) => setPickedStep(e.target.value)}
        aria-label="Topic to revise"
        className={`${FIELD} flex-1 min-w-0`}
      >
        {topics.map((t) => (
          <option key={t.key} value={t.key} disabled={t.pool === 0}>
            {t.title} ({t.pool})
          </option>
        ))}
      </select>
      <button
        onClick={startTopic}
        disabled={!topics.some((t) => t.pool > 0)}
        className="shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-semibold bg-[#5b8cff] text-[#08101f] hover:brightness-110 disabled:opacity-40"
      >
        Start
      </button>
    </div>
  );

  const done = progress != null && progress.pool > 0 && progress.covered === progress.pool;
  const showPicker = !focus || !step || choosing || done;

  return (
    <section className="px-4 py-3 border-b border-[#2a3040] bg-[#12161d]" aria-label="Revision plan">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#8b93a7]">Revision topic</h3>
        {focus && step && !done && (
          <button onClick={() => setChoosing((c) => !c)} className={LINK}>
            {choosing ? "Keep this topic" : "Change topic"}
          </button>
        )}
      </div>

      {focus && step && progress && (
        <div className="mb-2.5">
          <div className="flex items-baseline justify-between gap-2 text-[13px]">
            <b className="truncate">{step.title}</b>
            <span className="shrink-0 text-[12px] text-[#8b93a7]">
              {progress.covered} of {progress.pool} covered
              {progress.remainingMin > 0 && ` · about ${progress.remainingMin} min left`}
            </span>
          </div>
          <div className="mt-1.5 h-1 rounded-full bg-[#2a3040] overflow-hidden">
            <div
              className="h-full bg-[#3ecf8e]"
              style={{ width: `${progress.pool ? (progress.covered / progress.pool) * 100 : 0}%` }}
            />
          </div>
          {progress.reds > 0 && (
            <p className="mt-1.5 text-[11.5px] text-[#e12d39]">
              {plural(progress.reds, "blank")} still to bring back — graded 🔴, so not covered yet.
            </p>
          )}
        </div>
      )}

      {done && (
        <p className="mb-2 text-[13px] text-[#3ecf8e]">
          Every problem in this topic is covered. Pick the next one.
        </p>
      )}

      {focus && step && progress?.pool === 0 && !choosing && (
        <p className="mb-2 text-[12.5px] text-[#8b93a7]">
          Nothing in this topic is solved or starred yet, so there is nothing to revise.
        </p>
      )}

      {showPicker && (
        <>
          {!focus && (
            <p className="mb-2 text-[12.5px] text-[#8b93a7]">
              Pick a topic, then give a time budget each day. You get the problems that fit,
              one pattern at a time, until the topic is covered.
            </p>
          )}
          {picker}
          {choosing && (
            <p className="mt-1.5 text-[11.5px] text-[#8b93a7]">
              Starting a topic resets what counts as covered to now.
            </p>
          )}
        </>
      )}

      {focus && step && progress && progress.pool > 0 && !done && !choosing && (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            <input
              type="number"
              inputMode="numeric"
              min={5}
              max={600}
              value={budgetText}
              onChange={(e) => {
                setBudgetText(e.target.value);
                setPreview(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && pick()}
              aria-label={`Minutes for ${dayLabel.toLowerCase()}`}
              className={`${FIELD} w-[68px]`}
            />
            <span className="text-[12px] text-[#8b93a7] mr-1">min</span>
            {BUDGET_CHIPS.map((m) => (
              <button
                key={m}
                onClick={() => {
                  setBudgetText(String(m));
                  setPreview(null);
                }}
                className={`rounded-md border px-1.5 py-1 text-[11.5px] font-semibold ${
                  budget === m
                    ? "text-[#5b8cff] border-[#5b8cff]/50 bg-[#5b8cff]/10"
                    : "text-[#8b93a7] border-[#2a3040] hover:text-[#e6e9f0]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          {!shown && (
            <button
              onClick={pick}
              disabled={!budgetOk}
              className="mt-2 w-full rounded-lg px-3 py-1.5 text-[13px] font-semibold border border-[#5b8cff]/50 text-[#5b8cff] hover:bg-[#5b8cff]/10 disabled:opacity-40"
            >
              Pick problems for {dayLabel.toLowerCase()}
            </button>
          )}
        </>
      )}

      {shown && !choosing && (
        <PreviewList
          preview={shown}
          plannedKeys={plannedKeys}
          dayLabel={dayLabel}
          onAdd={addPreview}
          onCancel={() => setPreview(null)}
        />
      )}

      {notice && <p className="mt-2 text-[12px] text-[#3ecf8e]">{notice}</p>}
      {error && <p className="mt-2 text-[12px] text-[#e12d39]">{error}</p>}
    </section>
  );
}

function PreviewList({
  preview,
  plannedKeys,
  dayLabel,
  onAdd,
  onCancel,
}: {
  preview: Preview;
  plannedKeys: Set<string>;
  dayLabel: string;
  onAdd: () => void;
  onCancel: () => void;
}) {
  const { picks, totalMin, budget, left } = preview;
  const fresh = picks.filter((p) => !plannedKeys.has(p.key)).length;

  if (picks.length === 0) {
    return (
      <p className="mt-2 text-[12.5px] text-[#8b93a7]">
        Nothing left to hand out for {dayLabel.toLowerCase()} — what remains was graded 🔴 today
        and comes back tomorrow.
      </p>
    );
  }

  return (
    <div className="mt-2.5">
      <ul className="max-h-[38vh] overflow-y-auto rounded-lg border border-[#2a3040] bg-[#161a22] py-1">
        {picks.map((p, i) => {
          const heading = p.red ? "🔴 Back from last time" : p.patternTitle;
          const prev = picks[i - 1];
          const prevHeading = prev ? (prev.red ? "🔴 Back from last time" : prev.patternTitle) : null;
          return (
            <li key={p.key}>
              {heading !== prevHeading && (
                <div className="px-3 pt-2 pb-0.5 text-[10.5px] font-bold uppercase tracking-wider text-[#565e73]">
                  {heading}
                </div>
              )}
              <div className="flex items-baseline gap-2 px-3 py-1 text-[12.5px]" title={estimateNote(p.key)}>
                <span className="flex-1 min-w-0 truncate">{p.name}</span>
                {plannedKeys.has(p.key) && (
                  <span className="shrink-0 text-[10.5px] text-[#8b93a7]">already planned</span>
                )}
                <span className="shrink-0 tabular-nums text-[#8b93a7]">{p.minutes} min</span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-1.5 text-[12px] text-[#8b93a7]">
        {plural(picks.length, "problem")} · {totalMin} of {budget} min
        {totalMin > budget && " — the next problem alone needs more than the budget"}
        {left > 0 && ` · ${left} more after these`}
      </p>
      <div className="mt-2 flex gap-2">
        <button
          onClick={onAdd}
          disabled={fresh === 0}
          className="flex-1 rounded-lg px-3 py-1.5 text-[13px] font-semibold bg-[#5b8cff] text-[#08101f] hover:brightness-110 disabled:opacity-40"
        >
          {fresh === 0 ? "All already planned" : `Add ${fresh} to ${dayLabel}`}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-[13px] font-semibold border border-[#2a3040] text-[#8b93a7] hover:text-[#e6e9f0]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
