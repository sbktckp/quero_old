# Institute isolation security audit, 2026-08-11

Status: **fixes applied to production 2026-08-11.** Harness 7/7 PASS, `rls_grant_gaps` returns zero rows.

Scope: every institute scoped table in `public`, `has_institute_role()`, base GRANTs, and write paths. Every finding was reproduced against the live database inside a rolled back transaction using two dummy institutes and two dummy faculty accounts. Harness: `supabase/tests/institute_isolation_test.sql`.

## What already passed

- `has_institute_role()` is correct. Faculty A returns false for institute B, true for institute A. SECURITY DEFINER, pinned `search_path`, reads only `user_roles`, takes no client supplied trust.
- `institutes` row isolation held. Faculty A saw exactly one institute.
- Cross institute writes were already blocked by the RLS WITH CHECK.
- RLS enabled on all 35 public tables.

## F1 — Cross institute read leak (critical, fixed)

`questions`, `options`, `tests`, `test_questions` each had `SELECT USING (true)` for `authenticated`. Any logged in user, including a student of another institute or a free tier user with no institute, could read every institute's private question bank.

Reproduced: faculty A read institute B's question, 1 row. Now 0.

Fix: membership scoped policies. Global content (`institute_id is null`) stays readable; institute content requires `is_institute_member()`; unapproved rows visible only to their author and the institute admin queue.

## F2 — Missing base GRANTs, the recurring pattern (high, fixed)

Policies existed for commands the role had no grant for, so features silently did nothing:

| Table | Policy for | Grant that was missing |
| --- | --- | --- |
| `options` | ALL (faculty manage own options) | INSERT, UPDATE, DELETE |
| `tests` | INSERT, ALL (admin manage) | INSERT, UPDATE, DELETE |
| `test_questions` | INSERT, ALL (admin manage) | INSERT, UPDATE, DELETE |
| `questions` | DELETE (faculty delete own draft) | DELETE |
| `counseling_articles` | INSERT, UPDATE, DELETE (admin) | all three |
| `mentor_reviews` | DELETE (admin) | DELETE |
| `mentors` | DELETE (admin) | DELETE |
| `institutes` | ALL (super admin) | DELETE |

Reproduced: faculty A created a draft question, then adding options failed with `permission denied for table options`. Faculty MCQ creation was broken end to end.

Fix: grants added. More importantly, `public.rls_grant_gaps` now detects this class of bug automatically. **Run `select * from public.rls_grant_gaps;` after every migration. It must return zero rows.**

`user_roles` is the one deliberate exception: it has no write grant for `authenticated`, because role mutation goes only through SECURITY DEFINER functions. The dead "Admins manage roles" policy was dropped so the detector stays clean.

## F3 — Faculty could approve their own questions (critical, fixed)

Policy "Faculty can update their own draft or rejected questions" had `WITH CHECK (created_by = auth.uid())` with no status constraint, so a faculty member could move their own question straight from `draft` to `approved`, bypassing institute admin review.

Reproduced: the self approve UPDATE succeeded. Now blocked.

Fix: that policy dropped. The stricter "Faculty update own editable questions" policy, which pins the post state to draft or submitted, is now the only faculty update path.

## F4 — Answer key exposed (high, fixed)

`options.is_correct` was selectable by every authenticated user, so a student could read the correct answer for any question mid test with one PostgREST call. RLS is row level, so no policy could hide it.

Fix: table level `SELECT` revoked, re granted on `(id, question_id, option_text, sort_order)` only. `is_correct` is now reachable only through SECURITY DEFINER functions, which is where `get_attempt_review()` and `finalize_attempt()` already read it.

**Client impact:** any frontend code selecting `is_correct` directly from `options` will now fail. Verify the faculty question editor and any admin question preview.

## Write path review

Correctly SECURITY DEFINER with pinned `search_path`: `admin_upsert_question`, `admin_insert_question_with_options`, `admin_set_user_role`, `submit_answer`, `finalize_attempt`, `get_attempt_review`, `institute_add_faculty`, `institute_remove_faculty`, `institute_faculty_list`.

Still outstanding: faculty MCQ creation and institute admin approval run as direct client table writes governed only by RLS. That is how F3 happened. They should move behind `faculty_upsert_question(_payload jsonb)` and `institute_review_question(_question_id uuid, _decision text, _reason text)`, after which the faculty and institute admin write policies can be dropped entirely. Not done yet.

## Remaining work before onboarding real institutes

1. Verify the app against the new policies: student test flow, faculty create, admin approve, admin question editor.
2. Move faculty create and admin approve behind SECURITY DEFINER functions.
3. Remove `.env` from git history and rotate if a service role key was ever in it.
4. Duplicate policy cleanup on `colleges`, `college_cutoffs`, `college_reviews`, `counseling_events`. Not a vulnerability, but the duplication hid F3.
