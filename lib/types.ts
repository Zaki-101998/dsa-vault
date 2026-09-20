export type Status = "Unsolved" | "Attempted" | "Solved";

/** Subjects the vault can hold. Also the namespace prefix on non-DSA problem keys. */
export type SubjectId = "dsa" | "cn" | "os" | "dbms";

/**
 * Lecture-video subjects split their entries in two: `concept` videos teach the
 * material, `problem` videos work through exam questions and are shown as
 * skippable. DSA entries have no kind and are treated as `concept`.
 */
export type EntryKind = "concept" | "problem";

export type VideoProvider = "drive" | "youtube";

/** Where an entry's lecture video lives. */
export interface VideoRef {
  provider: VideoProvider;
  /** Drive file id, or YouTube video id. */
  id: string;
  /**
   * Start offset in seconds. Set on a segment cut out of a longer lecture, so
   * the link opens at the point where that topic actually begins.
   */
  t?: number;
}

export interface SeedProblem {
  key: string;
  name: string;
  link: string;
  difficulty: string;
  /** Optional practice-problem link (LeetCode preferred, else GFG/HackerRank). */
  practice?: string;
  /**
   * takeuforward's own practice problem, free since their 2026 rewrite. Built
   * from TUF's raw slug, which can end in a hyphen or contain punctuation.
   */
  tufPractice?: string;
  /**
   * Subsection this entry sits in, as its display title ("BS on Answers"). One
   * nesting level expressed as a field rather than nested arrays, so the seed
   * JSON stays flat and entries without one simply omit it.
   */
  section?: string;
  /** Video subjects only; absent on DSA problems, which are all `concept`. */
  kind?: EntryKind;
  /** Lecture video backing this entry, for video subjects. */
  video?: VideoRef;
}

export interface SeedStep {
  key: string;
  order: number;
  title: string;
  problems: SeedProblem[];
  /**
   * One line on where this section's material comes from, shown under its header.
   * Sections drawn from several courses — or from none yet — say so here.
   */
  note?: string;
}

export interface SeedSheet {
  steps: SeedStep[];
  /** Absent on the original DSA sheet, which predates multi-subject support. */
  subject?: SubjectId;
}

export type CodeLang = "java" | "cpp" | "python";

export interface Approach {
  id: string;
  label: string;
  code: string;
  time: string;
  space: string;
  custom: boolean;
  lang?: CodeLang; // absent on rows created before multi-language support → treated as "java"
}

// Row shape as stored in Supabase (public.user_problems)
export interface UserProblemRow {
  id: string;
  user_id: string;
  problem_key: string;
  custom_name: string | null;
  custom_topic: string | null;
  custom_link: string | null;
  custom_practice_link: string | null;
  custom_video_link: string | null;
  status: Status;
  starred: boolean;
  last_revised: string | null;
  rev_count: number;
  rev_log: string[];
  notes_html: string;
  approaches: Approach[];
  position: number | null;
  updated_at: string;
}

// Merged, UI-friendly view combining seed data + user row
export interface Problem {
  key: string;
  isCustom: boolean;
  name: string;
  topic: string;
  link: string;
  difficulty: string;
  status: Status;
  starred: boolean;
  lastRevised: number | null;
  revCount: number;
  revLog: number[];
  notesHtml: string;
  approaches: Approach[];
  hasRow: boolean;
  // Effective sort index within its group: the row's manual position when set,
  // otherwise the problem's index in the seed sheet. Used to order rows and to
  // compute a midpoint position when reordering via drag-and-drop.
  sortIndex: number;
  // Practice-problem link from the seed sheet (LeetCode/GFG/HackerRank); empty
  // for user-added custom problems.
  practiceLink: string;
  // takeuforward's own practice problem, from the seed sheet; empty if none.
  tufPracticeLink: string;
  // A problem link and a video the user attached themselves. Unlike `link` —
  // which a custom value replaces — these are purely additive, so they sit
  // alongside the sheet's own links rather than hiding any.
  customPracticeLink: string;
  customVideoLink: string;
  // The raw custom article URL, before it is folded into `link`. The editor needs
  // it to tell "the user set this" apart from "this came from the sheet".
  customLink: string;
  // "concept" for every DSA problem and every teaching video; "problem" marks a
  // worked-question video, which the UI dims and the Concepts filter hides.
  kind: EntryKind;
  // Lecture video for video subjects, null otherwise. Whether a Drive link is
  // rendered also depends on the viewer's access — see lib/useVideoAccess.ts.
  // YouTube links are public and always shown.
  video: VideoRef | null;
}

// Row shape as stored in Supabase (public.user_todos)
export interface UserTodoRow {
  id: string;
  user_id: string;
  text: string;
  due_date: string; // YYYY-MM-DD
  original_date: string; // YYYY-MM-DD; never changed by carry-forward
  done: boolean;
  done_at: string | null;
  problem_key: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

/** One subsection inside a step — Striver's second level of grouping. */
export interface SubGroup {
  /** `${step.key}::${slug(title)}`, unique across the sheet. */
  key: string;
  title: string;
  problems: Problem[];
}

export interface TopicGroup {
  key: string;
  title: string;
  order: number;
  /**
   * Every problem in the step, flat. Stays authoritative even when `subgroups`
   * is set — the two hold the same Problem objects — so stats, counts and the
   * Due list read one list and never have to walk the tree.
   */
  problems: Problem[];
  /**
   * Subsections, in sheet order, for steps whose entries carry `section`.
   * Absent where the sheet has no second level.
   */
  subgroups?: SubGroup[];
  /** Mirrors SeedStep.note: where this section's material comes from. */
  note?: string;
}
