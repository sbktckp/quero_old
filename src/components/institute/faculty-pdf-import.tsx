import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { generateMcqs, validateMcq, type McqCandidate } from "@/lib/admin-ai.functions";
import { extractPdfText } from "@/lib/pdf-text";
import { FACULTY_IMPORT_CAP, insertFacultyQuestion } from "@/lib/faculty-import";
import type { InstituteRoleInfo } from "@/lib/institute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Upload,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
  Pencil,
  RefreshCw,
  Check,
  StopCircle,
  X,
} from "lucide-react";

type Verdict = "pass" | "revise" | "reject";
type Card = {
  key: string;
  candidate: McqCandidate;
  verdict: Verdict;
  reason?: string;
  edited: boolean;
  saved: boolean;
  saving: boolean;
  editing: boolean;
};

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export function FacultyPdfImport({
  info,
  onClose,
  onDone,
}: {
  info: InstituteRoleInfo;
  onClose: () => void;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const genFn = useServerFn(generateMcqs);
  const valFn = useServerFn(validateMcq);

  const [notes, setNotes] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [exam, setExam] = useState<"NEET UG" | "NEET PG">("NEET UG");
  const [subjectId, setSubjectId] = useState(info.assignedSubjectId ?? "");
  const [chapterId, setChapterId] = useState("");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [count, setCount] = useState(10);

  const [running, setRunning] = useState(false);
  const stopRef = useRef(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [cards, setCards] = useState<Card[]>([]);

  const { data: subjects = [] } = useQuery({
    queryKey: ["inst-subjects"],
    queryFn: async () =>
      (await supabase.from("subjects").select("id, name").eq("is_active", true).order("sort_order"))
        .data ?? [],
  });
  const { data: chapters = [] } = useQuery({
    queryKey: ["inst-chapters", subjectId],
    enabled: !!subjectId,
    queryFn: async () =>
      (await supabase.from("chapters").select("id, name").eq("subject_id", subjectId).order("sort_order"))
        .data ?? [],
  });

  const subjectName = subjects.find((s) => s.id === subjectId)?.name ?? "";
  const chapterName = chapters.find((c) => c.id === chapterId)?.name ?? null;

  async function handlePdf(file: File) {
    setExtracting(true);
    try {
      const text = await extractPdfText(file);
      if (text.trim().length < 20) throw new Error("No readable text found in this PDF");
      setNotes(text);
      setFileName(file.name);
      toast.success(`Extracted ${text.length.toLocaleString()} characters`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that PDF");
    } finally {
      setExtracting(false);
    }
  }

  async function fetchExistingTexts(subjId: string) {
    const set = new Set<string>();
    const { data } = await supabase
      .from("questions")
      .select("question_text")
      .eq("subject_id", subjId)
      .limit(1000);
    for (const r of data ?? []) set.add(norm(r.question_text));
    return set;
  }

  async function processCandidate(cand: McqCandidate, existing: Set<string>): Promise<Card> {
    const key = crypto.randomUUID();
    if (existing.has(norm(cand.question_text))) {
      return {
        key,
        candidate: cand,
        verdict: "reject",
        reason: "Duplicate of an existing question in this subject",
        edited: false,
        saved: false,
        saving: false,
        editing: false,
      };
    }
    try {
      const result = await valFn({ data: { candidate: cand } });
      const finalCand =
        result.verdict === "revise" && result.corrected_question ? result.corrected_question : cand;
      existing.add(norm(finalCand.question_text));
      return {
        key,
        candidate: finalCand,
        verdict: result.verdict,
        reason: result.reason ?? undefined,
        edited: false,
        saved: false,
        saving: false,
        editing: false,
      };
    } catch (err) {
      return {
        key,
        candidate: cand,
        verdict: "reject",
        reason: err instanceof Error ? err.message : "validator failed",
        edited: false,
        saved: false,
        saving: false,
        editing: false,
      };
    }
  }

  async function start() {
    if (!subjectId) return toast.error("Choose a subject");
    if (notes.trim().length < 20) return toast.error("Upload a PDF first");

    const target = Math.max(1, Math.min(FACULTY_IMPORT_CAP, count));
    setCards([]);
    setProgress({ done: 0, total: target });
    setRunning(true);
    stopRef.current = false;

    const existing = await fetchExistingTexts(subjectId);
    let remaining = target;

    while (remaining > 0 && !stopRef.current) {
      const chunk = Math.min(10, remaining);
      try {
        const { candidates } = await genFn({
          data: {
            notes: notes.slice(0, 20000),
            exam,
            subjectName,
            chapterHint: chapterName,
            topicHint: null,
            difficulty,
            count: chunk,
            suggestTaxonomy: !chapterId,
          },
        });
        if (candidates.length === 0) {
          toast.error("Model returned no valid questions this round");
          break;
        }
        for (const cand of candidates) {
          if (stopRef.current) break;
          const card = await processCandidate(cand, existing);
          setCards((prev) => [...prev, card]);
          setProgress((p) => ({ ...p, done: p.done + 1 }));
        }
        remaining -= candidates.length;
      } catch (err) {
        toast.error(
          `Generation failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        break;
      }
    }
    setRunning(false);
  }

  async function saveCard(card: Card): Promise<boolean> {
    if (card.saved || !user) return true;
    if (card.verdict !== "pass" && !card.edited) {
      toast.error("Edit the question before submitting it");
      return false;
    }
    const savedCount = cards.filter((c) => c.saved).length;
    if (savedCount >= FACULTY_IMPORT_CAP) {
      toast.error(`Cap of ${FACULTY_IMPORT_CAP} questions per run reached`);
      return false;
    }
    setCards((prev) => prev.map((c) => (c.key === card.key ? { ...c, saving: true } : c)));
    try {
      await insertFacultyQuestion(
        {
          subject_id: subjectId,
          chapter_id: chapterId || null,
          topic_id: null,
          question_text: card.candidate.question_text,
          explanation: card.candidate.explanation || null,
          difficulty: (card.candidate.difficulty || "medium").toLowerCase(),
          options: card.candidate.options.map((text, i) => ({
            text,
            is_correct: i === card.candidate.correct_index,
          })),
        },
        { instituteId: info.instituteId, userId: user.id },
      );
      setCards((prev) =>
        prev.map((c) => (c.key === card.key ? { ...c, saving: false, saved: true } : c)),
      );
      onDone();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit question");
      setCards((prev) => prev.map((c) => (c.key === card.key ? { ...c, saving: false } : c)));
      return false;
    }
  }

  async function submitAllPassing() {
    for (const card of cards.filter((c) => c.verdict === "pass" && !c.saved)) {
      await saveCard(card);
    }
    toast.success("Submitted for review");
  }

  async function regenerate(card: Card) {
    setCards((prev) => prev.map((c) => (c.key === card.key ? { ...c, saving: true } : c)));
    try {
      const { candidates } = await genFn({
        data: {
          notes: notes.slice(0, 20000),
          exam,
          subjectName,
          chapterHint: chapterName,
          topicHint: null,
          difficulty,
          count: 1,
          suggestTaxonomy: !chapterId,
        },
      });
      if (candidates.length === 0) {
        toast.error("No question returned");
        setCards((prev) => prev.map((c) => (c.key === card.key ? { ...c, saving: false } : c)));
        return;
      }
      const result = await valFn({ data: { candidate: candidates[0] } });
      const finalCand =
        result.verdict === "revise" && result.corrected_question
          ? result.corrected_question
          : candidates[0];
      setCards((prev) =>
        prev.map((c) =>
          c.key === card.key
            ? {
                ...c,
                candidate: finalCand,
                verdict: result.verdict,
                reason: result.reason ?? undefined,
                edited: false,
                saving: false,
              }
            : c,
        ),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Regenerate failed");
      setCards((prev) => prev.map((c) => (c.key === card.key ? { ...c, saving: false } : c)));
    }
  }

  const passCount = cards.filter((c) => c.verdict === "pass" && !c.saved).length;
  const savedCount = cards.filter((c) => c.saved).length;

  return (
    <div className="rounded-3xl bg-card border border-border p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm">Bulk import (PDF)</h2>
        <Button size="icon" variant="ghost" onClick={onClose}>
          <X size={16} />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Upload your notes or a past paper. Quero reads the text and drafts MCQs for you to review —
        up to {FACULTY_IMPORT_CAP} per run. Everything you submit goes to your institute
        admin&apos;s review queue.
      </p>

      <label>
        <input
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handlePdf(e.target.files[0])}
        />
        <Button asChild size="sm" variant="outline" className="rounded-2xl">
          <span>
            {extracting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}{" "}
            {extracting ? "Reading PDF…" : fileName ? "Replace PDF" : "Upload PDF"}
          </span>
        </Button>
      </label>
      {fileName && (
        <p className="text-[11px] text-muted-foreground">
          {fileName} · {notes.length.toLocaleString()} characters extracted
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Exam</Label>
          <select
            value={exam}
            onChange={(e) => setExam(e.target.value as typeof exam)}
            className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm"
          >
            <option value="NEET UG">NEET UG</option>
            <option value="NEET PG">NEET PG</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Difficulty</Label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
            className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm"
          >
            {["Easy", "Medium", "Hard"].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Subject</Label>
          <select
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setChapterId("");
            }}
            className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm"
          >
            <option value="">Select…</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Chapter</Label>
          <select
            value={chapterId}
            onChange={(e) => setChapterId(e.target.value)}
            className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm"
          >
            <option value="">Let AI suggest</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <Label className="text-xs">How many questions (max {FACULTY_IMPORT_CAP})</Label>
          <Input
            type="number"
            min={1}
            max={FACULTY_IMPORT_CAP}
            value={count}
            onChange={(e) =>
              setCount(Math.max(1, Math.min(FACULTY_IMPORT_CAP, Number(e.target.value) || 1)))
            }
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {!running ? (
          <Button
            size="sm"
            className="rounded-2xl"
            onClick={start}
            disabled={!subjectId || notes.trim().length < 20}
          >
            <Sparkles size={14} /> Generate
          </Button>
        ) : (
          <Button size="sm" variant="destructive" className="rounded-2xl" onClick={() => (stopRef.current = true)}>
            <StopCircle size={14} /> Stop
          </Button>
        )}
        {!running && passCount > 0 && (
          <Button size="sm" variant="outline" className="rounded-2xl" onClick={submitAllPassing}>
            <Check size={14} /> Submit all passing
          </Button>
        )}
      </div>

      {progress.total > 0 && (
        <div className="space-y-1 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            {running && <Loader2 size={12} className="animate-spin" />}
            <span>
              {progress.done} / {progress.total} drafted · {savedCount} submitted
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(100, (progress.done / progress.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-3">
        {cards.map((card) => (
          <CardView
            key={card.key}
            card={card}
            onEdit={() =>
              setCards((prev) =>
                prev.map((c) => (c.key === card.key ? { ...c, editing: !c.editing } : c)),
              )
            }
            onUpdate={(patch) =>
              setCards((prev) =>
                prev.map((c) =>
                  c.key === card.key ? { ...c, edited: true, candidate: { ...c.candidate, ...patch } } : c,
                ),
              )
            }
            onApprove={() => saveCard(card)}
            onRegenerate={() => regenerate(card)}
            onDiscard={() => setCards((prev) => prev.filter((c) => c.key !== card.key))}
          />
        ))}
      </div>
    </div>
  );
}

function CardView({
  card,
  onEdit,
  onApprove,
  onRegenerate,
  onDiscard,
  onUpdate,
}: {
  card: Card;
  onEdit: () => void;
  onApprove: () => void;
  onRegenerate: () => void;
  onDiscard: () => void;
  onUpdate: (patch: Partial<McqCandidate>) => void;
}) {
  const badge =
    card.verdict === "pass" ? (
      <Badge className="bg-emerald-600 hover:bg-emerald-600">
        <CheckCircle2 size={12} className="mr-1" /> Pass
      </Badge>
    ) : card.verdict === "revise" ? (
      <Badge className="bg-amber-500 hover:bg-amber-500">
        <AlertTriangle size={12} className="mr-1" /> Needs review
      </Badge>
    ) : (
      <Badge variant="destructive">
        <XCircle size={12} className="mr-1" /> Rejected
      </Badge>
    );

  const canApprove = !card.saved && (card.verdict === "pass" || card.edited);

  return (
    <div className="rounded-2xl border border-border p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {badge}
          {card.saved && <Badge variant="secondary">Submitted</Badge>}
          {card.edited && !card.saved && <Badge variant="outline">Edited</Badge>}
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit} disabled={card.saved}>
            <Pencil size={13} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={onRegenerate}
            disabled={card.saved || card.saving}
          >
            <RefreshCw size={13} />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDiscard}>
            <Trash2 size={13} />
          </Button>
          <Button
            size="sm"
            className="h-7 rounded-xl px-2 text-xs"
            onClick={onApprove}
            disabled={!canApprove || card.saving}
          >
            {card.saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Submit
          </Button>
        </div>
      </div>

      {card.reason && card.verdict !== "pass" && (
        <p className="text-[11px] italic text-muted-foreground">Reviewer: {card.reason}</p>
      )}

      {card.editing ? (
        <div className="space-y-2">
          <Textarea
            rows={3}
            value={card.candidate.question_text}
            onChange={(e) => onUpdate({ question_text: e.target.value })}
          />
          {card.candidate.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name={`c-${card.key}`}
                checked={card.candidate.correct_index === i}
                onChange={() => onUpdate({ correct_index: i })}
                className="accent-primary"
              />
              <Input
                value={opt}
                onChange={(e) => {
                  const next = [...card.candidate.options];
                  next[i] = e.target.value;
                  onUpdate({ options: next });
                }}
              />
            </div>
          ))}
          <Textarea
            rows={2}
            value={card.candidate.explanation}
            onChange={(e) => onUpdate({ explanation: e.target.value })}
          />
        </div>
      ) : (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">{card.candidate.question_text}</p>
          <ul className="space-y-1 text-xs">
            {card.candidate.options.map((opt, i) => (
              <li
                key={i}
                className={`rounded px-2 py-1 ${
                  i === card.candidate.correct_index
                    ? "bg-emerald-500/10 font-medium text-emerald-700 dark:text-emerald-400"
                    : "text-muted-foreground"
                }`}
              >
                {String.fromCharCode(65 + i)}. {opt}
              </li>
            ))}
          </ul>
          {card.candidate.explanation && (
            <p className="text-[11px] text-muted-foreground">{card.candidate.explanation}</p>
          )}
        </div>
      )}
    </div>
  );
}
