import { Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Instagram, Youtube, Send, MessageCircle, Loader2 } from "lucide-react";
import { z } from "zod";

type FooterSettings = {
  support_whatsapp: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  telegram_url: string | null;
  show_whatsapp_social: boolean;
};

const emailSchema = z.string().trim().email("Enter a valid email").max(255);

function waLink(n: string) {
  return `https://wa.me/${n.replace(/[^\d]/g, "")}`;
}

export function LandingFooter() {
  const year = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const { data } = useQuery({
    queryKey: ["footer-contact-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_settings")
        .select("support_whatsapp,instagram_url,youtube_url,telegram_url,show_whatsapp_social")
        .eq("id", true)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as FooterSettings | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const socials: { label: string; href: string; icon: typeof Instagram }[] = [];
  if (data?.instagram_url) socials.push({ label: "Instagram", href: data.instagram_url, icon: Instagram });
  if (data?.youtube_url) socials.push({ label: "YouTube", href: data.youtube_url, icon: Youtube });
  if (data?.telegram_url) socials.push({ label: "Telegram", href: data.telegram_url, icon: Send });
  if (data?.show_whatsapp_social !== false && data?.support_whatsapp) {
    socials.push({ label: "WhatsApp", href: waLink(data.support_whatsapp), icon: MessageCircle });
  }

  async function subscribe(e: FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Enter a valid email");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert({ email: parsed.data.toLowerCase() });
    setBusy(false);
    if (error) {
      if (error.code === "23505") {
        setDone(true);
        toast.success("You're already subscribed!");
        return;
      }
      toast.error("Could not subscribe right now. Please try again.");
      return;
    }
    setDone(true);
    setEmail("");
    toast.success("Subscribed! Watch your inbox for tips.");
  }

  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
          <div>
            <div className="flex items-center gap-2">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-extrabold text-primary-foreground shadow-card"
                style={{ background: "var(--gradient-primary)" }}
                aria-hidden
              >
                Q
              </div>
              <span className="text-xl font-extrabold tracking-tight">Quero</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Your trusted companion for NEET UG &amp; beyond.
            </p>
            {socials.length > 0 && (
              <div className="mt-4 flex items-center gap-2">
                {socials.map(({ label, href, icon: Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-foreground/60">Platform</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="transition-colors hover:text-primary">Features</a></li>
              <li><a href="#pricing" className="transition-colors hover:text-primary">Pricing</a></li>
            </ul>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-foreground/60">Company</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="transition-colors hover:text-primary">About Us</Link></li>
              <li><Link to="/contact" className="transition-colors hover:text-primary">Contact Us</Link></li>
              <li><Link to="/privacy-policy" className="transition-colors hover:text-primary">Privacy Policy</Link></li>
              <li><Link to="/terms" className="transition-colors hover:text-primary">Terms &amp; Conditions</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-foreground/60">Stay Updated</div>
            <p className="mt-3 text-sm text-muted-foreground">Subscribe for tips &amp; latest updates.</p>
            {done ? (
              <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-primary">
                You&apos;re on the list 💜
              </div>
            ) : (
              <form onSubmit={subscribe} className="mt-3 flex items-center gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  maxLength={255}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  aria-label="Email address"
                  className="min-w-0 flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={busy}
                  aria-label="Subscribe"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-60"
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {year} Quero. All rights reserved. 💜
        </div>
      </div>
    </footer>
  );
}
