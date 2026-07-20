"use client";

import { useState } from "react";
import { useVault } from "@/lib/useVault";
import { useTodos } from "@/lib/useTodos";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "./Sidebar";
import { ProblemHeader } from "./ProblemHeader";
import { NotesEditor } from "./NotesEditor";
import { CodeTabs } from "./CodeTabs";
import { TodoDrawer } from "./TodoDrawer";

export function Workspace({ userId, userEmail }: { userId: string; userEmail: string | null }) {
  const vault = useVault(userId);
  const todos = useTodos(userId);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"notes" | "code">("notes");
  const [showTodos, setShowTodos] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const allTodayDone = todos.todayTotal > 0 && todos.todayDone === todos.todayTotal;

  const problem = selectedKey ? vault.byKey.get(selectedKey) ?? null : null;

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (vault.loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#8b93a7] text-sm">
        Loading your vault…
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <Sidebar
        groups={vault.groups}
        rows={vault.rows}
        selectedKey={selectedKey}
        decayDays={vault.decayDays}
        onSelect={(key) => {
          setSelectedKey(key);
          setActiveTab("notes");
        }}
        onToggleStar={vault.toggleStar}
        onReorder={vault.reorderProblem}
        onAddProblem={vault.addCustomProblem}
        onDecayDaysChange={vault.setDecayDays}
        onImport={vault.importRows}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="flex items-center justify-end gap-3 px-3 md:px-5 py-2 border-b border-[#2a3040] text-xs text-[#8b93a7] shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            title="Show problem list"
            className="md:hidden border border-[#2a3040] rounded-md w-8 h-8 flex items-center justify-center text-base leading-none hover:text-[#e6e9f0] hover:border-[#565e73]"
          >
            ☰
          </button>
          <button
            onClick={() => setShowTodos(true)}
            title="Daily plan — unfinished items roll over automatically"
            className={`mr-auto border rounded-md px-2.5 py-1 font-semibold ${
              allTodayDone
                ? "text-[#3ecf8e] border-[#3ecf8e]/40"
                : todos.carriedCount > 0
                  ? "text-[#f0b429] border-[#f0b429]/40"
                  : "text-[#8b93a7] border-[#2a3040] hover:text-[#e6e9f0]"
            }`}
          >
            ☑ Today{todos.todayTotal > 0 && ` ${todos.todayDone}/${todos.todayTotal}`}
            {todos.carriedCount > 0 && ` · ${todos.carriedCount} carried`}
          </button>
          {vault.saving && <span className="text-[#3ecf8e]">Saving…</span>}
          {userEmail && <span className="hidden sm:inline max-w-[40vw] truncate">{userEmail}</span>}
          <button onClick={signOut} className="hover:text-[#e6e9f0]">
            Sign out
          </button>
        </div>

        {!problem ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="max-w-[480px] bg-[#161a22] border border-[#2a3040] rounded-xl p-7">
              <h2 className="text-lg font-bold mb-3">Welcome to DSA Vault 🗂️</h2>
              <p className="text-sm text-[#8b93a7] mb-3">
                Your notes + code companion for Striver&apos;s A2Z sheet.
              </p>
              <ul className="text-sm space-y-1.5 list-disc list-inside text-[#8b93a7]">
                <li>
                  <b className="text-[#e6e9f0]">Pick a problem</b> from the sidebar to get started.
                </li>
                <li>
                  <b className="text-[#e6e9f0]">Notes tab</b> — paste straight from Gemini; formatting
                  is kept.
                </li>
                <li>
                  <b className="text-[#e6e9f0]">Code tab</b> — Brute / Better / Optimal Java solutions,
                  highlighted.
                </li>
                <li>
                  <b className="text-[#e6e9f0]">Star</b> — mark a problem revised; it fades gold → red
                  the longer you leave it.
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <ProblemHeader
              key={problem.key}
              problem={problem}
              decayDays={vault.decayDays}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onRename={(name) => vault.setCustomFields(problem.key, { custom_name: name })}
              onRetopic={(topic) => vault.setCustomFields(problem.key, { custom_topic: topic })}
              onRelink={(link) => vault.setCustomFields(problem.key, { custom_link: link })}
              onStatusChange={(status) => vault.setStatus(problem.key, status)}
              onStarClick={() => vault.toggleStar(problem.key)}
              onMarkRevised={() => vault.markRevised(problem.key)}
              onRemoveStar={() => vault.removeStar(problem.key)}
              planned={todos.plannedKeys.has(problem.key)}
              onPlan={(day) => todos.addTodo(`Revise: ${problem.name}`, day, problem.key)}
              onDelete={() => {
                vault.deleteProblem(problem.key);
                setSelectedKey(null);
              }}
            />
            <div className="flex-1 min-h-0 flex flex-col p-3 md:p-5">
              {activeTab === "notes" ? (
                <NotesEditor
                  problemKey={problem.key}
                  html={problem.notesHtml}
                  onChange={(html) => vault.setNotes(problem.key, html)}
                />
              ) : (
                <CodeTabs
                  key={problem.key}
                  approaches={problem.approaches}
                  onChange={(a) => vault.setApproaches(problem.key, a)}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {showTodos && (
        <TodoDrawer
          todos={todos}
          onClose={() => setShowTodos(false)}
          onOpenProblem={(key) => {
            setSelectedKey(key);
            setActiveTab("notes");
          }}
        />
      )}
    </div>
  );
}
