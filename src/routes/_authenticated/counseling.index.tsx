import { createFileRoute, Link } from "@tanstack/react-router";
import { Calculator, GitCompare, Search, Calendar, ListChecks, ClipboardList, BookOpen, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/counseling/")({
  component: CounselingHub,
});

const items = [
  { to: "/counseling/predictor", label: "College Predictor", desc: "Estimate colleges by AIR & category", Icon: Calculator },
  { to: "/counseling/compare", label: "College Comparison", desc: "Compare 2–5 colleges side by side", Icon: GitCompare },
  { to: "/counseling/explorer", label: "College Explorer", desc: "Search & filter medical colleges", Icon: Search },
  { to: "/counseling/calendar", label: "Counseling Calendar", desc: "Important dates & rounds", Icon: Calendar },
  { to: "/counseling/roadmap", label: "Counseling Roadmap", desc: "9-step admission journey", Icon: ListChecks },
  { to: "/counseling/choice-filling", label: "Choice Filling Guidance", desc: "How to prioritize preferences", Icon: ClipboardList },
  { to: "/counseling/resources", label: "Learning Resources", desc: "Articles, FAQ, policies", Icon: BookOpen },
] as const;

function CounselingHub() {
  return (
    <div className="space-y-2">
      {items.map(({ to, label, desc, Icon }) => (
        <Link key={to} to={to} className="flex items-center gap-3 rounded-2xl bg-card border border-border p-4 shadow-card hover:border-primary/40 transition">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground">
            <Icon size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">{label}</div>
            <div className="text-xs text-muted-foreground truncate">{desc}</div>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </Link>
      ))}
    </div>
  );
}
