import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { rpc } from "@/lib/supabase-rpc";
import { useInstituteContext } from "@/lib/institute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Student-facing institute card in Profile.
 * Submitting a code creates a PENDING request; the institute admin approves it.
 * Staff never see this card -- they get the workspace instead.
 */
export function InstituteJoinCard() {
  const qc = useQueryClient();
  const { data: ctx, isPending } = useInstituteContext();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const isStaff = (ctx?.roles ?? []).some((r) =>
    ["institute_admin", "faculty", "subject_coordinator"].includes(r),
  );

  // Only hide while the first fetch is genuinely in flight, or for staff.
  // A null context (no institute yet) is the common case and must still render
  // the join form. Gating on isLoading instead kept the card invisible forever
  // whenever the query errored and retried.
  if (isPending || isStaff) return null;

  async function join() {
    if (!code.trim()) return toast.error("Enter your institute code");
    setBusy(true);
    const { data, error } = await rpc<{
      status: string;
      institute_name: string;
      message: string;
    }>("student_join_by_code", { _code: code.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${data?.institute_name}: ${data?.message}`);
    setCode("");
    qc.invalidateQueries({ queryKey: ["institute-context"] });
  }

  async function leave() {
    if (
      !confirm(
        "Leave this institute? You lose access to its private question bank and tests. Your own attempt history stays.",
      )
    )
      return;
    const { error } = await rpc("student_leave_institute");
    if (error) return toast.error(error.message);
    toast.success("You have left the institute");
    qc.invalidateQueries({ queryKey: ["institute-context"] });
  }

  if (ctx?.enrollment_status === "active") {
    return (
      <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Building2 size={16} className="text-primary" /> My institute
        </h2>
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-primary-soft p-3">
          <CheckCircle2 size={18} className="shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{ctx.institute_name}</div>
            <div className="text-[11px] text-muted-foreground">Enrolled</div>
          </div>
        </div>
        <button onClick={leave} className="mt-3 text-xs text-destructive underline">
          Leave institute
        </button>
      </div>
    );
  }

  if (ctx?.enrollment_status === "pending") {
    return (
      <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-card">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Clock size={16} className="text-amber-600" /> Awaiting approval
        </h2>
        <p className="mt-2 text-xs text-muted-foreground">
          Your request to join <strong>{ctx.institute_name}</strong> is with their admin. You will
          get access as soon as it is approved.
        </p>
        <button onClick={leave} className="mt-3 text-xs text-destructive underline">
          Cancel request
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Building2 size={16} className="text-primary" /> Join your institute
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Got a code from your academy? Enter it to request enrollment and unlock their private tests
        and question bank.
      </p>
      <div className="mt-3 flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. ABCD1234"
          className="tracking-[0.15em] uppercase"
          maxLength={16}
        />
        <Button className="rounded-2xl" disabled={busy} onClick={join}>
          {busy ? "Sending…" : "Join"}
        </Button>
      </div>
    </div>
  );
}
