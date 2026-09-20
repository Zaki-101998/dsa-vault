"use client";

// Width of the desktop problem sidebar, persisted per browser. Same external-store
// shape as lib/subjectStore.ts so the component reads it through
// useSyncExternalStore — the server and the first client render both produce
// DEFAULT_WIDTH, and hydration corrects it without a flash or a mismatch.

const KEY = "vault:sidebarWidth";

export const DEFAULT_WIDTH = 300;
export const MIN_WIDTH = 240;
/** Wide enough for the longest A2Z problem names, narrow enough to leave the
 *  notes pane usable on a 13" screen. */
export const MAX_WIDTH = 640;

export const clampWidth = (n: number) =>
  Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(n)));

const listeners = new Set<() => void>();
let cached: number | null = null;

function read(): number {
  if (cached !== null) return cached;
  try {
    const saved = Number(localStorage.getItem(KEY));
    cached = Number.isFinite(saved) && saved > 0 ? clampWidth(saved) : DEFAULT_WIDTH;
  } catch {
    // Private browsing or blocked storage — fall back to the default.
    cached = DEFAULT_WIDTH;
  }
  return cached;
}

export const sidebarWidthStore = {
  subscribe(onChange: () => void) {
    listeners.add(onChange);
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
  },

  getSnapshot: read,
  getServerSnapshot: (): number => DEFAULT_WIDTH,

  set(next: number) {
    const width = clampWidth(next);
    if (width === cached) return;
    cached = width;
    try {
      localStorage.setItem(KEY, String(width));
    } catch {
      // Non-fatal: the drag still applies for this session.
    }
    for (const l of listeners) l();
  },
};
