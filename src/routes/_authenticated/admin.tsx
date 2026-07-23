import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Loader2, LayoutDashboard, Users, BookOpen, ArrowLeft, CreditCard, GraduationCap, ScrollText, FileText, MessageCircle, Heart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { user, loading } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" });
      if (error) throw error;
      return !!data;
    },
  });

  if (loading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-xl font-bold">Admins only</h1>
        <p className="text-sm text-muted-foreground">You don't have access to this area.</p>
        <Link to="/home" className="text-primary underline text-sm">Back to home</Link>
      </div>
    );
  }

  const tabs = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/admin/users", label: "Users", icon: Users, exact: false },
    { to: "/admin/content", label: "Content", icon: BookOpen, exact: false },
    { to: "/admin/counseling", label: "Counseling", icon: GraduationCap, exact: false },
    { to: "/admin/billing", label: "Billing", icon: CreditCard, exact: false },
    { to: "/admin/activity", label: "Activity", icon: ScrollText, exact: false },
    { to: "/admin/legal", label: "Legal Pages", icon: FileText, exact: false },
    { to: "/admin/contact", label: "Contact", icon: MessageCircle, exact: false },
    { to: "/admin/team", label: "Team", icon: Heart, exact: false },
  ] as const;


  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <Link to="/home" className="text-muted-foreground hover:text-foreground"><ArrowLeft size={18} /></Link>
            <h1 className="font-bold">Quero Admin</h1>
          </div>
        </div>
        <nav className="mx-auto max-w-6xl px-5 pb-2 flex gap-1 overflow-x-auto">
          {tabs.map((t) => {
            const active = t.exact ? path === t.to : path.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link key={t.to} to={t.to}
                className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold border ${active ? "gradient-primary text-primary-foreground border-transparent" : "bg-card border-border"}`}>
                <Icon size={14} /> {t.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-6">
        <Outlet />
      </main>
    </div>
  );
}
