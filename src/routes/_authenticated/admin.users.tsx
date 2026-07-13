import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersList,
});

type ProfileRow = {
  id: string; display_name: string | null; email: string | null; created_at: string;
};

function UsersList() {
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: async () => {
      let q = supabase.from("profiles").select("id, display_name, email, created_at").order("created_at", { ascending: false }).limit(200);
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(`display_name.ilike.${s},email.ilike.${s}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as ProfileRow[];
    },
  });

  const ids = data.map((d) => d.id);
  const { data: roles = [] } = useQuery({
    queryKey: ["admin-users-roles", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role").in("user_id", ids);
      if (error) throw error;
      return data as { user_id: string; role: string }[];
    },
  });
  const roleByUser = new Map(roles.map((r) => [r.user_id, r.role]));

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email" className="pl-9" />
      </div>
      <div className="rounded-2xl bg-card border border-border shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : data.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No users found.</div>
        ) : (
          <ul className="divide-y divide-border">
            {data.map((u) => (
              <li key={u.id}>
                <Link to="/admin/users/$id" params={{ id: u.id }} className="flex items-center justify-between px-4 py-3 hover:bg-muted/40">
                  <div>
                    <div className="text-sm font-medium">{u.display_name || "Unnamed"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={roleByUser.get(u.id) === "admin" ? "default" : "secondary"}>
                      {roleByUser.get(u.id) ?? "student"}
                    </Badge>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
