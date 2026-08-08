import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LandingHeader } from "@/components/landing/landing-header";
import { ShieldCheck, Users, BarChart3, BookOpen, Loader2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/for-institutes")({
  head: () => ({
    meta: [
      { title: "Quero for Institutes — Faculty-Powered Question Banks" },
      {
        name: "description",
        content:
          "Bring Quero to your medical or NEET coaching institute: faculty-verified question banks, a secure exam engine and student performance analytics. Register your interest.",
      },
      { property: "og:title", content: "Quero for Institutes" },
      {
        property: "og:description",
        content:
          "Faculty-verified question banks, a secure exam engine and student analytics for institutes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForInstitutesPage,
});

const pitch = [
  {
    icon: BookOpen,
    title: "Faculty-verified question banks",
    body: "Your own faculty author and review MCQs inside Quero, so students practise on content your institute stands behind.",
  },
  {
    icon: ShieldCheck,
    title: "Secure exam engine",
    body: "Timed tests with per-attempt question and option shuffling, and answer keys that never reach the browser.",
  },
  {
    icon: BarChart3,
    title: "Student performance analytics",
    body: "Track attempts, accuracy and weak topics at student, batch and subject level.",
  },
  {
    icon: Users,
    title: "Roles built for institutes",
    body: "Institute admin, faculty and subject coordinator roles are already in the data model, with panels rolling out next.",
  },
];

const schema = z.object({
  institute_name: z.string().trim().min(2, "Enter your institute name").max(150),
  contact_name: z.string().trim().min(2, "Enter a contact name").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

function ForInstitutesPage() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    institute_name: "",
    contact_name: "",
    email: "",
    phone: "",
    message: "",
  });

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("institute_interest_leads").insert({
      institute_name: parsed.data.institute_name,
      contact_name: parsed.data.contact_name,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone || null,
      message: parsed.data.message || null,
    });
    setBusy(false);
    if (error) {
      toast.error("Could not send your request right now. Please try again.");
      return;
    }
    setDone(true);
    toast.success("Thanks! We'll get in touch soon.");
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main className="px-5 py-12 md:py-16">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              Early access for institutes
            </span>
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight md:text-4xl">
              Quero for Institutes
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
              We&apos;re building an institute edition of Quero: your faculty&apos;s question banks,
              our exam engine and analytics, under your institute&apos;s roof. The institute admin
              and faculty panels are still in development — this page is an honest invitation to
              shape them with us, not a live product sign-up.
            </p>
          </motion.div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {pitch.map(({ icon: Icon, title, body }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: i * 0.07 }}
                className="rounded-2xl border border-border bg-card p-6 shadow-card"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon size={20} />
                </div>
                <div className="mt-3 font-semibold">{title}</div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </motion.div>
            ))}
          </div>

          <section className="mt-12 rounded-3xl border border-border bg-card p-6 shadow-card md:p-10">
            <h2 className="text-xl font-extrabold tracking-tight md:text-2xl">
              Register your interest
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Tell us about your institute and we&apos;ll reach out as onboarding opens.
            </p>

            {done ? (
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-5">
                <CheckCircle2 className="mt-0.5 shrink-0 text-primary" size={20} />
                <div>
                  <div className="font-semibold">Request received</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Thanks for your interest — our team will contact you at {form.email}.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-6 grid gap-4 md:grid-cols-2">
                <Field label="Institute name" required>
                  <input
                    className={inputCls}
                    required
                    maxLength={150}
                    value={form.institute_name}
                    onChange={(e) => set("institute_name", e.target.value)}
                  />
                </Field>
                <Field label="Contact name" required>
                  <input
                    className={inputCls}
                    required
                    maxLength={120}
                    value={form.contact_name}
                    onChange={(e) => set("contact_name", e.target.value)}
                  />
                </Field>
                <Field label="Email" required>
                  <input
                    className={inputCls}
                    type="email"
                    required
                    maxLength={255}
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                  />
                </Field>
                <Field label="Phone">
                  <input
                    className={inputCls}
                    type="tel"
                    maxLength={20}
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Message">
                    <textarea
                      className={`${inputCls} min-h-28 resize-y`}
                      maxLength={1000}
                      placeholder="Batch sizes, subjects, what you'd want from an institute edition…"
                      value={form.message}
                      onChange={(e) => set("message", e.target.value)}
                    />
                  </Field>
                </div>
                <div className="md:col-span-2 flex flex-wrap items-center gap-x-5 gap-y-3">
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                  >
                    {busy && <Loader2 size={16} className="animate-spin" />}
                    Register interest
                  </button>
                  <span className="text-sm text-muted-foreground">
                    Already registered?{" "}
                    <Link to="/auth" className="font-medium text-primary underline underline-offset-4">
                      Institute Login
                    </Link>
                  </span>
                </div>
              </form>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="text-primary"> *</span>}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
