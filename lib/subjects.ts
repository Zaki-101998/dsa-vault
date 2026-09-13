import rawDsa from "@/data/a2z-sheet.json";
import rawCn from "@/data/cn-videos.json";
import rawOs from "@/data/os-videos.json";
import type { SeedSheet, Status, SubjectId } from "./types";

export type EntryTab = "notes" | "code";

export interface SubjectConfig {
  id: SubjectId;
  /** Full name, used in headings and the welcome panel. */
  label: string;
  /** Short name for the subject switcher pills. */
  tabLabel: string;
  sheet: SeedSheet;
  /** Which editor tabs an entry offers. Video subjects are notes-only. */
  tabs: EntryTab[];
  /**
   * Visible wording for the three stored Status values. The DB values never
   * change — only what the dropdown and filters call them.
   */
  statusLabels: Record<Status, string>;
  entryNoun: string;
  entryNounPlural: string;
  /** DSA problems carry Easy/Medium/Hard; lectures have nothing to show. */
  showDifficulty: boolean;
  /** Video subjects can filter out the worked-question entries. */
  hasConceptFilter: boolean;
  linkPlaceholder: string;
  topicPlaceholder: string;
  /** Example text in the "Add a …" modal's name field. */
  addNamePlaceholder: string;
  blurb: string;
}

export const SUBJECTS: Record<SubjectId, SubjectConfig> = {
  dsa: {
    id: "dsa",
    label: "DSA",
    tabLabel: "🗂️ DSA",
    sheet: rawDsa as SeedSheet,
    tabs: ["notes", "code"],
    statusLabels: { Unsolved: "Unsolved", Attempted: "Attempted", Solved: "Solved" },
    entryNoun: "problem",
    entryNounPlural: "problems",
    showDifficulty: true,
    hasConceptFilter: false,
    linkPlaceholder: "Problem link (LeetCode / TUF)…",
    topicPlaceholder: "e.g. Arrays",
    addNamePlaceholder: "e.g. Kadane's Algorithm follow-up",
    blurb: "Your notes + code companion for Striver's A2Z sheet.",
  },
  cn: {
    id: "cn",
    label: "Computer Networks",
    tabLabel: "🌐 Networks",
    sheet: rawCn as unknown as SeedSheet,
    tabs: ["notes"],
    statusLabels: { Unsolved: "Unwatched", Attempted: "Watching", Solved: "Done" },
    entryNoun: "lecture",
    entryNounPlural: "lectures",
    showDifficulty: false,
    hasConceptFilter: true,
    linkPlaceholder: "Lecture link (Drive)…",
    topicPlaceholder: "e.g. Routing",
    addNamePlaceholder: "e.g. Subnetting recap",
    blurb: "Lecture notes + revision tracker for the Computer Networks series.",
  },
  os: {
    id: "os",
    label: "Operating Systems",
    tabLabel: "⚙️ OS",
    sheet: rawOs as unknown as SeedSheet,
    tabs: ["notes"],
    statusLabels: { Unsolved: "Unwatched", Attempted: "Watching", Solved: "Done" },
    entryNoun: "lecture",
    entryNounPlural: "lectures",
    showDifficulty: false,
    hasConceptFilter: true,
    linkPlaceholder: "Lecture link (Drive)…",
    topicPlaceholder: "e.g. Deadlocks",
    addNamePlaceholder: "e.g. Bankers algorithm recap",
    blurb: "Lecture notes + revision tracker for the Operating Systems series.",
  },
};

export const SUBJECT_ORDER: SubjectId[] = ["dsa", "cn", "os"];

/**
 * Which subject a stored problem_key belongs to. Non-DSA keys are namespaced
 * (`cn:…`, `os:…`); DSA keys are bare, which is what keeps every pre-existing
 * row working without a migration.
 */
export function subjectOf(key: string): SubjectId {
  const i = key.indexOf(":");
  if (i > 0) {
    const prefix = key.slice(0, i);
    if (prefix === "cn" || prefix === "os") return prefix;
  }
  return "dsa";
}

/** The key with any subject namespace removed. */
export function stripSubject(key: string): string {
  const subject = subjectOf(key);
  return subject === "dsa" ? key : key.slice(subject.length + 1);
}

export function isCustomKey(key: string): boolean {
  return stripSubject(key).startsWith("custom:");
}

/** Build the key for a newly added custom entry in the given subject. */
export function customKey(subject: SubjectId, id: string): string {
  return subject === "dsa" ? `custom:${id}` : `${subject}:custom:${id}`;
}

export function isSubjectId(value: string | null | undefined): value is SubjectId {
  return value === "dsa" || value === "cn" || value === "os";
}
