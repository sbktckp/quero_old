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
import { Plus, Pencil, ExternalLink, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/legal")({
  component: AdminLegal,
});

type SectionItem = { icon?: string; title: string; body: string };
type Sections = {
  subtitle?: string;
  intro?: string;
  illustration?: string;
  items: SectionItem[];
  trust?: { heading: string; body: string };
  contact?: { heading: string; body: string };
};
type LP = { slug: string; title: string; content: string; sections: Sections | null; updated_at?: string };

function empty(): LP { return { slug: "", title: "", content: "", sections: null }; }
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
      const { data, error } = await supabase.from("legal_pages").select("slug,title,content,sections,updated_at").order("slug");
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

  const useAccordion = !!editing.sections;
  const toggleAccordion = () => {
    if (useAccordion) {
      setEditing({ ...editing, sections: null });
    } else {
      setEditing({
        ...editing,
        sections: {
          subtitle: "",
          intro: "",
          illustration: "shield-lock",
          items: [{ icon: "user", title: "1. Section title", body: "Section body" }],
          trust: { heading: "", body: "" },
          contact: { heading: "", body: "" },
        },
      });
    }
  };

  const setS = (patch: Partial<Sections>) => {
    if (!editing.sections) return;
    setEditing({ ...editing, sections: { ...editing.sections, ...patch } });
  };
  const setItem = (i: number, patch: Partial<SectionItem>) => {
    if (!editing.sections) return;
    const items = editing.sections.items.slice();
    items[i] = { ...items[i], ...patch };
    setS({ items });
  };
  const addItem = () => setS({ items: [...(editing.sections?.items ?? []), { icon: "file-text", title: "New section", body: "" }] });
  const delItem = (i: number) => setS({ items: (editing.sections?.items ?? []).filter((_, k) => k !== i) });
  const moveItem = (i: number, d: -1 | 1) => {
    const items = (editing.sections?.items ?? []).slice();
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    [items[i], items[j]] = [items[j], items[i]];
    setS({ items });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Public legal &amp; trust pages. Edits go live immediately.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus size={14} /> New page</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{isNew ? "New legal page" : `Edit: ${editing.title}`}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Slug</Label>
                  <Input value={editing.slug} disabled={!isNew}
                    onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })}
                    placeholder="privacy-policy" />
                </div>
                <div>
                  <Label>Title</Label>
                  <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                <div>
                  <div className="text-sm font-semibold">Accordion sections</div>
                  <div className="text-[11px] text-muted-foreground">When on, the page renders numbered expandable cards with icons.</div>
                </div>
                <Button type="button" variant={useAccordion ? "default" : "outline"} size="sm" onClick={toggleAccordion}>
                  {useAccordion ? "Enabled" : "Enable"}
                </Button>
              </div>

              {useAccordion && editing.sections ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Subtitle</Label><Input value={editing.sections.subtitle ?? ""} onChange={(e) => setS({ subtitle: e.target.value })} /></div>
                    <div><Label>Illustration key</Label>
                      <Input value={editing.sections.illustration ?? ""} onChange={(e) => setS({ illustration: e.target.value })} placeholder="shield-lock | clipboard-rupee | clipboard-check" />
                    </div>
                    <div className="col-span-2"><Label>Intro</Label><Textarea rows={2} value={editing.sections.intro ?? ""} onChange={(e) => setS({ intro: e.target.value })} /></div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Sections</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus size={14} /> Add</Button>
                    </div>
                    {editing.sections.items.map((it, i) => (
                      <div key={i} className="rounded-lg border border-border p-2 space-y-2">
                        <div className="grid grid-cols-[1fr_2fr_auto] gap-2 items-start">
                          <div>
                            <Label className="text-[10px]">Icon</Label>
                            <Input value={it.icon ?? ""} onChange={(e) => setItem(i, { icon: e.target.value })} placeholder="user, lock, file-text…" />
                          </div>
                          <div>
                            <Label className="text-[10px]">Title</Label>
                            <Input value={it.title} onChange={(e) => setItem(i, { title: e.target.value })} />
                          </div>
                          <div className="flex gap-1 pt-5">
                            <Button type="button" size="icon" variant="ghost" onClick={() => moveItem(i, -1)}><ArrowUp size={14} /></Button>
                            <Button type="button" size="icon" variant="ghost" onClick={() => moveItem(i, 1)}><ArrowDown size={14} /></Button>
                            <Button type="button" size="icon" variant="ghost" onClick={() => delItem(i)}><Trash2 size={14} /></Button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-[10px]">Body (use "• " prefix on lines for bullets)</Label>
                          <Textarea rows={3} value={it.body} onChange={(e) => setItem(i, { body: e.target.value })} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-border p-2 space-y-2">
                      <div className="text-xs font-semibold">Trust callout</div>
                      <Input placeholder="Heading" value={editing.sections.trust?.heading ?? ""} onChange={(e) => setS({ trust: { heading: e.target.value, body: editing.sections?.trust?.body ?? "" } })} />
                      <Textarea rows={3} placeholder="Body" value={editing.sections.trust?.body ?? ""} onChange={(e) => setS({ trust: { heading: editing.sections?.trust?.heading ?? "", body: e.target.value } })} />
                    </div>
                    <div className="rounded-lg border border-border p-2 space-y-2">
                      <div className="text-xs font-semibold">Contact callout</div>
                      <Input placeholder="Heading" value={editing.sections.contact?.heading ?? ""} onChange={(e) => setS({ contact: { heading: e.target.value, body: editing.sections?.contact?.body ?? "" } })} />
                      <Textarea rows={3} placeholder="Body" value={editing.sections.contact?.body ?? ""} onChange={(e) => setS({ contact: { heading: editing.sections?.contact?.heading ?? "", body: e.target.value } })} />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <Label>Content</Label>
                  <Textarea rows={16} value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} />
                  <p className="text-[11px] text-muted-foreground mt-1">Plain text with blank lines. Rendered with preserved whitespace.</p>
                </div>
              )}
            </div>
            <Button className="w-full" onClick={() => save.mutate(editing)}
              disabled={!editing.title || (isNew && !editing.slug) || save.isPending || (!useAccordion && !editing.content)}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-1">
        {rows.map((p) => (
          <div key={p.slug} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
            <div>
              <div className="font-semibold text-sm flex items-center gap-2">
                {p.title}
                {p.sections && <span className="rounded-full bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5">Accordion</span>}
              </div>
              <div className="text-[11px] text-muted-foreground">
                /{p.slug === "contact" ? "contact" : p.slug === "privacy-policy" || p.slug === "terms" || p.slug === "refund-policy" ? p.slug : `legal/${p.slug}`} · updated {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "—"}
              </div>
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
