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

/**
 * How well the approach came back, unprompted, the last time this was revised.
 * Deliberately a separate axis from Status: Status is "have I solved it",
 * this is "could I produce the approach cold right now". It is what sets the
 * problem's own revision window — see lib/schedule.ts.
 */
export type Grade = "red" | "yellow" | "green";

/**
 * One revision, as stored in `rev_log`. Entries written before recall grades
 * existed — and every ungraded star click since — are a bare ISO string, so a
 * reader must accept both; lib/sheet.ts normalises them.
 */
export interface RevEntry {
  at: string;
  grade?: Grade;
  /**
   * What the user typed in the drill before revealing their notes. Kept on the
   * newest few entries only (lib/schedule.ts appendRevEntry), since this array
   * rides along on every save of the row.
   */
  recall?: string;
}

/** A RevEntry as the UI reads it: epoch time, and every field present. */
export interface RevRecord {
  at: number;
  grade: Grade | null;
  recall: string;
}

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
  custom_section: string | null;
  custom_link: string | null;
  custom_practice_link: string | null;
  custom_video_link: string | null;
  status: Status;
  starred: boolean;
  last_revised: string | null;
  rev_count: number;
  rev_log: (string | RevEntry)[];
  /**
   * Optional, and absent from blankRow, on purpose: useVault upserts the whole
   * row, so a column the database does not have yet would fail *every* save —
   * notes included. Leaving these off until a grade is actually given means
   * that before supabase/migration-recall.sql has been run, only grading fails.
   */
  recall?: Grade | null;
  /** This problem's own "red in N days" window. Null/absent → the global decay_days. */
  interval_days?: number | null;
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
  revLog: RevRecord[];
  /** Last recall grade, null until the problem has been graded once. */
  recall: Grade | null;
  /**
   * This problem's own revision window in days, null until graded — read it
   * through windowDays() in lib/schedule.ts, which falls back to the global
   * setting, rather than directly.
   */
  intervalDays: number | null;
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
  // Which subsection of its step this sits in, "" for none. The row's
  // custom_section overrides the sheet's, so any problem can be moved.
  section: string;
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

// ---------------------------------------------------------------------------
// Patterns — the second way to browse the DSA sheet.
//
// Striver's tree groups by position in the course ("Hard Problems II"), not by
// technique, so the method a problem is really about is nowhere in the UI. A
// pattern names that method, owns the problems that are really about it, and
// carries a one-screen intro to revise from.
//
// The catalog is static and lives in data/dsa-patterns/ — see that directory's
// index.mjs. It is keyed by the sheet's existing problem keys and is never
// persisted per user, so none of this touches Supabase.
// ---------------------------------------------------------------------------

/**
 * A pattern's code skeleton. Java is required — it is the language the vault's
 * templates are written in — and C++/Python are optional, offered in the
 * pattern page's language switcher only where they have been authored.
 */
export type PatternTemplate = Partial<Record<CodeLang, string>> & { java: string };

/**
 * A group of related patterns, and the top level of Patterns view — rendered as
 * a TopicGroup, with its patterns as SubGroups.
 *
 * There is deliberately no `order` field: display order is the order of the
 * FAMILIES array in data/dsa-patterns/index.mjs, which removes a whole class of
 * hand-renumbering mistakes.
 */
export interface PatternFamily {
  /**
   * Stable slug matching /^[a-z0-9-]+$/, unique across the catalog. Half of the
   * collapse key — see the key scheme in lib/patterns.ts, which depends on this
   * shape to stay collision-free.
   */
  id: string;
  title: string;
  /** One line under the family header, the same slot as TopicGroup.note. */
  note?: string;
}

/**
 * One technique, and the problems that are really about it. The six prose
 * blocks below are the fixed layout of components/PatternPage.tsx, in render
 * order — every pattern reads the same way, which is what makes the pages
 * skimmable before a revision session.
 */
export interface PatternDef {
  /**
   * Stable slug matching /^[a-z0-9-]+$/, unique across the catalog. Half of the
   * collapse key, and the id carried in Workspace's selection.
   */
  id: string;
  title: string;
  /** PatternFamily.id. Checked by scripts/check-patterns.mjs. */
  family: string;

  /** Block 1 — the whole idea in one line. */
  hook: string;
  /** Block 2 — "reach for it when you see…": 3-6 recognition cues. */
  cues: string[];
  /** Block 3 — the template. */
  template: PatternTemplate;
  /** Block 4 — the moving parts to recall before writing it: 3-6 items. */
  recall: string[];
  /** Block 5 — complexity of the template itself, not of any one problem. */
  complexity: { time: string; space: string; note?: string };
  /** Block 6 — what actually goes wrong: 2-5 items. */
  traps: string[];

  /**
   * PRIMARY members, in teaching order — the template's own problem first, hard
   * variants after. This is the order the pattern page lists them in; the
   * sidebar keeps the sheet's order instead.
   *
   * Every key must exist in data/a2z-sheet.json and must appear in exactly ONE
   * pattern's `problems` across the whole catalog. That single-home rule is what
   * keeps each problem in one place in the tree, keeps the family counts adding
   * up to the sheet's total, and keeps ProblemList's flat "due" list free of
   * duplicate React keys. scripts/check-patterns.mjs enforces it.
   */
  problems: string[];
  /**
   * Problems whose primary pattern is elsewhere but which also lean on this one.
   * Rendered as the page's "Borrows from this pattern" block and as an "also"
   * chip on the problem's own header. NEVER added to the sidebar tree — see the
   * single-home rule above.
   */
  borrows?: string[];
  /** Search synonyms — "DSU", "union-find". Folded into PATTERN_HAYSTACK. */
  aka?: string[];
}

/**
 * What the main pane is showing for one subject. The pane is a single slot, so
 * this is a tagged union rather than two pieces of state: opening a pattern
 * page and opening a problem are mutually exclusive by construction, instead of
 * by remembering to clear the other one at every call site.
 */
export type Selection =
  | { kind: "problem"; key: string }
  | { kind: "pattern"; id: string };
