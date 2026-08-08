import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { QUESTION_STATUS_LABEL, statusClasses, type InstituteRoleInfo } from "@/lib/institute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

type Draft = {
  id?: string;
  subject_id: string;
  chapter_id: string;
  topic_id: string;
  question_text: string;
  explanation: string;
  difficulty: string;
  options: string[];
  correctIndex: number;
};

function emptyDraft(subjectId: string): Draft {
  return {
    subject_id: subjectId,
    chapter_id: "",
    topic_id: "",
    question_text: "",
    explanation: "",
    difficulty: "medium",
    options: ["", "", "", ""],
    correctIndex: 0,
  };
}

export function FacultyDashboard({ info }: { info: InstituteRoleInfo }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data: questions = [] } = useQuery({
    queryKey: ["faculty-questions", user?.id, info.instituteId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("id, question_text, status, rejection_reason, difficulty, created_at, subject_id")
        .eq("created_by", user!.id)
        .eq("institute_id", info.instituteId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const stats = useMemo(() => {
    const by = (s: string) => questions.filter((q) => q.status === s).length;
    return {
      total: questions.length,
      approved: by("approved"),
      review: by("submitted"),
      rejected: by("rejected"),
    };
  }, [questions]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const firstName =
    (user?.user_metadata?.["display_name"] as string | undefined)?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "there";

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-card border border-border p-5 shadow-card">
        <h1 className="text-xl font-extrabold tracking-tight">
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Faculty · {info.instituteName ?? "Your institute"}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { label: "Created", value: stats.total },
            { label: "Approved", value: stats.approved },
            { label: "Under review", value: stats.review },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-muted/40 p-3 text-center">
              <div className="text-lg font-bold">{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
        {!draft && (
          <Button
            className="mt-4 w-full rounded-2xl"
            onClick={() => setDraft(emptyDraft(info.assignedSubjectId ?? ""))}
          >
            <Plus size={16} /> Add MCQ
          </Button>
        )}
      </div>

      {draft && (
        <QuestionForm
          info={info}
          draft={draft}
          setDraft={setDraft}
          onDone={() => {
            setDraft(null);
            qc.invalidateQueries({ queryKey: ["faculty-questions"] });
          }}
        />
      )}

      <div className="rounded-3xl bg-card border border-border p-5 shadow-card">
        <h2 className="font-semibold text-sm mb-3">My Questions</h2>
        {questions.length === 0 && (
          <p className="text-xs text-muted-foreground">No questions yet. Start with “Add MCQ”.</p>
        )}
        <ul className="space-y-2">
          {questions.map((q) => (
            <li key={q.id} className="rounded-2xl border border-border p-3">
              <div className="flex items-start gap-2">
                <p className="text-sm flex-1 line-clamp-3">{q.question_text}</p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClasses(q.status)}`}
                >
                  {QUESTION_STATUS_LABEL[q.status] ?? q.status}
                </span>
              </div>
              {q.status === "rejected" && q.rejection_reason && (
                <p className="mt-2 text-[11px] text-destructive">Reason: {q.rejection_reason}</p>
              )}
              {(q.status === "draft" || q.status === "rejected") && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-1 h-7 px-2 text-xs"
                  onClick={() => void loadForEdit(q.id, info, setDraft)}
                >
                  Edit
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

async function loadForEdit(id: string, info: InstituteRoleInfo, setDraft: (d: Draft) => void) {
  const { data: q } = await supabase
    .from("questions")
    .select("id, subject_id, chapter_id, topic_id, question_text, explanation, difficulty")
    .eq("id", id)
    .maybeSingle();
  const { data: opts } = await supabase
    .from("options")
    .select("option_text, is_correct, sort_order")
    .eq("question_id", id)
    .order("sort_order");
  if (!q) return;
  const list = (opts ?? []).map((o) => o.option_text);
  while (list.length < 4) list.push("");
  setDraft({
    id: q.id,
    subject_id: q.subject_id ?? info.assignedSubjectId ?? "",
    chapter_id: q.chapter_id ?? "",
    topic_id: q.topic_id ?? "",
    question_text: q.question_text ?? "",
    explanation: q.explanation ?? "",
    difficulty: q.difficulty ?? "medium",
    options: list.slice(0, 4),
    correctIndex: Math.max(
      0,
      (opts ?? []).findIndex((o) => o.is_correct),
    ),
  });
}

function QuestionForm({
  info,
  draft,
  setDraft,
  onDone,
}: {
  info: InstituteRoleInfo;
  draft: Draft;
  setDraft: (d: Draft | null) => void;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const { data: subjects = [] } = useQuery({
    queryKey: ["inst-subjects"],
    queryFn: async () =>
      (await supabase.from("subjects").select("id, name").eq("is_active", true).order("sort_order"))
        .data ?? [],
  });
  const { data: chapters = [] } = useQuery({
    queryKey: ["inst-chapters", draft.subject_id],
    enabled: !!draft.subject_id,
    queryFn: async () =>
      (
        await supabase
          .from("chapters")
          .select("id, name")
          .eq("subject_id", draft.subject_id)
          .order("sort_order")
      ).data ?? [],
  });
  const { data: topics = [] } = useQuery({
    queryKey: ["inst-topics", draft.chapter_id],
    enabled: !!draft.chapter_id,
    queryFn: async () =>
      (
        await supabase
          .from("topics")
          .select("id, name")
          .eq("chapter_id", draft.chapter_id)
          .order("sort_order")
      ).data ?? [],
  });

  async function save(status: "draft" | "submitted") {
    if (!user) return;
    if (!draft.subject_id) return toast.error("Pick a subject");
    if (!draft.question_text.trim()) return toast.error("Question text is required");
    if (draft.options.some((o) => !o.trim())) return toast.error("All 4 options are required");

    setSaving(true);
    try {
      let questionId = draft.id;
      const payload = {
        subject_id: draft.subject_id,
        chapter_id: draft.chapter_id || null,
        topic_id: draft.topic_id || null,
        question_text: draft.question_text.trim(),
        explanation: draft.explanation.trim() || null,
        difficulty: draft.difficulty,
        institute_id: info.instituteId,
        created_by: user.id,
        status,
        rejection_reason: null,
      };

      if (questionId) {
        const { error } = await supabase.from("questions").update(payload).eq("id", questionId);
        if (error) throw error;
        await supabase.from("options").delete().eq("question_id", questionId);
      } else {
        const { data, error } = await supabase
          .from("questions")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        questionId = data.id;
      }

      const rows = draft.options.map((text, i) => ({
        question_id: questionId!,
        option_text: text.trim(),
        is_correct: i === draft.correctIndex,
        sort_order: i + 1,
      }));
      const { error: optErr } = await supabase.from("options").insert(rows);
      if (optErr) throw optErr;

      toast.success(status === "draft" ? "Saved as draft" : "Submitted for review");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save question");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl bg-card border border-border p-5 shadow-card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm">{draft.id ? "Edit MCQ" : "New MCQ"}</h2>
        <Button size="icon" variant="ghost" onClick={() => setDraft(null)}>
          <X size={16} />
        </Button>
      </div>

      {!info.assignedSubjectId && (
        <div>
          <Label className="text-xs">Subject</Label>
          <select
            value={draft.subject_id}
            onChange={(e) =>
              setDraft({ ...draft, subject_id: e.target.value, chapter_id: "", topic_id: "" })
            }
            className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm"
          >
            <option value="">Select subject…</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {info.assignedSubjectId && (
        <p className="text-xs text-muted-foreground">
          Subject: {subjects.find((s) => s.id === draft.subject_id)?.name ?? "…"}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Chapter</Label>
          <select
            value={draft.chapter_id}
            onChange={(e) => setDraft({ ...draft, chapter_id: e.target.value, topic_id: "" })}
            className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm"
          >
            <option value="">—</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Topic</Label>
          <select
            value={draft.topic_id}
            onChange={(e) => setDraft({ ...draft, topic_id: e.target.value })}
            className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm"
          >
            <option value="">—</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label className="text-xs">Question</Label>
        <Textarea
          rows={3}
          value={draft.question_text}
          onChange={(e) => setDraft({ ...draft, question_text: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Options (select the correct one)</Label>
        {draft.options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name="correct"
              checked={draft.correctIndex === i}
              onChange={() => setDraft({ ...draft, correctIndex: i })}
              className="accent-primary"
            />
            <Input
              value={o}
              placeholder={`Option ${String.fromCharCode(65 + i)}`}
              onChange={(e) => {
                const next = [...draft.options];
                next[i] = e.target.value;
                setDraft({ ...draft, options: next });
              }}
            />
          </div>
        ))}
      </div>

      <div>
        <Label className="text-xs">Explanation</Label>
        <Textarea
          rows={2}
          value={draft.explanation}
          onChange={(e) => setDraft({ ...draft, explanation: e.target.value })}
        />
      </div>

      <div>
        <Label className="text-xs">Difficulty</Label>
        <select
          value={draft.difficulty}
          onChange={(e) => setDraft({ ...draft, difficulty: e.target.value })}
          className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm"
        >
          {["easy", "medium", "hard"].map((d) => (
            <option key={d} value={d} className="capitalize">
              {d}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          variant="outline"
          className="flex-1 rounded-2xl"
          disabled={saving}
          onClick={() => save("draft")}
        >
          Save as Draft
        </Button>
        <Button className="flex-1 rounded-2xl" disabled={saving} onClick={() => save("submitted")}>
          Submit for Review
        </Button>
      </div>
    </div>
  );
}
