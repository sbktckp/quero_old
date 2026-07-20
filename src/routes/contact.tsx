import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

const SUPPORT_EMAIL = "support@quero.app";

export const Route = createFileRoute("/contact")({
  loader: async () => {
    const { data, error } = await supabase
      .from("legal_pages")
      .select("slug,title,content,updated_at")
      .eq("slug", "contact")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();
    return data;
  },
  head: () => ({
    meta: [
      { title: "Contact — Quero" },
      { name: "description", content: "Contact the Quero support team." },
    ],
  }),
  component: ContactPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center p-6 text-sm text-muted-foreground">
      {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center p-6 text-sm">Contact info not found.</div>
  ),
});

function ContactPage() {
  const data = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-lg flex items-center gap-3 px-5 py-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft size={18} /></Link>
          <h1 className="font-bold text-sm">{data.title}</h1>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-5 py-6 space-y-4">
        <article className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-card">
          <h2 className="text-xl font-bold">{data.title}</h2>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {data.content}
          </div>
          <a href={`mailto:${SUPPORT_EMAIL}`}>
            <Button className="w-full mt-2 gap-2"><Mail size={16} /> Email {SUPPORT_EMAIL}</Button>
          </a>
        </article>
      </main>
    </div>
  );
}
