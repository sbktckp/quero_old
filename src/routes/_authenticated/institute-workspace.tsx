import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2, LogOut, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/institute-workspace")({
  head: () => ({
    meta: [
      { title: "Institute Workspace — Coming Soon | Quero" },
      {
        name: "description",
        content:
          "Your Quero institute workspace is being built. We'll notify you as soon as faculty and institute admin tools are ready.",
      },
      { property: "og:title", content: "Institute Workspace — Coming Soon | Quero" },
      {
        property: "og:description",
        content: "Your Quero institute workspace is being built. We'll notify you when it's ready.",
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

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
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
          We&apos;ll notify you as soon as it&apos;s ready. There&apos;s nothing to manage here
          yet — no institute admin or faculty tools have shipped so far.
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
