# Testing Strategy

GitHub Actions is the hard gate for merge readiness. CodeRabbit is the reviewer;
CI is the enforcement layer.

## Required Local Validation

Before opening or updating a PR, run the relevant checks for the stack touched.
Once the TypeScript monorepo exists, the expected root commands are:

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm run typecheck
pnpm run test
```

If a `build` script exists, run it before merging user-visible web changes:

```bash
pnpm run build
```

If Playwright end-to-end tests exist and the dashboard flow changed, run:

```bash
pnpm run test:e2e
```

Document every command run in the PR summary. If a relevant command is skipped,
explain why.

## CI Contract

The repository CI must:

- Run on every pull request.
- Run on pushes to `main`.
- Require repository guidance files to exist.
- Run lint, typecheck, and tests for any stack with committed source code.
- Fail when source files exist but CI does not know how to verify that stack.
- Avoid live provider calls by default.

The current CI starts with a repository contract job. As app code lands, keep CI
updated in the same PR that introduces a new runtime, package manager, or test
runner.

## Branch Protection

Configure GitHub branch protection or repository rulesets outside the repo so
`main` cannot be updated until CI and CodeRabbit pass.

Recommended settings:

- Require pull requests before merging.
- Require the `CI` workflow to pass.
- Require the `CodeRabbit` status to pass.
- Require zero human approvals.
- Require conversation resolution before merging.
- Do not allow direct pushes to `main`.
- Do not allow administrators to bypass the rule unless an emergency process is
  documented.
- Enable auto-merge so GitHub merges PRs after required checks pass.

## Test Pyramid

Unit tests:

- Result mapping from Chess.com ending codes.
- Time-class classification.
- Color and perspective normalization.
- Move counting from PGN.
- Opening-family mapping and taxonomy version behavior.
- Date, rating, and result extraction edge cases.

Fixture-backed provider tests:

- Profile response parsing.
- Stats response parsing.
- Archive list parsing.
- Monthly games parsing.
- `ETag` and `Last-Modified` cache behavior.
- `429` retry and backoff behavior with mocked responses.

Integration tests:

- Import job lifecycle.
- Redis queue progress and retry behavior.
- PostgreSQL persistence for raw games and normalized games.
- Aggregate queries for rating timeline, opening chart, result breakdown, and
  opponent-rating buckets.
- Idempotent re-import behavior.

End-to-end tests:

- Username search.
- Import progress state.
- Dashboard happy path.
- Time-class and period filters.
- Empty states for players with no supported games.
- Error states for missing users, provider failures, and rate-limit delays.
- Mobile chart usability.

## Fixtures

Store recorded provider fixtures under `tests/fixtures/chesscom/`.

Fixture rules:

- Use public data only.
- Keep fixture files small and representative.
- Include at least one bullet, blitz, rapid, and daily sample.
- Include known edge cases such as abandoned games, resignations, timeouts,
  checkmates, draws, and unusual termination codes.
- Do not refresh fixtures automatically in CI.
- Redact anything not needed for deterministic tests.

## Live Provider Testing

Live Chess.com calls are useful for discovery and occasional contract checks,
but they should not be part of normal CI.

When live checks are necessary:

- Run them manually or in a separately triggered workflow.
- Use strict concurrency limits.
- Use a clear `User-Agent`.
- Respect provider cache headers and rate limits.
- Avoid repeatedly fetching large accounts.
- Record a minimal fixture when a live call reveals a regression case.

## Pull Request Expectations

Every PR should include:

- Changed files or areas.
- Validation commands and pass/fail results.
- New or updated tests for behavior changes.
- Risk notes for provider, queue, schema, security, or user-visible changes.
- CodeRabbit follow-up notes when the PR addresses review comments.

PRs should not merge until:

- GitHub Actions passes.
- CodeRabbit passes.
- Actionable CodeRabbit comments are addressed.
- GitHub branch protection/rulesets mark the PR mergeable.
