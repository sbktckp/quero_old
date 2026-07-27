import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/bottom-nav";
import { BadgeCheck, Star, MessageCircle, Search, Users } from "lucide-react";
import { LANGUAGE_OPTIONS, YEAR_OPTIONS, yearLabel, type MentorRow } from "@/lib/mentors";

type MentorSearch = { college?: string };

export const Route = createFileRoute("/_authenticated/mentors/")({
  validateSearch: (s: Record<string, unknown>): MentorSearch => ({
    college: typeof s.college === "string" ? s.college : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Talk to a Medical Student — Quero" },
      { name: "description", content: "Book 1:1 guidance with verified MBBS students from your dream medical college." },
      { property: "og:title", content: "Talk to a Medical Student — Quero" },
      { property: "og:description", content: "Verified MBBS student mentors for NEET UG aspirants." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MentorDirectory,
});

function MentorDirectory() {
  const search = useSearch({ from: "/_authenticated/mentors/" });
  const [q, setQ] = useState("");
  const [state, setState] = useState("");
  const [collegeId, setCollegeId] = useState(search.college ?? "");
  const [year, setYear] = useState("");
  const [language, setLanguage] = useState("");
  const [gender, setGender] = useState("");

  const { data: mentors = [], isLoading } = useQuery({
    queryKey: ["mentors-directory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentors")
        .select("*, colleges(id, name, state, city)")
        .eq("verification_status", "verified")
        .eq("is_active", true)
        .order("rating", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MentorRow[];
    },
  });

  const states = useMemo(
    () => [...new Set(mentors.map((m) => m.colleges?.state).filter(Boolean) as string[])].sort(),
    [mentors],
  );
  const colleges = useMemo(() => {
    const map = new Map<string, string>();
    mentors.forEach((m) => { if (m.colleges) map.set(m.colleges.id, m.colleges.name); });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [mentors]);

  const filtered = mentors.filter((m) => {
    if (q && !`${m.full_name} ${m.colleges?.name ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (state && m.colleges?.state !== state) return false;
    if (collegeId && m.college_id !== collegeId) return false;
    if (year && m.current_year !== year) return false;
    if (language && !(m.languages ?? []).includes(language)) return false;
    if (gender && m.gender !== gender) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background pb-28">
      <section className="gradient-primary text-primary-foreground">
        <div className="mx-auto max-w-lg px-5 pt-8 pb-10">
          <Badge className="bg-white/20 text-white border-0 mb-3">1:1 Guidance</Badge>
          <h1 className="text-2xl font-extrabold leading-tight">
            Get guidance from verified MBBS students studying in your dream medical college.
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Real students. Real experience. Book a chat or a call in minutes.
          </p>
          <div className="mt-4 flex gap-2">
            <a href="#find" className="rounded-full bg-white text-primary px-4 py-2 text-sm font-semibold">Find Mentor</a>
            <Link to="/mentors/apply" className="rounded-full bg-white/15 border border-white/30 px-4 py-2 text-sm font-semibold">
              Become a Mentor
            </Link>
          </div>
        </div>
      </section>

      <main id="find" className="mx-auto max-w-lg px-5 py-5 space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2 shadow-card">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search mentor or college" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={state} onChange={setState} placeholder="All states" options={states.map((s) => [s, s])} />
            <Select value={collegeId} onChange={setCollegeId} placeholder="All colleges" options={colleges} />
            <Select value={year} onChange={setYear} placeholder="Any year" options={YEAR_OPTIONS.map((y) => [y.value, y.label])} />
            <Select value={language} onChange={setLanguage} placeholder="Any language" options={LANGUAGE_OPTIONS.map((l) => [l, l])} />
            <Select value={gender} onChange={setGender} placeholder="Any gender" options={[["male", "Male"], ["female", "Female"], ["other", "Other"]]} />
            <Button variant="outline" onClick={() => { setQ(""); setState(""); setCollegeId(""); setYear(""); setLanguage(""); setGender(""); }}>
              Reset
            </Button>
          </div>
        </div>

        {isLoading && <div className="text-sm text-muted-foreground text-center py-8">Loading mentors…</div>}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <Users size={20} />
            No mentors match these filters yet.
          </div>
        )}

        <div className="space-y-3">
          {filtered.map((m) => (
            <div key={m.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex gap-3">
                <Avatar url={m.photo_url} name={m.full_name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <div className="font-semibold truncate">{m.full_name}</div>
                    <BadgeCheck size={15} className="text-primary shrink-0" />
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {yearLabel(m.current_year)} · {m.colleges?.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {m.colleges?.city ? `${m.colleges.city}, ` : ""}{m.colleges?.state}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1 font-semibold">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      {Number(m.rating).toFixed(1)}
                    </span>
                    <span className="text-muted-foreground">({m.total_reviews} reviews)</span>
                    <span className="text-muted-foreground">· {m.total_sessions} sessions</span>
                  </div>
                  {(m.languages ?? []).length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {(m.languages ?? []).slice(0, 4).map((l) => (
                        <span key={l} className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{l}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Link to="/mentors/$id" params={{ id: m.id }} className="col-span-2">
                  <Button className="w-full" size="sm">View Profile · Book</Button>
                </Link>
                <Link to="/mentors/chat/$mentorId" params={{ mentorId: m.id }}>
                  <Button variant="outline" size="sm" className="w-full"><MessageCircle size={14} /> Chat</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function Select({ value, onChange, placeholder, options }: {
  value: string; onChange: (v: string) => void; placeholder: string; options: [string, string][];
}) {
  return (
    <select
      className="rounded-md border border-input bg-background px-3 py-2 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

export function Avatar({ url, name, size = 56 }: { url: string | null; name: string; size?: number }) {
  return (
    <div
      className="rounded-2xl bg-muted overflow-hidden shrink-0 border border-border flex items-center justify-center font-bold text-muted-foreground"
      style={{ height: size, width: size }}
    >
      {url ? <img src={url} alt={name} className="h-full w-full object-cover" /> : name.slice(0, 1).toUpperCase()}
    </div>
  );
}
