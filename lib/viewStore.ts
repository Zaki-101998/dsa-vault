"use client";

import { collapseStore } from "./collapseStore";
import { familyGroupKey, PATTERNS_BY_ID, patternGroupKey } from "./patterns";

// Which lens the DSA sidebar is showing: Striver's Step -> Subsection tree, or
// the pattern tree. Same external-store shape as lib/subjectStore.ts, so the
// component reads it through useSyncExternalStore and SSR renders the default
// while hydration corrects it.
//
// This is a store rather than Sidebar state for two reasons. Workspace renders
// <Sidebar key={subject}> deliberately, so that search and filter reset when
// you switch subject — which means component state here would snap back to
// "sheet" every time you visited CN and came back, the exact reset that
// lib/collapseStore.ts was written to stop. And Workspace needs to *write* the
// view when a problem's pattern chip is clicked, without owning it.
//
// A single value, not one per subject: only DSA has a pattern catalog.

export type SheetView = "sheet" | "patterns";

const KEY = "vault:dsaView";
const DEFAULT: SheetView = "sheet";

const listeners = new Set<() => void>();
let cached: SheetView | null = null;

function read(): SheetView {
  if (cached) return cached;
  try {
    cached = localStorage.getItem(KEY) === "patterns" ? "patterns" : DEFAULT;
  } catch {
    // Private browsing or blocked storage — fall back to the sheet.
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

function notify() {
  for (const l of listeners) l();
}

export const viewStore = {
  subscribe,
  getSnapshot: read,
  getServerSnapshot: (): SheetView => DEFAULT,
  set(next: SheetView) {
    cached = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Non-fatal: the choice still applies for this session.
    }
    notify();
  },
};

/**
 * Switch to Patterns view and unfold the pattern's family and the pattern
 * itself, so the sidebar agrees with the pane after a jump from a problem's
 * pattern chip — otherwise the page opens while the tree still shows the sheet,
 * or shows the family folded with the pattern invisible inside it.
 *
 * Lives here rather than in lib/patterns.ts to keep that module a pure
 * derivation over the catalog, with no stores and no side effects.
 */
export function revealPattern(id: string): void {
  viewStore.set("patterns");
  const pattern = PATTERNS_BY_ID.get(id);
  if (!pattern) return;
  // collapseStore stores only what is folded, so unfolding is a delete.
  const next = { ...collapseStore.getSnapshot("dsa") };
  delete next[familyGroupKey(pattern.family)];
  delete next[patternGroupKey(pattern)];
  collapseStore.set("dsa", next);
}
