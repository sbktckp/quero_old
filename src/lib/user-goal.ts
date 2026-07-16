import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type ExamGoal = "neet_ug" | "neet_pg";
export type ExamType = "NEET_UG" | "NEET_PG";

export function goalToExamType(goal: ExamGoal | null | undefined): ExamType {
  return goal === "neet_pg" ? "NEET_PG" : "NEET_UG";
}

/**
 * Returns the current user's exam goal from user_preferences.
 * Defaults to "neet_ug" while loading or if unset.
 */
export function useUserGoal() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["user-goal", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_preferences")
        .select("goal")
        .eq("user_id", user!.id)
        .maybeSingle();
      return (data?.goal ?? "neet_ug") as ExamGoal;
    },
  });
  return {
    goal: (q.data ?? "neet_ug") as ExamGoal,
    examType: goalToExamType(q.data),
    isLoading: q.isLoading,
  };
}
