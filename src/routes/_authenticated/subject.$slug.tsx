import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Clock, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/subject/$slug")({
  component: SubjectPage,
});

function SubjectPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);

  const { data: subject, isLoading } = useQuery({
    queryKey: ["subject", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: test } = useQuery({
    queryKey: ["subject-test", subject?.id],
    enabled: !!subject,
    queryFn: async () => {
      const { data } = await supabase.from("tests")
        .select("*, test_questions(count)")
        .eq("subject_id", subject!.id).eq("test_type", "subject").maybeSingle();
      return data;
    },
  });

  const questionCount = (test?.test_questions as { count: number }[] | undefined)?.[0]?.count ?? 0;

  const startTest = async () => {
    if (!user || !test) return;
    if (questionCount === 0) {
      toast.error("This test has no questions yet.");
      return;
    }
    setStarting(true);
    const { data, error } = await supabase.from("test_attempts").insert({
      user_id: user.id,
      test_id: test.id,
      subject_id: subject!.id,
      test_type: "subject",
      duration_seconds: test.duration_seconds,
      total_questions: questionCount,
    }).select().single();
    setStarting(false);
    if (error || !data) { toast.error(error?.message || "Could not start test"); return; }
    navigate({ to: "/test/$attemptId", params: { attemptId: data.id } });
  };

  if (isLoading) return <PageLoader />;
  if (!subject) return <div className="p-6">Subject not found.</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-lg flex items-center gap-3 px-5 py-3.5">
          <Link to="/home"><ArrowLeft /></Link>
          <h1 className="font-semibold">{subject.name}</h1>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-5 py-5 space-y-5">
        <div className="rounded-3xl gradient-primary p-6 text-primary-foreground shadow-elevated">
          <div className="text-xs uppercase tracking-wider opacity-80">Subject Test</div>
          <div className="text-2xl font-bold mt-1">{subject.name}</div>
          <div className="mt-4 flex gap-4 text-sm">
            <div className="flex items-center gap-1.5"><ListChecks size={16} /> {questionCount} questions</div>
            <div className="flex items-center gap-1.5"><Clock size={16} /> {Math.round((test?.duration_seconds ?? 900) / 60)} min</div>
          </div>
        </div>

        <button
          disabled={starting || questionCount === 0}
          onClick={startTest}
          className="w-full rounded-2xl gradient-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-card disabled:opacity-60"
        >
          {starting ? "Starting..." : questionCount === 0 ? "No questions available yet" : "Start Subject Test"}
        </button>

        <div className="rounded-2xl bg-card border border-border p-5 shadow-card text-sm text-muted-foreground">
          Chapters and topic-level breakdowns are coming in the next phase. For now, take the full subject test to gauge your level.
        </div>
      </main>
    </div>
  );
}

function PageLoader() {
  return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
}
