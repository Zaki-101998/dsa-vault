"use client";

import { starColor, isOverdue } from "@/lib/decay";
import type { MouseEvent } from "react";

export function RevisionStar({
  starred,
  lastRevised,
  decayDays,
  size = 18,
  onClick,
  className = "",
}: {
  starred: boolean;
  lastRevised: number | null;
  decayDays: number;
  size?: number;
  onClick?: (e: MouseEvent) => void;
  className?: string;
}) {
  const color = starColor(starred, lastRevised, decayDays);
  const overdue = isOverdue(starred, lastRevised, decayDays);

  return (
    <button
      type="button"
      onClick={onClick}
      title={
        starred
          ? "Click to mark revised again (click a fresh star to remove it)"
          : "Click to add this problem to your revision rotation"
      }
      className={`inline-flex items-center justify-center shrink-0 transition-transform hover:scale-110 ${
        overdue ? "animate-pulse" : ""
      } ${className}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={color || "none"}
        stroke={color || "#565e73"}
        strokeWidth="1.6"
        strokeLinejoin="round"
      >
        <path d="M12 2.5l2.95 5.98 6.6.96-4.78 4.66 1.13 6.58L12 17.58l-5.9 3.1 1.13-6.58L2.45 9.44l6.6-.96z" />
      </svg>
    </button>
  );
}
