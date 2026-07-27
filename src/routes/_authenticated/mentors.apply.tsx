import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";
import { ArrowLeft, Upload, CheckCircle2, Clock, XCircle } from "lucide-react";
import { LANGUAGE_OPTIONS, YEAR_OPTIONS, uploadMentorFile, type MentorRow } from "@/lib/mentors";

export const Route = createFileRoute("/_authenticated/mentors/apply")({
  head: () => ({
    meta: [
      { title: "Become a Mentor — Quero" },
      { name: "description", content: "Apply to mentor NEET UG aspirants as a verified MBBS student and earn per session." },
      { property: "og:title", content: "Become a Mentor — Quero" },
      { property: "og:description", content: "Verified MBBS students can guide NEET UG aspirants and earn per session." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BecomeMentor,
});

type Docs = { student_id_url: string | null; college_id_card_url: string | null; selfie_url: string | null; fee_receipt_url: string | null };

function BecomeMentor() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: mentor, isLoading } = useQuery({
    queryKey: ["my-mentor-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentors").select("*, colleges(id, name, state, city)").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as MentorRow | null;
    },
  });

  const { data: colleges = [] } = useQuery({
    queryKey: ["colleges-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colleges").select("id, name, state").eq("is_active", true).order("name").limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: docs } = useQuery({
    queryKey: ["my-mentor-docs", mentor?.id],
    enabled: !!mentor?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentor_verification_documents")
        .select("student_id_url, college_id_card_url, selfie_url, fee_receipt_url")
        .eq("mentor_id", mentor!.id).maybeSingle();
      if (error) throw error;
      return (data ?? null) as Docs | null;
    },
  });

  const [form, setForm] = useState({
    full_name: "", college_id: "", current_year: "", bio: "", gender: "", languages: [] as string[], photo_url: null as string | null,
  });
  const [initialized, setInitialized] = useState(false);
  if (mentor && !initialized) {
    setInitialized(true);
    setForm({
      full_name: mentor.full_name, college_id: mentor.college_id, current_year: mentor.current_year,
      bio: mentor.bio ?? "", gender: mentor.gender ?? "", languages: mentor.languages ?? [], photo_url: mentor.photo_url,
    });
  }

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const saveProfile = async () => {
    if (!form.full_name || !form.college_id || !form.current_year) { toast.error("Name, college and year are required"); return; }
    setSaving(true);
    const payload = {
      full_name: form.full_name, college_id: form.college_id, current_year: form.current_year,
      bio: form.bio || null, gender: form.gender || null, languages: form.languages, photo_url: form.photo_url,
    };
    const res = mentor
      ? await supabase.from("mentors").update(payload).eq("id", mentor.id)
      : await supabase.from("mentors").insert({ ...payload, user_id: user!.id });
    setSaving(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(mentor ? "Profile updated" : "Application started — upload your documents next");
    qc.invalidateQueries({ queryKey: ["my-mentor-profile"] });
  };

  const uploadDoc = async (field: keyof Docs, file: File) => {
    if (!mentor) { toast.error("Save your profile first"); return; }
    setUploading(field);
    try {
      const url = await uploadMentorFile(user!.id, "docs", file);
      const patch: Partial<Docs> = { [field]: url };
      const { data: existing } = await supabase
        .from("mentor_verification_documents").select("id").eq("mentor_id", mentor.id).maybeSingle();
      const { error } = existing
        ? await supabase.from("mentor_verification_documents").update(patch).eq("id", existing.id)
        : await supabase.from("mentor_verification_documents").insert({ mentor_id: mentor.id, ...patch });
      if (error) throw error;
      toast.success("Uploaded");
      qc.invalidateQueries({ queryKey: ["my-mentor-docs"] });

    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(null);
    }
  };

  const statusBadge = () => {
    if (!mentor) return null;
    const map: Record<string, { icon: typeof Clock; text: string; cls: string }> = {
      pending: { icon: Clock, text: "Verification pending", cls: "bg-amber-500/15 text-amber-600" },
      verified: { icon: CheckCircle2, text: "Verified mentor", cls: "bg-emerald-500/15 text-emerald-600" },
      rejected: { icon: XCircle, text: "Application rejected", cls: "bg-destructive/15 text-destructive" },
      suspended: { icon: XCircle, text: "Suspended", cls: "bg-destructive/15 text-destructive" },
    };
    const s = map[mentor.verification_status] ?? map.pending;
    return (
      <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${s.cls}`}>
        <s.icon size={15} /> {s.text}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-lg px-5 py-3 flex items-center gap-3">
          <Link to="/mentors" className="text-muted-foreground"><ArrowLeft size={18} /></Link>
          <h1 className="font-bold">Become a Mentor</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 py-5 space-y-4">
        {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {statusBadge()}
        {mentor?.verification_status === "verified" && (
          <Link to="/mentors/dashboard"><Button variant="outline" className="w-full">Go to mentor dashboard</Button></Link>
        )}

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-3">
          <h2 className="font-semibold text-sm">Your details</h2>
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 rounded-2xl bg-muted overflow-hidden border border-border flex items-center justify-center">
              {form.photo_url ? <img src={form.photo_url} alt="" className="h-full w-full object-cover" /> : <span className="text-[10px] text-muted-foreground">No photo</span>}
            </div>
            <div>
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return;
                setUploading("photo");
                try { setForm((s) => ({ ...s, photo_url: await uploadMentorFile(user!.id, "photos", f) })); toast.success("Photo uploaded"); }
                catch (err) { toast.error((err as Error).message); } finally { setUploading(null); if (photoRef.current) photoRef.current.value = ""; }
              }} />
              <Button type="button" variant="outline" size="sm" disabled={uploading === "photo"} onClick={() => photoRef.current?.click()}>
                <Upload size={14} /> {uploading === "photo" ? "Uploading…" : "Upload photo"}
              </Button>
            </div>
          </div>

          <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>

          <div>
            <Label>College</Label>
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.college_id} onChange={(e) => setForm({ ...form, college_id: e.target.value })}>
              <option value="">Select your college</option>
              {colleges.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.state}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Current year</Label>
              <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.current_year} onChange={(e) => setForm({ ...form, current_year: e.target.value })}>
                <option value="">Select</option>
                {YEAR_OPTIONS.map((y) => <option key={y.value} value={y.value}>{y.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Gender</Label>
              <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <Label>Languages</Label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {LANGUAGE_OPTIONS.map((l) => {
                const on = form.languages.includes(l);
                return (
                  <button key={l} type="button" onClick={() => setForm({ ...form, languages: on ? form.languages.filter((x) => x !== l) : [...form.languages, l] })}>
                    <Badge variant={on ? "default" : "secondary"}>{l}</Badge>
                  </button>
                );
              })}
            </div>
          </div>

          <div><Label>Bio</Label><Textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell aspirants how you can help them…" /></div>

          <Button className="w-full" disabled={saving} onClick={saveProfile}>{saving ? "Saving…" : mentor ? "Update profile" : "Start application"}</Button>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-3">
          <h2 className="font-semibold text-sm">Verification documents</h2>
          <p className="text-xs text-muted-foreground">Private — visible only to you and the Quero verification team.</p>
          {!mentor && <p className="text-xs text-muted-foreground">Save your profile above to unlock uploads.</p>}
          {([
            ["student_id_url", "Government ID (Aadhaar / passport)"],
            ["college_id_card_url", "College ID card"],
            ["selfie_url", "Selfie holding your college ID"],
            ["fee_receipt_url", "Fee receipt / admission letter"],
          ] as [keyof Docs, string][]).map(([field, label]) => (
            <DocRow key={field} label={label} done={!!docs?.[field]} busy={uploading === field} disabled={!mentor}
              onPick={(f) => uploadDoc(field, f)} />
          ))}
        </section>
      </main>
      <BottomNav />
    </div>
  );
}

function DocRow({ label, done, busy, disabled, onPick }: {
  label: string; done: boolean; busy: boolean; disabled: boolean; onPick: (f: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center justify-between rounded-xl border border-border p-3">
      <div className="text-sm min-w-0">
        <div className="truncate">{label}</div>
        {done && <div className="text-[11px] text-emerald-600 flex items-center gap-1"><CheckCircle2 size={11} /> Uploaded</div>}
      </div>
      <input ref={ref} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); if (ref.current) ref.current.value = ""; }} />
      <Button size="sm" variant="outline" disabled={disabled || busy} onClick={() => ref.current?.click()}>
        <Upload size={13} /> {busy ? "…" : done ? "Replace" : "Upload"}
      </Button>
    </div>
  );
}
