import { createFileRoute, Link, Outlet, useRouterState, Navigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useUserGoal } from "@/lib/user-goal";
import { CounselingDisclaimer } from "@/components/counseling-disclaimer";

export const Route = createFileRoute("/_authenticated/counseling")({
  component: CounselingLayout,
});

function CounselingLayout() {
  const { goal, isLoading } = useUserGoal();
  const path = useRouterState({ select: (s) => s.location.pathname });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }
  if (goal !== "neet_ug") {
    return <Navigate to="/home" />;
  }

  const isRoot = path === "/counseling" || path === "/counseling/";

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-lg flex items-center gap-3 px-5 py-3.5">
          <Link to={isRoot ? "/home" : "/counseling"} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-base font-bold leading-tight">Counseling Guide</h1>
            <p className="text-[10px] text-muted-foreground">NEET UG · Educational guidance</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-5 py-4 space-y-4">
        <CounselingDisclaimer />
        <Outlet />
      </main>
    </div>
  );
}
