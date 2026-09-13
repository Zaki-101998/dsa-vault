"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "./supabase/client";

export interface VideoAccessRow {
  email: string;
  is_owner: boolean;
}

/**
 * Whether this viewer should be shown links to the Drive lecture videos.
 *
 * This is a UX gate, NOT a security boundary. Google Drive enforces who can
 * actually open a file; all this does is avoid showing a link that would land
 * the viewer on a "Request access" page. Sharing a Drive folder with someone is
 * therefore necessary but not sufficient — they also need a row in video_access
 * (see supabase/migration-video-access.sql).
 */
export function useVideoAccess(userEmail: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<VideoAccessRow[]>([]);
  const [fetched, setFetched] = useState(false);
  // Bumped after a write so the effect re-runs and picks up the new list.
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!userEmail) return;
    let cancelled = false;
    (async () => {
      // RLS narrows this to the viewer's own row, or every row for an owner.
      const { data, error } = await supabase.from("video_access").select("email, is_owner");
      if (cancelled) return;
      if (error) console.error("Failed to load video access:", error.message);
      setRows((data as VideoAccessRow[]) ?? []);
      setFetched(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, userEmail, reloadToken]);

  const mine = userEmail
    ? rows.find((r) => r.email.toLowerCase() === userEmail.toLowerCase())
    : undefined;

  const addEmail = useCallback(
    async (email: string): Promise<string | null> => {
      const clean = email.trim().toLowerCase();
      if (!clean) return "Enter an email address.";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) return "That doesn't look like an email address.";
      const { error } = await supabase.from("video_access").insert({ email: clean });
      if (error) return error.code === "23505" ? "That address already has access." : error.message;
      setReloadToken((n) => n + 1);
      return null;
    },
    [supabase]
  );

  const removeEmail = useCallback(
    async (email: string): Promise<string | null> => {
      const { error } = await supabase.from("video_access").delete().eq("email", email);
      if (error) return error.message;
      setReloadToken((n) => n + 1);
      return null;
    },
    [supabase]
  );

  return {
    loading: !!userEmail && !fetched,
    canWatch: !!mine,
    isOwner: !!mine?.is_owner,
    rows,
    addEmail,
    removeEmail,
  };
}

export type VideoAccess = ReturnType<typeof useVideoAccess>;
