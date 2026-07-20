import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/legal")({
  component: AdminLegal,
});

type LP = { slug: string; title: string; content: string; updated_at?: string };
function empty(): LP { return { slug: "", title: "", content: "" }; }
function slugify(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

function AdminLegal() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [editing, setEditing] = useState<LP>(empty());

  const { data: rows = [] } = useQuery({
    queryKey: ["admin-legal-pages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("legal_pages").select("*").order("slug");
      if (error) throw error;
      return (data ?? []) as LP[];
    },
  });

  const save = useMutation({
    mutationFn: async (p: LP) => {
      const payload = { ...p, slug: p.slug || slugify(p.title), updated_by: user?.id ?? null };
      if (isNew) {
        const { error } = await supabase.from("legal_pages").insert(payload);
        if (error) throw error;
      } else {
        const { slug, ...rest } = payload;
        const { error } = await supabase.from("legal_pages").update(rest).eq("slug", slug);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-legal-pages"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEdit = (p: LP) => { setIsNew(false); setEditing(p); setOpen(true); };
  const openNew = () => { setIsNew(true); setEditing(empty()); setOpen(true); };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Public legal &amp; trust pages. Edits go live immediately.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus size={14} /> New page</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{isNew ? "New legal page" : `Edit: ${editing.title}`}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Slug</Label>
                <Input
                  value={editing.slug}
                  disabled={!isNew}
                  onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })}
                  placeholder="privacy-policy"
                />
              </div>
              <div>
                <Label>Title</Label>
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Content</Label>
                <Textarea rows={18} value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} />
                <p className="text-[11px] text-muted-foreground mt-1">Plain text with blank lines. Rendered with preserved whitespace.</p>
              </div>
            </div>
            <Button className="w-full" onClick={() => save.mutate(editing)} disabled={!editing.title || !editing.content || (isNew && !editing.slug) || save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-1">
        {rows.map((p) => (
          <div key={p.slug} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
            <div>
              <div className="font-semibold text-sm">{p.title}</div>
              <div className="text-[11px] text-muted-foreground">/{p.slug === "contact" ? "contact" : p.slug === "privacy-policy" || p.slug === "terms" || p.slug === "refund-policy" ? p.slug : `legal/${p.slug}`} · updated {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "—"}</div>
            </div>
            <div className="flex gap-1">
              <Link to="/legal/$slug" params={{ slug: p.slug }} target="_blank" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"><ExternalLink size={14} /></Link>
              <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil size={14} /></Button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-sm text-muted-foreground p-4 text-center">No legal pages yet.</div>}
      </div>
    </div>
  );
}
