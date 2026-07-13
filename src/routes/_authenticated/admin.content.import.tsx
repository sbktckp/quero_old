import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Download, Upload, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/content/import")({
  component: BulkImport,
});

const COLS = [
  "subject", "chapter", "topic", "question_text",
  "option_1", "option_2", "option_3", "option_4", "option_5",
  "correct_option", "explanation", "difficulty", "is_pyq", "pyq_year", "pyq_exam",
] as const;

type Row = Record<(typeof COLS)[number], string>;
type Status = "valid" | "warning" | "error";
type ParsedRow = {
  raw: Row;
  index: number;
  status: Status;
  reasons: string[];
  excluded: boolean;
  createChapter: boolean;
  createTopic: boolean;
};

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}
function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function emptyRow(): Row {
  return Object.fromEntries(COLS.map((c) => [c, ""])) as Row;
}

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => {
    const s = c ?? "";
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function BulkImport() {
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<{ ok: number; failed: { row: Row; reason: string }[] } | null>(null);

  // Reference data for validation
  const { data: refs } = useQuery({
    queryKey: ["import-refs"],
    queryFn: async () => {
      const [subj, chap, top, qs] = await Promise.all([
        supabase.from("subjects").select("id, name"),
        supabase.from("chapters").select("id, name, subject_id"),
        supabase.from("topics").select("id, name, chapter_id"),
        supabase.from("questions").select("subject_id, question_text"),
      ]);
      return {
        subjects: subj.data ?? [],
        chapters: chap.data ?? [],
        topics: top.data ?? [],
        questions: qs.data ?? [],
      };
    },
  });

  const validate = useMemo(() => {
    if (!refs) return null;
    const subjByName = new Map(refs.subjects.map((s) => [normalize(s.name), s]));
    const chapByKey = new Map(refs.chapters.map((c) => [`${c.subject_id}|${normalize(c.name)}`, c]));
    const topByKey = new Map(refs.topics.map((t) => [`${t.chapter_id}|${normalize(t.name)}`, t]));
    const qByKey = new Set(refs.questions.map((q) => `${q.subject_id}|${normalize(q.question_text)}`));

    return (r: Row): Pick<ParsedRow, "status" | "reasons"> & { subjectId?: string; chapterId?: string | null; topicId?: string | null } => {
      const reasons: string[] = [];
      let status: Status = "valid";
      const opts = [r.option_1, r.option_2, r.option_3, r.option_4, r.option_5].map((o) => (o ?? "").trim());
      const nonBlank = opts.filter(Boolean);
      const correct = parseInt(r.correct_option, 10);

      if (!r.question_text?.trim()) { reasons.push("question_text blank"); status = "error"; }
      if (nonBlank.length < 2) { reasons.push("fewer than 2 non-blank options"); status = "error"; }
      if (!Number.isFinite(correct) || correct < 1 || correct > 5) { reasons.push("correct_option missing/out of range"); status = "error"; }
      else if (!opts[correct - 1]) { reasons.push("correct_option points to a blank option"); status = "error"; }

      const subj = subjByName.get(normalize(r.subject ?? ""));
      let subjectId: string | undefined;
      let chapterId: string | null | undefined;
      let topicId: string | null | undefined;
      if (!subj) { reasons.push(`subject "${r.subject}" not found`); status = "error"; }
      else {
        subjectId = subj.id;
        if (r.chapter?.trim()) {
          const chap = chapByKey.get(`${subj.id}|${normalize(r.chapter)}`);
          if (chap) chapterId = chap.id;
          else { reasons.push(`chapter "${r.chapter}" not found under subject`); if (status === "valid") status = "warning"; chapterId = null; }
        } else chapterId = null;

        if (r.topic?.trim()) {
          if (chapterId) {
            const top = topByKey.get(`${chapterId}|${normalize(r.topic)}`);
            if (top) topicId = top.id;
            else { reasons.push(`topic "${r.topic}" not found under chapter`); if (status === "valid") status = "warning"; topicId = null; }
          } else {
            reasons.push(`topic "${r.topic}" requires a chapter`); if (status === "valid") status = "warning"; topicId = null;
          }
        } else topicId = null;

        if (r.question_text?.trim() && qByKey.has(`${subj.id}|${normalize(r.question_text)}`)) {
          reasons.push("near-duplicate of an existing question in this subject");
          if (status === "valid") status = "warning";
        }
      }
      return { status, reasons, subjectId, chapterId, topicId };
    };
  }, [refs]);

  async function handleFile(file: File) {
    if (!validate) { toast.error("Reference data not ready"); return; }
    setParsing(true);
    setResult(null);
    try {
      const parsed = await parseFile(file);
      // Yield to UI in chunks while validating
      const out: ParsedRow[] = [];
      const CHUNK = 100;
      for (let i = 0; i < parsed.length; i += CHUNK) {
        const slice = parsed.slice(i, i + CHUNK).map((raw, j) => {
          const v = validate(raw);
          return { raw, index: i + j, status: v.status, reasons: v.reasons, excluded: false, createChapter: false, createTopic: false } satisfies ParsedRow;
        });
        out.push(...slice);
        await new Promise((r) => setTimeout(r, 0));
      }
      setRows(out);
      toast.success(`Parsed ${out.length} rows`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Parse failed");
    } finally {
      setParsing(false);
    }
  }

  async function parseFile(file: File): Promise<Row[]> {
    const name = file.name.toLowerCase();
    if (name.endsWith(".csv")) {
      return await new Promise<Row[]>((resolve, reject) => {
        Papa.parse<Row>(file, {
          header: true, skipEmptyLines: true,
          complete: (res) => resolve(res.data.map((r) => ({ ...emptyRow(), ...r }))),
          error: (err: Error) => reject(err),
        });
      });
    }
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      return json.map((r) => {
        const row = emptyRow();
        for (const c of COLS) row[c] = String(r[c] ?? "");
        return row;
      });
    }
    throw new Error("Unsupported file type (use .csv or .xlsx)");
  }

  const counts = useMemo(() => {
    if (!rows) return { valid: 0, warning: 0, error: 0 };
    return rows.reduce((acc, r) => {
      if (r.excluded) return acc;
      acc[r.status] += 1;
      return acc;
    }, { valid: 0, warning: 0, error: 0 } as Record<Status, number>);
  }, [rows]);

  function updateRow(i: number, patch: Partial<ParsedRow> & { raw?: Partial<Row> }) {
    if (!validate || !rows) return;
    setRows((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const cur = next[i];
      const newRaw = patch.raw ? { ...cur.raw, ...patch.raw } : cur.raw;
      const v = validate(newRaw);
      next[i] = { ...cur, ...patch, raw: newRaw, status: v.status, reasons: v.reasons };
      return next;
    });
  }

  async function commit() {
    if (!rows || !validate) return;
    setCommitting(true);
    const failed: { row: Row; reason: string }[] = [];
    let ok = 0;
    for (const r of rows) {
      if (r.excluded) continue;
      if (r.status === "error") { failed.push({ row: r.raw, reason: r.reasons.join("; ") }); continue; }
      try {
        const v = validate(r.raw);
        if (!v.subjectId) throw new Error("subject not found");
        let chapterId: string | null = v.chapterId ?? null;
        let topicId: string | null = v.topicId ?? null;

        if (!chapterId && r.raw.chapter?.trim() && r.createChapter) {
          const name = r.raw.chapter.trim();
          const { data, error } = await supabase.from("chapters").insert({ subject_id: v.subjectId, name, slug: slugify(name) }).select("id").single();
          if (error) throw error;
          chapterId = data.id;
        }
        if (!topicId && r.raw.topic?.trim() && chapterId && r.createTopic) {
          const name = r.raw.topic.trim();
          const { data, error } = await supabase.from("topics").insert({ chapter_id: chapterId, name }).select("id").single();
          if (error) throw error;
          topicId = data.id;
        }
        // If there are unresolved warnings that the admin did not accept, skip
        if (r.status === "warning") {
          if (r.raw.chapter?.trim() && !chapterId) { failed.push({ row: r.raw, reason: "chapter not resolved (check 'create')" }); continue; }
          if (r.raw.topic?.trim() && !topicId && chapterId) { failed.push({ row: r.raw, reason: "topic not resolved (check 'create')" }); continue; }
        }

        const opts = [r.raw.option_1, r.raw.option_2, r.raw.option_3, r.raw.option_4, r.raw.option_5]
          .map((o) => (o ?? "").trim());
        const correct = parseInt(r.raw.correct_option, 10);
        const payload = {
          subject_id: v.subjectId,
          chapter_id: chapterId,
          topic_id: topicId,
          question_text: r.raw.question_text.trim(),
          explanation: r.raw.explanation?.trim() || null,
          difficulty: r.raw.difficulty?.trim().toLowerCase() || null,
          is_pyq: /^(true|1|yes)$/i.test((r.raw.is_pyq ?? "").trim()),
          pyq_year: r.raw.pyq_year?.trim() || null,
          pyq_exam: r.raw.pyq_exam?.trim() || null,
          options: opts.map((text, idx) => ({ text, is_correct: idx + 1 === correct })).filter((o) => o.text),
        };
        const { error } = await supabase.rpc("admin_insert_question_with_options", { _payload: payload });
        if (error) throw error;
        ok += 1;
      } catch (e) {
        failed.push({ row: r.raw, reason: e instanceof Error ? e.message : String(e) });
      }
    }
    setResult({ ok, failed });
    setCommitting(false);
    toast.success(`${ok} questions imported`);
  }

  function downloadTemplate() {
    downloadCSV("quero-mcq-template.csv", [
      [...COLS],
      ["Physics", "Kinematics", "Motion in a straight line", "What is the SI unit of velocity?", "m/s", "m/s²", "km/h", "cm/s", "", "1", "Velocity is displacement per unit time", "easy", "false", "", ""],
    ]);
  }

  function downloadErrors() {
    if (!result?.failed.length) return;
    downloadCSV("errors.csv", [
      [...COLS, "reason"],
      ...result.failed.map((f) => [...COLS.map((c) => f.row[c] ?? ""), f.reason]),
    ]);
  }

  return (
    <div className="space-y-4">
      <Link to="/admin/content" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Back to content
      </Link>

      <div className="rounded-2xl bg-card border border-border p-5 shadow-card space-y-4">
        <div>
          <h2 className="text-lg font-bold">Bulk import questions</h2>
          <p className="text-sm text-muted-foreground">Accepts .csv and .xlsx. Up to 500+ rows. Nothing is written until you commit.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={downloadTemplate}><Download size={14} /> Download CSV template</Button>
          <label>
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <Button asChild><span><Upload size={14} /> {parsing ? "Parsing…" : "Upload file"}</span></Button>
          </label>
        </div>
      </div>

      {parsing && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin" size={14} /> Parsing…</div>}

      {rows && (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <Badge className="gap-1"><CheckCircle2 size={12} /> {counts.valid} valid</Badge>
            <Badge variant="secondary" className="gap-1"><AlertTriangle size={12} /> {counts.warning} warning</Badge>
            <Badge variant="destructive" className="gap-1"><XCircle size={12} /> {counts.error} error</Badge>
            <div className="ml-auto">
              <Button onClick={commit} disabled={committing || counts.valid + counts.warning === 0}>
                {committing ? <><Loader2 size={14} className="animate-spin" /> Importing…</> : `Import ${counts.valid + counts.warning} rows`}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground bg-muted/40 sticky top-0">
                  <tr>
                    <th className="text-left px-2 py-2">#</th>
                    <th className="text-left px-2 py-2">Status</th>
                    <th className="text-left px-2 py-2">Subject</th>
                    <th className="text-left px-2 py-2">Chapter</th>
                    <th className="text-left px-2 py-2">Topic</th>
                    <th className="text-left px-2 py-2 min-w-64">Question</th>
                    <th className="text-left px-2 py-2">Correct</th>
                    <th className="text-left px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className={`border-t border-border ${r.excluded ? "opacity-40" : ""}`}>
                      <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                      <td className="px-2 py-1.5">
                        {r.status === "valid" && <CheckCircle2 size={14} className="text-success" />}
                        {r.status === "warning" && <AlertTriangle size={14} className="text-warning" />}
                        {r.status === "error" && <XCircle size={14} className="text-destructive" />}
                      </td>
                      <td className="px-2 py-1.5"><CellInput value={r.raw.subject} onChange={(v) => updateRow(i, { raw: { subject: v } })} /></td>
                      <td className="px-2 py-1.5">
                        <CellInput value={r.raw.chapter} onChange={(v) => updateRow(i, { raw: { chapter: v } })} />
                        {r.status === "warning" && r.raw.chapter && r.reasons.some((x) => x.startsWith("chapter")) && (
                          <label className="flex items-center gap-1 mt-1 text-[10px]"><Checkbox checked={r.createChapter} onCheckedChange={(c) => updateRow(i, { createChapter: !!c })} /> create</label>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <CellInput value={r.raw.topic} onChange={(v) => updateRow(i, { raw: { topic: v } })} />
                        {r.status === "warning" && r.raw.topic && r.reasons.some((x) => x.startsWith("topic")) && (
                          <label className="flex items-center gap-1 mt-1 text-[10px]"><Checkbox checked={r.createTopic} onCheckedChange={(c) => updateRow(i, { createTopic: !!c })} /> create</label>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <CellInput value={r.raw.question_text} onChange={(v) => updateRow(i, { raw: { question_text: v } })} />
                        {r.reasons.length > 0 && <div className="text-[10px] text-muted-foreground mt-1">{r.reasons.join("; ")}</div>}
                      </td>
                      <td className="px-2 py-1.5">
                        <CellInput value={r.raw.correct_option} onChange={(v) => updateRow(i, { raw: { correct_option: v } })} width="w-12" />
                      </td>
                      <td className="px-2 py-1.5">
                        <button className="text-xs text-muted-foreground hover:text-destructive underline" onClick={() => updateRow(i, { excluded: !r.excluded })}>
                          {r.excluded ? "include" : "exclude"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {result && (
        <div className="rounded-2xl bg-card border border-border p-5 shadow-card space-y-3">
          <div className="font-semibold">{result.ok} questions imported successfully.</div>
          {result.failed.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{result.failed.length} row(s) failed.</span>
              <Button size="sm" variant="outline" onClick={downloadErrors}><Download size={14} /> Download errors.csv</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CellInput({ value, onChange, width = "w-32" }: { value: string; onChange: (v: string) => void; width?: string }) {
  return <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={`h-7 text-xs ${width}`} />;
}
