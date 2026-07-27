import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";
import { ArrowLeft, BadgeCheck, Flag, Loader2, MessageCircle, Star } from "lucide-react";
import { yearLabel, type MentorRow, type PricingRow } from "@/lib/mentors";
import { createMentorSessionOrder, verifyMentorSessionPayment } from "@/lib/mentors.functions";
import { Avatar } from "./mentors.index";

export const Route = createFileRoute("/_authenticated/mentors/$id")({
  head: () => ({
    meta: [
      { title: "Mentor Profile — Quero" },
      { name: "description", content: "Book a 1:1 guidance session with a verified MBBS student mentor on Quero." },
      { property: "og:title", content: "Mentor Profile — Quero" },
      { property: "og:description", content: "Book a 1:1 guidance session with a verified MBBS student mentor." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MentorProfile,
});

declare global {
  interface Window { Razorpay?: new (opts: unknown) => { open: () => void } }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

type Review = {
  id: string; rating: number; review: string | null; created_at: string;
  student_id: string; is_reported: boolean;
};

function MentorProfile() {
  const { id } = useParams({ from: "/_authenticated/mentors/$id" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const createOrder = useServerFn(createMentorSessionOrder);
  const verifyPayment = useServerFn(verifyMentorSessionPayment);

  const [selected, setSelected] = useState<string>("");
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<number | null>(null);
  useEffect(() => () => { if (pollRef.current) window.clearInterval(pollRef.current); }, []);

  const { data: mentor, isLoading } = useQuery({
    queryKey: ["mentor", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentors").select("*, colleges(id, name, state, city)").eq("id", id).maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as MentorRow | null;
    },
  });

  const { data: pricing = [] } = useQuery({
    queryKey: ["mentor-pricing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentor_session_pricing").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return (data ?? []) as PricingRow[];
    },
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["mentor-reviews", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentor_reviews").select("id, rating, review, created_at, student_id, is_reported")
        .eq("mentor_id", id).eq("is_hidden", false).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Review[];
    },
  });

  // Sessions of this student with this mentor (for review eligibility + status).
  const { data: mySessions = [] } = useQuery({
    queryKey: ["my-mentor-sessions", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentor_sessions")
        .select("id, session_type, scheduled_at, status, payment_status, meeting_link, duration_minutes, amount")
        .eq("mentor_id", id).eq("student_id", user!.id)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const startPolling = (sessionId: string) => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    let ticks = 0;
    pollRef.current = window.setInterval(async () => {
      ticks++;
      const { data } = await supabase
        .from("mentor_sessions").select("id, payment_status, status").eq("id", sessionId).maybeSingle();
      if (data?.payment_status === "paid") {
        window.clearInterval(pollRef.current!); pollRef.current = null;
        setBusy(false);
        qc.invalidateQueries({ queryKey: ["my-mentor-sessions"] });
        toast.success("Session confirmed! Your mentor will share a meeting link shortly.");
      } else if (ticks > 40) {
        window.clearInterval(pollRef.current!); pollRef.current = null;
        setBusy(false);
        toast.message("Still processing — we'll confirm your session as soon as the payment clears.");
      }
    }, 2000);
  };

  const book = async () => {
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!selected || !when) { toast.error("Pick a session type and a time"); return; }
    setBusy(true);
    try {
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Failed to load payment SDK. Check your connection.");
      const order = await createOrder({
        data: { mentorId: id, sessionType: selected as never, scheduledAt: new Date(when).toISOString(), notes: note || undefined },
      });
      const rzp = new window.Razorpay!({
        key: order.keyId,
        amount: order.amountPaise,
        currency: "INR",
        name: "Quero",
        description: `${order.label} with ${order.mentorName}`,
        order_id: order.orderId,
        prefill: { email: user.email ?? undefined },
        theme: { color: "#6C4FF0" },
        handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await verifyPayment({ data: resp });
            toast.success("Payment received, confirming your session…");
            startPolling(order.sessionId);
          } catch (e) {
            toast.error((e as Error).message || "Payment verification failed");
            setBusy(false);
          }
        },
        modal: { ondismiss: () => { setBusy(false); toast.info("Checkout cancelled"); } },
      });
      rzp.open();
    } catch (e) {
      toast.error((e as Error).message || "Could not start checkout");
      setBusy(false);
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!mentor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="font-bold">Mentor not found</h1>
        <Link to="/mentors" className="text-primary underline text-sm">Back to mentors</Link>
      </div>
    );
  }

  const completed = mySessions.filter((s) => s.status === "completed");

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-lg px-5 py-3 flex items-center gap-3">
          <Link to="/mentors" className="text-muted-foreground"><ArrowLeft size={18} /></Link>
          <h1 className="font-bold">Mentor</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 py-5 space-y-4">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex gap-3">
            <Avatar url={mentor.photo_url} name={mentor.full_name} size={68} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <div className="font-bold text-lg truncate">{mentor.full_name}</div>
                <BadgeCheck size={16} className="text-primary shrink-0" />
              </div>
              <div className="text-xs text-muted-foreground">{yearLabel(mentor.current_year)}</div>
              <div className="text-xs text-muted-foreground">{mentor.colleges?.name}</div>
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1 font-semibold">
                  <Star size={12} className="fill-amber-400 text-amber-400" />{Number(mentor.rating).toFixed(1)}
                </span>
                <span className="text-muted-foreground">({mentor.total_reviews}) · {mentor.total_sessions} sessions</span>
              </div>
            </div>
          </div>
          {mentor.bio && <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{mentor.bio}</p>}
          {(mentor.languages ?? []).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {(mentor.languages ?? []).map((l) => (
                <Badge key={l} variant="secondary">{l}</Badge>
              ))}
            </div>
          )}
          <Link to="/mentors/chat/$mentorId" params={{ mentorId: mentor.id }}>
            <Button variant="outline" className="w-full mt-3"><MessageCircle size={14} /> Chat now</Button>
          </Link>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-3">
          <h2 className="font-semibold text-sm">Book a session</h2>
          <div className="space-y-2">
            {pricing.map((p) => (
              <button
                key={p.session_type}
                onClick={() => setSelected(p.session_type)}
                className={`w-full flex items-center justify-between rounded-xl border p-3 text-left transition ${
                  selected === p.session_type ? "border-primary bg-primary-soft" : "border-border"
                }`}
              >
                <div>
                  <div className="text-sm font-semibold">{p.label}</div>
                  <div className="text-[11px] text-muted-foreground">{p.duration_minutes} min</div>
                </div>
                <div className="font-bold text-sm">₹{Number(p.price_inr).toLocaleString("en-IN")}</div>
              </button>
            ))}
            {pricing.length === 0 && <div className="text-xs text-muted-foreground">Booking is temporarily unavailable.</div>}
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Preferred date & time</label>
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          <Textarea rows={2} placeholder="What do you want to discuss? (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button className="w-full" disabled={busy || !selected || !when} onClick={book}>
            {busy ? <><Loader2 className="animate-spin" size={14} /> Processing…</> : "Pay & book"}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Sessions happen over an external meeting link (Google Meet, Zoom or WhatsApp) shared by your mentor after confirmation.
          </p>
        </section>

        {mySessions.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-2">
            <h2 className="font-semibold text-sm">Your sessions with {mentor.full_name}</h2>
            {mySessions.map((s) => (
              <div key={s.id} className="rounded-xl border border-border p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{s.session_type.replace(/_/g, " ")}</span>
                  <Badge variant={s.status === "confirmed" || s.status === "completed" ? "default" : "secondary"}>{s.status}</Badge>
                </div>
                <div className="text-muted-foreground">
                  {new Date(s.scheduled_at).toLocaleString()} · {s.duration_minutes} min · ₹{Number(s.amount).toLocaleString("en-IN")} · {s.payment_status}
                </div>
                {s.meeting_link && (
                  <a href={s.meeting_link} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">
                    Join meeting
                  </a>
                )}
              </div>
            ))}
          </section>
        )}

        {completed.length > 0 && (
          <ReviewForm mentorId={mentor.id} sessions={completed.map((s) => ({ id: s.id, label: `${s.session_type.replace(/_/g, " ")} · ${new Date(s.scheduled_at).toLocaleDateString()}` }))} />
        )}

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-3">
          <h2 className="font-semibold text-sm">Reviews ({reviews.length})</h2>
          {reviews.length === 0 && <div className="text-xs text-muted-foreground">No reviews yet.</div>}
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} size={12} className={n <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"} />
                  ))}
                </div>
                <button
                  className="text-[11px] text-muted-foreground flex items-center gap-1 hover:text-destructive"
                  onClick={async () => {
                    const { error } = await supabase.from("mentor_reviews").update({ is_reported: true }).eq("id", r.id);
                    if (error) toast.error(error.message);
                    else { toast.success("Reported — our team will review it."); qc.invalidateQueries({ queryKey: ["mentor-reviews", id] }); }
                  }}
                >
                  <Flag size={11} /> Report
                </button>
              </div>
              {r.review && <p className="mt-1.5 text-sm">{r.review}</p>}
              <div className="mt-1 text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </section>
      </main>
      <BottomNav />
    </div>
  );
}

function ReviewForm({ mentorId, sessions }: { mentorId: string; sessions: { id: string; label: string }[] }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [sessionId, setSessionId] = useState(sessions[0]?.id ?? "");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const { error } = await supabase.from("mentor_reviews").insert({
      mentor_id: mentorId, student_id: user!.id, session_id: sessionId, rating, review: text || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message.includes("duplicate") ? "You already reviewed this session." : error.message); return; }
    setText("");
    toast.success("Thanks for the review!");
    qc.invalidateQueries({ queryKey: ["mentor-reviews", mentorId] });
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-3">
      <h2 className="font-semibold text-sm">Leave a review</h2>
      <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
        {sessions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} aria-label={`${n} star`}>
            <Star size={22} className={n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"} />
          </button>
        ))}
      </div>
      <Textarea rows={3} placeholder="How was the session?" value={text} onChange={(e) => setText(e.target.value)} />
      <Button className="w-full" disabled={saving || !sessionId} onClick={submit}>{saving ? "Submitting…" : "Submit review"}</Button>
    </section>
  );
}
