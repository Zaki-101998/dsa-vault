"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function signInWithGoogle() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  async function sendMagicLink(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0f1115] text-[#e6e9f0] px-4">
      <div className="w-full max-w-sm bg-[#161a22] border border-[#2a3040] rounded-xl p-8">
        <h1 className="text-xl font-bold mb-1">
          DSA <span className="text-[#5b8cff]">Vault</span>
        </h1>
        <p className="text-sm text-[#8b93a7] mb-6">
          Notes, code &amp; revision tracker for Striver&apos;s A2Z sheet.
        </p>

        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-2 bg-white text-[#111] font-medium rounded-lg py-2.5 mb-4 hover:brightness-95 transition"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.47a5.54 5.54 0 0 1-2.4 3.64v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.61l4 3.11C6.22 6.86 8.87 4.75 12 4.75z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-4 text-xs text-[#8b93a7]">
          <div className="flex-1 h-px bg-[#2a3040]" /> or <div className="flex-1 h-px bg-[#2a3040]" />
        </div>

        {sent ? (
          <p className="text-sm text-[#3ecf8e]">
            Check your inbox — we sent a sign-in link to <b>{email}</b>.
          </p>
        ) : (
          <form onSubmit={sendMagicLink} className="space-y-3">
            <input
              type="email"
              required
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#1c212c] border border-[#2a3040] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#5b8cff]"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#5b8cff] text-white font-medium rounded-lg py-2.5 text-sm hover:brightness-110 disabled:opacity-60 transition"
            >
              {loading ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}

        {error && <p className="text-sm text-[#e12d39] mt-3">{error}</p>}
      </div>
    </main>
  );
}
