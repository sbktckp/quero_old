# Security

## Reporting

Report vulnerabilities privately to the repository owner. Do not open a public issue.

## Secrets policy

- `.env` is git ignored. Only `.env.example` is committed, with placeholder values.
- Anything prefixed `VITE_` is inlined into the client bundle and is public. Only the anon/publishable key may use that prefix.
- `SUPABASE_SERVICE_ROLE_KEY` is server only. It bypasses RLS and must never appear in `VITE_` variables, route files, or `*.functions.ts`, which ship to the client bundle.
- Rotate any key that has been committed, pasted into an issue, or shared outside the deployment provider.

## Database

- Row Level Security must be enabled on every table holding user data.
- Institute scoped tables must scope reads through `is_institute_member()` or `has_institute_role()`. A `USING (true)` SELECT policy on any institute scoped table is a tenant leak.
- Role mutation goes only through SECURITY DEFINER functions. `user_roles` has no write grant for `authenticated` by design.
- After every migration, run `select * from public.rls_grant_gaps;`. It must return zero rows. A non-empty result means a policy exists for a command the role has no base GRANT for, which makes the feature silently fail.
- Verify tenant isolation with `supabase/tests/institute_isolation_test.sql`. Every row must read PASS.

## Dependencies

- Run `bun install` and review lockfile changes in PRs.
- Keep `@supabase/supabase-js` and framework packages current.
