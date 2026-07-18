import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/counseling/resources/$slug")({
  component: ArticleView,
});

function ArticleView() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["counseling-article", slug],
    queryFn: async () => {
      const { data } = await supabase.from("counseling_articles").select("*").eq("slug", slug).eq("is_published", true).maybeSingle();
      return data;
    },
  });

  if (isLoading) return <Loader2 className="animate-spin mx-auto" />;
  if (!data) return (
    <div className="rounded-2xl border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
      Article not found. <Link to="/counseling/resources" className="text-primary underline">Back</Link>
    </div>
  );

  return (
    <article className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <header>
        <h1 className="text-xl font-bold">{data.title}</h1>
        {data.summary && <p className="text-sm text-muted-foreground mt-1">{data.summary}</p>}
      </header>
      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
        {data.content}
      </div>
    </article>
  );
}
