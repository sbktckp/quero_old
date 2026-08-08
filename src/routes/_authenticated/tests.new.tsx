import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useUserGoal } from "@/lib/user-goal";
import { useInstituteRole } from "@/lib/institute";
import { ArrowLeft, Timer, BookOpen, Building2 } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { buildAndStartTest } from "@/lib/test-builder";
import type { Database } from "@/integrations/supabase/types";

type TestType = Database["public"]["Enums"]["test_type"];
type TestMode = Database["public"]["Enums"]["test_mode"];

export const Route = createFileRoute("/_authenticated/tests/new")({
  component: NewTestPage,
  validateSearch: (s: Record<string, unknown>) => ({
    type: (s.type as TestType) ?? "chapter",
  }),
});

const TYPES: { key: TestType; label: string; desc: string }[] = [
  { key: "chapter", label: "Chapter Test", desc: "Pick one chapter" },
  { key: "topic", label: "Topic Test", desc: "Focus on a single topic" },
  { key: "custom", label: "Custom Test", desc: "Mix subjects & difficulty" },
];

function NewTestPage() {
  const { type: initialType } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [type, setType] = useState<TestType>(initialType);
  const [mode, setMode] = useState<TestMode>("timed");
  const [subjectId, setSubjectId] = useState<string>("");
  const [chapterId, setChapterId] = useState<string>("");
  const [topicId, setTopicId] = useState<string>("");
  const [difficulties, setDifficulties] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [submitting, setSubmitting] = useState(false);

  const { info: instituteInfo } = useInstituteRole();
  const instituteId =
    instituteInfo?.role === "institute_admin" ? instituteInfo.instituteId : null;
  const { goal, examType } = useUserGoal();
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects", goal],
    queryFn: async () => (await supabase.from("subjects").select("*")
      .filter("exam_type", "eq", examType)
      .filter("is_active", "eq", true)
      .order("sort_order")).data ?? [],
  });
  const { data: chapters = [] } = useQuery({
    queryKey: ["chapters", subjectId],
    enabled: !!subjectId && (type === "chapter" || type === "topic"),
    queryFn: async () => (await supabase.from("chapters").select("*").eq("subject_id", subjectId).order("sort_order")).data ?? [],
  });
  const { data: topics = [] } = useQuery({
    queryKey: ["topics", chapterId],
    enabled: !!chapterId && type === "topic",
    queryFn: async () => (await supabase.from("topics").select("*").eq("chapter_id", chapterId).order("sort_order")).data ?? [],
  });

  const title = useMemo(() => {
    const label = TYPES.find((t) => t.key === type)?.label ?? "Test";
    const modeLabel = mode === "practice" ? " · Practice" : "";
    return `${label}${modeLabel}`;
  }, [type, mode]);

  const canSubmit =
    !!user &&
    ((type === "chapter" && !!chapterId) ||
      (type === "topic" && !!topicId) ||
      (type === "custom" && !!subjectId));

  const submit = async () => {
    if (!user || submitting) return;
    setSubmitting(true);
    try {
      const attemptId = await buildAndStartTest({
        userId: user.id,
        title,
        testType: type,
        mode,
        durationMinutes,
        questionCount,
        subjectId: type === "custom" ? subjectId : chapters.find((c) => c.id === chapterId)?.subject_id ?? subjectId,
        chapterId: type === "chapter" ? chapterId : null,
        topicId: type === "topic" ? topicId : null,
        instituteId,
        filters: type === "custom" ? { subjectIds: [subjectId], difficulties } : undefined,
      });
      navigate({ to: "/test/$attemptId", params: { attemptId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not build test");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-lg flex items-center gap-3 px-5 py-3.5">
          <Link to="/home"><ArrowLeft /></Link>
          <h1 className="font-semibold">Create Test</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 py-5 space-y-5">
        {instituteId && (
          <div className="flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary-soft px-4 py-3 text-xs">
            <Building2 size={14} className="text-primary shrink-0" />
            <span>
              Building for <strong>{instituteInfo?.instituteName ?? "your institute"}</strong> —
              draws from the Quero question bank plus your institute&apos;s approved questions.
            </span>
          </div>
        )}
        <section>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Type</div>
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map((t) => (
              <button key={t.key} onClick={() => { setType(t.key); setChapterId(""); setTopicId(""); }}
                className={`rounded-2xl p-3 text-left border transition ${type === t.key ? "border-primary bg-primary-soft" : "border-border bg-card"}`}>
                <div className="text-xs font-bold">{t.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{t.desc}</div>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Subject</div>
          <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setChapterId(""); setTopicId(""); }}
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm">
            <option value="">Select subject…</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </section>

        {(type === "chapter" || type === "topic") && subjectId && (
          <section>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Chapter</div>
            <select value={chapterId} onChange={(e) => { setChapterId(e.target.value); setTopicId(""); }}
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm">
              <option value="">Select chapter…</option>
              {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {chapters.length === 0 && <p className="text-xs text-muted-foreground mt-2">No chapters yet for this subject.</p>}
          </section>
        )}

        {type === "topic" && chapterId && (
          <section>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Topic</div>
            <select value={topicId} onChange={(e) => setTopicId(e.target.value)}
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm">
              <option value="">Select topic…</option>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {topics.length === 0 && <p className="text-xs text-muted-foreground mt-2">No topics yet for this chapter.</p>}
          </section>
        )}

        {type === "custom" && (
          <section>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Difficulty</div>
            <div className="flex gap-2">
              {["easy", "medium", "hard"].map((d) => {
                const on = difficulties.includes(d);
                return (
                  <button key={d} onClick={() => setDifficulties((cur) => on ? cur.filter((x) => x !== d) : [...cur, d])}
                    className={`flex-1 rounded-full px-4 py-2 text-xs font-semibold capitalize border ${on ? "gradient-primary text-primary-foreground border-transparent" : "bg-card border-border"}`}>
                    {d}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Mode</div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setMode("timed")}
              className={`rounded-2xl border p-3 flex items-center gap-2 ${mode === "timed" ? "border-primary bg-primary-soft" : "border-border bg-card"}`}>
              <Timer size={16} className="text-primary" />
              <div>
                <div className="text-xs font-bold">Timed</div>
                <div className="text-[10px] text-muted-foreground">Real exam feel</div>
              </div>
            </button>
            <button onClick={() => setMode("practice")}
              className={`rounded-2xl border p-3 flex items-center gap-2 ${mode === "practice" ? "border-primary bg-primary-soft" : "border-border bg-card"}`}>
              <BookOpen size={16} className="text-primary" />
              <div>
                <div className="text-xs font-bold">Practice</div>
                <div className="text-[10px] text-muted-foreground">Instant feedback</div>
              </div>
            </button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Questions</div>
            <input type="number" min={1} max={100} value={questionCount} onChange={(e) => setQuestionCount(Math.max(1, Number(e.target.value)))}
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm" />
          </div>
          {mode === "timed" && (
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Duration (min)</div>
              <input type="number" min={1} max={240} value={durationMinutes} onChange={(e) => setDurationMinutes(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm" />
            </div>
          )}
        </section>

        <button disabled={!canSubmit || submitting} onClick={submit}
          className="w-full rounded-2xl gradient-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-card disabled:opacity-50">
          {submitting ? "Building test…" : "Start Test"}
        </button>
      </main>
    </div>
  );
}
