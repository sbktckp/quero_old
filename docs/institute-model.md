# Institute model (B2B)

## Roles

| Role | Scope | Who |
| --- | --- | --- |
| `admin` | global (`institute_id` null) | platform super admins |
| `institute_admin` | one institute | that academy's owner |
| `faculty` / `subject_coordinator` | one institute | that academy's teachers |
| `student` | global row on signup, plus one institute row once approved | everyone |

A user can hold several rows. Shubham is both a global `admin` and Kadam's
`institute_admin`; the super-admin grant is what lets him reach other
institutes, not the institute one.

Uniqueness is `(user_id, role, coalesce(institute_id, <sentinel>))`. Do not
reintroduce `UNIQUE(user_id, role)` -- see migration 20260812110000 for why it
silently broke student approval.

## Tenants

| Institute | Slug | Admin |
| --- | --- | --- |
| Kadam Institute | `kadam-institute` | srkadam2173@gmail.com |
| Patil Institute | `patil-institute` | 24052326@kiit.ac.in |

Join codes are not recorded here on purpose -- read them from
`institute_join_codes`, or `my_institute_context()` as the institute admin.

## Flows

**Faculty invite.** Institute admin calls
`institute_invite_staff(institute_id, email, role)`.
If that email already has an account the role is granted immediately
(`status: granted`). Otherwise a pending invite is stored (`status: invited`)
and `claim_pending_invites()` grants it on their first login. The claim matches
on the caller's own verified email, so nobody can claim another person's invite.

**Student enrollment.** Student calls `student_join_by_code(code)` from Profile.
This creates a **pending** enrollment and grants no role. The institute admin
then calls `institute_review_enrollment(id, 'active' | 'rejected' | 'removed')`.
Only `active` inserts the institute-scoped `student` role. A student may hold
only one pending-or-active enrollment; `student_leave_institute()` clears it.

**Reads.** `institute_student_roster(institute_id, subject_id?)` is available to
any staff member; `subject_id` filters attempt stats but never hides students.
`institute_staff_roster(institute_id)` is institute-admin only and includes
outstanding invites. `my_institute_context()` is the single call the UI needs to
decide which dashboard to render.

## Rules

- Never grant `insert`/`update`/`delete` on `institute_join_codes`,
  `institute_enrollments` or `institute_invites` to `authenticated`. The absence
  of those grants is a security control, not an oversight.
- Functions pin `search_path` to `public`, so anything from `extensions`
  (pgcrypto's `gen_random_bytes`, for instance) is unavailable inside them.
- After any migration: `select * from public.rls_grant_gaps;` must be empty.
- Re-run `supabase/tests/institute_isolation_test.sql` after touching policies.
