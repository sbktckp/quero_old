import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

// Supabase's newer opaque API keys (sb_publishable_/sb_secret_) are not bearer
// JWTs. supabase-js still sets an Authorization: Bearer <key> header for them;
// that header must be dropped so the server enforces RLS instead of treating
// the request as pre-authorized by the key alone.
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
}

export const supabase = createBrowserClient<Database>(url, key, {
  global: { fetch: fixAuthHeader(key) },
});
