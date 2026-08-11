# Security

## Reporting

Report vulnerabilities privately to the repository owner. Do not open a public issue.

## Secrets policy

- `.env` is git ignored. Only `.env.example` is committed, with placeholder values.
- Anything prefixed `VITE_` is inlined into the client bundle and is public. Only the anon/publishable key may use that prefix.
- `SUPABASE_SERVICE_ROLE_KEY` is server only. It bypasses RLS and must never appear in `VITE_` variables, route files, or `*.functions.ts`, which ship to the client bundle.
- Rotate any key that has been committed, pasted into an issue, or shared outside the deployment provider.

## Database

- Row Level Security must be enabled on every table holding user data. The service role client is for trusted server handlers only.
- Authenticated server functions must go through `requireSupabaseAuth`, which verifies the bearer token rather than trusting a client supplied user id.

## Dependencies

- Run `bun install` and review lockfile changes in PRs.
- Keep `@supabase/supabase-js` and framework packages current.
