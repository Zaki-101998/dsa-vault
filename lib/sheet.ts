import { SUBJECTS, isCustomKey, subjectOf } from "./subjects";
import type { Approach, Problem, SeedProblem, SubjectId, TopicGroup, UserProblemRow } from "./types";

export function newApproachId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// New problems start with no approaches — the Brute/Better/Optimal slots appear
// as add-on-demand placeholders in the Code tab until the user adds them.
export function defaultApproaches(): Approach[] {
  return [];
}

function toEpoch(iso: string | null | undefined): number | null {
  return iso ? new Date(iso).getTime() : null;
}

type Base = Pick<SeedProblem, "name" | "link" | "difficulty" | "practice" | "kind" | "video"> & {
  topic: string;
};

function toProblem(
  key: string,
  row: UserProblemRow | undefined,
  base: Base,
  fallbackIndex: number
): Problem {
  return {
    key,
    isCustom: isCustomKey(key),
    name: (row?.custom_name || base.name) ?? "Untitled",
    topic: row?.custom_topic || base.topic,
    link: row?.custom_link ?? base.link,
    difficulty: base.difficulty,
    practiceLink: base.practice ?? "",
    kind: base.kind ?? "concept",
    video: base.video ?? null,
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

/**
 * Merge the user's saved rows onto one subject's seed sheet. `rows` is the whole
 * account — every subject's rows arrive in a single fetch — so this filters by
 * the key namespace rather than asking the caller to pre-split them.
 */
export function mergeProblems(
  rows: UserProblemRow[],
  subject: SubjectId
): {
  groups: TopicGroup[];
  byKey: Map<string, Problem>;
} {
  const sheet = SUBJECTS[subject].sheet;
  const mine = rows.filter((r) => subjectOf(r.problem_key) === subject);
  const rowMap = new Map(mine.map((r) => [r.problem_key, r] as const));
  const byKey = new Map<string, Problem>();
  const groups: TopicGroup[] = [];

  // Index seed groups by normalized title so custom problems can merge into them.
  const groupByTopic = new Map<string, TopicGroup>();

  for (const step of sheet.steps) {
    const problems: Problem[] = step.problems.map((sp, i) => {
      const p = toProblem(sp.key, rowMap.get(sp.key), { ...sp, topic: step.title }, i);
      byKey.set(p.key, p);
      return p;
    });
    const group: TopicGroup = { key: step.key, title: step.title, order: step.order, problems };
    if (step.placeholder) group.placeholder = step.placeholder;
    groups.push(group);
    groupByTopic.set(normTopic(step.title), group);
  }

  // Custom problems merge into a matching seed group, else form their own bottom group.
  // Legacy custom rows without a position sort to the end of their group (Infinity).
  const customGroups = new Map<string, TopicGroup>();
  let order = 1000;
  for (const row of mine) {
    if (!isCustomKey(row.problem_key)) continue;
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

/** Section titles for a subject, suggested in the topic datalists. */
export function knownTopics(subject: SubjectId): string[] {
  return Array.from(new Set(SUBJECTS[subject].sheet.steps.map((s) => s.title)));
}
