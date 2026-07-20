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
  if (host.endsWith("codingninjas.com") || host.endsWith("naukri.com"))
    return { label: "Code360", className: "text-[#e8564f] border-[#e8564f]/40" };
  if (host.endsWith("interviewbit.com"))
    return { label: "InterviewBit", className: "text-[#5c7cfa] border-[#5c7cfa]/40" };
  if (host.endsWith("codechef.com"))
    return { label: "CodeChef", className: "text-[#a0846a] border-[#a0846a]/50" };
  if (host.endsWith("hackerearth.com"))
    return { label: "HackerEarth", className: "text-[#2c3e91] border-[#2c3e91]/50" };
  if (host.endsWith("codeforces.com"))
    return { label: "Codeforces", className: "text-[#e05a3a] border-[#e05a3a]/40" };
  if (host.endsWith("spoj.com"))
    return { label: "SPOJ", className: "text-[#8b93a7] border-[#8b93a7]/50" };
  // Any other valid practice link still gets a neutral badge.
  return { label: "Practice", className: "text-[#5b8cff] border-[#5b8cff]/40" };
}
