import rawSheet from "@/data/a2z-sheet.json";
import type { Approach, Problem, SeedSheet, TopicGroup, UserProblemRow } from "./types";

export const sheet = rawSheet as SeedSheet;

export function newApproachId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function defaultApproaches(): Approach[] {
  return [
    { id: newApproachId(), label: "Brute", code: "", time: "", space: "", custom: false, lang: "java" },
    { id: newApproachId(), label: "Better", code: "", time: "", space: "", custom: false, lang: "java" },
    { id: newApproachId(), label: "Optimal", code: "", time: "", space: "", custom: false, lang: "java" },
  ];
}

function toEpoch(iso: string | null | undefined): number | null {
  return iso ? new Date(iso).getTime() : null;
}

function toProblem(
  key: string,
  row: UserProblemRow | undefined,
  base: { name: string; topic: string; link: string; difficulty: string },
  fallbackIndex: number
): Problem {
  return {
    key,
    isCustom: key.startsWith("custom:"),
    name: (row?.custom_name || base.name) ?? "Untitled",
    topic: row?.custom_topic || base.topic,
    link: row?.custom_link ?? base.link,
    difficulty: base.difficulty,
    status: row?.status || "Unsolved",
    starred: row?.starred || false,
    lastRevised: toEpoch(row?.last_revised),
    revCount: row?.rev_count || 0,
    revLog: (row?.rev_log || []).map((x) => new Date(x).getTime()),
    notesHtml: row?.notes_html || "",
    approaches: row?.approaches?.length ? row.approaches : defaultApproaches(),
    hasRow: !!row,
    sortIndex: row?.position ?? fallbackIndex,
  };
}

// Stable-sort problems by their effective sort index (ties keep insertion order).
function bySortIndex(problems: Problem[]): Problem[] {
  return problems
    .map((p, i) => [p, i] as const)
    .sort((a, b) => a[0].sortIndex - b[0].sortIndex || a[1] - b[1])
    .map(([p]) => p);
}

// Case-insensitive topic key, so a custom problem tagged "arrays" merges into the
// seed step titled "Arrays" (the Add modal's datalist suggests the seed titles).
function normTopic(t: string): string {
  return t.trim().toLowerCase();
}

export function mergeProblems(rows: UserProblemRow[]): {
  groups: TopicGroup[];
  byKey: Map<string, Problem>;
} {
  const rowMap = new Map(rows.map((r) => [r.problem_key, r] as const));
  const byKey = new Map<string, Problem>();
  const groups: TopicGroup[] = [];

  // Index seed groups by normalized title so custom problems can merge into them.
  const groupByTopic = new Map<string, TopicGroup>();

  for (const step of sheet.steps) {
    const problems: Problem[] = step.problems.map((sp, i) => {
      const p = toProblem(
        sp.key,
        rowMap.get(sp.key),
        { name: sp.name, topic: step.title, link: sp.link, difficulty: sp.difficulty },
        i
      );
      byKey.set(p.key, p);
      return p;
    });
    const group: TopicGroup = { key: step.key, title: step.title, order: step.order, problems };
    groups.push(group);
    groupByTopic.set(normTopic(step.title), group);
  }

  // Custom problems merge into a matching seed group, else form their own bottom group.
  // Legacy custom rows without a position sort to the end of their group (Infinity).
  const customGroups = new Map<string, TopicGroup>();
  let order = 1000;
  for (const row of rows) {
    if (!row.problem_key.startsWith("custom:")) continue;
    const topic = row.custom_topic || "Custom";
    const p = toProblem(
      row.problem_key,
      row,
      { name: row.custom_name || "Untitled", topic, link: row.custom_link || "", difficulty: "" },
      Number.POSITIVE_INFINITY
    );
    byKey.set(p.key, p);

    const seedGroup = groupByTopic.get(normTopic(topic));
    if (seedGroup) {
      seedGroup.problems.push(p);
      continue;
    }
    let cg = customGroups.get(normTopic(topic));
    if (!cg) {
      cg = { key: `custom:${topic}`, title: topic, order: order++, problems: [] };
      customGroups.set(normTopic(topic), cg);
      groups.push(cg);
    }
    cg.problems.push(p);
  }

  // Order each group's problems by their effective sort index.
  for (const g of groups) g.problems = bySortIndex(g.problems);

  return { groups, byKey };
}

export const KNOWN_TOPICS = Array.from(new Set(sheet.steps.map((s) => s.title)));
