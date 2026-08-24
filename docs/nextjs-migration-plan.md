# Quero: TanStack Start → Next.js migration + dashboard revamp plan

Status: DRAFT — not yet approved. No code has been moved. Written from the actual
repo contents as of this date, not assumptions.

## 0. Why this doc exists

The person requested a full migration from TanStack Start (the current stack) to
Next.js, plus a visual/interactive revamp of the student, institute-admin, and
faculty dashboards, on a "days" timeline, target SIH submission.

This is flagged as high risk: the repo has a documented history of silent,
security-relevant bugs (see Quero-Project-Knowledge.md — GRANT leaks, a detached
`this` bug that took down the entire institute pipeline for a period, an import
status/constraint mismatch). A framework migration touches exactly the surfaces
those bugs lived in: auth/session handling, the RPC call layer, and routing/guards.
This plan exists so the migration is executed deliberately, in order, with the
demo-critical path finished first.

## 1. Current state (verified by reading the repo, not assumed)

**Framework:** TanStack Start (`@tanstack/react-start`) + TanStack Router
(file-based, `src/routes/`) + Vite 8 + Nitro. NOT Next.js — no Next.js package,
config, or app/pages directory exists anywhere in the repo currently.

**Stack already in place that carries over unchanged:**
- React 19, TypeScript, Tailwind v4, shadcn/Radix primitives, framer-motion
  (already a dependency), TanStack Query, Supabase JS client, react-hook-form,
  zod, recharts, xlsx/papaparse (import tooling).
- No three.js yet — will need to be added.

**Route inventory (~45 files under `src/routes/`):**
- Public/marketing: `index.tsx` (also branches into dashboard — see below),
  `about`, `contact`, `for-institutes`, `pricing`, `legal.$slug`,
  `privacy-policy`, `refund-policy`, `terms`, `auth`, `reset-password`,
  `delete-account`.
- `_authenticated/` (guarded, ~35 files): `home` (redirect shim to `/`),
  `institute-workspace` (admin/faculty dashboard), `onboarding`, `profile`,
  `notifications`, `search`, `subject.$slug`, `pyq`, `test.$attemptId`,
  `tests.new`, `review.$attemptId`, `upgrade`, `coming-soon.$feature`,
  6 `counseling.*` routes, 4 `mentors.*` routes, and 15 `admin.*` routes
  (billing, content generate/import, contact, counseling×4, leads, legal,
  mentors, team, users×2, activity, index).
- `api/` — server routes (not yet inspected in detail; likely webhooks/Razorpay).

**Auth/session model** (`src/routes/_authenticated/route.tsx`):
Client-side only (`ssr: false`). `beforeLoad` checks
`supabase.auth.getSession()`; redirects to `/auth` if absent. Simple, framework-
agnostic in spirit — ports cleanly to a Next server/client boundary, but the
`ssr: false` choice was deliberate and its reason should be confirmed before
porting (possibly to avoid SSR hitting Supabase before hydration, or a prior bug
sidestepped this way — worth asking Shubham/checking commit history, not
assuming).

**Auth context** (`src/lib/auth.tsx`): plain React context wrapping
`supabase.auth.getSession()` + `onAuthStateChange`. Only TanStack-specific calls
are `router.invalidate()` and `queryClient.invalidateQueries()` — both have
direct Next equivalents (`router.refresh()` from `next/navigation`).

**RPC layer** (`src/lib/supabase-rpc.ts`): framework-agnostic wrapper around
`supabase.rpc()`. Contains an explicit code comment documenting the exact
`this`-detachment bug that broke the institute pipeline in production
(Aug 14, 2026 incident). This file does not need to change during migration —
but every call site that currently imports it must be re-verified after
porting, since the historical bug was about *how* the client was called, not
about this wrapper itself.

**Payments:** `src/lib/razorpay.server.ts` (TanStack Start server function) +
`razorpay.functions.ts` (client-side caller). This is a live payment
integration — not mentioned in the original project knowledge doc. Must be
identified and ported carefully; payment flow regressions are unacceptable-risk
for a demo, more so for production.

**Root layout** (`src/routes/__root.tsx`): sets up `QueryClientProvider`,
`AuthProvider`, global meta/SEO tags, a global `Footer`, `Toaster`. Straightforward
port to Next's root `app/layout.tsx`.

**The three dashboards, concretely:**

| Dashboard | Current route | Current component(s) | Notes |
|---|---|---|---|
| Student | `/` (when signed in + onboarded) | `HomeDashboard` (`src/components/home/home-dashboard.tsx`) + `AssignedTests` | `/` triple-purposes as marketing page (signed out), student dashboard (signed in + onboarded), and a router-only branch point (redirects institute staff to `/institute-workspace`, incomplete-onboarding users to `/onboarding`). This branching logic needs to be preserved exactly — it's the actual routing contract for the whole app, not incidental. |
| Institute Admin | `/institute-workspace` | `InstituteAdminDashboard` (`src/components/institute/institute-admin-dashboard.tsx`) — renders its own roster + approvals, plus implicitly `TestPipeline` (`canManage={true}`) | Container is `max-w-lg` — this is very likely the root cause of the "looks fine on phone, bad on laptop" complaint: the workspace shell caps at mobile width regardless of viewport. |
| Faculty | `/institute-workspace` (same route, branches on role) | `FacultyDashboard` + `TestPipeline` (`canManage={false}`) + `StudentRoster` (read-scoped) | Same `max-w-lg` container issue. |

Role branching happens client-side via `useInstituteRole()` (`src/lib/institute.ts`)
inside `institute-workspace.tsx`, not via separate routes per role.

## 2. Migration order (demo-critical path first)

Given "everything must be on Next.js" but the clock is days, not weeks, the
sequencing below front-loads what SIH judges will actually see and interact
with, so if time runs out, what's cut is the least-visible surface, not the
demo.

1. **Scaffold** — new Next.js 15 (App Router) project in a separate branch
   (`feat/nextjs-migration`), not touching `main`. TypeScript, Tailwind v4,
   same design tokens copied from `src/styles.css`.
2. **Foundations** — Supabase client init (browser + server client split, since
   Next distinguishes these more strictly than TanStack Start does), auth
   context/provider, RPC wrapper (copy as-is), middleware-based route
   protection replacing `_authenticated/route.tsx`.
3. **Auth route** (`/auth`) — needed before anything else is testable end-to-end.
4. **The three dashboards** (the actual ask) — student, institute-admin,
   faculty. This is also where the visual revamp happens (Section 3).
5. **Test-taking flow** — `test.$attemptId`, `tests.new`, `review.$attemptId`,
   `TestPipeline`, `TestWorkbench`, question import. This is the pipeline your
   notes describe as "built and verified Aug 15" — highest regression risk,
   gets dedicated re-testing (cross-institute isolation checks, same as the
   original smoke tests) before being called done.
6. **Everything else** — marketing pages, legal pages, counseling section,
   mentors section, admin sub-pages (billing, content-gen, leads, team, users),
   profile/notifications/search, Razorpay payment flow. Ported in whatever
   order remains useful; explicitly the first things dropped if the clock runs
   out before SIH.
7. **Cutover** — only once (4) and (5) are verified working end-to-end under
   impersonated/rolled-back-transaction testing (matching how the original
   pipeline was verified), merge to `main` and repoint the production deploy.

## 3. Dashboard revamp direction (applies once ported to Next)

- Replace the `max-w-lg` capped shell in `institute-workspace.tsx` with a real
  responsive layout: sidebar/rail nav on desktop, bottom-nav preserved on
  mobile (there's already a `bottom-nav.tsx` component to build from).
- Framer Motion is already a dependency and already used well in
  `routes/index.tsx` (the hero animations) — extend that same motion language
  (staggered fade-ups, hover scale/lift, breathing gradients) into dashboard
  cards, stat tiles, approval queues, and the test workbench, rather than
  inventing a new animation vocabulary.
- Three.js: scoped to specific high-impact moments (e.g. an animated stat
  visualization or an ambient background element on the admin dashboard), not
  forced into every screen — three.js has real perf cost and should earn its
  place per surface.
- Keep the current mobile experience intact; this is an addition of a proper
  desktop layout, not a replacement of what already works on phones.

## 4. Explicit re-verification checklist before cutover

Carried over directly from the bug history in project knowledge — not
optional:
- Cross-institute isolation: faculty/admin of Institute A cannot see or act on
  Institute B's data (repeat the original smoke test approach: impersonated
  JWTs, rolled-back transactions).
- All RPC call sites use the member-call pattern (`rpc()` wrapper), not a
  detached `supabase.rpc` reference.
- SECURITY DEFINER function grants unaffected (migration is frontend-only, but
  confirm no new RPCs are called that lack the `authenticated`-only grant).
- Auth guard actually blocks unauthenticated access on every porous route
  (Next middleware config is a common source of "forgot to protect this one").
- Razorpay flow completes end-to-end in a test transaction.
- `quero.in` canonical domain / env vars carry over to whatever new Vercel
  project config Next.js requires (Vercel project settings likely need
  updating — Next has different build output than Vite/Nitro).

## 5. Open questions for Shubham/Smit before execution

- Confirm reason for `ssr: false` on the authenticated route guard before
  deciding how the Next middleware should behave (SSR vs client-only check).
- Confirm whether `api/` routes (not yet inspected) include webhook endpoints
  (Razorpay, Supabase) that need exact-path compatibility preserved.
- Confirm acceptable fallback: if full migration isn't done by SIH, is
  "core path on Next, rest still on TanStack Start behind a reverse proxy /
  subpath split" acceptable, or must it be all-or-nothing?
