import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";
import { ArrowLeft, MessageCircle, Star, IndianRupee, CalendarCheck } from "lucide-react";
import type { MentorRow } from "@/lib/mentors";

export const Route = createFileRoute("/_authenticated/mentors/dashboard")({
  head: () => ({
    meta: [
      { title: "Mentor Dashboard — Quero" },
      { name: "description", content: "Manage your mentoring sessions, meeting links and earnings on Quero." },
      { property: "og:title", content: "Mentor Dashboard — Quero" },
      { property: "og:description", content: "Manage your mentoring sessions, meeting links and earnings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MentorDashboard,
});

type Session = {
  id: string; student_id: string; session_type: string; scheduled_at: string; duration_minutes: number;
  status: string; payment_status: string; amount: number; mentor_amount: number | null;
  meeting_link: string | null; notes: string | null;
};

function MentorDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [links, setLinks] = useState<Record<string, string>>({});

  const { data: mentor, isLoading } = useQuery({
    queryKey: ["my-mentor-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentors").select("*, colleges(id, name, state, city)").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as MentorRow | null;
    },
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["mentor-sessions", mentor?.id],
    enabled: !!mentor?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentor_sessions").select("*").eq("mentor_id", mentor!.id).order("scheduled_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Session[];
    },
  });

  const update = async (id: string, patch: Partial<Session>) => {
    const { error } = await supabase.from("mentor_sessions").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["mentor-sessions", mentor?.id] });
  };

  const paid = sessions.filter((s) => s.payment_status === "paid");
  const earnings = paid.reduce((sum, s) => sum + Number(s.mentor_amount ?? 0), 0);
  const upcoming = paid.filter((s) => s.status === "confirmed").length;

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;

  if (!mentor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">You don't have a mentor profile yet.</p>
        <Link to="/mentors/apply"><Button>Become a Mentor</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-lg px-5 py-3 flex items-center gap-3">
          <Link to="/mentors" className="text-muted-foreground"><ArrowLeft size={18} /></Link>
          <h1 className="font-bold">Mentor Dashboard</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 py-5 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Stat icon={IndianRupee} label="Earned" value={`₹${earnings.toLocaleString("en-IN")}`} />
          <Stat icon={CalendarCheck} label="Upcoming" value={String(upcoming)} />
          <Stat icon={Star} label="Rating" value={Number(mentor.rating).toFixed(1)} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-card text-sm">
          <div className="flex items-center justify-between">
            <span>Profile status</span>
            <Badge variant={mentor.verification_status === "verified" ? "default" : "secondary"}>{mentor.verification_status}</Badge>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span>Accepting bookings</span>
            <Button size="sm" variant="outline" onClick={async () => {
              const { error } = await supabase.from("mentors").update({ is_active: !mentor.is_active }).eq("id", mentor.id);
              if (error) toast.error(error.message);
              else { toast.success(mentor.is_active ? "Paused" : "Live"); qc.invalidateQueries({ queryKey: ["my-mentor-profile"] }); }
            }}>
              {mentor.is_active ? "Pause" : "Go live"}
            </Button>
          </div>
          <Link to="/mentors/apply" className="mt-3 block"><Button variant="outline" className="w-full">Edit profile & documents</Button></Link>
        </div>

        <section className="space-y-2">
          <h2 className="font-semibold text-sm">Bookings</h2>
          {sessions.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No bookings yet.</div>}
          {sessions.map((s) => (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-3 space-y-2 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold capitalize">{s.session_type.replace(/_/g, " ")}</span>
                <Badge variant={s.status === "completed" ? "default" : "secondary"}>{s.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(s.scheduled_at).toLocaleString()} · {s.duration_minutes} min · you earn ₹{Number(s.mentor_amount ?? 0).toLocaleString("en-IN")} · {s.payment_status}
              </div>
              {s.notes && <div className="text-xs bg-muted rounded-lg p-2">{s.notes}</div>}
              {s.payment_status === "paid" && s.status !== "cancelled" && (
                <>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Paste Google Meet / Zoom link"
                      value={links[s.id] ?? s.meeting_link ?? ""}
                      onChange={(e) => setLinks({ ...links, [s.id]: e.target.value })}
                    />
                    <Button size="sm" onClick={() => update(s.id, { meeting_link: links[s.id] ?? s.meeting_link ?? "" })}>Save</Button>
                  </div>
                  <div className="flex gap-2">
                    {s.status !== "completed" && (
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => update(s.id, { status: "completed" })}>Mark completed</Button>
                    )}
                    {s.status === "confirmed" && (
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => update(s.id, { status: "no_show" })}>No show</Button>
                    )}
                    <Link to="/mentors/chat/$mentorId" params={{ mentorId: mentor.id }}>
                      <Button size="sm" variant="outline"><MessageCircle size={13} /></Button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          ))}
        </section>
      </main>
      <BottomNav />
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Star; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 text-center shadow-card">
      <Icon size={15} className="mx-auto text-primary" />
      <div className="mt-1 font-bold text-sm">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
