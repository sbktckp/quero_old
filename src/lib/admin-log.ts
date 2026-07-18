import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget admin activity logger. Errors are swallowed —
 * failing to log should never block the underlying admin action.
 */
export async function logAdminAction(
  action: string,
  target_table?: string | null,
  target_id?: string | null,
  meta?: Record<string, unknown> | null,
) {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const admin_id = userRes.user?.id;
    if (!admin_id) return;
    await supabase.from("admin_activity_log").insert({
      admin_id,
      action,
      target_table: target_table ?? null,
      target_id: target_id ?? null,
      meta: (meta ?? null) as never,
    });
  } catch {
    // ignored
  }
}
