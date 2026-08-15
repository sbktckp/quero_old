import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { callRpc, minutes, type StudentTestRow } from "@/lib/institute-tests";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Building2, Clock, Loader2 } from "lucide-react";

/*
  Tests an institute has published to this student. The window and the attempt
  cap are enforced inside start_institute_test_attempt, so this card only
  reflects what the server would allow rather than being the thing that guards
  it.
*/
export function AssignedTests() {
  const navigate = useNavigate();
  const [starting, setStarting] = useState<string | null>(null);

  const { data: tests = [] } = useQuery({
    queryKey: ["student-institute-tests"],
    queryFn: () => callRpc<StudentTestRow[]>("student_institute_tests").then((d) => d ?? []),
  });

  if (tests.length === 0) return null;

  async function start(t: StudentTestRow) {
    setStarting(t.test_id);
    try {
      const attemptId = await callRpc<string>("start_institute_test_attempt", { _test_id: t.test_id });
      if (!attemptId) throw new Error("Could not start the test");
      navigate({ to: "/test/$attemptId", params: { attemptId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start the test");
    } finally {
      setStarting(null);
    }
  }

  return (
    <section className="rounded-3xl bg-card border border-border p-5 shadow-card">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Building2 size={16} className="text-primary" /> From your institute
      </h2>
      <ul className="mt-3 space-y-2">
        {tests.map((t) => {
          const used = t.attempts_used >= t.max_attempts;
          const resumable = !!t.last_attempt_id && !t.last_submitted_at;
          return (
            <li key={t.test_id} className="rounded-2xl border border-border p-3">
              <div className="text-sm font-medium">{t.title}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock size={11} /> {minutes(t.duration_seconds)} min
                </span>
                <span>{t.question_count} questions</span>
                {t.closes_at && (
                  <span>
                    closes{" "}
                    {new Date(t.closes_at).toLocaleString(undefined, {
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
              <Button
                size="sm"
                className="mt-3 w-full rounded-2xl"
                disabled={starting === t.test_id || !t.open_now || (used && !resumable)}
                onClick={() => start(t)}
              >
                {starting === t.test_id && <Loader2 size={14} className="animate-spin" />}
                {!t.open_now
                  ? "Not open yet"
                  : resumable
                    ? "Resume"
                    : used
                      ? "Attempts used"
                      : "Start test"}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
