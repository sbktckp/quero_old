import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { BottomNav } from "@/components/bottom-nav";
import { useState } from "react";
import { BookOpen, Filter, Play } from "lucide-react";
import { toast } from "sonner";
import { buildAndStartTest } from "@/lib/test-builder";

export const Route = createFileRoute("/_authenticated/pyq")({
  component: PyqLibrary,
});

function PyqLibrary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [year, setYear] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [exam, setExam] = useState<string>("NEET-UG");
  const [starting, setStarting] = useState(false);

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("*").order("sort_order")).data ?? [],
  });

  const { data: years = [] } = useQuery({
    queryKey: ["pyq-years"],
    queryFn: async () => {
      const { data } = await supabase.from("questions").select("pyq_year").eq("is_pyq", true).not("pyq_year", "is", null);
      const set = new Set<number>();
      data?.forEach((r) => r.pyq_year != null && set.add(r.pyq_year));
      return Array.from(set).sort((a, b) => b - a);
    },
  });

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["pyq-list", year, subjectId, exam],
    queryFn: async () => {
      let q = supabase.from("questions").select("id, question_text, pyq_year, pyq_exam, subject_id, subjects(name, slug, color)").eq("is_pyq", true);
      if (year) q = q.eq("pyq_year", year);
      if (subjectId) q = q.eq("subject_id", subjectId);
      if (exam) q = q.eq("pyq_exam", exam);
      const { data } = await q.order("pyq_year", { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  const startPyqTest = async () => {
    if (!user || starting) return;
    setStarting(true);
    try {
      const attemptId = await buildAndStartTest({
        userId: user.id,
        title: `PYQ Test${year ? ` ${year}` : ""}`,
        testType: "pyq",
        mode: "timed",
        durationMinutes: 20,
        questionCount: Math.min(20, questions.length),
        subjectId: subjectId ?? undefined,
        filters: { isPyq: true, pyqYear: year ?? undefined, pyqExam: exam },
      });
      navigate({ to: "/test/$attemptId", params: { attemptId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start test");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-lg flex items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary-soft flex items-center justify-center"><BookOpen size={16} className="text-primary" /></div>
            <h1 className="font-semibold">PYQ Library</h1>
          </div>
          <Filter size={18} className="text-muted-foreground" />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 py-4 space-y-4">
        {/* Exam filter */}
        <div className="flex gap-2">
          {["NEET-UG", "NEET-PG"].map((e) => (
            <button key={e} onClick={() => setExam(e)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold border ${exam === e ? "gradient-primary text-primary-foreground border-transparent" : "bg-card border-border"}`}>
              {e}
            </button>
          ))}
        </div>

        {/* Year chips */}
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Year</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Chip active={year === null} onClick={() => setYear(null)}>All</Chip>
            {years.map((y) => <Chip key={y} active={year === y} onClick={() => setYear(y)}>{y}</Chip>)}
          </div>
        </div>

        {/* Subject chips */}
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Subject</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Chip active={subjectId === null} onClick={() => setSubjectId(null)}>All</Chip>
            {subjects.map((s) => <Chip key={s.id} active={subjectId === s.id} onClick={() => setSubjectId(s.id)}>{s.name}</Chip>)}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">{isLoading ? "Loading…" : `${questions.length} question${questions.length === 1 ? "" : "s"}`}</div>

        <div className="space-y-2">
          {questions.map((q, i) => {
            const subj = (q as { subjects?: { name?: string; color?: string } }).subjects;
            return (
              <div key={q.id} className="rounded-2xl bg-card border border-border p-4 shadow-card">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span className="font-semibold text-primary">{subj?.name ?? "—"}</span>
                  <span>{q.pyq_exam} · {q.pyq_year}</span>
                </div>
                <p className="text-sm font-medium leading-snug mt-2">
                  <span className="text-primary font-bold mr-1">Q{i + 1}.</span>{q.question_text}
                </p>
              </div>
            );
          })}
          {!isLoading && questions.length === 0 && (
            <div className="rounded-2xl bg-card border border-border p-6 text-center text-sm text-muted-foreground">
              No questions match these filters yet.
            </div>
          )}
        </div>
      </main>

      {questions.length > 0 && (
        <div className="fixed bottom-20 inset-x-0 z-30 px-5">
          <div className="mx-auto max-w-lg">
            <button disabled={starting} onClick={startPyqTest}
              className="w-full rounded-2xl gradient-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-elevated flex items-center justify-center gap-2 disabled:opacity-60">
              <Play size={16} /> {starting ? "Starting…" : `Start PYQ Test (${Math.min(20, questions.length)} Qs)`}
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold border ${active ? "gradient-primary text-primary-foreground border-transparent" : "bg-card border-border"}`}>
      {children}
    </button>
  );
}
