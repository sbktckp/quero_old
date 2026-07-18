import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/activity")({
  component: AdminActivity,
});

function AdminActivity() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_activity_log")
        .select("id, admin_id, action, target_table, target_id, meta, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <div className="p-6"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="font-semibold">Admin activity log</h2>
        <p className="text-xs text-muted-foreground">Last 500 actions.</p>
      </div>
      {data.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">No activity yet.</div>
      ) : (
        <div className="divide-y divide-border">
          {data.map((r) => (
            <div key={r.id} className="px-4 py-3 text-sm flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
              <span className="font-semibold">{r.action}</span>
              {r.target_table && (
                <span className="text-xs text-muted-foreground">{r.target_table}{r.target_id ? `#${String(r.target_id).slice(0, 8)}` : ""}</span>
              )}
              <span className="text-[10px] font-mono text-muted-foreground ml-auto">admin {r.admin_id.slice(0, 8)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
