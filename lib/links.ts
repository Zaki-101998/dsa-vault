import type { Problem, VideoRef } from "./types";

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

/** Badge styling for a lecture video, in the same visual family as above. */
export const VIDEO_BADGE_CLASS = "text-[#f0b429] border-[#f0b429]/40";

/**
 * A syllabus topic with nothing attached to study from yet — seeded for subjects
 * whose courses leave gaps, so the whole syllabus is visible rather than only the
 * parts someone happened to record.
 *
 * Derived rather than stored, which means it clears itself: the moment a link is
 * pasted into the header, `link` is non-empty and the entry stops being a stub.
 * Custom entries are excluded — an entry the user typed themselves is not a gap
 * the sheet is asking them to fill.
 */
export function needsResource(
  p: Pick<Problem, "video" | "link" | "practiceLink" | "isCustom">
): boolean {
  return !p.video && !p.link && !p.practiceLink && !p.isCustom;
}

function hms(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function videoUrl(video: VideoRef): string {
  if (video.provider === "youtube") {
    return `https://www.youtube.com/watch?v=${video.id}${video.t ? `&t=${video.t}s` : ""}`;
  }
  return `https://drive.google.com/file/d/${video.id}/view`;
}

/**
 * Label for the video button. A timestamped segment shows where it starts, so the
 * offset is visible before clicking rather than being a surprise.
 */
export function videoLabel(video: VideoRef): string {
  return video.t ? `▶ ${hms(video.t)}` : "▶ Video";
}
