import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { LandingHeader } from "@/components/landing/landing-header";
import heroStudent from "@/assets/hero-student-illustration.png";
import {
  GraduationCap,
  Clock,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  Play,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quero — Practice Smart, Score Higher for NEET" },
      {
        name: "description",
        content:
          "Exam-oriented MCQs, mock tests and performance insights for NEET UG & PG aspirants — all in one place.",
      },
      { property: "og:title", content: "Quero — Practice Smart, Score Higher for NEET" },
      {
        property: "og:description",
        content: "Exam-oriented MCQs, mock tests and performance insights for NEET aspirants.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !session) return;
    let cancelled = false;
    (async () => {
      const { data: instituteRoles } = await supabase
        .from("user_roles")
        .select("role, institute_id")
        .eq("user_id", session.user.id)
        .not("institute_id", "is", null)
        .in("role", ["institute_admin", "faculty", "subject_coordinator"])
        .limit(1);
      if (cancelled) return;
      if (instituteRoles && instituteRoles.length > 0) {
        navigate({ to: "/institute-workspace" });
        return;
      }
      const { data } = await supabase
        .from("user_preferences")
        .select("onboarding_completed")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      navigate({ to: data?.onboarding_completed ? "/home" : "/onboarding" });
    })();
    return () => {
      cancelled = true;
    };
  }, [session, loading, navigate]);

  if (loading || session) {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-soft">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl gradient-primary shadow-elevated">
          <span className="text-4xl font-extrabold text-primary-foreground">Q</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        <Hero />
        <Features />
        <CtaBanner />
      </main>
    </div>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const, delay: i * 0.1 },
  }),
};

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* breathing purple glow */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-[-10%] h-[38rem] w-[38rem] rounded-full bg-primary/15 blur-3xl"
        animate={{ opacity: [0.5, 0.85, 0.5], scale: [1, 1.06, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 left-[-15%] h-[30rem] w-[30rem] rounded-full bg-accent/40 blur-3xl"
        animate={{ opacity: [0.4, 0.7, 0.4], scale: [1.04, 1, 1.04] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-8 pt-10 md:grid-cols-2 md:pb-16 md:pt-16">
        <div>
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              India&apos;s Next-Gen Medical Learning Platform 💜
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={1}
            className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight md:text-6xl"
          >
            Practice Smart,
            <br />
            Score <span className="text-primary">Higher.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={2}
            className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg"
          >
            Exam Oriented MCQs, Mock Tests &amp; Performance Insights — All in one place.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={3}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/auth"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-card transition-shadow hover:shadow-elevated"
              >
                Start Free Now
                <ArrowRight
                  size={16}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>
            </motion.div>
            <motion.a
              href="#features"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-3 text-sm font-semibold"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 text-primary transition-colors hover:bg-primary/5">
                <Play size={14} className="fill-current" />
              </span>
              See How It Works
            </motion.a>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={4}
            className="mt-8 text-sm text-muted-foreground"
          >
            <div className="font-semibold text-foreground">Built for Medical Students 💜</div>
            <div>Made for NEET UG &amp; NEET PG aspirants.</div>
          </motion.div>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}

/** Reveal-then-float: card slides in, then drifts gently forever. */
function StatCard({
  className,
  delay,
  duration,
  distance,
  children,
}: {
  className: string;
  delay: number;
  duration: number;
  distance: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, delay, ease: "easeOut" }}
    >
      <motion.div
        animate={{ y: [0, -distance, 0] }}
        transition={{ duration, repeat: Infinity, ease: "easeInOut", delay: delay + 0.6 }}
        className="rounded-2xl border border-border bg-card p-3.5 shadow-elevated"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function HeroVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="relative mx-auto w-full max-w-md md:max-w-none"
    >
      <div className="absolute inset-x-6 bottom-6 top-10 rounded-[3rem] bg-primary/5" aria-hidden />

      <motion.img
        src={heroStudent}
        alt="Illustration of a medical student in a purple hoodie holding a notebook and phone"
        width={912}
        height={1200}
        className="relative z-10 mx-auto w-full max-w-[19rem] select-none object-contain md:max-w-[26rem]"
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Illustrative product-preview cards (static demo content) */}
      <StatCard
        className="absolute -top-2 -right-2 z-20 w-44 md:w-52 md:-right-4"
        delay={0.35}
        duration={6}
        distance={9}
      >
        <div className="text-xs font-semibold">Mock Test • 01</div>
        <div className="mt-2 flex items-center gap-3">
          <ScoreRing percent={85} />
          <div>
            <div className="text-[10px] text-muted-foreground">Score</div>
            <div className="text-base font-extrabold">658/800</div>
          </div>
        </div>
        <div className="mt-2 flex h-6 items-end gap-1">
          {[30, 45, 40, 60, 75, 95].map((h, i) => (
            <div key={i} className="flex-1 rounded-sm bg-primary/70" style={{ height: `${h}%` }} />
          ))}
        </div>
      </StatCard>

      <StatCard
        className="absolute -right-2 top-1/2 z-20 w-40 -translate-y-1/2 md:w-52 md:-right-8"
        delay={0.55}
        duration={8}
        distance={11}
      >
        <div className="text-xs font-semibold">Weak Topics</div>
        <div className="mt-2 space-y-2">
          {[
            ["Pharmacology", 62],
            ["Microbiology", 45],
            ["Pathology", 38],
          ].map(([label, v]) => (
            <div key={label as string}>
              <div className="text-[10px] text-muted-foreground">{label}</div>
              <div className="mt-1 h-1.5 rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${v}%` }} />
              </div>
            </div>
          ))}
        </div>
      </StatCard>

      <StatCard
        className="absolute bottom-2 -right-2 z-20 w-44 md:w-52 md:-right-2"
        delay={0.75}
        duration={7.5}
        distance={8}
      >
        <div className="text-xs font-semibold">Questions Practiced</div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xl font-extrabold">12,540</span>
          <TrendingUp size={14} className="text-primary" />
        </div>
        <svg viewBox="0 0 120 30" className="mt-1 h-8 w-full" aria-hidden>
          <polyline
            points="0,26 20,22 40,24 60,16 80,14 100,8 118,2"
            fill="none"
            stroke="currentColor"
            className="text-primary"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </StatCard>

      <p className="relative z-10 mt-4 text-center text-[11px] text-muted-foreground">
        Product preview — illustrative data.
      </p>
    </motion.div>
  );
}

function ScoreRing({ percent }: { percent: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90" aria-hidden>
      <circle cx="22" cy="22" r={r} fill="none" strokeWidth="5" className="stroke-muted" />
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        className="stroke-primary"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - percent / 100)}
      />
      <text
        x="22"
        y="23"
        transform="rotate(90 22 22)"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-foreground text-[9px] font-bold"
      >
        {percent}%
      </text>
    </svg>
  );
}

const features = [
  { icon: GraduationCap, label: "High Quality MCQs" },
  { icon: Clock, label: "Smart Test Engine" },
  { icon: BarChart3, label: "Performance Analytics" },
  { icon: ShieldCheck, label: "100% Secure" },
] as const;

function Features() {
  return (
    <section id="features" className="scroll-mt-20 px-5 py-10 md:py-14">
      <div className="mx-auto max-w-6xl rounded-3xl border border-border bg-card p-6 shadow-card md:p-10">
        <div className="grid gap-8 md:grid-cols-4 md:divide-x md:divide-border">
          {features.map(({ icon: Icon, label }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="flex flex-col items-center gap-3 px-2 text-center transition-transform hover:-translate-y-1"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon size={26} />
              </div>
              <div className="font-semibold">{label}</div>
              <div className="h-1 w-8 rounded-full bg-primary/70" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBanner() {
  return (
    <section className="px-5 pb-14 pt-4">
      <div
        className="relative mx-auto flex max-w-6xl flex-col items-center gap-6 overflow-hidden rounded-3xl px-6 py-10 text-center md:flex-row md:justify-between md:px-12 md:text-left"
        style={{ background: "linear-gradient(120deg, oklch(0.42 0.2 285), oklch(0.5 0.22 275))" }}
      >
        <TargetIllustration />
        <div className="relative z-10 max-w-md">
          <h2 className="text-2xl font-extrabold leading-tight text-primary-foreground md:text-3xl">
            Ready to take your preparation to the{" "}
            <span className="text-[oklch(0.82_0.11_290)]">next level?</span>
          </h2>
          <motion.div
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="inline-block"
          >
            <Link
              to="/auth"
              className="group mt-6 inline-flex items-center gap-2 rounded-full bg-card px-7 py-3.5 text-sm font-semibold text-primary shadow-card transition-shadow hover:shadow-elevated"
            >
              Start Free Now
              <ArrowRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
          </motion.div>
        </div>
        <RocketIllustration />
      </div>
    </section>
  );
}

function TargetIllustration() {
  return (
    <motion.svg
      viewBox="0 0 140 140"
      className="h-28 w-28 shrink-0 md:h-40 md:w-40"
      aria-hidden
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
    >
      <ellipse cx="70" cy="126" rx="42" ry="7" fill="oklch(0.3 0.14 285)" opacity="0.5" />
      <circle cx="70" cy="72" r="46" fill="oklch(0.95 0.03 290)" />
      <circle cx="70" cy="72" r="34" fill="oklch(0.58 0.22 285)" />
      <circle cx="70" cy="72" r="22" fill="oklch(0.95 0.03 290)" />
      <circle cx="70" cy="72" r="11" fill="oklch(0.5 0.22 285)" />
      <g stroke="oklch(0.28 0.12 285)" strokeWidth="5" strokeLinecap="round">
        <line x1="24" y1="30" x2="70" y2="72" />
      </g>
      <path d="M14 20 l18 4 l-8 8 z" fill="oklch(0.72 0.16 290)" />
      <circle cx="70" cy="72" r="5" fill="oklch(0.98 0.01 290)" />
    </motion.svg>
  );
}

function RocketIllustration() {
  return (
    <motion.svg
      viewBox="0 0 160 140"
      className="h-28 w-32 shrink-0 md:h-44 md:w-52"
      aria-hidden
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    >
      <g fill="oklch(0.86 0.07 292)" opacity="0.85">
        <ellipse cx="52" cy="116" rx="30" ry="18" />
        <ellipse cx="86" cy="122" rx="34" ry="16" />
        <ellipse cx="116" cy="114" rx="24" ry="14" />
      </g>
      <g transform="rotate(-18 92 60)">
        <path d="M92 12 c16 14 24 32 24 52 l-48 0 c0-20 8-38 24-52 z" fill="oklch(0.97 0.01 290)" />
        <path d="M92 12 c16 14 24 32 24 52 l-24 0 z" fill="oklch(0.9 0.03 290)" />
        <circle cx="92" cy="46" r="10" fill="oklch(0.55 0.22 285)" />
        <circle cx="92" cy="46" r="5" fill="oklch(0.85 0.09 290)" />
        <path d="M68 64 l-14 16 l14 0 z" fill="oklch(0.55 0.22 285)" />
        <path d="M116 64 l14 16 l-14 0 z" fill="oklch(0.55 0.22 285)" />
        <path d="M78 64 l28 0 l0 10 l-28 0 z" fill="oklch(0.68 0.16 288)" />
        <path d="M84 74 c4 12 8 16 8 16 c0 0 4-4 8-16 z" fill="oklch(0.85 0.14 75)" />
      </g>
      <g fill="oklch(0.95 0.05 292)">
        <path d="M22 40 l3 7 l7 3 l-7 3 l-3 7 l-3-7 l-7-3 l7-3 z" />
        <path d="M136 30 l2 5 l5 2 l-5 2 l-2 5 l-2-5 l-5-2 l5-2 z" />
        <path d="M44 16 l2 4 l4 2 l-4 2 l-2 4 l-2-4 l-4-2 l4-2 z" />
      </g>
    </motion.svg>
  );
}
