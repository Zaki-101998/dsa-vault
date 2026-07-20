"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "./supabase/client";
import { clearAuthRecovery, isAuthError, recoverFromAuthError } from "./supabase/auth-error";
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
    position: null,
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
      // A stale/clock-skewed session ("JWT issued at future") makes every query
      // 401 — clear it and re-login for a fresh token rather than showing an
      // empty vault forever. recoverFromAuthError navigates away when it fires.
      if ((pErr && isAuthError(pErr)) || (sErr && isAuthError(sErr))) {
        if (await recoverFromAuthError(supabase)) return;
      }
      if (pErr) console.error("Failed to load problems:", pErr.message);
      else clearAuthRecovery();
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
      const finalTopic = topic || "Custom";
      // Land the new problem at the end of its target section by giving it a
      // position just past the current max — so the ordering survives a reload.
      const norm = finalTopic.trim().toLowerCase();
      const { groups } = mergeProblems(rowsRef.current);
      const target = groups.find((g) => g.title.trim().toLowerCase() === norm);
      const maxFinite = target
        ? target.problems.reduce((m, p) => (Number.isFinite(p.sortIndex) ? Math.max(m, p.sortIndex) : m), -1)
        : -1;
      updateRow(key, {
        custom_name: name || "Untitled",
        custom_topic: finalTopic,
        position: maxFinite + 1,
      });
      return key;
    },
    [updateRow]
  );

  // Move a problem within its section by writing a single fractional position
  // (the midpoint of its new neighbours), riding the same optimistic upsert path.
  const reorderProblem = useCallback(
    (groupKey: string, activeKey: string, overKey: string) => {
      if (activeKey === overKey) return;
      const { groups } = mergeProblems(rowsRef.current);
      const group = groups.find((g) => g.key === groupKey);
      if (!group) return;
      const arr = group.problems;
      const oldIndex = arr.findIndex((p) => p.key === activeKey);
      const newIndex = arr.findIndex((p) => p.key === overKey);
      if (oldIndex === -1 || newIndex === -1) return;

      // Rebuild the array as it will look after the move, then read the moved
      // item's neighbours to derive its new sort index.
      const next = [...arr];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      const prev = next[newIndex - 1];
      const after = next[newIndex + 1];

      let position: number;
      if (!prev) position = (Number.isFinite(after.sortIndex) ? after.sortIndex : 0) - 1;
      else if (!after) position = (Number.isFinite(prev.sortIndex) ? prev.sortIndex : 0) + 1;
      else {
        const lo = Number.isFinite(prev.sortIndex) ? prev.sortIndex : 0;
        const hi = Number.isFinite(after.sortIndex) ? after.sortIndex : lo + 2;
        position = (lo + hi) / 2;
      }
      updateRow(activeKey, { position });
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
        position: r.position ?? null,
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
    reorderProblem,
    deleteProblem,
    importRows,
    setDecayDays,
    rows,
  };
}

export type Vault = ReturnType<typeof useVault>;
