import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { stageOptions, stageQuestion, stageLabel, goalLabel } from "@/lib/academic-stage";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

const YEARS = [2024, 2025, 2026, 2027];
const LANGS = [
  { value: "english", label: "English" },
  { value: "hindi", label: "Hindi" },
];

const TOTAL_STEPS = 5; // 0..4
const WELCOME_STEP = 9;

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<"neet_ug" | "neet_pg" | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [examYear, setExamYear] = useState<number | null>(null);
  const [language, setLanguage] = useState("english");
  const [weak, setWeak] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => setDisplayName(data?.display_name || user.email?.split("@")[0] || "Student"));
  }, [user]);

  useEffect(() => {
    if (!goal) { setSubjects([]); setWeak([]); setStage(null); return; }
    const examType = goal === "neet_pg" ? "NEET_PG" : "NEET_UG";
    supabase.from("subjects").select("id,name,slug")
      .filter("exam_type", "eq", examType)
      .filter("is_active", "eq", true)
      .order("sort_order")
      .then(({ data }) => { if (data) setSubjects(data); });
    // Clear cross-exam selections when goal changes
    setWeak([]);
    setStage(null);
  }, [goal]);

  const toggleWeak = (slug: string) => setWeak((w) => w.includes(slug) ? w.filter(s => s !== slug) : [...w, slug]);

  const finish = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("user_preferences").upsert({
      user_id: user.id,
      goal,
      academic_stage: stage,
      exam_year: examYear,
      language,
      weak_subjects: weak,
      onboarding_completed: true,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setStep(WELCOME_STEP);
  };

  const weakNames = weak
    .map((slug) => subjects.find((s) => s.slug === slug)?.name ?? slug)
    .filter(Boolean);

  return (
    <div className="min-h-screen gradient-soft px-5 py-8 flex flex-col">
      {step < TOTAL_STEPS && (
        <div className="mb-8 flex gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
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
            <StepShell
              title={stageQuestion(goal)}
              subtitle="This helps us tailor your study plan"
            >
              <div className="space-y-3">
                {stageOptions(goal).map((o) => (
                  <Option key={o.value} selected={stage === o.value} onClick={() => setStage(o.value)}>
                    {o.label}
                  </Option>
                ))}
              </div>
              <CTA disabled={!stage} onClick={() => setStep(2)}>Next</CTA>
            </StepShell>
          )}
          {step === 2 && (
            <StepShell title="Select Exam Year" subtitle="When are you appearing?">
              <div className="space-y-3">
                {YEARS.map((y) => (
                  <Option key={y} selected={examYear === y} onClick={() => setExamYear(y)}>{y}</Option>
                ))}
              </div>
              <CTA disabled={!examYear} onClick={() => setStep(3)}>Next</CTA>
            </StepShell>
          )}
          {step === 3 && (
            <StepShell title="Select Language" subtitle="Choose your preferred language">
              <div className="space-y-3">
                {LANGS.map((l) => (
                  <Option key={l.value} selected={language === l.value} onClick={() => setLanguage(l.value)}>
                    {l.label}
                  </Option>
                ))}
              </div>
              <CTA onClick={() => setStep(4)}>Next</CTA>
            </StepShell>
          )}
          {step === 4 && (
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
          {step === WELCOME_STEP && (
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
                <h1 className="text-2xl font-bold">Welcome, {displayName}!</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Your {goalLabel(goal)} plan is ready.
                </p>
              </div>

              <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-card space-y-4">
                <SummaryRow label="Goal" value={goalLabel(goal)} />
                <SummaryRow label="Academic stage" value={stageLabel(stage)} />
                <SummaryRow label="Exam year" value={examYear ? String(examYear) : "—"} />
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Weak subjects</div>
                  {weakNames.length ? (
                    <div className="flex flex-wrap gap-2">
                      {weakNames.map((n) => (
                        <span key={n} className="rounded-full bg-primary-soft text-primary text-xs font-semibold px-3 py-1.5">
                          {n}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">None selected</div>
                  )}
                </div>
              </div>

              <button
                onClick={() => navigate({ to: "/home" })}
                className="w-full max-w-sm rounded-2xl gradient-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-card"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
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
