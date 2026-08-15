import { rpc } from "@/lib/supabase-rpc";

/**
 * Thin typed layer over the institute test pipeline RPCs.
 *
 * Every one of these is SECURITY DEFINER. Institute staff have no direct
 * INSERT/UPDATE/DELETE on tests, test_sections or test_questions: those tables
 * only grant writes to global admins or to the row's own created_by. The
 * functions re-check is_institute_staff, so the client never needs a widened
 * policy that a crafted id could walk through.
 */

export type TestStatus = "draft" | "in_progress" | "ready_for_review" | "published" | "closed";

export const TEST_STATUS_LABEL: Record<TestStatus, string> = {
  draft: "Draft",
  in_progress: "Filling",
  ready_for_review: "Ready for review",
  published: "Published",
  closed: "Closed",
};

export interface InstituteTestRow {
  id: string;
  title: string;
  status: TestStatus;
  test_type: string;
  duration_seconds: number;
  question_count: number;
  /** Sum of every section's target count. */
  required: number;
  /** Questions actually picked so far. */
  picked: number;
  sections: number;
  opens_at: string | null;
  closes_at: string | null;
  published_at: string | null;
  created_at: string;
}

export interface SectionProgressRow {
  section_id: string;
  subject_id: string;
  subject_name: string;
  required: number;
  picked: number;
  assigned_to: string | null;
  assigned_name: string | null;
}

export interface CandidateRow {
  id: string;
  question_text: string;
  chapter_name: string | null;
  topic_name: string | null;
  difficulty: string | null;
  is_pyq: boolean | null;
  pyq_year: number | null;
  source: string;
}

export interface PickedRow {
  id: string;
  question_text: string;
  chapter_name: string | null;
  topic_name: string | null;
  difficulty: string | null;
  is_pyq: boolean | null;
  source: string;
  sort_order: number;
}

export interface RpcStatus {
  status: string;
  message?: string;
  picked?: number;
  required?: number;
  added?: number;
}

export interface StudentTestRow {
  test_id: string;
  title: string;
  institute_name: string;
  duration_seconds: number;
  question_count: number;
  opens_at: string | null;
  closes_at: string | null;
  max_attempts: number;
  attempts_used: number;
  open_now: boolean;
  last_attempt_id: string | null;
  last_submitted_at: string | null;
}

export interface ImportBatchRow {
  id: string;
  source_label: string | null;
  inserted_count: number;
  skipped_count: number;
  created_at: string;
  undone_at: string | null;
}

/**
 * Throws instead of returning the error, so a failed call surfaces in
 * react-query's error state rather than rendering as an empty list. An earlier
 * bug in the enrollment card was invisible for exactly that reason.
 */
export async function callRpc<T>(fn: string, args?: Record<string, unknown>): Promise<T | null> {
  const { data, error } = await rpc<T>(fn, args);
  if (error) throw new Error(error.message);
  return data;
}

export function minutes(seconds: number) {
  return Math.max(1, Math.round(seconds / 60));
}

/** ISO timestamp to the value a datetime-local input expects, in local time. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local value back to an ISO timestamp, or null when cleared. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
