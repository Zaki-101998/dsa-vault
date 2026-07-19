"use client";

import { useState, type FormEvent } from "react";
import { KNOWN_TOPICS } from "@/lib/sheet";

export function AddProblemModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (name: string, topic: string) => void;
}) {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), topic.trim() || "Custom");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[#161a22] border border-[#2a3040] rounded-xl p-6"
      >
        <h2 className="text-base font-bold mb-4">Add a problem</h2>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs text-[#8b93a7] block mb-1">Problem name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kadane's Algorithm follow-up"
              className="w-full bg-[#1c212c] border border-[#2a3040] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#5b8cff]"
            />
          </div>
          <div>
            <label className="text-xs text-[#8b93a7] block mb-1">Topic</label>
            <input
              list="add-problem-topics"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Arrays"
              className="w-full bg-[#1c212c] border border-[#2a3040] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#5b8cff]"
            />
            <datalist id="add-problem-topics">
              {KNOWN_TOPICS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-[#2a3040] rounded-lg py-2 text-sm text-[#8b93a7] hover:text-[#e6e9f0]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-[#5b8cff] text-white rounded-lg py-2 text-sm font-medium hover:brightness-110"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
