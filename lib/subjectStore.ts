"use client";

import { isSubjectId } from "./subjects";
import type { SubjectId } from "./types";

// The chosen subject tab, persisted per browser. Modelled as an external store
// (same shape as lib/useIsMobile.ts) so the component reads it through
// useSyncExternalStore: SSR renders the default and hydration corrects it,
// without a setState-in-effect round trip.

const KEY = "vault:subject";
const DEFAULT: SubjectId = "dsa";

const listeners = new Set<() => void>();
let cached: SubjectId | null = null;

function read(): SubjectId {
  if (cached) return cached;
  try {
    const saved = localStorage.getItem(KEY);
    cached = isSubjectId(saved) ? saved : DEFAULT;
  } catch {
    // Private browsing or blocked storage — fall back to the default.
    cached = DEFAULT;
  }
  return cached;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Keep other tabs of the app in sync.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cached = null;
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export const subjectStore = {
  subscribe,
  getSnapshot: read,
  getServerSnapshot: (): SubjectId => DEFAULT,
  set(next: SubjectId) {
    cached = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Non-fatal: the choice still applies for this session.
    }
    for (const l of listeners) l();
  },
};
