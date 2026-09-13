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
   * Set on a syllabus topic the course has not published yet. Such a step has no
   * problems and renders as an empty section so the gap stays visible.
   */
  placeholder?: string;
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

export interface TopicGroup {
  key: string;
  title: string;
  order: number;
  problems: Problem[];
  /** Mirrors SeedStep.placeholder: an as-yet-uncovered syllabus topic. */
  placeholder?: string;
}
