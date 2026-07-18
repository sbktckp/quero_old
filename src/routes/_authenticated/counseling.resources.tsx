import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/counseling/resources")({
  component: Resources,
});

function Resources() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["counseling-articles"],
    queryFn: async () => {
      const { data } = await supabase.from("counseling_articles").select("id, title, slug, summary, category")
        .eq("is_published", true).order("sort_order").order("title");
      return data ?? [];
    },
  });

  return (
    <div className="space-y-2">
      {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> :
        rows.length === 0 ? (
          <div className="rounded-2xl border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
            No articles published yet.
          </div>
        ) : rows.map((a) => (
          <Link key={a.id} to="/counseling/resources/$slug" params={{ slug: a.slug }} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 hover:border-primary/40">
            <div className="h-9 w-9 rounded-xl bg-primary-soft text-primary flex items-center justify-center"><BookOpen size={16} /></div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{a.title}</div>
              {a.summary && <div className="text-xs text-muted-foreground line-clamp-2">{a.summary}</div>}
              {a.category && <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">{a.category}</div>}
            </div>
            <ChevronRight size={16} className="text-muted-foreground mt-1" />
          </Link>
        ))
      }
    </div>
  );
}
