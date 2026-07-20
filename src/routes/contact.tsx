import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Mail,
  Phone,
  MessageCircle,
  Clock,
  Calendar,
  Shield,
  Heart,
  Lock,
  GraduationCap,
  Building2,
  CreditCard,
  UserCircle,
  Wrench,
  HelpCircle,
  Target,
  BarChart3,
  Trophy,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import supportImg from "@/assets/contact-support.png";

type ContactSettings = {
  support_email: string;
  support_phone: string | null;
  support_whatsapp: string | null;
  support_hours_days: string;
  support_hours_time: string;
  instagram_url?: string | null;
  youtube_url?: string | null;
  telegram_url?: string | null;
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
      { name: "description", content: "Get in touch with the Quero support team for help with NEET UG counselling, your account, payments, or anything else." },
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

const HELP_TOPICS = [
  { key: "NEET UG Counselling", icon: GraduationCap },
  { key: "College Predictor", icon: Building2 },
  { key: "Payment Issues", icon: CreditCard },
  { key: "Account & Login", icon: UserCircle },
  { key: "Technical Support", icon: Wrench },
  { key: "General Enquiry", icon: HelpCircle },
] as const;

const FAQS: { q: string; a: string }[] = [
  { q: "How does Quero's college predictor work?", a: "It uses historical cutoffs across rounds and categories to estimate the colleges you're likely to secure based on your AIR, category, and preferences. Predictions are guidance, not guarantees." },
  { q: "Is Quero affiliated with MCC or NMC?", a: "No. Quero is an independent study and counselling-guidance platform. We're not affiliated with MCC, NMC, NTA, or any state counselling authority." },
  { q: "How quickly will I get a reply?", a: "We usually respond within a few hours during our support hours. Complex queries may take up to one working day." },
  { q: "Can I get a refund on my subscription?", a: "Refunds follow our published Refund Policy. Please check that page for eligibility and timelines before writing to us." },
];

function ContactPage() {
  const { settings } = Route.useLoaderData();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const selectTopic = (topic: string) => {
    setForm((f) => ({ ...f, subject: topic }));
    const el = document.getElementById("message-form");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const to = settings.support_email;
    const subject = encodeURIComponent(form.subject || "Support request");
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\n\n${form.message}`,
    );
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-6xl flex items-center gap-3 px-5 py-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft size={18} /></Link>
          <h1 className="font-bold text-sm">Contact</h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 md:py-12 space-y-14">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary-soft via-background to-background p-6 md:p-10">
          {/* Decorative dot grid */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(var(--primary) 0.7px, transparent 0.7px)",
              backgroundSize: "22px 22px",
              maskImage:
                "radial-gradient(ellipse at top right, black 30%, transparent 70%)",
            }}
          />
          {/* Soft blob */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl opacity-40"
            style={{ background: "var(--gradient-primary)" }}
          />

          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-medium text-primary">
                We're Here to Help 💜
              </span>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]">
                Let's Connect.
                <br />
                <span className="text-primary">We're Here for You!</span>
              </h2>
              <p className="text-base text-muted-foreground max-w-md leading-relaxed">
                Whether you have questions about counselling, your account, payments, or our services, the Quero team is happy to help.
              </p>

              <div className="flex items-start gap-3 rounded-2xl bg-card/70 border border-border p-4 max-w-md shadow-card">
                <div className="shrink-0 rounded-xl bg-primary/10 p-2 text-primary">
                  <Shield size={18} />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  At Quero, we know NEET counselling can feel overwhelming. Our goal is to provide timely support so you can make informed decisions with confidence.
                </p>
              </div>
            </div>

            {/* Illustration */}
            <div className="relative">
              <div className="relative mx-auto max-w-sm">
                <img
                  src={supportImg}
                  alt="Friendly Quero support agent waving hello"
                  width={1024}
                  height={1024}
                  loading="lazy"
                  className="w-full h-auto"
                />
                {/* Chat bubbles */}
                <div className="absolute -top-2 left-0 md:-left-6 rounded-2xl rounded-bl-sm bg-card border border-border shadow-card px-3 py-2 text-xs font-medium max-w-[180px]">
                  How can we help you today? 💜
                </div>
                <div className="absolute bottom-4 right-0 md:-right-4 rounded-2xl rounded-br-sm gradient-primary text-primary-foreground shadow-elevated px-3 py-2 text-xs font-medium max-w-[190px]">
                  We usually reply within a few hours 🕐
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT INFO + FORM */}
        <section className="grid md:grid-cols-2 gap-5">
          {/* Info card */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-4">
            <div>
              <h3 className="text-xl font-bold">Contact Us</h3>
              <p className="text-sm text-muted-foreground mt-1">Reach us through any of these channels.</p>
            </div>
            <div className="space-y-3">
              {settings.support_email && (
                <a
                  href={`mailto:${settings.support_email}`}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-background hover:bg-primary-soft/40 transition-colors p-4"
                >
                  <div className="rounded-xl bg-primary/10 text-primary p-3">
                    <Mail size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">Email Us</div>
                    <div className="text-xs text-muted-foreground">We'll get back to you via email</div>
                    <div className="text-sm text-primary font-medium truncate">{settings.support_email}</div>
                  </div>
                </a>
              )}

              {settings.support_whatsapp && settings.support_whatsapp.trim() && (
                <a
                  href={waLink(settings.support_whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 rounded-2xl border border-border bg-background hover:bg-primary-soft/40 transition-colors p-4"
                >
                  <div className="rounded-xl bg-primary/10 text-primary p-3">
                    <MessageCircle size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">WhatsApp Us</div>
                    <div className="text-xs text-muted-foreground">Chat with us on WhatsApp</div>
                    <div className="text-sm text-primary font-medium truncate">{settings.support_whatsapp}</div>
                  </div>
                </a>
              )}

              {settings.support_phone && settings.support_phone.trim() && (
                <a
                  href={`tel:${settings.support_phone.replace(/[^\d+]/g, "")}`}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-background hover:bg-primary-soft/40 transition-colors p-4"
                >
                  <div className="rounded-xl bg-primary/10 text-primary p-3">
                    <Phone size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">Call Us</div>
                    <div className="text-xs text-muted-foreground">
                      {settings.support_hours_days} · {settings.support_hours_time}
                    </div>
                    <div className="text-sm text-primary font-medium truncate">{settings.support_phone}</div>
                  </div>
                </a>
              )}
            </div>
          </div>

          {/* Message form */}
          <div id="message-form" className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <h3 className="text-xl font-bold">Send us a Message</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">We'll respond within a few hours during support hours.</p>
            <form onSubmit={submitForm} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
                </div>
              </div>
              <div>
                <Label htmlFor="phone">Mobile Number</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
              </div>
              <div>
                <Label htmlFor="subject">Subject</Label>
                <select
                  id="subject"
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="input"
                >
                  <option value="">Select a topic</option>
                  {HELP_TOPICS.map((t) => (
                    <option key={t.key} value={t.key}>{t.key}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" required rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="How can we help?" />
              </div>
              <Button type="submit" className="w-full gap-2">
                <Mail size={16} /> Send Message
              </Button>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground justify-center">
                <Lock size={12} /> Your information is safe with us.
              </div>
            </form>
          </div>
        </section>

        {/* HELP TOPICS + FAQ CALLOUT */}
        <section className="grid md:grid-cols-[1.4fr_1fr] gap-5">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <h3 className="text-xl font-bold">How Can We Help You?</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-5">Select a topic that best matches your query.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {HELP_TOPICS.map(({ key, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectTopic(key)}
                  className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-background hover:border-primary/40 hover:bg-primary-soft/40 transition-all p-4 text-left"
                >
                  <div className="rounded-xl bg-primary/10 text-primary p-2.5 group-hover:scale-110 transition-transform">
                    <Icon size={20} />
                  </div>
                  <div className="text-sm font-semibold leading-snug">{key}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-primary/20 bg-primary-soft/50 p-6 shadow-card flex flex-col justify-between">
            <div>
              <div className="rounded-xl bg-primary/15 text-primary p-2.5 w-fit mb-3">
                <HelpCircle size={22} />
              </div>
              <h3 className="text-xl font-bold">Looking for a quick answer?</h3>
              <p className="text-sm text-muted-foreground mt-2">Check our FAQs for answers to commonly asked questions.</p>
            </div>
            <Button onClick={() => scrollTo("faq")} className="mt-5 w-full sm:w-auto">Visit FAQs</Button>
          </div>
        </section>

        {/* SUPPORT HOURS STRIP */}
        <section className="rounded-3xl bg-primary-soft/60 border border-primary/10 p-5 md:p-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/70 text-primary p-3 shadow-sm">
                <Clock size={20} />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-primary">Support Hours</div>
                <div className="text-sm font-medium">{settings.support_hours_days}</div>
                <div className="text-sm text-muted-foreground">{settings.support_hours_time}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/70 text-primary p-3 shadow-sm">
                <Calendar size={20} />
              </div>
              <div className="text-sm text-foreground/80 leading-relaxed">
                We are closed on Sundays. But you can still drop us a message!
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h3 className="text-xl font-bold">Frequently Asked Questions</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-5">Quick answers to the questions we hear most.</p>
          <div className="space-y-2">
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q} className="rounded-2xl border border-border bg-background overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full flex items-center justify-between gap-3 p-4 text-left"
                    aria-expanded={open}
                  >
                    <span className="text-sm font-semibold">{f.q}</span>
                    <ChevronDown size={18} className={`shrink-0 transition-transform text-muted-foreground ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && (
                    <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{f.a}</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* TRUST BANNER */}
        <section className="rounded-3xl overflow-hidden">
          <div
            className="relative p-8 md:p-10 text-center text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage: "radial-gradient(white 0.7px, transparent 0.7px)",
                backgroundSize: "22px 22px",
              }}
            />
            <div className="relative flex flex-col items-center gap-4">
              <div className="rounded-2xl bg-white/15 backdrop-blur p-3">
                <div className="flex items-center gap-1">
                  <Shield size={22} />
                  <Heart size={18} />
                </div>
              </div>
              <h3 className="text-2xl md:text-3xl font-extrabold">Thank you for trusting Quero.</h3>
              <p className="max-w-xl text-sm md:text-base text-primary-foreground/90 leading-relaxed">
                We're committed to making your NEET UG counselling journey simpler, clearer, and less stressful. 💜
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-3 md:gap-6">
                {[
                  { label: "Practice", icon: Target },
                  { label: "Analyse", icon: BarChart3 },
                  { label: "Excel", icon: Trophy },
                ].map(({ label, icon: Icon }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-4 py-2 text-sm font-semibold tracking-wide"
                  >
                    <Icon size={16} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
