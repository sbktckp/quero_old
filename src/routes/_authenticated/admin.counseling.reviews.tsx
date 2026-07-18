import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/counseling/reviews")({
  component: AdminReviews,
});

function AdminReviews() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data } = await supabase.from("college_reviews").select("*, colleges(name)").order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });
  const verify = useMutation({
    mutationFn: async ({ id, v }: { id: string; v: boolean }) => {
      const { error } = await supabase.from("college_reviews").update({ is_verified: v }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-reviews"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("college_reviews").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["admin-reviews"] }); },
  });

  return (
    <div className="space-y-1">
      {rows.length === 0 && <div className="text-sm text-muted-foreground">No reviews yet.</div>}
      {rows.map((r: any) => (
        <div key={r.id} className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-sm">{r.colleges?.name ?? "—"}</div>
            <div className="flex gap-1">
              <Button size="sm" variant={r.is_verified ? "default" : "outline"} onClick={() => verify.mutate({ id: r.id, v: !r.is_verified })}>
                <BadgeCheck size={12} /> {r.is_verified ? "Verified" : "Verify"}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => confirm("Remove review?") && remove.mutate(r.id)}><Trash2 size={14} /></Button>
            </div>
          </div>
          {r.review_text && <p className="text-xs mt-1 text-muted-foreground">{r.review_text}</p>}
          <div className="text-[10px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}
