import { supabase } from "@/integrations/supabase/client";

/**
 * Escape hatch for database functions added after the last
 * `supabase gen types` run.
 *
 * src/integrations/supabase/types.ts is generated, so a newly created RPC is a
 * TypeScript error until that file is regenerated, which fails the build and
 * silently ships nothing. Rather than let generated-type drift block deploys,
 * new institute RPCs go through here.
 *
 * Regenerate with:
 *   supabase gen types typescript --project-id abuwpeopwbhwqzioxhmk \
 *     > src/integrations/supabase/types.ts
 * after which these casts become redundant (harmless, but removable).
 *
 * The cast below is applied to the CLIENT, not to the method. Pulling the
 * method off first (`const call = supabase.rpc`) detaches it from its
 * receiver, and supabase-js implements rpc() as `this.rest.rpc(...)`, so a
 * detached call runs with `this` undefined under module strict mode and
 * throws "Cannot read properties of undefined (reading 'rest')" before any
 * request is sent. Keeping it a member call preserves `this`.
 */
type RpcResult<T> = Promise<{ data: T | null; error: { message: string } | null }>;

type RpcCapableClient<T> = {
  rpc: (name: string, params?: Record<string, unknown>) => RpcResult<T>;
};

export function rpc<T = unknown>(fn: string, args?: Record<string, unknown>): RpcResult<T> {
  return (supabase as unknown as RpcCapableClient<T>).rpc(fn, args);
}
