import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search as SearchIcon } from "lucide-react";
import { useState } from "react";
import { BottomNav } from "@/components/bottom-nav";

export const Route = createFileRoute("/_authenticated/search")({
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const { data: results = [] } = useQuery({
    queryKey: ["search", q],
    enabled: q.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase.from("questions")
        .select("id, question_text, subjects(name, slug)")
        .ilike("question_text", `%${q}%`).limit(20);
      if (error) throw error; return data;
    },
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-lg px-5 py-3.5">
          <h1 className="font-bold text-lg">Search</h1>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-5 py-4 space-y-4">
        <div className="relative">
          <SearchIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search questions…"
            className="input pl-10"
          />
        </div>

        {q.length < 2 && (
          <p className="text-sm text-muted-foreground text-center py-10">Start typing to search across the question bank.</p>
        )}

        <div className="space-y-2">
          {results.map((r) => {
            const s = r.subjects as { name?: string } | null;
            return (
              <div key={r.id} className="rounded-2xl bg-card border border-border p-4 shadow-card">
                <div className="text-xs text-primary font-semibold">{s?.name ?? "Question"}</div>
                <p className="text-sm mt-1">{r.question_text}</p>
              </div>
            );
          })}
          {q.length >= 2 && results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">No results found.</p>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
