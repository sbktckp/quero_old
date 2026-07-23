import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, ArrowRight, Heart, Sparkles, Quote, Users, HelpCircle, Mail,
} from "lucide-react";

type LegalRow = {
  title: string;
  content: string;
  sections: { subtitle?: string; intro?: string } | null;
  updated_at: string;
};
type TeamMember = {
  id: string;
  name: string;
  role: string;
  photo_url: string | null;
  short_bio: string | null;
  founder_message: string | null;
  is_founder: boolean;
  sort_order: number;
};

export const Route = createFileRoute("/about")({
  loader: async () => {
    const [pageRes, teamRes, contactRes] = await Promise.all([
      supabase.from("legal_pages").select("title,content,sections,updated_at").eq("slug", "about-us").maybeSingle(),
      supabase.from("team_members").select("id,name,role,photo_url,short_bio,founder_message,is_founder,sort_order").eq("is_active", true).order("sort_order", { ascending: true }),
      supabase.from("contact_settings").select("support_email").eq("id", true).maybeSingle(),
    ]);
    if (pageRes.error) throw pageRes.error;
    if (teamRes.error) throw teamRes.error;
    return {
      page: (pageRes.data ?? null) as LegalRow | null,
      team: (teamRes.data ?? []) as TeamMember[],
      supportEmail: contactRes.data?.support_email ?? "support@quero.in",
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.page?.title ?? "About Us"} — Quero` },
      { name: "description", content: loaderData?.page?.sections?.intro ?? loaderData?.page?.content ?? "The team and story behind Quero." },
      { property: "og:title", content: `${loaderData?.page?.title ?? "About Us"} — Quero` },
      { property: "og:description", content: loaderData?.page?.sections?.intro ?? loaderData?.page?.content ?? "The team and story behind Quero." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center p-6 text-sm text-muted-foreground">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-xl font-bold">Page not found</h1>
      <Link to="/" className="text-primary underline text-sm">Go home</Link>
    </div>
  ),
});

function Avatar({ name, url, size = 72 }: { name: string; url: string | null; size?: number }) {
  const initials = name.split(/\s+/).map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        loading="lazy"
        className="rounded-2xl object-cover shadow-card border border-border"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-2xl gradient-primary text-primary-foreground flex items-center justify-center font-extrabold shadow-card"
      style={{ width: size, height: size, fontSize: size / 2.6 }}
      aria-hidden
    >
      {initials || "Q"}
    </div>
  );
}

function AboutPage() {
  const { page, team, supportEmail } = Route.useLoaderData();
  const founders = team.filter((m: TeamMember) => m.is_founder);
  const title = page?.title ?? "About Quero";
  const subtitle = page?.sections?.subtitle ?? "Our mission";

  const intro = page?.sections?.intro ?? page?.content ?? "";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-3xl flex items-center gap-3 px-5 py-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft size={18} /></Link>
          <h1 className="font-bold text-sm">{title}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-6 space-y-5">
        {/* Hero */}
        <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-4 flex-col-reverse sm:flex-row">
            <div className="flex-1 min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold px-2.5 py-1">
                <Sparkles size={12} /> Built with heart in India
              </span>
              <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold text-foreground leading-tight">{title}</h2>
              {subtitle && <p className="mt-1 text-primary font-semibold">{subtitle}</p>}
              {intro && <p className="mt-2 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{intro}</p>}
            </div>
            <div className="relative w-40 h-40 shrink-0">
              <div className="absolute inset-0 rounded-3xl gradient-primary shadow-elevated flex items-center justify-center">
                <Heart size={54} className="text-primary-foreground" strokeWidth={2.2} />
              </div>
              <div className="absolute -top-2 -right-2 h-3 w-3 rounded-full bg-primary/40" />
              <div className="absolute -bottom-2 -left-2 text-primary/70"><Sparkles size={16} /></div>
            </div>
          </div>
        </section>

        {/* Founder's Note */}
        {founders.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Quote size={14} />
              </span>
              <h3 className="font-bold text-foreground">Founder's note</h3>
            </div>
            {founders.map((f: TeamMember) => (
              <article key={f.id} className="rounded-3xl border border-border bg-card p-5 shadow-card">
                <div className="flex items-start gap-4 flex-col sm:flex-row">
                  <Avatar name={f.name} url={f.photo_url} size={96} />
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-foreground">{f.name}</div>
                    <div className="text-xs text-primary font-semibold">{f.role}</div>
                    {f.founder_message ? (
                      <p className="mt-3 text-sm leading-relaxed text-foreground/85 whitespace-pre-line">
                        {f.founder_message}
                      </p>
                    ) : f.short_bio ? (
                      <p className="mt-3 text-sm leading-relaxed text-foreground/80 whitespace-pre-line">{f.short_bio}</p>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        {/* Meet the team */}
        {team.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Users size={14} />
              </span>
              <h3 className="font-bold text-foreground">Meet the team</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {team.map((m: TeamMember) => (
                <div key={m.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                  <div className="flex items-start gap-3">
                    <Avatar name={m.name} url={m.photo_url} size={64} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-foreground truncate">{m.name}</div>
                      <div className="text-[11px] text-primary font-semibold">{m.role}</div>
                      {m.short_bio && (
                        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed line-clamp-4">{m.short_bio}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {team.length === 0 && (
          <section className="rounded-3xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            The team page will fill up soon.
          </section>
        )}

        {/* Contact CTA */}
        <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-start gap-4">
            <span className="h-11 w-11 shrink-0 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <HelpCircle size={20} />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground">Have questions? Contact us.</h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                We'd love to hear from students, parents, and educators. Reach us at{" "}
                <a href={`mailto:${supportEmail}`} className="text-primary font-medium underline underline-offset-2">{supportEmail}</a>.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-1.5 rounded-full gradient-primary text-primary-foreground text-sm font-semibold px-4 py-2 shadow-card"
                >
                  Contact Us <ArrowRight size={14} />
                </Link>
                <a
                  href={`mailto:${supportEmail}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border text-foreground text-sm font-semibold px-4 py-2 hover:bg-muted"
                >
                  <Mail size={14} /> Email
                </a>
              </div>
            </div>
          </div>
        </section>

        <p className="text-center text-[11px] text-muted-foreground pt-2">
          <Heart size={11} className="inline -mt-0.5 text-primary" /> Made for every aspiring doctor.
        </p>
      </main>
    </div>
  );
}
