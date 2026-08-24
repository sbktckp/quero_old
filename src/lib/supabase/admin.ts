import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Service-role key: bypasses RLS entirely. The `server-only` import above
// makes any accidental client-bundle import a build failure, not a silent
// leak — this replaces the filename-convention guarantee the previous
// TanStack Start setup relied on (.server.ts). Use only in Route Handlers,
// Server Actions, and other server-only modules; never import from a
// Client Component.
function isOpaqueKey(key: string) {
  return key.startsWith("sb_publishable_") || key.startsWith("sb_secret_");
}

function fixAuthHeader(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(init?.headers);
    if (isOpaqueKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
}

export const supabaseAdmin = createClient<Database>(url, key, {
  global: { fetch: fixAuthHeader(key) },
  auth: { persistSession: false, autoRefreshToken: false },
});
