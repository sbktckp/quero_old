import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { logAdminAction } from "@/lib/admin-log";
import { Star, ExternalLink } from "lucide-react";
import { yearLabel, type MentorRow, type PricingRow } from "@/lib/mentors";

export const Route = createFileRoute("/_authenticated/admin/mentors")({
  component: AdminMentors,
});

type SessionRow = {
  id: string; mentor_id: string; student_id: string; session_type: string; scheduled_at: string;
  status: string; payment_status: string; amount: number; mentor_amount: number | null; commission: number | null;
  meeting_link: string | null;
};

type ReviewRow = {
  id: string; mentor_id: string; rating: number; review: string | null;
  is_reported: boolean; is_hidden: boolean; created_at: string;
};

function AdminMentors() {
  const qc = useQueryClient();

  const { data: mentors = [] } = useQuery({
    queryKey: ["admin-mentors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentors").select("*, colleges(id, name, state, city)").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MentorRow[];
    },
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["admin-mentor-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentor_sessions").select("*").order("scheduled_at", { ascending: false }).limit(300);
      if (error) throw error;
      return (data ?? []) as SessionRow[];
    },
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["admin-mentor-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentor_reviews").select("*").order("created_at", { ascending: false }).limit(300);
      if (error) throw error;
      return (data ?? []) as ReviewRow[];
    },
  });

  const { data: pricing = [] } = useQuery({
    queryKey: ["admin-mentor-pricing"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mentor_session_pricing").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as PricingRow[];
    },
  });

  const nameOf = (id: string) => mentors.find((m) => m.id === id)?.full_name ?? "—";

  const setStatus = async (m: MentorRow, status: string) => {
    const { error } = await supabase.from("mentors").update({ verification_status: status }).eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    await logAdminAction(`mentor.${status}`, "mentors", m.id);
    toast.success(`${m.full_name} — ${status}`);
    qc.invalidateQueries({ queryKey: ["admin-mentors"] });
  };

  const paid = sessions.filter((s) => s.payment_status === "paid");
  const revenue = paid.reduce((n, s) => n + Number(s.amount), 0);
  const commission = paid.reduce((n, s) => n + Number(s.commission ?? 0), 0);
  const pendingCount = mentors.filter((m) => m.verification_status === "pending").length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat label="Mentors" value={String(mentors.length)} />
        <Stat label="Pending verification" value={String(pendingCount)} />
        <Stat label="Paid sessions" value={String(paid.length)} />
        <Stat label="Revenue / commission" value={`₹${revenue.toLocaleString("en-IN")} / ₹${Math.round(commission).toLocaleString("en-IN")}`} />
      </div>

      <Tabs defaultValue="verification">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="mentors">Mentors</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="verification" className="space-y-2 pt-3">
          {mentors.filter((m) => m.verification_status === "pending").map((m) => (
            <VerificationCard key={m.id} mentor={m} onDecision={setStatus} />
          ))}
          {pendingCount === 0 && <Empty>No pending verification requests.</Empty>}
        </TabsContent>

        <TabsContent value="mentors" className="space-y-2 pt-3">
          {mentors.map((m) => (
            <div key={m.id} className="rounded-xl border border-border bg-card p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{m.full_name}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {yearLabel(m.current_year)} · {m.colleges?.name} · ⭐ {Number(m.rating).toFixed(1)} ({m.total_reviews}) · {m.total_sessions} sessions
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Badge variant={m.verification_status === "verified" ? "default" : "secondary"}>{m.verification_status}</Badge>
                {m.verification_status !== "suspended"
                  ? <Button size="sm" variant="outline" onClick={() => setStatus(m, "suspended")}>Suspend</Button>
                  : <Button size="sm" variant="outline" onClick={() => setStatus(m, "verified")}>Reinstate</Button>}
              </div>
            </div>
          ))}
          {mentors.length === 0 && <Empty>No mentors yet.</Empty>}
        </TabsContent>

        <TabsContent value="bookings" className="space-y-2 pt-3">
          {sessions.map((s) => (
            <div key={s.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold capitalize truncate">{s.session_type.replace(/_/g, " ")} · {nameOf(s.mentor_id)}</div>
                <div className="flex gap-1 shrink-0">
                  <Badge variant="secondary">{s.payment_status}</Badge>
                  <Badge variant={s.status === "completed" ? "default" : "secondary"}>{s.status}</Badge>
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {new Date(s.scheduled_at).toLocaleString()} · ₹{Number(s.amount).toLocaleString("en-IN")} (mentor ₹{Number(s.mentor_amount ?? 0).toLocaleString("en-IN")})
              </div>
              {s.meeting_link && (
                <a href={s.meeting_link} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary inline-flex items-center gap-1">
                  <ExternalLink size={11} /> meeting link
                </a>
              )}
            </div>
          ))}
          {sessions.length === 0 && <Empty>No bookings yet.</Empty>}
        </TabsContent>

        <TabsContent value="reviews" className="space-y-2 pt-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-3 space-y-1">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold truncate">{nameOf(r.mentor_id)}</div>
                <div className="flex items-center gap-1 text-xs">
                  <Star size={12} className="fill-amber-400 text-amber-400" />{r.rating}
                  {r.is_reported && <Badge variant="destructive">reported</Badge>}
                  {r.is_hidden && <Badge variant="secondary">hidden</Badge>}
                </div>
              </div>
              {r.review && <p className="text-xs text-muted-foreground">{r.review}</p>}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={async () => {
                  const { error } = await supabase.from("mentor_reviews").update({ is_hidden: !r.is_hidden, is_reported: false }).eq("id", r.id);
                  if (error) { toast.error(error.message); return; }
                  await logAdminAction(r.is_hidden ? "review.unhide" : "review.hide", "mentor_reviews", r.id);
                  qc.invalidateQueries({ queryKey: ["admin-mentor-reviews"] });
                }}>{r.is_hidden ? "Unhide" : "Hide"}</Button>
                <Button size="sm" variant="ghost" onClick={async () => {
                  const { error } = await supabase.from("mentor_reviews").delete().eq("id", r.id);
                  if (error) { toast.error(error.message); return; }
                  await logAdminAction("review.delete", "mentor_reviews", r.id);
                  qc.invalidateQueries({ queryKey: ["admin-mentor-reviews"] });
                }}>Delete</Button>
              </div>
            </div>
          ))}
          {reviews.length === 0 && <Empty>No reviews yet.</Empty>}
        </TabsContent>

        <TabsContent value="pricing" className="space-y-2 pt-3">
          {pricing.map((p) => <PricingRowEditor key={p.session_type} row={p} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PricingRowEditor({ row }: { row: PricingRow }) {
  const qc = useQueryClient();
  const [price, setPrice] = useState(String(row.price_inr));
  const [commission, setCommission] = useState(String(row.commission_percent));
  const [saving, setSaving] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{row.label}</div>
        <div className="text-[11px] text-muted-foreground">{row.duration_minutes} min · {row.is_active ? "active" : "inactive"}</div>
      </div>
      <Input className="w-24" type="number" value={price} onChange={(e) => setPrice(e.target.value)} aria-label="Price" />
      <Input className="w-20" type="number" value={commission} onChange={(e) => setCommission(e.target.value)} aria-label="Commission %" />
      <Button size="sm" disabled={saving} onClick={async () => {
        setSaving(true);
        const { error } = await supabase.from("mentor_session_pricing")
          .update({ price_inr: Number(price), commission_percent: Number(commission) })
          .eq("session_type", row.session_type);
        setSaving(false);
        if (error) { toast.error(error.message); return; }
        await logAdminAction("mentor_pricing.update", "mentor_session_pricing", row.session_type);
        toast.success("Saved");
        qc.invalidateQueries({ queryKey: ["admin-mentor-pricing"] });
        qc.invalidateQueries({ queryKey: ["mentor-pricing"] });
      }}>Save</Button>
    </div>
  );
}

function VerificationCard({ mentor, onDecision }: { mentor: MentorRow; onDecision: (m: MentorRow, s: string) => void }) {
  const { data: docs } = useQuery({
    queryKey: ["admin-mentor-docs", mentor.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentor_verification_documents")
        .select("student_id_url, college_id_card_url, selfie_url, fee_receipt_url")
        .eq("mentor_id", mentor.id).maybeSingle();
      if (error) throw error;
      return data as Record<string, string | null> | null;
    },
  });

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      <div className="font-semibold text-sm">{mentor.full_name}</div>
      <div className="text-[11px] text-muted-foreground">
        {yearLabel(mentor.current_year)} · {mentor.colleges?.name} · {mentor.colleges?.state}
      </div>
      {mentor.bio && <p className="text-xs text-muted-foreground">{mentor.bio}</p>}
      <div className="flex flex-wrap gap-2 text-xs">
        {docs
          ? Object.entries(docs).filter(([, v]) => v).map(([k, v]) => (
              <a key={k} href={v!} target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-1 underline">
                <ExternalLink size={11} /> {k.replace(/_url$/, "").replace(/_/g, " ")}
              </a>
            ))
          : <span className="text-muted-foreground">No documents uploaded yet.</span>}
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onDecision(mentor, "verified")}>Approve</Button>
        <Button size="sm" variant="outline" onClick={() => onDecision(mentor, "rejected")}>Reject</Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="font-bold text-sm">{value}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-muted-foreground text-center py-6">{children}</div>;
}
