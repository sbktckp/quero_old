import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/counseling/events")({
  component: AdminEvents,
});

const TYPES = ["registration", "choice_filling", "round_1", "round_2", "mop_up", "stray_vacancy", "document_verification", "reporting"] as const;

type Ev = {
  id?: string; counseling_body: string; title: string; event_type: (typeof TYPES)[number];
  start_date: string; end_date: string | null; year: number; notes: string | null; is_active: boolean;
};
function empty(): Ev { return { counseling_body: "MCC", title: "", event_type: "registration", start_date: "", end_date: null, year: new Date().getFullYear(), notes: null, is_active: true }; }

function AdminEvents() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Ev>(empty());
  const { data: rows = [] } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data } = await supabase.from("counseling_events").select("*").order("start_date", { ascending: false });
      return (data ?? []) as Ev[];
    },
  });
  const save = useMutation({
    mutationFn: async (e: Ev) => {
      const { id, ...payload } = e;
      const { error } = id ? await supabase.from("counseling_events").update(payload).eq("id", id)
        : await supabase.from("counseling_events").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); setOpen(false); qc.invalidateQueries({ queryKey: ["admin-events"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("counseling_events").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-events"] }); },
  });

  return (
    <div className="space-y-3">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><Button onClick={() => setEditing(empty())}><Plus size={14} /> New event</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing.id ? "Edit event" : "New event"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2"><Label>Title</Label><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
            <div><Label>Body</Label><Input value={editing.counseling_body} onChange={(e) => setEditing({ ...editing, counseling_body: e.target.value })} /></div>
            <div><Label>Type</Label>
              <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editing.event_type} onChange={(e) => setEditing({ ...editing, event_type: e.target.value as Ev["event_type"] })}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><Label>Start date</Label><Input type="date" value={editing.start_date} onChange={(e) => setEditing({ ...editing, start_date: e.target.value })} /></div>
            <div><Label>End date</Label><Input type="date" value={editing.end_date ?? ""} onChange={(e) => setEditing({ ...editing, end_date: e.target.value || null })} /></div>
            <div><Label>Year</Label><Input type="number" value={editing.year} onChange={(e) => setEditing({ ...editing, year: Number(e.target.value) })} /></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value || null })} /></div>
            <label className="flex items-center gap-2 text-sm col-span-2"><input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Active</label>
          </div>
          <Button className="w-full" onClick={() => save.mutate(editing)} disabled={!editing.title || !editing.start_date}>Save</Button>
        </DialogContent>
      </Dialog>
      <div className="space-y-1">
        {rows.map((e) => (
          <div key={e.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
            <div>
              <div className="font-semibold text-sm">{e.title}</div>
              <div className="text-[11px] text-muted-foreground">{e.counseling_body} · {e.event_type} · {e.start_date}{e.end_date ? ` → ${e.end_date}` : ""} · {e.year}</div>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => { setEditing(e); setOpen(true); }}><Pencil size={14} /></Button>
              <Button size="icon" variant="ghost" onClick={() => confirm("Delete?") && remove.mutate(e.id!)}><Trash2 size={14} /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
