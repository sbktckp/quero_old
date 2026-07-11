import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Splash,
});

function Splash() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(async () => {
      if (!session) {
        navigate({ to: "/auth" });
        return;
      }
      const { data } = await supabase
        .from("user_preferences")
        .select("onboarding_completed")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!data?.onboarding_completed) navigate({ to: "/onboarding" });
      else navigate({ to: "/home" });
    }, 1200);
    return () => clearTimeout(t);
  }, [session, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center gradient-soft">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center gap-6"
      >
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl gradient-primary shadow-elevated">
          <span className="text-5xl font-extrabold text-primary-foreground">Q</span>
        </div>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, ease: "linear", repeat: Infinity }}
          className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary"
        />
      </motion.div>
    </div>
  );
}
