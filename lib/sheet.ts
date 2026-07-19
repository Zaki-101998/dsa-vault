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

function toProblem(key: string, row: UserProblemRow | undefined, base: { name: string; topic: string; link: string; difficulty: string }): Problem {
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
  };
}

export function mergeProblems(rows: UserProblemRow[]): {
  groups: TopicGroup[];
  byKey: Map<string, Problem>;
} {
  const rowMap = new Map(rows.map((r) => [r.problem_key, r] as const));
  const byKey = new Map<string, Problem>();
  const groups: TopicGroup[] = [];

  for (const step of sheet.steps) {
    const problems: Problem[] = step.problems.map((sp) => {
      const p = toProblem(sp.key, rowMap.get(sp.key), {
        name: sp.name,
        topic: step.title,
        link: sp.link,
        difficulty: sp.difficulty,
      });
      byKey.set(p.key, p);
      return p;
    });
    groups.push({ key: step.key, title: step.title, order: step.order, problems });
  }

  const customByTopic = new Map<string, Problem[]>();
  for (const row of rows) {
    if (!row.problem_key.startsWith("custom:")) continue;
    const p = toProblem(row.problem_key, row, {
      name: row.custom_name || "Untitled",
      topic: row.custom_topic || "Custom",
      link: row.custom_link || "",
      difficulty: "",
    });
    byKey.set(p.key, p);
    const arr = customByTopic.get(p.topic) || [];
    arr.push(p);
    customByTopic.set(p.topic, arr);
  }

  let order = 1000;
  for (const [topic, problems] of customByTopic) {
    groups.push({ key: `custom:${topic}`, title: topic, order: order++, problems });
  }

  return { groups, byKey };
}

export const KNOWN_TOPICS = Array.from(new Set(sheet.steps.map((s) => s.title)));
