import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer } from "@/components/footer";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/delete-account")({
  head: () => ({
    meta: [
      { title: "Delete your account — Quero" },
      { name: "description", content: "Learn how to permanently delete your Quero account." },
    ],
  }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-lg flex items-center gap-3 px-5 py-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft size={18} /></Link>
          <h1 className="font-bold text-sm">Delete Account</h1>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-5 py-6">
        <article className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-card">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-500 mt-0.5" size={20} />
            <div>
              <h2 className="text-lg font-bold">Delete your Quero account</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Deleting your account permanently removes your profile, test attempts, answers, subscriptions, and preferences. This action cannot be undone.
              </p>
            </div>
          </div>
          <p className="text-sm">
            To delete your account, sign in and open <span className="font-semibold">Profile → Delete my account</span>. You&rsquo;ll be asked to confirm before anything is removed.
          </p>
          <Link
            to="/profile"
            className="inline-flex items-center justify-center rounded-full gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-card"
          >
            Go to Profile
          </Link>
          <p className="text-xs text-muted-foreground">
            Need help? Email <a className="underline" href="mailto:support@quero.app">support@quero.app</a>.
          </p>
        </article>
      </main>
      <Footer />
    </div>
  );
}
