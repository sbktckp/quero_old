import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Loader2, Star, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/counseling/college/$id")({
  component: CollegeDetail,
});

const RATING_FIELDS = [
  ["academics_rating", "Academics"],
  ["hostel_rating", "Hostel"],
  ["mess_rating", "Mess"],
  ["faculty_rating", "Faculty"],
  ["patient_exposure_rating", "Patient exposure"],
  ["campus_life_rating", "Campus life"],
  ["safety_rating", "Safety"],
  ["internship_rating", "Internship"],
] as const;

type Ratings = Record<(typeof RATING_FIELDS)[number][0], number>;

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}>
          <Star size={16} className={n <= value ? "fill-amber-500 text-amber-500" : "text-muted-foreground"} />
        </button>
      ))}
    </div>
  );
}

function CollegeDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: college, isLoading } = useQuery({
    queryKey: ["college", id],
    queryFn: async () => {
      const { data } = await supabase.from("colleges").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });
  const { data: reviews = [] } = useQuery({
    queryKey: ["college-reviews", id],
    queryFn: async () => {
      const { data } = await supabase.from("college_reviews").select("*").eq("college_id", id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const { data: mine } = useQuery({
    queryKey: ["my-review", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("college_reviews").select("*").eq("college_id", id).eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const avg = useMemo(() => {
    const map: Record<string, number> = {};
    for (const [k] of RATING_FIELDS) {
      const vals = reviews.map((r: any) => r[k]).filter((v: number | null) => typeof v === "number");
      if (vals.length) map[k] = +(vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(1);
    }
    return map;
  }, [reviews]);

  const [ratings, setRatings] = useState<Ratings>(() => Object.fromEntries(RATING_FIELDS.map(([k]) => [k, 0])) as Ratings);
  const [text, setText] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      const payload: any = { college_id: id, user_id: user!.id, review_text: text || null };
      for (const [k] of RATING_FIELDS) if (ratings[k]) payload[k] = ratings[k];
      const { error } = await supabase.from("college_reviews").upsert(payload, { onConflict: "college_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review submitted");
      setText(""); setRatings(Object.fromEntries(RATING_FIELDS.map(([k]) => [k, 0])) as Ratings);
      qc.invalidateQueries({ queryKey: ["college-reviews", id] });
      qc.invalidateQueries({ queryKey: ["my-review", id, user?.id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to submit"),
  });

  if (isLoading) return <Loader2 className="animate-spin mx-auto" />;
  if (!college) return <div className="text-sm text-muted-foreground">College not found.</div>;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-4">
        <h1 className="text-lg font-bold">{college.name}</h1>
        <p className="text-xs text-muted-foreground">{college.city ? `${college.city}, ` : ""}{college.state} · {college.institution_type}</p>
        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
          <div><span className="text-muted-foreground">Fees:</span> {college.annual_fees_min || college.annual_fees_max ? `₹${college.annual_fees_min ?? "?"} – ₹${college.annual_fees_max ?? "?"}` : "—"}</div>
          <div><span className="text-muted-foreground">Seats:</span> {college.total_seats ?? "—"}</div>
          <div><span className="text-muted-foreground">Hostel:</span> {college.hostel_available ? "Yes" : "No"}</div>
          <div><span className="text-muted-foreground">Bond:</span> {college.bond_years ? `${college.bond_years} yr` : "None"}</div>
          <div><span className="text-muted-foreground">NMC:</span> {college.nmc_recognized ? "Recognized" : "Not recognized"}</div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-semibold mb-2">Student ratings ({reviews.length})</h2>
        {Object.keys(avg).length === 0 ? (
          <p className="text-xs text-muted-foreground">No reviews yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {RATING_FIELDS.map(([k, label]) => (
              <div key={k} className="flex items-center justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="flex items-center gap-1 font-medium"><Star size={12} className="fill-amber-500 text-amber-500" />{avg[k] ?? "—"}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {user && (
        <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h2 className="font-semibold">{mine ? "Update your review" : "Write a review"}</h2>
          <div className="grid grid-cols-2 gap-2">
            {RATING_FIELDS.map(([k, label]) => (
              <div key={k} className="flex items-center justify-between text-xs">
                <span>{label}</span>
                <StarPicker value={ratings[k]} onChange={(v) => setRatings({ ...ratings, [k]: v })} />
              </div>
            ))}
          </div>
          <Textarea placeholder="Share your experience (optional)" value={text} onChange={(e) => setText(e.target.value)} rows={3} />
          <Button className="w-full" onClick={() => submit.mutate()} disabled={submit.isPending}>
            {submit.isPending ? "Saving…" : mine ? "Update review" : "Submit review"}
          </Button>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold text-sm">Recent reviews</h2>
        {reviews.length === 0 ? <p className="text-xs text-muted-foreground">No reviews yet — be the first.</p> :
          reviews.slice(0, 20).map((r: any) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{new Date(r.created_at).toLocaleDateString()}</span>
                {r.is_verified && <span className="flex items-center gap-1 text-primary"><BadgeCheck size={12} /> Verified</span>}
              </div>
              {r.review_text && <p className="text-xs mt-1 leading-relaxed">{r.review_text}</p>}
            </div>
          ))
        }
      </section>
    </div>
  );
}
