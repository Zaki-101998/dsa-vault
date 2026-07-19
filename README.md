# DSA Vault

A personal notes + code + revision tracker for [Striver's A2Z DSA sheet](https://takeuforward.org/dsa/strivers-a2z-sheet-learn-dsa-a-to-z). Preloaded with all 18 steps and 455 problems from the sheet. Paste study notes straight from Gemini (or anywhere) without losing formatting, keep Brute/Better/Optimal Java solutions per problem, and track revision with a star that decays from gold to red the longer a problem goes un-revised.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS 4
- **Supabase** — Postgres + Auth (Google OAuth / magic link), so your data syncs across devices
- **TipTap** for the rich-text notes editor (preserves pasted formatting, converts pasted plain-text markdown)
- **CodeMirror 6** for Java-highlighted code editing

## 1. Set up Supabase (one-time, ~5 minutes)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase dashboard, go to **SQL Editor → New query**, paste the entire contents of [`supabase/migration.sql`](supabase/migration.sql), and run it. This creates the two tables (`user_problems`, `user_settings`) with row-level security so your data is private to your account.
3. Go to **Authentication → Sign In / Providers**:
   - **Email**: usually on by default — this powers the magic-link option.
   - **Google**: enable it and follow Supabase's prompt to add a Google OAuth Client ID/secret (create one in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials) — "OAuth client ID" → Web application → add Supabase's provided redirect URL).
4. Go to **Authentication → URL Configuration** and set:
   - **Site URL**: `http://localhost:3000` for local dev (change to your Vercel URL after deploying).
   - **Redirect URLs**: add `http://localhost:3000/auth/callback` (and later your production `https://your-app.vercel.app/auth/callback`).
5. Go to **Project Settings → API** and copy the **Project URL** and **anon public** key.

## 2. Run locally

```bash
cp .env.local.example .env.local
# paste your Supabase URL + anon key into .env.local

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`. Sign in with Google or a magic link, and the sheet loads automatically.

## 3. Deploy to Vercel

1. Push this repo to GitHub.
2. In [Vercel](https://vercel.com/new), import the repo (framework preset: Next.js, auto-detected).
3. Add the two environment variables from `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel project settings.
4. Deploy. Once you have the live URL, go back to Supabase → **Authentication → URL Configuration** and add `https://your-app.vercel.app/auth/callback` to the redirect URLs (and update the Google OAuth client's authorized redirect URI the same way).

Vercel's build image runs Node 22+ by default, so the `@supabase/supabase-js` deprecation warning you may see locally on older Node versions won't appear in production.

## How it works

- **Notes tab** — a TipTap rich-text editor. Pasting from Gemini (or Docs, Notion, etc.) carries over its HTML formatting directly. Pasting plain-text markdown (`## heading`, `**bold**`, `` ``` `` code fences, `- ` lists, `> ` quotes, tables) is auto-converted to formatted content.
- **Code tab** — Brute / Better / Optimal sub-tabs per problem (add more with **+ Approach**), each with a Java-highlighted CodeMirror editor and Time/Space complexity fields.
- **Revision star** — click it (or "Mark Revised") to add a problem to your rotation. The star color interpolates gold → orange → red over the configurable "Red in N days" window (default 5), and pulses once it's fully overdue. Clicking an already-fresh star (<12h) removes it from rotation.
- **Sidebar** — grouped by the sheet's 18 steps, with search, and filters for Due / Starred / Solved / Unsolved. "+ Problem" adds anything outside the sheet.
- **Export / Import** — the sidebar footer has JSON backup/restore, independent of Supabase, as a safety net.

## Project structure

```
app/                 routes: /, /login, /auth/callback
components/          Sidebar, ProblemHeader, NotesEditor, CodeTabs, etc.
lib/                 useVault (Supabase-backed state), sheet merging, decay-color logic, Supabase clients
data/a2z-sheet.json  the 18 steps / 455 problems seed data
supabase/migration.sql  DB schema + RLS policies — run once in the Supabase SQL editor
```

## Possible future additions

Not built now, but worth considering if the revision habit sticks:

- **Spaced repetition**: double the decay window after each successful revision (5 → 10 → 20 days), so well-known problems nag you less often.
- **Streaks / activity heatmap** for daily revision consistency.
- **Tag-based filtering** (e.g. "two pointers", "DP on trees") independent of the sheet's topic grouping, since some patterns cut across steps.
