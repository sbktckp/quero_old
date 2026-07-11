import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coming-soon/$feature")({
  component: ComingSoon,
});

const LABELS: Record<string, string> = {
  "daily-pyq": "Daily PYQ Challenge",
  "pyq-library": "PYQ Library",
  "flashcards": "Flashcards",
  "revision-planner": "Revision Planner",
  "doubt-solver": "Doubt Solver",
  "study-groups": "Study Groups",
  "leaderboard": "Leaderboard",
  "rankings": "Rankings",
  "full-test": "Full Test",
  "chapter-test": "Chapter Test",
  "topic-test": "Topic Test",
};

function ComingSoon() {
  const { feature } = Route.useParams();
  const label = LABELS[feature] ?? "This feature";
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-lg flex items-center gap-3 px-5 py-3.5">
          <Link to="/home"><ArrowLeft /></Link>
          <h1 className="font-semibold">{label}</h1>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-5 py-16 text-center">
        <div className="mx-auto h-20 w-20 rounded-3xl gradient-primary flex items-center justify-center shadow-elevated mb-5">
          <Sparkles className="text-primary-foreground" />
        </div>
        <h2 className="text-2xl font-bold">Coming soon</h2>
        <p className="text-muted-foreground mt-2 max-w-xs mx-auto">
          {label} is on the roadmap. For now, try the Subject Test on any subject to see the full test experience.
        </p>
        <Link to="/home" className="mt-8 inline-block rounded-full gradient-primary px-6 py-2.5 font-semibold text-primary-foreground shadow-card">
          Back to Home
        </Link>
      </main>
    </div>
  );
}
