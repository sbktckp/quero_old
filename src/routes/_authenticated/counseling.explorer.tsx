import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/counseling/explorer")({
  component: Explorer,
});

const TYPES = ["", "government", "private", "deemed", "central"] as const;

function Explorer() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("");
  const [state, setState] = useState("");
  const [hostel, setHostel] = useState(false);
  const [nmc, setNmc] = useState(false);
  const [maxFees, setMaxFees] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["explorer", q, type, state, hostel, nmc, maxFees],
    queryFn: async () => {
      let query = supabase.from("colleges").select("*").eq("is_active", true).order("name");
      if (q) query = query.ilike("name", `%${q}%`);
      if (type) query = query.eq("institution_type", type);
      if (state) query = query.ilike("state", `%${state}%`);
      if (hostel) query = query.eq("hostel_available", true);
      if (nmc) query = query.eq("nmc_recognized", true);
      if (maxFees) query = query.lte("annual_fees_max", Number(maxFees));
      const { data, error } = await query.limit(200);
      if (error) throw error; return data ?? [];
    },
  });

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
        <Input placeholder="Search by college name" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            {TYPES.map((t) => <option key={t} value={t}>{t ? t : "All types"}</option>)}
          </select>
          <Input placeholder="State" value={state} onChange={(e) => setState(e.target.value)} />
          <Input type="number" placeholder="Max annual fees (₹)" value={maxFees} onChange={(e) => setMaxFees(e.target.value)} className="col-span-2" />
        </div>
        <div className="flex gap-3 text-xs">
          <label className="flex items-center gap-1"><input type="checkbox" checked={hostel} onChange={(e) => setHostel(e.target.checked)} /> Hostel</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={nmc} onChange={(e) => setNmc(e.target.checked)} /> NMC recognized</label>
        </div>
      </div>

      {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : rows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
          No colleges match these filters yet.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((c) => (
            <Link key={c.id} to="/counseling/college/$id" params={{ id: c.id }} className="flex items-start justify-between gap-2 rounded-2xl border border-border bg-card p-3 hover:border-primary/40">
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{c.name}</div>
                <div className="text-[11px] text-muted-foreground">{c.city ? `${c.city}, ` : ""}{c.state}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="secondary" className="text-[10px]">{c.institution_type}</Badge>
                  {c.hostel_available && <Badge variant="outline" className="text-[10px]">Hostel</Badge>}
                  {c.nmc_recognized && <Badge variant="outline" className="text-[10px]">NMC</Badge>}
                  {c.total_seats && <Badge variant="outline" className="text-[10px]">{c.total_seats} seats</Badge>}
                </div>
              </div>
              <ChevronRight size={16} className="text-muted-foreground mt-1" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
