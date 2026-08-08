import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type TestType = Database["public"]["Enums"]["test_type"];
type TestMode = Database["public"]["Enums"]["test_mode"];

export interface BuildTestInput {
  userId: string;
  title: string;
  testType: TestType;
  mode: TestMode;
  durationMinutes: number;
  questionCount: number;
  subjectId?: string | null;
  chapterId?: string | null;
  topicId?: string | null;
  /** When set, the pool is the global bank plus this institute's approved questions, and the test is tagged with it. */
  instituteId?: string | null;
  filters?: {
    subjectIds?: string[];
    difficulties?: string[];
    isPyq?: boolean;
    pyqYear?: number | null;
    pyqExam?: string | null;
  };
}

export async function buildAndStartTest(input: BuildTestInput): Promise<string> {
  // 1) Sample question IDs
  let q = supabase.from("questions").select("id").eq("status", "approved");
  if (input.instituteId) q = q.or(`institute_id.is.null,institute_id.eq.${input.instituteId}`);
  else q = q.is("institute_id", null);
  if (input.chapterId) q = q.eq("chapter_id", input.chapterId);
  else if (input.topicId) q = q.eq("topic_id", input.topicId);
  else if (input.subjectId) q = q.eq("subject_id", input.subjectId);
  if (input.filters?.subjectIds?.length) q = q.in("subject_id", input.filters.subjectIds);
  if (input.filters?.difficulties?.length) q = q.in("difficulty", input.filters.difficulties);
  if (input.filters?.isPyq) q = q.eq("is_pyq", true);
  if (input.filters?.pyqYear) q = q.eq("pyq_year", input.filters.pyqYear);
  if (input.filters?.pyqExam) q = q.eq("pyq_exam", input.filters.pyqExam);

  const { data: pool, error: poolErr } = await q.limit(500);
  if (poolErr) throw poolErr;
  if (!pool?.length) throw new Error("No questions match those filters.");

  // Shuffle and take N
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const chosen = shuffled.slice(0, Math.min(input.questionCount, shuffled.length));

  // 2) Create test
  const { data: test, error: testErr } = await supabase
    .from("tests")
    .insert({
      title: input.title,
      test_type: input.testType,
      mode: input.mode,
      subject_id: input.subjectId ?? null,
      chapter_id: input.chapterId ?? null,
      topic_id: input.topicId ?? null,
      duration_seconds: input.durationMinutes * 60,
      question_count: chosen.length,
      created_by: input.userId,
    })
    .select()
    .single();
  if (testErr || !test) throw testErr ?? new Error("Could not create test");

  // 3) Insert test_questions
  const rows = chosen.map((c, i) => ({ test_id: test.id, question_id: c.id, sort_order: i + 1 }));
  const { error: tqErr } = await supabase.from("test_questions").insert(rows);
  if (tqErr) throw tqErr;

  // 4) Create attempt
  const { data: attempt, error: aErr } = await supabase
    .from("test_attempts")
    .insert({
      user_id: input.userId,
      test_id: test.id,
      subject_id: input.subjectId ?? null,
      test_type: input.testType,
      mode: input.mode,
      duration_seconds: input.durationMinutes * 60,
      total_questions: chosen.length,
    })
    .select()
    .single();
  if (aErr || !attempt) throw aErr ?? new Error("Could not start attempt");

  return attempt.id;
}
