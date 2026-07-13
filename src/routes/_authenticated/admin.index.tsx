import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, HelpCircle, Layers, BookOpen, GitBranch, TrendingUp, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function useCount(key: string, table: string, filter?: (q: ReturnType<typeof supabase.from>) => unknown) {
  return useQuery({
    queryKey: ["admin-count", key],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabase.from(table as never).select("*", { count: "exact", head: true });
      if (filter) q = filter(q);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },
  });
}

function AdminDashboard() {
  const users = useCount("users", "profiles");
  const questions = useCount("questions", "questions");
  const subjects = useCount("subjects", "subjects");
  const chapters = useCount("chapters", "chapters");
  const topics = useCount("topics", "topics");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attemptsToday = useCount("attempts-today", "test_attempts", (q: any) => q.gte("started_at", today.toISOString()));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attemptsWeek = useCount("attempts-week", "test_attempts", (q: any) => q.gte("started_at", weekStart.toISOString()));

  const cards = [
    { label: "Total users", value: users.data, icon: Users },
    { label: "Total questions", value: questions.data, icon: HelpCircle },
    { label: "Subjects", value: subjects.data, icon: BookOpen },
    { label: "Chapters", value: chapters.data, icon: Layers },
    { label: "Topics", value: topics.data, icon: GitBranch },
    { label: "Attempts today", value: attemptsToday.data, icon: TrendingUp },
    { label: "Attempts this week", value: attemptsWeek.data, icon: CalendarDays },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className="rounded-2xl bg-card border border-border p-4 shadow-card">
            <Icon size={18} className="text-primary mb-2" />
            <div className="text-2xl font-bold">{c.value ?? "—"}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{c.label}</div>
          </div>
        );
      })}
    </div>
  );
}
