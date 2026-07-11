import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
});

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase JS parses the recovery hash automatically and fires a PASSWORD_RECOVERY event.
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated");
      navigate({ to: "/" });
    }
  };

  return (
    <div className="min-h-screen gradient-soft flex items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-elevated">
        <h1 className="text-2xl font-bold mb-1 text-center">New password</h1>
        <p className="text-center text-sm text-muted-foreground mb-6">
          {ready ? "Enter your new password" : "Verifying reset link..."}
        </p>
        {ready && (
          <form onSubmit={submit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              className="input"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-2xl gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-card disabled:opacity-60"
            >
              {busy ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
