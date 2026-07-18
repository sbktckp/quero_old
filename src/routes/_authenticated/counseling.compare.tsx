import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/counseling/compare")({
  component: Compare,
});

function Compare() {
  const [q, setQ] = useState("");
  const [ids, setIds] = useState<string[]>([]);

  const { data: options = [] } = useQuery({
    queryKey: ["compare-search", q],
    enabled: q.length >= 2,
    queryFn: async () => {
      const { data } = await supabase.from("colleges").select("id,name,state").eq("is_active", true).ilike("name", `%${q}%`).limit(10);
      return data ?? [];
    },
  });

  const { data: selected = [] } = useQuery({
    queryKey: ["compare-selected", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("colleges").select("*").in("id", ids);
      return data ?? [];
    },
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["compare-reviews", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("college_reviews").select("*").in("college_id", ids);
      return data ?? [];
    },
  });

  const avg = useMemo(() => {
    const map: Record<string, number | null> = {};
    for (const id of ids) {
      const rs = reviews.filter((r) => r.college_id === id);
      if (rs.length === 0) { map[id] = null; continue; }
      const keys = ["academics_rating","hostel_rating","mess_rating","faculty_rating","patient_exposure_rating","campus_life_rating","safety_rating","internship_rating"] as const;
      let sum = 0, n = 0;
      for (const r of rs) for (const k of keys) { const v = r[k]; if (typeof v === "number") { sum += v; n++; } }
      map[id] = n ? +(sum / n).toFixed(2) : null;
    }
    return map;
  }, [reviews, ids]);

  const canAdd = ids.length < 5;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
        <Input placeholder="Search a college to add (min 2 chars)" value={q} onChange={(e) => setQ(e.target.value)} />
        {q.length >= 2 && options.length > 0 && canAdd && (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {options.filter((o) => !ids.includes(o.id)).map((o) => (
              <button key={o.id} onClick={() => { setIds([...ids, o.id]); setQ(""); }}
                className="w-full text-left text-xs p-2 rounded-md hover:bg-muted">{o.name} <span className="text-muted-foreground">· {o.state}</span></button>
            ))}
          </div>
        )}
        {!canAdd && <p className="text-[11px] text-muted-foreground">Max 5 colleges.</p>}
        {ids.length > 0 && ids.length < 2 && <p className="text-[11px] text-muted-foreground">Pick at least one more college to compare.</p>}
      </div>

      {selected.length === 0 ? (
        <div className="rounded-2xl border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">Add 2–5 colleges to compare.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="text-left p-2 sticky left-0 bg-background">Attribute</th>
                {selected.map((c) => (
                  <th key={c.id} className="p-2 min-w-[140px] text-left align-top">
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-semibold">{c.name}</span>
                      <button onClick={() => setIds(ids.filter((i) => i !== c.id))} className="text-muted-foreground"><X size={12} /></button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {([
                ["Type", (c: any) => <Badge variant="secondary">{c.institution_type}</Badge>],
                ["Location", (c: any) => `${c.city ?? "—"}, ${c.state}`],
                ["Annual fees (₹)", (c: any) => c.annual_fees_min || c.annual_fees_max ? `${c.annual_fees_min ?? "?"} – ${c.annual_fees_max ?? "?"}` : "—"],
                ["Total seats", (c: any) => c.total_seats ?? "—"],
                ["Hostel", (c: any) => c.hostel_available ? "Yes" : "No"],
                ["Bond", (c: any) => c.bond_years ? `${c.bond_years} yr${c.bond_amount ? ` / ₹${c.bond_amount}` : ""}` : "None"],
                ["NMC recognized", (c: any) => c.nmc_recognized ? "Yes" : "No"],
                ["Avg. review rating", (c: any) => avg[c.id] != null ? `${avg[c.id]} / 5` : "No reviews"],
              ] as [string, (c: any) => React.ReactNode][]).map(([label, render]) => (
                <tr key={label} className="border-t border-border">
                  <td className="p-2 sticky left-0 bg-background font-medium text-muted-foreground">{label}</td>
                  {selected.map((c) => <td key={c.id} className="p-2 align-top">{render(c)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
