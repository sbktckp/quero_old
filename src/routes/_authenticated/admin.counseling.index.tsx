import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/counseling/")({
  component: AdminColleges,
});

type College = {
  id?: string; name: string; state: string; city: string | null;
  institution_type: "government" | "private" | "deemed" | "central";
  nmc_recognized: boolean; annual_fees_min: number | null; annual_fees_max: number | null;
  total_seats: number | null; hostel_available: boolean; bond_years: number | null; bond_amount: number | null; is_active: boolean;
};

function empty(): College {
  return { name: "", state: "", city: "", institution_type: "government", nmc_recognized: true,
    annual_fees_min: null, annual_fees_max: null, total_seats: null, hostel_available: false,
    bond_years: null, bond_amount: null, is_active: true };
}

function AdminColleges() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<College>(empty());

  const { data: rows = [] } = useQuery({
    queryKey: ["admin-colleges", q],
    queryFn: async () => {
      let query = supabase.from("colleges").select("*").order("name").limit(300);
      if (q) query = query.ilike("name", `%${q}%`);
      const { data } = await query;
      return (data ?? []) as College[];
    },
  });

  const save = useMutation({
    mutationFn: async (c: College) => {
      const { id, ...payload } = c;
      if (id) {
        const { error } = await supabase.from("colleges").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("colleges").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); setOpen(false); qc.invalidateQueries({ queryKey: ["admin-colleges"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("colleges").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-colleges"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input placeholder="Search colleges" value={q} onChange={(e) => setQ(e.target.value)} />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={() => setEditing(empty())}><Plus size={14} /> New</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing.id ? "Edit college" : "New college"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2"><Label>Name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>State</Label><Input value={editing.state} onChange={(e) => setEditing({ ...editing, state: e.target.value })} /></div>
              <div><Label>City</Label><Input value={editing.city ?? ""} onChange={(e) => setEditing({ ...editing, city: e.target.value })} /></div>
              <div><Label>Type</Label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editing.institution_type} onChange={(e) => setEditing({ ...editing, institution_type: e.target.value as College["institution_type"] })}>
                  <option value="government">Government</option><option value="private">Private</option><option value="deemed">Deemed</option><option value="central">Central</option>
                </select>
              </div>
              <div><Label>Total seats</Label><Input type="number" value={editing.total_seats ?? ""} onChange={(e) => setEditing({ ...editing, total_seats: e.target.value ? Number(e.target.value) : null })} /></div>
              <div><Label>Fees min (₹)</Label><Input type="number" value={editing.annual_fees_min ?? ""} onChange={(e) => setEditing({ ...editing, annual_fees_min: e.target.value ? Number(e.target.value) : null })} /></div>
              <div><Label>Fees max (₹)</Label><Input type="number" value={editing.annual_fees_max ?? ""} onChange={(e) => setEditing({ ...editing, annual_fees_max: e.target.value ? Number(e.target.value) : null })} /></div>
              <div><Label>Bond years</Label><Input type="number" value={editing.bond_years ?? ""} onChange={(e) => setEditing({ ...editing, bond_years: e.target.value ? Number(e.target.value) : null })} /></div>
              <div><Label>Bond amount (₹)</Label><Input type="number" value={editing.bond_amount ?? ""} onChange={(e) => setEditing({ ...editing, bond_amount: e.target.value ? Number(e.target.value) : null })} /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.hostel_available} onChange={(e) => setEditing({ ...editing, hostel_available: e.target.checked })} /> Hostel</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.nmc_recognized} onChange={(e) => setEditing({ ...editing, nmc_recognized: e.target.checked })} /> NMC recognized</label>
              <label className="flex items-center gap-2 text-sm col-span-2"><input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Active</label>
            </div>
            <Button className="w-full" onClick={() => save.mutate(editing)} disabled={!editing.name || !editing.state || save.isPending}>Save</Button>
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-1">
        {rows.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">{c.name}</div>
              <div className="text-[11px] text-muted-foreground">{c.city ? `${c.city}, ` : ""}{c.state} · {c.institution_type}{!c.is_active ? " · inactive" : ""}</div>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil size={14} /></Button>
              <Button size="icon" variant="ghost" onClick={() => confirm("Delete this college?") && remove.mutate(c.id!)}><Trash2 size={14} /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
