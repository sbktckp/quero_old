import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";

export const Route = createFileRoute("/_authenticated/counseling/calendar")({
  component: CalendarView,
});

function CalendarView() {
  const [body, setBody] = useState("");
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));

  const { data: rows = [] } = useQuery({
    queryKey: ["events", body, year],
    queryFn: async () => {
      let q = supabase.from("counseling_events").select("*").eq("is_active", true).order("start_date");
      if (body) q = q.ilike("counseling_body", `%${body}%`);
      if (year) q = q.eq("year", Number(year));
      const { data } = await q;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Body (e.g. MCC)" value={body} onChange={(e) => setBody(e.target.value)} />
        <Input type="number" placeholder="Year" value={year} onChange={(e) => setYear(e.target.value)} />
      </div>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
          No counseling events for these filters yet.
        </div>
      ) : rows.map((e) => (
        <div key={e.id} className="rounded-2xl border border-border bg-card p-3 flex gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center"><CalendarDays size={18} /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{e.title}</span>
              <Badge variant="outline" className="text-[10px]">{e.event_type.replace(/_/g, " ")}</Badge>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {e.counseling_body} · {new Date(e.start_date).toLocaleDateString()}{e.end_date ? ` → ${new Date(e.end_date).toLocaleDateString()}` : ""} · {e.year}
            </div>
            {e.notes && <p className="text-xs mt-1">{e.notes}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
