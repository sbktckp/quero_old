import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { LegalPageTemplate, type LegalSection } from "@/components/legal-page-template";

const SLUGS = ["privacy-policy", "terms", "refund-policy", "contact"] as const;

type SectionsJson = {
  subtitle?: string;
  intro?: string;
  illustration?: string;
  items?: LegalSection[];
  trust?: { heading: string; body: string };
  contact?: { heading: string; body: string };
};

export const Route = createFileRoute("/legal/$slug")({
  loader: async ({ params }) => {
    if (!SLUGS.includes(params.slug as (typeof SLUGS)[number])) throw notFound();
    const [pageRes, settingsRes] = await Promise.all([
      supabase.from("legal_pages").select("slug,title,content,sections,updated_at").eq("slug", params.slug).maybeSingle(),
      supabase.from("contact_settings").select("support_email").eq("id", true).maybeSingle(),
    ]);
    if (pageRes.error) throw pageRes.error;
    if (!pageRes.data) throw notFound();
    return {
      ...pageRes.data,
      support_email: settingsRes.data?.support_email ?? "support@quero.in",
    };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.title} — Quero` },
          { name: "description", content: `${loaderData.title} for Quero.` },
          { property: "og:title", content: `${loaderData.title} — Quero` },
        ]
      : [],
  }),
  component: LegalPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center p-6 text-sm text-muted-foreground">
      {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-xl font-bold">Page not found</h1>
      <Link to="/" className="text-primary underline text-sm">Go home</Link>
    </div>
  ),
});

function LegalPage() {
  const data = Route.useLoaderData();
  const s = (data.sections ?? null) as SectionsJson | null;

  if (s && Array.isArray(s.items) && s.items.length > 0) {
    return (
      <LegalPageTemplate
        title={data.title}
        subtitle={s.subtitle}
        intro={s.intro}
        illustration={s.illustration}
        items={s.items}
        trust={s.trust}
        contact={s.contact}
        updatedAt={data.updated_at}
        supportEmail={data.support_email}
      />
    );
  }

  // Fallback: plain content
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-lg flex items-center gap-3 px-5 py-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft size={18} /></Link>
          <h1 className="font-bold text-sm">{data.title}</h1>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-5 py-6">
        <article className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-card">
          <h2 className="text-xl font-bold">{data.title}</h2>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {data.content}
          </div>
          <div className="pt-2 text-[11px] text-muted-foreground">
            Last updated: {new Date(data.updated_at).toLocaleDateString()}
          </div>
        </article>
      </main>
    </div>
  );
}
