const DAY_MS = 86400000;

export function daysSince(ts: number | null): number {
  if (ts == null) return Infinity;
  return (Date.now() - ts) / DAY_MS;
}

export function isDue(starred: boolean, lastRevised: number | null, decayDays: number): boolean {
  if (!starred || lastRevised == null) return false;
  return daysSince(lastRevised) >= decayDays * 0.6;
}

export function isOverdue(starred: boolean, lastRevised: number | null, decayDays: number): boolean {
  if (!starred || lastRevised == null) return false;
  return daysSince(lastRevised) >= decayDays;
}

function lerpColor(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return (
    "#" +
    pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")
  );
}

const GOLD = "#f0b429";
const ORANGE = "#f0762a";
const RED = "#e12d39";

/** Gold -> orange -> red as the problem approaches (and passes) its decay window. */
export function starColor(starred: boolean, lastRevised: number | null, decayDays: number): string | null {
  if (!starred || lastRevised == null) return null;
  const t = Math.min(daysSince(lastRevised) / decayDays, 1);
  return t < 0.5 ? lerpColor(GOLD, ORANGE, t * 2) : lerpColor(ORANGE, RED, (t - 0.5) * 2);
}
