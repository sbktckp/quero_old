import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { InstituteRoleInfo, StaffRosterRow, StudentRosterRow } from "@/lib/institute";
import { statusClasses } from "@/lib/institute";
import { StudentRoster } from "@/components/institute/student-roster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus, Trash2, ClipboardList, FilePlus2, KeyRound, Copy, RefreshCw, UserPlus, Check, X,
} from "lucide-react";
import { toast } from "sonner";

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
          search={{ type: "custom" as const }}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-card"
        >
          <FilePlus2 size={16} /> Create institute test
        </Link>
      </div>

      <JoinCodeCard instituteId={info.instituteId} />
      <PendingApprovals instituteId={info.instituteId} />
      <StudentRoster instituteId={info.instituteId} />
      <StaffSection info={info} />
      <ReviewQueue info={info} />
    </div>
  );
}

/** The code students type into their Profile to request enrollment. */
function JoinCodeCard({ instituteId }: { instituteId: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: code } = useQuery({
    queryKey: ["join-code", instituteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institute_join_codes")
        .select("code")
        .eq("institute_id", instituteId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data?.code ?? null;
    },
  });

  async function rotate() {
    if (
      !confirm(
        "Generate a new code? The current one stops working immediately. Students already enrolled are unaffected.",
      )
    )
      return;
    setBusy(true);
    const { error } = await supabase.rpc("institute_rotate_join_code", {
      _institute_id: instituteId,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("New join code generated");
    qc.invalidateQueries({ queryKey: ["join-code"] });
  }

  return (
    <div className="rounded-3xl bg-card border border-border p-5 shadow-card">
      <h2 className="flex items-center gap-2 font-semibold text-sm">
        <KeyRound size={16} className="text-primary" /> Join code
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Students enter this in their Profile to request enrollment. You approve each request below.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 rounded-2xl bg-primary-soft px-4 py-3 text-center text-lg font-extrabold tracking-[0.2em] text-primary">
          {code ?? "—"}
        </code>
        <Button
          size="icon"
          variant="outline"
          className="rounded-2xl"
          disabled={!code}
          onClick={() => {
            navigator.clipboard.writeText(code!);
            toast.success("Copied");
          }}
        >
          <Copy size={15} />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="rounded-2xl"
          disabled={busy}
          onClick={rotate}
        >
          <RefreshCw size={15} />
        </Button>
      </div>
    </div>
  );
}

/** Enrollment requests waiting on a decision. */
function PendingApprovals({ instituteId }: { instituteId: string }) {
  const qc = useQueryClient();

  const { data: pending = [] } = useQuery({
    queryKey: ["pending-enrollments", instituteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institute_enrollments")
        .select("id, user_id, requested_at, profiles:user_id(display_name, email)")
        .eq("institute_id", instituteId)
        .eq("status", "pending")
        .order("requested_at");
      if (error) throw error;
      return (data ?? []) as unknown as {
        id: string;
        user_id: string;
        requested_at: string;
        profiles: { display_name: string | null; email: string | null } | null;
      }[];
    },
  });

  async function decide(id: string, decision: "active" | "rejected") {
    const { error } = await supabase.rpc("institute_review_enrollment", {
      _enrollment_id: id,
      _decision: decision,
    });
    if (error) return toast.error(error.message);
    toast.success(decision === "active" ? "Student approved" : "Request rejected");
    qc.invalidateQueries({ queryKey: ["pending-enrollments"] });
    qc.invalidateQueries({ queryKey: ["student-roster"] });
  }

  if (pending.length === 0) return null;

  return (
    <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-card">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <UserPlus size={16} className="text-amber-600" /> Pending requests
        <span className="ml-auto rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700">
          {pending.length}
        </span>
      </h2>
      <ul className="mt-3 space-y-2">
        {pending.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                {p.profiles?.display_name ?? p.profiles?.email ?? "Student"}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">{p.profiles?.email}</div>
              <div className="text-[11px] text-muted-foreground">
                Asked {new Date(p.requested_at).toLocaleDateString()}
              </div>
            </div>
            <Button size="sm" className="rounded-full" onClick={() => decide(p.id, "active")}>
              <Check size={14} /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => decide(p.id, "rejected")}
            >
              <X size={14} />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Faculty and coordinators, plus outstanding email invites. */
function StaffSection({ info }: { info: InstituteRoleInfo }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("faculty");
  const [busy, setBusy] = useState(false);

  const { data: staff = [] } = useQuery({
    queryKey: ["institute-staff", info.instituteId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("institute_staff_roster", {
        _institute_id: info.instituteId,
      });
      if (error) throw error;
      return (data ?? []) as unknown as StaffRosterRow[];
    },
  });

  async function invite() {
    if (!email.trim()) return toast.error("Enter an email");
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("institute_invite_staff", {
        _institute_id: info.instituteId,
        _email: email.trim(),
        _role: role,
      });
      if (error) throw error;
      const res = data as unknown as { status: string; message: string };
      toast.success(res.message);
      setEmail("");
      setAdding(false);
      qc.invalidateQueries({ queryKey: ["institute-staff"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send invite");
    } finally {
      setBusy(false);
    }
  }

  async function removeStaff(userId: string) {
    if (!confirm("Remove this staff member? Their questions stay with the institute.")) return;
    const { error } = await supabase.rpc("institute_remove_staff", {
      _institute_id: info.instituteId,
      _user_id: userId,
    });
    if (error) return toast.error(error.message);
    toast.success("Removed");
    qc.invalidateQueries({ queryKey: ["institute-staff"] });
  }

  async function revokeInvite(inviteId: string) {
    const { error } = await supabase.rpc("institute_revoke_invite", { _invite_id: inviteId });
    if (error) return toast.error(error.message);
    toast.success("Invite revoked");
    qc.invalidateQueries({ queryKey: ["institute-staff"] });
  }

  return (
    <div className="rounded-3xl bg-card border border-border p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Faculty &amp; staff</h2>
        <Button
          size="sm"
          variant="outline"
          className="rounded-full"
          onClick={() => setAdding((a) => !a)}
        >
          <Plus size={14} /> Invite
        </Button>
      </div>

      {adding && (
        <div className="mt-3 space-y-2 rounded-2xl bg-muted/40 p-3">
          <div>
            <Label className="text-xs">Email address</Label>
            <Input
              value={email}
              type="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@example.com"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              If they already have a Quero account they get access immediately. Otherwise the invite
              waits and applies the moment they sign up with this email.
            </p>
          </div>
          <div>
            <Label className="text-xs">Role</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm"
            >
              <option value="faculty">Faculty</option>
              <option value="subject_coordinator">Subject coordinator</option>
              <option value="institute_admin">Institute admin</option>
            </select>
          </div>
          <Button className="w-full rounded-2xl" disabled={busy} onClick={invite}>
            Send invite
          </Button>
        </div>
      )}

      {staff.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">No faculty yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {staff.map((s, i) => (
            <li
              key={s.invite_id ?? s.user_id ?? i}
              className="flex items-center gap-3 rounded-2xl border border-border p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {s.display_name ?? s.email ?? "Member"}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">{s.email}</div>
                <div className="text-[11px] capitalize text-muted-foreground">
                  {s.role.replace("_", " ")}
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClasses(s.is_invite ? "pending" : "active")}`}
              >
                {s.is_invite ? "Invited" : "Active"}
              </span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() =>
                  s.is_invite ? revokeInvite(s.invite_id!) : removeStaff(s.user_id!)
                }
              >
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
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const { data: pending = [] } = useQuery({
    queryKey: ["institute-review-queue", info.instituteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select(
          "id, question_text, explanation, difficulty, created_by, options(option_text, sort_order)",
        )
        .eq("institute_id", info.instituteId)
        .eq("status", "submitted")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as (PendingQuestion & {
        options: { option_text: string; sort_order: number | null }[];
      })[];
    },
  });

  // Routed through a SECURITY DEFINER function rather than a direct table
  // update, so the status transition and the authorization check live together
  // in the database instead of relying on RLS alone.
  async function review(id: string, decision: "approved" | "rejected") {
    const { error } = await supabase.rpc("institute_review_question", {
      _question_id: id,
      _decision: decision,
      _reason: reasons[id]?.trim() || null,
    });
    if (error) return toast.error(error.message);
    toast.success(decision === "approved" ? "Approved" : "Rejected");
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
                    <li key={i} className="rounded-xl bg-muted/40 px-3 py-1.5 text-xs">
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
                <Button
                  size="sm"
                  className="flex-1 rounded-2xl"
                  onClick={() => review(q.id, "approved")}
                >
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
