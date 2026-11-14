"use client";

import { useMemo, useState } from "react";
import { patternGroups } from "@/lib/patterns";
import { DRILL_ROUNDS, buildDrillQueue, drillCount, type DrillRound } from "@/lib/schedule";
import type { SubjectConfig } from "@/lib/subjects";
import type { Problem, TopicGroup } from "@/lib/types";

// Chooses what a drill runs over, then hands Workspace a finished queue.
//
// Two independent questions, deliberately kept apart:
//
//   scope  WHERE to draw from — the whole sheet, one step, one pattern family,
//          or one pattern
//   round  WHICH of those — what is due, everything, only the shaky ones…
//
// The "rounds" are not stored anywhere. They are presets over the recall
// grades (see DrillRound in lib/schedule.ts), so round 2 is smaller than round
// 1 simply because some problems went green — there is no counter to drift.

export type DrillScopeKind = "all" | "step" | "family" | "pattern";

/** What a caller may pre-select: the stats bar seeds the round, a pattern page the scope. */
export interface DrillSeed {
  round?: DrillRound;
  /** `key` is a TopicGroup / SubGroup key — for a pattern, lib/patterns.ts patternGroupKey. */
  scope?: { kind: DrillScopeKind; key?: string };
}

/** A queue ready to run. `id` keys the session, so a restart remounts it clean. */
export interface DrillPlan {
  id: number;
  keys: string[];
  /** Hide the step and the pattern until the reveal. */
  blind: boolean;
  title: string;
}

interface ScopeItem {
  key: string;
  title: string;
  problems: Problem[];
  /** Pattern options only: the family they are listed under. */
  group?: string;
}

const SIZES: readonly { value: number | null; label: string }[] = [
  { value: 10, label: "10" },
  { value: 20, label: "20" },
  { value: 40, label: "40" },
  { value: null, label: "All" },
];

/** Stable empty list, so the counts memo below is not invalidated every render. */
const NO_PROBLEMS: Problem[] = [];

const FIELD =
  "w-full bg-[#1c212c] border border-[#2a3040] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#5b8cff]";

export function DrillSetup({
  groups,
  byKey,
  subject,
  decayDays,
  seed,
  onStart,
  onClose,
}: {
  /** The sheet tree for the current subject — steps, in sheet order. */
  groups: TopicGroup[];
  byKey: Map<string, Problem>;
  subject: SubjectConfig;
  decayDays: number;
  seed?: DrillSeed;
  onStart: (plan: DrillPlan) => void;
  onClose: () => void;
}) {
  const stepNoun = subject.id === "dsa" ? "Step" : "Section";

  const items = useMemo(() => {
    const steps: ScopeItem[] = groups.map((g) => ({
      key: g.key,
      // Same rule as the sidebar: only real sheet steps carry a number.
      title: g.order < 1000 ? `${g.order}. ${g.title}` : g.title,
      problems: g.problems,
    }));
    const families: ScopeItem[] = [];
    const patterns: ScopeItem[] = [];
    if (subject.hasPatterns) {
      for (const fam of patternGroups(byKey)) {
        families.push({ key: fam.key, title: fam.title, problems: fam.problems });
        for (const sub of fam.subgroups ?? []) {
          patterns.push({ key: sub.key, title: sub.title, problems: sub.problems, group: fam.title });
        }
      }
    }
    const all: ScopeItem[] = [
      { key: "all", title: `Whole ${subject.label} sheet`, problems: groups.flatMap((g) => g.problems) },
    ];
    return { all, step: steps, family: families, pattern: patterns } satisfies Record<
      DrillScopeKind,
      ScopeItem[]
    >;
  }, [groups, byKey, subject]);

  const kinds: { id: DrillScopeKind; label: string }[] = [
    { id: "all", label: "Whole sheet" },
    { id: "step", label: stepNoun },
    ...(subject.hasPatterns
      ? ([
          { id: "family", label: "Family" },
          { id: "pattern", label: "Pattern" },
        ] as const)
      : []),
  ];

  const seedKind = seed?.scope && items[seed.scope.kind].length > 0 ? seed.scope.kind : "all";
  const [kind, setKind] = useState<DrillScopeKind>(seedKind);
  // One remembered pick per kind, so flipping Step -> Pattern -> Step lands
  // back on the step you had chosen.
  const [picked, setPicked] = useState<Partial<Record<DrillScopeKind, string>>>(
    seed?.scope?.key ? { [seedKind]: seed.scope.key } : {}
  );
  // null = "not touched": the round follows the seed, or failing that whatever
  // has something in it — see `round` below.
  const [roundChoice, setRound] = useState<DrillRound | null>(seed?.round ?? null);
  const [size, setSize] = useState<number | null>(20);
  // null = "not touched": blind follows the scope until the user decides.
  const [blindChoice, setBlindChoice] = useState<boolean | null>(null);

  const options = items[kind];
  const scope = options.find((o) => o.key === picked[kind]) ?? options[0];
  const scoped = scope?.problems ?? NO_PROBLEMS;

  // Inside one step or one pattern the technique is already known, so hiding
  // it is theatre; across the sheet, or a family of several patterns, naming
  // it yourself is the whole exercise.
  const blind = blindChoice ?? (kind === "all" || kind === "family");

  const counts = useMemo(() => {
    const out = {} as Record<DrillRound, number>;
    for (const r of DRILL_ROUNDS) out[r.id] = drillCount(scoped, r.id, decayDays);
    return out;
  }, [scoped, decayDays]);

  // Opening on "Due now" with nothing due would greet you with a dead Start
  // button; when nothing is due, the natural drill is everything.
  const round = roundChoice ?? (counts.due > 0 ? "due" : "all");
  const available = counts[round];
  const cards = size == null ? available : Math.min(size, available);
  const poolEmpty = counts.all === 0;

  function start() {
    if (!scope || cards === 0) return;
    const keys = buildDrillQueue(scoped, { round, size, shuffle: blind }, decayDays);
    const roundLabel = DRILL_ROUNDS.find((r) => r.id === round)?.label ?? "Drill";
    onStart({ id: Date.now(), keys, blind, title: `${roundLabel} · ${scope.title}` });
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-[#161a22] border border-[#2a3040] rounded-xl p-5 md:p-6"
      >
        <h2 className="text-base font-bold mb-1">▶ Drill</h2>
        <p className="text-[12.5px] text-[#8b93a7] mb-4 leading-relaxed">
          Recall the approach in a couple of minutes — pattern, key insight, complexity, edge cases —
          then check it against your notes and grade yourself. No coding.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-[#8b93a7] block mb-1.5">Draw from</label>
            <div className="flex border border-[#2a3040] rounded-lg overflow-hidden mb-2" role="group">
              {kinds.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setKind(k.id)}
                  aria-pressed={kind === k.id}
                  className={`flex-1 px-2 py-1.5 text-[12.5px] font-semibold ${
                    kind === k.id
                      ? "text-[#5b8cff] bg-[#5b8cff]/10"
                      : "text-[#8b93a7] hover:text-[#e6e9f0] hover:bg-[#1c212c]"
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>
            {kind !== "all" && scope && (
              <select
                value={scope.key}
                onChange={(e) => setPicked((prev) => ({ ...prev, [kind]: e.target.value }))}
                aria-label={kinds.find((k) => k.id === kind)?.label}
                className={FIELD}
              >
                {kind === "pattern"
                  ? items.family.map((fam) => (
                      <optgroup key={fam.key} label={fam.title}>
                        {options
                          .filter((o) => o.group === fam.title)
                          .map((o) => (
                            <option key={o.key} value={o.key}>
                              {o.title}
                            </option>
                          ))}
                      </optgroup>
                    ))
                  : options.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.title}
                      </option>
                    ))}
              </select>
            )}
          </div>

          <div>
            <label className="text-xs text-[#8b93a7] block mb-1.5">Which ones</label>
            <div className="space-y-1.5">
              {DRILL_ROUNDS.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-center gap-2.5 border rounded-lg px-3 py-2 cursor-pointer ${
                    round === r.id ? "border-[#5b8cff]/60 bg-[#5b8cff]/10" : "border-[#2a3040] hover:bg-[#1c212c]"
                  } ${counts[r.id] === 0 ? "opacity-50" : ""}`}
                >
                  <input
                    type="radio"
                    name="drill-round"
                    checked={round === r.id}
                    onChange={() => setRound(r.id)}
                    className="accent-[#5b8cff]"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold">{r.label}</span>
                    <span className="block text-[11.5px] text-[#8b93a7] truncate">{r.blurb}</span>
                  </span>
                  <span className="text-[12px] font-bold text-[#8b93a7] shrink-0">{counts[r.id]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-[#8b93a7] shrink-0">Cards</label>
            <div className="flex border border-[#2a3040] rounded-lg overflow-hidden" role="group">
              {SIZES.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setSize(s.value)}
                  aria-pressed={size === s.value}
                  className={`px-3 py-1.5 text-[12.5px] font-semibold ${
                    size === s.value
                      ? "text-[#5b8cff] bg-[#5b8cff]/10"
                      : "text-[#8b93a7] hover:text-[#e6e9f0] hover:bg-[#1c212c]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={blind}
              onChange={(e) => setBlindChoice(e.target.checked)}
              className="mt-0.5 accent-[#5b8cff]"
            />
            <span>
              <span className="block text-[13px] font-semibold">Blind</span>
              <span className="block text-[11.5px] text-[#8b93a7] leading-relaxed">
                Shuffle, and hide the {stepNoun.toLowerCase()}
                {subject.hasPatterns ? " and pattern" : ""} until you reveal — so you have to
                recognise the technique yourself.
              </span>
            </span>
          </label>

          {poolEmpty && (
            <p className="text-[12px] text-[#f0b429] leading-relaxed">
              Nothing to drill here yet. A {subject.entryNoun} joins the pool once it is marked{" "}
              {subject.statusLabels.Solved} or starred.
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-[#2a3040] rounded-lg py-2 text-sm text-[#8b93a7] hover:text-[#e6e9f0]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={start}
              disabled={cards === 0}
              className="flex-1 bg-[#5b8cff] text-white rounded-lg py-2 text-sm font-semibold hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100"
            >
              {cards === 0 ? "Nothing to drill" : `Start · ${cards} card${cards === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
