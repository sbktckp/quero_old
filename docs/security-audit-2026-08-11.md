# Institute isolation security audit, 2026-08-11

Scope: every institute scoped table in the `public` schema, `has_institute_role()`, base GRANTs, and write paths. Every finding below was reproduced against the live database inside a rolled back transaction using two dummy institutes and two dummy faculty accounts. Harness: `supabase/tests/institute_isolation_test.sql`. Fix: `supabase/migrations/20260811000000_institute_isolation_hardening.sql` (not yet applied).

## Verdict

Institute isolation does not currently hold. Do not put real institute data in until F1 to F4 are fixed.

## What passed

- `has_institute_role()` is correct. Faculty A returns false for institute B, true for institute A. It is SECURITY DEFINER with a pinned `search_path`, reads only `user_roles`, and takes no client supplied trust.
- `institutes` row isolation holds. Faculty A saw exactly one institute.
- Cross institute writes are blocked. Faculty A inserting a question with institute B's id failed the RLS WITH CHECK.
- RLS is enabled on all 35 public tables.

## F1 — Cross institute read leak (critical)

`questions`, `options`, `tests`, and `test_questions` each carry a SELECT policy of `USING (true)` for `authenticated`. Any logged in user on the platform, including a student of a different institute or a free tier user with no institute at all, can read every institute's private question bank.

Reproduced: faculty A read institute B's question, 1 row returned. Expected 0.

Fix: replaced with membership scoped policies. Global content (`institute_id is null`) stays readable; institute content requires `is_institute_member()`; unapproved rows are visible only to their author and the institute admin queue.

## F2 — Missing base GRANTs, the recurring pattern (high)

Policies exist for commands the role has no grant for, so the feature silently does not work:

| Table | Policy present for | GRANT to authenticated |
| --- | --- | --- |
| `options` | ALL (faculty manage own question options) | SELECT only, no INSERT/UPDATE/DELETE |
| `tests` | INSERT (users can insert own tests) | SELECT only |
| `test_questions` | INSERT (users can insert own test_questions) | SELECT only |

Reproduced: faculty A created a draft question successfully, then adding options failed with `permission denied for table options`. Faculty MCQ creation is broken end to end today.

Fix: grants added, plus a `public.rls_grant_gaps` view that lists any policy without a matching grant. Query it in CI or after every migration; it should always return zero rows.

## F3 — Faculty can approve their own questions (critical)

Policy "Faculty can update their own draft or rejected questions" has `WITH CHECK (created_by = auth.uid())` with no status constraint. A faculty member can move their own question straight from `draft` to `approved`, bypassing institute admin review entirely.

Reproduced: the self approve UPDATE succeeded.

Fix: that policy is dropped. The stricter "Faculty update own editable questions" policy (which pins the post state to draft or submitted) remains and is now the only faculty update path.

## F4 — Answer key exposed (high)

`options.is_correct` was selectable by every authenticated user. A student can read the correct answer for any question before or during a test with a single PostgREST call. RLS is row level, so no policy can hide this column.

Fix: `SELECT` revoked at table level and re granted on `(id, question_id, option_text, sort_order)` only. `is_correct` is now reachable only through SECURITY DEFINER functions, which is where `get_attempt_review()` and `finalize_attempt()` already read it.

## Write path review

Admin and scoring paths are correctly SECURITY DEFINER with pinned `search_path`: `admin_upsert_question`, `admin_insert_question_with_options`, `admin_set_user_role`, `submit_answer`, `finalize_attempt`, `get_attempt_review`, `institute_add_faculty`, `institute_remove_faculty`, `institute_faculty_list`.

Faculty MCQ creation and institute admin approval are the exceptions. Both run as direct client table writes governed only by RLS, which is how F3 happened. Recommendation: move both behind `faculty_upsert_question(_payload jsonb)` and `institute_review_question(_question_id uuid, _decision text, _reason text)`, matching the existing admin pattern, and then drop the faculty and institute admin write policies entirely. That change is not in this migration.

## Duplicate policies

Several tables carry two functionally identical policy sets from separate migrations (`colleges`, `college_cutoffs`, `college_reviews`, `counseling_events`, `questions`). Not a vulnerability, but it makes review harder and hid F3. The migration removes the redundant `questions` ones.

## Recommended order

1. Apply the migration on a Supabase branch, run the harness, confirm all PASS and `rls_grant_gaps` is empty.
2. Verify the app still works: student test flow, faculty create, admin approve.
3. Apply to production.
4. Then move faculty create and admin approve behind SECURITY DEFINER functions.
5. Only then start onboarding work.
