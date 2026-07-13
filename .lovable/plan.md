## Admin panel for Quero

Ground rules

- Zero changes to: submit_answer, finalize_attempt, get_attempt_review, column-level GRANT/REVOKE on questions/options, or the answers unique constraint.
- No new tables, no new columns. Uses only: profiles, user_roles, subjects, chapters, topics, questions, options, tests, test_attempts.

### 1. Access control

- Add a `_admin` layout under `_authenticated/_admin/route.tsx` that calls `has_role(auth.uid(), 'admin')` on the client via RPC and redirects non-admins to `/home`.
- All privileged writes go through server functions using `requireSupabaseAuth` that verify `has_role(_user_id, 'admin')` before touching data. No new tables — writes go straight through `context.supabase` (RLS as user) after the role check, OR through `supabaseAdmin` when RLS blocks legitimate admin edits.
- Migration adds admin RLS policies where missing so admins can UPDATE/DELETE profiles/user_roles/subjects/chapters/topics/questions/options. It does not touch answers, test_questions, or any of the security-sensitive objects listed above.

### 2. Routes

```
/admin                     dashboard (stat cards)
/admin/users               search + list, role column
/admin/users/$id           profile + test_attempts + role changer
/admin/content             tabs: Subjects | Chapters | Topics | Questions
/admin/content/questions/import   bulk importer wizard
```

All under `_authenticated/_admin/`.

### 3. Dashboard

Six count queries via a single `getAdminStats` server fn: users, questions, subjects, chapters, topics, attempts today, attempts this week (`started_at >= date_trunc('day'/'week', now())`).

### 4. Users

- `listUsers({ search })` — joins profiles + user_roles (aggregated), ILIKE on display_name/email.
- `getUserDetail({ userId })` — profile, roles, recent test_attempts.
- `setUserRole({ userId, role })` — admin-only server fn; deletes existing rows in user_roles for user then inserts the chosen role. Enum values: 'student', 'admin' (uses existing app_role enum).

### 5. Content CRUD

Standard list + dialog forms for Subjects, Chapters (filtered by subject), Topics (filtered by chapter), Questions.

- Question dialog: subject/chapter/topic cascading dropdowns; textareas for question_text/explanation; difficulty select; is_pyq switch revealing pyq_year (number) + pyq_exam (text); dynamic 2–5 options with one radio-style correct selector. Save uses `adminUpsertQuestion` server fn that inserts/updates questions + replaces options atomically.

### 6. Bulk importer

Client-side pipeline (no new tables):

- Template: static CSV download.
- Parse: `papaparse` for CSV, `xlsx` (SheetJS) for XLSX, done in a chunked loop with `requestIdleCallback`/`setTimeout` yields to keep UI responsive for 500+ rows.
- Validation preview: virtualized table (simple windowing) with per-row status (Valid/Warning/Error), inline edit, exclude checkbox, and per-warning "create chapter/topic" checkbox. Duplicate check uses `pg_trgm`-less approximation: exact + normalized (lowercased, whitespace-collapsed) match against existing `questions.question_text` for the same subject — fetched once at preview start.
- Commit: `bulkImportQuestions` server fn iterating rows. Per row: resolve subject_id (must exist), chapter_id (find or create if flagged), topic_id (find or create if flagged), then `insert into questions` returning id, then `insert into options` (batch). Each row wrapped by a Postgres function `admin_bulk_insert_question(_payload jsonb)` (SECURITY DEFINER, checks `has_role`) so both inserts are one transaction — a single new helper function, not a new table, and it does not touch any protected object.
- Result: success count + downloadable errors.csv built client-side from the failed rows array.

### Technical notes

- New deps: `papaparse`, `xlsx` (via `bun add`).
- All server fns live in `src/lib/admin.functions.ts`; each starts with a `has_role` check.
- Admin nav entry added to bottom-nav or a top-right link on `/home`, visible only when `has_role` returns true.
- No changes to the test engine, review page, or PYQ flow.

confirm supabaseAdmin (the service-role client that bypasses RLS) only ever gets instantiated inside server functions, never in anything shipped to the browser, and that its key lives in a secret. 