import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, Upload, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/counseling/cutoffs")({
  component: CutoffsImport,
});

const COLS = ["college_name", "counseling_body", "state", "year", "round", "category", "quota", "opening_rank", "closing_rank"] as const;
type Row = Record<(typeof COLS)[number], string>;
type Status = "valid" | "warning" | "error";
type Parsed = { raw: Row; index: number; status: Status; reasons: string[]; excluded: boolean; createCollege: boolean };

const ROUNDS = ["round_1", "round_2", "mop_up", "stray_vacancy"];
const CATS = ["general", "obc", "sc", "st", "ews", "pwd"];
const BODIES = ["AIQ", "STATE"];

function norm(s: string) { return (s ?? "").trim().toLowerCase(); }
function downloadCSV(name: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => /[",\n]/.test(c ?? "") ? `"${(c ?? "").replace(/"/g, '""')}"` : (c ?? "")).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}

function CutoffsImport() {
  const [rows, setRows] = useState<Parsed[] | null>(null);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<{ ok: number; failed: { row: Row; reason: string }[] } | null>(null);

  const { data: colleges = [] } = useQuery({
    queryKey: ["import-colleges"],
    queryFn: async () => {
      const { data } = await supabase.from("colleges").select("id, name, state");
      return data ?? [];
    },
  });
  const collegeByName = useMemo(() => {
    const m = new Map<string, { id: string; name: string; state: string }>();
    for (const c of colleges) m.set(norm(c.name), c as any);
    return m;
  }, [colleges]);

  function validate(raw: Row, idx: number): Parsed {
    const reasons: string[] = [];
    let status: Status = "valid";
    let createCollege = false;

    if (!raw.college_name?.trim()) { reasons.push("college_name required"); status = "error"; }
    if (!BODIES.includes(raw.counseling_body)) { reasons.push("counseling_body must be AIQ or STATE"); status = "error"; }
    if (raw.counseling_body === "STATE" && !raw.state?.trim()) { reasons.push("state required for STATE body"); status = "error"; }
    if (!ROUNDS.includes(raw.round)) { reasons.push(`round must be one of ${ROUNDS.join("/")}`); status = "error"; }
    if (!CATS.includes(raw.category)) { reasons.push(`category must be one of ${CATS.join("/")}`); status = "error"; }
    const year = Number(raw.year);
    if (!year || year < 2000 || year > 2100) { reasons.push("year invalid"); status = "error"; }
    const closing = Number(raw.closing_rank);
    if (!closing || closing <= 0) { reasons.push("closing_rank must be > 0"); status = "error"; }
    if (raw.opening_rank && (isNaN(Number(raw.opening_rank)) || Number(raw.opening_rank) <= 0)) {
      reasons.push("opening_rank invalid"); status = "error";
    }
    if (raw.college_name?.trim() && !collegeByName.has(norm(raw.college_name))) {
      reasons.push("college not found — will be skipped unless created");
      createCollege = false;
      if (status !== "error") status = "warning";
    }
    return { raw, index: idx, status, reasons, excluded: status === "error", createCollege };
  }

  async function onFile(file: File) {
    setResult(null);
    let data: Row[] = [];
    if (file.name.endsWith(".csv")) {
      const text = await file.text();
      const parsed = Papa.parse<Row>(text, { header: true, skipEmptyLines: true });
      data = parsed.data;
    } else {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      data = XLSX.utils.sheet_to_json<Row>(wb.Sheets[wb.SheetNames[0]]);
    }
    // normalize keys
    const clean: Row[] = data.map((r) => {
      const out = {} as Row;
      for (const k of COLS) out[k] = String((r as any)[k] ?? "").trim();
      return out;
    });
    setRows(clean.map((r, i) => validate(r, i)));
  }

  const stats = useMemo(() => {
    if (!rows) return { valid: 0, warn: 0, err: 0 };
    return { valid: rows.filter((r) => r.status === "valid" && !r.excluded).length,
      warn: rows.filter((r) => r.status === "warning" && !r.excluded).length,
      err: rows.filter((r) => r.status === "error" || r.excluded).length };
  }, [rows]);

  async function commit() {
    if (!rows) return;
    setCommitting(true);
    const failed: { row: Row; reason: string }[] = [];
    let ok = 0;
    // resolve college creation for pending rows
    const nameToId = new Map(collegeByName);
    for (const r of rows) {
      if (r.excluded) continue;
      const key = norm(r.raw.college_name);
      let collegeId = nameToId.get(key)?.id;
      if (!collegeId) {
        if (!r.createCollege) { failed.push({ row: r.raw, reason: "college not found (not marked for creation)" }); continue; }
        const insertPayload = { name: r.raw.college_name.trim(), state: r.raw.state || "Unknown", institution_type: "government" as const, nmc_recognized: true, hostel_available: false, is_active: true };
        const { data, error } = await supabase.from("colleges").insert(insertPayload).select("id, name, state").single();
        if (error || !data) { failed.push({ row: r.raw, reason: `create college failed: ${error?.message}` }); continue; }
        collegeId = data.id; nameToId.set(key, data as any);
      }
      const payload = {
        college_id: collegeId,
        counseling_body: r.raw.counseling_body,
        state: r.raw.state || null,
        year: Number(r.raw.year),
        round: r.raw.round,
        category: r.raw.category,
        quota: r.raw.quota || null,
        opening_rank: r.raw.opening_rank ? Number(r.raw.opening_rank) : null,
        closing_rank: Number(r.raw.closing_rank),
      };
      const { error } = await supabase.from("college_cutoffs").insert(payload);
      if (error) failed.push({ row: r.raw, reason: error.message });
      else ok++;
    }
    setCommitting(false);
    setResult({ ok, failed });
    if (ok > 0) toast.success(`Imported ${ok} cutoffs`);
    if (failed.length) toast.error(`${failed.length} rows failed`);
  }

  const missingRows = rows?.filter((r) => r.reasons.some((x) => x.startsWith("college not found"))) ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => downloadCSV("cutoffs_template.csv", [[...COLS], ["AIIMS Delhi", "AIQ", "", "2024", "round_1", "general", "", "1", "50"]])}>
          <Download size={14} /> CSV template
        </Button>
        <label className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer">
          <Upload size={14} /> Upload CSV / XLSX
          <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
      </div>

      {rows && (
        <>
          <div className="flex gap-2 text-xs">
            <Badge className="bg-green-600">Valid {stats.valid}</Badge>
            <Badge className="bg-amber-500 text-white">Warning {stats.warn}</Badge>
            <Badge variant="destructive">Error {stats.err}</Badge>
          </div>

          {missingRows.length > 0 && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs space-y-2">
              <div className="font-semibold flex items-center gap-1"><AlertTriangle size={12} /> {missingRows.length} rows reference a college not in the database</div>
              <p className="text-muted-foreground">Never silently created. Tick to auto-create with default (government, active) — you can edit the college afterwards.</p>
              <label className="flex items-center gap-2">
                <input type="checkbox" onChange={(e) => setRows(rows.map((r) => r.reasons.some((x) => x.startsWith("college not found")) ? { ...r, createCollege: e.target.checked, excluded: !e.target.checked && r.status === "warning" ? false : r.excluded } : r))} />
                Create missing colleges automatically
              </label>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto space-y-1">
            {rows.map((r) => (
              <div key={r.index} className={`rounded-lg border p-2 text-xs ${r.status === "error" ? "border-destructive/40 bg-destructive/5" : r.status === "warning" ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-card"}`}>
                <div className="flex items-center gap-2">
                  {r.status === "valid" ? <CheckCircle2 size={12} className="text-green-600" /> : r.status === "warning" ? <AlertTriangle size={12} className="text-amber-500" /> : <XCircle size={12} className="text-destructive" />}
                  <span className="font-medium truncate">{r.raw.college_name}</span>
                  <span className="text-muted-foreground">· {r.raw.counseling_body} · {r.raw.category} · {r.raw.round} · {r.raw.year} · closing {r.raw.closing_rank}</span>
                </div>
                {r.reasons.length > 0 && <div className="text-muted-foreground mt-0.5">{r.reasons.join(" · ")}</div>}
              </div>
            ))}
          </div>

          <Button className="w-full" onClick={commit} disabled={committing || stats.valid + stats.warn === 0}>
            {committing ? <><Loader2 size={14} className="animate-spin" /> Importing…</> : `Import ${stats.valid + stats.warn} rows`}
          </Button>

          {result && (
            <div className="rounded-2xl border border-border bg-card p-3 text-xs space-y-1">
              <div>Imported: <b>{result.ok}</b>. Failed: <b>{result.failed.length}</b>.</div>
              {result.failed.slice(0, 20).map((f, i) => <div key={i} className="text-destructive">{f.row.college_name}: {f.reason}</div>)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
