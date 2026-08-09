import { useMemo, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { FACULTY_IMPORT_CAP, insertFacultyQuestion } from "@/lib/faculty-import";
import type { InstituteRoleInfo } from "@/lib/institute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  X,
} from "lucide-react";

const COLS = [
  "subject",
  "chapter",
  "topic",
  "question_text",
  "option_1",
  "option_2",
  "option_3",
  "option_4",
  "option_5",
  "correct_option",
  "explanation",
  "difficulty",
] as const;

type Row = Record<(typeof COLS)[number], string>;
type Status = "valid" | "warning" | "error";
type ParsedRow = {
  raw: Row;
  status: Status;
  reasons: string[];
  excluded: boolean;
};

function normalize(s: string) {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}
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

export function FacultyCsvImport({
  info,
  onClose,
  onDone,
}: {
  info: InstituteRoleInfo;
  onClose: () => void;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<{ ok: number; failed: { row: Row; reason: string }[] } | null>(
    null,
  );

  const { data: refs } = useQuery({
    queryKey: ["faculty-import-refs"],
    queryFn: async () => {
      const [subj, chap, top] = await Promise.all([
        supabase.from("subjects").select("id, name"),
        supabase.from("chapters").select("id, name, subject_id"),
        supabase.from("topics").select("id, name, chapter_id"),
      ]);
      return { subjects: subj.data ?? [], chapters: chap.data ?? [], topics: top.data ?? [] };
    },
  });

  const validate = useMemo(() => {
    if (!refs) return null;
    const subjByName = new Map(refs.subjects.map((s) => [normalize(s.name), s]));
    const chapByKey = new Map(
      refs.chapters.map((c) => [`${c.subject_id}|${normalize(c.name)}`, c]),
    );
    const topByKey = new Map(refs.topics.map((t) => [`${t.chapter_id}|${normalize(t.name)}`, t]));

    return (
      r: Row,
    ): Pick<ParsedRow, "status" | "reasons"> & {
      subjectId?: string;
      chapterId?: string | null;
      topicId?: string | null;
    } => {
      const reasons: string[] = [];
      let status: Status = "valid";
      const opts = [r.option_1, r.option_2, r.option_3, r.option_4, r.option_5].map((o) =>
        (o ?? "").trim(),
      );
      const nonBlank = opts.filter(Boolean);
      const correct = parseInt(r.correct_option, 10);

      if (!r.question_text?.trim()) {
        reasons.push("question_text blank");
        status = "error";
      }
      if (nonBlank.length < 2) {
        reasons.push("fewer than 2 non-blank options");
        status = "error";
      }
      if (!Number.isFinite(correct) || correct < 1 || correct > 5) {
        reasons.push("correct_option missing/out of range");
        status = "error";
      } else if (!opts[correct - 1]) {
        reasons.push("correct_option points to a blank option");
        status = "error";
      }

      const subj = subjByName.get(normalize(r.subject));
      let subjectId: string | undefined;
      let chapterId: string | null = null;
      let topicId: string | null = null;

      if (!subj) {
        reasons.push(`subject "${r.subject}" not found`);
        status = "error";
      } else {
        subjectId = subj.id;
        if (info.assignedSubjectId && subj.id !== info.assignedSubjectId) {
          reasons.push("subject differs from your assigned subject");
          if (status === "valid") status = "warning";
        }
        if (r.chapter?.trim()) {
          const chap = chapByKey.get(`${subj.id}|${normalize(r.chapter)}`);
          if (chap) chapterId = chap.id;
          else {
            reasons.push(`chapter "${r.chapter}" not found — will import without it`);
            if (status === "valid") status = "warning";
          }
        }
        if (r.topic?.trim()) {
          if (chapterId) {
            const top = topByKey.get(`${chapterId}|${normalize(r.topic)}`);
            if (top) topicId = top.id;
            else {
              reasons.push(`topic "${r.topic}" not found — will import without it`);
              if (status === "valid") status = "warning";
            }
          } else {
            reasons.push(`topic "${r.topic}" requires a known chapter`);
            if (status === "valid") status = "warning";
          }
        }
      }
      return { status, reasons, subjectId, chapterId, topicId };
    };
  }, [refs, info.assignedSubjectId]);

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
    throw new Error("Unsupported file type (use .csv or .xlsx)");
  }

  async function handleFile(file: File) {
    if (!validate) {
      toast.error("Reference data not ready");
      return;
    }
    setParsing(true);
    setResult(null);
    try {
      const parsed = await parseFile(file);
      if (parsed.length > FACULTY_IMPORT_CAP) {
        toast.error(
          `Only the first ${FACULTY_IMPORT_CAP} rows will be imported (file had ${parsed.length}).`,
        );
      }
      const capped = parsed.slice(0, FACULTY_IMPORT_CAP);
      const out = capped.map((raw) => {
        const v = validate(raw);
        return { raw, status: v.status, reasons: v.reasons, excluded: false } satisfies ParsedRow;
      });
      setRows(out);
      toast.success(`Parsed ${out.length} rows`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Parse failed");
    } finally {
      setParsing(false);
    }
  }

  const counts = useMemo(() => {
    const base = { valid: 0, warning: 0, error: 0 } as Record<Status, number>;
    if (!rows) return base;
    return rows.reduce((acc, r) => {
      if (r.excluded) return acc;
      acc[r.status] += 1;
      return acc;
    }, base);
  }, [rows]);

  function updateRow(i: number, patch: { excluded?: boolean; raw?: Partial<Row> }) {
    if (!validate) return;
    setRows((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const cur = next[i];
      const newRaw: Row = patch.raw ? { ...cur.raw, ...patch.raw } : cur.raw;
      const v = validate(newRaw);
      next[i] = { ...cur, ...patch, raw: newRaw, status: v.status, reasons: v.reasons };
      return next;
    });
  }

  async function commit() {
    if (!rows || !validate || !user) return;
    setCommitting(true);
    const failed: { row: Row; reason: string }[] = [];
    let ok = 0;
    for (const r of rows) {
      if (r.excluded) continue;
      if (r.status === "error") {
        failed.push({ row: r.raw, reason: r.reasons.join("; ") });
        continue;
      }
      if (ok >= FACULTY_IMPORT_CAP) {
        failed.push({ row: r.raw, reason: `over the ${FACULTY_IMPORT_CAP}-question cap` });
        continue;
      }
      try {
        const v = validate(r.raw);
        if (!v.subjectId) throw new Error("subject not found");
        const opts = [r.raw.option_1, r.raw.option_2, r.raw.option_3, r.raw.option_4, r.raw.option_5].map(
          (o) => (o ?? "").trim(),
        );
        const correct = parseInt(r.raw.correct_option, 10);
        await insertFacultyQuestion(
          {
            subject_id: v.subjectId,
            chapter_id: v.chapterId ?? null,
            topic_id: v.topicId ?? null,
            question_text: r.raw.question_text.trim(),
            explanation: r.raw.explanation?.trim() || null,
            difficulty: r.raw.difficulty?.trim().toLowerCase() || null,
            options: opts.map((text, idx) => ({ text, is_correct: idx + 1 === correct })),
          },
          { instituteId: info.instituteId, userId: user.id },
        );
        ok += 1;
      } catch (e) {
        failed.push({ row: r.raw, reason: e instanceof Error ? e.message : String(e) });
      }
    }
    setResult({ ok, failed });
    setCommitting(false);
    toast.success(`${ok} questions submitted for review`);
    onDone();
  }

  function downloadTemplate() {
    downloadCSV("quero-faculty-mcq-template.csv", [
      [...COLS],
      [
        "Physiology",
        "Cardiovascular system",
        "Cardiac cycle",
        "Which valve closes at the start of isovolumetric contraction?",
        "Mitral valve",
        "Aortic valve",
        "Pulmonary valve",
        "Tricuspid valve",
        "",
        "1",
        "The mitral valve closes as ventricular pressure exceeds atrial pressure.",
        "medium",
      ],
    ]);
  }

  return (
    <div className="rounded-3xl bg-card border border-border p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm">Bulk import (CSV)</h2>
        <Button size="icon" variant="ghost" onClick={onClose}>
          <X size={16} />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Accepts .csv and .xlsx, up to {FACULTY_IMPORT_CAP} questions per upload. Everything imported
        goes to your institute admin&apos;s review queue as <strong>Under review</strong>.
      </p>

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
              <Upload size={14} /> {parsing ? "Parsing…" : "Upload file"}
            </span>
          </Button>
        </label>
      </div>

      {rows && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="gap-1">
              <CheckCircle2 size={12} /> {counts.valid}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <AlertTriangle size={12} /> {counts.warning}
            </Badge>
            <Badge variant="destructive" className="gap-1">
              <XCircle size={12} /> {counts.error}
            </Badge>
            <Button
              size="sm"
              className="ml-auto rounded-2xl"
              onClick={commit}
              disabled={committing || counts.valid + counts.warning === 0}
            >
              {committing ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Importing…
                </>
              ) : (
                `Submit ${counts.valid + counts.warning}`
              )}
            </Button>
          </div>

          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto max-h-[50vh]">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-muted-foreground sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left">#</th>
                    <th className="px-2 py-2 text-left">Status</th>
                    <th className="px-2 py-2 text-left">Subject</th>
                    <th className="px-2 py-2 text-left min-w-56">Question</th>
                    <th className="px-2 py-2 text-left">Correct</th>
                    <th className="px-2 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={i}
                      className={`border-t border-border ${r.excluded ? "opacity-40" : ""}`}
                    >
                      <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                      <td className="px-2 py-1.5">
                        {r.status === "valid" && (
                          <CheckCircle2 size={14} className="text-emerald-600" />
                        )}
                        {r.status === "warning" && (
                          <AlertTriangle size={14} className="text-amber-600" />
                        )}
                        {r.status === "error" && <XCircle size={14} className="text-destructive" />}
                      </td>
                      <td className="px-2 py-1.5">
                        <CellInput
                          value={r.raw.subject}
                          onChange={(v) => updateRow(i, { raw: { subject: v } })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <CellInput
                          value={r.raw.question_text}
                          onChange={(v) => updateRow(i, { raw: { question_text: v } })}
                        />
                        {r.reasons.length > 0 && (
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            {r.reasons.join("; ")}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <CellInput
                          width="w-12"
                          value={r.raw.correct_option}
                          onChange={(v) => updateRow(i, { raw: { correct_option: v } })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <button
                          className="text-xs text-muted-foreground underline hover:text-destructive"
                          onClick={() => updateRow(i, { excluded: !r.excluded })}
                        >
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
        <div className="rounded-2xl border border-border p-4 text-sm">
          <div className="font-semibold">{result.ok} questions submitted for review.</div>
          {result.failed.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {result.failed.length} row(s) failed: {result.failed[0].reason}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CellInput({
  value,
  onChange,
  width = "w-32",
}: {
  value: string;
  onChange: (v: string) => void;
  width?: string;
}) {
  return (
    <Input
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={`h-7 ${width} rounded-lg px-2 text-xs`}
    />
  );
}
