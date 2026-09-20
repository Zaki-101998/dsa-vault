"use client";

import type { SubjectId } from "./types";

// Which sections of the problem list are folded, persisted per subject. Same
// external-store shape as lib/subjectStore.ts, read through useSyncExternalStore
// so SSR renders "nothing collapsed" and hydration corrects it without a
// setState-in-effect round trip.
//
// One flat map holds both levels: step keys ("step-05-binary-search") and
// subsection keys ("step-05-binary-search::on-answers") never collide, because
// only the latter contain "::". Only collapsed sections are stored — an absent
// key means expanded, so a fresh sheet starts fully open and newly added
// sections don't inherit a stale folded state.
//
// This used to be component state, which the per-subject remount in
// Workspace.tsx wiped on every tab switch. With 19 steps and 79 subsections in
// the A2Z sheet, that reset costs real work to undo.

export type CollapseMap = Record<string, boolean>;

const EMPTY: CollapseMap = {};
const keyFor = (subject: SubjectId) => `vault:collapsed:${subject}`;

const listeners = new Set<() => void>();
const cache = new Map<SubjectId, CollapseMap>();

function read(subject: SubjectId): CollapseMap {
  const hit = cache.get(subject);
  if (hit) return hit;
  let value: CollapseMap = EMPTY;
  try {
    const saved = localStorage.getItem(keyFor(subject));
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        value = parsed as CollapseMap;
      }
    }
  } catch {
    // Private browsing, blocked storage, or a corrupt value — start expanded.
  }
  cache.set(subject, value);
  return value;
}

function notify() {
  for (const l of listeners) l();
}

export const collapseStore = {
  subscribe(onChange: () => void) {
    listeners.add(onChange);
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith("vault:collapsed:")) {
        cache.clear();
        onChange();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(onChange);
      window.removeEventListener("storage", onStorage);
    };
  },

  getSnapshot(subject: SubjectId): CollapseMap {
    return read(subject);
  },

  getServerSnapshot(): CollapseMap {
    return EMPTY;
  },

  /** Replace the whole map — callers derive the next state from `getSnapshot`. */
  set(subject: SubjectId, next: CollapseMap) {
    // Drop the `false` entries so the stored map only ever lists what's folded.
    const trimmed: CollapseMap = {};
    for (const [k, v] of Object.entries(next)) if (v) trimmed[k] = true;
    cache.set(subject, trimmed);
    try {
      localStorage.setItem(keyFor(subject), JSON.stringify(trimmed));
    } catch {
      // Non-fatal: the fold still applies for this session.
    }
    notify();
  },
};
