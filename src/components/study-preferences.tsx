import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { stageOptions, stageQuestion, type Goal } from "@/lib/academic-stage";

const YEARS = [2024, 2025, 2026, 2027];

type Prefs = {
  goal: Goal | null;
  academic_stage: string | null;
  exam_year: number | null;
  weak_subjects: string[] | null;
} | null | undefined;

export function StudyPreferences({ prefs }: { prefs: Prefs }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [goal, setGoal] = useState<Goal | null>(prefs?.goal ?? null);
  const [stage, setStage] = useState<string | null>(prefs?.academic_stage ?? null);
  const [examYear, setExamYear] = useState<number | null>(prefs?.exam_year ?? null);
  const [weak, setWeak] = useState<string[]>(prefs?.weak_subjects ?? []);
  const [subjects, setSubjects] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [needsReselect, setNeedsReselect] = useState(false);

  useEffect(() => {
    setGoal(prefs?.goal ?? null);
    setStage(prefs?.academic_stage ?? null);
    setExamYear(prefs?.exam_year ?? null);
    setWeak(prefs?.weak_subjects ?? []);
    setNeedsReselect(false);
  }, [prefs]);

  useEffect(() => {
    if (!goal) { setSubjects([]); return; }
    const examType = goal === "neet_pg" ? "NEET_PG" : "NEET_UG";
    supabase.from("subjects").select("id,name,slug")
      .filter("exam_type", "eq", examType)
      .filter("is_active", "eq", true)
      .order("sort_order")
      .then(({ data }) => { if (data) setSubjects(data); });
  }, [goal]);

  const changeGoal = (next: Goal) => {
    if (next === goal) return;
    setGoal(next);
    // Never carry a stage or weak subject set across exams
    setStage(null);
    setWeak([]);
    setNeedsReselect(true);
  };

  const toggleWeak = (slug: string) =>
    setWeak((w) => (w.includes(slug) ? w.filter((s) => s !== slug) : [...w, slug]));

  const save = async () => {
    if (!user || !goal) return;
    if (!stage) { toast.error("Please select your academic stage."); return; }
    if (!examYear) { toast.error("Please select your exam year."); return; }
    setSaving(true);
    const { error } = await supabase.from("user_preferences").upsert({
      user_id: user.id,
      goal,
      academic_stage: stage,
      exam_year: examYear,
      weak_subjects: weak,
      onboarding_completed: true,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setNeedsReselect(false);
    toast.success("Preferences saved");
    qc.invalidateQueries({ queryKey: ["prefs", user.id] });
    qc.invalidateQueries({ queryKey: ["user-goal", user.id] });
  };

  return (
    <div className="rounded-2xl bg-card border border-border shadow-card p-5 space-y-6">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">Study preferences</div>

      <Field label="Exam goal">
        <div className="grid grid-cols-2 gap-2">
          {([{ v: "neet_ug", l: "NEET UG" }, { v: "neet_pg", l: "NEET PG" }] as const).map((o) => (
            <Pick key={o.v} selected={goal === o.v} onClick={() => changeGoal(o.v)}>{o.l}</Pick>
          ))}
        </div>
      </Field>

      {needsReselect && (
        <p className="rounded-2xl bg-primary-soft text-primary text-xs font-medium px-4 py-3">
          Goal changed — please reselect your academic stage and weak subjects.
        </p>
      )}

      <Field label={stageQuestion(goal)}>
        <div className="grid grid-cols-2 gap-2">
          {stageOptions(goal).map((o) => (
            <Pick key={o.value} selected={stage === o.value} onClick={() => setStage(o.value)}>{o.label}</Pick>
          ))}
        </div>
      </Field>

      <Field label="Exam year">
        <div className="grid grid-cols-4 gap-2">
          {YEARS.map((y) => (
            <Pick key={y} selected={examYear === y} onClick={() => setExamYear(y)}>{y}</Pick>
          ))}
        </div>
      </Field>

      <Field label="Weak subjects">
        <div className="flex flex-wrap gap-2">
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => toggleWeak(s.slug)}
              className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
                weak.includes(s.slug) ? "border-primary bg-primary-soft text-primary" : "border-border bg-card"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </Field>

      <button
        disabled={saving || !goal}
        onClick={save}
        className="w-full rounded-2xl gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-card disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save preferences"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      {children}
    </div>
  );
}

function Pick({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
        selected ? "border-primary bg-primary-soft text-primary" : "border-border bg-card"
      }`}
    >
      {children}
    </button>
  );
}
