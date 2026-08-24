import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
}

/**
 * RLS-scoped client for the current request, built from the session cookie.
 * Call fresh per request (Server Component, Route Handler, Server Action) —
 * do not cache the instance across requests.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        // Server Components can't set cookies; ignore there, middleware
        // refreshes the session cookie on navigation instead.
        try {
          list.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* called from a Server Component — no-op, safe to ignore */
        }
      },
    },
  });
}

/** Throws if there is no authenticated user. Use at the top of any
 * Server Action / Route Handler / protected Server Component that needs one. */
export async function requireAuth() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return { supabase, user };
}
