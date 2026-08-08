import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type InstituteRoleName = "institute_admin" | "faculty" | "subject_coordinator";

export interface InstituteRoleInfo {
  role: InstituteRoleName;
  instituteId: string;
  instituteName: string | null;
  assignedSubjectId: string | null;
}

const PRIORITY: InstituteRoleName[] = ["institute_admin", "faculty", "subject_coordinator"];

/**
 * The current user's institute-scoped role (highest privilege first).
 * Returns null when the user has no institute role.
 */
export function useInstituteRole() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["institute-role", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<InstituteRoleInfo | null> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, institute_id, assigned_subject_id, institutes(name)")
        .eq("user_id", user!.id)
        .not("institute_id", "is", null);
      if (error) throw error;
      const rows = (data ?? []).filter((r) => PRIORITY.includes(r.role as InstituteRoleName));
      if (!rows.length) return null;
      rows.sort(
        (a, b) =>
          PRIORITY.indexOf(a.role as InstituteRoleName) -
          PRIORITY.indexOf(b.role as InstituteRoleName),
      );
      const top = rows[0];
      return {
        role: top.role as InstituteRoleName,
        instituteId: top.institute_id as string,
        instituteName: (top.institutes as { name: string } | null)?.name ?? null,
        assignedSubjectId: top.assigned_subject_id ?? null,
      };
    },
  });

  return { info: q.data ?? null, isLoading: q.isLoading };
}

export const QUESTION_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Under review",
  approved: "Approved",
  rejected: "Rejected",
};

export function statusClasses(status: string) {
  switch (status) {
    case "approved":
      return "bg-emerald-500/10 text-emerald-600";
    case "submitted":
      return "bg-amber-500/10 text-amber-600";
    case "rejected":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}
