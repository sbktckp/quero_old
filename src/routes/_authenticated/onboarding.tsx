import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

const YEARS = [2024, 2025, 2026, 2027];
const LANGS = [
  { value: "english", label: "English" },
  { value: "hindi", label: "Hindi" },
];

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<"neet_ug" | "neet_pg" | null>(null);
  const [examYear, setExamYear] = useState<number | null>(null);
  const [language, setLanguage] = useState("english");
  const [weak, setWeak] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("subjects").select("id,name,slug").order("sort_order").then(({ data }) => {
      if (data) setSubjects(data);
    });
  }, []);

  const toggleWeak = (slug: string) => setWeak((w) => w.includes(slug) ? w.filter(s => s !== slug) : [...w, slug]);

  const finish = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("user_preferences").upsert({
      user_id: user.id,
      goal,
      exam_year: examYear,
      language,
      weak_subjects: weak,
      onboarding_completed: true,
    });
    if (error) { toast.error(error.message); setBusy(false); return; }
    setStep(5); // animation
    setTimeout(() => navigate({ to: "/home" }), 1800);
  };

  return (
    <div className="min-h-screen gradient-soft px-5 py-8 flex flex-col">
      {step < 5 && (
        <div className="mb-8 flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition ${i <= step ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="flex-1 flex flex-col"
        >
          {step === 0 && (
            <StepShell title="Select Your Goal" subtitle="Pick the exam you're preparing for">
              <div className="space-y-3">
                {[{ v: "neet_ug", l: "NEET UG" }, { v: "neet_pg", l: "NEET PG" }].map((o) => (
                  <Option key={o.v} selected={goal === o.v} onClick={() => setGoal(o.v as "neet_ug" | "neet_pg")}>
                    {o.l}
                  </Option>
                ))}
              </div>
              <CTA disabled={!goal} onClick={() => setStep(1)}>Next</CTA>
            </StepShell>
          )}
          {step === 1 && (
            <StepShell title="Select Exam Year" subtitle="When are you appearing?">
              <div className="space-y-3">
                {YEARS.map((y) => (
                  <Option key={y} selected={examYear === y} onClick={() => setExamYear(y)}>{y}</Option>
                ))}
              </div>
              <CTA disabled={!examYear} onClick={() => setStep(2)}>Next</CTA>
            </StepShell>
          )}
          {step === 2 && (
            <StepShell title="Select Language" subtitle="Choose your preferred language">
              <div className="space-y-3">
                {LANGS.map((l) => (
                  <Option key={l.value} selected={language === l.value} onClick={() => setLanguage(l.value)}>
                    {l.label}
                  </Option>
                ))}
              </div>
              <CTA onClick={() => setStep(3)}>Next</CTA>
            </StepShell>
          )}
          {step === 3 && (
            <StepShell title="Choose Weak Subjects" subtitle="Select the ones you want extra help with">
              <div className="grid grid-cols-2 gap-3">
                {subjects.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => toggleWeak(s.slug)}
                    className={`rounded-2xl border p-4 text-left transition ${weak.includes(s.slug) ? "border-primary bg-primary-soft" : "border-border bg-card"}`}
                  >
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{weak.includes(s.slug) ? "Selected" : "Tap to select"}</div>
                  </button>
                ))}
              </div>
              <CTA disabled={busy} onClick={finish}>{busy ? "Saving..." : "Finish"}</CTA>
            </StepShell>
          )}
          {step === 5 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <motion.div
                initial={{ scale: 0.5 }}
                animate={{ scale: [0.5, 1.1, 1] }}
                transition={{ duration: 0.6 }}
                className="h-20 w-20 rounded-full gradient-primary flex items-center justify-center shadow-elevated"
              >
                <Check className="text-primary-foreground" size={40} />
              </motion.div>
              <div className="text-center">
                <h1 className="text-2xl font-bold">Creating your dashboard</h1>
                <p className="text-muted-foreground text-sm mt-1">Personalizing everything for you...</p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StepShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">{subtitle}</p>
      <div className="flex-1">{children}</div>
    </div>
  );
}
function Option({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border px-5 py-4 text-left font-medium transition ${selected ? "border-primary bg-primary-soft text-primary" : "border-border bg-card"}`}
    >
      {children}
    </button>
  );
}
function CTA({ disabled, onClick, children }: { disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="mt-8 w-full rounded-2xl gradient-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-card disabled:opacity-50"
    >
      {children}
    </button>
  );
}
