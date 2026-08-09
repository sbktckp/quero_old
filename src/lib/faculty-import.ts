import { supabase } from "@/integrations/supabase/client";

export const FACULTY_IMPORT_CAP = 100;

export interface FacultyQuestionInput {
  subject_id: string;
  chapter_id: string | null;
  topic_id: string | null;
  question_text: string;
  explanation: string | null;
  difficulty: string | null;
  options: { text: string; is_correct: boolean }[];
}

/**
 * Insert a faculty-authored question + its options.
 * Always institute-scoped, authored by the faculty member, and status='submitted'
 * so it goes through the institute admin's review queue.
 */
export async function insertFacultyQuestion(
  input: FacultyQuestionInput,
  ctx: { instituteId: string; userId: string },
) {
  const { data, error } = await supabase
    .from("questions")
    .insert({
      subject_id: input.subject_id,
      chapter_id: input.chapter_id,
      topic_id: input.topic_id,
      question_text: input.question_text,
      explanation: input.explanation,
      difficulty: input.difficulty,
      institute_id: ctx.instituteId,
      created_by: ctx.userId,
      status: "submitted",
      rejection_reason: null,
    })
    .select("id")
    .single();
  if (error) throw error;

  const rows = input.options
    .filter((o) => o.text.trim())
    .map((o, i) => ({
      question_id: data.id,
      option_text: o.text.trim(),
      is_correct: o.is_correct,
      sort_order: i + 1,
    }));
  const { error: optErr } = await supabase.from("options").insert(rows);
  if (optErr) throw optErr;

  return data.id;
}
