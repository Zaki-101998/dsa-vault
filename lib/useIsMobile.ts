"use client";

import { useSyncExternalStore } from "react";

// Matches Tailwind's `md` breakpoint: true below 768px. SSR renders desktop
// (false) and the value corrects itself after hydration.
const QUERY = "(max-width: 767px)";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
