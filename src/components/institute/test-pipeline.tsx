import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  callRpc,
  minutes,
  TEST_STATUS_LABEL,
  type InstituteTestRow,
} from "@/lib/institute-tests";
import { TestWorkbench } from "@/components/institute/test-workbench";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChevronRight, FilePlus2, Loader2, X } from "lucide-react";

/*
  A full NEET test is four sections of 45 taken from the existing banks, not
  authored fresh. Both numbers are parameters rather than constants, so the same
  screen builds a 180 question mock and a 20 question chapter drill.
*/
const DEFAULT_PER_SECTION = 45;
const DEFAULT_DURATION_MIN = 200;

export function TestPipeline({
  instituteId,
  canManage,
}: {
  instituteId: string;
  canManage: boolean;
}) {
  const qc = useQueryClient();
  const [openTest, setOpenTest] = useState<InstituteTestRow | null>(null);
  const [creating, setCreating] = useState<null | "full" | "custom">(null);

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ["institute-tests", instituteId],
    queryFn: () =>
      callRpc<InstituteTestRow[]>("institute_tests", { _institute_id: instituteId }).then(
        (d) => d ?? [],
      ),
  });

  if (openTest) {
    // Re-read from the list so the header reflects a publish that happened
    // inside the workbench without a second round trip.
    const fresh = tests.find((t) => t.id === openTest.id) ?? openTest;
    return (
      <TestWorkbench
        test={fresh}
        instituteId={instituteId}
        canManage={canManage}
        onBack={() => {
          setOpenTest(null);
          qc.invalidateQueries({ queryKey: ["institute-tests"] });
        }}
      />
    );
  }

  return (
    <div className="rounded-3xl bg-card border border-border p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Tests</h2>
        {canManage && !creating && (
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => setCreating("full")}>
            <FilePlus2 size={14} /> New
          </Button>
        )}
      </div>

      {creating && (
        <CreateTest
          instituteId={instituteId}
          mode={creating}
          setMode={setCreating}
          onCreated={(t) => {
            setCreating(null);
            qc.invalidateQueries({ queryKey: ["institute-tests"] });
            setOpenTest(t);
          }}
        />
      )}

      {isLoading && <p className="mt-3 text-xs text-muted-foreground">Loading tests</p>}
      {!isLoading && tests.length === 0 && !creating && (
        <p className="mt-3 text-xs text-muted-foreground">
          No tests yet. A test starts as a set of empty subject sections that you or your faculty fill
          from the approved bank.
        </p>
      )}

      <ul className="mt-3 space-y-2">
        {tests.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => setOpenTest(t)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border p-3 text-left hover:border-primary/40 transition"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{t.title}</div>
                <div className="text-[11px] text-muted-foreground">
                  {t.picked} of {t.required} questions, {minutes(t.duration_seconds)} min
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full ${t.status === "published" ? "bg-emerald-500" : "bg-primary"}`}
                    style={{ width: `${t.required > 0 ? Math.min(100, (t.picked / t.required) * 100) : 0}%` }}
                  />
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  t.status === "published"
                    ? "bg-emerald-500/10 text-emerald-600"
                    : t.status === "closed"
                      ? "bg-muted text-muted-foreground"
                      : "bg-amber-500/10 text-amber-600"
                }`}
              >
                {TEST_STATUS_LABEL[t.status]}
              </span>
              <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CreateTest({
  instituteId,
  mode,
  setMode,
  onCreated,
}: {
  instituteId: string;
  mode: "full" | "custom";
  setMode: (m: null | "full" | "custom") => void;
  onCreated: (test: InstituteTestRow) => void;
}) {
  const [title, setTitle] = useState("");
  const [perSection, setPerSection] = useState(String(DEFAULT_PER_SECTION));
  const [durationMin, setDurationMin] = useState(String(DEFAULT_DURATION_MIN));
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data: subjects = [] } = useQuery({
    queryKey: ["active-subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function create() {
    if (!title.trim()) return toast.error("Give the test a title");
    const duration = Math.max(1, parseInt(durationMin, 10) || DEFAULT_DURATION_MIN) * 60;
    setSaving(true);
    try {
      let testId: string | null;
      if (mode === "full") {
        testId = await callRpc<string>("institute_create_full_test", {
          _institute_id: instituteId,
          _title: title.trim(),
          _per_section: Math.max(1, parseInt(perSection, 10) || DEFAULT_PER_SECTION),
          _duration_seconds: duration,
        });
      } else {
        const sections = Object.entries(counts)
          .map(([subject_id, n]) => ({ subject_id, question_count: parseInt(n, 10) || 0 }))
          .filter((s) => s.question_count > 0);
        if (sections.length === 0) return toast.error("Set a question count for at least one subject");
        testId = await callRpc<string>("institute_create_custom_test", {
          _institute_id: instituteId,
          _title: title.trim(),
          _duration_seconds: duration,
          _sections: sections,
        });
      }
      if (!testId) throw new Error("No test was created");

      const list = await callRpc<InstituteTestRow[]>("institute_tests", {
        _institute_id: instituteId,
      });
      const created = (list ?? []).find((t) => t.id === testId);
      if (!created) throw new Error("Created, but could not open it. Refresh the page.");
      toast.success("Test created. Fill the sections next.");
      onCreated(created);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the test");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 space-y-3 rounded-2xl bg-muted/40 p-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-full bg-background p-1">
          {(["full", "custom"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                mode === m ? "gradient-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <Button size="icon" variant="ghost" onClick={() => setMode(null)}>
          <X size={16} />
        </Button>
      </div>

      <div>
        <Label className="text-xs">Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={mode === "full" ? "Full mock test 01" : "Mechanics revision test"}
        />
      </div>

      {mode === "full" ? (
        <div>
          <Label className="text-xs">Questions per subject</Label>
          <Input
            type="number"
            min={1}
            value={perSection}
            onChange={(e) => setPerSection(e.target.value)}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            One section per active subject, so {subjects.length} sections of{" "}
            {parseInt(perSection, 10) || DEFAULT_PER_SECTION}.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label className="text-xs">Questions per subject</Label>
          {subjects.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <span className="flex-1 text-xs">{s.name}</span>
              <Input
                type="number"
                min={0}
                className="h-8 w-20 text-xs"
                value={counts[s.id] ?? ""}
                placeholder="0"
                onChange={(e) => setCounts((c) => ({ ...c, [s.id]: e.target.value }))}
              />
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground">
            Leave a subject at zero to keep it out of the test.
          </p>
        </div>
      )}

      <div>
        <Label className="text-xs">Duration (minutes)</Label>
        <Input
          type="number"
          min={1}
          value={durationMin}
          onChange={(e) => setDurationMin(e.target.value)}
        />
      </div>

      <Button className="w-full rounded-2xl" disabled={saving} onClick={create}>
        {saving ? <Loader2 size={15} className="animate-spin" /> : <FilePlus2 size={15} />} Create test
      </Button>
    </div>
  );
}
