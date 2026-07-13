import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useEffect, useState, useMemo } from "react";
import { Clock, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/test/$attemptId")({
  component: TestPage,
});

interface QuestionRow {
  sort_order: number;
  question: {
    id: string;
    question_text: string;
    options: { id: string; option_text: string; sort_order: number }[];
  };
}

interface Reveal {
  correctOptionId: string | null;
  explanation: string | null;
  isCorrect: boolean | null;
}

function TestPage() {
  const { attemptId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reveals, setReveals] = useState<Record<string, Reveal>>({});

  const { data: attempt } = useQuery({
    queryKey: ["attempt", attemptId],
    queryFn: async () => {
      const { data, error } = await supabase.from("test_attempts").select("*").eq("id", attemptId).single();
      if (error) throw error; return data;
    },
  });

  const isPractice = attempt?.mode === "practice";

  const { data: questions = [] } = useQuery({
    queryKey: ["test-questions", attempt?.test_id],
    enabled: !!attempt?.test_id,
    queryFn: async () => {
      // Never fetch is_correct / explanation client-side. The server hands those
      // out via submit_answer (practice) or get_attempt_review (post-submit).
      const { data, error } = await supabase.from("test_questions")
        .select("sort_order, question:questions(id, question_text, options(id, option_text, sort_order))")
        .eq("test_id", attempt!.test_id!).order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as QuestionRow[];
    },
  });

  useEffect(() => {
    if (!attempt || isPractice) return;
    const started = new Date(attempt.started_at).getTime();
    const duration = attempt.duration_seconds * 1000;
    const tick = () => {
      const left = Math.max(0, Math.floor((started + duration - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) submit(true);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, isPractice]);

  const current = questions[idx];
  const totalQ = questions.length;
  const currentReveal = current ? reveals[current.question.id] : undefined;

  const selectOption = async (qId: string, oId: string) => {
    if (!attempt) return;
    if (reveals[qId]) return; // locked after reveal (practice) / re-answer (timed) — one shot per question
    setAnswers((a) => ({ ...a, [qId]: oId }));

    const { data, error } = await supabase.rpc("submit_answer", {
      _attempt_id: attempt.id,
      _question_id: qId,
      _option_id: oId,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (isPractice) {
      setReveals((r) => ({
        ...r,
        [qId]: {
          correctOptionId: row?.correct_option_id ?? null,
          explanation: row?.explanation ?? null,
          isCorrect: row?.is_correct ?? null,
        },
      }));
    }
  };

  const submit = async (auto = false) => {
    if (!user || !attempt || submitting) return;
    setSubmitting(true);
    const { error } = await supabase.rpc("finalize_attempt", { _attempt_id: attempt.id });
    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }
    if (auto) toast.info("Time's up — submitting");
    navigate({ to: "/review/$attemptId", params: { attemptId: attempt.id } });
  };

  const mmss = useMemo(() => {
    if (remaining == null) return "--:--";
    const m = Math.floor(remaining / 60).toString().padStart(2, "0");
    const s = (remaining % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [remaining]);

  if (!attempt || !current) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading test…</div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-lg flex items-center justify-between px-5 py-3.5">
          <Link to="/home" className="p-1"><ArrowLeft /></Link>
          <div className="text-sm font-semibold">Question {idx + 1} / {totalQ}</div>
          {isPractice ? (
            <div className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary-soft text-primary uppercase tracking-wider">
              Practice
            </div>
          ) : (
            <div className={`flex items-center gap-1 text-sm font-semibold px-3 py-1 rounded-full ${remaining != null && remaining < 60 ? "bg-destructive/10 text-destructive" : "bg-primary-soft text-primary"}`}>
              <Clock size={14} /> {mmss}
            </div>
          )}
        </div>
        <div className="mx-auto max-w-lg px-5 pb-3">
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div className="h-full gradient-primary transition-all" style={{ width: `${((idx + 1) / totalQ) * 100}%` }} />
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-lg px-5 py-6">
        <div className="rounded-3xl bg-card border border-border p-5 shadow-card">
          <div className="text-xs font-semibold text-primary mb-2">Q{idx + 1}</div>
          <p className="text-base font-medium leading-relaxed">{current.question.question_text}</p>
        </div>

        <div className="mt-5 space-y-3">
          {current.question.options.slice().sort((a, b) => a.sort_order - b.sort_order).map((o, i) => {
            const selected = answers[current.question.id] === o.id;
            const revealed = isPractice && !!currentReveal;
            const showAsCorrect = revealed && o.id === currentReveal!.correctOptionId;
            const showAsWrong = revealed && selected && o.id !== currentReveal!.correctOptionId;
            const base = "w-full text-left rounded-2xl border p-4 flex items-center gap-3 transition";
            const cls = showAsCorrect
              ? "border-success bg-success/10"
              : showAsWrong
              ? "border-destructive bg-destructive/10"
              : selected
              ? "border-primary bg-primary-soft"
              : "border-border bg-card";
            return (
              <button
                key={o.id}
                onClick={() => selectOption(current.question.id, o.id)}
                className={`${base} ${cls}`}
              >
                <div className={`h-7 w-7 rounded-full border flex items-center justify-center text-xs font-bold ${selected || showAsCorrect ? "bg-primary border-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                  {String.fromCharCode(65 + i)}
                </div>
                <span className="text-sm font-medium flex-1">{o.option_text}</span>
                {showAsCorrect && <CheckCircle2 size={18} className="text-success" />}
                {showAsWrong && <XCircle size={18} className="text-destructive" />}
              </button>
            );
          })}
        </div>

        {isPractice && currentReveal && (
          <div className="mt-4 rounded-2xl border border-border bg-card p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Explanation</div>
            <p className="text-sm leading-relaxed">{currentReveal.explanation ?? "No explanation available."}</p>
          </div>
        )}
      </main>

      <footer className="sticky bottom-0 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-lg flex gap-3 px-5 py-3">
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold disabled:opacity-40"
          >Previous</button>
          {idx < totalQ - 1 ? (
            <button onClick={() => setIdx((i) => i + 1)} className="flex-1 rounded-2xl gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground">Next</button>
          ) : (
            <button disabled={submitting} onClick={() => submit()} className="flex-1 rounded-2xl gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {submitting ? "Submitting..." : isPractice ? "Finish" : "Submit"}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
