import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { BottomNav } from "@/components/bottom-nav";
import { LogOut, Moon, Sun, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    const isDark = stored === "dark";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const { data: profile } = useQuery({
    queryKey: ["profile-detail", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: prefs } = useQuery({
    queryKey: ["prefs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_preferences").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth" });
  };

  const initials = (profile?.display_name || user?.email || "U").slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-lg px-5 py-3.5">
          <h1 className="font-bold text-lg">Profile</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 py-5 space-y-5">
        <div className="rounded-3xl bg-card border border-border p-5 shadow-card flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center text-2xl font-extrabold text-primary-foreground">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{profile?.display_name || "Student"}</div>
            <div className="text-sm text-muted-foreground truncate">{user?.email}</div>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border shadow-card divide-y divide-border">
          <Row label="Exam" value={prefs?.goal === "neet_pg" ? "NEET PG" : prefs?.goal === "neet_ug" ? "NEET UG" : "—"} />
          <Row label="Exam year" value={prefs?.exam_year ? String(prefs.exam_year) : "—"} />
          <Row label="Language" value={prefs?.language ? prefs.language[0].toUpperCase() + prefs.language.slice(1) : "—"} />
          <button onClick={() => navigate({ to: "/onboarding" })} className="w-full flex items-center justify-between px-5 py-4 text-left">
            <span className="text-sm font-medium">Edit preferences</span>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        </div>

        <button onClick={toggleDark} className="w-full flex items-center justify-between rounded-2xl bg-card border border-border shadow-card px-5 py-4">
          <div className="flex items-center gap-3">
            {dark ? <Moon size={18} /> : <Sun size={18} />}
            <span className="text-sm font-medium">Dark mode</span>
          </div>
          <span className={`h-6 w-11 rounded-full transition ${dark ? "bg-primary" : "bg-border"} relative`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${dark ? "left-5" : "left-0.5"}`} />
          </span>
        </button>

        <button onClick={logout} className="w-full flex items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 text-destructive px-5 py-3.5 font-semibold">
          <LogOut size={18} /> Log Out
        </button>
      </main>

      <BottomNav />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
