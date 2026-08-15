import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { StaffRosterRow } from "@/lib/institute";
import {
  callRpc,
  fromLocalInput,
  minutes,
  toLocalInput,
  TEST_STATUS_LABEL,
  type CandidateRow,
  type InstituteTestRow,
  type PickedRow,
  type RpcStatus,
  type SectionProgressRow,
} from "@/lib/institute-tests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft, Check, ChevronDown, Loader2, Plus, Search, Send, Settings2, Sparkles, Trash2, X,
} from "lucide-react";

/*
  One test, section by section. A section is the unit of work: 45 Physics
  questions, 45 Chemistry and so on, each optionally handed to a named faculty
  member. The counts live in test_sections rather than in code, so a 180
  question full test and a 20 question chapter test use the same screen.

  The no-repeat rule is not enforced here. test_questions has UNIQUE
  (test_id, question_id) and test_section_candidates already filters out
  anything picked elsewhere in the test, so the UI cannot produce a duplicate
  even if two faculty pick at the same moment.
*/

export function TestWorkbench({
  test,
  instituteId,
  canManage,
  onBack,
}: {
  test: InstituteTestRow;
  instituteId: string;
  canManage: boolean;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const [openSection, setOpenSection] = useState<SectionProgressRow | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["test-sections", test.id],
    queryFn: () =>
      callRpc<SectionProgressRow[]>("test_section_progress", { _test_id: test.id }).then((d) => d ?? []),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["institute-staff", instituteId],
    enabled: canManage,
    queryFn: () =>
      callRpc<StaffRosterRow[]>("institute_staff_roster", { _institute_id: instituteId }).then(
        (d) => d ?? [],
      ),
  });

  const picked = sections.reduce((n, s) => n + s.picked, 0);
  const required = sections.reduce((n, s) => n + s.required, 0);
  const locked = test.status === "published" || test.status === "closed";

  function refresh() {
    qc.invalidateQueries({ queryKey: ["test-sections", test.id] });
    qc.invalidateQueries({ queryKey: ["institute-tests"] });
  }

  async function assign(sectionId: string, userId: string) {
    try {
      await callRpc("test_section_assign", {
        _section_id: sectionId,
        _user_id: userId || null,
      });
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not assign");
    }
  }

  async function autofill(sectionId: string) {
    setBusy(true);
    try {
      const res = await callRpc<RpcStatus>("test_section_autofill", { _section_id: sectionId });
      if ((res?.added ?? 0) === 0) toast.error("No more approved questions available for that subject");
      else if (res?.status === "short")
        toast.warning(`Added ${res.added}. The bank ran out at ${res.picked} of ${res.required}`);
      else toast.success(`Filled with ${res?.added} questions`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not fill");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setBusy(true);
    try {
      const res = await callRpc<RpcStatus>("institute_publish_test", { _test_id: test.id });
      if (res?.status === "published") toast.success(res.message ?? "Published");
      else toast.error(res?.message ?? "Not ready to publish");
      refresh();
      if (res?.status === "published") onBack();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not publish");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this test? Its sections and picked questions go with it.")) return;
    try {
      await callRpc("institute_delete_test", { _test_id: test.id });
      toast.success("Test deleted");
      onBack();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    }
  }

  if (openSection) {
    return (
      <SectionPicker
        section={openSection}
        locked={locked}
        onBack={() => {
          setOpenSection(null);
          refresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} /> All tests
      </button>

      <div className="rounded-3xl bg-card border border-border p-5 shadow-card">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-extrabold leading-tight">{test.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {TEST_STATUS_LABEL[test.status]} · {minutes(test.duration_seconds)} min ·{" "}
              {sections.length} section{sections.length === 1 ? "" : "s"}
            </p>
          </div>
          {canManage && (
            <Button size="icon" variant="ghost" onClick={() => setShowSettings((s) => !s)}>
              <Settings2 size={16} />
            </Button>
          )}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold">
              {picked} of {required} questions
            </span>
            <span className="text-muted-foreground">
              {required > 0 ? Math.round((picked / required) * 100) : 0}%
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full gradient-primary transition-all"
              style={{ width: `${required > 0 ? Math.min(100, (picked / required) * 100) : 0}%` }}
            />
          </div>
        </div>

        {canManage && !locked && (
          <div className="mt-4 flex gap-2">
            <Button className="flex-1 rounded-2xl" disabled={busy || picked < required} onClick={publish}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Publish
            </Button>
            <Button size="icon" variant="outline" className="rounded-2xl" onClick={remove}>
              <Trash2 size={15} />
            </Button>
          </div>
        )}
        {canManage && !locked && picked < required && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Every section has to be full and every question approved before this can go out.
          </p>
        )}
      </div>

      {showSettings && canManage && <TestSettings test={test} onSaved={refresh} />}

      {isLoading && <p className="text-xs text-muted-foreground">Loading sections</p>}

      <ul className="space-y-3">
        {sections.map((s) => {
          const full = s.picked >= s.required;
          return (
            <li key={s.section_id} className="rounded-3xl bg-card border border-border p-4 shadow-card">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{s.subject_name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {s.picked} of {s.required} picked
                    {s.assigned_name ? `, ${s.assigned_name}` : ""}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    full ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                  }`}
                >
                  {full ? "Full" : "Short"}
                </span>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full transition-all ${full ? "bg-emerald-500" : "bg-primary"}`}
                  style={{ width: `${Math.min(100, (s.picked / Math.max(1, s.required)) * 100)}%` }}
                />
              </div>

              {canManage && !locked && (
                <div className="mt-3">
                  <Label className="text-[11px]">Assigned to</Label>
                  <select
                    value={s.assigned_to ?? ""}
                    onChange={(e) => assign(s.section_id, e.target.value)}
                    className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-xs"
                  >
                    <option value="">Nobody yet</option>
                    {staff
                      .filter((m) => !m.is_invite && m.user_id)
                      .map((m) => (
                        <option key={m.user_id} value={m.user_id!}>
                          {m.display_name ?? m.email ?? "Member"}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 rounded-2xl"
                  onClick={() => setOpenSection(s)}
                >
                  <Search size={14} /> {locked ? "View" : "Pick"}
                </Button>
                {!locked && (
                  <Button
                    size="sm"
                    className="flex-1 rounded-2xl"
                    disabled={busy || full}
                    onClick={() => autofill(s.section_id)}
                  >
                    <Sparkles size={14} /> Auto fill
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Schedule and marking. Editable after publishing too, since dates move. */
function TestSettings({ test, onSaved }: { test: InstituteTestRow; onSaved: () => void }) {
  const [title, setTitle] = useState(test.title);
  const [duration, setDuration] = useState(String(minutes(test.duration_seconds)));
  const [opensAt, setOpensAt] = useState(toLocalInput(test.opens_at));
  const [closesAt, setClosesAt] = useState(toLocalInput(test.closes_at));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await callRpc("institute_update_test", {
        _test_id: test.id,
        _patch: {
          title: title.trim() || test.title,
          duration_seconds: Math.max(1, parseInt(duration, 10) || 15) * 60,
          opens_at: fromLocalInput(opensAt),
          closes_at: fromLocalInput(closesAt),
        },
      });
      toast.success("Saved");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl bg-card border border-border p-5 shadow-card space-y-3">
      <h2 className="text-sm font-semibold">Test settings</h2>
      <div>
        <Label className="text-xs">Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <Label className="text-xs">Duration (minutes)</Label>
        <Input
          type="number"
          min={1}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Opens</Label>
          <Input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Closes</Label>
          <Input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Leave the dates blank to let students take it as soon as it is published.
      </p>
      <Button className="w-full rounded-2xl" disabled={saving} onClick={save}>
        Save
      </Button>
    </div>
  );
}

function SectionPicker({
  section,
  locked,
  onBack,
}: {
  section: SectionProgressRow;
  locked: boolean;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [showPicked, setShowPicked] = useState(true);

  const { data: chapters = [] } = useQuery({
    queryKey: ["section-chapters", section.subject_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapters")
        .select("id, name")
        .eq("subject_id", section.subject_id)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: picked = [] } = useQuery({
    queryKey: ["section-picked", section.section_id],
    queryFn: () =>
      callRpc<PickedRow[]>("test_section_picked", { _section_id: section.section_id }).then(
        (d) => d ?? [],
      ),
  });

  const { data: candidates = [], isFetching } = useQuery({
    queryKey: ["section-candidates", section.section_id, chapterId, search],
    enabled: !locked,
    queryFn: () =>
      callRpc<CandidateRow[]>("test_section_candidates", {
        _section_id: section.section_id,
        _chapter_id: chapterId || null,
        _search: search.trim() || null,
        _limit: 50,
      }).then((d) => d ?? []),
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["section-picked", section.section_id] });
    qc.invalidateQueries({ queryKey: ["section-candidates", section.section_id] });
    qc.invalidateQueries({ queryKey: ["test-sections"] });
    qc.invalidateQueries({ queryKey: ["institute-tests"] });
  }

  async function add(questionId: string) {
    try {
      const res = await callRpc<RpcStatus>("test_section_add_question", {
        _section_id: section.section_id,
        _question_id: questionId,
      });
      if (res?.status === "full") return toast.error(res.message ?? "Section is already full");
      if (res?.status === "duplicate") return toast.error(res.message ?? "Already in this test");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add");
    }
  }

  async function drop(questionId: string) {
    try {
      await callRpc("test_section_remove_question", {
        _section_id: section.section_id,
        _question_id: questionId,
      });
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove");
    }
  }

  const count = picked.length;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} /> Back to sections
      </button>

      <div className="rounded-3xl bg-card border border-border p-5 shadow-card">
        <h1 className="text-lg font-extrabold">{section.subject_name}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {count} of {section.required} picked
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full gradient-primary transition-all"
            style={{ width: `${Math.min(100, (count / Math.max(1, section.required)) * 100)}%` }}
          />
        </div>
      </div>

      <div className="rounded-3xl bg-card border border-border p-4 shadow-card">
        <button
          type="button"
          className="flex w-full items-center gap-2 text-sm font-semibold"
          onClick={() => setShowPicked((s) => !s)}
        >
          In this section ({count})
          <ChevronDown
            size={15}
            className={`ml-auto transition-transform ${showPicked ? "rotate-180" : ""}`}
          />
        </button>
        {showPicked && (
          <ul className="mt-3 space-y-2">
            {picked.length === 0 && (
              <li className="text-xs text-muted-foreground">Nothing picked yet.</li>
            )}
            {picked.map((q) => (
              <li key={q.id} className="rounded-2xl border border-border p-3">
                <div className="flex items-start gap-2">
                  <p className="line-clamp-3 flex-1 text-xs">{q.question_text}</p>
                  {!locked && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => drop(q.id)}>
                      <X size={14} />
                    </Button>
                  )}
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {[q.chapter_name, q.difficulty, q.source].filter(Boolean).join(", ")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!locked && (
        <div className="rounded-3xl bg-card border border-border p-4 shadow-card space-y-3">
          <h2 className="text-sm font-semibold">Approved question bank</h2>
          <div className="grid gap-2">
            <select
              value={chapterId}
              onChange={(e) => setChapterId(e.target.value)}
              className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm"
            >
              <option value="">All chapters</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the stem"
            />
          </div>

          {isFetching && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 size={12} className="animate-spin" /> Loading
            </p>
          )}
          {!isFetching && candidates.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nothing left that matches. Import more questions or widen the filter.
            </p>
          )}

          <ul className="space-y-2">
            {candidates.map((q) => (
              <li key={q.id} className="rounded-2xl border border-border p-3">
                <p className="text-xs">{q.question_text}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {[q.chapter_name, q.difficulty, q.is_pyq ? `PYQ ${q.pyq_year ?? ""}`.trim() : null, q.source]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto h-7 rounded-full px-3 text-xs"
                    disabled={count >= section.required}
                    onClick={() => add(q.id)}
                  >
                    {count >= section.required ? <Check size={13} /> : <Plus size={13} />} Add
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
