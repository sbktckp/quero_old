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

function Plant({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`} aria-hidden>
      <svg viewBox="0 0 60 80" className="w-full h-full drop-shadow-[0_4px_6px_rgba(16,64,32,0.2)]">
        <defs>
          <linearGradient id="leafGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
          <linearGradient id="leafGrad2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
          <linearGradient id="potGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5f5f4" />
            <stop offset="100%" stopColor="#d6d3d1" />
          </linearGradient>
        </defs>
        {/* leaves */}
        <path d="M30 60 Q 12 45 14 22 Q 24 30 30 60 Z" fill="url(#leafGrad)" />
        <path d="M30 60 Q 48 45 46 22 Q 36 30 30 60 Z" fill="url(#leafGrad2)" />
        <path d="M30 62 Q 30 30 30 12 Q 34 22 34 58 Z" fill="url(#leafGrad)" />
        <path d="M22 30 Q 26 26 30 30" fill="none" stroke="#166534" strokeOpacity="0.5" strokeWidth="0.8" strokeLinecap="round" />
        {/* pot */}
        <path d="M18 58 L42 58 L38 76 L22 76 Z" fill="url(#potGrad)" />
        <rect x="16" y="56" width="28" height="4" rx="1.5" fill="#e7e5e4" />
        <path d="M18 58 L42 58 L38 76 L22 76 Z" fill="none" stroke="#a8a29e" strokeOpacity="0.4" strokeWidth="0.5" />
      </svg>
    </div>
  );
}

function CornerAccents() {
  return (
    <>
      <div className="absolute -top-2 -right-2 h-3 w-3 rounded-full bg-primary/40" />
      <div className="absolute bottom-6 -left-2 h-2 w-2 rounded-full bg-primary/60" />
      <div className="absolute top-8 -left-3 h-2 w-2 rounded-full bg-primary/30" />
      <div className="absolute top-3 right-8 text-primary/70">
        <Sparkles size={14} />
      </div>
      <div className="absolute bottom-2 right-1 text-primary/50">
        <Sparkles size={10} />
      </div>
      <div className="absolute top-1/2 -right-1 h-1.5 w-1.5 rounded-full bg-primary/40" />
      {/* subtle dot grid */}
      <div className="absolute top-4 right-2 grid grid-cols-3 gap-1 opacity-40">
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className="h-1 w-1 rounded-full bg-primary/40" />
        ))}
      </div>
    </>
  );
}

function ShieldArt() {
  return (
    <div className="relative w-48 h-48 shrink-0">
      <CornerAccents />
      {/* Shield */}
      <div className="absolute left-3 top-3 w-32 h-36">
        <svg viewBox="0 0 100 116" className="w-full h-full drop-shadow-[0_14px_24px_rgba(108,79,240,0.45)]">
          <defs>
            <linearGradient id="shieldGrad" x1="0" y1="0" x2="0.6" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1" />
              <stop offset="55%" stopColor="hsl(var(--primary))" stopOpacity="0.92" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="shieldHi" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
              <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="shieldShadow" cx="0.5" cy="0.6" r="0.6">
              <stop offset="60%" stopColor="#000000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.35" />
            </radialGradient>
            <linearGradient id="lockBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e5e7eb" />
            </linearGradient>
          </defs>
          {/* base shield */}
          <path d="M50 2 L95 18 V56 C95 84 76 104 50 114 C24 104 5 84 5 56 V18 Z" fill="url(#shieldGrad)" />
          {/* inner shadow */}
          <path d="M50 2 L95 18 V56 C95 84 76 104 50 114 C24 104 5 84 5 56 V18 Z" fill="url(#shieldShadow)" />
          {/* highlight */}
          <path d="M50 2 L95 18 V56 C95 84 76 104 50 114 C24 104 5 84 5 56 V18 Z" fill="url(#shieldHi)" />
          {/* inner rim */}
          <path d="M50 8 L89 21 V56 C89 80 72 98 50 108 C28 98 11 80 11 56 V21 Z" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.2" />
          {/* Padlock */}
          <g transform="translate(50 62)">
            <path d="M-9 -6 A9 9 0 0 1 9 -6 V2 H-9 Z" fill="none" stroke="url(#lockBody)" strokeWidth="4" strokeLinecap="round" />
            <rect x="-13" y="0" width="26" height="22" rx="4" fill="url(#lockBody)" />
            <rect x="-13" y="0" width="26" height="22" rx="4" fill="none" stroke="#c7d2fe" strokeOpacity="0.5" strokeWidth="0.6" />
            <circle cx="0" cy="9" r="2.6" fill="hsl(var(--primary))" />
            <rect x="-1" y="9" width="2" height="6" rx="1" fill="hsl(var(--primary))" />
          </g>
        </svg>
      </div>
      {/* Plant */}
      <Plant className="absolute right-0 bottom-0 w-14 h-20" />
    </div>
  );
}

function ClipboardBase({ heading, showSignature = false }: { heading: string; showSignature?: boolean }) {
  return (
    <div className="relative w-32 h-40">
      {/* board back (depth) */}
      <div className="absolute inset-0 rounded-2xl bg-primary/80 translate-y-1 translate-x-0.5" />
      {/* board */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-[0_10px_24px_rgba(108,79,240,0.35)]" />
      {/* page */}
      <div className="absolute inset-[6px] rounded-xl bg-gradient-to-b from-white to-slate-50 shadow-inner">
        <div className="px-3 pt-4 pb-3 flex flex-col gap-1.5">
          <div className="text-[10px] font-extrabold text-primary tracking-wider text-center">
            {heading}
          </div>
          <div className="mt-1 space-y-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded-full gradient-primary text-primary-foreground flex items-center justify-center shadow-sm">
                  <Check size={8} strokeWidth={4} />
                </span>
                <span
                  className="flex-1 h-1.5 rounded-full bg-slate-200"
                  style={{ width: `${80 - i * 10}%` }}
                />
              </div>
            ))}
          </div>
          {showSignature && (
            <svg viewBox="0 0 60 12" className="mt-1 w-16 h-3 text-primary/80">
              <path d="M2 8 Q 8 2, 14 8 T 26 8 T 38 8 T 50 6 L 58 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </div>
      </div>
      {/* clip */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-12 h-5 rounded-md bg-gradient-to-b from-primary to-primary/80 shadow-sm" />
      <div className="absolute left-1/2 -translate-x-1/2 -top-2.5 w-6 h-2.5 rounded-t-md bg-primary" />
      <div className="absolute left-1/2 -translate-x-1/2 -top-3 w-3 h-2 rounded-full bg-primary/70 ring-2 ring-primary/40" />
    </div>
  );
}

function ClipboardRupeeArt() {
  return (
    <div className="relative w-48 h-48 shrink-0">
      <CornerAccents />
      <div className="absolute left-4 top-4">
        <ClipboardBase heading="REFUND POLICY" />
        {/* Badges */}
        <div className="absolute -bottom-4 -left-3 h-10 w-10 rounded-full gradient-primary text-primary-foreground flex items-center justify-center shadow-[0_6px_14px_rgba(108,79,240,0.5)] border-[3px] border-background">
          <IndianRupee size={16} strokeWidth={3} />
        </div>
        <div className="absolute -bottom-4 right-1 h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center shadow-[0_6px_14px_rgba(16,185,129,0.5)] border-[3px] border-background">
          <RefreshCw size={16} strokeWidth={3} />
        </div>
      </div>
      <Plant className="absolute right-0 bottom-0 w-14 h-20" />
    </div>
  );
}

function ClipboardCheckArt() {
  return (
    <div className="relative w-48 h-48 shrink-0">
      <CornerAccents />
      <div className="absolute left-4 top-4">
        <ClipboardBase heading="T&C" showSignature />
        <div className="absolute -bottom-4 -left-3 h-10 w-10 rounded-full gradient-primary text-primary-foreground flex items-center justify-center shadow-[0_6px_14px_rgba(108,79,240,0.5)] border-[3px] border-background">
          <ShieldCheck size={18} strokeWidth={2.5} />
        </div>
      </div>
      <Plant className="absolute right-0 bottom-0 w-14 h-20" />
    </div>
  );
}

function HeroArt({ kind }: { kind?: string }) {
  if (kind === "clipboard-rupee") return <ClipboardRupeeArt />;
  if (kind === "clipboard-check") return <ClipboardCheckArt />;
  return <ShieldArt />;
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
  const { title, subtitle, intro, illustration, heroSlot, items, trust, contact, updatedAt, supportEmail } = props;
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
            {heroSlot ?? <HeroArt kind={illustration} />}
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
