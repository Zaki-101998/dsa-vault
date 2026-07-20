"use client";

// Recognizes the Supabase/PostgREST failures that mean the *persisted browser
// session is unusable* — expired, malformed, or clock-skewed. The clock-skew case
// surfaces as PostgREST "JWT issued at future": the token's `iat` is ahead of the
// auth server's clock, so every data query 401s. Server-side cookie validation via
// GoTrue is more lenient, so the page still renders while the browser data client
// is dead — which is why recovery has to happen here, on the client.

type QueryError = { message?: string | null; code?: string | null } | null | undefined;

export function isAuthError(err: QueryError): boolean {
  if (!err) return false;
  const code = err.code ?? "";
  const msg = (err.message ?? "").toLowerCase();
  return (
    code === "PGRST301" || // PostgREST: JWT invalid / expired / not yet valid
    code === "PGRST302" || // PostgREST: anonymous role disallowed (no valid JWT)
    msg.includes("jwt") ||
    msg.includes("issued at") ||
    msg.includes("token is expired") ||
    msg.includes("invalid claim")
  );
}

const RECOVER_FLAG = "sb-auth-recovering";

// One-shot recovery: drop the stale session and bounce to /login so a fresh token
// is minted (with an `iat` from the auth server, not the skewed device clock).
// Guarded by a sessionStorage flag so a re-login that still fails can't hot-loop —
// the second failure falls through to a surfaced error instead of redirecting again.
// Returns true when it is taking over (navigating away); callers should stop.
export async function recoverFromAuthError(supabase: {
  auth: { signOut: () => Promise<unknown> };
}): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(RECOVER_FLAG)) return false; // already tried once this session
  sessionStorage.setItem(RECOVER_FLAG, "1");
  await supabase.auth.signOut();
  window.location.href = "/login";
  return true;
}

// Clear the guard after any successful load, so a later genuine skew can recover.
export function clearAuthRecovery(): void {
  if (typeof window !== "undefined") sessionStorage.removeItem(RECOVER_FLAG);
}
