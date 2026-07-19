// Maps a practice-problem URL to a display badge based on its host.
// Returns null for empty/unknown links so callers can skip rendering.
export interface LinkBadge {
  label: string;
  // Tailwind classes for the pill (text + border + subtle bg), tuned per brand.
  className: string;
}

export function linkPlatform(url: string | null | undefined): LinkBadge | null {
  if (!url) return null;
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  if (host.endsWith("leetcode.com"))
    return { label: "LeetCode", className: "text-[#ffa116] border-[#ffa116]/40" };
  if (host.endsWith("geeksforgeeks.org"))
    return { label: "GfG", className: "text-[#2f8d46] border-[#2f8d46]/50" };
  if (host.endsWith("hackerrank.com"))
    return { label: "HackerRank", className: "text-[#00ea64] border-[#00ea64]/40" };
  return null;
}
