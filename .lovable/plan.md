## AI MCQ Generator (Admin → Content → Questions → "Generate with AI")

### Ground rules

- Zero schema changes. Uses only questions, options, subjects, chapters, topics.
- No changes to submit_answer, finalize_attempt, get_attempt_review, has_role, existing RLS/grants, existing admin routes, or the CSV importer.
- Admin-only. All AI calls are server-side; no API keys in the browser.

### Server layer — a note on the stack

The spec says "Supabase Edge Function." This project is TanStack Start; the stack rule is to put app-internal AI calls in `createServerFn`, not Edge Functions. Server functions give the same guarantee you asked for (API key stays server-side, never shipped to the client) and integrate with the existing `requireSupabaseAuth` + `has_role` gate used elsewhere in admin.

Plan: implement the two AI calls as **two separate TanStack server functions** in `src/lib/admin-ai.functions.ts`, each with its own handler, model, and prompt — the "separate call" contract you specified. They use Lovable AI Gateway (`LOVABLE_API_KEY`, already provisioned). If you'd rather have real Supabase Edge Functions, say the word and I'll swap the two handlers into `supabase/functions/generate-mcqs` and `supabase/functions/validate-mcq` instead — the client code and UI are identical either way.

### Server functions

Both begin with `requireSupabaseAuth` + `has_role('admin')` check, then call Lovable AI Gateway.

1. `generateMcqs({ notes, exam, subjectName, chapterHint, topicHint, difficulty, count })`
  - Model: `google/gemini-3.1-pro-preview` (strong reasoning for generation).
  - Structured output (`Output.object`) enforcing an array of `{ question_text, options[4], correct_index (0-3), explanation, difficulty, suggested_chapter, suggested_topic }`.
  - System prompt states: exactly 4 options, exactly one correct_index in [0,3], self-contained (no "passage above"), match requested difficulty, return only JSON.
  - Count is capped server-side at 10 per call (chunk size). Client loops for larger totals.
2. `validateMcq({ candidate })`
  - Model: `openai/gpt-5.4` (different family than generation — genuine second opinion).
  - Receives ONLY the candidate object. Not the notes, not the generation prompt.
  - Structured output: `{ verdict: 'pass' | 'revise' | 'reject', corrected_question?: {...same shape}, reason?: string }`.
  - Prompt checks: exactly one unambiguously correct option; self-contained; no spelling/terminology errors.

### Duplicate check (client-side, mirrors CSV importer)

Before showing a candidate, normalize its question_text (lowercase + collapse whitespace) and match against a pre-fetched list of existing `questions.question_text` for the selected subject (fetched once when the wizard opens). Close match → force verdict to `reject` with reason `"duplicate of <id>"`. Same normalization the CSV importer uses.

### UI — new route `/admin/content/questions/generate`

Entry point: a "Generate with AI" button next to "Bulk Import" on the Questions tab of `/admin/content`.

**Step 1: Settings + Notes**

- Textarea for pasted notes.
- File input for `.txt` / `.md`, read via `FileReader` on the client, appended to the textarea.
- Exam select (NEET UG / NEET PG).
- Subject dropdown (from `subjects`).
- Chapter dropdown (filtered by subject) or "let AI suggest".
- Topic dropdown (filtered by chapter) or "let AI suggest".
- Difficulty (Easy / Medium / Hard).
- Question count (number, capped at 100).
- "Start" button.

**Step 2: Bulk processing**

- Client loop: `Math.ceil(count / 10)` chunks. For each chunk:
  1. Call `generateMcqs` (up to 10).
  2. For each returned question: dedup check → if not duplicate, call `validateMcq`.
  3. Append cards to running list; update progress bar and counts (Generated / Pass / Needs review / Rejected).
- "Stop" button: sets a ref flag; loop exits after the current chunk resolves.
- No persistence; leaving the page ends the run. Anything already Approved is already saved.

**Step 3: Preview cards**  
Each candidate card shows:

- Question text, 4 options (correct one highlighted), explanation, difficulty.
- Status badge: green Pass / yellow Needs review (reason visible) / red Rejected (reason, collapsed by default).
- Actions: Edit (inline editor for text/options/correct/explanation), Approve, Regenerate (redo generate+validate for this one card via a targeted `generateMcqs({count:1, seedFromCard})` + `validateMcq`), Discard.
- Approve is disabled on Needs review / Rejected unless the card was edited since validation.
- "Approve All Passing" button: approves every green card in one loop.

**Save (approve, single or bulk)**  
Reuses the existing `admin_insert_question_with_options(_payload jsonb)` RPC — same one the CSV importer uses. Zero new SQL.

- `subject_id` from dropdown.
- Chapter/topic:
  - If admin picked from dropdown → use those ids.
  - If "let AI suggest" → case-insensitive match model's `suggested_chapter` / `suggested_topic` against existing rows for that subject.
  - No match → per-card confirm dialog "Create new chapter 'X' under Subject Y?" with an inline "create it" checkbox (same pattern as the CSV importer). Never auto-create silently. Never create a Subject.
- Insert question row + 4 options rows via the existing RPC; `is_correct = true` on the option matching `correct_index` (or corrected index from a `revise`).

**Result banner**  
After Stop or once the target count is reached: "N approved and saved, M discarded."

### Files to add

- `src/lib/admin-ai.functions.ts` — `generateMcqs`, `validateMcq` server functions.
- `src/routes/_authenticated/admin.content.questions.generate.tsx` — the wizard UI.
- Small button link added to `src/routes/_authenticated/admin.content.tsx` next to the Bulk Import entry point.

### Files unchanged

Everything under the existing admin routes, the CSV importer, the security-sensitive RPCs, and all RLS/grants stay exactly as they are.

&nbsp;

Two things worth checking before you run it, not blockers:

RPC name mismatch: this plan says admin_insert_question_with_options, but the CSV importer plan you approved earlier named it admin_bulk_insert_question. Confirm which one actually exists in your database before running — if the name's wrong, the save step errors immediately.

Test small first: a 100-question run fires roughly 100+ individual AI Gateway calls (10 generate + up to 100 validate). Try count = 10 first to confirm the wiring works before spending a full batch on it.