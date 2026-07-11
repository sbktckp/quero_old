# Phase 2 — Study Tools

Ship in vertical slices. Each slice = schema + RLS + UI + real reads/writes. No mock data, no dead buttons.

## Slice 1 — Remaining test types + Practice mode (ships first)

Reuses Phase 1 `tests`, `test_questions`, `test_attempts`, `answers`, `questions`, `options`. **No new tables.**

Schema tweaks (one migration):

- `tests.test_type` already exists (enum). Confirm values: `subject`, `chapter`, `topic`, `custom`, `pyq`.
- Add `tests.mode` enum (`timed`, `practice`), default `timed`.
- Add `test_attempts.mode` mirror column so review page knows how to render.
- `tests.chapter_id`, `tests.topic_id` already exist per Phase 1 schema — verify; add if missing.

UI:

- `/tests/new` — builder: pick type (Chapter / Topic / Custom), pick source (chapter dropdown / topic dropdown / multi-select subjects+difficulty for Custom), question count, duration, mode (Timed / Practice). Creates a `tests` row + `test_questions` rows by sampling `questions` with proper filters, then creates an attempt and routes to `/test/$attemptId`.
- Practice mode in `test/$attemptId`: no timer, show explanation + correct answer immediately after each answer, no final score screen — instead per-question feedback and a "Finish" button.
- Home: replace hardcoded "Mock test" rows with real `tests` list grouped by type.

## Slice 2 — PYQ Library

Reuses `questions`. Add columns:

- `questions.is_pyq boolean default false`
- `questions.pyq_year int`
- `questions.pyq_exam text` (NEET-UG / NEET-PG)

Seed ~20 sample PYQ questions across years (real content, tagged).

UI:

- `/pyq` — filter chips (year, subject, exam). Grid of question cards. Tap → question detail with explanation + "Add to custom test".
- Optional "Start PYQ test" builds a `tests` row of `test_type='pyq'` on the fly.

## Slice 3 — Flashcards (SM-2 lite)

New table `flashcards`:

- `id, user_id, front, back, subject_id?, chapter_id?, topic_id?, question_id?` (nullable link back to source)
- `ease_factor numeric default 2.5, interval_days int default 0, repetitions int default 0`
- `due_at timestamptz default now(), last_reviewed_at, created_at, updated_at`

RLS: owner-only.

SM-2 lite (client-side, called on rating 0–5):

- q<3 → reps=0, interval=1
- q≥3 → reps++, interval = reps==1 ? 1 : reps==2 ? 6 : round(prev_interval * ease)
- ease = max(1.3, ease + (0.1 - (5-q)*(0.08 + (5-q)*0.02)))
- `due_at = now() + interval_days`

UI:

- `/flashcards` — deck list, "Review due (N)", CRUD.
- `/flashcards/review` — swipe-style queue over `due_at <= now()`, rating buttons (Again / Hard / Good / Easy → q=1/3/4/5).
- "Save as flashcard" button on question review page.

## Slice 4 — Revision Planner (daily + weekly + calendar)

New table `study_plans`:

- `id, user_id, title, notes, scheduled_date date, scheduled_time time?, duration_minutes int?, subject_id?, chapter_id?, is_recurring bool, recur_weekday int?, completed_at timestamptz?, remind_at timestamptz?, created_at, updated_at`

New table `revision_history`:

- `id, user_id, study_plan_id?, item_type text (test/flashcard/plan), item_id uuid, completed_at, minutes int`
- Inserted from test submit, flashcard review, plan complete.

UI:

- `/planner` — month calendar (shadcn Calendar) with dots for days that have tasks; day drawer lists tasks with check-off.
- `/planner/week` — 7-day agenda.
- Create/edit task dialog.

## Slice 5 — Doubt Solver

Storage bucket `doubt-images` (public read, auth insert).

Tables:

- `doubt_posts(id, user_id, title, body, image_url?, subject_id?, is_solved bool, solved_comment_id?, created_at, updated_at)`
- `doubt_comments(id, post_id, parent_comment_id?, user_id, body, created_at, updated_at)`
- `doubt_likes(id, user_id, post_id?, comment_id?, created_at)` — one-of check.

RLS: authenticated read all; author writes own; post author marks solved.

UI:

- `/doubts` feed → `/doubts/$id` thread with nested comments, like button, "Mark solved" for OP.
- New doubt dialog with image upload (Supabase Storage).

## Slice 6 — Bookmarks

Table `bookmarks(id, user_id, item_type text ('question'|'flashcard'|'doubt'), item_id uuid, created_at, unique(user_id, item_type, item_id))`.

UI: bookmark toggle on question review, flashcard, doubt post. `/bookmarks` list filtered by type.

## Slice 7 — Notifications + Realtime

Table `notifications(id, user_id, type text, title, body, link, is_read bool default false, created_at)`.

Realtime enabled on `notifications`.

DB triggers (auto-insert):

- On `doubt_comments` insert → notify post author (skip self).
- On `doubt_likes` insert → notify liked-item author (skip self).
- Planner reminder: `pg_cron` every 5 min → server route that finds `study_plans` with `remind_at <= now() AND remind_at > now() - 5min` and inserts a notification.

UI:

- `/notifications` — live-updating list via `supabase.channel().on('postgres_changes', ...)`, tap to open link, mark-read on view.
- Bell badge in bottom nav shows unread count (also realtime).

## Order of implementation in this session

I'll do **Slice 1 + Slice 2** end-to-end in this turn (schema + UI + wire everything), then stop for your review before proceeding to slices 3–7 in the next turn. That keeps the "everything works" bar honest.

## Technical notes

- Single migration per slice.
- All tables: `authenticated` GRANTs, RLS enabled, owner policies via `auth.uid()`.
- `has_role` reused; no new security-definer functions unless needed.
- Storage bucket created via `supabase--storage_create_bucket`, not SQL.
- Realtime enabled via `ALTER PUBLICATION supabase_realtime ADD TABLE ...` in the notifications migration.
- Reuse existing test engine at `/test/$attemptId` — extend, don't fork.

&nbsp;

- Before completing each slice:
- - Verify database migration succeeds.
- - Verify RLS policies work.
- - Verify CRUD operations.
- - Verify responsive layout.
- - Verify no TypeScript errors.
- - Verify no ESLint errors.
- - Verify production build passes.
- - Do not continue to the next slice if any of the above fail.

Question Review:

- Allow bookmarking.

- Allow reporting incorrect questions.

- Allow rating explanation quality (1–5 stars).

- &nbsp;