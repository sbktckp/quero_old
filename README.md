# Quero

Multi-tenant NEET/JEE test-prep platform. Institutes onboard, faculty build and manage question banks, students take full-length mock tests that simulate the real exam format, and institute admins get roster and progress visibility.

Live: [quero-prep-journey.vercel.app](https://quero-prep-journey.vercel.app) (temporary; quero.in is the intended domain)

## Stack

- [TanStack Start](https://tanstack.com/start) (React 19, file-based routing via TanStack Router)
- [Supabase](https://supabase.com) (Postgres, Auth, RLS) as the backend
- Vite, Tailwind CSS v4, shadcn/ui (Radix primitives)
- TanStack Query for data fetching
- `xlsx` / `papaparse` for bulk question import (CSV/XLSX)
- `ai` SDK (OpenAI-compatible) for AI-assisted features
- Bun as the package manager and dev runtime

## How it works

**Tenancy.** Institutes are the top-level tenant. An institute can have branches (`parent_institute_id`, self-referencing) — group staff have access across all branches, branch staff are scoped to their own branch only. A universal, institute-agnostic question bank (`institute_id` null) is always available alongside each institute's own bank.

**Roles.** Institute admin manages faculty and students, and approves join requests. Faculty create and review questions and are assigned to test sections. Students self-enroll with a unique institute join code (creates a pending request, approved by the admin); a student belongs to exactly one institute at a time.

**Content.** Questions are tagged by subject → chapter → topic. The NEET UG taxonomy (4 subjects, 72 chapters, 292 topics) is seeded as shared/global data, aligned to the current NMC syllabus. Faculty submit questions, which go through a draft → submitted → approved/rejected review flow before they're usable in a test.

**Bulk import.** Faculty or admins can bulk-import questions via CSV/XLSX. The importer resolves subject/chapter/topic by name, flags unmatched names instead of silently dropping rows, detects duplicate stems, and supports undoing the last import (blocked if any imported question is already used in a test).

**Tests.** A full NEET-style test is 180 questions across 4 subject sections of 45 each, auto-picked from approved questions in the applicable banks with no repeats within a test (enforced at the DB level). Tests move through a state machine: draft → in progress → ready for review → published → closed, with a publish gate requiring every section full and every question approved. Custom tests (non-standard section counts) are also supported.

**Security.** All cross-tenant operations run through `SECURITY DEFINER` Postgres functions with `anon` revoked and `authenticated` granted, rather than widening row-level security — this keeps one institute's data from being reachable by another institute's staff even via direct table access.

## Getting started

```bash
bun install
cp .env.example .env   # fill in Supabase project URL + keys
bun dev
```

## Project structure

```
src/            application code (routes, components, lib)
supabase/       migrations and database schema
docs/           project documentation
```

## Status

Actively developed. Two live tenants onboarded. Core test pipeline (import → build → publish → attempt) is built and verified end-to-end for text-only questions (no images/LaTeX yet).
