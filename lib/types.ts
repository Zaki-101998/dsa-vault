export type Status = "Unsolved" | "Attempted" | "Solved";

export interface SeedProblem {
  key: string;
  name: string;
  link: string;
  difficulty: string;
}

export interface SeedStep {
  key: string;
  order: number;
  title: string;
  problems: SeedProblem[];
}

export interface SeedSheet {
  steps: SeedStep[];
}

export interface Approach {
  id: string;
  label: string;
  code: string;
  time: string;
  space: string;
  custom: boolean;
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
}

export interface TopicGroup {
  key: string;
  title: string;
  order: number;
  problems: Problem[];
}
