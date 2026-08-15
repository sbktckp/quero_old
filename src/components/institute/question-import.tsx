import { useMemo, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { callRpc, type ImportBatchRow, type RpcStatus } from "@/lib/institute-tests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Download, Upload, CheckCircle2, AlertTriangle, XCircle, Loader2, Undo2, X, FileSpreadsheet,
} from "lucide-react";

/*
  Bulk import for an institute admin. Unlike the per-row faculty importer this
  goes through import_questions_batch(), which does the work the client cannot:
  it resolves subject / chapter / topic names against the institute's own
  taxonomy plus the shared one, rejects duplicate stems using the normalised
  stem index, and records a question_import_batches row so a bad file can be
  undone in one click instead of hand-deleting rows.

  Questions are text only for now: a stem, up to five text options and an
  explanation. No images, no LaTeX rendering.
*/

const COLS = [
  "subject", "chapter", "topic", "question_text",
  "option_1", "option_2", "option_3", "option_4", "option_5",
  "correct_option", "explanation", "difficulty", "is_pyq", "pyq_year", "pyq_exam",
] as const;

type Row = Record<(typeof COLS)[number], string>;
type Status = "valid" | "error";
type ParsedRow = { raw: Row; status: Status; reasons: string[]; excluded: boolean };

/** Rows per RPC call. Big enough to be fast, small enough to keep progress moving. */
const CHUNK = 100;

function emptyRow(): Row {
  return Object.fromEntries(COLS.map((c) => [c, ""])) as Row;
}

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows
    .map((r) =>
      r
        .map((c) => {
          const s = c ?? "";
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function validate(r: Row): { status: Status; reasons: string[] } {
  const reasons: string[] = [];
  const opts = [r.option_1, r.option_2, r.option_3, r.option_4, r.option_5].map((o) => (o ?? "").trim());
  const correct = parseInt(r.correct_option, 10);

  if (!r.subject?.trim()) reasons.push("subject blank");
  if (!r.question_text?.trim()) reasons.push("question_text blank");
  if (opts.filter(Boolean).length < 2) reasons.push("fewer than 2 options");
  if (!Number.isFinite(correct) || correct < 1 || correct > 5) reasons.push("correct_option must be 1 to 5");
  else if (!opts[correct - 1]) reasons.push("correct_option points at a blank option");

  return { status: reasons.length ? "error" : "valid", reasons };
}

/** One CSV row to the shape import_questions_batch expects (correct_index is 0 based). */
function toPayload(r: Row) {
  const opts = [r.option_1, r.option_2, r.option_3, r.option_4, r.option_5]
    .map((o) => (o ?? "").trim())
    .filter(Boolean);
  return {
    subject: r.subject.trim(),
    chapter: r.chapter?.trim() || null,
    topic: r.topic?.trim() || null,
    question: r.question_text.trim(),
    options: opts,
    correct_index: parseInt(r.correct_option, 10) - 1,
    explanation: r.explanation?.trim() || null,
    difficulty: r.difficulty?.trim().toLowerCase() || null,
    is_pyq: /^(true|1|yes)$/i.test((r.is_pyq ?? "").trim()),
    pyq_year: r.pyq_year?.trim() || null,
    pyq_exam: r.pyq_exam?.trim() || null,
  };
}

export function QuestionImport({
  instituteId,
  onClose,
  onDone,
}: {
  instituteId: string;
  onClose?: () => void;
  onDone?: () => void;
}) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [label, setLabel] = useState("");
  const [autoApprove, setAutoApprove] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{
    inserted: number;
    skipped: number;
    problems: { row: number; reason: string }[];
  } | null>(null);

  const { data: batches = [] } = useQuery({
    queryKey: ["import-batches", instituteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("question_import_batches")
        .select("id, source_label, inserted_count, skipped_count, created_at, undone_at")
        .eq("institute_id", instituteId)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as ImportBatchRow[];
    },
  });

  const counts = useMemo(() => {
    const base = { valid: 0, error: 0 };
    if (!rows) return base;
    for (const r of rows) {
      if (r.excluded) continue;
      base[r.status] += 1;
    }
    return base;
  }, [rows]);

  async function parseFile(file: File): Promise<Row[]> {
    const name = file.name.toLowerCase();
    if (name.endsWith(".csv")) {
      return await new Promise<Row[]>((resolve, reject) => {
        Papa.parse<Row>(file, {
          header: true,
          skipEmptyLines: true,
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
    throw new Error("Unsupported file type. Use .csv or .xlsx");
  }

  async function handleFile(file: File) {
    setParsing(true);
    setResult(null);
    try {
      const parsed = await parseFile(file);
      setRows(parsed.map((raw) => ({ raw, ...validate(raw), excluded: false })));
      if (!label.trim()) setLabel(file.name.replace(/\.[^.]+$/, ""));
      toast.success(`Parsed ${parsed.length} rows`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Parse failed");
    } finally {
      setParsing(false);
    }
  }

  async function commit() {
    if (!rows) return;
    const keep = rows.filter((r) => !r.excluded && r.status === "valid");
    if (keep.length === 0) return toast.error("Nothing valid to import");

    setProgress({ done: 0, total: keep.length });
    let inserted = 0;
    let skipped = 0;
    const problems: { row: number; reason: string }[] = [];

    try {
      for (let i = 0; i < keep.length; i += CHUNK) {
        const slice = keep.slice(i, i + CHUNK);
        const res = await callRpc<{
          inserted: number;
          skipped: number;
          problems: { row: number; reason: string }[];
        }>("import_questions_batch", {
          _institute_id: instituteId,
          _source_label: label.trim() || "Bulk import",
          _rows: slice.map((r) => toPayload(r.raw)),
          _auto_approve: autoApprove,
        });
        inserted += res?.inserted ?? 0;
        skipped += res?.skipped ?? 0;
        // Problem rows are numbered within their chunk, so shift them back to
        // the row number the admin sees in the table.
        for (const p of res?.problems ?? []) problems.push({ row: p.row + i, reason: p.reason });
        setProgress({ done: Math.min(i + CHUNK, keep.length), total: keep.length });
      }
      setResult({ inserted, skipped, problems });
      toast.success(
        autoApprove
          ? `${inserted} questions imported and approved`
          : `${inserted} questions imported, waiting in the review queue`,
      );
      qc.invalidateQueries({ queryKey: ["import-batches"] });
      qc.invalidateQueries({ queryKey: ["institute-review-queue"] });
      onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setProgress(null);
    }
  }

  async function undo(batchId: string) {
    if (!confirm("Delete every question from that import? Questions already used in a test are kept and the undo is refused."))
      return;
    try {
      const res = await callRpc<RpcStatus>("undo_question_import", { _batch_id: batchId });
      if (res?.status === "blocked") return toast.error(res.message ?? "Some questions are in use");
      toast.success("Import undone");
      qc.invalidateQueries({ queryKey: ["import-batches"] });
      qc.invalidateQueries({ queryKey: ["institute-review-queue"] });
      onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not undo");
    }
  }

  function downloadTemplate() {
    downloadCSV("quero-question-import-template.csv", [
      [...COLS],
      [
        "Physics",
        "Laws of Motion",
        "Newton's second law",
        "A body of mass 2 kg accelerates at 3 m/s2. What is the net force on it?",
        "6 N",
        "1.5 N",
        "5 N",
        "0.67 N",
        "",
        "1",
        "F equals m times a, so 2 times 3 is 6 N.",
        "easy",
        "false",
        "",
        "",
      ],
    ]);
  }

  return (
    <div className="rounded-3xl bg-card border border-border p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <FileSpreadsheet size={16} className="text-primary" /> Bulk import questions
        </h2>
        {onClose && (
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X size={16} />
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Accepts .csv and .xlsx. Subject, chapter and topic are matched by name against the shared
        NEET taxonomy and your own. Duplicate stems are skipped automatically, and any import can be
        undone until its questions are used in a test.
      </p>

      <div className="grid gap-2">
        <div>
          <Label className="text-xs">Source label</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="NTA 2024 Physics paper"
          />
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            className="accent-primary"
            checked={autoApprove}
            onChange={(e) => setAutoApprove(e.target.checked)}
          />
          Approve on import (uncheck to send everything to the review queue first)
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="rounded-2xl" onClick={downloadTemplate}>
          <Download size={14} /> Template
        </Button>
        <label>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Button asChild size="sm" className="rounded-2xl">
            <span>
              <Upload size={14} /> {parsing ? "Parsing" : "Upload file"}
            </span>
          </Button>
        </label>
      </div>

      {rows && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="gap-1">
              <CheckCircle2 size={12} /> {counts.valid} ready
            </Badge>
            <Badge variant="destructive" className="gap-1">
              <XCircle size={12} /> {counts.error} unusable
            </Badge>
            <Button
              size="sm"
              className="ml-auto rounded-2xl"
              disabled={!!progress || counts.valid === 0}
              onClick={commit}
            >
              {progress ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> {progress.done} / {progress.total}
                </>
              ) : (
                `Import ${counts.valid}`
              )}
            </Button>
          </div>

          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="max-h-[45vh] overflow-y-auto divide-y divide-border">
              {rows.map((r, i) => (
                <div key={i} className={`p-3 text-xs ${r.excluded ? "opacity-40" : ""}`}>
                  <div className="flex items-start gap-2">
                    {r.status === "valid" ? (
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertTriangle size={14} className="mt-0.5 shrink-0 text-destructive" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 font-medium">{r.raw.question_text || "(blank)"}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {[r.raw.subject, r.raw.chapter, r.raw.topic].filter(Boolean).join(" / ") || "untagged"}
                      </div>
                      {r.reasons.length > 0 && (
                        <div className="mt-1 text-[11px] text-destructive">{r.reasons.join("; ")}</div>
                      )}
                    </div>
                    <button
                      className="shrink-0 text-[11px] text-muted-foreground underline hover:text-destructive"
                      onClick={() =>
                        setRows((prev) =>
                          prev
                            ? prev.map((x, j) => (j === i ? { ...x, excluded: !x.excluded } : x))
                            : prev,
                        )
                      }
                    >
                      {r.excluded ? "include" : "skip"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {result && (
        <div className="rounded-2xl border border-border p-4 text-sm">
          <div className="font-semibold">
            {result.inserted} imported, {result.skipped} skipped.
          </div>
          {result.problems.length > 0 && (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-[11px] text-muted-foreground">
              {result.problems.slice(0, 50).map((p, i) => (
                <li key={i}>
                  Row {p.row}: {p.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {batches.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground">Recent imports</h3>
          <ul className="mt-2 space-y-2">
            {batches.map((b) => (
              <li key={b.id} className="flex items-center gap-3 rounded-2xl border border-border p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{b.source_label ?? "Import"}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {b.inserted_count} added, {b.skipped_count} skipped, {" "}
                    {new Date(b.created_at).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })}
                    {b.undone_at ? ", undone" : ""}
                  </div>
                </div>
                {!b.undone_at && (
                  <Button size="sm" variant="ghost" className="shrink-0" onClick={() => undo(b.id)}>
                    <Undo2 size={14} /> Undo
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
