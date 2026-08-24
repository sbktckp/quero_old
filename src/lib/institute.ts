import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";
import { rpc } from "@/lib/supabase/rpc";

export type InstituteRoleName = "institute_admin" | "faculty" | "subject_coordinator";

export interface InstituteRoleInfo {
  role: InstituteRoleName;
  instituteId: string;
  instituteName: string | null;
  assignedSubjectId: string | null;
}

const PRIORITY: InstituteRoleName[] = ["institute_admin", "faculty", "subject_coordinator"];

/** The current user's institute-scoped role (highest privilege first). */
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
      const top = rows[0]!;
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

export interface InstituteContext {
  institute_id: string;
  institute_name: string;
  institute_slug: string;
  roles: string[];
  enrollment_status: "pending" | "active" | "rejected" | "removed" | null;
  join_code: string | null;
}

/** Single source of truth for "which institute am I in, and as what". */
export function useInstituteContext() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["institute-context", user?.id],
    enabled: !!user,
    retry: false,
    staleTime: 30_000,
    queryFn: async (): Promise<InstituteContext | null> => {
      const { data, error } = await rpc<InstituteContext>("my_institute_context");
      if (error) throw new Error(error.message);
      return data ?? null;
    },
  });
}

export type EnrollmentStatus = "pending" | "active" | "rejected" | "removed";

export type StudentRosterRow = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  status: EnrollmentStatus;
  enrolled_at: string | null;
  attempts: number;
  avg_score: number | null;
  last_active: string | null;
};

export type StaffRosterRow = {
  user_id: string | null;
  display_name: string | null;
  email: string | null;
  role: string;
  assigned_subject_id: string | null;
  is_invite: boolean;
  invite_id: string | null;
  invite_status: string | null;
};

export type ReviewQueueRow = {
  id: string;
  question_text: string;
  explanation: string | null;
  difficulty: string | null;
  created_by: string | null;
  author_name: string | null;
  created_at: string;
  options: { option_text: string; is_correct: boolean; sort_order: number | null }[];
};

export const QUESTION_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Under review",
  approved: "Approved",
  rejected: "Rejected",
};

export function statusClasses(status: string) {
  switch (status) {
    case "approved":
    case "active":
      return "bg-emerald-500/10 text-emerald-600";
    case "submitted":
    case "pending":
      return "bg-amber-500/10 text-amber-600";
    case "rejected":
    case "removed":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}
