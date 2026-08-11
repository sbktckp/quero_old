# CI workflow (not yet committed)

The file below could not be pushed by tooling because the token in use lacks the
GitHub `workflow` scope. Create it manually at `.github/workflows/ci.yml`.

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile
      - name: Typecheck
        run: bunx tsc --noEmit
      - name: Lint
        run: bunx eslint .
        continue-on-error: true
      - name: Build
        run: bun run build

  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Fail on committed secrets
        run: |
          if git grep -nE 'service_role|sb_secret_' -- ':!*.md' ':!.github/*'; then
            echo "::error::Possible service-role secret committed"
            exit 1
          fi
          if git ls-files --error-unmatch .env 2>/dev/null; then
            echo "::error::.env is tracked in git"
            exit 1
          fi
```

## Also do in the GitHub UI

Repository settings, none of which are reachable through the API surface used here:

- **Branch protection on `main`**: require the CI check to pass, require a PR,
  block force pushes and deletions.
- **Code security**: enable Dependabot alerts, Dependabot security updates,
  secret scanning, and push protection. Push protection is the one that would
  have stopped `.env` being committed in the first place.
- **Actions permissions**: set the default `GITHUB_TOKEN` to read-only.
