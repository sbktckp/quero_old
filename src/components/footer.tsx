import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Instagram, Youtube, Send, MessageCircle } from "lucide-react";

const links = [
  { to: "/privacy-policy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms & Conditions" },
  { to: "/refund-policy", label: "Refund Policy" },
  { to: "/contact", label: "Contact" },
  { to: "/delete-account", label: "Delete Account" },
] as const;

type FooterSettings = {
  support_whatsapp: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  telegram_url: string | null;
  show_whatsapp_social: boolean;
};

function waLink(n: string) {
  const digits = n.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}`;
}

export function Footer() {
  const year = new Date().getFullYear();
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

  return (
    <footer className="mt-12 bg-[oklch(0.18_0.04_285)] text-white/80">
      <div className="mx-auto max-w-6xl px-5 py-10 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-10">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2">
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-elevated"
                style={{ background: "var(--gradient-primary)" }}
                aria-hidden
              >
                Q
              </div>
              <span className="text-lg font-extrabold text-white">Quero</span>
            </div>
            <p className="mt-3 text-sm text-white/60 max-w-xs leading-relaxed">
              Your trusted companion for NEET UG Counselling.
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
                    className="h-9 w-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-primary/80 hover:text-white transition-colors"
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Links */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-white/50">Company</div>
            <ul className="mt-3 space-y-2 text-sm">
              {links.slice(0, 4).map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-white/70 hover:text-white transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-white/50">Account</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to="/delete-account" className="text-white/70 hover:text-white transition-colors">Delete Account</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white/50">
          <div>© {year} Quero. All rights reserved.</div>
          <div>Not affiliated with MCC, NMC, NTA, or any state counselling authority.</div>
        </div>
      </div>
    </footer>
  );
}
