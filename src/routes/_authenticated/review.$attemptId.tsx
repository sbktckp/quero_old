import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Check, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/review/$attemptId")({
  component: ReviewPage,
});

interface ReviewRow {
  sort_order: number;
  answer_id: string | null;
  is_correct: boolean | null;
  selected_option_id: string | null;
  question_id: string;
  question_text: string;
  explanation: string | null;
  options: { id: string; option_text: string; is_correct: boolean; sort_order: number }[];
}

function ReviewPage() {
  const { attemptId } = Route.useParams();

  const { data: attempt } = useQuery({
    queryKey: ["attempt-review", attemptId],
    queryFn: async () => {
      const { data, error } = await supabase.from("test_attempts")
        .select("*, subjects(name)").eq("id", attemptId).single();
      if (error) throw error; return data;
    },
  });

  const { data: rows = [] } = useQuery({
    queryKey: ["attempt-review-rows", attemptId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_attempt_review", { _attempt_id: attemptId });
      if (error) throw error;
      return (data ?? []) as unknown as ReviewRow[];
    },
  });

  if (!attempt) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;

  const scorePct = attempt.total_questions ? Math.round((attempt.correct_count / attempt.total_questions) * 100) : 0;

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-lg flex items-center gap-3 px-5 py-3.5">
          <Link to="/home"><ArrowLeft /></Link>
          <h1 className="font-semibold">Test Review</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 py-5 space-y-5">
        <div className="rounded-3xl gradient-primary p-6 text-primary-foreground shadow-elevated text-center">
          <div className="text-xs uppercase tracking-wider opacity-80">Your Score</div>
          <div className="text-5xl font-extrabold mt-1">{scorePct}%</div>
          <div className="mt-3 flex justify-center gap-6 text-sm">
            <div><span className="font-bold">{attempt.correct_count}</span> correct</div>
            <div><span className="font-bold">{attempt.total_questions - attempt.correct_count}</span> incorrect</div>
          </div>
        </div>

        <div className="space-y-3">
          {rows.map((r, i) => {
            const correctOpt = r.options?.find((o) => o.is_correct);
            const selectedOpt = r.options?.find((o) => o.id === r.selected_option_id);
            return (
              <div key={r.question_id} className="rounded-2xl bg-card border border-border p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs font-semibold text-primary">Q{i + 1}</div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${r.is_correct ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                    {r.is_correct ? <><Check size={12} /> Correct</> : <><X size={12} /> Wrong</>}
                  </span>
                </div>
                <p className="mt-2 font-medium text-sm">{r.question_text}</p>
                <div className="mt-3 space-y-2 text-sm">
                  <Row label="Your answer" value={selectedOpt?.option_text ?? "Not answered"} tone={r.is_correct ? "success" : "destructive"} />
                  {!r.is_correct && <Row label="Correct answer" value={correctOpt?.option_text ?? "—"} tone="success" />}
                </div>
                {r.explanation && (
                  <div className="mt-3 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
                    <b>Explanation:</b> {r.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Link to="/home" className="block text-center rounded-2xl gradient-primary py-3.5 font-semibold text-primary-foreground shadow-card">
          Back to Dashboard
        </Link>
      </main>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone: "success" | "destructive" }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-right font-medium ${tone === "success" ? "text-success" : "text-destructive"}`}>{value}</span>
    </div>
  );
}
