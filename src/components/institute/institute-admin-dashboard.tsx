import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { InstituteRoleInfo } from "@/lib/institute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ClipboardList, FilePlus2 } from "lucide-react";
import { toast } from "sonner";

type FacultyRow = {
  role_id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  assigned_subject_id: string | null;
  subject_name: string | null;
  questions_contributed: number;
  questions_approved: number;
};

export function InstituteAdminDashboard({ info }: { info: InstituteRoleInfo }) {
  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-card border border-border p-5 shadow-card">
        <h1 className="text-xl font-extrabold tracking-tight">
          {info.instituteName ?? "Your institute"}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Institute admin</p>
        <Link
          to="/tests/new"
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-card"
        >
          <FilePlus2 size={16} /> Create institute test
        </Link>
      </div>
      <FacultySection info={info} />
      <ReviewQueue info={info} />
    </div>
  );
}

function FacultySection({ info }: { info: InstituteRoleInfo }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: faculty = [] } = useQuery({
    queryKey: ["institute-faculty", info.instituteId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("institute_faculty_list", {
        _institute_id: info.instituteId,
      });
      if (error) throw error;
      return (data ?? []) as unknown as FacultyRow[];
    },
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["inst-subjects"],
    queryFn: async () =>
      (await supabase.from("subjects").select("id, name").eq("is_active", true).order("sort_order"))
        .data ?? [],
  });

  async function addFaculty() {
    if (!email.trim()) return toast.error("Enter an email");
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("institute_add_faculty", {
        _institute_id: info.instituteId,
        _email: email.trim(),
        _subject_id: subjectId || undefined,
      });
      if (error) throw error;
      const res = data as unknown as { ok: boolean; reason?: string };
      if (!res?.ok) {
        toast.error("They need to sign up first, then you can add them.");
        return;
      }
      toast.success("Faculty added");
      setEmail("");
      setSubjectId("");
      setAdding(false);
      qc.invalidateQueries({ queryKey: ["institute-faculty"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add faculty");
    } finally {
      setBusy(false);
    }
  }

  async function remove(roleId: string) {
    if (!confirm("Remove this faculty member? Their questions stay with the institute.")) return;
    const { error } = await supabase.rpc("institute_remove_faculty", { _role_id: roleId });
    if (error) return toast.error(error.message);
    toast.success("Faculty removed");
    qc.invalidateQueries({ queryKey: ["institute-faculty"] });
  }

  return (
    <div className="rounded-3xl bg-card border border-border p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm">Faculty</h2>
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => setAdding((a) => !a)}>
          <Plus size={14} /> Add faculty
        </Button>
      </div>

      {adding && (
        <div className="mt-3 space-y-2 rounded-2xl bg-muted/40 p-3">
          <div>
            <Label className="text-xs">Email of an existing Quero account</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teacher@example.com" />
          </div>
          <div>
            <Label className="text-xs">Assigned subject (optional)</Label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm"
            >
              <option value="">No default subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <Button className="w-full rounded-2xl" disabled={busy} onClick={addFaculty}>
            Add faculty member
          </Button>
        </div>
      )}

      {faculty.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">No faculty yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {faculty.map((f) => (
            <li key={f.role_id} className="flex items-center gap-3 rounded-2xl border border-border p-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{f.display_name ?? f.email}</div>
                <div className="text-[11px] text-muted-foreground truncate">{f.email}</div>
                <div className="text-[11px] text-muted-foreground">
                  {f.subject_name ?? "No subject"} · {f.questions_contributed} questions (
                  {f.questions_approved} approved)
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                Active
              </span>
              <Button size="icon" variant="ghost" onClick={() => remove(f.role_id)}>
                <Trash2 size={14} />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type PendingQuestion = {
  id: string;
  question_text: string;
  explanation: string | null;
  difficulty: string | null;
  created_by: string | null;
};

function ReviewQueue({ info }: { info: InstituteRoleInfo }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const { data: pending = [] } = useQuery({
    queryKey: ["institute-review-queue", info.instituteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("id, question_text, explanation, difficulty, created_by, options(option_text, is_correct, sort_order)")
        .eq("institute_id", info.instituteId)
        .eq("status", "submitted")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as (PendingQuestion & {
        options: { option_text: string; is_correct: boolean; sort_order: number | null }[];
      })[];
    },
  });

  async function review(id: string, status: "approved" | "rejected") {
    const reason = reasons[id]?.trim() || null;
    const { error } = await supabase
      .from("questions")
      .update({
        status,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
        rejection_reason: status === "rejected" ? reason : null,
      })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? "Approved" : "Rejected");
    qc.invalidateQueries({ queryKey: ["institute-review-queue"] });
  }

  return (
    <div className="rounded-3xl bg-card border border-border p-5 shadow-card">
      <h2 className="flex items-center gap-2 font-semibold text-sm">
        <ClipboardList size={16} className="text-primary" /> Review queue
        <span className="ml-auto text-xs text-muted-foreground">{pending.length} pending</span>
      </h2>

      {pending.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">Nothing waiting for review.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {pending.map((q) => (
            <li key={q.id} className="rounded-2xl border border-border p-3">
              <p className="text-sm font-medium">{q.question_text}</p>
              <ul className="mt-2 space-y-1">
                {[...(q.options ?? [])]
                  .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                  .map((o, i) => (
                    <li
                      key={i}
                      className={`rounded-xl px-3 py-1.5 text-xs ${o.is_correct ? "bg-emerald-500/10 text-emerald-700 font-semibold" : "bg-muted/40"}`}
                    >
                      {String.fromCharCode(65 + i)}. {o.option_text}
                    </li>
                  ))}
              </ul>
              {q.explanation && (
                <p className="mt-2 text-[11px] text-muted-foreground">{q.explanation}</p>
              )}
              <Input
                className="mt-2 h-9 text-xs"
                placeholder="Rejection reason (optional)"
                value={reasons[q.id] ?? ""}
                onChange={(e) => setReasons((r) => ({ ...r, [q.id]: e.target.value }))}
              />
              <div className="mt-2 flex gap-2">
                <Button size="sm" className="flex-1 rounded-2xl" onClick={() => review(q.id, "approved")}>
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 rounded-2xl"
                  onClick={() => review(q.id, "rejected")}
                >
                  Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
