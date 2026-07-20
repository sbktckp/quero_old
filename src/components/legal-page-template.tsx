import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft, ChevronDown, Mail, ArrowRight, Sparkles,
  User, Database, ShieldCheck, Lock, Globe, FileText,
  IndianRupee, ShoppingCart, Clock, CreditCard, UserX, Info,
  Grid3x3, UserCheck, Copyright, Shield, Pencil, HelpCircle,
  Heart, Handshake, Check, RefreshCw,
} from "lucide-react";

const ICONS: Record<string, typeof User> = {
  user: User, database: Database, "shield-check": ShieldCheck, lock: Lock,
  globe: Globe, "file-text": FileText, "indian-rupee": IndianRupee,
  "shopping-cart": ShoppingCart, clock: Clock, "credit-card": CreditCard,
  "user-x": UserX, info: Info, grid: Grid3x3, "user-check": UserCheck,
  copyright: Copyright, shield: Shield, pencil: Pencil,
};

export type LegalSection = { icon?: string; title: string; body: string };
export type LegalPageData = {
  title: string;
  subtitle?: string;
  intro?: string;
  illustration?: string;
  heroSlot?: ReactNode;
  items: LegalSection[];
  trust?: { heading: string; body: string };
  contact?: { heading: string; body: string };
  updatedAt?: string;
  supportEmail?: string;
};

function renderBody(body: string) {
  const lines = body.split("\n");
  const bulletStart = lines.findIndex((l) => l.trim().startsWith("•"));
  if (bulletStart === -1) return <p className="whitespace-pre-line">{body}</p>;
  const intro = lines.slice(0, bulletStart).join("\n").trim();
  const bullets = lines.slice(bulletStart).filter((l) => l.trim().startsWith("•")).map((l) => l.trim().replace(/^•\s*/, ""));
  return (
    <div className="space-y-2">
      {intro && <p>{intro}</p>}
      <ul className="list-disc pl-5 space-y-1">
        {bullets.map((b, i) => <li key={i}>{b}</li>)}
      </ul>
    </div>
  );
}

function HeroArt({ kind }: { kind?: string }) {
  return (
    <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
      <div className="absolute inset-0 rounded-[2rem] bg-primary/10" />
      <div className="absolute -top-2 -right-2 h-3 w-3 rounded-full bg-primary/40" />
      <div className="absolute bottom-4 -left-2 h-2 w-2 rounded-full bg-primary/60" />
      <div className="absolute top-6 -left-3 h-2 w-2 rounded-full bg-primary/30" />
      <div className="relative h-24 w-24 rounded-3xl gradient-primary shadow-elevated flex items-center justify-center text-primary-foreground">
        {kind === "clipboard-rupee" ? <IndianRupee size={40} strokeWidth={2.5} />
          : kind === "clipboard-check" ? <FileText size={40} strokeWidth={2.5} />
          : <ShieldCheck size={40} strokeWidth={2.5} />}
      </div>
      <div className="absolute -bottom-1 right-2 text-primary/70">
        <Sparkles size={16} />
      </div>
    </div>
  );
}

function SectionCard({ item, index }: { item: LegalSection; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const Icon = (item.icon && ICONS[item.icon]) || FileText;
  return (
    <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <span className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Icon size={18} />
        </span>
        <span className="flex-1 font-semibold text-sm text-foreground">{item.title}</span>
        <ChevronDown size={18} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 text-sm leading-relaxed text-foreground/80 border-t border-border/60">
          <div className="pt-3">{renderBody(item.body)}</div>
        </div>
      )}
    </div>
  );
}

export function LegalPageTemplate(props: LegalPageData) {
  const { title, subtitle, intro, illustration, items, trust, contact, updatedAt, supportEmail } = props;
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
              {updatedAt && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold px-2.5 py-1">
                  <Clock size={12} /> Last Updated: {new Date(updatedAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
                </span>
              )}
              <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold text-foreground leading-tight">{title}</h2>
              {subtitle && <p className="mt-1 text-primary font-semibold">{subtitle}</p>}
              {intro && <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{intro}</p>}
            </div>
            <HeroArt kind={illustration} />
          </div>
        </section>

        {/* Accordion sections */}
        <section className="space-y-3">
          {items.map((it, i) => <SectionCard key={i} item={it} index={i} />)}
        </section>

        {/* Trust callout */}
        {trust && (
          <section className="rounded-3xl bg-primary/10 border border-primary/20 p-5 flex items-start gap-4">
            <span className="h-11 w-11 shrink-0 rounded-2xl gradient-primary text-primary-foreground flex items-center justify-center shadow-elevated">
              <Handshake size={20} />
            </span>
            <div>
              <h3 className="font-bold text-foreground">{trust.heading}</h3>
              <p className="mt-1 text-sm text-foreground/80 leading-relaxed">{trust.body}</p>
            </div>
          </section>
        )}

        {/* Contact callout */}
        {contact && (
          <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-start gap-4">
              <span className="h-11 w-11 shrink-0 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <HelpCircle size={20} />
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground">{contact.heading}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {contact.body}
                  {supportEmail && (
                    <> Reach us at <a href={`mailto:${supportEmail}`} className="text-primary font-medium underline underline-offset-2">{supportEmail}</a>.</>
                  )}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-1.5 rounded-full gradient-primary text-primary-foreground text-sm font-semibold px-4 py-2 shadow-card"
                  >
                    Contact Us <ArrowRight size={14} />
                  </Link>
                  {supportEmail && (
                    <a
                      href={`mailto:${supportEmail}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border text-foreground text-sm font-semibold px-4 py-2 hover:bg-muted"
                    >
                      <Mail size={14} /> Email
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        <p className="text-center text-[11px] text-muted-foreground pt-2">
          <Heart size={11} className="inline -mt-0.5 text-primary" /> Thanks for trusting Quero.
        </p>
      </main>
    </div>
  );
}
