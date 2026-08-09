import { createServerFn } from "@tanstack/react-start";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function gateway() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}

type SbLike = {
  rpc: (
    fn: "has_role",
    args: { _user_id: string; _role: "admin" | "student" },
  ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
  from: (t: "user_roles") => {
    select: (c: string) => {
      eq: (
        c: string,
        v: string,
      ) => {
        not: (
          c: string,
          op: string,
          v: null,
        ) => {
          limit: (n: number) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
        };
      };
    };
  };
};

/** Allow global admins and institute-scoped staff (faculty / institute admins). */
async function assertAdmin(ctx: { supabase: unknown; userId: string }) {
  const sb = ctx.supabase as SbLike;
  const { data, error } = await sb.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (data) return;

  const inst = await sb.from("user_roles").select("id").eq("user_id", ctx.userId).not("institute_id", "is", null).limit(1);
  if (inst.error) throw new Error(inst.error.message);
  if (inst.data && inst.data.length > 0) return;

  throw new Error("Forbidden");
}

// Extract the first JSON block from a model response (```json ... ``` or bare JSON).
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced ? fenced[1] : text).trim();
  // Try direct parse first.
  try { return JSON.parse(raw); } catch { /* fall through */ }
  // Try to grab the outer array or object.
  const arrMatch = raw.match(/\[[\s\S]*\]/);
  if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch { /* noop */ } }
  const objMatch = raw.match(/\{[\s\S]*\}/);
  if (objMatch) { try { return JSON.parse(objMatch[0]); } catch { /* noop */ } }
  throw new Error("Model did not return valid JSON");
}

const CandidateSchema = z.object({
  question_text: z.string().min(4),
  options: z.array(z.string().min(1)).length(4),
  correct_index: z.number().int().min(0).max(3),
  explanation: z.string().default(""),
  difficulty: z.string().default("Medium"),
  suggested_chapter: z.string().nullable().optional(),
  suggested_topic: z.string().nullable().optional(),
});

export type McqCandidate = z.infer<typeof CandidateSchema>;

const GenerateInput = z.object({
  notes: z.string().min(10).max(20000),
  exam: z.enum(["NEET UG", "NEET PG"]),
  subjectName: z.string().min(1),
  chapterHint: z.string().nullable().optional(),
  topicHint: z.string().nullable().optional(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  count: z.number().int().min(1).max(10),
  suggestTaxonomy: z.boolean().default(false),
});

export const generateMcqs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => GenerateInput.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const provider = gateway();
    const model = provider("google/gemini-3.1-pro-preview");

    const system = [
      "You write high-quality multiple-choice questions for medical entrance exams (NEET UG and NEET PG).",
      "STRICT RULES:",
      "- Every question MUST have exactly 4 options.",
      "- Exactly one correct answer, indicated by correct_index (0..3).",
      "- Questions must be self-contained. Never reference 'the passage above', 'the diagram', or external context.",
      "- No spelling or terminology errors. Use standard medical nomenclature.",
      "- Match the requested difficulty faithfully.",
      "- Respond with ONLY a JSON array. No prose, no markdown fences.",
      "- Each element shape: { question_text, options[4], correct_index, explanation, difficulty, suggested_chapter, suggested_topic }.",
    ].join("\n");

    const prompt = [
      `Exam: ${data.exam}`,
      `Subject: ${data.subjectName}`,
      data.chapterHint ? `Chapter: ${data.chapterHint}` : `Chapter: (suggest a chapter name from the notes)`,
      data.topicHint ? `Topic: ${data.topicHint}` : `Topic: (suggest a topic name from the notes)`,
      `Difficulty: ${data.difficulty}`,
      `Number of questions: ${data.count}`,
      "",
      "Notes:",
      data.notes,
      "",
      `Return a JSON array of exactly ${data.count} MCQ objects.`,
    ].join("\n");

    const { text } = await generateText({ model, system, prompt });
    const parsed = extractJson(text);
    const arr = Array.isArray(parsed) ? parsed : [];
    const out: McqCandidate[] = [];
    for (const item of arr) {
      const r = CandidateSchema.safeParse(item);
      if (r.success) out.push(r.data);
    }
    return { candidates: out };
  });

const ValidateInput = z.object({
  candidate: CandidateSchema,
});

const VerdictSchema = z.object({
  verdict: z.enum(["pass", "revise", "reject"]),
  corrected_question: CandidateSchema.optional().nullable(),
  reason: z.string().optional().nullable(),
});

export type McqVerdict = z.infer<typeof VerdictSchema>;

export const validateMcq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ValidateInput.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const provider = gateway();
    // Use a different model family than the generator for a genuine second opinion.
    const model = provider("openai/gpt-5.4");

    const system = [
      "You are an independent MCQ reviewer for medical entrance exams (NEET).",
      "You receive ONE candidate question. Judge it strictly.",
      "Check:",
      "1. Exactly one option is unambiguously correct.",
      "2. The question is self-contained (no 'the passage above', 'the image', etc.).",
      "3. No spelling or terminology errors.",
      "4. Options are plausible, mutually exclusive, and of similar style/length.",
      "Return ONLY a JSON object of shape:",
      '{ "verdict": "pass" | "revise" | "reject", "corrected_question"?: { question_text, options[4], correct_index, explanation, difficulty }, "reason"?: string }',
      "Use 'revise' only if a small fix repairs it — include the full corrected_question object.",
      "Use 'reject' when the question is unsalvageable. Provide a short reason for revise/reject.",
      "Return no prose, no markdown, JSON object only.",
    ].join("\n");

    const prompt = "Candidate:\n" + JSON.stringify({
      question_text: data.candidate.question_text,
      options: data.candidate.options,
      correct_index: data.candidate.correct_index,
      explanation: data.candidate.explanation,
      difficulty: data.candidate.difficulty,
    }, null, 2);

    const { text } = await generateText({ model, system, prompt });
    const parsed = extractJson(text);
    const r = VerdictSchema.safeParse(parsed);
    if (!r.success) {
      return { verdict: "reject", reason: "validator returned malformed response" } as McqVerdict;
    }
    return r.data;
  });
