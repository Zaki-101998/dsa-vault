"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "./supabase/client";
import { clearAuthRecovery, isAuthError, recoverFromAuthError } from "./supabase/auth-error";
import type { UserTodoRow } from "./types";

/** Local (device-timezone) calendar date as YYYY-MM-DD, offset by N days. */
export function localDateStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Whole days an item has been carried past the day it was first planned for. */
export function carriedDays(t: UserTodoRow): number {
  const ms = new Date(t.due_date).getTime() - new Date(t.original_date).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

const sortTodos = (a: UserTodoRow, b: UserTodoRow) =>
  Number(a.done) - Number(b.done) || a.position - b.position;

export function useTodos(userId: string) {
  const supabase = useMemo(() => createClient(), []);
  const [todos, setTodos] = useState<UserTodoRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const todayStr = localDateStr(0);
      // Carry-forward: anything unfinished from a past day rolls onto today.
      // original_date is left untouched so the UI can show how long it's been carried.
      const { error: rollErr } = await supabase
        .from("user_todos")
        .update({ due_date: todayStr })
        .eq("user_id", userId)
        .eq("done", false)
        .lt("due_date", todayStr);
      if (rollErr) console.error("Todo carry-forward failed:", rollErr.message);

      const { data, error } = await supabase
        .from("user_todos")
        .select("*")
        .eq("user_id", userId)
        .gte("due_date", todayStr)
        .order("position");
      if (cancelled) return;
      // Same stale/skewed-session recovery as useVault: bounce to /login for a
      // fresh token instead of leaving the daily plan permanently empty.
      if (isAuthError(error) || isAuthError(rollErr)) {
        if (await recoverFromAuthError(supabase)) return;
      } else if (!error) {
        clearAuthRecovery();
      }
      if (error) console.error("Failed to load todos:", error.message);
      setTodos((data as UserTodoRow[]) || []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, userId]);

  const addTodo = useCallback(
    async (text: string, day: "today" | "tomorrow", problemKey?: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const due = localDateStr(day === "today" ? 0 : 1);
      const position =
        todos.filter((t) => t.due_date === due).reduce((m, t) => Math.max(m, t.position), 0) + 1;
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const optimistic: UserTodoRow = {
        id: tempId,
        user_id: userId,
        text: trimmed,
        due_date: due,
        original_date: due,
        done: false,
        done_at: null,
        problem_key: problemKey ?? null,
        position,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setTodos((prev) => [...prev, optimistic]);
      const { data, error } = await supabase
        .from("user_todos")
        .insert({
          user_id: userId,
          text: trimmed,
          due_date: due,
          original_date: due,
          problem_key: problemKey ?? null,
          position,
        })
        .select()
        .single();
      if (error) {
        console.error("Failed to add todo:", error.message);
        setTodos((prev) => prev.filter((t) => t.id !== tempId));
        return;
      }
      setTodos((prev) => prev.map((t) => (t.id === tempId ? (data as UserTodoRow) : t)));
    },
    [supabase, userId, todos]
  );

  /**
   * Several todos at once, for one day — the drill summary's "add the reds to
   * today's plan". Not a loop over addTodo: that reads `position` from the
   * `todos` it closed over, so N calls in one tick would hand all N the same
   * position. One insert, with positions counted up from the day's current max.
   */
  const addTodos = useCallback(
    async (items: { text: string; problemKey?: string }[], day: "today" | "tomorrow") => {
      const clean = items
        .map((i) => ({ text: i.text.trim(), problemKey: i.problemKey ?? null }))
        .filter((i) => i.text);
      if (clean.length === 0) return;
      const due = localDateStr(day === "today" ? 0 : 1);
      const base = todos.filter((t) => t.due_date === due).reduce((m, t) => Math.max(m, t.position), 0);
      const stamp = `temp-${Date.now()}-${Math.random()}`;
      const nowIso = new Date().toISOString();
      const optimistic: UserTodoRow[] = clean.map((i, n) => ({
        id: `${stamp}-${n}`,
        user_id: userId,
        text: i.text,
        due_date: due,
        original_date: due,
        done: false,
        done_at: null,
        problem_key: i.problemKey,
        position: base + n + 1,
        created_at: nowIso,
        updated_at: nowIso,
      }));
      setTodos((prev) => [...prev, ...optimistic]);
      const { data, error } = await supabase
        .from("user_todos")
        .insert(
          optimistic.map((t) => ({
            user_id: userId,
            text: t.text,
            due_date: due,
            original_date: due,
            problem_key: t.problem_key,
            position: t.position,
          }))
        )
        .select();
      const isTemp = (t: UserTodoRow) => t.id.startsWith(stamp);
      if (error) {
        console.error("Failed to add todos:", error.message);
        setTodos((prev) => prev.filter((t) => !isTemp(t)));
        return;
      }
      setTodos((prev) => [...prev.filter((t) => !isTemp(t)), ...((data as UserTodoRow[]) || [])]);
    },
    [supabase, userId, todos]
  );

  const toggleDone = useCallback(
    async (id: string) => {
      const target = todos.find((t) => t.id === id);
      if (!target) return;
      const done = !target.done;
      const done_at = done ? new Date().toISOString() : null;
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done, done_at } : t)));
      const { error } = await supabase.from("user_todos").update({ done, done_at }).eq("id", id);
      if (error) console.error("Failed to update todo:", error.message);
    },
    [supabase, todos]
  );

  const editTodo = useCallback(
    async (id: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, text: trimmed } : t)));
      const { error } = await supabase.from("user_todos").update({ text: trimmed }).eq("id", id);
      if (error) console.error("Failed to edit todo:", error.message);
    },
    [supabase]
  );

  const deleteTodo = useCallback(
    async (id: string) => {
      setTodos((prev) => prev.filter((t) => t.id !== id));
      const { error } = await supabase.from("user_todos").delete().eq("id", id);
      if (error) console.error("Failed to delete todo:", error.message);
    },
    [supabase]
  );

  const todayStr = localDateStr(0);
  const tomorrowStr = localDateStr(1);
  // due_date <= today (not ===) so items carried forward while the app was
  // already open still land in Today after the rollover update.
  const today = todos.filter((t) => t.due_date <= todayStr).sort(sortTodos);
  const tomorrow = todos.filter((t) => t.due_date === tomorrowStr).sort(sortTodos);
  const todayDone = today.filter((t) => t.done).length;
  const carriedCount = today.filter((t) => !t.done && carriedDays(t) > 0).length;
  const plannedKeys = useMemo(
    () => new Set(todos.filter((t) => !t.done && t.problem_key).map((t) => t.problem_key as string)),
    [todos]
  );

  return {
    loading,
    today,
    tomorrow,
    todayDone,
    todayTotal: today.length,
    carriedCount,
    plannedKeys,
    addTodo,
    addTodos,
    toggleDone,
    editTodo,
    deleteTodo,
  };
}

export type Todos = ReturnType<typeof useTodos>;
