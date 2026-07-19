"use client";

import { useState, type FormEvent } from "react";
import { carriedDays, localDateStr, type Todos } from "@/lib/useTodos";
import type { UserTodoRow } from "@/lib/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Manual formatting instead of toLocaleDateString: server and browser locales
// can differ, which causes a hydration mismatch on the SSR-rendered text.
function fmtDay(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function TodoItem({
  todo,
  onToggle,
  onEdit,
  onDelete,
  onOpenProblem,
}: {
  todo: UserTodoRow;
  onToggle: () => void;
  onEdit: (text: string) => void;
  onDelete: () => void;
  onOpenProblem?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.text);
  const carried = carriedDays(todo);

  function commitEdit() {
    setEditing(false);
    if (draft.trim() && draft.trim() !== todo.text) onEdit(draft);
    else setDraft(todo.text);
  }

  return (
    <li className="group flex items-start gap-2.5 px-3.5 py-2 rounded-lg hover:bg-[#1c212c]">
      <button
        onClick={onToggle}
        title={todo.done ? "Mark not done" : "Mark done"}
        className={`mt-0.5 w-[18px] h-[18px] shrink-0 rounded border text-[11px] leading-none flex items-center justify-center ${
          todo.done
            ? "bg-[#3ecf8e] border-[#3ecf8e] text-[#08130d] font-bold"
            : "border-[#565e73] hover:border-[#3ecf8e] text-transparent"
        }`}
      >
        ✓
      </button>

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit();
            if (e.key === "Escape") {
              setDraft(todo.text);
              setEditing(false);
            }
          }}
          className="flex-1 bg-[#0d1017] border border-[#5b8cff] rounded-md px-2 py-0.5 text-[13px] outline-none"
        />
      ) : (
        <span
          onDoubleClick={() => setEditing(true)}
          onClick={todo.problem_key && !todo.done ? onOpenProblem : undefined}
          title={
            todo.problem_key
              ? "Click to open this problem · double-click to edit"
              : "Double-click to edit"
          }
          className={`flex-1 text-[13px] leading-snug ${
            todo.done ? "line-through text-[#565e73]" : "text-[#e6e9f0]"
          } ${todo.problem_key && !todo.done ? "cursor-pointer hover:text-[#5b8cff]" : ""}`}
        >
          {todo.problem_key && <span className="mr-1 text-[#5b8cff]">🔗</span>}
          {todo.text}
        </span>
      )}

      {carried > 0 && !todo.done && (
        <span
          title={`Unfinished since ${todo.original_date} — carried forward automatically`}
          className={`shrink-0 text-[10.5px] font-bold rounded px-1.5 py-0.5 ${
            carried >= 3 ? "bg-[#e12d39]/15 text-[#e12d39]" : "bg-[#f0b429]/15 text-[#f0b429]"
          }`}
        >
          carried {carried}d
        </span>
      )}

      <button
        onClick={onDelete}
        title="Delete"
        className="shrink-0 text-[#565e73] opacity-0 group-hover:opacity-100 hover:text-[#e12d39] text-[13px]"
      >
        ✕
      </button>
    </li>
  );
}

export function TodoDrawer({
  todos,
  onClose,
  onOpenProblem,
}: {
  todos: Todos;
  onClose: () => void;
  onOpenProblem: (key: string) => void;
}) {
  const [tab, setTab] = useState<"today" | "tomorrow">("today");
  const [text, setText] = useState("");

  const list = tab === "today" ? todos.today : todos.tomorrow;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    todos.addTodo(text, tab);
    setText("");
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 h-full w-[380px] max-w-full bg-[#161a22] border-l border-[#2a3040] flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="text-base font-bold">Daily plan</h2>
          <button
            onClick={onClose}
            title="Close"
            className="text-[#8b93a7] hover:text-[#e6e9f0] rounded-md w-7 h-7 flex items-center justify-center hover:bg-[#1c212c]"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-0.5 px-4 border-b border-[#2a3040]">
          {(["today", "tomorrow"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-[13px] font-semibold border-b-2 ${
                tab === t
                  ? "text-[#5b8cff] border-[#5b8cff]"
                  : "text-[#8b93a7] border-transparent hover:text-[#e6e9f0]"
              }`}
            >
              {t === "today" ? (
                <>Today {todos.todayTotal > 0 && `· ${todos.todayDone}/${todos.todayTotal}`}</>
              ) : (
                <>Tomorrow · {fmtDay(1)}</>
              )}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="px-4 py-3">
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Add a task for ${tab === "today" ? "today" : "tomorrow"}… (Enter)`}
            className="w-full bg-[#1c212c] border border-[#2a3040] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#5b8cff]"
          />
        </form>

        <ul className="flex-1 overflow-y-auto px-1.5 pb-2">
          {todos.loading ? (
            <li className="px-3.5 py-2 text-[13px] text-[#8b93a7]">Loading…</li>
          ) : list.length === 0 ? (
            <li className="px-3.5 py-2 text-[13px] text-[#8b93a7]">
              {tab === "today"
                ? "Nothing planned for today yet — add a task above, or use “Plan today” on a problem."
                : "Nothing queued for tomorrow. Plan it tonight, future-you will thank you."}
            </li>
          ) : (
            list.map((t) => (
              <TodoItem
                key={t.id}
                todo={t}
                onToggle={() => todos.toggleDone(t.id)}
                onEdit={(txt) => todos.editTodo(t.id, txt)}
                onDelete={() => todos.deleteTodo(t.id)}
                onOpenProblem={
                  t.problem_key
                    ? () => {
                        onOpenProblem(t.problem_key as string);
                        onClose();
                      }
                    : undefined
                }
              />
            ))
          )}
        </ul>

        <div className="border-t border-[#2a3040] px-4 py-2.5 text-[11.5px] text-[#565e73]">
          Unfinished items roll over to the next day automatically ({localDateStr(0)}).
        </div>
      </aside>
    </div>
  );
}
