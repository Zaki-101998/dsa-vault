"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "./supabase/client";
import { defaultApproaches, mergeProblems, newApproachId } from "./sheet";
import type { Approach, Status, UserProblemRow } from "./types";

const DEFAULT_DECAY_DAYS = 5;

function blankRow(userId: string, key: string): UserProblemRow {
  return {
    id: "",
    user_id: userId,
    problem_key: key,
    custom_name: null,
    custom_topic: null,
    custom_link: null,
    status: "Unsolved",
    starred: false,
    last_revised: null,
    rev_count: 0,
    rev_log: [],
    notes_html: "",
    approaches: defaultApproaches(),
    updated_at: new Date().toISOString(),
  };
}

export function useVault(userId: string) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<UserProblemRow[]>([]);
  const [decayDays, setDecayDaysState] = useState(DEFAULT_DECAY_DAYS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // rowsRef is the source of truth for read-after-write logic (flush, markRevised, toggleStar).
  // It's kept in sync manually wherever rows are mutated below, rather than via React state,
  // so an immediate (non-debounced) write can never read a stale array within the same tick.
  const rowsRef = useRef<UserProblemRow[]>(rows);

  const commitRows = useCallback((updater: (prev: UserProblemRow[]) => UserProblemRow[]) => {
    const next = updater(rowsRef.current);
    rowsRef.current = next;
    setRows(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: problemRows, error: pErr }, { data: settings, error: sErr }] = await Promise.all([
        supabase.from("user_problems").select("*").eq("user_id", userId),
        supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
      ]);
      if (cancelled) return;
      if (pErr) console.error("Failed to load problems:", pErr.message);
      if (sErr) console.error("Failed to load settings:", sErr.message);
      commitRows(() => (problemRows as UserProblemRow[]) || []);
      if (settings?.decay_days) setDecayDaysState(settings.decay_days);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, userId, commitRows]);

  const { groups, byKey } = useMemo(() => mergeProblems(rows), [rows]);

  const writeTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const flush = useCallback(
    async (key: string) => {
      const current = rowsRef.current.find((r) => r.problem_key === key);
      if (!current) return;
      setSaving(true);
      const { id, ...payload } = current;
      void id;
      const { data, error } = await supabase
        .from("user_problems")
        .upsert({ ...payload, user_id: userId, problem_key: key }, { onConflict: "user_id,problem_key" })
        .select()
        .single();
      setSaving(false);
      if (error) {
        console.error("Save failed:", error.message);
        return;
      }
      commitRows((prev) => {
        const idx = prev.findIndex((r) => r.problem_key === key);
        const next = [...prev];
        if (idx === -1) next.push(data as UserProblemRow);
        else next[idx] = data as UserProblemRow;
        return next;
      });
    },
    [supabase, userId, commitRows]
  );

  const updateRow = useCallback(
    (key: string, patch: Partial<UserProblemRow>, debounceMs = 0) => {
      commitRows((prev) => {
        const idx = prev.findIndex((r) => r.problem_key === key);
        const next = [...prev];
        if (idx === -1) next.push({ ...blankRow(userId, key), ...patch });
        else next[idx] = { ...next[idx], ...patch };
        return next;
      });

      const timers = writeTimers.current;
      clearTimeout(timers.get(key));
      if (debounceMs <= 0) {
        flush(key);
      } else {
        timers.set(
          key,
          setTimeout(() => flush(key), debounceMs)
        );
      }
    },
    [flush, userId, commitRows]
  );

  const markRevised = useCallback(
    (key: string) => {
      const row = rowsRef.current.find((r) => r.problem_key === key);
      const now = new Date().toISOString();
      const log = [...(row?.rev_log || []), now];
      updateRow(key, {
        starred: true,
        last_revised: now,
        rev_count: (row?.rev_count || 0) + 1,
        rev_log: log,
      });
    },
    [updateRow]
  );

  const toggleStar = useCallback(
    (key: string) => {
      const row = rowsRef.current.find((r) => r.problem_key === key);
      if (!row?.starred) {
        markRevised(key);
        return;
      }
      const last = row.last_revised ? new Date(row.last_revised).getTime() : 0;
      const freshMs = 12 * 60 * 60 * 1000;
      if (Date.now() - last < freshMs) {
        updateRow(key, { starred: false });
      } else {
        markRevised(key);
      }
    },
    [markRevised, updateRow]
  );

  const removeStar = useCallback(
    (key: string) => updateRow(key, { starred: false }),
    [updateRow]
  );

  const setStatus = useCallback((key: string, status: Status) => updateRow(key, { status }), [updateRow]);

  const setNotes = useCallback((key: string, html: string) => updateRow(key, { notes_html: html }, 600), [updateRow]);

  const setApproaches = useCallback(
    (key: string, approaches: Approach[], debounceMs = 500) => updateRow(key, { approaches }, debounceMs),
    [updateRow]
  );

  const setCustomFields = useCallback(
    (key: string, patch: { custom_name?: string; custom_topic?: string; custom_link?: string }, debounceMs = 400) =>
      updateRow(key, patch, debounceMs),
    [updateRow]
  );

  const addCustomProblem = useCallback(
    (name: string, topic: string) => {
      const key = `custom:${newApproachId()}`;
      updateRow(key, {
        custom_name: name || "Untitled",
        custom_topic: topic || "Custom",
      });
      return key;
    },
    [updateRow]
  );

  const deleteProblem = useCallback(
    async (key: string) => {
      clearTimeout(writeTimers.current.get(key));
      commitRows((prev) => prev.filter((r) => r.problem_key !== key));
      const { error } = await supabase
        .from("user_problems")
        .delete()
        .eq("user_id", userId)
        .eq("problem_key", key);
      if (error) console.error("Delete failed:", error.message);
    },
    [supabase, userId, commitRows]
  );

  const importRows = useCallback(
    async (incoming: UserProblemRow[]) => {
      const payload = incoming.map((r) => ({
        user_id: userId,
        problem_key: r.problem_key,
        custom_name: r.custom_name ?? null,
        custom_topic: r.custom_topic ?? null,
        custom_link: r.custom_link ?? null,
        status: r.status || "Unsolved",
        starred: !!r.starred,
        last_revised: r.last_revised ?? null,
        rev_count: r.rev_count || 0,
        rev_log: r.rev_log || [],
        notes_html: r.notes_html || "",
        approaches: r.approaches || [],
      }));
      const { data, error } = await supabase
        .from("user_problems")
        .upsert(payload, { onConflict: "user_id,problem_key" })
        .select();
      if (error) {
        console.error("Import failed:", error.message);
        alert("Import failed: " + error.message);
        return;
      }
      commitRows((prev) => {
        const map = new Map(prev.map((x) => [x.problem_key, x]));
        for (const d of (data as UserProblemRow[]) || []) map.set(d.problem_key, d);
        return Array.from(map.values());
      });
    },
    [supabase, userId, commitRows]
  );

  const setDecayDays = useCallback(
    async (days: number) => {
      setDecayDaysState(days);
      const { error } = await supabase
        .from("user_settings")
        .upsert({ user_id: userId, decay_days: days }, { onConflict: "user_id" });
      if (error) console.error("Failed to save settings:", error.message);
    },
    [supabase, userId]
  );

  return {
    loading,
    saving,
    groups,
    byKey,
    decayDays,
    markRevised,
    toggleStar,
    removeStar,
    setStatus,
    setNotes,
    setApproaches,
    setCustomFields,
    addCustomProblem,
    deleteProblem,
    importRows,
    setDecayDays,
    rows,
  };
}

export type Vault = ReturnType<typeof useVault>;
