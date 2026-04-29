# Repository Agent Instructions

This repository is designed for a simple, durable loop:

GitHub Issue -> Codex implements in a branch or worktree -> Pull Request ->
GitHub Actions hard gate -> CodeRabbit review -> Codex fixes comments ->
human merge authority.

## Core Rules

- Keep diffs minimal.
- Do not refactor unrelated code.
- Add or update tests for behavior changes.
- Run the relevant test suite before finishing.
- Never merge directly to `main`.
- Explain changed files and test results in the PR summary.
- Use existing patterns, names, and directory structure unless there is a clear
  reason to change them.
- Keep architecture changes explicit. If a change affects shared abstractions,
  import workflow, queue behavior, database schema, or release risk, document
  the tradeoff before coding.

## Agent Workflow

- Start from a GitHub Issue or a clear task spec.
- Work in a branch or isolated worktree.
- Open a PR for every substantive change.
- Treat GitHub Actions as the hard gate for merge readiness.
- Treat CodeRabbit as the reviewer for PR-level bug, test, maintainability, and
  security feedback.
- Address actionable CodeRabbit comments with narrow commits and rerun CI.
- Leave merge authority with the human owner.

## ChessInsights Product Direction

ChessInsights is a public Chess.com analytics app. It turns a Chess.com username
into practical performance insights across results, rating ranges, openings,
time classes, endings, and rating history.

The preferred implementation direction is a TypeScript-first monorepo:

- `apps/web`: Next.js App Router dashboard and route handlers.
- `apps/worker`: Node.js worker process for Chess.com imports.
- `packages/chesscom-client`: public Chess.com PubAPI client.
- `packages/domain`: normalization, result mapping, opening taxonomy, and PGN
  helpers.
- `packages/db`: Prisma schema, database client, and analytics queries.
- `tests`: fixtures, integration tests, and end-to-end tests.

Prefer incremental delivery:

- P0: username search, Chess.com import, standard-game filtering, normalized
  game records, result charts, rating timeline, opening chart, and time-class
  filters.
- P1: background import progress, cache refresh, shareable dashboard, robust
  error states, mobile-friendly charts, and opening-family taxonomy.
- P2: saved users, scheduled refreshes, advanced filters, export, and period
  comparisons.
- P3: engine-backed phase analysis, accuracy trends, coach/team dashboards, and
  deeper insight generation.

## Risk Boundaries

- Treat scraper, provider, queue, and normalization changes as high-risk.
- Do not bypass `robots.txt`, authentication, rate limits, quotas, or anti-bot
  protections.
- Use only public Chess.com PubAPI endpoints and validated usernames.
- Do not proxy arbitrary URLs.
- Serialize archive fetches per Chess.com username.
- Cap global provider concurrency and retry `429` responses with backoff.
- Respect cache headers such as `ETag` and `Last-Modified` when practical.
- Prefer recorded fixtures, contract tests, and narrow reproductions over live
  external calls.
- Store raw provider fields needed for reproducibility, but keep normalized
  models stable and version taxonomy mappings.
- Keep raw result or ending codes when mapping to normalized outcomes so unknown
  codes can be diagnosed later.

## Testing Expectations

- Use unit tests for deterministic domain logic such as result mapping, move
  counting, opening-family mapping, and time-class classification.
- Use fixture-backed tests for Chess.com client and normalizer behavior.
- Use integration tests for database queries, imports, queue behavior, retries,
  and aggregate snapshots.
- Use end-to-end tests for the dashboard search, import progress, filters,
  empty states, and error states.
- Avoid live Chess.com calls in normal CI unless explicitly isolated and
  rate-limited.
- When behavior changes, add or update a regression test before finishing.

## Repo Hygiene

- Use GitHub Issues for clear task specs.
- Keep task scope tight and avoid bundling unrelated changes.
- If a new runtime stack lands, update CI before merging the first code change
  that uses it.
- If a subdirectory needs different rules, add a nested `AGENTS.md` there
  instead of broadening this file unnecessarily.
- Update docs when process, architecture, or validation expectations change.

## Before Finishing

- Confirm the exact files changed.
- Confirm the commands run and whether they passed.
- Call out any tests not run and why.
- Note follow-up work separately from the completed change.
