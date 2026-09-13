export type Status = "Unsolved" | "Attempted" | "Solved";

/** Subjects the vault can hold. Also the namespace prefix on non-DSA problem keys. */
export type SubjectId = "dsa" | "cn" | "os";

/**
 * Lecture-video subjects split their entries in two: `concept` videos teach the
 * material, `problem` videos work through exam questions and are shown as
 * skippable. DSA entries have no kind and are treated as `concept`.
 */
export type EntryKind = "concept" | "problem";

export interface SeedProblem {
  key: string;
  name: string;
  link: string;
  difficulty: string;
  /** Optional practice-problem link (LeetCode preferred, else GFG/HackerRank). */
  practice?: string;
  /** Video subjects only; absent on DSA problems, which are all `concept`. */
  kind?: EntryKind;
  /** Google Drive file backing this entry, for video subjects. */
  video?: { fileId: string };
}

export interface SeedStep {
  key: string;
  order: number;
  title: string;
  problems: SeedProblem[];
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
  // "concept" for every DSA problem and every teaching video; "problem" marks a
  // worked-question video, which the UI dims and the Concepts filter hides.
  kind: EntryKind;
  // Drive file id for video subjects, "" otherwise. Whether the link is actually
  // rendered depends on the viewer's video access — see lib/useVideoAccess.ts.
  videoFileId: string;
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

export interface TopicGroup {
  key: string;
  title: string;
  order: number;
  problems: Problem[];
}
