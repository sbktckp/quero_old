import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { LandingHeader } from "@/components/landing/landing-header";
import { ArrowRight, Check } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Quero NEET Preparation Plans" },
      {
        name: "description",
        content:
          "Simple, honest pricing for Quero. Start free and upgrade for unlimited NEET UG & PG practice, mock tests and analytics.",
      },
      { property: "og:title", content: "Pricing — Quero NEET Preparation Plans" },
      { property: "og:description", content: "Start free. Upgrade whenever you're ready — transparent Quero plans." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PublicPricingPage,
});

type PlanRow = {
  id: string;
  name: string;
  tier: string;
  price_inr: number;
  billing_period: string;
};

const perks = [
  "Exam-oriented MCQ bank",
  "Timed mock tests & practice mode",
  "Performance analytics & weak-topic insights",
  "Previous year questions library",
];

function PublicPricingPage() {
  const { data: plans, isLoading } = useQuery({
    queryKey: ["landing-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("id,name,tier,price_inr,billing_period")
        .eq("is_active", true)
        .order("price_inr", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PlanRow[];
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main className="px-5 py-12 md:py-16">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Simple, honest pricing</h1>
            <p className="mt-2 text-sm text-muted-foreground">Start free. Upgrade whenever you&apos;re ready.</p>
          </motion.div>

          {isLoading ? (
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-56 animate-pulse rounded-2xl border border-border bg-muted/40" />
              ))}
            </div>
          ) : !plans || plans.length === 0 ? (
            <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-card">
              <div className="font-semibold">Pricing coming soon</div>
              <p className="mt-1 text-sm text-muted-foreground">
                We&apos;re finalising our plans. Create a free account and start practising today.
              </p>
              <Link
                to="/auth"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Start Free Now <ArrowRight size={15} />
              </Link>
            </div>
          ) : (
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {plans.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: i * 0.08 }}
                  className="rounded-2xl border border-border bg-card p-6 shadow-card transition-transform hover:-translate-y-1"
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-primary">{p.tier}</div>
                  <div className="mt-1 text-lg font-extrabold">{p.name}</div>
                  <div className="mt-3 flex items-end gap-1">
                    <span className="text-3xl font-extrabold">₹{Number(p.price_inr).toLocaleString("en-IN")}</span>
                    <span className="pb-1 text-sm text-muted-foreground">/ {p.billing_period}</span>
                  </div>
                  <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                    {perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2">
                        <Check size={15} className="mt-0.5 shrink-0 text-primary" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/auth"
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
                  >
                    Get Started <ArrowRight size={15} />
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
