import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Upload, Star } from "lucide-react";
import { toast } from "sonner";
import { logAdminAction } from "@/lib/admin-log";

export const Route = createFileRoute("/_authenticated/admin/team")({
  component: AdminTeam,
});

type Member = {
  id?: string;
  name: string;
  role: string;
  photo_url: string | null;
  short_bio: string | null;
  founder_message: string | null;
  is_founder: boolean;
  sort_order: number;
  is_active: boolean;
};

const BUCKET = "team-photos";
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10; // 10 years

function empty(): Member {
  return {
    name: "", role: "", photo_url: null, short_bio: "", founder_message: "",
    is_founder: false, sort_order: 0, is_active: true,
  };
}

function AdminTeam() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Member>(empty());
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: rows = [] } = useQuery<Member[]>({
    queryKey: ["admin-team"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Member[];
    },
  });

  const save = useMutation({
    mutationFn: async (m: Member) => {
      const { id, ...payload } = m;
      if (id) {
        const { error } = await supabase.from("team_members").update(payload).eq("id", id);
        if (error) throw error;
        await logAdminAction("team.update", "team_members", id);
      } else {
        const { data, error } = await supabase.from("team_members").insert(payload).select("id").single();
        if (error) throw error;
        await logAdminAction("team.create", "team_members", data?.id);
      }
    },
    onSuccess: () => { toast.success("Saved"); setOpen(false); qc.invalidateQueries({ queryKey: ["admin-team"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_members").delete().eq("id", id);
      if (error) throw error;
      await logAdminAction("team.delete", "team_members", id);
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-team"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "31536000", upsert: false, contentType: file.type,
      });
      if (up.error) throw up.error;
      const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
      if (signed.error) throw signed.error;
      setEditing((e) => ({ ...e, photo_url: signed.data.signedUrl }));
      toast.success("Photo uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const openEdit = (m: Member) => { setEditing(m); setOpen(true); };
  const openNew = () => { setEditing(empty()); setOpen(true); };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Team members shown on the About page. Toggle "Founder" to spotlight someone.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus size={14} /> New member</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing.id ? `Edit: ${editing.name || "Member"}` : "New team member"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-2xl bg-muted overflow-hidden flex items-center justify-center border border-border">
                  {editing.photo_url
                    ? <img src={editing.photo_url} alt="" className="h-full w-full object-cover" />
                    : <span className="text-xs text-muted-foreground">No photo</span>}
                </div>
                <div className="flex-1">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
                  />
                  <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                    <Upload size={14} /> {uploading ? "Uploading…" : "Upload photo"}
                  </Button>
                  <Input
                    className="mt-2"
                    placeholder="Or paste photo URL"
                    value={editing.photo_url ?? ""}
                    onChange={(e) => setEditing({ ...editing, photo_url: e.target.value || null })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div><Label>Name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
                <div><Label>Role</Label><Input value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} placeholder="Founder & CEO" /></div>
              </div>

              <div>
                <Label>Short bio</Label>
                <Textarea rows={3} value={editing.short_bio ?? ""} onChange={(e) => setEditing({ ...editing, short_bio: e.target.value })} />
              </div>

              <div>
                <Label>Founder message (only shown if "Founder" is on)</Label>
                <Textarea rows={5} value={editing.founder_message ?? ""} onChange={(e) => setEditing({ ...editing, founder_message: e.target.value })} placeholder="Why I built Quero…" />
              </div>

              <div className="grid grid-cols-3 gap-2 items-end">
                <div>
                  <Label>Sort order</Label>
                  <Input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) || 0 })} />
                </div>
                <label className="flex items-center gap-2 text-sm pb-2">
                  <input type="checkbox" checked={editing.is_founder} onChange={(e) => setEditing({ ...editing, is_founder: e.target.checked })} /> Founder
                </label>
                <label className="flex items-center gap-2 text-sm pb-2">
                  <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Active
                </label>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => save.mutate(editing)}
              disabled={!editing.name || !editing.role || save.isPending}
            >
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-1">
        {rows.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-muted overflow-hidden flex items-center justify-center shrink-0 border border-border">
                {m.photo_url
                  ? <img src={m.photo_url} alt="" className="h-full w-full object-cover" />
                  : <span className="text-[10px] text-muted-foreground">—</span>}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate flex items-center gap-1.5">
                  {m.name}
                  {m.is_founder && <Star size={12} className="text-primary fill-primary" />}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {m.role} · order {m.sort_order}{!m.is_active ? " · inactive" : ""}
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => openEdit(m)}><Pencil size={14} /></Button>
              <Button size="icon" variant="ghost" onClick={() => confirm(`Delete ${m.name}?`) && remove.mutate(m.id!)}><Trash2 size={14} /></Button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-sm text-muted-foreground p-4 text-center">No team members yet.</div>}
      </div>
    </div>
  );
}
