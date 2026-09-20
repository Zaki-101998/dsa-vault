import rawDsa from "@/data/a2z-sheet.json";
import rawCn from "@/data/cn-videos.json";
import rawOs from "@/data/os-videos.json";
import rawDbms from "@/data/dbms-videos.json";
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
  /** DSA problems carry Striver's Basic/Core/Pro tier; lectures have nothing to show. */
  showDifficulty: boolean;
  /** Where this subject's lectures live, named in the welcome panel. */
  videoHost?: string;
  /** Video subjects can filter out the worked-question entries. */
  hasConceptFilter: boolean;
   /**
   * True where the sheet seeds topics with no resource attached, for the user to
   * fill in. Opt-in rather than derived, so a subject whose gaps are deliberate
   * can stay quiet. DSA opted out while its entries all carried a takeuforward
   * article; the 2026 A2Z sheet leaves 80 of 442 with no video, article or
   * practice link at all, which is worth flagging.
   */
  hasResourceGaps: boolean;
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
    hasResourceGaps: true,
    topicPlaceholder: "e.g. Arrays",
    addNamePlaceholder: "e.g. Kadane's Algorithm follow-up",
    blurb: "Your notes + code companion for Striver's A2Z sheet.",
  },
  cn: {
    id: "cn",
    label: "Computer Networks",
    tabLabel: "🌐 CN",
    sheet: rawCn as unknown as SeedSheet,
    tabs: ["notes"],
    statusLabels: { Unsolved: "Unwatched", Attempted: "Watching", Solved: "Done" },
    entryNoun: "lecture",
    entryNounPlural: "lectures",
    showDifficulty: false,
    videoHost: "Drive",
    hasConceptFilter: true,
    hasResourceGaps: false,
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
    videoHost: "Drive",
    hasConceptFilter: true,
    hasResourceGaps: false,
    topicPlaceholder: "e.g. Deadlocks",
    addNamePlaceholder: "e.g. Bankers algorithm recap",
    blurb: "Lecture notes + revision tracker for the Operating Systems series.",
  },
  dbms: {
    id: "dbms",
    label: "DBMS",
    tabLabel: "🗄️ DBMS",
    sheet: rawDbms as unknown as SeedSheet,
    tabs: ["notes"],
    statusLabels: { Unsolved: "Unwatched", Attempted: "Watching", Solved: "Done" },
    entryNoun: "lecture",
    entryNounPlural: "lectures",
    showDifficulty: false,
    videoHost: "YouTube",
    hasConceptFilter: true,
    hasResourceGaps: true,
    topicPlaceholder: "e.g. Normal Forms",
    addNamePlaceholder: "e.g. BCNF recap",
    blurb:
      "A full DBMS syllabus in study order, drawing on Prof. Ravindrababu Ravula's course, " +
      "the takeUforward interview sheet, and topics neither covers — those are seeded with " +
      "no link, for you to fill in.",
  },
};

export const SUBJECT_ORDER: SubjectId[] = ["dsa", "cn", "os", "dbms"];

/**
 * Which subject a stored problem_key belongs to. Non-DSA keys are namespaced
 * (`cn:…`, `os:…`); DSA keys are bare, which is what keeps every pre-existing
 * row working without a migration.
 */
export function subjectOf(key: string): SubjectId {
  const i = key.indexOf(":");
  if (i > 0) {
    const prefix = key.slice(0, i);
    if (prefix === "cn" || prefix === "os" || prefix === "dbms") return prefix;
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
  return value === "dsa" || value === "cn" || value === "os" || value === "dbms";
}
