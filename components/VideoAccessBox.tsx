"use client";

import { useState } from "react";
import type { VideoAccess } from "@/lib/useVideoAccess";

/**
 * Owner-only management of who sees the Drive video links. Rendered in the
 * sidebar footer; the Sidebar decides whether the viewer is an owner.
 *
 * Deliberately spells out that Drive sharing is the other half of the job —
 * adding an address here without sharing the folder produces a link that lands
 * the person on Google's "Request access" page.
 */
export function VideoAccessBox({ access }: { access: VideoAccess }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    setError(await access.addEmail(email));
    setBusy(false);
    setEmail("");
  }

  return (
    <div className="border-t border-[#2a3040] px-3.5 py-2 text-xs text-[#8b93a7]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-1.5 hover:text-[#e6e9f0]"
      >
        <span className={`text-[10px] transition-transform ${open ? "rotate-90" : ""}`}>▸</span>
        <span>Video access</span>
        <span className="ml-auto text-[#565e73]">{access.rows.length}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          <p className="text-[11px] leading-relaxed text-[#565e73]">
            These people see ▶ Video links. Share the Drive folder with them too — this list
            alone doesn&apos;t grant access to the files.
          </p>
          <ul className="space-y-1">
            {access.rows.map((r) => (
              <li key={r.email} className="flex items-center gap-1.5">
                <span className="flex-1 min-w-0 truncate" title={r.email}>
                  {r.email}
                </span>
                {r.is_owner ? (
                  <span className="text-[10px] text-[#565e73] shrink-0">owner</span>
                ) : (
                  <button
                    onClick={() => void access.removeEmail(r.email)}
                    title={`Remove ${r.email}`}
                    className="text-[#8b93a7] hover:text-[#e12d39] shrink-0 px-1"
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="flex gap-1.5">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !busy && void add()}
              placeholder="name@gmail.com"
              className="flex-1 min-w-0 bg-[#1c212c] border border-[#2a3040] rounded-md px-2 py-1 outline-none focus:border-[#5b8cff]"
            />
            <button
              onClick={() => void add()}
              disabled={busy}
              className="border border-[#2a3040] rounded-md px-2 py-1 hover:text-[#e6e9f0] hover:border-[#565e73] disabled:opacity-50"
            >
              Add
            </button>
          </div>
          {error && <p className="text-[11px] text-[#e12d39]">{error}</p>}
        </div>
      )}
    </div>
  );
}
