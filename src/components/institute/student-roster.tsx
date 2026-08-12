import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { statusClasses, type StudentRosterRow } from "@/lib/institute";
import { Users, Search } from "lucide-react";

/**
 * Student roster shared by the faculty and institute-admin dashboards.
 * Backed by institute_student_roster(), which authorizes the caller itself --
 * the subject filter narrows attempt stats, it never hides students.
 */
export function StudentRoster({
  instituteId,
  defaultSubjectId,
  showPending = false,
  renderRowAction,
}: {
  instituteId: string;
  defaultSubjectId?: string | null;
  showPending?: boolean;
  renderRowAction?: (row: StudentRosterRow) => React.ReactNode;
}) {
  const [subjectId, setSubjectId] = useState<string>(defaultSubjectId ?? "");
  const [q, setQ] = useState("");

  const { data: subjects = [] } = useQuery({
    queryKey: ["roster-subjects"],
    queryFn: async () =>
      (await supabase.from("subjects").select("id, name").eq("is_active", true).order("sort_order"))
        .data ?? [],
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["student-roster", instituteId, subjectId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("institute_student_roster", {
        _institute_id: instituteId,
        _subject_id: subjectId || null,
      });
      if (error) throw error;
      return (data ?? []) as unknown as StudentRosterRow[];
    },
  });

  const visible = rows
    .filter((r) => (showPending ? true : r.status === "active"))
    .filter((r) => {
      if (!q.trim()) return true;
      const needle = q.toLowerCase();
      return (
        (r.display_name ?? "").toLowerCase().includes(needle) ||
        (r.email ?? "").toLowerCase().includes(needle)
      );
    });

  const activeCount = rows.filter((r) => r.status === "active").length;

  return (
    <div className="rounded-3xl bg-card border border-border p-5 shadow-card">
      <h2 className="flex items-center gap-2 font-semibold text-sm">
        <Users size={16} className="text-primary" /> Students
        <span className="ml-auto text-xs text-muted-foreground">{activeCount} enrolled</span>
      </h2>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or email"
            className="w-full rounded-2xl border border-border bg-background py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="rounded-2xl border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {subjectId && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Attempt stats below are filtered to this subject.
        </p>
      )}

      {isLoading ? (
        <p className="mt-3 text-xs text-muted-foreground">Loading roster…</p>
      ) : visible.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {rows.length === 0
            ? "No students yet. Share your join code to get them enrolled."
            : "No students match this search."}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {visible.map((s) => (
            <li
              key={s.user_id}
              className="flex items-center gap-3 rounded-2xl border border-border p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {s.display_name ?? s.email ?? "Student"}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">{s.email}</div>
                <div className="text-[11px] text-muted-foreground">
                  {s.attempts} attempt{s.attempts === 1 ? "" : "s"}
                  {s.avg_score !== null && ` · avg ${s.avg_score}`}
                  {s.last_active && ` · last ${new Date(s.last_active).toLocaleDateString()}`}
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClasses(s.status)}`}
              >
                {s.status === "active" ? "Enrolled" : "Pending"}
              </span>
              {renderRowAction?.(s)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
