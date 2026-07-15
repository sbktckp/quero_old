import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { generateMcqs, validateMcq, type McqCandidate } from "@/lib/admin-ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Loader2, CheckCircle2, AlertTriangle, XCircle, Trash2, Pencil, RefreshCw, Check, StopCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/content/generate")({
  component: GeneratePage,
});

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

type Subject = { id: string; name: string };
type Chapter = { id: string; subject_id: string; name: string };
type Topic = { id: string; chapter_id: string; name: string };

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

function GeneratePage() {
  const navigate = useNavigate();
  const genFn = useServerFn(generateMcqs);
  const valFn = useServerFn(validateMcq);

  // Settings
  const [notes, setNotes] = useState("");
  const [exam, setExam] = useState<"NEET UG" | "NEET PG">("NEET UG");
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState<string>("__ai__");
  const [topicId, setTopicId] = useState<string>("__ai__");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [count, setCount] = useState(10);

  // Run state
  const [running, setRunning] = useState(false);
  const stopRef = useRef(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [cards, setCards] = useState<Card[]>([]);
  const [banner, setBanner] = useState<string | null>(null);

  const { data: subjects = [] } = useQuery({
    queryKey: ["adm-subjects"],
    queryFn: async () => (await supabase.from("subjects").select("id, name").order("sort_order")).data as Subject[],
  });
  const { data: chapters = [] } = useQuery({
    queryKey: ["adm-chapters", subjectId], enabled: !!subjectId,
    queryFn: async () => (await supabase.from("chapters").select("id, subject_id, name").eq("subject_id", subjectId).order("sort_order")).data as Chapter[],
  });
  const { data: topics = [] } = useQuery({
    queryKey: ["adm-topics", chapterId], enabled: !!chapterId && chapterId !== "__ai__",
    queryFn: async () => (await supabase.from("topics").select("id, chapter_id, name").eq("chapter_id", chapterId)).data as Topic[],
  });

  const subjectName = subjects.find((s) => s.id === subjectId)?.name ?? "";
  const chapterName = chapters.find((c) => c.id === chapterId)?.name;
  const topicName = topics.find((t) => t.id === topicId)?.name;

  async function fetchExistingTextsForSubject(subjId: string): Promise<Set<string>> {
    const set = new Set<string>();
    let from = 0;
    const size = 1000;
    // Fetch up to a few pages; realistic subject libraries fit.
    for (let page = 0; page < 5; page++) {
      const { data, error } = await supabase.from("questions").select("id, question_text").eq("subject_id", subjId).range(from, from + size - 1);
      if (error || !data || data.length === 0) break;
      for (const r of data) set.add(norm(r.question_text));
      if (data.length < size) break;
      from += size;
    }
    return set;
  }

  async function readFile(file: File) {
    const text = await file.text();
    setNotes((prev) => (prev ? prev + "\n\n" : "") + text);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) readFile(f);
    e.target.value = "";
  }

  const passing = cards.filter((c) => c.verdict === "pass" && !c.saved);

  async function processCandidate(cand: McqCandidate, existing: Set<string>): Promise<Card> {
    const key = crypto.randomUUID();
    const normText = norm(cand.question_text);
    if (existing.has(normText)) {
      return { key, candidate: cand, verdict: "reject", reason: "Duplicate of an existing question in this subject", edited: false, saved: false, saving: false, editing: false };
    }
    try {
      const result = await valFn({ data: { candidate: cand } });
      const finalCand = result.verdict === "revise" && result.corrected_question ? result.corrected_question : cand;
      existing.add(norm(finalCand.question_text));
      return {
        key,
        candidate: finalCand,
        verdict: result.verdict,
        reason: result.reason ?? undefined,
        edited: false, saved: false, saving: false, editing: false,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "validator failed";
      return { key, candidate: cand, verdict: "reject", reason: msg, edited: false, saved: false, saving: false, editing: false };
    }
  }

  async function start() {
    if (!subjectId) { toast.error("Choose a subject"); return; }
    if (notes.trim().length < 20) { toast.error("Paste some notes first"); return; }
    if (count < 1) { toast.error("Question count must be at least 1"); return; }

    setBanner(null);
    setCards([]);
    setProgress({ done: 0, total: count });
    setRunning(true);
    stopRef.current = false;

    const existing = await fetchExistingTextsForSubject(subjectId);
    let remaining = count;

    while (remaining > 0 && !stopRef.current) {
      const chunk = Math.min(10, remaining);
      try {
        const { candidates } = await genFn({
          data: {
            notes,
            exam,
            subjectName,
            chapterHint: chapterId === "__ai__" ? null : chapterName ?? null,
            topicHint: topicId === "__ai__" ? null : topicName ?? null,
            difficulty,
            count: chunk,
            suggestTaxonomy: chapterId === "__ai__" || topicId === "__ai__",
          },
        });
        if (candidates.length === 0) {
          toast.error("Model returned no valid questions this chunk");
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
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`Generation failed: ${msg}`);
        break;
      }
    }
    setRunning(false);
  }

  function stop() { stopRef.current = true; }

  async function resolveChapterTopicIds(cand: McqCandidate): Promise<{ chapter_id: string | null; topic_id: string | null } | null> {
    // Chapter
    let finalChapterId: string | null = null;
    if (chapterId !== "__ai__") {
      finalChapterId = chapterId;
    } else if (cand.suggested_chapter) {
      const match = chapters.find((c) => norm(c.name) === norm(cand.suggested_chapter!));
      if (match) finalChapterId = match.id;
      else {
        const ok = confirm(`Create new chapter "${cand.suggested_chapter}" under ${subjectName}?`);
        if (!ok) return null;
        const { data, error } = await supabase.from("chapters").insert({
          subject_id: subjectId, name: cand.suggested_chapter,
          slug: cand.suggested_chapter.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
          sort_order: 0,
        }).select("id").single();
        if (error || !data) { toast.error(error?.message ?? "Failed to create chapter"); return null; }
        finalChapterId = data.id;
      }
    }

    // Topic
    let finalTopicId: string | null = null;
    if (topicId !== "__ai__") {
      finalTopicId = topicId || null;
    } else if (finalChapterId && cand.suggested_topic) {
      const { data: tRows } = await supabase.from("topics").select("id, name").eq("chapter_id", finalChapterId);
      const match = (tRows ?? []).find((t) => norm(t.name) === norm(cand.suggested_topic!));
      if (match) finalTopicId = match.id;
      else {
        const ok = confirm(`Create new topic "${cand.suggested_topic}" under this chapter?`);
        if (ok) {
          const { data, error } = await supabase.from("topics").insert({ chapter_id: finalChapterId, name: cand.suggested_topic }).select("id").single();
          if (!error && data) finalTopicId = data.id;
        }
      }
    }

    return { chapter_id: finalChapterId, topic_id: finalTopicId };
  }

  async function saveCard(card: Card): Promise<boolean> {
    if (card.saved) return true;
    if (card.verdict !== "pass" && !card.edited) {
      toast.error("Edit the question before approving");
      return false;
    }
    setCards((prev) => prev.map((c) => (c.key === card.key ? { ...c, saving: true } : c)));
    const ids = await resolveChapterTopicIds(card.candidate);
    if (!ids) {
      setCards((prev) => prev.map((c) => (c.key === card.key ? { ...c, saving: false } : c)));
      return false;
    }
    const payload = {
      subject_id: subjectId,
      chapter_id: ids.chapter_id,
      topic_id: ids.topic_id,
      question_text: card.candidate.question_text,
      explanation: card.candidate.explanation,
      difficulty: card.candidate.difficulty,
      is_pyq: false,
      options: card.candidate.options.map((text, i) => ({ text, is_correct: i === card.candidate.correct_index })),
    };
    const { error } = await supabase.rpc("admin_insert_question_with_options", { _payload: payload });
    if (error) {
      toast.error(error.message);
      setCards((prev) => prev.map((c) => (c.key === card.key ? { ...c, saving: false } : c)));
      return false;
    }
    setCards((prev) => prev.map((c) => (c.key === card.key ? { ...c, saving: false, saved: true } : c)));
    return true;
  }

  async function approveAllPassing() {
    for (const card of cards.filter((c) => c.verdict === "pass" && !c.saved)) {
      await saveCard(card);
    }
    const savedCount = cards.filter((c) => c.saved).length;
    toast.success(`Approved ${savedCount} questions`);
  }

  async function regenerate(card: Card) {
    setCards((prev) => prev.map((c) => (c.key === card.key ? { ...c, saving: true } : c)));
    try {
      const { candidates } = await genFn({
        data: {
          notes, exam, subjectName,
          chapterHint: chapterId === "__ai__" ? null : chapterName ?? null,
          topicHint: topicId === "__ai__" ? null : topicName ?? null,
          difficulty, count: 1,
          suggestTaxonomy: chapterId === "__ai__" || topicId === "__ai__",
        },
      });
      if (candidates.length === 0) { toast.error("No question returned"); setCards((prev) => prev.map((c) => (c.key === card.key ? { ...c, saving: false } : c))); return; }
      const result = await valFn({ data: { candidate: candidates[0] } });
      const finalCand = result.verdict === "revise" && result.corrected_question ? result.corrected_question : candidates[0];
      setCards((prev) => prev.map((c) => c.key === card.key ? {
        ...c, candidate: finalCand, verdict: result.verdict, reason: result.reason ?? undefined, edited: false, saving: false,
      } : c));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Regenerate failed");
      setCards((prev) => prev.map((c) => (c.key === card.key ? { ...c, saving: false } : c)));
    }
  }

  function discard(card: Card) {
    setCards((prev) => prev.filter((c) => c.key !== card.key));
  }

  function toggleEdit(card: Card) {
    setCards((prev) => prev.map((c) => c.key === card.key ? { ...c, editing: !c.editing } : c));
  }

  function updateCandidate(card: Card, patch: Partial<McqCandidate>) {
    setCards((prev) => prev.map((c) => c.key === card.key ? { ...c, edited: true, candidate: { ...c.candidate, ...patch } } : c));
  }

  const savedCount = cards.filter((c) => c.saved).length;
  const passCount = cards.filter((c) => c.verdict === "pass").length;
  const reviseCount = cards.filter((c) => c.verdict === "revise").length;
  const rejectCount = cards.filter((c) => c.verdict === "reject").length;

  // Finalize banner when target reached and idle
  if (!running && progress.total > 0 && !banner && (progress.done >= progress.total || stopRef.current)) {
    const discarded = progress.done - savedCount;
    // schedule so it renders once
    setTimeout(() => setBanner(`${savedCount} approved and saved, ${discarded} not yet approved`), 0);
  }

  return (
    <div className="space-y-4">
      <Link to="/admin/content" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Back to content
      </Link>

      <div className="rounded-2xl bg-card border border-border p-5 shadow-card space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-primary" />
          <h1 className="text-lg font-bold">AI MCQ Generator</h1>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Paste notes / textbook excerpt</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={8} placeholder="Paste the material to generate MCQs from…" />
            <div className="mt-1 flex items-center gap-2 text-xs">
              <label className="text-muted-foreground cursor-pointer hover:text-foreground">
                <input type="file" accept=".txt,.md,text/plain,text/markdown" className="hidden" onChange={handleFile} />
                or upload a .txt / .md file
              </label>
              <span className="text-muted-foreground">· {notes.length} chars</span>
            </div>
          </div>

          <div>
            <Label>Exam</Label>
            <Select value={exam} onValueChange={(v) => setExam(v as typeof exam)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NEET UG">NEET UG</SelectItem>
                <SelectItem value="NEET PG">NEET PG</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={(v) => { setSubjectId(v); setChapterId("__ai__"); setTopicId("__ai__"); }}>
              <SelectTrigger><SelectValue placeholder="Choose subject" /></SelectTrigger>
              <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Chapter</Label>
            <Select value={chapterId} onValueChange={(v) => { setChapterId(v); setTopicId("__ai__"); }} disabled={!subjectId}>
              <SelectTrigger><SelectValue placeholder="Chapter" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__ai__">Let AI suggest</SelectItem>
                {chapters.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Topic</Label>
            <Select value={topicId} onValueChange={setTopicId} disabled={chapterId === "__ai__" || !chapterId}>
              <SelectTrigger><SelectValue placeholder="Topic" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__ai__">Let AI suggest</SelectItem>
                {topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Question count (max 100)</Label>
            <Input type="number" min={1} max={100} value={count} onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!running ? (
            <Button onClick={start} disabled={!subjectId || notes.trim().length < 20}><Sparkles size={14} /> Start</Button>
          ) : (
            <Button variant="destructive" onClick={stop}><StopCircle size={14} /> Stop after current chunk</Button>
          )}
          {cards.length > 0 && !running && passCount > 0 && (
            <Button variant="outline" onClick={approveAllPassing}><Check size={14} /> Approve all passing</Button>
          )}
          <Button variant="ghost" onClick={() => navigate({ to: "/admin/content" })}>Done</Button>
        </div>

        {(running || progress.total > 0) && (
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              {running && <Loader2 size={12} className="animate-spin" />}
              <span>{progress.done} / {progress.total} generated</span>
              <span>·</span>
              <span className="text-green-600">Pass {passCount}</span>
              <span>·</span>
              <span className="text-yellow-600">Needs review {reviseCount}</span>
              <span>·</span>
              <span className="text-red-600">Rejected {rejectCount}</span>
              <span>·</span>
              <span>Saved {savedCount}</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress.total ? Math.min(100, (progress.done / progress.total) * 100) : 0}%` }} />
            </div>
          </div>
        )}

        {banner && (
          <div className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-sm">{banner}</div>
        )}
      </div>

      <div className="space-y-3">
        {cards.map((card) => (
          <CardView key={card.key} card={card}
            onEdit={() => toggleEdit(card)}
            onApprove={() => saveCard(card)}
            onRegenerate={() => regenerate(card)}
            onDiscard={() => discard(card)}
            onUpdate={(patch) => updateCandidate(card, patch)} />
        ))}
      </div>
    </div>
  );
}

function CardView({ card, onEdit, onApprove, onRegenerate, onDiscard, onUpdate }: {
  card: Card;
  onEdit: () => void;
  onApprove: () => void;
  onRegenerate: () => void;
  onDiscard: () => void;
  onUpdate: (patch: Partial<McqCandidate>) => void;
}) {
  const badge = card.verdict === "pass"
    ? <Badge className="bg-green-600 hover:bg-green-600"><CheckCircle2 size={12} className="mr-1" /> Pass</Badge>
    : card.verdict === "revise"
    ? <Badge className="bg-yellow-500 hover:bg-yellow-500"><AlertTriangle size={12} className="mr-1" /> Needs review</Badge>
    : <Badge className="bg-red-600 hover:bg-red-600"><XCircle size={12} className="mr-1" /> Rejected</Badge>;

  const canApprove = !card.saved && (card.verdict === "pass" || card.edited);

  return (
    <div className={`rounded-2xl border shadow-card p-4 space-y-3 ${card.saved ? "bg-muted/40 border-border" : "bg-card border-border"}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {badge}
          {card.saved && <Badge variant="secondary"><CheckCircle2 size={12} className="mr-1" /> Saved</Badge>}
          {card.edited && !card.saved && <Badge variant="outline">Edited</Badge>}
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={onEdit} disabled={card.saved}><Pencil size={14} /> {card.editing ? "Done" : "Edit"}</Button>
          <Button size="sm" variant="ghost" onClick={onRegenerate} disabled={card.saved || card.saving}><RefreshCw size={14} /> Regenerate</Button>
          <Button size="sm" variant="ghost" onClick={onDiscard}><Trash2 size={14} /></Button>
          <Button size="sm" onClick={onApprove} disabled={!canApprove || card.saving}>
            {card.saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve
          </Button>
        </div>
      </div>

      {card.reason && card.verdict !== "pass" && (
        <div className="text-xs text-muted-foreground italic">Reviewer: {card.reason}</div>
      )}

      {card.editing ? (
        <div className="space-y-2">
          <Textarea value={card.candidate.question_text} onChange={(e) => onUpdate({ question_text: e.target.value })} rows={3} />
          {card.candidate.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name={`c-${card.key}`} checked={card.candidate.correct_index === i} onChange={() => onUpdate({ correct_index: i })} />
              <Input value={opt} onChange={(e) => {
                const next = [...card.candidate.options];
                next[i] = e.target.value;
                onUpdate({ options: next });
              }} />
            </div>
          ))}
          <Label className="text-xs">Explanation</Label>
          <Textarea value={card.candidate.explanation} onChange={(e) => onUpdate({ explanation: e.target.value })} rows={2} />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="font-medium text-sm">{card.candidate.question_text}</div>
          <ul className="space-y-1 text-sm">
            {card.candidate.options.map((opt, i) => (
              <li key={i} className={`rounded px-2 py-1 ${i === card.candidate.correct_index ? "bg-green-500/10 text-green-700 dark:text-green-400 font-medium" : "text-muted-foreground"}`}>
                {String.fromCharCode(65 + i)}. {opt}
              </li>
            ))}
          </ul>
          {card.candidate.explanation && (
            <div className="text-xs text-muted-foreground"><span className="font-semibold">Explanation:</span> {card.candidate.explanation}</div>
          )}
          <div className="text-xs text-muted-foreground flex gap-3">
            <span>Difficulty: {card.candidate.difficulty}</span>
            {card.candidate.suggested_chapter && <span>Suggested chapter: {card.candidate.suggested_chapter}</span>}
            {card.candidate.suggested_topic && <span>Suggested topic: {card.candidate.suggested_topic}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
