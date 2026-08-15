import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useUserGoal } from "@/lib/user-goal";
import { BottomNav } from "@/components/bottom-nav";
import { AssignedTests } from "@/components/home/assigned-tests";
import {
  Search, ChevronRight, Trophy, Flame, BookOpen, FileText, Calendar, HelpCircle, Users,
  GraduationCap,
  Atom, FlaskConical, Leaf, Bug, Bone, HeartPulse, Pill, Microscope, Fingerprint, Ear,
  Eye, Stethoscope, Scissors, Baby, Hand, Brain, Scan, Syringe,
} from "lucide-react";
import { motion } from "framer-motion";

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  physics: Atom, chemistry: FlaskConical, botany: Leaf, zoology: Bug,
  anatomy: Bone, physiology: HeartPulse, biochemistry: FlaskConical, pharmacology: Pill,
  pathology: Microscope, microbiology: Bug, "forensic-medicine": Fingerprint,
  "community-medicine": Users, ent: Ear, ophthalmology: Eye,
  "general-medicine": Stethoscope, "general-surgery": Scissors, obgyn: Baby,
  pediatrics: Baby, orthopedics: Bone, dermatology: Hand, psychiatry: Brain,
  radiology: Scan, anaesthesia: Syringe,
};

export function HomeDashboard() {
  const { user } = useAuth();
  const { goal, examType } = useUserGoal();
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects", goal],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("*")
        .filter("exam_type", "eq", examType)
        .filter("is_active", "eq", true)
        .order("sort_order");
      if (error) throw error; return data;
    },
  });
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });
  const { data: lastAttempt } = useQuery({
    queryKey: ["last-attempt", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("test_attempts").select("*, subjects(name, slug)")
        .eq("user_id", user!.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });
  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" });
      return !!data;
    },
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-lg flex items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-card">
              <span className="text-base font-extrabold text-primary-foreground">Q</span>
            </div>
            <span className="text-lg font-bold">Quero</span>
          </div>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <Link to="/admin" className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary-soft text-primary">Admin</Link>
            )}
            <Link to="/search" className="p-2 rounded-full hover:bg-muted">
              <Search size={20} />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 py-4 space-y-5">
        <div>
          <p className="text-sm text-muted-foreground">Hi {profile?.display_name || "there"} 👋</p>
          <h1 className="text-xl font-bold">Let's ace NEET today</h1>
        </div>

        {/* Tests the student's institute has published. Renders nothing when
            they are not enrolled anywhere. */}
        <AssignedTests />

        {/* Daily PYQ Challenge */}
        <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <Link to="/pyq" className="block rounded-3xl gradient-primary p-5 shadow-elevated text-primary-foreground">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider opacity-80">Daily Challenge</div>
                <div className="text-lg font-bold mt-0.5">Daily PYQ Challenge</div>
              </div>
              <ChevronRight />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <PyqStat label="Questions" value="20" />
              <PyqStat label="Solve" value="15m" />
              <PyqStat label="XP" value="+50" />
            </div>
          </Link>
        </motion.div>

        {/* Continue Studying */}
        {lastAttempt && (
          <section className="rounded-3xl bg-card border border-border p-5 shadow-card">
            <h2 className="font-semibold">Continue Studying</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Last session · {(lastAttempt as { subjects?: { name?: string } }).subjects?.name ?? "Test"}
            </p>
            <Link to="/subject/$slug" params={{ slug: (lastAttempt as { subjects?: { slug?: string } }).subjects?.slug ?? "physics" }}>
              <button className="mt-3 rounded-full bg-primary-soft text-primary text-sm font-semibold px-4 py-2">
                Resume Last Session
              </button>
            </Link>
          </section>
        )}

        {/* Subjects */}
        <section>
          <h2 className="font-semibold mb-3">Subjects</h2>
          <div className="grid grid-cols-4 gap-3">
            {subjects.map((s) => {
              const Icon = ICONS[s.slug] || Atom;
              return (
                <Link key={s.id} to="/subject/$slug" params={{ slug: s.slug }}
                  className="rounded-2xl bg-card border border-border p-3 shadow-card flex flex-col items-center gap-2 hover:border-primary/40 transition">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}20` }}>
                    <Icon size={20} className="text-primary" />
                  </div>
                  <div className="text-xs font-medium text-center leading-tight">{s.name}</div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Mock Tests row */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Tests</h2>
            <Link to="/tests/new" search={{ type: "custom" }} className="text-xs text-primary font-semibold flex items-center">
              Create <ChevronRight size={14} />
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Link to="/subject/$slug" params={{ slug: subjects[0]?.slug ?? "physics" }}
              className="shrink-0 rounded-full px-4 py-2 text-xs font-semibold gradient-primary text-primary-foreground">
              Subject Test
            </Link>
            <Link to="/tests/new" search={{ type: "chapter" }} className="shrink-0 rounded-full px-4 py-2 text-xs font-semibold bg-card border border-border">Chapter Test</Link>
            <Link to="/tests/new" search={{ type: "topic" }} className="shrink-0 rounded-full px-4 py-2 text-xs font-semibold bg-card border border-border">Topic Test</Link>
            <Link to="/tests/new" search={{ type: "custom" }} className="shrink-0 rounded-full px-4 py-2 text-xs font-semibold bg-card border border-border">Custom Test</Link>
          </div>
        </section>

        {/* Feature list rows */}
        <section className="space-y-2">
          <Link to="/pyq" className="flex items-center justify-between rounded-2xl bg-card border border-border p-4 shadow-card hover:border-primary/30 transition">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary-soft flex items-center justify-center">
                <BookOpen size={18} className="text-primary" />
              </div>
              <span className="font-medium text-sm">PYQ Library</span>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </Link>
          <FeatureRow icon={FileText} label="Flashcards" to="flashcards" />
          <FeatureRow icon={Calendar} label="Revision Planner" to="revision-planner" />
          <FeatureRow icon={HelpCircle} label="Doubt Solver" to="doubt-solver" />
          <FeatureRow icon={Users} label="Study Groups" to="study-groups" />
          {goal === "neet_ug" && (
            <Link to="/counseling" className="flex items-center justify-between rounded-2xl bg-card border border-border p-4 shadow-card hover:border-primary/30 transition">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary-soft flex items-center justify-center">
                  <GraduationCap size={18} className="text-primary" />
                </div>
                <div>
                  <div className="font-medium text-sm">Counseling Guide</div>
                  <div className="text-[10px] text-muted-foreground">Predictor · Colleges · Calendar</div>
                </div>
              </div>
              <ChevronRight size={18} className="text-muted-foreground" />
            </Link>
          )}
        </section>

        {/* Leaderboard + Streak */}
        <section className="grid grid-cols-2 gap-3">
          <Link to="/coming-soon/$feature" params={{ feature: "leaderboard" }}
            className="rounded-2xl bg-card border border-border p-4 shadow-card">
            <Trophy className="text-warning mb-2" />
            <div className="font-semibold text-sm">Leaderboard</div>
            <div className="text-xs text-muted-foreground">Coming soon</div>
          </Link>
          <div className="rounded-2xl bg-card border border-border p-4 shadow-card">
            <Flame className="text-destructive mb-2" />
            <div className="font-semibold text-sm">Daily Streak</div>
            <div className="text-xs text-muted-foreground">Build it daily</div>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}

function PyqStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 py-2">
      <div className="font-bold">{value}</div>
      <div className="opacity-80">{label}</div>
    </div>
  );
}

function FeatureRow({ icon: Icon, label, to }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; to: string }) {
  return (
    <Link to="/coming-soon/$feature" params={{ feature: to }}
      className="flex items-center justify-between rounded-2xl bg-card border border-border p-4 shadow-card hover:border-primary/30 transition">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary-soft flex items-center justify-center">
          <Icon size={18} className="text-primary" />
        </div>
        <span className="font-medium text-sm">{label}</span>
      </div>
      <ChevronRight size={18} className="text-muted-foreground" />
    </Link>
  );
}
