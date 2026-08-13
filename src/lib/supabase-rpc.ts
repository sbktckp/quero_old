import { supabase } from "@/integrations/supabase/client";

/**
 * Escape hatch for database functions added after the last
 * `supabase gen types` run.
 *
 * src/integrations/supabase/types.ts is generated, so a newly created RPC is a
 * TypeScript error until that file is regenerated -- which fails the build and
 * silently ships nothing. Rather than let generated-type drift block deploys,
 * new institute RPCs go through here.
 *
 * Regenerate with:
 *   supabase gen types typescript --project-id abuwpeopwbhwqzioxhmk \
 *     > src/integrations/supabase/types.ts
 * after which these casts become redundant (harmless, but removable).
 */
type RpcResult<T> = Promise<{ data: T | null; error: { message: string } | null }>;

export function rpc<T = unknown>(fn: string, args?: Record<string, unknown>): RpcResult<T> {
  const call = supabase.rpc as unknown as (
    name: string,
    params?: Record<string, unknown>,
  ) => RpcResult<T>;
  return call(fn, args);
}
