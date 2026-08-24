import { supabase } from "./client";

/**
 * Escape hatch for RPCs added after the last `supabase gen types` run.
 *
 * Keep this a member call on `supabase`, not a detached reference — pulling
 * the method off first (`const call = supabase.rpc`) loses `this`, and
 * supabase-js implements rpc() as `this.rest.rpc(...)`, so a detached call
 * throws before any request is sent. This exact bug took down the institute
 * pipeline in production once already (see docs/nextjs-migration-plan.md).
 */
type RpcResult<T> = Promise<{ data: T | null; error: { message: string } | null }>;

export function rpc<T = unknown>(fn: string, args?: Record<string, unknown>): RpcResult<T> {
  return supabase.rpc(fn, args) as RpcResult<T>;
}
