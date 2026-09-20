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

/** takeuforward's own practice problem — their brand orange-red. */
export const TUF_BADGE_CLASS = "text-[#e76a40] border-[#e76a40]/45";

/** A written article. Muted: reading is the secondary action next to solving. */
export const ARTICLE_BADGE_CLASS = "text-[#8b93a7] border-[#8b93a7]/45";

/**
 * A syllabus topic with nothing attached to study from yet — seeded for subjects
 * whose courses leave gaps, so the whole syllabus is visible rather than only the
 * parts someone happened to record.
 *
 * Derived rather than stored, which means it clears itself: the moment any link is
 * attached — by the sheet or by the user via the header's + button — the entry
 * stops being a stub.
 * Custom entries are excluded — an entry the user typed themselves is not a gap
 * the sheet is asking them to fill.
 */
export function needsResource(
  p: Pick<
    Problem,
    "video" | "link" | "practiceLink" | "tufPracticeLink" | "customPracticeLink" | "isCustom"
  >
): boolean {
  return (
    !p.video &&
    !p.link &&
    !p.practiceLink &&
    !p.tufPracticeLink &&
    !p.customPracticeLink &&
    !p.isCustom
  );
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


/** One badge in the problem's link row. */
export interface LinkChip {
  key: string;
  label: string;
  href: string;
  /** Tailwind text+border classes, matching the badge family above. */
  className: string;
  title: string;
}

/**
 * Every link a problem offers, in a fixed order so the same resource is always in
 * the same place: watch, then solve, then read, then whatever the user added.
 *
 * Both the desktop and the mobile header render from this one array — they used
 * to build their own rows and had already drifted apart.
 *
 * `link` is the article slot: it holds the sheet's takeuforward article unless the
 * user has supplied their own, which replaces it (see lib/sheet.ts). A custom
 * *problem* link is additive instead, so it never hides one of the sheet's.
 */
export function problemLinks(
  p: Pick<
    Problem,
    "video" | "link" | "practiceLink" | "tufPracticeLink" | "customPracticeLink"
  >,
  opts: { canWatchVideo: boolean }
): LinkChip[] {
  const chips: LinkChip[] = [];

  // YouTube lectures are public, so the access allowlist only gates Drive files.
  if (p.video && (p.video.provider === "youtube" || opts.canWatchVideo)) {
    chips.push({
      key: "video",
      label: videoLabel(p.video),
      href: videoUrl(p.video),
      className: VIDEO_BADGE_CLASS,
      title: p.video.t
        ? `Opens the lecture at ${videoLabel(p.video).slice(2)}, where this topic starts`
        : "Watch the lecture",
    });
  }

  if (p.tufPracticeLink) {
    chips.push({
      key: "tuf",
      label: "TUF",
      href: p.tufPracticeLink,
      className: TUF_BADGE_CLASS,
      title: "Solve on takeuforward",
    });
  }

  const practice = linkPlatform(p.practiceLink);
  if (practice) {
    chips.push({
      key: "practice",
      label: practice.label,
      href: p.practiceLink,
      className: practice.className,
      title: `Solve on ${practice.label}`,
    });
  }

  if (p.link) {
    chips.push({
      key: "article",
      label: "Article",
      href: p.link,
      className: ARTICLE_BADGE_CLASS,
      title: "Read the article",
    });
  }

  const mine = linkPlatform(p.customPracticeLink);
  if (mine) {
    chips.push({
      key: "custom-practice",
      label: mine.label,
      href: p.customPracticeLink,
      className: mine.className,
      title: `Your own problem link (${mine.label})`,
    });
  }

  return chips;
}
