import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Info, MessageCircle } from "lucide-react";


export const Route = createFileRoute("/_authenticated/counseling/predictor")({
  component: Predictor,
});

const CATEGORIES = ["general", "obc", "sc", "st", "ews", "pwd"] as const;
type Cat = (typeof CATEGORIES)[number];

type Cutoff = {
  id: string; college_id: string; counseling_body: string; state: string | null;
  year: number; round: string; category: string; opening_rank: number | null; closing_rank: number;
};

function Predictor() {
  const [air, setAir] = useState("");
  const [category, setCategory] = useState<Cat>("general");
  const [stateName, setStateName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Colleges that currently have at least one verified, active mentor.
  const { data: mentorColleges = [] } = useQuery({
    queryKey: ["mentor-college-ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentors").select("college_id").eq("verification_status", "verified").eq("is_active", true);
      if (error) throw error;
      return (data ?? []).map((m) => m.college_id);
    },
  });
  const mentorCollegeIds = useMemo(() => new Set(mentorColleges), [mentorColleges]);

  const { data: colleges = [] } = useQuery({
    queryKey: ["colleges-all"],

    queryFn: async () => {
      const { data, error } = await supabase.from("colleges").select("id, name, state, city, institution_type").eq("is_active", true);
      if (error) throw error; return data ?? [];
    },
  });
  const { data: cutoffs = [] } = useQuery({
    queryKey: ["cutoffs-all", category, stateName],
    enabled: submitted,
    queryFn: async () => {
      let q = supabase.from("college_cutoffs").select("*").eq("category", category);
      if (stateName) q = q.or(`counseling_body.eq.AIQ,and(counseling_body.eq.STATE,state.eq.${stateName})`);
      else q = q.eq("counseling_body", "AIQ");
      const { data, error } = await q;
      if (error) throw error; return (data ?? []) as Cutoff[];
    },
  });

  const airNum = Number(air);
  const results = useMemo(() => {
    if (!submitted || !airNum || cutoffs.length === 0) return [];
    // pick latest year per (college, counseling_body)
    const latest = new Map<string, Cutoff>();
    for (const c of cutoffs) {
      const key = `${c.college_id}:${c.counseling_body}`;
      const prev = latest.get(key);
      if (!prev || c.year > prev.year) latest.set(key, c);
    }
    const collegeMap = new Map(colleges.map((c) => [c.id, c]));
    return [...latest.values()]
      .map((c) => {
        const college = collegeMap.get(c.college_id);
        if (!college) return null;
        const chance = airNum <= c.closing_rank ? "High" : airNum <= c.closing_rank * 1.15 ? "Moderate" : "Low";
        return { c, college, chance };
      })
      .filter(Boolean)
      .sort((a, b) => (a!.c.closing_rank - b!.c.closing_rank)) as { c: Cutoff; college: typeof colleges[number]; chance: "High" | "Moderate" | "Low" }[];
  }, [submitted, airNum, cutoffs, colleges]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-semibold">Your details</h2>
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" placeholder="AIR (All India Rank)" value={air} onChange={(e) => setAir(e.target.value)} />
          <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value as Cat)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
          </select>
          <Input placeholder="Home state (optional)" value={stateName} onChange={(e) => setStateName(e.target.value)} className="col-span-2" />
        </div>
        <Button className="w-full" onClick={() => setSubmitted(true)} disabled={!air}>Predict Colleges</Button>
      </section>

      {submitted && cutoffs.length === 0 && (
        <div className="rounded-2xl border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
          <Info size={20} />
          <div>No historical cutoff data loaded yet for this category/state.</div>
          <div className="text-[11px]">Predictions require real counseling data.</div>
        </div>
      )}

      {submitted && results.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Based on latest available cutoffs. Verify with official sources.</div>
          {results.map(({ c, college, chance }) => (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{college.name}</div>
                  <div className="text-[11px] text-muted-foreground">{college.city ? `${college.city}, ` : ""}{college.state} · {college.institution_type}</div>
                  <div className="text-[11px] mt-1">
                    {c.counseling_body} · {c.round.replace("_", " ")} · {c.year} · Closing rank <b>{c.closing_rank.toLocaleString()}</b>
                    {c.opening_rank ? ` (opened at ${c.opening_rank.toLocaleString()})` : ""}
                  </div>
                </div>
                <Badge variant={chance === "High" ? "default" : chance === "Moderate" ? "secondary" : "outline"} className={chance === "High" ? "bg-green-600" : chance === "Moderate" ? "bg-amber-500 text-white" : ""}>
                  {chance}
                </Badge>
              </div>
              {mentorCollegeIds.has(college.id) && (
                <Link
                  to="/mentors"
                  search={{ college: college.id }}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary"
                >
                  <MessageCircle size={12} /> Talk to an MBBS Student from this college
                </Link>
              )}
            </div>

          ))}
        </div>
      )}
    </div>
  );
}
