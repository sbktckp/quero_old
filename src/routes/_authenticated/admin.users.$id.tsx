import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users/$id")({
  component: UserDetail,
});

function UserDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["admin-user", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: role } = useQuery({
    queryKey: ["admin-user-role", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", id).maybeSingle();
      if (error) throw error;
      return data?.role ?? "student";
    },
  });
  const { data: attempts = [] } = useQuery({
    queryKey: ["admin-user-attempts", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_attempts")
        .select("id, test_type, mode, started_at, submitted_at, total_questions, correct_count, score, subjects(name)")
        .eq("user_id", id).order("started_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  async function changeRole(next: "student" | "admin") {
    const { error } = await supabase.rpc("admin_set_user_role", { _user_id: id, _role: next });
    if (error) { toast.error(error.message); return; }
    toast.success(`Role set to ${next}`);
    qc.invalidateQueries({ queryKey: ["admin-user-role", id] });
    qc.invalidateQueries({ queryKey: ["admin-users-roles"] });
  }

  return (
    <div className="space-y-4">
      <Link to="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Back to users
      </Link>
      <div className="rounded-2xl bg-card border border-border p-5 shadow-card">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-lg font-bold">{profile?.display_name || "Unnamed"}</div>
            <div className="text-sm text-muted-foreground">{profile?.email}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Joined {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Role</span>
            <Select value={role ?? "student"} onValueChange={(v) => changeRole(v as "student" | "admin")}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border font-semibold text-sm">Test attempts</div>
        {attempts.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No attempts yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground bg-muted/30">
              <tr>
                <th className="text-left px-4 py-2">Type</th>
                <th className="text-left px-4 py-2">Subject</th>
                <th className="text-left px-4 py-2">Mode</th>
                <th className="text-right px-4 py-2">Score</th>
                <th className="text-right px-4 py-2">Started</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-4 py-2">{a.test_type}</td>
                  <td className="px-4 py-2">{(a as { subjects?: { name?: string } | null }).subjects?.name ?? "—"}</td>
                  <td className="px-4 py-2">{a.mode}</td>
                  <td className="px-4 py-2 text-right">{a.submitted_at ? `${a.correct_count}/${a.total_questions}` : "In progress"}</td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground">{new Date(a.started_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
