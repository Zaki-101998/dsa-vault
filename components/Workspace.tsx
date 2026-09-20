"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { useVault } from "@/lib/useVault";
import { useTodos } from "@/lib/useTodos";
import { useVideoAccess } from "@/lib/useVideoAccess";
import { knownTopics } from "@/lib/sheet";
import { SUBJECTS, SUBJECT_ORDER, subjectOf, type EntryTab } from "@/lib/subjects";
import { subjectStore } from "@/lib/subjectStore";
import { createClient } from "@/lib/supabase/client";
import type { SubjectId } from "@/lib/types";
import { Sidebar } from "./Sidebar";
import { ProblemHeader } from "./ProblemHeader";
import { NotesEditor } from "./NotesEditor";
import { CodeTabs } from "./CodeTabs";
import { TodoDrawer } from "./TodoDrawer";

type SelectionBySubject = Record<SubjectId, string | null>;

const NO_SELECTION: SelectionBySubject = { dsa: null, cn: null, os: null, dbms: null };

export function Workspace({ userId, userEmail }: { userId: string; userEmail: string | null }) {
  const subject = useSyncExternalStore(
    subjectStore.subscribe,
    subjectStore.getSnapshot,
    subjectStore.getServerSnapshot
  );
  const config = SUBJECTS[subject];

  const vault = useVault(userId, subject);
  const todos = useTodos(userId);
  const videoAccess = useVideoAccess(userEmail);

  // Keeping a selection per subject means switching tabs and coming back lands
  // you where you left off instead of on the welcome panel.
  const [selection, setSelection] = useState<SelectionBySubject>(NO_SELECTION);
  const [activeTab, setActiveTab] = useState<EntryTab>("notes");
  const [showTodos, setShowTodos] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const selectedKey = selection[subject];
  const problem = selectedKey ? vault.byKey.get(selectedKey) ?? null : null;

  const selectEntry = useCallback((key: string) => {
    // A todo can point at any subject, so follow the key rather than assuming
    // the entry lives in whatever tab is currently open.
    const target = subjectOf(key);
    subjectStore.set(target);
    setSelection((prev) => ({ ...prev, [target]: key }));
    setActiveTab(SUBJECTS[target].tabs[0]);
  }, []);

  function switchSubject(next: SubjectId) {
    subjectStore.set(next);
    setActiveTab(SUBJECTS[next].tabs[0]);
    setSidebarOpen(false);
  }

  const allTodayDone = todos.todayTotal > 0 && todos.todayDone === todos.todayTotal;

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
        // Remount per subject so search and filter reset — a "Concepts only"
        // filter has no meaning once you switch to DSA. Which sections are
        // folded deliberately survives, kept per subject in lib/collapseStore.
        key={subject}
        groups={vault.groups}
        rows={vault.rows}
        subject={config}
        videoAccess={videoAccess}
        selectedKey={selectedKey}
        decayDays={vault.decayDays}
        onSelect={selectEntry}
        onToggleStar={vault.toggleStar}
        onReorder={vault.reorderProblem}
        onAddProblem={vault.addCustomProblem}
        onDecayDaysChange={vault.setDecayDays}
        onImport={vault.importRows}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 border-b border-[#2a3040] text-xs text-[#8b93a7] shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            title={`Show ${config.entryNoun} list`}
            className="md:hidden border border-[#2a3040] rounded-md w-8 h-8 flex items-center justify-center text-base leading-none hover:text-[#e6e9f0] hover:border-[#565e73]"
          >
            ☰
          </button>

          {/* Four pills plus the menu and Today buttons is tight on a 375px
              phone, so let the strip scroll rather than squashing its neighbours. */}
          <nav className="flex gap-1 overflow-x-auto no-scrollbar" aria-label="Subject">
            {SUBJECT_ORDER.map((id) => (
              <button
                key={id}
                onClick={() => switchSubject(id)}
                aria-current={id === subject ? "page" : undefined}
                title={SUBJECTS[id].label}
                className={`rounded-md px-2 md:px-2.5 py-1 font-semibold border whitespace-nowrap ${
                  id === subject
                    ? "text-[#5b8cff] border-[#5b8cff]/50 bg-[#5b8cff]/10"
                    : "text-[#8b93a7] border-[#2a3040] hover:text-[#e6e9f0] hover:border-[#565e73]"
                }`}
              >
                {SUBJECTS[id].tabLabel}
              </button>
            ))}
          </nav>

          <button
            onClick={() => setShowTodos(true)}
            title="Daily plan — unfinished items roll over automatically"
            className={`border rounded-md px-2.5 py-1 font-semibold whitespace-nowrap ${
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

          <span className="ml-auto flex items-center gap-3 min-w-0">
            {vault.saving && <span className="text-[#3ecf8e]">Saving…</span>}
            {userEmail && <span className="hidden sm:inline max-w-[28vw] truncate">{userEmail}</span>}
            <button onClick={signOut} className="hover:text-[#e6e9f0] shrink-0">
              Sign out
            </button>
          </span>
        </div>

        {!problem ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="max-w-[480px] bg-[#161a22] border border-[#2a3040] rounded-xl p-7">
              <h2 className="text-lg font-bold mb-3">{config.label} Vault 🗂️</h2>
              <p className="text-sm text-[#8b93a7] mb-3">{config.blurb}</p>
              <ul className="text-sm space-y-1.5 list-disc list-inside text-[#8b93a7]">
                <li>
                  <b className="text-[#e6e9f0] capitalize">Pick a {config.entryNoun}</b> from the
                  sidebar to get started.
                </li>
                <li>
                  <b className="text-[#e6e9f0]">Notes tab</b> — paste straight from Gemini;
                  formatting is kept.
                </li>
                {config.tabs.includes("code") ? (
                  <li>
                    <b className="text-[#e6e9f0]">Code tab</b> — Brute / Better / Optimal solutions,
                    highlighted.
                  </li>
                ) : (
                  <li>
                    <b className="text-[#e6e9f0]">▶ Video</b> — opens the lecture on{" "}
                    {config.videoHost}, next to your notes.
                  </li>
                )}
                <li>
                  <b className="text-[#e6e9f0]">Star</b> — mark it revised; the star fades gold → red
                  the longer you leave it.
                </li>
                {config.hasConceptFilter && (
                  <li>
                    <b className="text-[#e6e9f0]">Concepts only</b> — hides the worked-question
                    videos when you want the theory run.
                  </li>
                )}
              </ul>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <ProblemHeader
              key={problem.key}
              problem={problem}
              subject={config}
              knownTopics={knownTopics(subject)}
              canWatchVideo={videoAccess.canWatch}
              decayDays={vault.decayDays}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onRename={(name) => vault.setCustomFields(problem.key, { custom_name: name })}
              onRetopic={(topic) => vault.setCustomFields(problem.key, { custom_topic: topic })}
              onResection={(section) => vault.setCustomFields(problem.key, { custom_section: section }, 0)}
              onLinksChange={(patch) => vault.setCustomFields(problem.key, patch)}
              onStatusChange={(status) => vault.setStatus(problem.key, status)}
              onStarClick={() => vault.toggleStar(problem.key)}
              onMarkRevised={() => vault.markRevised(problem.key)}
              onRemoveStar={() => vault.removeStar(problem.key)}
              planned={todos.plannedKeys.has(problem.key)}
              onPlan={(day) => todos.addTodo(`Revise: ${problem.name}`, day, problem.key)}
              onDelete={() => {
                vault.deleteProblem(problem.key);
                setSelection((prev) => ({ ...prev, [subject]: null }));
              }}
            />
            <div className="flex-1 min-h-0 flex flex-col p-2 md:p-5">
              {activeTab === "code" && config.tabs.includes("code") ? (
                <CodeTabs
                  key={problem.key}
                  approaches={problem.approaches}
                  onChange={(a) => vault.setApproaches(problem.key, a)}
                />
              ) : (
                <NotesEditor
                  problemKey={problem.key}
                  html={problem.notesHtml}
                  onChange={(html) => vault.setNotes(problem.key, html)}
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
          onOpenProblem={selectEntry}
        />
      )}
    </div>
  );
}
