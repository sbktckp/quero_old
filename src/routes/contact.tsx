import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Mail, Phone, MessageCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

type ContactSettings = {
  support_email: string;
  support_phone: string | null;
  support_whatsapp: string | null;
  support_hours_days: string;
  support_hours_time: string;
};

export const Route = createFileRoute("/contact")({
  loader: async () => {
    const [pageRes, settingsRes] = await Promise.all([
      supabase.from("legal_pages").select("slug,title,content,updated_at").eq("slug", "contact").maybeSingle(),
      supabase.from("contact_settings").select("*").eq("id", true).maybeSingle(),
    ]);
    if (pageRes.error) throw pageRes.error;
    if (settingsRes.error) throw settingsRes.error;
    return {
      page: pageRes.data,
      settings: (settingsRes.data ?? {
        support_email: "support@quero.in",
        support_phone: null,
        support_whatsapp: null,
        support_hours_days: "Monday – Saturday",
        support_hours_time: "9:00 AM – 8:00 PM (IST)",
      }) as ContactSettings,
    };
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
});

function waLink(n: string) {
  const digits = n.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}`;
}

function ContactPage() {
  const { page, settings } = Route.useLoaderData();
  const title = page?.title ?? "Contact";
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-lg flex items-center gap-3 px-5 py-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft size={18} /></Link>
          <h1 className="font-bold text-sm">{title}</h1>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-5 py-6 space-y-4">
        <article className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-card">
          <h2 className="text-xl font-bold">{title}</h2>
          {page?.content && (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {page.content}
            </div>
          )}

          <div className="space-y-2 pt-2">
            <a href={`mailto:${settings.support_email}`}>
              <Button className="w-full gap-2"><Mail size={16} /> Email {settings.support_email}</Button>
            </a>

            {settings.support_phone && settings.support_phone.trim() && (
              <a href={`tel:${settings.support_phone.replace(/[^\d+]/g, "")}`}>
                <Button variant="outline" className="w-full gap-2"><Phone size={16} /> Call {settings.support_phone}</Button>
              </a>
            )}

            {settings.support_whatsapp && settings.support_whatsapp.trim() && (
              <a href={waLink(settings.support_whatsapp)} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="w-full gap-2 border-green-600/40 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30">
                  <MessageCircle size={16} /> Chat on WhatsApp
                </Button>
              </a>
            )}
          </div>

          <div className="rounded-xl bg-muted/40 p-3 flex items-start gap-2 text-xs text-muted-foreground">
            <Clock size={14} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold text-foreground">Support hours</div>
              <div>{settings.support_hours_days}</div>
              <div>{settings.support_hours_time}</div>
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}
