import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useInstituteRole } from "@/lib/institute";
import { FacultyDashboard } from "@/components/institute/faculty-dashboard";
import { InstituteAdminDashboard } from "@/components/institute/institute-admin-dashboard";
import { Building2, LogOut, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/institute-workspace")({
  head: () => ({
    meta: [
      { title: "Institute Workspace | Quero" },
      {
        name: "description",
        content:
          "Manage faculty, review submitted questions and build institute tests inside your Quero institute workspace.",
      },
      { property: "og:title", content: "Institute Workspace | Quero" },
      {
        property: "og:description",
        content: "Faculty management, question review and institute test creation on Quero.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InstituteWorkspacePage,
});

function InstituteWorkspacePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { info, isLoading } = useInstituteRole();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-soft flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading your workspace…</p>
      </div>
    );
  }

  if (info?.role === "institute_admin" || info?.role === "faculty") {
    return (
      <div className="min-h-screen gradient-soft">
        <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-lg items-center gap-2 px-5 py-3.5">
            <Building2 size={18} className="text-primary" />
            <span className="text-sm font-semibold">Institute Workspace</span>
            <button
              type="button"
              onClick={signOut}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition"
            >
              <LogOut size={13} /> Log out
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-lg px-5 py-5">
          {info.role === "institute_admin" ? (
            <InstituteAdminDashboard info={info} />
          ) : (
            <FacultyDashboard info={info} />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-soft flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md rounded-3xl bg-card p-7 shadow-elevated text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Building2 size={24} />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
          Your institute workspace is being built
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          We&apos;ll notify you as soon as it&apos;s ready. There&apos;s nothing to manage here yet
          for your role.
        </p>
        <div className="mt-7 flex flex-col gap-2">
          <Link
            to="/profile"
            className="inline-flex items-center justify-center gap-2 rounded-2xl gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-card"
          >
            <User size={16} /> Go to my profile
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium hover:bg-muted transition"
          >
            <LogOut size={16} /> Log out
          </button>
        </div>
      </div>
    </div>
  );
}
